// Lê Leaflet de node_modules e gera src/components/map/leaflet-inline.ts
// com CSS e JS como strings. Necessário para o WebView ter Leaflet offline
// (sem CDN, funciona em campo sem rede).
// Uso: cd app && node scripts/bundle-leaflet-inline.mjs
import fs from 'node:fs';
import path from 'node:path';

const SOURCES = [
  { name: 'LEAFLET_CSS', file: 'node_modules/leaflet/dist/leaflet.css' },
  { name: 'LEAFLET_JS', file: 'node_modules/leaflet/dist/leaflet.js' },
];

const OUT = path.resolve('src/components/map/leaflet-inline.ts');

function escapeBacktick(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const chunks = [];
chunks.push('// GERADO AUTOMATICAMENTE por scripts/bundle-leaflet-inline.mjs — NÃO EDITAR.');
chunks.push('// Leaflet inline p/ o WebView rodar sem rede.');
chunks.push('// Regenerar: cd app && node scripts/bundle-leaflet-inline.mjs');
chunks.push('');

for (const { name, file } of SOURCES) {
  const src = fs.readFileSync(file, 'utf8');
  chunks.push(`export const ${name} = \`${escapeBacktick(src)}\`;`);
  chunks.push('');
}

fs.writeFileSync(OUT, chunks.join('\n'), 'utf8');
console.log(`✓ Gerado ${OUT}`);
for (const { name, file } of SOURCES) {
  const sz = fs.statSync(file).size;
  console.log(`  ${name.padEnd(22)} ${(sz / 1024).toFixed(1)} KB`);
}
