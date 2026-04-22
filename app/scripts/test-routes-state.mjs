// Inspeciona o estado real de resupply_routes no Supabase.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supa = createClient(get('EXPO_PUBLIC_SUPABASE_URL'), get('EXPO_PUBLIC_SUPABASE_ANON_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const { data: emailData } = await supa.rpc('email_for_username', { u: 'lucas' });
await supa.auth.signInWithPassword({ email: String(emailData), password: 'RENTabilidade!5' });

const { data: routes, error } = await supa.from('resupply_routes')
  .select('id, start_time, end_time, status, user_id')
  .order('start_time', { ascending: false });

if (error) { console.error(error); process.exit(1); }

console.log(`Total resupply_routes: ${routes.length}`);
const byStatus = {};
for (const r of routes) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log(`Por status:`, byStatus);

const inProgress = routes.filter(r => r.status === 'in_progress');
console.log(`\n=== Rotas in_progress (${inProgress.length}) ===`);
for (const r of inProgress) {
  // Conta loads e deliveries
  const { count: loadCount } = await supa.from('resupply_loads').select('*', { count: 'exact', head: true }).eq('route_id', r.id);
  const { count: delivCount } = await supa.from('resupply_deliveries').select('*', { count: 'exact', head: true }).eq('route_id', r.id);
  console.log(`  id=${r.id.slice(0,8)} start=${r.start_time} end=${r.end_time ?? 'null'} loads=${loadCount} deliveries=${delivCount}`);
}
