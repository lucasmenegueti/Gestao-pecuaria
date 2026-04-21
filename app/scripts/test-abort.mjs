// Simula exatamente o que acontece no app quando o fetch é abortado:
// - offlineSafeFetch retorna Response 503 com body {error:"network"}
// - supabase-js recebe isso e gera um erro
// - queremos ver QUAL o message do erro que chega no catch do authStore

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// Mesmo offlineSafeFetch do app mas com abort forçado em tudo
function offlineResponse(error, message) {
  return new Response(
    JSON.stringify({ error, message }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  );
}

function makeFetchWithTimeout(timeoutMs) {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(input, { ...init, signal: controller.signal });
      return r;
    } catch (e) {
      console.log('  [fetch captured]', (e?.name ?? '') + ':', (e?.message ?? '').slice(0, 80));
      return offlineResponse('network', e?.message ?? 'Network request failed');
    } finally {
      clearTimeout(timer);
    }
  };
}

async function testCase(label, timeoutMs) {
  console.log(`\n=== ${label} (timeout=${timeoutMs}ms) ===`);
  const supa = createClient(URL_, KEY_, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: makeFetchWithTimeout(timeoutMs) },
  });

  // 1. RPC
  try {
    const { data, error } = await supa.rpc('email_for_username', { u: 'lucas' });
    if (error) {
      console.log(`  RPC error: name=${error.name ?? '?'} msg="${String(error.message).slice(0, 100)}"`);
    } else {
      console.log(`  RPC ok: ${data}`);
    }
  } catch (e) {
    console.log(`  RPC threw: name=${e?.name} msg="${String(e?.message).slice(0, 100)}"`);
  }

  // 2. signInWithPassword
  try {
    const { data, error } = await supa.auth.signInWithPassword({ email: 'lucas@menegueti.com.br', password: 'wrong-pwd' });
    if (error) {
      console.log(`  Auth error: name=${error.name ?? '?'} status=${error.status} msg="${String(error.message).slice(0, 100)}"`);
    } else {
      console.log('  Auth ok?');
    }
  } catch (e) {
    console.log(`  Auth threw: name=${e?.name} msg="${String(e?.message).slice(0, 100)}"`);
  }
}

// Timeout normal (10s): deve funcionar
await testCase('normal network', 10_000);

// Timeout 1ms: força abort em tudo
await testCase('force abort', 1);

// Timeout 50ms: talvez metade pega
await testCase('marginal 50ms', 50);
