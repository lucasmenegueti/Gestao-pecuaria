// Histórico de mudanças no rebanho desde uma data.
// Lista todos os herd_events e rows em herd com mudanças no período, com nome
// do piquete e nome do usuário que criou cada evento.
//
// Uso: cd app && node scripts/history-herd.mjs <username> <password> [yyyy-mm-dd]
// Padrão da data: 2026-05-08 (sexta — investigação Gabriel "gado aumentou sozinho")

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const URL_ = get('EXPO_PUBLIC_SUPABASE_URL');
const KEY_ = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');

const [, , user, pass, sinceArg] = process.argv;
if (!user || !pass) {
  console.error('uso: node scripts/history-herd.mjs <username> <password> [yyyy-mm-dd]');
  process.exit(1);
}
const SINCE = sinceArg || '2026-05-08';

const supa = createClient(URL_, KEY_, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

console.log(`[hist] login ${user}...`);
const email = (await supa.rpc('email_for_username', { u: user.trim().toLowerCase() })).data;
if (!email) { console.error('usuário não encontrado'); process.exit(1); }
const sign = await supa.auth.signInWithPassword({ email, password: pass });
if (sign.error) { console.error('login falhou:', sign.error.message); process.exit(1); }

const [{ data: paddocks, error: pErr }, { data: profiles, error: prErr }] = await Promise.all([
  supa.from('paddocks').select('id, name'),
  supa.from('profiles').select('id, username, name'),
]);
if (pErr) { console.error('paddocks:', pErr.message); process.exit(1); }
if (prErr) { console.error('profiles:', prErr.message); process.exit(1); }
const pName = new Map(paddocks.map((p) => [p.id, p.name]));
const uName = new Map(profiles.map((u) => [u.id, u.username]));
const nameOf = (id) => id == null ? 'DESALOCADO' : (pName.get(id) ?? `?${id}`);
const userOf = (id) => id == null ? '' : (uName.get(id) ?? `?${String(id).slice(0, 8)}`);

console.log(`[hist] pull herd_events desde ${SINCE}...`);
const { data: events, error: eErr } = await supa
  .from('herd_events')
  .select('id, paddock_id, event_type, category, head_count, target_paddock_id, notes, date, created_by, created_at, updated_at, deleted_at')
  .gte('created_at', `${SINCE} 00:00:00`)
  .order('created_at', { ascending: true });
if (eErr) { console.error('herd_events:', eErr.message); process.exit(1); }

console.log('[hist] pull herd snapshot (modificados)...');
const { data: herd, error: hErr } = await supa
  .from('herd')
  .select('id, paddock_id, category, head_count, created_by, created_at, updated_at, deleted_at')
  .gte('updated_at', `${SINCE} 00:00:00`)
  .order('updated_at', { ascending: true });
if (hErr) { console.error('herd:', hErr.message); process.exit(1); }

// --- agrega delta por categoria ---
const SIGN = {
  COMPRA: +1, NASCIMENTO: +1, ALOCACAO: +1,
  VENDA: -1, MORTE: -1, DESALOCACAO: -1, CONSUMO: -1,
  TRANSFERENCIA: 0, EVOLUCAO: 0, ABORTO: 0,
};
const deltaByCat = new Map();
const deltaTotal = { in: 0, out: 0, neutral: 0 };
const byUser = new Map();
for (const e of events) {
  if (e.deleted_at) continue;
  const s = SIGN[e.event_type] ?? 0;
  if (s > 0) deltaTotal.in += e.head_count;
  else if (s < 0) deltaTotal.out += e.head_count;
  else deltaTotal.neutral += e.head_count;
  const slot = deltaByCat.get(e.category) ?? { in: 0, out: 0, neutral: 0, events: 0 };
  if (s > 0) slot.in += e.head_count;
  else if (s < 0) slot.out += e.head_count;
  else slot.neutral += e.head_count;
  slot.events += 1;
  deltaByCat.set(e.category, slot);

  const u = userOf(e.created_by) || '(sem user)';
  const us = byUser.get(u) ?? { in: 0, out: 0, neutral: 0, events: 0 };
  if (s > 0) us.in += e.head_count;
  else if (s < 0) us.out += e.head_count;
  else us.neutral += e.head_count;
  us.events += 1;
  byUser.set(u, us);
}

// --- console: linha-a-linha ---
console.log(`\n=== HERD_EVENTS desde ${SINCE} (${events.length} eventos) ===\n`);
const hdr = ['quando_utc', 'user', 'tipo', 'piquete', '→ destino', 'categoria', 'qtd', 'obs'];
console.log(hdr.join(' | '));
console.log('-'.repeat(130));
for (const e of events) {
  const when = (e.created_at ?? '').slice(0, 19).replace('T', ' ');
  const from = nameOf(e.paddock_id);
  const to = e.target_paddock_id ? nameOf(e.target_paddock_id) : '';
  const sign = SIGN[e.event_type] ?? 0;
  const sigil = sign > 0 ? '+' : sign < 0 ? '-' : '=';
  console.log([
    when,
    userOf(e.created_by),
    `${sigil}${e.event_type}`,
    from,
    to,
    e.category,
    e.head_count,
    (e.notes ?? '').slice(0, 60),
    e.deleted_at ? '[DEL]' : '',
  ].join(' | '));
}

console.log(`\n=== HERD ROWS modificadas desde ${SINCE} (${herd.length} rows) ===\n`);
console.log(['id', 'piquete', 'categoria', 'cab', 'criado_por', 'updated_utc', 'deletado?'].join(' | '));
console.log('-'.repeat(120));
for (const h of herd) {
  console.log([
    h.id,
    nameOf(h.paddock_id),
    h.category,
    h.head_count,
    userOf(h.created_by),
    (h.updated_at ?? '').slice(0, 19).replace('T', ' '),
    h.deleted_at ? 'sim' : '',
  ].join(' | '));
}

// --- consolidado ---
console.log('\n=== DELTA TOTAL por sinal ===');
console.log(`+ entradas (COMPRA/NASCIMENTO/ALOCACAO): ${deltaTotal.in} cab`);
console.log(`- saídas   (VENDA/MORTE/DESALOCACAO/CONSUMO): ${deltaTotal.out} cab`);
console.log(`= neutros  (TRANSFERENCIA/EVOLUCAO):     ${deltaTotal.neutral} movimentos`);
console.log(`Delta líquido no rebanho:                ${deltaTotal.in - deltaTotal.out} cab`);

console.log('\n=== POR USUÁRIO ===');
console.log(['user', 'eventos', '+entradas', '-saídas', '=neutros', 'delta'].join(' | '));
for (const [u, d] of byUser) {
  console.log([u, d.events, d.in, d.out, d.neutral, d.in - d.out].join(' | '));
}

console.log('\n=== POR CATEGORIA ===');
console.log(['categoria', 'entradas', 'saídas', 'neutros', 'eventos', 'delta'].join(' | '));
for (const [cat, d] of deltaByCat) {
  console.log([cat, d.in, d.out, d.neutral, d.events, d.in - d.out].join(' | '));
}

// --- xlsx ---
const wb = XLSX.utils.book_new();
const wsEv = XLSX.utils.aoa_to_sheet([
  ['id', 'created_at_utc', 'user', 'tipo', 'piquete_origem', 'piquete_destino', 'categoria', 'head_count', 'sign', 'notes', 'date', 'updated_at', 'deleted_at'],
  ...events.map((e) => [
    e.id,
    e.created_at,
    userOf(e.created_by),
    e.event_type,
    nameOf(e.paddock_id),
    e.target_paddock_id ? nameOf(e.target_paddock_id) : '',
    e.category,
    e.head_count,
    SIGN[e.event_type] ?? 0,
    e.notes ?? '',
    e.date,
    e.updated_at,
    e.deleted_at ?? '',
  ]),
]);
wsEv['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 6 }, { wch: 40 }, { wch: 12 }, { wch: 22 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsEv, 'herd_events');

const wsHerd = XLSX.utils.aoa_to_sheet([
  ['id', 'piquete', 'categoria', 'head_count', 'criado_por', 'created_at', 'updated_at', 'deleted_at'],
  ...herd.map((h) => [h.id, nameOf(h.paddock_id), h.category, h.head_count, userOf(h.created_by), h.created_at, h.updated_at, h.deleted_at ?? '']),
]);
wsHerd['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
XLSX.utils.book_append_sheet(wb, wsHerd, 'herd_rows');

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const out = path.resolve(`history-herd-${ts}.xlsx`);
XLSX.writeFile(wb, out);
console.log(`\n[hist] arquivo: ${out}`);

await supa.auth.signOut();
