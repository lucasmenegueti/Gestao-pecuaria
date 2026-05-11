// Auditoria do rebanho: piquete a piquete + desalocados + totais consolidados.
// Investiga a discrepância reportada pelo coordenador (soma por piquete + desalocados
// não bate com os totais consolidados por categoria).
//
// Hipótese principal a verificar: rows em `herd` (deleted_at IS NULL, head_count > 0)
// vinculadas a `paddocks` com `active = 0` somam no consolidado mas não aparecem
// em "POR PIQUETE" (que filtra p.active = 1) nem em "DESALOCADOS" (paddock_id IS NULL).
//
// Uso: cd app && node scripts/audit-herd.mjs <username> <password>
// Saída: app/audit-herd-<timestamp>.xlsx

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

const [, , user, pass] = process.argv;
if (!user || !pass) {
  console.error('uso: node scripts/audit-herd.mjs <username> <password>');
  process.exit(1);
}

const CATEGORIES = [
  'BEZERRO MAMANDO', 'BEZERRA MAMANDO', 'BEZERRO', 'BEZERRA',
  'GARROTE', 'NOVILHA', 'NOVILHA PRENHA', 'BOI',
  'VACA SOLTEIRA', 'VACA PRENHA', 'VACA PARIDA',
];

const supa = createClient(URL_, KEY_, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

console.log('[audit] login...');
const email = (await supa.rpc('email_for_username', { u: user.trim().toLowerCase() })).data;
if (!email) { console.error('usuário não encontrado'); process.exit(1); }
const sign = await supa.auth.signInWithPassword({ email, password: pass });
if (sign.error) { console.error('login falhou:', sign.error.message); process.exit(1); }

console.log('[audit] pull paddocks...');
const { data: paddocks, error: pErr } = await supa
  .from('paddocks')
  .select('id, name, area_hectares, active, deleted_at')
  .order('name', { ascending: true });
if (pErr) { console.error(pErr.message); process.exit(1); }

// Postgres devolve `active` como boolean; SQLite local guarda 0/1. Normaliza.
for (const p of paddocks) p.active = p.active === true || p.active === 1 ? 1 : 0;
const activeStats = paddocks.reduce((a, p) => { a[`active=${p.active}`] = (a[`active=${p.active}`] ?? 0) + 1; return a; }, {});
console.log('[audit] paddocks status:', activeStats, 'total:', paddocks.length);

console.log('[audit] pull herd...');
const { data: herd, error: hErr } = await supa
  .from('herd')
  .select('id, paddock_id, category, head_count, deleted_at')
  .is('deleted_at', null);
if (hErr) { console.error(hErr.message); process.exit(1); }

const paddockById = new Map(paddocks.map((p) => [p.id, p]));

// Agrupa por (paddock_id, category) e soma head_count — protege contra rows duplicados.
// paddock_id null = pool de desalocados.
const buckets = new Map(); // key -> { paddock_id, category, total }
for (const r of herd) {
  if (!r.head_count || r.head_count <= 0) continue;
  if (!CATEGORIES.includes(r.category)) {
    console.warn(`[warn] categoria desconhecida: ${r.category} (id ${r.id})`);
  }
  const key = `${r.paddock_id ?? 'NULL'}|${r.category}`;
  const e = buckets.get(key) ?? { paddock_id: r.paddock_id, category: r.category, total: 0 };
  e.total += r.head_count;
  buckets.set(key, e);
}

// Pivot: paddock_id -> { category -> total }
const pivot = new Map();
for (const e of buckets.values()) {
  const key = e.paddock_id ?? 'NULL';
  if (!pivot.has(key)) pivot.set(key, {});
  pivot.get(key)[e.category] = (pivot.get(key)[e.category] ?? 0) + e.total;
}

// Monta linhas: piquetes ativos primeiro, depois piquetes inativos com gado, depois desalocados.
const rows = [];
const header = ['Piquete', 'Status', 'Área (ha)', ...CATEGORIES, 'TOTAL'];
rows.push(header);

const activePaddocks = paddocks
  .filter((p) => p.active === 1 && !p.deleted_at)
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

const inactiveWithCattle = paddocks
  .filter((p) => (p.active === 0 || p.deleted_at) && pivot.has(p.id))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

function buildRow(label, status, area, byCat) {
  const counts = CATEGORIES.map((c) => byCat?.[c] ?? 0);
  const total = counts.reduce((s, n) => s + n, 0);
  return [label, status, area ?? '', ...counts, total];
}

for (const p of activePaddocks) {
  const byCat = pivot.get(p.id);
  const row = buildRow(p.name, 'ativo', p.area_hectares, byCat);
  // só inclui na planilha se tiver gado OU se for ativo (ativos ficam todos pra contexto)
  rows.push(row);
}

if (inactiveWithCattle.length) {
  rows.push([]); // separador
  rows.push(['--- PIQUETES INATIVOS COM GADO (BUG: não aparecem em POR PIQUETE no app) ---']);
  for (const p of inactiveWithCattle) {
    const status = p.deleted_at ? 'deletado' : 'inativo';
    rows.push(buildRow(p.name, status, p.area_hectares, pivot.get(p.id)));
  }
}

// DESALOCADOS
rows.push([]);
rows.push(buildRow('DESALOCADOS (sem piquete)', 'pool', '', pivot.get('NULL')));

// Totais consolidados
rows.push([]);
const colTotals = CATEGORIES.map((c) => {
  let s = 0;
  for (const byCat of pivot.values()) s += byCat[c] ?? 0;
  return s;
});
const grandTotal = colTotals.reduce((s, n) => s + n, 0);
rows.push(['TOTAL CONSOLIDADO (todas as origens)', '', '', ...colTotals, grandTotal]);

// Reconciliação
const sumActive = activePaddocks.reduce((s, p) => {
  const byCat = pivot.get(p.id) ?? {};
  return s + CATEGORIES.reduce((a, c) => a + (byCat[c] ?? 0), 0);
}, 0);
const sumInactive = inactiveWithCattle.reduce((s, p) => {
  const byCat = pivot.get(p.id) ?? {};
  return s + CATEGORIES.reduce((a, c) => a + (byCat[c] ?? 0), 0);
}, 0);
const sumPool = CATEGORIES.reduce((a, c) => a + (pivot.get('NULL')?.[c] ?? 0), 0);

rows.push([]);
rows.push(['RECONCILIAÇÃO']);
rows.push(['Soma piquetes ativos', '', '', '', '', '', '', '', '', '', '', '', '', '', sumActive]);
rows.push(['Soma piquetes inativos com gado', '', '', '', '', '', '', '', '', '', '', '', '', '', sumInactive]);
rows.push(['Soma desalocados', '', '', '', '', '', '', '', '', '', '', '', '', '', sumPool]);
rows.push(['= Total real', '', '', '', '', '', '', '', '', '', '', '', '', '', sumActive + sumInactive + sumPool]);
rows.push(['App mostra (consolidado por categoria)', '', '', '', '', '', '', '', '', '', '', '', '', '', grandTotal]);
rows.push(['App soma "POR PIQUETE" + DESALOCADOS', '', '', '', '', '', '', '', '', '', '', '', '', '', sumActive + sumPool]);
rows.push(['DIFERENÇA (gado preso em piquetes inativos)', '', '', '', '', '', '', '', '', '', '', '', '', '', sumInactive]);

const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [{ wch: 32 }, { wch: 10 }, { wch: 9 }, ...CATEGORIES.map(() => ({ wch: 9 })), { wch: 8 }];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Auditoria Rebanho');

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const out = path.resolve(`audit-herd-${ts}.xlsx`);
XLSX.writeFile(wb, out);

console.log(`\n[audit] arquivo: ${out}`);
console.log(`[audit] piquetes ativos:           ${activePaddocks.length}  (${sumActive} cab)`);
console.log(`[audit] piquetes inativos c/ gado: ${inactiveWithCattle.length}  (${sumInactive} cab) ← BUG`);
console.log(`[audit] desalocados:               ${sumPool} cab`);
console.log(`[audit] consolidado:               ${grandTotal} cab`);
console.log(`[audit] diferença não-explicada:   ${grandTotal - (sumActive + sumInactive + sumPool)} cab`);

await supa.auth.signOut();
