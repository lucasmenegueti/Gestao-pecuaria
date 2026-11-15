// Edge Function hub-auth — ponte de login do gestao-pecuaria com o hub gestao-acessos.
// Desenho: BRIEFING-INTEGRACAO-ACESSOS.md (raiz do repo). Molde: a hub-auth do gestao-agricultura.
//
//   POST /hub-auth/login  {username, password}  → sessão GoTrue real pro uuid de sempre
//   POST /hub-auth/check  (Authorization: Bearer <access token do usuário>) → revalida no hub
//
// Regras que não podem quebrar:
// - Só atua em modo 'hub' (auth_config). Em 'legado' o app faz o login direto e nem chama aqui.
// - Mapeia ANTES de falar com o hub: username local → uuid → hub_vinculos.hub_user_id, e chama
//   o /authenticate com `user_id`. Nunca manda o username: o `pedro` do hub é outra pessoa.
// - Vínculo N:1 (`pedro` e `pedro.chaves` → o mesmo usuário do hub).
// - E-mail SEMPRE de admin.getUserById(uuid de hub_vinculos) — generateLink pra e-mail
//   inexistente CRIA usuário mesmo com signup desligado (Gate 0, critério 9).
// - Hub fora/erro de config = 503 "tente de novo". Nunca vira senha errada, nunca derruba.
// - Nunca loga nem grava a senha.
// - Deploy: `supabase functions deploy hub-auth --project-ref fxtescythawmbwkthbyb --no-verify-jwt`
//   (a autorização é feita aqui; a chave publishable não é JWT).

import { createClient, type Session, type SupabaseClient } from 'npm:@supabase/supabase-js@2.103.3';
import {
  atrasoPorFalhas, classificaErroGetUser, classificaErroGetUserById, ipDoCliente, JANELA_MIN, normalizaUsername, papelDoHub, sessionIdDoJwt,
  vereditoAuthenticate, vereditoLookup,
} from './regras.ts';

const APP_SLUG = 'gestao-pecuaria';
// /authenticate em prod já levou 8,4 s (partida a frio do hub + bcrypt + Airtable, 2026-11-11).
// Fica abaixo do timeout de 25 s do fetch do app (offlineSafeFetch).
const HUB_TIMEOUT_MS = 20_000;
const CHECK_CACHE_S = 60;
const ORIGENS = new Set([
  'https://nsa-gestao-pecuaria.netlify.app',
  'http://localhost:8081',
]);

// ---------- env (lazy: o deploy sobe mesmo sem o segredo do hub) ----------
const chaveLogada = new Set<string>();
function chaveDe(jsonVar: string, legado: string): string {
  const j = Deno.env.get(jsonVar);
  let k: string | undefined;
  try { k = j ? JSON.parse(j)?.default : undefined; } catch { /* cai no legado */ }
  const tipo = typeof k === 'string' && k ? 'nova' : 'legada';
  if (tipo === 'legada') k = Deno.env.get(legado);
  if (!k) throw new Error(`env ausente: ${jsonVar}/${legado}`);
  // a chave legada morre em 31/12/2026 — o log mostra qual está em uso (nunca o valor)
  if (!chaveLogada.has(jsonVar)) { chaveLogada.add(jsonVar); console.log(JSON.stringify({ fn: 'hub-auth', evento: 'chave', var: jsonVar, tipo })); }
  return k;
}
const url = () => Deno.env.get('SUPABASE_URL')!;
const semPersistir = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = (): SupabaseClient => createClient(url(), chaveDe('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), semPersistir);
const publico = (): SupabaseClient => createClient(url(), chaveDe('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), semPersistir);

// ---------- http ----------
function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin') ?? '';
  return {
    ...(ORIGENS.has(o) ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-app',
  };
}
function resp(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(req) },
  });
}
function log(evento: string, dados: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: 'hub-auth', evento, ...dados }));
}

async function chamaHub(rota: 'authenticate' | 'lookup', corpo: Record<string, unknown>) {
  const base = Deno.env.get('NSA_HUB_URL');
  const segredo = Deno.env.get('NSA_ACCESS_SECRET');
  if (!base || !segredo) return { status: 0, body: { error: 'hub_nao_configurado' } };
  try {
    const r = await fetch(`${base.replace(/\/$/, '')}/api/nsa-access/${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${segredo}` },
      body: JSON.stringify({ ...corpo, app_slug: APP_SLUG }),
      signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  } catch (e) {
    return { status: 0, body: { error: `rede: ${(e as Error).name}` } };
  }
}

async function modoDe(sb: SupabaseClient, username: string): Promise<'legado' | 'hub'> {
  const { data, error } = await sb.rpc('auth_mode', { u: username });
  if (error) throw new Error(`auth_mode: ${error.message}`);
  return data === 'hub' ? 'hub' : 'legado';
}

// ---------- /login ----------
async function login(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const username = normalizaUsername(body?.username);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!username || !password) return resp(req, 400, { ok: false, error: 'bad_request' });
  const ip = ipDoCliente(req.headers);
  const sb = admin();

  if (await modoDe(sb, username) !== 'hub') return resp(req, 409, { ok: false, error: 'modo_legado' });

  // Mapeia a conta local ANTES do hub. Erro de consulta = 503 (throw); linha ausente = recusa.
  const { data: perfil, error: eperfil } = await sb.from('profiles').select('id, username, role').ilike('username', username.replace(/[\\%_]/g, '\\$&')).maybeSingle();
  if (eperfil) throw new Error(`profiles: ${eperfil.message}`);
  if (!perfil) return resp(req, 409, { ok: false, error: 'modo_legado' }); // auth_mode já devolve legado pra desconhecido
  const uuid = perfil.id as string;
  const { data: vinc, error: evinc } = await sb.from('hub_vinculos').select('hub_user_id').eq('auth_user_id', uuid).maybeSingle();
  if (evinc) throw new Error(`hub_vinculos: ${evinc.message}`);
  if (!vinc) {
    // conta em modo hub sem vínculo = erro de operação. Bloqueia (cair no direto contornaria o hub).
    log('sem_vinculo', { username, uuid });
    return resp(req, 403, { ok: false, error: 'sem_vinculo' });
  }
  const hubUserId = vinc.hub_user_id as string;

  // anti força-bruta: só atraso por usuário (ver regras.ts). Conta as falhas de senha desde o
  // último login certo, na janela; 503 do hub não conta.
  const desde = new Date(Date.now() - JANELA_MIN * 60_000).toISOString();
  const { data: ultOk, error: eok } = await sb.from('auth_tentativas').select('criado_em').eq('username', username).eq('sucesso', true).order('criado_em', { ascending: false }).limit(1).maybeSingle();
  if (eok) throw new Error(`auth_tentativas: ${eok.message}`);
  const corte = ultOk?.criado_em && ultOk.criado_em > desde ? ultOk.criado_em : desde;
  const { count: falhas, error: efal } = await sb.from('auth_tentativas').select('id', { count: 'exact', head: true }).eq('username', username).eq('sucesso', false).gt('criado_em', corte);
  if (efal) throw new Error(`auth_tentativas: ${efal.message}`);
  const atrasoMs = atrasoPorFalhas(falhas ?? 0);
  if (atrasoMs > 0) await new Promise((ok) => setTimeout(ok, atrasoMs));

  const hub = await chamaHub('authenticate', { user_id: hubUserId, password });
  const v = vereditoAuthenticate(hub.status, hub.body);
  if (v.tipo === 'indisponivel') {
    log('hub_indisponivel', { username, detalhe: v.detalhe });
    return resp(req, 503, { ok: false, error: 'unavailable' });
  }
  if (v.tipo === 'senha_errada') {
    await sb.from('auth_tentativas').insert({ username, ip, sucesso: false });
    return resp(req, 401, { ok: false, error: 'invalid_credentials' });
  }
  if (v.tipo === 'recusado') {
    log('login_recusado', { username, motivo: v.motivo });
    return resp(req, 403, { ok: false, error: v.motivo });
  }
  if (v.user.user_id !== hubUserId) {
    // defesa: o hub respondeu por outra pessoa. Nunca vira sessão; trata como hub quebrado.
    log('hub_identidade_divergente', { username, esperado: hubUserId, veio: v.user.user_id });
    return resp(req, 503, { ok: false, error: 'unavailable' });
  }
  const papel = papelDoHub(v.user);
  if (!papel) {
    log('login_recusado', { username, motivo: 'no_role', levels: v.user.levels });
    return resp(req, 403, { ok: false, error: 'no_role' });
  }
  if (perfil.role !== papel) {
    // nunca reescreve role: um rebaixamento errado faria o RLS descartar edições sem aviso.
    log('role_mismatch', { username, hub: papel, app: perfil.role });
    return resp(req, 403, { ok: false, error: 'role_mismatch' });
  }

  // e-mail SÓ do auth.users (armadilha do generateLink)
  const { data: au, error: eu } = await sb.auth.admin.getUserById(uuid);
  if (eu && classificaErroGetUserById(eu) === 'indisponivel') throw new Error(`getUserById: ${eu.status} ${eu.message}`);
  if (eu || !au?.user?.email) {
    log('auth_user_ausente', { username, uuid, erro: eu?.message });
    return resp(req, 403, { ok: false, error: 'sem_conta_no_app' });
  }
  // generateLink de um 2º login simultâneo do mesmo usuário invalida o token do 1º
  // (otp_expired) — toque duplo ou 2 aparelhos. Tenta de novo, com espera aleatória.
  let ver: { session: Session | null } | null = null;
  let ev: { code?: string; message: string } | null = null;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const { data: link, error: el } = await sb.auth.admin.generateLink({ type: 'magiclink', email: au.user.email });
    if (el || !link?.properties?.hashed_token) {
      log('generate_link_falhou', { username, erro: el?.message });
      return resp(req, 503, { ok: false, error: 'unavailable' });
    }
    const r = await publico().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
    ver = r.data; ev = r.error;
    if (!(ev?.code === 'otp_expired' && tentativa < 3)) break;
    log('verify_corrida', { username, tentativa });
    await new Promise((ok) => setTimeout(ok, 100 + Math.random() * 400));
  }
  const s = ver?.session;
  if (ev || !s) {
    log('verify_falhou', { username, erro: ev?.code ?? ev?.message });
    return resp(req, ev?.code === 'user_banned' ? 403 : 503, { ok: false, error: ev?.code === 'user_banned' ? 'user_disabled' : 'unavailable' });
  }
  const sid = sessionIdDoJwt(s.access_token);
  if (s.user.id !== uuid || !sid) {
    // defesa: sessão pra uuid errado nunca sai daqui
    await sb.auth.admin.signOut(s.access_token, 'local').catch(() => {});
    log('sessao_uuid_divergente', { username, esperado: uuid, veio: s.user.id });
    return resp(req, 500, { ok: false, error: 'erro_interno' });
  }
  const { error: ehs } = await sb.from('hub_sessoes').insert({
    session_id: sid, auth_user_id: uuid, hub_user_id: v.user.user_id,
    session_version: v.user.session_version, ultimo_check_em: new Date().toISOString(), ultimo_check_valido: true,
  });
  if (ehs) {
    // sessão sem registro faria o próximo /check pedir relogin em laço → desfaz e manda tentar de novo
    await sb.auth.admin.signOut(s.access_token, 'local').catch(() => {});
    throw new Error(`hub_sessoes insert: ${ehs.message}`);
  }
  await sb.from('auth_tentativas').insert({ username, ip, sucesso: true });
  await sb.from('auth_tentativas').delete().lt('criado_em', new Date(Date.now() - 86_400_000).toISOString());
  log('login_ok', { username });
  return resp(req, 200, {
    ok: true,
    session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at },
    hub: {
      user_id: v.user.user_id, session_version: v.user.session_version,
      levels: v.user.levels, is_global_admin: v.user.is_global_admin, name: v.user.name,
    },
  });
}

// ---------- /check ----------
async function check(req: Request): Promise<Response> {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt.startsWith('eyJ')) return resp(req, 401, { ok: false, error: 'sem_sessao' });
  const sb = admin();
  const { data: gu, error: eg } = await sb.auth.getUser(jwt);
  if (eg || !gu?.user) {
    // Só lista fechada vira relogin (sessão apagada / usuário sumiu); o app NUNCA apaga pendentes.
    const c = classificaErroGetUser(eg as { code?: string; status?: number; name?: string } | null);
    if (c === 'relogin') return resp(req, 200, { ok: true, valid: false, reason: 'relogin' });
    if (c === 'token_invalido') return resp(req, 401, { ok: false, error: 'token_invalido' }); // app renova e repete
    throw new Error(`getUser: ${eg?.status} ${eg?.code ?? eg?.message}`);
  }
  const uuid = gu.user.id;
  const sid = sessionIdDoJwt(jwt);
  const { data: perfil, error: eperfil } = await sb.from('profiles').select('username').eq('id', uuid).maybeSingle();
  if (eperfil) throw new Error(`profiles: ${eperfil.message}`);
  if (!perfil || await modoDe(sb, perfil.username) !== 'hub') {
    // Só uuid + modo: prova que este aparelho já roda o cliente novo (gate da virada pra hub).
    log('check_legado', { uuid, modo: 'legado' });
    return resp(req, 200, { ok: true, valid: true, modo: 'legado' });
  }

  const { data: hs, error: ehs } = sid
    ? await sb.from('hub_sessoes').select('*').eq('session_id', sid).maybeSingle()
    : { data: null, error: null };
  if (ehs) throw new Error(`hub_sessoes: ${ehs.message}`);
  if (!hs) {
    // virada legado→hub: sessão sem registro de emissão pede relogin, nada é apagado
    return resp(req, 200, { ok: true, valid: false, reason: 'relogin', modo: 'hub' });
  }
  if (hs.ultimo_check_em && hs.ultimo_check_valido
      && Date.now() - Date.parse(hs.ultimo_check_em) < CHECK_CACHE_S * 1000) {
    return resp(req, 200, { ok: true, valid: true, modo: 'hub', cache: true });
  }

  const pergunta = { user_id: hs.hub_user_id, session_version: hs.session_version };
  const lookup = async () => { const r = await chamaHub('lookup', pergunta); return vereditoLookup(r.status, r.body); };
  let v = await lookup();
  if (v.tipo === 'invalido') {
    // 2º lookup imediato, sem cache: só derruba se o mesmo motivo se repetir
    const v2 = await lookup();
    if (!(v2.tipo === 'invalido' && v2.motivo === v.motivo)) v = v2.tipo === 'valido' ? v2 : { tipo: 'indisponivel', detalhe: 'segundo lookup divergente' };
  }
  if (v.tipo === 'indisponivel') {
    log('lookup_indisponivel', { uuid, detalhe: v.detalhe });
    return resp(req, 503, { ok: false, error: 'unavailable' });
  }
  if (v.tipo === 'valido') {
    await sb.from('hub_sessoes').update({ ultimo_check_em: new Date().toISOString(), ultimo_check_valido: true }).eq('session_id', sid);
    return resp(req, 200, { ok: true, valid: true, modo: 'hub' });
  }
  // revoga SÓ a sessão do chamador
  await sb.auth.admin.signOut(jwt, 'local').catch((e) => log('signout_falhou', { uuid, erro: String(e) }));
  await sb.from('hub_sessoes').update({ ultimo_check_em: new Date().toISOString(), ultimo_check_valido: false }).eq('session_id', sid);
  log('sessao_revogada', { uuid, motivo: v.motivo });
  return resp(req, 200, { ok: true, valid: false, reason: v.motivo, modo: 'hub' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return resp(req, 405, { ok: false, error: 'method_not_allowed' });
  const rota = new URL(req.url).pathname.split('/').pop();
  try {
    if (rota === 'login') return await login(req);
    if (rota === 'check') return await check(req);
    return resp(req, 404, { ok: false, error: 'not_found' });
  } catch (e) {
    log('erro_interno', { rota, erro: (e as Error).message });
    return resp(req, 503, { ok: false, error: 'unavailable' });
  }
});
