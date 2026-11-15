// Testes das regras puras. Rodar: node --test supabase/functions/hub-auth/regras.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  atrasoPorFalhas, classificaErroGetUser, classificaErroGetUserById, ipDoCliente, papelDoHub, sessionIdDoJwt,
  vereditoAuthenticate, vereditoLookup, normalizaUsername,
} from './regras.ts';

const user = { user_id: 'recX', username: 'paulojr', name: 'Paulo Jr', session_version: 3, app_slug: 'gestao-pecuaria', is_global_admin: false, levels: ['admin'] };

test('authenticate: 200 com identidade válida = ok', () => {
  assert.deepEqual(vereditoAuthenticate(200, { ok: true, user }), { tipo: 'ok', user });
});
test('authenticate: 200 sem identidade utilizável = indisponível (nunca ok)', () => {
  assert.equal(vereditoAuthenticate(200, { ok: true, user: { user_id: '' } }).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(200, { ok: true }).tipo, 'indisponivel');
});
test('authenticate: 401 invalid_credentials = senha errada', () => {
  assert.equal(vereditoAuthenticate(401, { ok: false, error: 'invalid_credentials' }).tipo, 'senha_errada');
});
test('authenticate: 401 unauthorized (segredo/app_slug errado) NUNCA vira senha errada', () => {
  assert.equal(vereditoAuthenticate(401, { ok: false, error: 'unauthorized' }).tipo, 'indisponivel');
});
test('authenticate: 403 com motivo conhecido = recusa', () => {
  for (const m of ['user_disabled', 'no_role', 'app_disabled']) {
    assert.deepEqual(vereditoAuthenticate(403, { ok: false, error: m }), { tipo: 'recusado', motivo: m });
  }
});
test('authenticate: 403 com motivo desconhecido, 400, 503, 500, rede = indisponível', () => {
  assert.equal(vereditoAuthenticate(403, { ok: false, error: 'outra_coisa' }).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(400, { ok: false, error: 'app_unknown' }).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(400, { ok: false, error: 'bad_request' }).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(503, { ok: false, error: 'unavailable' }).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(500, null).tipo, 'indisponivel');
  assert.equal(vereditoAuthenticate(0, { error: 'rede: TimeoutError' }).tipo, 'indisponivel');
});
test('lookup: valid:true = válido', () => {
  assert.equal(vereditoLookup(200, { ok: true, valid: true, user }).tipo, 'valido');
});
test('lookup: lista fechada derruba (inclui user_not_found e app_disabled)', () => {
  for (const m of ['user_disabled', 'no_role', 'session_version_mismatch', 'user_not_found', 'app_disabled']) {
    assert.deepEqual(vereditoLookup(200, { ok: true, valid: false, reason: m }), { tipo: 'invalido', motivo: m });
  }
});
test('lookup: motivo fora da lista, app_unknown, 401, 503 = indisponível (nunca derruba)', () => {
  assert.equal(vereditoLookup(200, { ok: true, valid: false, reason: 'app_unknown' }).tipo, 'indisponivel');
  assert.equal(vereditoLookup(200, { ok: true, valid: false, reason: 'motivo_novo' }).tipo, 'indisponivel');
  assert.equal(vereditoLookup(401, { ok: false, error: 'unauthorized' }).tipo, 'indisponivel');
  assert.equal(vereditoLookup(503, { ok: false, error: 'unavailable' }).tipo, 'indisponivel');
  assert.equal(vereditoLookup(0, null).tipo, 'indisponivel');
});
test('papel: admin global ou nível admin = admin; peao = peao; resto = null (no_role), nunca admin', () => {
  assert.equal(papelDoHub({ ...user, levels: [], is_global_admin: true }), 'admin');
  assert.equal(papelDoHub({ ...user, levels: ['admin'] }), 'admin');
  assert.equal(papelDoHub({ ...user, levels: ['peao', 'admin'] }), 'admin');
  assert.equal(papelDoHub({ ...user, levels: ['peao'] }), 'peao');
  assert.equal(papelDoHub({ ...user, levels: ['full'] }), null); // legado pecuaria-full, deprecado
  assert.equal(papelDoHub({ ...user, levels: [] }), null);
});
test('tentativas: só atraso por usuário, sem bloqueio; 1 s, 2 s, 4 s… teto 30 s', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 500].map(atrasoPorFalhas), [0, 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
});
test('IP do cliente: cf-connecting-ip > x-real-ip > x-forwarded-for', () => {
  assert.equal(ipDoCliente(new Headers({ 'cf-connecting-ip': '1.1.1.1', 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })), '1.1.1.1');
  assert.equal(ipDoCliente(new Headers({ 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3' })), '2.2.2.2');
  assert.equal(ipDoCliente(new Headers({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })), '3.3.3.3');
  assert.equal(ipDoCliente(new Headers()), 'desconhecido');
});
test('session_id do JWT', () => {
  const payload = Buffer.from(JSON.stringify({ sub: 'u', session_id: 'abc-123' })).toString('base64url');
  assert.equal(sessionIdDoJwt(`eyJhbGciOiJIUzI1NiJ9.${payload}.sig`), 'abc-123');
  assert.equal(sessionIdDoJwt('lixo'), null);
});
test('getUser do /check: só lista fechada vira relogin', () => {
  assert.equal(classificaErroGetUser({ code: 'session_not_found', status: 403 }), 'relogin');
  assert.equal(classificaErroGetUser({ name: 'AuthSessionMissingError', status: 400 }), 'relogin');
  assert.equal(classificaErroGetUser({ name: 'AuthRetryableFetchError', status: 0 }), 'indisponivel');
  assert.equal(classificaErroGetUser({ code: 'user_not_found', status: 404 }), 'relogin');
  assert.equal(classificaErroGetUser({ code: 'user_banned', status: 403 }), 'relogin');
  assert.equal(classificaErroGetUser({ code: 'bad_jwt', status: 403 }), 'token_invalido');
  assert.equal(classificaErroGetUser({ status: 500 }), 'indisponivel');
  assert.equal(classificaErroGetUser({ code: 'unexpected_failure', status: 500 }), 'indisponivel');
  assert.equal(classificaErroGetUser(null), 'indisponivel');
});
test('getUserById do /login: só "não existe" vira sem_conta', () => {
  assert.equal(classificaErroGetUserById({ code: 'user_not_found', status: 404 }), 'sem_conta');
  assert.equal(classificaErroGetUserById({ status: 404 }), 'sem_conta');
  assert.equal(classificaErroGetUserById({ status: 500 }), 'indisponivel');
  assert.equal(classificaErroGetUserById({ status: 0 }), 'indisponivel');
});
// Corpos REAIS de produção (cedidos pela sessão do hub em 2026-11-10; /authenticate 200 sai do
// mesmo loadIdentity do lookup). lucas = admin-global sem papel próprio.
const realPaulo = { user_id: 'reckDNXCKjrx7qR4h', username: 'paulojr', name: 'Paulo Jr', session_version: 1, app_slug: 'gestao-pecuaria', is_global_admin: false, levels: ['admin'], roles: [{ slug: 'pecuaria-admin', level: 'admin', scopes: ['gestao-pecuaria:admin'] }] };
const realLucas = { user_id: 'rec7x0JSk7vDyMdcy', username: 'lucas', name: 'Lucas', session_version: 1, app_slug: 'gestao-pecuaria', is_global_admin: true, levels: [], roles: [] };
test('fixture real: lookup válido, valid:false reais e authenticate 200', () => {
  assert.equal(vereditoLookup(200, { ok: true, valid: true, user: realPaulo }).tipo, 'valido');
  assert.deepEqual(vereditoLookup(200, { ok: true, valid: false, reason: 'session_version_mismatch' }), { tipo: 'invalido', motivo: 'session_version_mismatch' });
  assert.deepEqual(vereditoLookup(200, { ok: true, valid: false, reason: 'user_not_found' }), { tipo: 'invalido', motivo: 'user_not_found' });
  const vp = vereditoAuthenticate(200, { ok: true, user: realPaulo });
  const vl = vereditoAuthenticate(200, { ok: true, user: realLucas });
  assert.equal(vp.tipo, 'ok'); assert.equal(vl.tipo, 'ok');
  if (vp.tipo === 'ok') assert.equal(papelDoHub(vp.user), 'admin');
  if (vl.tipo === 'ok') assert.equal(papelDoHub(vl.user), 'admin');
});
test('username normalizado', () => {
  assert.equal(normalizaUsername('  PauloJr '), 'paulojr');
  assert.equal(normalizaUsername(''), null);
  assert.equal(normalizaUsername(42), null);
});
