// Teste sem auth: só com anon key, tenta pullar cada tabela e mede latência.
// Me diz quais tabelas exigem auth (retornam vazio/erro) e se alguma trava.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

function offlineResponse(error, message) {
  return new Response(JSON.stringify({ error, message }), { status: 503, headers: { 'Content-Type': 'application/json' } });
}
const offlineSafeFetch = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
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

// Lista EXATA do schema.ts SYNCED_TABLES (ordem idêntica ao sync)
const SYNCED_TABLES = [
  'grass_types', 'formulas', 'paddocks', 'water_tanks', 'farm_boundaries',
  'herd', 'inventory', 'herd_events', 'inventory_events', 'rondas',
  'supplement_evals', 'bombona_evals', 'forage_evals', 'water_evals',
  'health_evals', 'fence_evals', 'visual_weight_evals', 'washing_evals',
  'biological_water_evals', 'resupply_routes', 'resupply_loads',
  'resupply_deliveries',
];

function ms(t0) { return Date.now() - t0; }

const totalT0 = Date.now();

for (const t of SYNCED_TABLES) {
  const t0 = Date.now();
  try {
    const { data, error } = await supa.from(t).select('*').order('updated_at', { ascending: true });
    const elapsed = ms(t0);
    if (error) {
      console.log(`  ${String(elapsed).padStart(5)}ms  ${t.padEnd(25)}  ERRO: ${error.message.slice(0, 80)}`);
    } else {
      console.log(`  ${String(elapsed).padStart(5)}ms  ${t.padEnd(25)}  rows: ${data?.length ?? 0}`);
    }
  } catch (e) {
    const elapsed = ms(t0);
    console.log(`  ${String(elapsed).padStart(5)}ms  ${t.padEnd(25)}  THREW: ${e?.message?.slice(0, 80)}`);
  }
}

console.log(`\n  TOTAL pullDelta (anon): ${ms(totalT0)}ms`);
