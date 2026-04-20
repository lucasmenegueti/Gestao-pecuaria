// Baixa tiles OSM do bbox da fazenda e bundla no app como assets.
// Rodar quando o KML dos piquetes mudar ou ~1x/mês para refrescar.
// Uso: cd app && node scripts/fetch-tiles.mjs
//
// Lê src/lib/db/seed-map.ts para pegar geometrias dos piquetes, calcula bbox,
// baixa tiles z=12..17 com rate-limit e User-Agent, salva em assets/tiles/,
// e gera src/components/map/tile-manifest.ts com os require()s estáticos.

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const SEED_MAP_PATH = path.resolve('src/lib/db/seed-map.ts');
const TILES_DIR = path.resolve('assets/tiles');
const MANIFEST_PATH = path.resolve('src/components/map/tile-manifest.ts');

const MIN_ZOOM = 12;
const MAX_ZOOM = 17;
// Esri World Imagery (satélite, grátis, sem API key). Note que a ordem é z/y/x.
// Atribuição obrigatória: "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community".
const TILE_URL = (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const USER_AGENT = 'FazendaNSA-Pecuaria/0.5 (https://github.com/local/gestao-pecuaria)';
// Esri não publica rate-limit mas mantemos algo respeitoso.
const REQ_DELAY_MS = 250;

// -- bbox a partir das geometrias ---------------------------------------------

function extractBbox() {
  const src = fs.readFileSync(SEED_MAP_PATH, 'utf8');
  const re = /'(\{"type":"Polygon","coordinates":\[\[\[[^']+)'/g;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  let polyCount = 0;
  let m;
  while ((m = re.exec(src))) {
    try {
      const geo = JSON.parse(m[1]);
      for (const ring of geo.coordinates) {
        for (const [lon, lat] of ring) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        }
      }
      polyCount++;
    } catch {}
  }
  if (!Number.isFinite(minLat)) throw new Error('Bbox vazio — geometries não encontradas');
  // Pequena folga para tiles de borda (~200m)
  const pad = 0.002;
  return {
    minLat: minLat - pad,
    maxLat: maxLat + pad,
    minLon: minLon - pad,
    maxLon: maxLon + pad,
    polyCount,
  };
}

// -- tile math ---------------------------------------------------------------

function lon2x(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2y(lat, z) {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

function tilesForBbox(bbox, z) {
  const xMin = lon2x(bbox.minLon, z);
  const xMax = lon2x(bbox.maxLon, z);
  const yMin = lat2y(bbox.maxLat, z); // lat invertido — maxLat dá menor y
  const yMax = lat2y(bbox.minLat, z);
  const tiles = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

// -- download ---------------------------------------------------------------

function fetchTile(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'image/png' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} em ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// -- main -------------------------------------------------------------------

async function main() {
  const bbox = extractBbox();
  console.log(`Bbox: lat [${bbox.minLat.toFixed(4)}, ${bbox.maxLat.toFixed(4)}] lon [${bbox.minLon.toFixed(4)}, ${bbox.maxLon.toFixed(4)}] (${bbox.polyCount} polígonos)`);

  const allTiles = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const list = tilesForBbox(bbox, z);
    console.log(`  z=${z}: ${list.length} tiles`);
    allTiles.push(...list);
  }
  console.log(`Total: ${allTiles.length} tiles (~${((allTiles.length * 20) / 1024).toFixed(1)} MB estimados)\n`);

  fs.mkdirSync(TILES_DIR, { recursive: true });

  // Limpa tiles antigos que não fazem parte do conjunto atual (bbox pode ter mudado)
  const validFiles = new Set(allTiles.map((t) => `${t.z}_${t.x}_${t.y}.jpg`));
  for (const f of fs.readdirSync(TILES_DIR)) {
    if (f.endsWith('.jpg') && !validFiles.has(f)) {
      fs.unlinkSync(path.join(TILES_DIR, f));
    }
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  for (let i = 0; i < allTiles.length; i++) {
    const { z, x, y } = allTiles[i];
    const name = `${z}_${x}_${y}.jpg`;
    const filepath = path.join(TILES_DIR, name);

    if (fs.existsSync(filepath) && fs.statSync(filepath).size > 0) {
      skipped++;
      continue;
    }

    try {
      const buf = await fetchTile(TILE_URL(z, x, y));
      fs.writeFileSync(filepath, buf);
      downloaded++;
    } catch (e) {
      console.warn(`  falhou ${name}: ${e.message}`);
      failed++;
    }

    if ((i + 1) % 50 === 0 || i === allTiles.length - 1) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const pct = (((i + 1) / allTiles.length) * 100).toFixed(1);
      console.log(
        `  ${i + 1}/${allTiles.length} (${pct}%) baixados=${downloaded} cache=${skipped} falhas=${failed} t=${elapsed}s`
      );
    }

    if (downloaded > 0 && downloaded % 1 === 0) await sleep(REQ_DELAY_MS);
  }

  console.log(`\nTiles: ${downloaded} baixados, ${skipped} já existiam, ${failed} falhas\n`);

  // Gera manifest com require()s estáticos
  const lines = [];
  lines.push('// GERADO AUTOMATICAMENTE por scripts/fetch-tiles.mjs — NÃO EDITAR.');
  lines.push('// Regenerar após atualizar o KML ou ~1x/mês: cd app && node scripts/fetch-tiles.mjs');
  lines.push('');
  lines.push(`export const TILE_MIN_ZOOM = ${MIN_ZOOM};`);
  lines.push(`export const TILE_MAX_ZOOM = ${MAX_ZOOM};`);
  lines.push('');
  lines.push('// Cada entry é um require() que o Metro resolve para asset local no APK (native)');
  lines.push('// ou URL estática no bundle web. Lookup pela chave "z_x_y".');
  lines.push('// eslint-disable-next-line @typescript-eslint/no-var-requires');
  lines.push('export const TILE_MODULES: Record<string, number> = {');
  const tileFiles = fs.readdirSync(TILES_DIR).filter((f) => f.endsWith('.jpg')).sort();
  for (const f of tileFiles) {
    const key = f.replace('.jpg', '');
    lines.push(`  '${key}': require('../../../assets/tiles/${f}'),`);
  }
  lines.push('};');
  lines.push('');
  lines.push(`export const TILE_COUNT = ${tileFiles.length};`);
  lines.push('');

  fs.writeFileSync(MANIFEST_PATH, lines.join('\n'), 'utf8');
  console.log(`✓ Manifest gerado com ${tileFiles.length} tiles → ${MANIFEST_PATH}`);

  const totalSize = tileFiles.reduce((s, f) => s + fs.statSync(path.join(TILES_DIR, f)).size, 0);
  console.log(`✓ ${(totalSize / (1024 * 1024)).toFixed(1)} MB em assets/tiles/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
