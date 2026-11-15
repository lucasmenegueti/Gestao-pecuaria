// Chamadas de sessão que o middleware (edge) e o login (server action) compartilham.
// Sem `server-only` de propósito: o middleware importa daqui. Só usa fetch + env do servidor.
//
// Login pelo hub gestao-acessos: desenho em ../../../../BRIEFING-INTEGRACAO-ACESSOS.md e
// regras em ../../../../CLAUDE.md › Auth. O dashboard usa a MESMA Edge Function do app.

const url = () => process.env.SUPABASE_URL ?? '';
const key = () => process.env.SUPABASE_ANON_KEY ?? '';
const headers = (bearer?: string) => ({
  apikey: key(),
  Authorization: `Bearer ${bearer ?? key()}`,
  'Content-Type': 'application/json',
});

export type ModoLogin = 'hub' | 'legado';

/** Qualquer falha → 'legado': voltar alguém pro login direto tem de funcionar com tudo quebrado. */
export async function modoDeLogin(username: string): Promise<ModoLogin> {
  try {
    const r = await fetch(`${url()}/rest/v1/rpc/auth_mode`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ u: username }), cache: 'no-store',
    });
    return r.ok && (await r.json()) === 'hub' ? 'hub' : 'legado';
  } catch {
    return 'legado';
  }
}

export interface TokensSupabase {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type ResultadoHub =
  | { tipo: 'ok'; tokens: TokensSupabase }
  | { tipo: 'legado' }
  | { tipo: 'recusa'; codigo: string; mensagem: string }
  | { tipo: 'indisponivel'; detalhe: string };

const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'Usuário ou senha inválidos.',
  bad_request: 'Usuário ou senha inválidos.',
  user_disabled: 'Seu acesso está desativado. Fale com o administrador.',
  no_role: 'Você não tem permissão para este app. Fale com o administrador.',
  app_disabled: 'O app está temporariamente desativado. Fale com o administrador.',
  role_mismatch: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  sem_vinculo: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  sem_conta_no_app: 'Seu cadastro precisa de um ajuste. Fale com o administrador.',
  muitas_tentativas: 'Muitas tentativas erradas. Aguarde alguns minutos ou fale com o administrador.',
};

function subDoJwt(jwt: string): string | null {
  try {
    const p = jwt.split('.')[1] ?? '';
    const json = atob(p.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((p.length + 3) % 4));
    const sub = JSON.parse(json).sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

/** Uma chamada só, 70 s: a função segura quem errou a senha (até 30 s) e espera o hub (até 20 s). */
export async function loginPeloHub(username: string, password: string): Promise<ResultadoHub> {
  let status = 0;
  let data: any = null;
  try {
    const r = await fetch(`${url()}/functions/v1/hub-auth/login`, {
      method: 'POST', headers: headers(), body: JSON.stringify({ username, password }),
      cache: 'no-store', signal: AbortSignal.timeout(70_000),
    });
    status = r.status;
    data = await r.json().catch(() => null);
  } catch (e) {
    return { tipo: 'indisponivel', detalhe: `rede: ${(e as Error)?.name ?? e}` };
  }
  const s = data?.session;
  const userId = s?.access_token ? subDoJwt(s.access_token) : null;
  if (status === 200 && data?.ok && s?.access_token && s?.refresh_token && userId) {
    const expiresAt = typeof s.expires_at === 'number' ? s.expires_at * 1000 : Date.now() + 3600_000;
    return { tipo: 'ok', tokens: { userId, accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt } };
  }
  const codigo = typeof data?.error === 'string' ? data.error : '';
  if (status === 409 && codigo === 'modo_legado') return { tipo: 'legado' };
  // Veredito só por lista fechada; o resto (503, 5xx, 404, rede) = indisponível → caminho direto.
  if ((status === 401 || status === 403 || status === 429 || status === 400) && MENSAGENS[codigo]) {
    return { tipo: 'recusa', codigo, mensagem: MENSAGENS[codigo] };
  }
  return { tipo: 'indisponivel', detalhe: `${status} ${codigo}`.trim() };
}

/** Renova o access token. null = não deu (refresh recusado, rede): quem chama decide. */
export async function renovarSessao(refreshToken: string): Promise<Omit<TokensSupabase, 'userId'> | null> {
  try {
    const r = await fetch(`${url()}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: key(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }), cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const t = await r.json();
    if (!t?.access_token || !t?.refresh_token) return null;
    const expiresIn = typeof t.expires_in === 'number' ? t.expires_in : 3600;
    return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: Date.now() + expiresIn * 1000 };
  } catch {
    return null;
  }
}

/** Motivos que encerram a sessão do dashboard: revogação confirmada no hub, ou sessão que não
 *  foi emitida pelo hub / já não existe ('relogin'). Lista fechada, igual à do app. */
const ENCERRAM = new Set(['relogin', 'user_disabled', 'no_role', 'session_version_mismatch', 'user_not_found', 'app_disabled']);

/** 'encerrar' só com `valid:false` do servidor e motivo conhecido. Rede, 503, 401, resposta
 *  estranha = 'ignorar' — instabilidade nunca derruba ninguém. Em `legado` a função é no-op. */
export async function revalidarNoHub(accessToken: string): Promise<'ok' | 'ignorar' | { encerrar: string }> {
  try {
    const r = await fetch(`${url()}/functions/v1/hub-auth/check`, {
      method: 'POST', headers: headers(accessToken), body: '{}', cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return 'ignorar';
    const d = await r.json().catch(() => null);
    if (d?.ok === true && d.valid === true) return 'ok';
    if (d?.ok === true && d.valid === false && typeof d.reason === 'string' && ENCERRAM.has(d.reason)) {
      return { encerrar: d.reason };
    }
    return 'ignorar';
  } catch {
    return 'ignorar';
  }
}
