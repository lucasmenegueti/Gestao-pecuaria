// Investigação focada: estado e histórico de um conjunto de piquetes.
// Lista TODOS os herd_events (sem filtro de data) tocando os piquetes informados,
// e o estado atual em `herd`.
//
// Uso: node scripts/probe-paddock.mjs <user> <pass> <paddockNames csv>
// Exemplo: node scripts/probe-paddock.mjs lucas SENHA "P19,P19A,P20,P20A,P46,P50,P51"

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supa = createClient(get('EXPO_PUBLIC_SUPABASE_URL'), get('EXPO_PUBLIC_SUPABASE_ANON_KEY'), {auth:{persistSession:false}});

const [, , user, pass, names] = process.argv;
if (!user || !pass || !names) { console.error('uso: node scripts/probe-paddock.mjs <user> <pass> <names csv>'); process.exit(1); }

const email = (await supa.rpc('email_for_username', {u:user})).data;
await supa.auth.signInWithPassword({email, password:pass});

const wantNames = names.split(',').map((s) => s.trim().toUpperCase());
const { data: pads } = await supa.from('paddocks').select('id, name');
const wantIds = pads.filter((p) => wantNames.includes(p.name.toUpperCase())).map((p) => p.id);
const nameOf = new Map(pads.map((p) => [p.id, p.name]));

console.log(`[probe] piquetes: ${wantNames.join(', ')} → ids ${wantIds.length}\n`);

const { data: profiles } = await supa.from('profiles').select('id, username');
const uName = new Map(profiles.map((p) => [p.id, p.username]));
const userOf = (id) => id == null ? '' : (uName.get(id) ?? `?${String(id).slice(0,8)}`);

// Eventos: tudo que tem paddock_id ou target_paddock_id em wantIds
const { data: ev1 } = await supa.from('herd_events')
  .select('id, paddock_id, target_paddock_id, event_type, category, head_count, notes, date, created_by, created_at, deleted_at')
  .in('paddock_id', wantIds);
const { data: ev2 } = await supa.from('herd_events')
  .select('id, paddock_id, target_paddock_id, event_type, category, head_count, notes, date, created_by, created_at, deleted_at')
  .in('target_paddock_id', wantIds);
const seen = new Set();
const events = [...ev1, ...ev2].filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
  .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));

console.log(`=== HERD_EVENTS tocando esses piquetes (${events.length}) ===\n`);
console.log(['quando_utc', 'user', 'tipo', 'origem', 'destino', 'categoria', 'cab', 'del?', 'obs'].join(' | '));
console.log('-'.repeat(140));
for (const e of events) {
  console.log([
    (e.created_at ?? '').slice(0, 19).replace('T', ' '),
    userOf(e.created_by),
    e.event_type,
    e.paddock_id ? (nameOf.get(e.paddock_id) ?? '?') : 'NULL',
    e.target_paddock_id ? (nameOf.get(e.target_paddock_id) ?? '?') : '',
    e.category,
    e.head_count,
    e.deleted_at ? 'S' : '',
    (e.notes ?? '').slice(0, 40),
  ].join(' | '));
}

// Estado atual em herd
const { data: herd } = await supa.from('herd')
  .select('id, paddock_id, category, head_count, created_by, created_at, updated_at, deleted_at')
  .in('paddock_id', wantIds)
  .is('deleted_at', null);

console.log(`\n=== HERD ROWS atuais nesses piquetes (${herd.length}) ===\n`);
console.log(['piquete', 'categoria', 'cab', 'criado_em', 'atualizado_em'].join(' | '));
console.log('-'.repeat(120));
for (const h of herd.sort((a, b) => (nameOf.get(a.paddock_id) ?? '').localeCompare(nameOf.get(b.paddock_id) ?? ''))) {
  console.log([
    nameOf.get(h.paddock_id) ?? '?',
    h.category,
    h.head_count,
    (h.created_at ?? '').slice(0, 19).replace('T', ' '),
    (h.updated_at ?? '').slice(0, 19).replace('T', ' '),
  ].join(' | '));
}

// Para cada piquete + categoria, simula o saldo a partir dos eventos
console.log('\n=== SIMULAÇÃO: saldo derivado dos eventos (assumindo saldo inicial = 0) ===\n');
const simul = new Map(); // key=paddockId|cat → cab
for (const e of events) {
  if (e.deleted_at) continue;
  const cat = e.category;
  // Para TRANSFERENCIA: origem perde, destino ganha
  if (e.event_type === 'TRANSFERENCIA') {
    if (e.paddock_id) {
      const k = `${e.paddock_id}|${cat}`;
      simul.set(k, (simul.get(k) ?? 0) - e.head_count);
    }
    if (e.target_paddock_id) {
      const k = `${e.target_paddock_id}|${cat}`;
      simul.set(k, (simul.get(k) ?? 0) + e.head_count);
    }
  } else if (e.event_type === 'EVOLUCAO') {
    // EVOLUCAO no mesmo piquete: troca de categoria. precisa de target_category — pula
  } else {
    const sign = { COMPRA: +1, NASCIMENTO: +1, ALOCACAO: +1, VENDA: -1, MORTE: -1, DESALOCACAO: -1 }[e.event_type] ?? 0;
    if (e.paddock_id) {
      const k = `${e.paddock_id}|${cat}`;
      simul.set(k, (simul.get(k) ?? 0) + sign * e.head_count);
    }
  }
}
const ALL_CATS = [
  'BEZERRO MAMANDO','BEZERRA MAMANDO','BEZERRO','BEZERRA','GARROTE','NOVILHA','NOVILHA PRENHA','BOI','VACA SOLTEIRA','VACA PRENHA','VACA PARIDA',
];
for (const pid of wantIds) {
  const name = nameOf.get(pid);
  for (const cat of ALL_CATS) {
    const sim = simul.get(`${pid}|${cat}`) ?? 0;
    const real = herd.find((h) => h.paddock_id === pid && h.category === cat)?.head_count ?? 0;
    if (sim || real) {
      const diff = real - sim;
      console.log(`${name} ${cat}: sim=${sim}, real=${real}, diff=${diff > 0 ? '+' : ''}${diff} (= saldo antes de qualquer evento conhecido)`);
    }
  }
}

await supa.auth.signOut();
