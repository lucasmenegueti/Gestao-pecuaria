// Servidor estático mínimo do dist exportado, para o e2e (COOP/COEP para o OPFS do
// wa-sqlite + fallback de SPA). Uso: node serve.mjs <dist> --port <n>
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
const args = process.argv.slice(2);
const pi = args.indexOf('--port');
if (pi < 0 || !args[pi + 1]) {
  console.error('serve: uso node serve.mjs <dist> --port <n>');
  process.exit(1);
}
const port = Number(args[pi + 1]);
const dist = resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') ?? 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = join(dist, decodeURIComponent(url.pathname));
  if (!existsSync(file) || statSync(file).isDirectory()) {
    const idx = join(file, 'index.html');
    file = existsSync(idx) && statSync(idx).isFile() ? idx : join(dist, 'index.html');
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.writeHead(200);
  createReadStream(file).pipe(res);
}).listen(port, () => console.error(`serve: http://localhost:${port} → ${dist}`));
