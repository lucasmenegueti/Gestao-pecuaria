// Simula o que acontece no tablet quando tem N rows pending_sync:
// 20 inserts sequenciais em herd_events pra medir latência total.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const supa = createClient(URL_, KEY_, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

// Login primeiro
const { data: emailData } = await supa.rpc('email_for_username', { u: 'lucas' });
const { error: authErr } = await supa.auth.signInWithPassword({ email: String(emailData), password: 'RENTabilidade!5' });
if (authErr) { console.error(authErr); process.exit(1); }
console.log('✔ login');

// 20 inserts sequenciais
const N = 20;
const t0 = Date.now();
const latencies = [];
const createdIds = [];

for (let i = 0; i < N; i++) {
  const ti = Date.now();
  const { data, error } = await supa.from('herd_events').insert({
    event_type: 'probe_seq_delete',
    category: 'GARROTE',
    head_count: 0,
    notes: `probe sequential ${i}`,
    date: new Date().toISOString().slice(0, 10),
  }).select('id').maybeSingle();
  const elapsed = Date.now() - ti;
  latencies.push(elapsed);
  if (error) {
    console.log(`  ${i.toString().padStart(3)}: ${elapsed}ms ERRO: ${error.message.slice(0, 80)}`);
  } else {
    createdIds.push(data.id);
    console.log(`  ${i.toString().padStart(3)}: ${elapsed}ms ✓ id=${data.id.slice(0, 8)}`);
  }
}

const total = Date.now() - t0;
const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
const max = Math.max(...latencies);
const min = Math.min(...latencies);

console.log(`\n  TOTAL: ${total}ms (${N} inserts)`);
console.log(`  min: ${min}ms, avg: ${avg.toFixed(0)}ms, max: ${max}ms`);
console.log(`  extrapolação p/ 100 rows: ${(total * 100 / N / 1000).toFixed(1)}s`);
console.log(`  extrapolação p/ 500 rows: ${(total * 500 / N / 1000).toFixed(1)}s`);

// Cleanup — deleta as probes
console.log('\n  limpando probes...');
const { error: delErr } = await supa.from('herd_events').delete().in('id', createdIds);
console.log(`  ${delErr ? 'erro ao limpar: ' + delErr.message : '✓ ' + createdIds.length + ' probes deletadas'}`);
