// One-shot: lê o KML/KMZ mais recente da fazenda e gera src/lib/db/seed-map.ts
// Uso: node scripts/kml-to-seed.mjs [caminho.kml|caminho.kmz]
// Sem argumento, pega o arquivo mais recente em kml/ que bata com "Fazenda NSA - Pastos*".
// Estrutura esperada: MultiGeometry com Polygon + Point por Placemark.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';

const KML_DIR = 'C:/Users/lucas/gestao-pecuaria/kml';
const OUT_PATH = path.resolve('src/lib/db/seed-map.ts');

function findLatestKmlFile() {
  const cliArg = process.argv[2];
  if (cliArg) return path.resolve(cliArg);
  const candidates = fs.readdirSync(KML_DIR)
    .filter((f) => /^Fazenda NSA - Pastos.*\.(kml|kmz)$/i.test(f))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(KML_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) throw new Error('Nenhum KML/KMZ encontrado em ' + KML_DIR);
  return path.join(KML_DIR, candidates[0].name);
}

const KML_PATH = findLatestKmlFile();
console.log(`Fonte: ${KML_PATH}`);

// Caixas d'água e limites não estão no KML v5 — mantidos estáticos aqui
// (valores herdados do KML anterior; ajustar manualmente se forem relocadas em campo).
const WATER_TANKS = [
  { name: "Caixa d'agua 1", lat: -15.21983564978106, lng: -45.45121482402494 },
  { name: "Caixa d'agua 2", lat: -15.25730567660034, lng: -45.39460637560483 },
  { name: "Caixa d'agua 3", lat: -15.24661165927414, lng: -45.35299071762665 },
  { name: "Caixa d'agua 4", lat: -15.20317266998652, lng: -45.34811573754892 },
];

const FARM_BOUNDARIES = [
  {
    name: 'NSA2',
    coords: [
      [-45.38659, -15.19776],
      [-45.37614, -15.17871],
      [-45.3477, -15.20306],
      [-45.35552, -15.21436],
      [-45.38659, -15.19776],
    ],
  },
];

// Se for .kml, lê direto. Se for .kmz (zip), descompacta em /tmp primeiro.
let xml;
if (KML_PATH.toLowerCase().endsWith('.kmz')) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsa-kml-'));
  execSync(`unzip -o "${KML_PATH}" -d "${tmpDir}"`, { stdio: ['ignore', 'pipe', 'pipe'] });
  const kmlFile = fs.readdirSync(tmpDir).find((f) => f.toLowerCase().endsWith('.kml'));
  if (!kmlFile) throw new Error('KMZ não contém .kml');
  xml = fs.readFileSync(path.join(tmpDir, kmlFile), 'utf8');
  fs.rmSync(tmpDir, { recursive: true, force: true });
} else {
  xml = fs.readFileSync(KML_PATH, 'utf8');
}

const placemarkRe = /<Placemark>([\s\S]*?)<\/Placemark>/g;
const nameRe = /<name>([\s\S]*?)<\/name>/;
const descRe = /<description>([\s\S]*?)<\/description>/;
const polyCoordsRe = /<Polygon>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Polygon>/;

function decodeEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseCoords(raw) {
  return raw
    .trim()
    .split(/\s+/)
    .map((triple) => {
      const [lon, lat] = triple.split(',').map(Number);
      return [lon, lat];
    })
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
}

// Projeção equiretangular simples p/ área em ha
function polygonAreaHa(ring) {
  if (ring.length < 3) return 0;
  const lat0 = ring.reduce((s, [, lat]) => s + lat, 0) / ring.length;
  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const pts = ring.map(([lon, lat]) => [lon * mPerDegLon, lat * mPerDegLat]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2) / 10000;
}

function centroid(ring) {
  const lat = ring.reduce((s, [, la]) => s + la, 0) / ring.length;
  const lon = ring.reduce((s, [lo]) => s + lo, 0) / ring.length;
  return { lat, lon };
}

// Extrai metadados do CDATA do <description>
function extractMeta(desc) {
  const meta = {};
  const fields = {
    retiro: /<b>Retiro:<\/b>\s*([^<]+)/,
    areaAberta: /<b>Area aberta:<\/b>\s*([\d.]+)\s*ha/,
    forragem: /<b>Forragem:<\/b>\s*([^<]+)/,
    idPasto: /<b>IdPasto:<\/b>\s*(\d+)/,
  };
  for (const [k, re] of Object.entries(fields)) {
    const m = desc.match(re);
    if (m) meta[k] = m[1].trim();
  }
  return meta;
}

const paddocks = [];

let match;
while ((match = placemarkRe.exec(xml))) {
  const block = match[1];
  const nameMatch = block.match(nameRe);
  const descMatch = block.match(descRe);
  const coordsMatch = block.match(polyCoordsRe);
  if (!nameMatch || !coordsMatch) continue;

  const name = decodeEntities(nameMatch[1].trim());
  const coords = parseCoords(coordsMatch[1]);
  if (coords.length < 3) continue;

  const meta = descMatch ? extractMeta(decodeEntities(descMatch[1])) : {};
  // Prefere área declarada no KML; cai p/ calculada em último caso.
  const computedHa = Math.round(polygonAreaHa(coords) * 100) / 100;
  const area = meta.areaAberta ? parseFloat(meta.areaAberta) : computedHa;
  const { lat, lon } = centroid(coords);

  paddocks.push({
    name,
    retiro: meta.retiro || null,
    idPasto: meta.idPasto || null,
    coords,
    area_ha: area,
    center_lat: lat,
    center_lon: lon,
  });
}

// Deduplicar por nome+retiro (evita colisão entre NSA I e NSA II)
const byKey = new Map();
for (const p of paddocks) {
  const key = `${p.retiro || ''}|${p.name}`;
  const prev = byKey.get(key);
  if (!prev || p.area_ha > prev.area_ha) byKey.set(key, p);
}
const deduped = [...byKey.values()].sort((a, b) => {
  const r = (a.retiro || '').localeCompare(b.retiro || '', 'pt-BR');
  return r !== 0 ? r : a.name.localeCompare(b.name, 'pt-BR');
});

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function asGeoJSON(coords) {
  return JSON.stringify({ type: 'Polygon', coordinates: [coords] });
}

// Nome do KML é fonte da verdade (depois do v0.7.7, todos os piquetes seguem
// "Txx - Pxx" ou "Pxx" — sem prefixo NSA I/II). O Retiro do CDATA é preservado
// no banco como metadado, mas não entra mais no display name.
const displayName = (p) => p.name;

const paddockInserts = deduped.map((p, i) =>
  `  (${i + 1}, ${sqlStr(displayName(p))}, ${p.area_ha}, 1, 1, ${p.center_lat}, ${p.center_lon}, ${sqlStr(asGeoJSON(p.coords))})`
);

const tankInserts = WATER_TANKS.map((t, i) =>
  `  (${i + 1}, ${sqlStr(t.name)}, ${t.lat}, ${t.lng})`
);

const boundaryInserts = FARM_BOUNDARIES.map((b, i) =>
  `  (${i + 1}, ${sqlStr(b.name)}, ${sqlStr(asGeoJSON(b.coords))})`
);

const out = `// GERADO AUTOMATICAMENTE por scripts/kml-to-seed.mjs — NÃO EDITAR MANUALMENTE.
// Fonte: kml/Fazenda NSA - Pastos v5.kmz
// Para regenerar: cd app && node scripts/kml-to-seed.mjs

export const SEED_PADDOCKS_SQL = \`
DELETE FROM paddocks;
INSERT INTO paddocks (id, name, area_hectares, grass_type_id, active, center_lat, center_lng, geometry) VALUES
${paddockInserts.join(',\n')};
\`;

export const SEED_WATER_TANKS_SQL = \`
DELETE FROM water_tanks;
INSERT INTO water_tanks (id, name, lat, lng) VALUES
${tankInserts.join(',\n')};
\`;

export const SEED_FARM_BOUNDARIES_SQL = \`
DELETE FROM farm_boundaries;
INSERT INTO farm_boundaries (id, name, geometry) VALUES
${boundaryInserts.join(',\n')};
\`;

// Para debug
export const PADDOCK_COUNT = ${deduped.length};
export const TANK_COUNT = ${WATER_TANKS.length};
export const BOUNDARY_COUNT = ${FARM_BOUNDARIES.length};
`;

fs.writeFileSync(OUT_PATH, out, 'utf8');
console.log(`✓ ${deduped.length} piquetes, ${WATER_TANKS.length} caixas d'água, ${FARM_BOUNDARIES.length} limite(s) → ${OUT_PATH}`);
const byRetiro = deduped.reduce((acc, p) => {
  acc[p.retiro || 'sem retiro'] = (acc[p.retiro || 'sem retiro'] || 0) + 1;
  return acc;
}, {});
console.log('Por retiro:', byRetiro);
