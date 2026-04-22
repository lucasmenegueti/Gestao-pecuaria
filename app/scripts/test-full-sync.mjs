// Teste end-to-end: simula signInWithPassword + pullDelta completo pra identificar onde trava.
// Usa um usuário já existente OU tenta criar um de teste.
// Uso: node scripts/test-full-sync.mjs <username> <password>

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const [, , user, pass] = process.argv;
if (!user || !pass) {
  console.error('uso: node scripts/test-full-sync.mjs <username> <password>');
  process.exit(1);
}

// Replica offlineSafeFetch (com mesmo timeout de 10s que o app v0.5.9)
function offlineResponse(error, message) {
  return new Response(JSON.stringify({ error, message }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}
const offlineSafeFetch = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const r = await fetch(input, { ...init, signal: controller.signal });
    return r;
  } catch (e) {
    return offlineResponse('network', e?.message ?? 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
};

const supa = createClient(URL_, KEY_, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: offlineSafeFetch },
});

function ms(t0) { return Date.now() - t0; }

async function step(label, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    const elapsed = ms(t0);
    console.log(`  ${String(elapsed).padStart(5)}ms  ${label}${r !== undefined ? '  →  ' + JSON.stringify(r).slice(0, 120) : ''}`);
    return r;
  } catch (e) {
    const elapsed = ms(t0);
    console.log(`  ${String(elapsed).padStart(5)}ms  ${label}  ERRO: ${e?.message?.slice(0, 120)}`);
    throw e;
  }
}

// Lista EXATA do SYNCED_TABLES do app (ordem importa)
const SYNCED_TABLES = [
  'grass_types', 'formulas', 'users', 'paddocks', 'herd',
  'rondas', 'supplement_evals', 'bombona_evals', 'forage_evals',
  'water_evals', 'health_evals', 'fence_evals', 'visual_weight_evals',
  'washing_evals', 'biological_water_evals', 'herd_events',
  'inventory', 'inventory_events', 'resupply_routes', 'resupply_loads',
  'resupply_deliveries',
];

console.log('=== 1. Auth ===');

const email = await step('1.1 emailForUsername', async () => {
  const { data, error } = await supa.rpc('email_for_username', { u: user.toLowerCase() });
  if (error) throw error;
  if (!data) throw new Error('não encontrado');
  return data;
});

const session = await step('1.2 signInWithPassword', async () => {
  const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return { userId: data.user.id, email: data.user.email, jwt: data.session.access_token.slice(0, 20) + '...' };
});

await step('1.3 fetchProfile', async () => {
  const { data, error } = await supa.from('profiles').select('username, name, role').eq('id', session.userId).maybeSingle();
  if (error) throw error;
  return data ?? 'NULL';
});

console.log('\n=== 2. Pull each table (mede latência + contagem) ===');

const pullResults = {};
const t0Total = Date.now();
for (const t of SYNCED_TABLES) {
  await step(`pull ${t}`, async () => {
    const { data, error } = await supa.from(t).select('*').order('updated_at', { ascending: true });
    if (error) throw new Error(error.message);
    pullResults[t] = data?.length ?? 0;
    return { rows: data?.length ?? 0 };
  }).catch(() => {});
}

console.log(`\n  TOTAL pullDelta: ${ms(t0Total)}ms`);
console.log(`  Counts:`, pullResults);

console.log('\n=== 3. Push probe (tentar 1 insert pra ver RLS) ===');

// Probe com campos EXATOS do schema local
await step('3.1 insert herd_events probe (schema correto)', async () => {
  const { data, error } = await supa.from('herd_events').insert({
    event_type: 'test_probe_delete',
    category: 'GARROTE',
    head_count: 0,
    notes: 'probe automatizado v2',
    date: new Date().toISOString().slice(0, 10),
  }).select('id').maybeSingle();
  return error ? { blocked: error.message.slice(0, 120), code: error.code, details: error.details } : { inserted_id: data?.id };
});

// Tenta update (teste RLS separadamente do insert)
await step('3.2 update paddocks probe', async () => {
  // Pega um paddock existente pra tentar update
  const { data: [p] } = await supa.from('paddocks').select('id, name').limit(1);
  if (!p) return { skipped: 'sem paddocks' };
  const { error } = await supa.from('paddocks').update({ name: p.name }).eq('id', p.id);
  return error ? { blocked: error.message.slice(0, 120), code: error.code } : { update_ok: true };
});

// Schema inspection via PostgREST
await step('3.3 schema inspection (herd_events colunas)', async () => {
  // Busca 1 row só pra pegar nome das colunas
  const { data, error } = await supa.from('herd_events').select('*').limit(1);
  if (error) throw error;
  if (!data?.[0]) return { empty: true };
  return { cols: Object.keys(data[0]).sort() };
});

console.log('\n=== Fim ===');
