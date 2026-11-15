import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase/client';
import { logInfo, logError, logWarn } from '@/lib/log';
import { loginPeloHub, modoDeLogin } from '@/lib/hubAuth';

// Hash determinístico pra login offline. Não substitui criptografia séria;
// só serve pra validar que o peão no campo digitou a senha correta quando
// o Supabase está fora de alcance.
async function credentialHash(username: string, password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `nsa-pecuaria:${username.trim().toLowerCase()}:${password}`
  );
}

/** Traduz username → email via RPC no Supabase. Lança se não encontrar. */
async function emailForUsername(username: string): Promise<string> {
  const { data, error } = await supabase.rpc('email_for_username', { u: username.trim().toLowerCase() });
  if (error) throw error;
  if (!data) throw new Error(`Usuário "${username}" não encontrado.`);
  return String(data);
}

function isNetworkError(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err ?? '');
  // "sem conexão" = body PT-BR do nosso offlineResponse quando NetInfo disse
  // offline entre a verificação e a call. "conexão" cobre variações.
  return /network|fetch|offline|failed to fetch|sem conex|conex/i.test(msg);
}

/** Timeout/abort ≠ offline real. Quando fetch aborta (10s timeout) mas NetInfo
 *  diz que tem rede, é "conexão instável" — não queremos cair em offlineMode
 *  silencioso. O user clica "tentar de novo". "aborted"/"timeout"/AuthRetryable
 *  são os padrões emitidos pelo supabase-js/nosso offlineSafeFetch. */
function isTimeoutError(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err ?? '');
  const name = String((err as { name?: unknown })?.name ?? '');
  return /abort|timeout|signal|retryable/i.test(msg) || /Retryable|Abort/i.test(name);
}

/** Erro de login com o código do contrato do hub (`invalid_credentials`, `user_disabled`…).
 *  Quem decide o que fazer (o re-login silencioso do daemon) olha o código, nunca o texto. */
export class LoginError extends Error {
  codigo: string;
  constructor(mensagem: string, codigo: string) {
    super(mensagem);
    this.name = 'LoginError';
    this.codigo = codigo;
  }
}

export interface User {
  /** UUID do auth.users no Supabase. */
  id: string;
  /** Email usado no Supabase Auth. */
  email: string;
  /** username do profile (ex: admin, joao.peao). */
  username: string;
  name: string;
  role: 'admin' | 'peao';
}

interface OfflineCredCache {
  username: string; // identificador digitado no login (ex: "lucas")
  email: string;    // email resolvido via RPC e usado pelo supabase auth
  hash: string;     // SHA-256(nsa-pecuaria:username:password) — pra login offline
  password?: string; // plaintext só quando usuário marcou "lembrar" — usado p/ auto-preencher
  user: User;
  cachedAt: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  /** Cache da última auth bem-sucedida online — viabiliza login offline. */
  offlineCache: OfflineCredCache | null;
  /** Sessão atual está apenas em modo offline (sem JWT válido no Supabase). */
  offlineMode: boolean;
  /** Login online via Supabase. Aceita username (lucas, alex, gabriel), resolve email via RPC.
   *  Se offline e cache bater, autentica localmente.
   *  remember=true grava credenciais pra auto-preencher e login offline depois. */
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  /** Restaura sessão persistida por supabase-js (AsyncStorage). Chamar no boot. */
  restore: () => Promise<void>;
  logout: () => Promise<void>;
  /** Apaga o que este aparelho guarda pra entrar sem o servidor: só a senha em claro
   *  ('senha': o re-login silencioso para; o login offline continua) ou tudo ('tudo': acesso
   *  revogado no hub — sem isso o revogado reentraria offline). Nunca toca no SQLite. */
  esquecerOffline: (oque: 'senha' | 'tudo') => void;
}

async function fetchProfile(userId: string): Promise<{ username: string; name: string; role: 'admin' | 'peao' } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[authStore] falha ao buscar profile:', error.message);
    return null;
  }
  return data;
}

/** Encerra no servidor UMA sessão que nunca chegou a ser instalada no supabase-js (best-effort). */
async function descartarSessao(accessToken: string): Promise<void> {
  try {
    await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: 'POST',
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // sem rede: a sessão órfã expira sozinha; ninguém neste aparelho a tem
  }
}

/** Época da sessão local: sobe a cada logout. Um login em voo (o re-login silencioso do daemon,
 *  ou um toque em Entrar) que termina DEPOIS de um "Sair" não pode gravar o usuário de volta —
 *  num aparelho compartilhado ele recolocaria quem saiu por cima de quem acabou de entrar. */
let epoca = 0;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      initializing: true,
      offlineCache: null,
      offlineMode: false,

      login: async (username, password, remember) => {
        const usernameClean = username.trim().toLowerCase();
        logInfo('auth', 'login_attempt', { username: usernameClean });
        const minhaEpoca = epoca;

        // Detecta offline antes de qualquer call de rede
        const net = await NetInfo.fetch().catch(() => ({ isConnected: true, isInternetReachable: null } as any));
        const isOnline = !!(net.isConnected && net.isInternetReachable !== false);

        async function tryOfflineLogin(): Promise<boolean> {
          const cache = get().offlineCache;
          if (!cache) {
            logError('auth', 'login_offline_no_cache', { username: usernameClean });
            return false;
          }
          if (cache.username !== usernameClean) {
            logError('auth', 'login_offline_user_mismatch', {
              requested: usernameClean,
              cached: cache.username,
            });
            return false;
          }
          const inputHash = await credentialHash(usernameClean, password);
          if (inputHash !== cache.hash) {
            logError('auth', 'login_offline_wrong_password', { username: usernameClean });
            return false;
          }
          logInfo('auth', 'login_offline_ok', { username: usernameClean });
          set({ user: cache.user, isAuthenticated: true, offlineMode: true });
          return true;
        }

        if (!isOnline) {
          // Sem rede: pula RPC, vai direto pro cache
          const ok = await tryOfflineLogin();
          if (ok) return;
          throw new Error('Sem conexão. Credenciais não conferem com o último acesso online neste aparelho.');
        }

        // Tem rede: modo 'hub' confere a senha no hub gestao-acessos (Edge Function hub-auth);
        // 'legado' (ou qualquer falha na consulta do modo) = login direto no Supabase, como sempre.
        const startedAt = Date.now();
        try {
          let email: string;
          let data: { user: import('@supabase/supabase-js').User | null };
          const modo = await modoDeLogin(usernameClean);
          const hub = modo === 'hub' ? await loginPeloHub(usernameClean, password) : null;
          if (hub?.tipo === 'recusa') throw new LoginError(hub.mensagem, hub.codigo);
          if (hub?.tipo === 'ok') {
            if (epoca !== minhaEpoca) {
              // Saíram (e talvez outro já entrou) enquanto o hub respondia. A sessão recebida
              // ainda NÃO foi instalada no supabase-js: encerra só ela no servidor e não toca
              // na sessão nem no estado de quem está logado agora.
              logWarn('auth', 'login_descartado_apos_logout', { username: usernameClean, via: 'hub' });
              await descartarSessao(hub.access_token);
              throw new LoginError('Login cancelado: a sessão foi encerrada neste aparelho.', 'cancelado');
            }
            const r = await supabase.auth.setSession({ access_token: hub.access_token, refresh_token: hub.refresh_token });
            if (r.error) throw r.error;
            data = { user: r.data.user };
            email = r.data.user?.email ?? '';
            logInfo('auth', 'login_hub_ok', { username: usernameClean });
          } else {
            if (hub?.tipo === 'indisponivel') logWarn('auth', 'login_hub_indisponivel', { username: usernameClean, detalhe: hub.detalhe });
            email = await emailForUsername(usernameClean);
            const r = await supabase.auth.signInWithPassword({ email, password });
            if (r.error) {
              // Hub fora + senha do hub ≠ senha antiga do Supabase: não dizer "senha errada".
              if (hub?.tipo === 'indisponivel' && /invalid login/i.test(r.error.message)) {
                throw new LoginError('Servidor de login indisponível. Tente de novo em instantes.', 'indisponivel');
              }
              throw r.error;
            }
            data = r.data;
          }
          if (!data.user) throw new Error('Sem usuário na resposta.');
          logInfo('auth', 'login_ok', { username: usernameClean, userId: data.user.id });
          const profile = await fetchProfile(data.user.id);
          // Fallback em cascata: profile fresco → cache do login anterior → usuário digitado.
          // Evita "Boa tarde, lucas@menegueti.com.br" quando fetchProfile aborta no timeout.
          const cachedUser = get().offlineCache?.user;
          const cachedMatches = cachedUser && cachedUser.id === data.user.id;
          const user: User = {
            id: data.user.id,
            email: data.user.email ?? email,
            username: profile?.username ?? (cachedMatches ? cachedUser.username : usernameClean),
            name: profile?.name ?? (cachedMatches ? cachedUser.name : usernameClean),
            role: profile?.role ?? (cachedMatches ? cachedUser.role : 'peao'),
          };
          const hash = await credentialHash(usernameClean, password);
          if (epoca !== minhaEpoca) {
            // Mesma guarda, pro caminho direto (o signInWithPassword instala a sessão sozinho) e
            // pra um "Sair" que caia entre o setSession e este ponto.
            logWarn('auth', 'login_descartado_apos_logout', { username: usernameClean, via: 'tarde' });
            // O supabase-js guarda UMA sessão: a que chegou agora substituiu a de quem estivesse
            // logado. Ninguém pode ficar com tela de um usuário e JWT de outro — encerra tudo
            // local; quem chamou leva pra tela de login.
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            if (get().user) set({ user: null, isAuthenticated: false, offlineMode: false });
            throw new LoginError('Login cancelado: a sessão foi encerrada neste aparelho.', 'cancelado');
          }
          set({
            user,
            isAuthenticated: true,
            offlineMode: false,
            offlineCache: remember
              ? { username: usernameClean, email, hash, password, user, cachedAt: Date.now() }
              : null,
          });
        } catch (err: any) {
          const durationMs = Date.now() - startedAt;
          // Detalhe técnico salvo no log pra auditoria — name, status do response
          // sintético, body com URL/duration que veio do offlineSafeFetch.
          // Sem isso, a mensagem genérica "AuthRetryableFetchError" não dizia
          // qual fetch falhou nem quanto tempo levou.
          const detail = {
            username: usernameClean,
            error: String(err?.message ?? err),
            name: String(err?.name ?? ''),
            status: err?.status ?? err?.cause?.status,
            duration_ms: durationMs,
          };
          // Veredito do hub (senha errada, acesso desativado…): não é rede. Não cai no login
          // offline nem mexe em sessão/pendentes — só devolve o erro com o código.
          if (err instanceof LoginError) {
            logError('auth', 'login_failed', { ...detail, codigo: err.codigo });
            throw err;
          }
          // Timeout/abort: rede existe (NetInfo ok) mas chamada travou. NÃO cai
          // em offlineMode silencioso — user precisa saber que foi instabilidade
          // e não credencial errada. Mostra erro claro pra tentar de novo.
          if (isTimeoutError(err)) {
            logError('auth', 'login_timeout', detail);
            throw new Error(
              'Conexão instável. Essa rede pode estar bloqueando o servidor. Tente outra rede (4G) ou fale com TI.',
            );
          }
          // Erro de rede "hard" (NetInfo desatualizado, DNS morto): fallback cache.
          if (isNetworkError(err)) {
            const ok = await tryOfflineLogin();
            if (ok) return;
            throw new Error('Conexão instável. Credenciais não conferem com o último acesso online neste aparelho.');
          }
          logError('auth', 'login_failed', detail);
          throw err;
        }
      },

      restore: async () => {
        // Fast path: user já foi hidratado do AsyncStorage pelo middleware persist
        // (onRehydrateStorage seta isAuthenticated). Não precisamos de network no
        // boot — confiamos no cache local. Quando online, supabase-js refresh JWT
        // automaticamente (controlado pelo daemon). fetchProfile aqui era network
        // round-trip desnecessário que bloqueava o app em rede lenta.
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && !get().user) {
            // Sessão existe no AsyncStorage do supabase-js mas Zustand persist
            // perdeu user (raro: cache corrompido ou primeira migração). Backfill
            // mínimo a partir de email — nome completo chega no próximo login online.
            const u = data.session.user;
            set({
              user: {
                id: u.id,
                email: u.email ?? '',
                username: (u.email ?? '').split('@')[0],
                name: u.email ?? 'Usuário',
                role: 'peao',
              },
              isAuthenticated: true,
            });
          }
        } catch (err) {
          if (__DEV__) console.warn('[authStore] restore falhou:', err);
        } finally {
          set({ initializing: false });
        }
      },

      logout: async () => {
        epoca++;
        logInfo('auth', 'logout');
        // Offline: o custom fetch em supabase/client.ts devolve 204 pro /logout
        // pra que o auth-js execute o cleanup local do AsyncStorage sem disparar
        // console.error (que em dev vira red box do LogBox).
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // rede pode falhar; local limpa mesmo assim
        }
        // NÃO limpar offlineCache: se usuário deslogar e depois precisar entrar
        // sem internet, ainda conseguimos validar contra o último hash.
        // Dados locais (SQLite) também ficam — pending_sync rows sobem no próximo login.
        set({ user: null, isAuthenticated: false, offlineMode: false });
      },

      esquecerOffline: (oque) => {
        const cache = get().offlineCache;
        if (!cache) return;
        set({ offlineCache: oque === 'tudo' ? null : { ...cache, password: undefined } });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persiste user p/ UI abrir rápido + offlineCache p/ login offline.
      // A verdade da sessão online vem de supabase.auth.getSession().
      partialize: (state) => ({ user: state.user, offlineCache: state.offlineCache }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.isAuthenticated = true;
        }
      },
    }
  )
);
