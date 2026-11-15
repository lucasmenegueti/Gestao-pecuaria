// Bateria de integração da hub-auth da pecuária contra a stack local (ver LEIAME.md).
const { createClient } = require(require('path').resolve(__dirname, '../../../../app/node_modules/@supabase/supabase-js'));
const { execSync } = require('child_process');
const URL_ = 'http://127.0.0.1:56321', PUB = process.env.PUB || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const FN = URL_ + '/functions/v1/hub-auth';
const sql = (q) => execSync('docker exec -i supabase_db_pecg0 psql -U postgres -d postgres -At -v ON_ERROR_STOP=1', { input: q }).toString().trim();
const opt = { auth: { persistSession: false, autoRefreshToken: false } };
const ctl = (o) => fetch('http://127.0.0.1:56999/__ctl', { method: 'POST', body: JSON.stringify(o) }).then(r => r.json());
const login = (username, password) => fetch(FN + '/login', { method: 'POST', headers: { apikey: PUB, 'Content-Type': 'application/json', Origin: 'http://localhost:8081' }, body: JSON.stringify({ username, password }) }).then(async r => ({ st: r.status, j: await r.json() }));
const check = (tok) => fetch(FN + '/check', { method: 'POST', headers: { apikey: PUB, Authorization: 'Bearer ' + tok } }).then(async r => ({ st: r.status, j: await r.json() }));
const modo = (u, m) => sql(`insert into public.auth_config (chave, modo) values ('${u}','${m}') on conflict (chave) do update set modo=excluded.modo`);
const jwt = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString());
const sidOf = (t) => jwt(t).session_id;
const refresh = (rt) => createClient(URL_, PUB, opt).auth.refreshSession({ refresh_token: rt });
const direto = (email, password) => createClient(URL_, PUB, opt).auth.signInWithPassword({ email, password });
const U = {
  lucas: '4f9f9fd3-2aee-4acc-a96f-793fab4c6cfa', alex: '4659e45f-69e5-4dd6-adce-fcf79553713e',
  pedrochaves: '9a559607-0180-4c93-81c5-be256bba2f82', pedro: '1165411f-da55-4f5f-a952-1bce6d350388',
  vaqueiro: '34b59578-229b-4489-9264-e0bf3a7b250c', bruno: '789bf03b-6c85-41b2-beca-d1375507bdfe',
};
const HUB_PEDRO = 'rec4wsFkI9dH01yjQ';
let pass = 0, fail = 0; const ok = (nome, c, info = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASSA' : 'FALHA'}  ${nome}${info ? '  — ' + info : ''}`); };
const limpaTentativas = () => sql(`delete from public.auth_tentativas`);

(async () => {
  await ctl({ reset: true });
  sql(`delete from public.auth_tentativas; delete from public.hub_sessoes; delete from public.auth_config where chave <> '*'; update auth.users set banned_until = null`);
  const usersAntes = sql('select count(*) from auth.users');
  const hashAntes = sql(`select md5(string_agg(encrypted_password, ',' order by id)) from auth.users`);
  const rolesAntes = sql(`select md5(string_agg(username||role, ',' order by id)) from public.profiles`);

  // ---------- /login ----------
  let r = await login('lucas', 'hub-lucas');
  ok('L1 modo legado → 409 modo_legado (nem chama o hub)', r.st === 409 && r.j.error === 'modo_legado' && (await ctl({})).chamadas.length === 0, `${r.st} ${r.j.error}`);
  r = await login('naoexiste', 'x');
  ok('L1a username desconhecido → 409 modo_legado (não vira oráculo)', r.st === 409 && r.j.error === 'modo_legado', `${r.st} ${r.j.error}`);
  modo('lucas', 'hub');
  r = await login('lucas', 'errada');
  ok('L2 senha errada → 401 invalid_credentials + tentativa registrada', r.st === 401 && r.j.error === 'invalid_credentials' && sql(`select count(*) from public.auth_tentativas where username='lucas' and not sucesso`) === '1', `${r.st}`);
  r = await login('lucas', 'Supa-Lucas-1');
  ok('L2a senha antiga do Supabase não entra pelo hub (vale a do hub)', r.st === 401, `${r.st}`);
  limpaTentativas();
  r = await login('  LUCAS ', 'hub-lucas');
  const sL = r.j.session;
  ok('L3 senha do hub → 200 com sessão (username normalizado)', r.st === 200 && sL?.access_token && sL?.refresh_token, `${r.st} ${r.j.error || ''}`);
  const corpos = (await ctl({})).corpos.filter(c => c.url.endsWith('/authenticate'));
  ok('L3a o hub recebe user_id e NUNCA login/username', corpos.length > 0 && corpos.every(c => c.user_id === 'rec7x0JSk7vDyMdcy' && c.login === null && c.chaves.join() === 'app_slug,password,user_id'), JSON.stringify(corpos[0]));
  const c = createClient(URL_, PUB, opt); await c.auth.setSession({ access_token: sL.access_token, refresh_token: sL.refresh_token });
  const { data: me } = await c.auth.getUser(); const { data: pf } = await c.from('profiles').select('username').eq('id', U.lucas).maybeSingle();
  const { data: adm } = await c.from('formulas_teste').select('id');
  ok('L3b sessão é do uuid certo, passa no RLS e is_admin() vale', me?.user?.id === U.lucas && pf?.username === 'lucas' && adm?.length === 1);
  ok('L3c hub_sessoes registrou a emissão com user_id e session_version do hub', sql(`select hub_user_id||'/'||session_version from public.hub_sessoes where session_id='${sidOf(sL.access_token)}'`) === 'rec7x0JSk7vDyMdcy/3');
  ok('L3d admin global com levels [] → admin; resposta traz a identidade do hub', r.j.hub?.is_global_admin === true && r.j.hub?.user_id === 'rec7x0JSk7vDyMdcy' && Array.isArray(r.j.hub?.levels));
  for (const [nome, f, esperado] of [
    ['hub 503', { status: 503, body: { ok: false, error: 'unavailable' } }, 503],
    ['hub 401 unauthorized (segredo/app_slug errado)', { status: 401, body: { ok: false, error: 'unauthorized' } }, 503],
    ['hub 400 app_unknown', { status: 400, body: { ok: false, error: 'app_unknown' } }, 503],
    ['hub 500 corpo estranho', { status: 500, body: { x: 1 } }, 503],
    ['hub 403 user_disabled', { status: 403, body: { ok: false, error: 'user_disabled' } }, 403],
    ['hub 403 no_role', { status: 403, body: { ok: false, error: 'no_role' } }, 403],
    ['hub 403 app_disabled', { status: 403, body: { ok: false, error: 'app_disabled' } }, 403],
  ]) {
    await ctl({ set: { authForce: f } }); r = await login('lucas', 'hub-lucas');
    ok(`L4 ${nome} → ${esperado}`, r.st === esperado && !r.j.session, `${r.st} ${r.j.error}`);
  }
  await ctl({ set: { authForce: null } });
  ok('L4a 503/403 do hub não contam como falha de senha', sql(`select count(*) from public.auth_tentativas where username='lucas' and not sucesso`) === '0');

  modo('alex', 'hub'); r = await login('alex', 'hub-alex');
  ok('L5 nível do hub (peao) ≠ profiles.role (admin) → 403 role_mismatch', r.st === 403 && r.j.error === 'role_mismatch' && !r.j.session, `${r.st} ${r.j.error}`);
  modo('bruno', 'hub'); r = await login('bruno', 'hub-bruno');
  ok('L5a level fora de admin/peao (full) → 403 no_role, nunca admin', r.st === 403 && r.j.error === 'no_role' && !r.j.session, `${r.st} ${r.j.error}`);
  modo('vaqueiro', 'hub'); r = await login('vaqueiro', 'hub-vaq');
  const sV = r.j.session;
  const cv = createClient(URL_, PUB, opt); if (sV) await cv.auth.setSession({ access_token: sV.access_token, refresh_token: sV.refresh_token });
  const { data: vadm } = await cv.from('formulas_teste').select('id');
  ok('L5b peao no hub e peao no app → 200; sessão de peão (is_admin() falso)', r.st === 200 && jwt(sV.access_token).sub === U.vaqueiro && vadm?.length === 0, `${r.st} ${r.j.error || ''}`);

  await ctl({ reset: true });
  modo('gabriel', 'hub'); r = await login('gabriel', 'Supa-Gabriel-8');
  ok('L6 conta em hub SEM vínculo → 403 sem_vinculo, sem chamar o hub', r.st === 403 && r.j.error === 'sem_vinculo' && (await ctl({})).chamadas.length === 0, `${r.st} ${r.j.error}`);
  modo('gabriel', 'legado');

  // identidade trocada: o hub responde 200 com o user_id de OUTRA pessoa
  modo('pedro.chaves', 'hub');
  await ctl({ set: { authForce: { status: 200, body: { ok: true, user: { user_id: 'rec7x0JSk7vDyMdcy', username: 'lucas', name: 'x', session_version: 3, app_slug: 'gestao-pecuaria', is_global_admin: true, levels: [], roles: [] } } } } });
  r = await login('pedro.chaves', 'qualquer');
  ok('L7 hub devolve user_id diferente do vínculo → 503, nunca sessão', r.st === 503 && !r.j.session, `${r.st} ${r.j.error}`);
  await ctl({ set: { authForce: null } });

  // ---------- N:1: pedro e pedro.chaves = a mesma pessoa no hub ----------
  modo('pedro', 'hub');
  const [n1, n2] = await Promise.all([login('pedro.chaves', 'hub-pedro'), login('pedro', 'hub-pedro')]);
  ok('N1 as duas contas entram com a MESMA senha do hub', n1.st === 200 && n2.st === 200, `${n1.st}/${n2.st} ${n1.j.error || ''} ${n2.j.error || ''}`);
  ok('N1a cada sessão é do SEU uuid (nada de conta trocada)', n1.st === 200 && n2.st === 200 && jwt(n1.j.session.access_token).sub === U.pedrochaves && jwt(n2.j.session.access_token).sub === U.pedro);
  ok('N1b hub_sessoes: duas linhas, mesmo hub_user_id', sql(`select count(*)||'/'||count(distinct hub_user_id)||'/'||count(distinct auth_user_id) from public.hub_sessoes where hub_user_id='${HUB_PEDRO}'`) === '2/1/2');
  r = await login('pedro', 'Supa-Pedro-4');
  ok('N1c a senha antiga da conta `pedro` deixa de valer no modo hub', r.st === 401, `${r.st}`);
  limpaTentativas();
  ok('N1d vínculo aceita N:1 (hub_user_id sem unique)', sql(`select count(*) from public.hub_vinculos where hub_user_id='${HUB_PEDRO}'`) === '2');

  ok('L8 nenhum usuário criado no Auth em todo o /login', sql('select count(*) from auth.users') === usersAntes);
  ok('L8a senhas do Supabase intactas', sql(`select md5(string_agg(encrypted_password, ',' order by id)) from auth.users`) === hashAntes);
  ok('L8b profiles.role nunca reescrito', sql(`select md5(string_agg(username||role, ',' order by id)) from public.profiles`) === rolesAntes);

  // ---------- atraso por usuário, sem bloqueio ----------
  limpaTentativas();
  for (let i = 0; i < 3; i++) r = await login('vaqueiro', 'errada' + i);
  ok('L9 3 senhas erradas → sempre 401, nunca 429', r.st === 401, `${r.st}`);
  let t0 = Date.now(); r = await login('vaqueiro', 'hub-vaq'); let dt = Date.now() - t0;
  ok('L9a senha certa depois de 3 falhas → entra, esperando o atraso (4 s)', r.st === 200 && dt >= 3500, `${r.st} em ${dt} ms`);
  t0 = Date.now(); r = await login('vaqueiro', 'hub-vaq'); dt = Date.now() - t0;
  ok('L9b o login certo zera: o seguinte entra sem atraso', r.st === 200 && dt < 3000, `${r.st} em ${dt} ms`);
  t0 = Date.now(); r = await login('lucas', 'hub-lucas'); dt = Date.now() - t0;
  ok('L9c falhas de um usuário não atrasam outro', r.st === 200 && dt < 3000, `${r.st} em ${dt} ms`);
  limpaTentativas();

  sql(`update auth.users set banned_until = now() + interval '1 day' where id='${U.pedrochaves}'`);
  r = await login('pedro.chaves', 'hub-pedro');
  ok('L10 banido no Supabase → 403 user_disabled, sem sessão', r.st === 403 && r.j.error === 'user_disabled' && !r.j.session, `${r.st} ${r.j.error}`);
  sql(`update auth.users set banned_until = null where id='${U.pedrochaves}'`);
  const [p1, p2] = await Promise.all([login('pedro.chaves', 'hub-pedro'), login('pedro.chaves', 'hub-pedro')]);
  ok('L11 2 logins simultâneos do mesmo usuário → 2 sessões distintas', p1.st === 200 && p2.st === 200 && sidOf(p1.j.session.access_token) !== sidOf(p2.j.session.access_token), `${p1.st}/${p2.st}`);
  r = await fetch(FN + '/login', { method: 'POST', headers: { apikey: PUB }, body: 'não é json' }).then(async x => ({ st: x.status, j: await x.json() }));
  ok('L12 corpo inválido → 400', r.st === 400);
  modo('rafael', 'hub'); r = await login('rafael', 'hub-rafael');
  ok('L13 rafael (e-mail inválido no Auth) em hub → sem sessão e sem criar usuário', r.st !== 200 && !r.j.session && sql('select count(*) from auth.users') === usersAntes, `${r.st} ${r.j.error}`);
  modo('rafael', 'legado');

  // ---------- /check ----------
  const { data: dGab } = await direto('gabriel@nsa.teste', 'Supa-Gabriel-8');
  await ctl({ reset: true });
  let k = await check(dGab.session.access_token);
  ok('C1 usuário em legado → valid, no-op (não chama o hub)', k.j.valid === true && k.j.modo === 'legado' && (await ctl({})).chamadas.length === 0, JSON.stringify(k.j));
  const tokP = p1.j.session.access_token;
  k = await check(tokP);
  ok('C2 modo hub, sessão recém-emitida → valid (cache)', k.j.valid === true);
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  k = await check(tokP); const ch1 = (await ctl({})).chamadas.length;
  k = await check(tokP); const ch2 = (await ctl({})).chamadas.length;
  ok('C3 2º check em < 60 s usa cache (1 lookup só)', k.j.valid === true && k.j.cache === true && ch1 === 1 && ch2 === 1, `chamadas ${ch1}→${ch2}`);
  const lk = (await ctl({})).corpos.find(x => x.url.endsWith('/lookup'));
  ok('C3a o lookup usa o hub_user_id gravado na emissão', lk?.user_id === HUB_PEDRO, JSON.stringify(lk));
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }, { status: 200, body: { ok: true, valid: true } }] } });
  k = await check(tokP);
  ok('C4 1 valid:false seguido de valid → NÃO derruba', k.j.valid === true, JSON.stringify(k.j));
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 503, body: { ok: false, error: 'unavailable' } }] } });
  k = await check(tokP);
  const refOk = await refresh(p1.j.session.refresh_token);
  ok('C5 hub 503 → 503 e a sessão segue viva', k.st === 503 && !refOk.error, `${k.st}`);
  const tokP2 = refOk.data.session.access_token, refP2 = refOk.data.session.refresh_token;
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  await ctl({ set: { lookupSeq: [{ status: 200, body: { ok: true, valid: false, reason: 'app_unknown' } }, { status: 200, body: { ok: true, valid: false, reason: 'app_unknown' } }] } });
  k = await check(tokP2);
  ok('C6 motivo fora da lista (app_unknown) 2× → 503, nunca derruba', k.st === 503);
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  const sess2 = p2.j.session;
  await ctl({ set: { lookupSeq: [{ status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }, { status: 200, body: { ok: true, valid: false, reason: 'user_disabled' } }] } });
  k = await check(tokP2);
  const refDepois = await refresh(refP2);
  const refOutra = await refresh(sess2.refresh_token);
  const refIrma = await refresh(n2.j.session.refresh_token);
  ok('C7 mesmo motivo 2× → derruba SÓ a sessão do chamador', k.j.valid === false && k.j.reason === 'user_disabled' && !!refDepois.error && !refOutra.error, `${JSON.stringify(k.j)} chamador=${refDepois.error ? 'recusado' : 'VIVO'} outra=${refOutra.error ? 'MORTA' : 'viva'}`);
  ok('C7a N:1: a sessão da conta `pedro` (mesma pessoa no hub) não cai junto; cai no /check dela', !refIrma.error);
  k = await check(tokP2);
  ok('C8 check com sessão já revogada → relogin', k.j.valid === false && k.j.reason === 'relogin', JSON.stringify(k.j));
  const { data: dL } = await direto('lucas@nsa.teste', 'Supa-Lucas-1');
  k = await check(dL.session.access_token);
  ok('C9 virada legado→hub: sessão sem emissão registrada → relogin (sessão não é apagada)', k.j.valid === false && k.j.reason === 'relogin' && !(await refresh(dL.session.refresh_token)).error);
  k = await check(PUB);
  ok('C10 chave publishable como Bearer → 401 sem_sessao', k.st === 401 && k.j.error === 'sem_sessao', `${k.st}`);

  // ---------- falha de infraestrutura NUNCA vira veredito ----------
  await ctl({ reset: true });
  limpaTentativas();
  sql(`revoke select on public.hub_vinculos from service_role`);
  r = await login('lucas', 'hub-lucas');
  sql(`grant select on public.hub_vinculos to service_role`);
  ok('I1 erro lendo hub_vinculos → 503 (não sem_vinculo)', r.st === 503 && r.j.error === 'unavailable', `${r.st} ${r.j.error}`);
  const sessLucasAntes = sql(`select count(*) from auth.sessions where user_id='${U.lucas}'`);
  sql(`revoke insert on public.hub_sessoes from service_role`);
  r = await login('lucas', 'hub-lucas');
  sql(`grant insert on public.hub_sessoes to service_role`);
  ok('I2 erro gravando hub_sessoes → 503 e a sessão emitida é desfeita', r.st === 503 && !r.j.session && sql(`select count(*) from auth.sessions where user_id='${U.lucas}'`) === sessLucasAntes, `${r.st}`);
  sql(`update public.hub_sessoes set ultimo_check_em = null`);
  sql(`revoke select on public.hub_sessoes from service_role`);
  k = await check(sess2.access_token);
  sql(`grant select on public.hub_sessoes to service_role`);
  ok('I3 erro lendo hub_sessoes no /check → 503, nunca relogin, sessão viva', k.st === 503 && !(await refresh((await refresh(sess2.refresh_token)).data?.session?.refresh_token ?? sess2.refresh_token)).error, `${k.st} ${JSON.stringify(k.j)}`);
  sql(`revoke select on public.auth_tentativas from service_role`);
  r = await login('lucas', 'hub-lucas');
  sql(`grant select on public.auth_tentativas to service_role`);
  ok('I4 erro lendo auth_tentativas → 503 (o atraso nunca é pulado em silêncio)', r.st === 503, `${r.st} ${r.j.error}`);

  // ---------- estresse: 20 rodadas de 3 logins simultâneos do mesmo usuário ----------
  let falhasEstresse = 0;
  for (let i = 0; i < 20; i++) {
    const rs = await Promise.all([login('pedro.chaves', 'hub-pedro'), login('pedro.chaves', 'hub-pedro'), login('pedro', 'hub-pedro')]);
    falhasEstresse += rs.filter(x => x.st !== 200).length;
  }
  ok('S1 60 logins (20×3 simultâneos, duas contas da mesma pessoa) → todos 200', falhasEstresse === 0, `${falhasEstresse} falhas`);
  ok('FINAL nenhum usuário criado no Auth em toda a bateria', sql('select count(*) from auth.users') === usersAntes);
  ok('FINAL senhas e roles intactos', sql(`select md5(string_agg(encrypted_password, ',' order by id)) from auth.users`) === hashAntes && sql(`select md5(string_agg(username||role, ',' order by id)) from public.profiles`) === rolesAntes);
  ok('FINAL senha nunca gravada em auth_tentativas', !/hub-|Supa-|errada/.test(sql(`select coalesce(string_agg(t::text, ' '), '') from public.auth_tentativas t`)));
  console.log(`\nIP visto pela função (local, sem Worker): ${sql(`select coalesce(string_agg(distinct ip, ','), '-') from public.auth_tentativas`)}`);
  console.log(`RESUMO: ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRO FATAL', e); process.exit(2); });
