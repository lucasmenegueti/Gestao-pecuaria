// One-shot: lê xlsx de rebanho por piquete e gera o bloco SEED_HERD_SQL em seed.ts.
// Uso: cd app && node scripts/xlsx-to-herd.mjs [caminho.xlsx]
// Sem argumento pega o xlsx mais recente em kml/ que bata com "*rebanho*".
//
// Cruza com src/lib/db/seed-map.ts para mapear "Retiro + Piquete" → paddock_id.
// Nomes em seed-map.ts têm formato "NSA I P03 - T32" (retiro prefix).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// xlsx pode não estar no node_modules do app — tenta instalar em /tmp se precisar
let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  try { XLSX = require('/tmp/xlsx-tools/node_modules/xlsx'); }
  catch {
    console.error('Pacote xlsx não encontrado. Rode: npm install -g xlsx (ou instale no app).');
    process.exit(1);
  }
}

const KML_DIR = 'C:/Users/lucas/gestao-pecuaria/kml';
const SEED_MAP_PATH = path.resolve('src/lib/db/seed-map.ts');
const SEED_PATH = path.resolve('src/lib/db/seed.ts');

function findLatest() {
  const cli = process.argv[2];
  if (cli) return path.resolve(cli);
  const cands = fs.readdirSync(KML_DIR)
    .filter((f) => /rebanho.*\.xlsx$/i.test(f))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(KML_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (cands.length === 0) throw new Error('Nenhum xlsx de rebanho em ' + KML_DIR);
  return path.join(KML_DIR, cands[0].name);
}

// Lê seed-map.ts e extrai { nome: id } — nome inclui retiro (ex. "NSA I P03 - T32")
function loadPaddockMap() {
  const src = fs.readFileSync(SEED_MAP_PATH, 'utf8');
  const re = /\((\d+),\s*'([^']+)',/g;
  const byName = new Map();
  let m;
  while ((m = re.exec(src))) {
    byName.set(m[2], Number(m[1]));
  }
  return byName;
}

const xlsxPath = findLatest();
console.log(`Fonte: ${xlsxPath}`);

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Rebanho por Piquete'], { defval: null });
const paddockByName = loadPaddockMap();

const inserts = [];
const missing = [];
let totalHeads = 0;

for (const r of rows) {
  const cat = r.Categoria;
  const heads = r.Cabecas;
  if (!cat || cat === '(vazio)' || !heads || heads <= 0) continue;

  const fullName = `${r.Retiro} ${r.Piquete}`;
  const paddockId = paddockByName.get(fullName);
  if (!paddockId) {
    missing.push(fullName);
    continue;
  }
  const weight = r['Peso visual (kg)'] != null ? Number(r['Peso visual (kg)']) : null;
  const weightSql = weight != null ? weight : 'NULL';
  inserts.push(`  (${paddockId}, '${String(cat).replace(/'/g, "''")}', ${heads}, ${weightSql})`);
  totalHeads += heads;
}

if (missing.length > 0) {
  console.warn(`Piquetes do xlsx sem match no seed-map.ts (${missing.length}):`);
  missing.slice(0, 20).forEach((m) => console.warn('  -', m));
  if (missing.length > 20) console.warn('  ... e mais ' + (missing.length - 20));
}

// Monta o novo SEED_HERD_SQL e substitui no seed.ts
const newSeedSql = `export const SEED_HERD_SQL = \`
INSERT OR IGNORE INTO herd (paddock_id, category, head_count, avg_weight_kg) VALUES
${inserts.join(',\n')};
\`;`;

let seedFile = fs.readFileSync(SEED_PATH, 'utf8');
// Substitui tudo entre "export const SEED_HERD_SQL =" até o próximo ;"
const seedRe = /export const SEED_HERD_SQL = `[\s\S]*?`;/;
if (!seedRe.test(seedFile)) throw new Error('Marcador SEED_HERD_SQL não encontrado em ' + SEED_PATH);
seedFile = seedFile.replace(seedRe, newSeedSql);
fs.writeFileSync(SEED_PATH, seedFile, 'utf8');

console.log(`✓ ${inserts.length} alocações geradas (${totalHeads} cab) → ${SEED_PATH}`);
