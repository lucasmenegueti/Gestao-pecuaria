// Regras puras da hub-auth (sem I/O) — testadas em regras_test.ts.
// Contrato do hub: ../gestao-acessos/docs/protocolo-sso.md.

export type VereditoLogin =
  | { tipo: 'ok'; user: HubIdentidade }
  | { tipo: 'senha_errada' }
  | { tipo: 'recusado'; motivo: 'user_disabled' | 'no_role' | 'app_disabled' }
  | { tipo: 'indisponivel'; detalhe: string };

export type HubIdentidade = {
  user_id: string;
  username: string;
  name: string;
  session_version: number;
  app_slug: string;
  is_global_admin: boolean;
  levels: string[];
};

const RECUSAS_LOGIN = new Set(['user_disabled', 'no_role', 'app_disabled']);

/** /authenticate: só 200, 401 invalid_credentials e 403 com motivo conhecido são veredito.
 *  Todo o resto (401 unauthorized = segredo/app_slug errado, 400, 5xx, corpo estranho) vira
 *  'indisponivel' — um erro de configuração NUNCA pode virar "senha errada". */
export function vereditoAuthenticate(status: number, body: unknown): VereditoLogin {
  const b = (body ?? {}) as Record<string, unknown>;
  if (status === 200 && b.ok === true && identidadeValida(b.user)) return { tipo: 'ok', user: b.user };
  if (status === 401 && b.error === 'invalid_credentials') return { tipo: 'senha_errada' };
  if (status === 403 && typeof b.error === 'string' && RECUSAS_LOGIN.has(b.error)) {
    return { tipo: 'recusado', motivo: b.error as 'user_disabled' | 'no_role' | 'app_disabled' };
  }
  return { tipo: 'indisponivel', detalhe: `${status} ${typeof b.error === 'string' ? b.error : ''}`.trim() };
}

export type VereditoLookup =
  | { tipo: 'valido' }
  | { tipo: 'invalido'; motivo: string }
  | { tipo: 'indisponivel'; detalhe: string };

/** Motivos de valid:false que derrubam (lista fechada, combinada com o hub em 2026-11-10).
 *  app_unknown e qualquer motivo novo = erro de config → indisponível, nunca derruba. */
export const MOTIVOS_QUE_DERRUBAM = new Set([
  'user_disabled', 'no_role', 'session_version_mismatch', 'user_not_found', 'app_disabled',
]);

export function vereditoLookup(status: number, body: unknown): VereditoLookup {
  const b = (body ?? {}) as Record<string, unknown>;
  if (status === 200 && b.ok === true && b.valid === true) return { tipo: 'valido' };
  if (status === 200 && b.ok === true && b.valid === false && typeof b.reason === 'string'
      && MOTIVOS_QUE_DERRUBAM.has(b.reason)) {
    return { tipo: 'invalido', motivo: b.reason };
  }
  return { tipo: 'indisponivel', detalhe: `${status} ${String(b.reason ?? b.error ?? '')}`.trim() };
}

/** Erro do GoTrue no getUser(jwt) do /check. Só 'relogin' derruba a sessão local do app, e só
 *  por lista fechada (sessão apagada / usuário sumiu ou banido). Token só expirado = o app
 *  renova e repete. Qualquer outra coisa (rede, 5xx, desconhecido) = indisponível. */
export function classificaErroGetUser(e: { code?: string; status?: number; name?: string } | null):
  'relogin' | 'token_invalido' | 'indisponivel' {
  const c = e?.code ?? '';
  // o supabase-js converte o session_not_found do GoTrue em AuthSessionMissingError (sem code);
  // como a função sempre passa o JWT explícito, esse erro só significa "sessão apagada".
  if (e?.name === 'AuthSessionMissingError') return 'relogin';
  if (c === 'session_not_found' || c === 'user_not_found' || c === 'user_banned') return 'relogin';
  if (c === 'bad_jwt' || c === 'no_authorization') return 'token_invalido';
  return 'indisponivel';
}

/** Erro do admin.getUserById no /login: só "não existe" vira sem_conta_no_app. */
export function classificaErroGetUserById(e: { code?: string; status?: number } | null):
  'sem_conta' | 'indisponivel' {
  return e?.code === 'user_not_found' || e?.status === 404 ? 'sem_conta' : 'indisponivel';
}

/** Papel do hub → papel do app (dois níveis). Admin global ou nível 'admin' ⇒ admin; nível
 *  'peao' ⇒ peao. Qualquer outro nível (ex.: o legado 'full') não vale nada: null = no_role,
 *  NUNCA admin. */
export function papelDoHub(u: HubIdentidade): 'admin' | 'peao' | null {
  if (u.is_global_admin || u.levels.includes('admin')) return 'admin';
  if (u.levels.includes('peao')) return 'peao';
  return null;
}

function identidadeValida(u: unknown): u is HubIdentidade {
  const x = u as Record<string, unknown> | null;
  return !!x && typeof x.user_id === 'string' && x.user_id.length > 0
    && typeof x.session_version === 'number' && Array.isArray(x.levels)
    && typeof x.is_global_admin === 'boolean';
}

/** Anti força-bruta (combinado com o hub em 2026-11-15).
 *  Aqui NÃO há bloqueio duro: o app chega pela Worker da Cloudflare e o Supabase enxerga um
 *  IP só para todo mundo (medido em auth.sessions), então bloquear por IP ou por (usuário, IP)
 *  deixaria qualquer pessoa com a chave pública trancar o `vaqueiro` — ou a fazenda inteira.
 *  Fica só o atraso progressivo POR USUÁRIO: 1 s, 2 s, 4 s… teto 30 s, contando as falhas de
 *  senha desde o último login certo (o login certo zera), na janela de 15 min.
 *  Zerar na mão: `delete from public.auth_tentativas where username = '<user>';` */
export const JANELA_MIN = 15;
export const ATRASO_TETO_MS = 30_000;

export function atrasoPorFalhas(falhasUsuario: number): number {
  return falhasUsuario <= 0 ? 0 : Math.min(1000 * 2 ** (falhasUsuario - 1), ATRASO_TETO_MS);
}

/** IP visto pela função. Só para registro em auth_tentativas (diagnóstico): na pecuária ele é
 *  o da Worker, igual para todos, e por isso não entra em nenhuma regra. */
export function ipDoCliente(h: Headers): string {
  return h.get('cf-connecting-ip')?.trim()
    || h.get('x-real-ip')?.trim()
    || (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
    || 'desconhecido';
}

/** session_id do access token emitido pelo GoTrue (sem validar assinatura — só leitura
 *  de um token que a própria função acabou de receber do GoTrue ou que o getUser já validou). */
export function sessionIdDoJwt(jwt: string): string | null {
  try {
    const p = jwt.split('.')[1];
    const json = atob(p.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((p.length + 3) % 4));
    const sid = JSON.parse(json).session_id;
    return typeof sid === 'string' ? sid : null;
  } catch {
    return null;
  }
}

export function normalizaUsername(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  const s = u.trim().toLowerCase();
  return s.length > 0 && s.length <= 64 ? s : null;
}
