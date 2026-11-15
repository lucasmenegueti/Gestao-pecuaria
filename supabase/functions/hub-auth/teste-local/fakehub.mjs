// Hub falso: simula /authenticate (por user_id) e /lookup do gestao-acessos. Controle via POST /__ctl.
import http from 'node:http';
const SEGREDO = 'segredo-de-teste-local-0123456789abcdef';
const APP = 'gestao-pecuaria';
// Um usuário do hub por PESSOA: `pedro` e `pedro.chaves` da pecuária são o mesmo rec4wsF….
const USERS = {
  rec7x0JSk7vDyMdcy: { username: 'lucas',        pw: 'hub-lucas', levels: [],        is_global_admin: true },
  recyIMtKR22QpWmQ4: { username: 'alex',         pw: 'hub-alex',  levels: ['peao'],  is_global_admin: false }, // força role_mismatch (é admin no app)
  rec4wsFkI9dH01yjQ: { username: 'pedro.chaves', pw: 'hub-pedro', levels: ['admin'], is_global_admin: false },
  recmeAvY3zfMbo7rB: { username: 'vaqueiro',     pw: 'hub-vaq',   levels: ['peao'],  is_global_admin: false },
  rec94m3AUEnAwJTQt: { username: 'bruno',        pw: 'hub-bruno', levels: ['full'],  is_global_admin: false }, // level legado → no_role na função
  recjUXvvxwQTwHK9t: { username: 'rafael',       pw: 'hub-rafael', levels: ['peao'], is_global_admin: false },
};
let ctl = { authForce: null, lookupSeq: [], chamadas: [], corpos: [] };
const ident = (id, u) => ({ user_id: id, username: u.username, name: u.username, session_version: 3, app_slug: APP, is_global_admin: u.is_global_admin, levels: u.levels, roles: [] });
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    const j = b ? JSON.parse(b) : {}; const send = (st, o) => { res.writeHead(st, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/__ctl') { if (j.reset) ctl = { authForce: null, lookupSeq: [], chamadas: [], corpos: [] }; Object.assign(ctl, j.set || {}); return send(200, { chamadas: ctl.chamadas, corpos: ctl.corpos }); }
    ctl.chamadas.push(req.url);
    // guarda as CHAVES do corpo (nunca a senha) pra bateria provar que vai user_id e não login
    ctl.corpos.push({ url: req.url, chaves: Object.keys(j).sort(), user_id: j.user_id ?? null, login: j.login ?? null });
    if (req.headers.authorization !== `Bearer ${SEGREDO}` || j.app_slug !== APP) return send(401, { ok: false, error: 'unauthorized' });
    if (req.url === '/api/nsa-access/authenticate') {
      if (ctl.authForce) return send(ctl.authForce.status, ctl.authForce.body);
      const u = USERS[j.user_id]; if (!u || u.pw !== j.password) return send(401, { ok: false, error: 'invalid_credentials' });
      return send(200, { ok: true, user: ident(j.user_id, u) });
    }
    if (req.url === '/api/nsa-access/lookup') {
      const nxt = ctl.lookupSeq.shift(); if (nxt) return send(nxt.status, nxt.body);
      return send(200, { ok: true, valid: true });
    }
    send(404, {});
  });
}).listen(56999, () => console.log('fakehub on 56999'));
