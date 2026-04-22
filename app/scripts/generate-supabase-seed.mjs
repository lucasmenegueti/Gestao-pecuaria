// Gera supabase/seed.sql a partir dos seeds locais (seed.ts + seed-map.ts).
// Convertemos IDs integer em UUIDs determinísticos (v5 sobre um namespace fixo)
// pra que rodar o seed múltiplas vezes ou fazer sync cliente↔servidor gere o mesmo UUID.
// Uso: cd app && node scripts/generate-supabase-seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NS = 'nsa.pecuaria.v1'; // namespace pra UUID v5 determinístico

function uuidv5(name) {
  const sha = crypto.createHash('sha1');
  sha.update(NS + ':' + name);
  const h = sha.digest();
  // Formata como UUID (variante + versão)
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function sqlStr(s) {
  if (s == null) return 'null';
  return `'${String(s).replace(/'/g, "''")}'`;
}
function sqlNum(n) {
  return n == null ? 'null' : String(n);
}
function sqlBool(b) {
  return b ? 'true' : 'false';
}
function sqlJson(o) {
  return `${sqlStr(JSON.stringify(o))}::jsonb`;
}

// ---------- Ler seed-map.ts p/ paddocks ----------
const seedMapTxt = fs.readFileSync(path.resolve('src/lib/db/seed-map.ts'), 'utf8');

function parsePaddocks() {
  // (1, 'NSA I P01 - T32', 14.14, 1, 1, -15.23, -45.42, '{"type":"Polygon",...}')
  const re = /\((\d+),\s*'([^']+)',\s*([\d.]+),\s*(\d+),\s*(\d+),\s*(-?[\d.]+),\s*(-?[\d.]+),\s*'([^']+)'\)/g;
  const out = [];
  let m;
  while ((m = re.exec(seedMapTxt))) {
    out.push({
      localId: Number(m[1]),
      name: m[2],
      area_hectares: Number(m[3]),
      grass_type_local_id: Number(m[4]),
      active: Boolean(Number(m[5])),
      center_lat: Number(m[6]),
      center_lng: Number(m[7]),
      geometry: JSON.parse(m[8]),
    });
  }
  return out;
}

function parseWaterTanks() {
  const section = seedMapTxt.match(/SEED_WATER_TANKS_SQL[\s\S]*?INSERT INTO water_tanks[\s\S]*?VALUES([\s\S]*?);/);
  if (!section) return [];
  // Permite '' como escape de aspas simples dentro do nome SQL
  const re = /\((\d+),\s*'((?:[^']|'')*)',\s*(-?[\d.]+),\s*(-?[\d.]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(section[1]))) {
    out.push({ localId: Number(m[1]), name: m[2].replace(/''/g, "'"), lat: Number(m[3]), lng: Number(m[4]) });
  }
  return out;
}

function parseBoundaries() {
  const section = seedMapTxt.match(/SEED_FARM_BOUNDARIES_SQL[\s\S]*?INSERT INTO farm_boundaries[\s\S]*?VALUES([\s\S]*?);/);
  if (!section) return [];
  const re = /\((\d+),\s*'([^']+)',\s*'([^']+)'\)/g;
  const out = [];
  let m;
  while ((m = re.exec(section[1]))) {
    out.push({ localId: Number(m[1]), name: m[2], geometry: JSON.parse(m[3]) });
  }
  return out;
}

// ---------- Ler seed.ts p/ catálogos + herd + inventory ----------
const seedTxt = fs.readFileSync(path.resolve('src/lib/db/seed.ts'), 'utf8');

function parseSection(label, columns) {
  const re = new RegExp(`${label}[\\s\\S]*?VALUES([\\s\\S]*?);`, 'i');
  const m = seedTxt.match(re);
  if (!m) return [];
  const rowRe = /\(([^()]+)\)/g;
  const out = [];
  let row;
  while ((row = rowRe.exec(m[1]))) {
    const parts = row[1].split(',').map((p) => p.trim());
    const obj = {};
    columns.forEach((c, i) => {
      let v = parts[i];
      if (v === 'NULL' || v === 'null') v = null;
      else if (v?.startsWith("'") && v?.endsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
      else if (!isNaN(Number(v))) v = Number(v);
      obj[c] = v;
    });
    out.push(obj);
  }
  return out;
}

const grassTypes = parseSection('INTO grass_types', ['name', 'entry_height_cm', 'exit_height_cm']);
const formulas = parseSection('INTO formulas', ['name', 'kg_per_sack', 'target_g_per_kg_body_day']);
const herd = parseSection('INTO herd', ['paddock_local_id', 'category', 'head_count', 'avg_weight_kg']);
// Inventory central (tem quantity_sacks)
const invCentral = parseSection(
  'INTO inventory \\(formula_id, quantity_sacks, min_sacks, location\\)',
  ['formula_local_id', 'quantity_sacks', 'min_sacks', 'location']
);

// ---------- Resolver UUIDs ----------
const grassUuid = (localId) => uuidv5(`grass_types:${localId}`);
const formulaUuid = (localId) => uuidv5(`formulas:${localId}`);
const paddockUuid = (localId) => uuidv5(`paddocks:${localId}`);
const waterTankUuid = (localId) => uuidv5(`water_tanks:${localId}`);
const boundaryUuid = (localId) => uuidv5(`farm_boundaries:${localId}`);
const herdUuid = (paddockId, cat) => uuidv5(`herd:${paddockId}:${cat}`);
const invUuid = (formulaLocalId, loc, paddockLocalId) =>
  uuidv5(`inventory:${formulaLocalId}:${loc}:${paddockLocalId ?? 'na'}`);

// ---------- Gerar SQL ----------
const L = [];
L.push(`-- ====================================================================`);
L.push(`-- Gestão Pecuária NSA — seed de produção`);
L.push(`-- Gerado por scripts/generate-supabase-seed.mjs em ${new Date().toISOString().slice(0, 10)}`);
L.push(`-- Rodar DEPOIS do schema.sql no SQL Editor do Supabase.`);
L.push(`-- Idempotente: ON CONFLICT DO NOTHING em todas as inserções.`);
L.push(`-- ====================================================================`);
L.push('');

L.push('-- Grass types -----------------------------------------------------------');
grassTypes.forEach((g, i) => {
  const id = grassUuid(i + 1);
  L.push(`insert into grass_types (id, name, entry_height_cm, exit_height_cm, active)`);
  L.push(`  values (${sqlStr(id)}, ${sqlStr(g.name)}, ${sqlNum(g.entry_height_cm)}, ${sqlNum(g.exit_height_cm)}, true)`);
  L.push(`  on conflict (id) do nothing;`);
});
L.push('');

L.push('-- Formulas --------------------------------------------------------------');
formulas.forEach((f, i) => {
  const id = formulaUuid(i + 1);
  L.push(`insert into formulas (id, name, kg_per_sack, target_g_per_kg_body_day, active)`);
  L.push(`  values (${sqlStr(id)}, ${sqlStr(f.name)}, ${sqlNum(f.kg_per_sack)}, ${sqlNum(f.target_g_per_kg_body_day)}, true)`);
  L.push(`  on conflict (id) do nothing;`);
});
L.push('');

const paddocks = parsePaddocks();
L.push(`-- Paddocks (${paddocks.length}) ----------------------------------------`);
paddocks.forEach((p) => {
  L.push(
    `insert into paddocks (id, name, area_hectares, grass_type_id, center_lat, center_lng, geometry, active)`
  );
  L.push(
    `  values (${sqlStr(paddockUuid(p.localId))}, ${sqlStr(p.name)}, ${sqlNum(p.area_hectares)}, ${sqlStr(
      grassUuid(p.grass_type_local_id)
    )}, ${sqlNum(p.center_lat)}, ${sqlNum(p.center_lng)}, ${sqlJson(p.geometry)}, ${sqlBool(p.active)})`
  );
  L.push(`  on conflict (id) do nothing;`);
});
L.push('');

const tanks = parseWaterTanks();
L.push(`-- Water tanks (${tanks.length}) --------------------------------------`);
tanks.forEach((t) => {
  L.push(
    `insert into water_tanks (id, name, lat, lng) values (${sqlStr(waterTankUuid(t.localId))}, ${sqlStr(
      t.name
    )}, ${sqlNum(t.lat)}, ${sqlNum(t.lng)}) on conflict (id) do nothing;`
  );
});
L.push('');

const boundaries = parseBoundaries();
L.push(`-- Farm boundaries (${boundaries.length}) ----------------------------`);
boundaries.forEach((b) => {
  L.push(
    `insert into farm_boundaries (id, name, geometry) values (${sqlStr(boundaryUuid(b.localId))}, ${sqlStr(
      b.name
    )}, ${sqlJson(b.geometry)}) on conflict (id) do nothing;`
  );
});
L.push('');

L.push(`-- Herd (${herd.length}) ----------------------------------------------`);
herd.forEach((h) => {
  L.push(
    `insert into herd (id, paddock_id, category, head_count, avg_weight_kg) values (${sqlStr(
      herdUuid(h.paddock_local_id, h.category)
    )}, ${sqlStr(paddockUuid(h.paddock_local_id))}, ${sqlStr(h.category)}, ${sqlNum(h.head_count)}, ${sqlNum(
      h.avg_weight_kg
    )}) on conflict (id) do nothing;`
  );
});
L.push('');

L.push(`-- Inventory central (${invCentral.length}) ---------------------------`);
invCentral.forEach((r) => {
  L.push(
    `insert into inventory (id, formula_id, quantity_sacks, min_sacks, location) values (${sqlStr(
      invUuid(r.formula_local_id, 'central', null)
    )}, ${sqlStr(formulaUuid(r.formula_local_id))}, ${sqlNum(r.quantity_sacks)}, ${sqlNum(r.min_sacks)}, ${sqlStr(
      r.location
    )}) on conflict (id) do nothing;`
  );
});
L.push('');

L.push(`-- Bombonas: criadas conforme peão fizer reabastecimento no app.`);
L.push('');

fs.writeFileSync(path.resolve('supabase/seed.sql'), L.join('\n') + '\n', 'utf8');
console.log(`✓ supabase/seed.sql gerado`);
console.log(`  ${grassTypes.length} grass types`);
console.log(`  ${formulas.length} formulas`);
console.log(`  ${paddocks.length} paddocks`);
console.log(`  ${tanks.length} water tanks`);
console.log(`  ${boundaries.length} farm boundaries`);
console.log(`  ${herd.length} herd allocations`);
console.log(`  ${invCentral.length} inventory central`);
