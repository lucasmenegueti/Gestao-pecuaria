#!/usr/bin/env node
// Gera Tutorial_Gestao_Pecuaria_NSA.pdf a partir de tutorial.html
// usando Chromium headless via Playwright.

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, 'tutorial.html');
const OUT = path.join(__dirname, '..', 'Tutorial_Gestao_Pecuaria_NSA.pdf');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
  tagged: true,
  outline: true,
});

await browser.close();
console.log('→', path.relative(process.cwd(), OUT));
