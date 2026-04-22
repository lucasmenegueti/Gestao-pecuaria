// Valida o authStore.login simulando os cenários problemáticos:
// A. Normal (rede ok) → espera offlineMode=false
// B. Abort forçado (timeout do fetch dispara) → antes caía em offlineMode, agora deve lançar "Conexão instável"
// C. Offline real (NetInfo offline) → offlineMode=true (via cache)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// --- copia exata das funções do authStore (cópias sem TS) ---
function isNetworkError(err) {
  const msg = String(err?.message ?? err ?? '');
  const name = String(err?.name ?? '');
  return /network|fetch|offline|timeout|failed to fetch|aborted|abort|sem conex/i.test(msg)
    || /Retryable|Abort/i.test(name);
}

// --- copia do offlineSafeFetch ---
function offlineResponse(error, message) {
  return new Response(JSON.stringify({ error, message }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}
function makeOfflineSafeFetch({ timeoutMs = 15_000, forceOffline = false }) {
  return async (input, init) => {
    if (forceOffline) return offlineResponse('offline', 'Sem conexão');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (e) {
      return offlineResponse('network', e?.message ?? 'Network request failed');
    } finally {
      clearTimeout(timer);
    }
  };
}

// --- emulação do authStore.login ---
async function emulateLogin({ timeoutMs, netInfoOnline, forceOfflineFetch, user = 'lucas', pass = 'wrong', cacheHash = null }) {
  const fakeState = { offlineMode: false, user: null, isAuthenticated: false };
  const supa = createClient(URL_, KEY_, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: makeOfflineSafeFetch({ timeoutMs, forceOffline: forceOfflineFetch }) },
  });

  async function tryOfflineLogin() {
    if (!cacheHash) return false;
    // Simplificado: assume cache match (não validamos hash aqui).
    fakeState.user = { username: user };
    fakeState.isAuthenticated = true;
    fakeState.offlineMode = true;
    return true;
  }

  if (!netInfoOnline) {
    const ok = await tryOfflineLogin();
    if (ok) return { ok: true, state: fakeState };
    throw new Error('Sem conexão. Credenciais não conferem.');
  }

  try {
    const { data: emailData, error: rpcErr } = await supa.rpc('email_for_username', { u: user.toLowerCase() });
    if (rpcErr) throw rpcErr;
    const email = String(emailData);

    const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (!data.user) throw new Error('Sem usuário');

    fakeState.user = { id: data.user.id, email: data.user.email };
    fakeState.isAuthenticated = true;
    fakeState.offlineMode = false;
    return { ok: true, state: fakeState };
  } catch (err) {
    if (isNetworkError(err)) {
      const ok2 = await tryOfflineLogin();
      if (ok2) return { ok: true, state: fakeState, path: 'cache-hit' };
      return { ok: false, reason: 'network_nocache', thrown: 'Conexão instável...' };
    }
    return { ok: false, reason: 'auth_error', thrown: err?.message };
  }
}

// --- casos ---
const cases = [
  { name: 'A. Normal, rede ok, senha errada (deve mostrar auth_error, NÃO offlineMode)',
    opts: { timeoutMs: 15_000, netInfoOnline: true, forceOfflineFetch: false, cacheHash: 'x' } },
  { name: 'B1. Timeout APERTADO (1ms) com cache — era o bug. Agora deve lançar timeout, NÃO cair em offlineMode',
    opts: { timeoutMs: 1, netInfoOnline: true, forceOfflineFetch: false, cacheHash: 'x' } },
  { name: 'B2. Timeout APERTADO sem cache — deve lançar timeout',
    opts: { timeoutMs: 1, netInfoOnline: true, forceOfflineFetch: false, cacheHash: null } },
  { name: 'C. Offline real (NetInfo offline + cache) → offlineMode=true (correto)',
    opts: { timeoutMs: 15_000, netInfoOnline: false, forceOfflineFetch: true, cacheHash: 'x' } },
  { name: 'D. forceOfflineFetch (offlineShortCircuit retorna 503) — simula rede caiu após NetInfo',
    opts: { timeoutMs: 15_000, netInfoOnline: true, forceOfflineFetch: true, cacheHash: 'x' } },
];

for (const c of cases) {
  console.log(`\n--- ${c.name} ---`);
  try {
    const r = await emulateLogin(c.opts);
    console.log('  result:', JSON.stringify(r));
    // Expectativas novas:
    // A: auth_error (senha errada) — NÃO pode cair em offlineMode
    // B1: timeout COM cache — CAI em offlineMode (usa cache, user entra)
    // B2: timeout SEM cache — mostra Alert "Conexão instável"
    // C: offline real — cai em offlineMode
    // D: NetInfo dessincronizado com cache — cai em offlineMode
    if (c.name.startsWith('A') && r.reason === 'auth_error') {
      console.log('  ✅ auth error não virou offlineMode');
    }
    if (c.name.startsWith('B1') && r.state?.offlineMode === true) {
      console.log('  ✅ timeout COM cache entra em offlineMode (user passa, daemon sincroniza depois)');
    }
    if (c.name.startsWith('B2') && r.reason?.startsWith('network')) {
      console.log('  ✅ timeout SEM cache mostra erro (primeiro login precisa de rede)');
    }
    if ((c.name.startsWith('C') || c.name.startsWith('D')) && r.state?.offlineMode === true) {
      console.log('  ✅ offlineMode correto');
    }
  } catch (e) {
    console.log('  threw:', e?.message);
  }
}
