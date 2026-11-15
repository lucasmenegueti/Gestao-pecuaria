import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import type * as SQLite from 'expo-sqlite';
import { syncAll, getSyncStatus, resetPushCircuitBreaker } from './engine';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { isOnline as netIsOnline, onNetChange } from '@/lib/netStatus';
import { logInfo, logWarn } from '@/lib/log';
import { revalidarNoHub } from '@/lib/hubAuth';
import { notify } from '@/lib/confirm';

// Daemon de sincronização em background.
// Gatilhos que disparam syncAll():
//   1. Reconectou (NetInfo: offline → online)
//   2. App voltou ao foreground (AppState: background/inactive → active)
//   3. Poll periódico (a cada POLL_MS) se há pendentes E online
//
// Usa o listener do NetInfo pra saber isOnline em tempo real.
// Se offline, não tenta — só marca pra próxima oportunidade.

const POLL_MS = 15_000; // 15s: balanço entre responsividade e bateria
const DEBOUNCE_MS = 1_000; // reconectou → espera 1s pra deixar rede estabilizar

type DaemonState = {
  db: SQLite.SQLiteDatabase | null;
  running: boolean;
  /** Timestamp de quando running=true. Watchdog reseta se passar RUN_TIMEOUT_MS. */
  runStartedAt: number;
  /** Dono da trava. O watchdog solta a trava de um ciclo lento que continua vivo;
   *  sem o token, o `finally` desse ciclo velho soltava também a do ciclo novo e o
   *  poll seguinte abria um terceiro em paralelo. */
  runGen: number;
  timer: ReturnType<typeof setInterval> | null;
  netUnsub: (() => void) | null;
  appStateSub: ReturnType<typeof AppState.addEventListener> | null;
  lastSyncAt: number;
};

/** Se um ciclo de sync passa disso, assume-se que travou (DB lock, rede morta) e libera
 *  a flag running pra próximo ciclo. Sem isso, um crash silencioso trava daemon até app restart. */
const RUN_TIMEOUT_MS = 60_000;

const state: DaemonState = {
  db: null,
  running: false,
  runStartedAt: 0,
  runGen: 0,
  timer: null,
  netUnsub: null,
  appStateSub: null,
  lastSyncAt: 0,
};

/**
 * Quando voltamos online após um login offline, tenta silenciosamente re-autenticar
 * com o Supabase usando credenciais do cache. Se der certo, sai do modo offline e
 * o sync normal volta a rodar.
 */
async function tryReAuthOffline() {
  const auth = useAuthStore.getState();
  if (!auth.offlineMode) return;
  const cache = auth.offlineCache;
  if (!cache?.password) {
    logWarn('auth', 'reauth_skipped_no_password', { username: cache?.username });
    return;
  }
  try {
    logInfo('auth', 'reauth_online_attempt', { username: cache.username });
    await auth.login(cache.username, cache.password, true);
    logInfo('auth', 'reauth_online_ok', { username: cache.username });
  } catch (err: any) {
    logWarn('auth', 'reauth_online_failed', { username: cache.username, error: err?.message, codigo: err?.codigo });
    // O hub recusou a senha guardada (ela mudou, ou a conta passou a usar a senha do hub).
    // Repetir a cada reconexão só gastaria tentativas e atrasaria o login de verdade: a senha
    // guardada sai deste aparelho e o usuário digita a nova na próxima vez que entrar.
    // 429, 503 e rede não apagam nada.
    if (err?.codigo === 'invalid_credentials') useAuthStore.getState().esquecerOffline('senha');
  }
}

/** Sai da sessão local e leva pra tela de login. O app não tem guarda de rota: sem o
 *  replace, quem foi deslogado pelo daemon continuaria vendo o Painel, sem usuário. */
async function sairParaLogin() {
  await useAuthStore.getState().logout();
  try { router.replace('/(auth)/login'); } catch { /* navegação ainda não montada */ }
}

const AVISO_PENDENTES = 'Seus registros pendentes continuam guardados neste aparelho.';

/**
 * Pergunta ao hub (via /check, no máx. 1×/min) se a sessão deste aparelho ainda vale.
 * Devolve true quando a sessão local foi encerrada (o ciclo de sync para ali).
 * Nunca apaga SQLite nem linha com pending_sync=1; hub fora ou instável não muda nada.
 */
async function sessaoEncerradaPeloHub(): Promise<boolean> {
  const r = await revalidarNoHub();
  if (r.tipo === 'ok' || r.tipo === 'ignorar') return false;
  const auth = useAuthStore.getState();

  if (r.tipo === 'revogado') {
    // O administrador tirou o acesso: sai e perde também o login offline deste aparelho.
    logWarn('auth', 'sessao_encerrada_pelo_hub', { reason: r.reason });
    await sairParaLogin();
    useAuthStore.getState().esquecerOffline('tudo');
    notify('Sessão encerrada', `Seu acesso foi encerrado pelo administrador. ${AVISO_PENDENTES}`);
    return true;
  }

  // 'relogin': ninguém foi revogado — esta sessão só não foi emitida pelo hub (a conta acabou
  // de passar pro hub, ou o login caiu no caminho direto com a função fora). Com a senha
  // guardada o aparelho entra de novo sozinho e o usuário não vê nada.
  const cache = auth.offlineCache;
  const usuario = auth.user?.username;
  if (cache?.password && usuario && cache.username === usuario) {
    try {
      await auth.login(cache.username, cache.password, true);
      logInfo('auth', 'relogin_silencioso_ok', { username: cache.username });
      return false;
    } catch (err: any) {
      const codigo: string | undefined = err?.codigo;
      logWarn('auth', 'relogin_silencioso_falhou', { username: cache.username, codigo, error: err?.message });
      // Sem veredito do hub (rede, 503, função fora, muitas tentativas): não mexe em nada;
      // o próximo /check (≥ 1 min) tenta de novo e o sync segue com a sessão que existe.
      if (!codigo || codigo === 'indisponivel' || codigo === 'muitas_tentativas') return false;
      // Senha guardada não vale no hub: sai dela pra não repetir a cada ciclo.
      if (codigo === 'invalid_credentials') useAuthStore.getState().esquecerOffline('senha');
    }
  }
  await sairParaLogin();
  notify('Entre de novo', `Sua sessão neste aparelho precisa ser renovada: digite usuário e senha. ${AVISO_PENDENTES}`);
  return true;
}

async function tryRun(reason: string) {
  if (!state.db) return;
  if (!netIsOnline()) return;
  const now = Date.now();
  // Watchdog: se running está preso há >60s, algo travou — força release
  // pro próximo ciclo seguir. Sem isso, um throw não-capturado no finally
  // bloqueava sync até app restart.
  if (state.running) {
    if (now - state.runStartedAt > RUN_TIMEOUT_MS) {
      logWarn('sync', 'daemon_stuck_reset', { elapsed_ms: now - state.runStartedAt });
      state.running = false;
    } else {
      return;
    }
  }
  // Evita rodar muitas vezes em sequência (ex. reconectar + foreground juntos)
  if (now - state.lastSyncAt < 2_000) return;

  // Só sincroniza se tem user autenticado E com JWT válido no Supabase
  const auth = useAuthStore.getState();
  if (!auth.isAuthenticated) return;
  if (auth.offlineMode) return; // sem JWT, sync falharia — aguarda login online

  // Reivindica o lock ANTES de qualquer await. Antes, state.running só era setado
  // depois do `await getSyncStatus` — dois gatilhos (poll/foreground/reconnect, ou
  // o forceSync do login) entravam nessa janela com running=false e rodavam
  // pushPending concorrente, re-inserindo o mesmo row pending_sync=1 (origem das
  // rondas/evals duplicadas). Setar aqui torna o check-and-set atômico (JS é
  // single-thread; não há await entre o check de running acima e este set). Todo
  // early-return abaixo precisa liberar o lock.
  state.running = true;
  state.runStartedAt = now;
  state.lastSyncAt = now;
  const gen = ++state.runGen;
  const release = () => { if (state.runGen === gen) state.running = false; };

  // Revalidação no hub: best-effort, com throttle próprio. Erro aqui nunca segura push nem pull.
  if (await sessaoEncerradaPeloHub().catch(() => false)) { release(); return; }

  // Só roda se há pendentes OU se faz tempo desde o último pull
  const status = await getSyncStatus(state.db).catch(() => null);
  if (!status) { release(); return; }
  // Inclui derivados aqui — daemon sincroniza qualquer pending, não só os visíveis.
  const pendingNow = status.pending > 0 || status.pendingDerived > 0;
  const lastPull = status.last_pull_at ? new Date(status.last_pull_at).getTime() : 0;
  const staleByTime = now - lastPull > 60_000; // pull de 1 em 1 min quando conectado
  if (!pendingNow && !staleByTime) { release(); return; }

  try {
    const stats = await syncAll(state.db);
    if (__DEV__) console.log(`[sync daemon:${reason}]`, stats);
  } catch (err: any) {
    if (__DEV__) console.warn(`[sync daemon:${reason}] falhou:`, err?.message);
  } finally {
    release();
  }
}

export function startSyncDaemon(db: SQLite.SQLiteDatabase) {
  if (state.db) return; // já iniciado
  state.db = db;
  // Boot: reseta circuit breaker de push (rows antes deferidas voltam a tentar
  // numa sessão nova — ex.: admin arruma policy do Supabase, user relança app).
  resetPushCircuitBreaker();

  // Liga refresh do JWT se já estamos online no boot.
  if (netIsOnline()) supabase.auth.startAutoRefresh().catch(() => {});

  state.netUnsub = onNetChange((online, wasOnline) => {
    // Liga/desliga o refresh automático do JWT baseado em conectividade —
    // evita supabase-js logar Network errors quando a rede cai.
    if (online) {
      supabase.auth.startAutoRefresh().catch(() => {});
    } else {
      supabase.auth.stopAutoRefresh().catch(() => {});
    }
    if (online && !wasOnline) {
      setTimeout(() => tryRun('reconnect'), DEBOUNCE_MS);
      setTimeout(() => tryReAuthOffline(), DEBOUNCE_MS);
    }
  });

  // AppState: volta ao foreground → sync
  state.appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
    if (s === 'active') tryRun('foreground');
  });

  // Polling periódico
  state.timer = setInterval(() => tryRun('poll'), POLL_MS);
}

export function stopSyncDaemon() {
  state.netUnsub?.();
  state.netUnsub = null;
  state.appStateSub?.remove();
  state.appStateSub = null;
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  state.db = null;
}

export { netIsOnline as isOnline };

/** Dispara sync manualmente (ex: botão no Painel). Ignora debounce/staleness check.
 *  Também reseta o circuit breaker de push — user clicando "Sincronizar" indica
 *  que quer tentar TUDO de novo, mesmo o que foi deferido por falha repetida. */
export async function forceSync(db: SQLite.SQLiteDatabase) {
  if (state.running) return;
  state.running = true;
  state.runStartedAt = Date.now();
  state.lastSyncAt = Date.now();
  const gen = ++state.runGen;
  resetPushCircuitBreaker();
  try {
    return await syncAll(db);
  } finally {
    if (state.runGen === gen) state.running = false;
  }
}
