// Emula o fluxo exato do login do app pra medir latência real
// Uso: node scripts/test-login.mjs <username> <password>

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const [, , user, pass] = process.argv;
if (!user || !pass) {
  console.error('uso: node scripts/test-login.mjs <username> <password>');
  process.exit(1);
}

const supa = createClient(URL_, KEY_, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { headers: { 'x-app': 'gestao-pecuaria-test' } },
});

function ms(start) { return `${Date.now() - start}ms`; }

async function step(label, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(`✔ ${label}: ${ms(t0)}`, r ? JSON.stringify(r).slice(0, 140) : '');
    return r;
  } catch (e) {
    console.log(`✗ ${label}: ${ms(t0)} ERRO: ${e?.message ?? e}`);
    throw e;
  }
}

console.log('URL:', URL_);
console.log('username:', user);
console.log('---');

const tTotal = Date.now();

// 1) DNS + first hit — mede warmup
const r1 = await step('1. health (ping anon)', async () => {
  const { data, error } = await supa.from('profiles').select('id').limit(1);
  if (error) throw error;
  return { rows: data?.length ?? 0 };
});

// 2) RPC email_for_username — mesma chamada do authStore
const email = await step('2. emailForUsername (RPC)', async () => {
  const { data, error } = await supa.rpc('email_for_username', { u: user.trim().toLowerCase() });
  if (error) throw error;
  if (!data) throw new Error(`usuário não encontrado: ${user}`);
  return String(data);
});

// 3) signInWithPassword
const session = await step('3. signInWithPassword', async () => {
  const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return { userId: data.user.id, email: data.user.email };
});

// 4) fetchProfile (autenticado)
await step('4. fetchProfile', async () => {
  const { data, error } = await supa.from('profiles').select('username, name, role').eq('id', session.userId).maybeSingle();
  if (error) throw error;
  return data;
});

// 5) Sample de pulls (primeiras tabelas do sync)
for (const t of ['paddocks', 'grass_types', 'formulas', 'herd']) {
  await step(`5. pull ${t}`, async () => {
    const { data, error } = await supa.from(t).select('*').order('updated_at', { ascending: true });
    if (error) throw error;
    return { count: data?.length ?? 0 };
  });
}

// 6) Sample de push (test RLS)
await step('6. push test (insert herd_events)', async () => {
  const { error } = await supa.from('herd_events').insert({
    type: 'test_probe_delete_me',
    notes: 'probe de teste',
    head_count: 0,
  });
  return error ? { blocked_by: error.message.slice(0, 80), code: error.code } : { inserted: true };
});

console.log(`---\n⏱  total: ${ms(tTotal)}`);
