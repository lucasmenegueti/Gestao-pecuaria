// Login do DASHBOARD (next dev) contra a stack local, nos dois modos, + renovação e revalidação
// do middleware. Ver LEIAME.md. Uso: node dashboard-login.mjs [--url http://localhost:3111] [--cdp 56223]
// Pré: stack local + função + fakehub de pé; dashboard rodando com SUPABASE_URL local,
// SESSION_PASSWORD = a constante abaixo e CURRAL_SUPABASE_URL vazio.
import { spawn, execSync } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const { sealData, unsealData } = await import(pathToFileURL(resolve(here, '../../../../dashboard/node_modules/iron-session/dist/index.js')).href);
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const ORIGIN = opt('url', 'http://localhost:3111'); const CDP = Number(opt('cdp', 56223));
const SENHA_SESSAO = 'senha-de-sessao-de-teste-local-0123456789-abcdefghij';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync('docker exec -i supabase_db_pecg0 psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q }).toString().trim();
const ctl = (o) => fetch('http://127.0.0.1:56999/__ctl', { method: 'POST', body: JSON.stringify(o) }).then((r) => r.json());
const modo = (u, m) => sql(`insert into public.auth_config (chave, modo) values ('${u}','${m}') on conflict (chave) do update set modo=excluded.modo`);
const U = { lucas: '4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa' };
const jwt = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());

const prof = mkdtempSync(join(tmpdir(), 'pec-dash-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--window-size=1200,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
}
const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); j(new Error('CDP sem resposta: ' + method)); }, 60000); pending.set(i, (d) => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const cookie = async () => (await send('Network.getCookies', { urls: [ORIGIN] })).result.cookies.find((c) => c.name === 'pecuaria_session')?.value ?? null;
const sessao = async () => { const c = await cookie(); if (!c) return null; try { return await unsealData(c, { password: SENHA_SESSAO }); } catch { return null; } };
const setSessao = async (dados) => send('Network.setCookie', { url: ORIGIN, name: 'pecuaria_session', value: await sealData(dados, { password: SENHA_SESSAO }), httpOnly: true, path: '/' });
const limpar = () => send('Network.clearBrowserCookies');
const emitidaPeloHub = (tok) => tok ? sql(`select count(*) from public.hub_sessoes where session_id='${jwt(tok).session_id}'`) === '1' : false;
async function entrar(user, pw) {
  await limpar();
  await send('Page.navigate', { url: ORIGIN + '/login' });
  for (let i = 0; i < 100; i++) { if (await ev(`!!document.querySelector('input[name="username"]')`)) break; await sleep(300); }
  await sleep(1200); // hidratação do formulário
  for (const [sel, txt] of [['input[name="username"]', user], ['input[name="password"]', pw]]) { await ev(`document.querySelector('${sel}').focus()`); await send('Input.insertText', { text: txt }); await sleep(150); }
  await ev(`document.querySelector('button[type="submit"]').click()`);
  for (let i = 0; i < 100; i++) { await sleep(400); if (await cookie()) break; const t = await ev('document.body.innerText'); if (/inválidos|indisponível|desativado|permissão|ajuste/i.test(t)) break; }
  return { s: await sessao(), tela: (await ev('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 200), url: await ev('location.pathname') };
}
// request do navegador (com o cookie), sem seguir redirect: mede o que o MIDDLEWARE respondeu
const pedir = (path) => ev(`fetch(${JSON.stringify(path)}, { redirect: 'manual', cache: 'no-store' }).then(r => ({ st: r.status, tipo: r.type }))`);
let pass = 0, fail = 0; const ok = (n, c, info = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASSA' : 'FALHA'}  ${n}${info ? '  — ' + info : ''}`); };

try {
  await connect(); await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  sql(`delete from public.auth_tentativas; delete from public.hub_sessoes; delete from public.auth_config where chave <> '*'; update auth.users set banned_until = null`);
  await ctl({ reset: true });

  let r = await entrar('gabriel', 'Supa-Gabriel-8');
  ok('D1 legado: admin entra pelo caminho direto; cookie com access e refresh token', r.s?.username === 'gabriel' && !!r.s.accessToken && !!r.s.refreshToken && !emitidaPeloHub(r.s.accessToken) && (await ctl({})).chamadas.length === 0, `${r.url} ${r.tela.slice(0, 60)}`);
  r = await entrar('vaqueiro', 'Supa-Vaq-5');
  ok('D1a peão não entra no dashboard', !r.s && /inválidos/i.test(r.tela), r.tela.slice(0, 80));

  modo('lucas', 'hub');
  r = await entrar('lucas', 'hub-lucas');
  ok('D2 hub: admin entra pela função; sessão do MESMO uuid, registrada em hub_sessoes', r.s?.username === 'lucas' && jwt(r.s.accessToken).sub === U.lucas && emitidaPeloHub(r.s.accessToken) && !!r.s.refreshToken, `${r.url} ${r.tela.slice(0, 60)}`);
  const sHub = r.s;
  r = await entrar('lucas', 'Supa-Lucas-1');
  ok('D3 hub: a senha antiga do Supabase não entra (vale a do hub) e não cai no direto', !r.s && /inválidos/i.test(r.tela), r.tela.slice(0, 80));
  sql(`delete from public.auth_tentativas`);
  modo('vaqueiro', 'hub'); r = await entrar('vaqueiro', 'hub-vaq');
  ok('D3a hub: peão com a senha certa continua barrado no dashboard', !r.s, r.tela.slice(0, 80));
  await ctl({ set: { authForce: { status: 503, body: { ok: false, error: 'unavailable' } } } });
  r = await entrar('lucas', 'hub-lucas');
  ok('D4 hub fora + senha que só o hub conhece: "indisponível", nunca "senha errada"', !r.s && /indisponível/i.test(r.tela), r.tela.slice(0, 100));
  r = await entrar('lucas', 'Supa-Lucas-1');
  ok('D4a hub fora + senha do Supabase: entra pelo direto (risco aceito)', r.s?.username === 'lucas' && !emitidaPeloHub(r.s.accessToken));
  await ctl({ set: { authForce: null } });

  // ---- middleware: renovação ----
  await limpar(); await send('Page.navigate', { url: ORIGIN + '/login' }); await sleep(1500);
  await setSessao({ ...sHub, expiresAt: Date.now() + 60_000, checkAt: Date.now() });
  let p = await pedir('/configuracoes'); let s2 = await sessao();
  ok('M1 token perto de vencer: o middleware renova e segue (sem redirect)', p.tipo !== 'opaqueredirect' && s2?.accessToken && s2.accessToken !== sHub.accessToken && s2.expiresAt > Date.now() + 30 * 60_000 && jwt(s2.accessToken).session_id === jwt(sHub.accessToken).session_id, `tipo=${p.tipo} st=${p.st}`);
  await setSessao({ ...s2, expiresAt: Date.now() - 5_000, checkAt: Date.now() });
  p = await pedir('/configuracoes'); let s3 = await sessao();
  ok('M2 token já vencido: renova e redireciona pra MESMA url com o cookie novo', p.tipo === 'opaqueredirect' && s3?.accessToken !== s2.accessToken && s3.expiresAt > Date.now() + 30 * 60_000, `tipo=${p.tipo}`);
  await setSessao({ ...s3, refreshToken: 'token-que-nao-existe', expiresAt: Date.now() - 5_000, checkAt: Date.now() });
  await send('Page.navigate', { url: ORIGIN + '/configuracoes' }); await sleep(3500);
  ok('M3 refresh recusado + token vencido: vai pro login', (await ev('location.pathname')) === '/login', await ev('location.pathname'));

  // ---- middleware: revalidação no hub ----
  await ctl({ reset: true });
  await limpar(); await send('Page.navigate', { url: ORIGIN + '/login' }); await sleep(1200);
  await setSessao({ ...s3, checkAt: Date.now() });
  p = await pedir('/configuracoes');
  ok('M4 check feito há < 60 s: não chama a função', (await ctl({})).chamadas.length === 0 && p.tipo !== 'opaqueredirect');
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await setSessao({ ...s3, checkAt: Date.now() - 61_000 });
  p = await pedir('/configuracoes'); let s4 = await sessao();
  ok('M5 check vencido: revalida no hub, segue e carimba o cookie', (await ctl({})).chamadas.filter((c) => c.endsWith('/lookup')).length === 1 && p.tipo !== 'opaqueredirect' && s4?.checkAt > Date.now() - 10_000);
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 503, body: { ok: false, error: 'unavailable' } }] } });
  await setSessao({ ...s3, checkAt: Date.now() - 61_000 });
  p = await pedir('/configuracoes');
  ok('M6 hub fora no check: ninguém cai', p.tipo !== 'opaqueredirect' && !!(await sessao())?.username);
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }, { status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }] } });
  await setSessao({ ...s3, checkAt: Date.now() - 61_000 });
  p = await pedir('/configuracoes');
  ok('M7 acesso tirado no hub: sessão do dashboard destruída e redirect pro login', p.tipo === 'opaqueredirect' && !(await sessao())?.username);
  await ctl({ reset: true });
  // sessão direta de uma conta que está em hub (logou antes da virada, ou fallback) → relogin
  const dir = await fetch('http://127.0.0.1:56321/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: process.env.PUB || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'lucas@nsa.teste', password: 'Supa-Lucas-1' }) }).then((x) => x.json());
  await setSessao({ username: 'lucas', role: 'owner', accessToken: dir.access_token, refreshToken: dir.refresh_token, expiresAt: Date.now() + 3600_000, checkAt: Date.now() - 61_000 });
  p = await pedir('/configuracoes');
  ok('M8 sessão direta com a conta em hub: pede login de novo', p.tipo === 'opaqueredirect' && !(await sessao())?.username);
  modo('lucas', 'legado');
  await setSessao({ username: 'lucas', role: 'owner', accessToken: dir.access_token, refreshToken: dir.refresh_token, expiresAt: Date.now() + 3600_000, checkAt: Date.now() - 61_000 });
  p = await pedir('/configuracoes');
  ok('M9 conta em legado: o check é no-op e a sessão segue', p.tipo !== 'opaqueredirect' && !!(await sessao())?.username);
  console.log(`\nRESUMO dashboard: ${pass} passaram, ${fail} falharam`);
} catch (e) { console.error('ERRO FATAL', e); fail++; }
finally { try { ws?.close(); } catch {} chrome.kill(); try { rmSync(prof, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {} process.exit(fail ? 1 : 0); }
