// Login pelo hub gestao-acessos (desenho: BRIEFING-INTEGRACAO-ACESSOS.md, raiz do repo).
//
// - modoDeLogin(username): 'hub' | 'legado', da RPC auth_mode (banco). QUALQUER falha → 'legado':
//   voltar alguém pra legado é a reversão da migração e tem que funcionar mesmo se o hub ou a
//   Edge Function quebrarem.
// - loginPeloHub: chama a Edge Function hub-auth, que confere a senha no hub e devolve uma sessão
//   GoTrue real pro mesmo uuid de sempre (dados, RLS, sync e fotos não mudam).
// - revalidarNoHub: /check (no máx. 1×/min), pro admin conseguir derrubar alguém pelo hub.
//   Hub fora / erro = 'ignorar' (nunca derruba por instabilidade). Em 'legado' é no-op no servidor.
import { supabase } from '@/lib/supabase/client';
import { isOnline } from '@/lib/netStatus';
import { logInfo, logWarn } from '@/lib/log';

export type ModoLogin = 'hub' | 'legado';

export async function modoDeLogin(username: string): Promise<ModoLogin> {
  try {
    const { data, error } = await supabase.rpc('auth_mode', { u: username });
    if (error) throw error;
    return data === 'hub' ? 'hub' : 'legado';
  } catch (err: any) {
    logWarn('auth', 'auth_mode_falhou', { username, error: String(err?.message ?? err) });
    return 'legado';
  }
}

export type ResultadoHub =
  | { tipo: 'ok'; access_token: string; refresh_token: string }
  | { tipo: 'legado' }
  /** Veredito do hub ou da função: não cai no caminho direto. `codigo` é o do contrato. */
  | { tipo: 'recusa'; codigo: string; mensagem: string }
  | { tipo: 'indisponivel'; detalhe: string };

const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'Usuário ou senha inválidos',
  bad_request: 'Usuário ou senha inválidos',
  user_disabled: 'Seu acesso está desativado. Fale com o administrador.',
  no_role: 'Você não tem permissão para este app. Fale com o administrador.',
  app_disabled: 'O app está temporariamente desativado. Fale com o administrador.',
  role_mismatch: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  sem_vinculo: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  sem_conta_no_app: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  muitas_tentativas: 'Muitas tentativas erradas. Aguarde alguns minutos ou fale com o administrador.',
};

// A função segura o login de quem errou a senha (atraso progressivo, teto 30 s) e ainda espera
// o hub por até 20 s. O fetch padrão do app desiste em 25 s e REPETE — aqui seria uma segunda
// tentativa de senha. Por isso o /login vai num fetch próprio: uma chamada só, 70 s.
const LOGIN_TIMEOUT_MS = 70_000;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function loginPeloHub(username: string, password: string): Promise<ResultadoHub> {
  if (!isOnline()) return { tipo: 'indisponivel', detalhe: 'offline' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
  let status = 0;
  let data: any = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/hub-auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-app': 'gestao-pecuaria-nsa',
      },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
    status = res.status;
    data = await res.json().catch(() => null);
  } catch (err: any) {
    return { tipo: 'indisponivel', detalhe: `rede: ${String(err?.name ?? err)}` };
  } finally {
    clearTimeout(timer);
  }
  if (status === 200 && data?.ok && data.session?.access_token && data.session?.refresh_token) {
    return { tipo: 'ok', access_token: data.session.access_token, refresh_token: data.session.refresh_token };
  }
  const codigo = typeof data?.error === 'string' ? data.error : '';
  if (status === 409 && codigo === 'modo_legado') return { tipo: 'legado' };
  // Veredito só por lista fechada; o resto (503, 5xx, 404, rede) = indisponível → o app tenta o
  // caminho direto, como antes da migração.
  if ((status === 401 || status === 403 || status === 429 || status === 400) && MENSAGENS[codigo]) {
    return { tipo: 'recusa', codigo, mensagem: MENSAGENS[codigo] };
  }
  return { tipo: 'indisponivel', detalhe: `${status} ${codigo}`.trim() };
}

/** Motivos de revogação confirmados pelo servidor (2 lookups iguais no hub). Lista fechada. */
const REVOGACOES = new Set(['user_disabled', 'no_role', 'session_version_mismatch', 'user_not_found', 'app_disabled']);

export type Revalidacao =
  | { tipo: 'ok' }
  | { tipo: 'ignorar' }
  /** A sessão deste aparelho não foi emitida pelo hub (virada legado→hub, fallback direto) ou
   *  já não existe: precisa entrar de novo. Ninguém foi revogado. */
  | { tipo: 'relogin' }
  /** O administrador tirou o acesso no hub. */
  | { tipo: 'revogado'; reason: string };

const CHECK_MIN_INTERVALO_MS = 60_000;
let ultimoCheck = 0;

/** Só `valid:false` do servidor muda alguma coisa. Rede, 503, 401 de token vencido, resposta
 *  estranha ou motivo desconhecido = 'ignorar' — instabilidade nunca derruba ninguém. */
export async function revalidarNoHub(): Promise<Revalidacao> {
  const agora = Date.now();
  if (agora - ultimoCheck < CHECK_MIN_INTERVALO_MS) return { tipo: 'ignorar' };
  ultimoCheck = agora;
  try {
    const { data, error } = await supabase.functions.invoke('hub-auth/check', { body: {} });
    if (error) return { tipo: 'ignorar' };
    if (data?.ok === true && data.valid === true) return { tipo: 'ok' };
    if (data?.ok === true && data.valid === false) {
      logInfo('auth', 'hub_check_invalido', { reason: data.reason });
      if (data.reason === 'relogin') return { tipo: 'relogin' };
      if (REVOGACOES.has(data.reason)) return { tipo: 'revogado', reason: data.reason };
    }
    return { tipo: 'ignorar' };
  } catch {
    return { tipo: 'ignorar' };
  }
}
