// Login do app (export web) contra a stack local, nos dois modos. Ver LEIAME.md.
// Uso: node web-login.mjs --dist <dist exportado com as variáveis locais> [--port 8081] [--cdp 56222]
import { spawn, execSync } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const dist = resolve(opt('dist')); const PORT = Number(opt('port', 8081)); const CDP = Number(opt('cdp', 56222));
const ORIGIN = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execSync('docker exec -i supabase_db_pecg0 psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q }).toString().trim();
const ctl = (o) => fetch('http://127.0.0.1:56999/__ctl', { method: 'POST', body: JSON.stringify(o) }).then((r) => r.json());
const modo = (u, m) => sql(`insert into public.auth_config (chave, modo) values ('${u}','${m}') on conflict (chave) do update set modo=excluded.modo`);
const U = { lucas: '4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa', pedrochaves: '9a559607-0180-4c93-81c5-be256bba2f82', vaqueiro: '34b59578-229b-4489-9264-e0bf3a7b250c' };

const server = spawn(process.execPath, [join(here, 'serve.mjs'), dist, '--port', String(PORT)], { stdio: ['ignore', 'ignore', 'inherit'] });
const prof = mkdtempSync(join(tmpdir(), 'pec-web-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check', '--window-size=1100,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pending = new Map(); let dialogs = []; let reqs = [];
async function connect() {
  for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Page.javascriptDialogOpening') { dialogs.push(d.params.message.replace(/\s+/g, ' ')); send('Page.handleJavaScriptDialog', { accept: true }); }
    if (d.method === 'Network.requestWillBeSent' && d.params.request.method !== 'OPTIONS') { const u = d.params.request.url; if (/hub-auth|auth\/v1\/token|rpc\/(auth_mode|email_for_username)/.test(u)) reqs.push(u.replace(/^.*\/(functions|auth|rest)\/v1\//, '').split('?')[0] + (u.includes('grant_type=password') ? '?password' : u.includes('grant_type=refresh') ? '?refresh' : '')); } });
}
const send = (method, params = {}) => new Promise((r, j) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); j(new Error('CDP sem resposta: ' + method)); }, 30000); pending.set(i, (d) => { clearTimeout(t); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const store = async () => { try { return JSON.parse(await ev(`localStorage.getItem('auth-store')`))?.state ?? null; } catch { return null; } };
const sessao = async () => { const t = await ev(`(() => { const k = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k)); return k ? localStorage.getItem(k) : null; })()`); try { const s = JSON.parse(t); const p = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { sub: p.sub, sid: p.session_id }; } catch { return null; } };
const emitidaPeloHub = (sid) => sid ? sql(`select count(*) from public.hub_sessoes where session_id='${sid}'`) === '1' : false;
async function abrir(limpar = true) {
  if (limpar) { await send('Page.navigate', { url: ORIGIN + '/' }); await sleep(800); await send('Storage.clearDataForOrigin', { origin: ORIGIN, storageTypes: 'local_storage,indexeddb,file_systems,cache_storage,service_workers' }); }
  dialogs = []; reqs = [];
  await send('Page.navigate', { url: ORIGIN + '/' });
  for (let i = 0; i < 100; i++) { if (await ev(`!!document.querySelector('input[placeholder="seu.nome"]')`)) return; await sleep(300); }
  throw new Error('tela de login não apareceu: ' + (await ev('document.body.innerText')).slice(0, 300));
}
async function digitar(sel, texto) {
  await ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); })()`);
  await send('Input.insertText', { text: texto }); await sleep(150);
}
async function entrar(user, pw, esperaMs = 30000) {
  await digitar('input[placeholder="seu.nome"]', user); await digitar('input[placeholder="••••••"]', pw);
  await ev(`(() => { const b = [...document.querySelectorAll('[role="button"], button, div')].filter(e => e.innerText && e.innerText.trim() === 'Entrar').pop(); b.click(); })()`);
  const t0 = Date.now();
  while (Date.now() - t0 < esperaMs) { const s = await store(); if (s?.user) return s; if (dialogs.some((d) => /^Erro|inválid|indispon|Conex|desativ|ajuste/i.test(d)) ) return s; await sleep(400); }
  return await store();
}
let pass = 0, fail = 0; const ok = (n, c, info = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASSA' : 'FALHA'}  ${n}${info ? '  — ' + info : ''}`); };

try {
  await connect(); await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  sql(`delete from public.auth_tentativas; delete from public.hub_sessoes; delete from public.auth_config where chave <> '*'; update auth.users set banned_until = null`);
  // senha "igual nos dois lados" pro pedro.chaves (é o caso de quem só existe na pecuária)
  sql(`update auth.users set encrypted_password = extensions.crypt('hub-pedro', extensions.gen_salt('bf', 6)) where id='${U.pedrochaves}'`);
  await ctl({ reset: true });

  // W1 — legado
  await abrir(); let s = await entrar('gabriel', 'Supa-Gabriel-8'); let se = await sessao();
  ok('W1 legado: entra pelo caminho direto, sem passar pela função nem pelo hub', s?.user?.username === 'gabriel' && s.user.role === 'admin' && reqs.includes('rpc/auth_mode') && reqs.includes('token?password') && !reqs.some((r) => r.startsWith('hub-auth/login')) && (await ctl({})).chamadas.length === 0 && !emitidaPeloHub(se?.sid), reqs.join(' '));

  // W2 — hub, senha certa
  modo('vaqueiro', 'hub');
  await abrir(); s = await entrar('vaqueiro', 'hub-vaq'); se = await sessao();
  ok('W2 hub: entra pela função; sessão do MESMO uuid, registrada em hub_sessoes; sem password grant', s?.user?.id === U.vaqueiro && s.user.role === 'peao' && se?.sub === U.vaqueiro && emitidaPeloHub(se.sid) && reqs.includes('hub-auth/login') && !reqs.includes('token?password'), reqs.join(' '));
  ok('W2a o login offline continua armado (hash e senha guardados com "lembrar")', !!s?.offlineCache?.hash && s.offlineCache.username === 'vaqueiro' && s.offlineCache.password === 'hub-vaq');

  // W3 — hub, senha errada
  await abrir(); s = await entrar('vaqueiro', 'errada', 9000);
  ok('W3 hub: senha errada não entra e NÃO cai no caminho direto', !s?.user && reqs.includes('hub-auth/login') && !reqs.includes('token?password'), reqs.join(' '));
  sql(`delete from public.auth_tentativas`);

  // W4 — hub fora do ar
  await ctl({ set: { authForce: { status: 503, body: { ok: false, error: 'unavailable' } } } });
  await abrir(); s = await entrar('vaqueiro', 'hub-vaq', 9000);
  ok('W4 hub fora + senha que só o hub conhece: não entra (e tentou o direto como fallback)', !s?.user && reqs.includes('hub-auth/login') && reqs.includes('token?password'), reqs.join(' '));
  await abrir(); s = await entrar('vaqueiro', 'Supa-Vaq-5');
  ok('W4a hub fora + senha do Supabase: entra pelo direto (risco aceito até a fase 6)', s?.user?.id === U.vaqueiro, reqs.join(' '));
  await ctl({ set: { authForce: null } });

  // W5 — virada legado→hub com a MESMA senha guardada: re-login silencioso
  await abrir(); s = await entrar('pedro.chaves', 'hub-pedro'); let antes = await sessao();
  ok('W5 pré: pedro.chaves entra em legado (sessão fora de hub_sessoes)', s?.user?.id === U.pedrochaves && !emitidaPeloHub(antes?.sid));
  modo('pedro.chaves', 'hub'); dialogs = []; reqs = [];
  let depois = null; for (let i = 0; i < 70; i++) { await sleep(1000); depois = await sessao(); if (depois?.sid && depois.sid !== antes.sid) break; }
  s = await store();
  ok('W5 virada com a mesma senha: o app refaz o login sozinho pelo hub, sem tela e sem aviso', s?.user?.id === U.pedrochaves && depois?.sub === U.pedrochaves && emitidaPeloHub(depois?.sid) && dialogs.length === 0 && reqs.includes('hub-auth/check') && reqs.includes('hub-auth/login'), `${reqs.join(' ')} | avisos: ${dialogs.join(' / ') || 'nenhum'}`);

  // W6 — revogação no hub: cai, perde o offline, pendentes não são tocados (não há SQLite de servidor aqui)
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }, { status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }] } });
  dialogs = []; s = await store();
  for (let i = 0; i < 100 && s?.user; i++) { await sleep(1000); s = await store(); }
  ok('W6 revogado no hub: sessão local encerrada, aviso do administrador e login offline apagado', !s?.user && s?.offlineCache == null && dialogs.some((d) => /encerrado pelo administrador/.test(d)), `avisos: ${dialogs.join(' / ')}`);
  await sleep(1500);
  ok('W6a e a tela vai pro login (não fica no Painel sem usuário)', await ev(`!!document.querySelector('input[placeholder="seu.nome"]')`), (await ev('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 120));
  await ctl({ reset: true });

  // W7 — virada legado→hub com senha DIFERENTE (caso lucas/alex/conta pedro)
  await abrir(); s = await entrar('lucas', 'Supa-Lucas-1'); antes = await sessao();
  ok('W7 pré: lucas entra em legado com a senha do Supabase', s?.user?.id === U.lucas);
  modo('lucas', 'hub'); dialogs = []; reqs = [];
  for (let i = 0; i < 100 && s?.user; i++) { await sleep(1000); s = await store(); }
  const nLogin = reqs.filter((r) => r === 'hub-auth/login').length;
  ok('W7 senha guardada ≠ senha do hub: vai pra tela de login, apaga SÓ a senha guardada, e tenta o hub 1 vez só', !s?.user && s?.offlineCache?.hash && s.offlineCache.password === undefined && nLogin === 1 && dialogs.some((d) => /Entre de novo/.test(d)), `tentativas no hub: ${nLogin} | avisos: ${dialogs.join(' / ')}`);
  await sleep(20000);
  ok('W7a depois disso o app não fica tentando sozinho (sem laço)', reqs.filter((r) => r === 'hub-auth/login').length === 1 && sql(`select count(*) from public.auth_tentativas where username='lucas' and not sucesso`) === '1');
  for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('input[placeholder="seu.nome"]')`)); i++) await sleep(300);
  dialogs = []; reqs = []; s = await entrar('lucas', 'hub-lucas'); se = await sessao();
  ok('W7b digitando a senha do hub ele entra, no mesmo uuid', s?.user?.id === U.lucas && emitidaPeloHub(se?.sid), `${reqs.join(' ')} | tela: ${(await ev('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 160)} | avisos: ${dialogs.join(' / ')}`);
  console.log(`\nRESUMO web: ${pass} passaram, ${fail} falharam`);
} catch (e) { console.error('ERRO FATAL', e); fail++; }
finally { try { ws?.close(); } catch {} chrome.kill(); server.kill(); rmSync(prof, { recursive: true, force: true }); process.exit(fail ? 1 : 0); }
