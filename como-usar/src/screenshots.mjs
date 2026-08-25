#!/usr/bin/env node
// Captura telas reais do app via Playwright em viewport tablet.
// Uso: node screenshots.mjs [grupo]
//      grupos: login | painel | ronda | reabastecimento | estoque | mapa | admin | all

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE_URL = process.env.APP_URL || 'http://localhost:8081';
const USERNAME = process.env.APP_USER || 'lucas';
const PASSWORD = process.env.APP_PASS || '';

const VIEWPORT = { width: 800, height: 1280 };
const DEVICE_SCALE = 2;

await fs.mkdir(SCREENS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; SM-X110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
});
const page = await ctx.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('favicon')) {
    console.log('[err]', msg.text().slice(0, 200));
  }
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));

async function shot(name, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 600);
  const file = path.join(SCREENS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('  ✓', name);
}

async function goto(p) {
  await page.goto(BASE_URL + p, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
}

async function fill(placeholder, value) {
  const el = page.locator(`input[placeholder="${placeholder}"], input[name="${placeholder}"]`).first();
  await el.waitFor({ timeout: 5000 });
  await el.fill(value);
}

async function tap(text, opts = {}) {
  const el = page.getByText(text, { exact: opts.exact ?? false }).first();
  await el.waitFor({ timeout: opts.timeout ?? 5000 });
  await el.click();
  await page.waitForTimeout(opts.wait ?? 800);
}

async function login() {
  console.log('• login');
  await goto('/');
  await page.waitForTimeout(1500);
  // Tela vazia
  await shot('01-login-vazio');
  // Preenche
  await page.locator('input').first().fill(USERNAME);
  await page.locator('input').nth(1).fill(PASSWORD);
  await page.waitForTimeout(400);
  await shot('02-login-preenchido');
  // Submete
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(6000); // espera sync inicial
}

const GROUPS = {
  login,

  painel: async () => {
    console.log('• painel');
    await goto('/(tabs)');
    await shot('03-painel');
  },

  abas: async () => {
    console.log('• abas');
    const tabs = [
      ['ronda', '04-aba-ronda'],
      ['rebanho', '05-aba-rebanho'],
      ['estoque', '06-aba-estoque'],
      ['mapa', '07-aba-mapa'],
      ['relatorio', '08-aba-relatorio'],
    ];
    for (const [route, name] of tabs) {
      await goto(`/(tabs)/${route}`);
      await shot(name, { wait: 1200 });
    }
  },

  ronda: async () => {
    console.log('• ronda');
    await goto('/(tabs)/ronda');
    await shot('10-ronda-lista');
    // Achar primeiro piquete e clicar
    const firstCard = page
      .locator('[role="button"], div[tabindex="0"]')
      .filter({ hasNotText: 'Painel' })
      .filter({ hasNotText: 'Rebanho' })
      .first();
    try {
      await firstCard.click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      await shot('11-ronda-menu');
    } catch (e) {
      console.log('  ! não achei piquete clicável:', e.message.slice(0, 80));
    }
  },

  rondaSecoes: async () => {
    console.log('• ronda seções');
    // Vai pra ronda, clica no primeiro piquete
    await goto('/(tabs)/ronda');
    await page.waitForTimeout(1000);
    const firstCard = page.locator('[role="button"], div[tabindex="0"]').first();
    await firstCard.click().catch(() => {});
    await page.waitForTimeout(1500);

    const secoes = [
      ['Suplementação', '12-supl-step1'],
      ['Bombona', '13-bombona-step1'],
      ['Forragem', '14-forragem-step1'],
      ['Aguada', '15-aguada-step1'],
      ['Biológico', '16-biologico-step1'],
      ['Sanidade', '17-sanidade-step1'],
      ['Cerca', '18-cerca-step1'],
      ['Peso', '19-peso-step1'],
      ['Lavagem', '20-lavagem-step1'],
    ];
    for (const [label, file] of secoes) {
      try {
        await tap(label, { wait: 1200 });
        await shot(file);
        // volta pro menu
        await page.goBack({ waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
      } catch (e) {
        console.log(`  ! ${label}:`, e.message.slice(0, 80));
      }
    }
  },

  reabastecimento: async () => {
    console.log('• reabastecimento');
    await goto('/reabastecimento/carregar');
    await shot('30-reabast-carregar');
    await goto('/reabastecimento/rota');
    await shot('31-reabast-rota');
    await goto('/reabastecimento/resumo');
    await shot('32-reabast-resumo');
  },

  estoque: async () => {
    console.log('• estoque');
    await goto('/(tabs)/estoque');
    await shot('40-estoque-index');
    await goto('/estoque/entrada');
    await shot('41-estoque-entrada');
    await goto('/estoque/ajuste');
    await shot('42-estoque-ajuste');
  },

  admin: async () => {
    console.log('• admin');
    const rotas = [
      ['/admin', '50-admin-index'],
      ['/admin/formulas', '51-admin-formulas'],
      ['/admin/grass-types', '52-admin-capim'],
      ['/admin/lotacao', '53-admin-lotacao'],
      ['/admin/mover-rebanho', '54-admin-mover'],
      ['/admin/nascimento', '55-admin-nascimento'],
      ['/admin/morte', '56-admin-morte'],
      ['/admin/venda', '57-admin-venda'],
      ['/admin/compra', '58-admin-compra'],
      ['/admin/alertas', '59-admin-alertas'],
      ['/admin/solicitacoes', '60-admin-solic'],
      ['/admin/piquetes', '61-admin-piquetes'],
    ];
    for (const [r, n] of rotas) {
      try {
        await goto(r);
        await shot(n, { wait: 1200 });
      } catch (e) {
        console.log(`  ! ${r}:`, e.message.slice(0, 80));
      }
    }
  },
};

const target = process.argv[2] || 'all';
const order = ['login', 'painel', 'abas', 'ronda', 'rondaSecoes', 'reabastecimento', 'estoque', 'admin'];
const peaoOrder = ['login', 'painel', 'abas', 'ronda', 'rondaSecoes', 'reabastecimento', 'estoque'];

if (target === 'all') {
  for (const g of order) {
    if (GROUPS[g]) await GROUPS[g]();
  }
} else if (target === 'peao') {
  // tudo do peão, sem admin
  for (const g of peaoOrder) {
    if (GROUPS[g]) await GROUPS[g]();
  }
} else if (GROUPS[target]) {
  // login é pré-requisito pra tudo menos login
  if (target !== 'login') await GROUPS.login();
  await GROUPS[target]();
} else {
  console.error(`grupo "${target}" não existe`);
  process.exit(1);
}

await browser.close();
console.log('ok');
