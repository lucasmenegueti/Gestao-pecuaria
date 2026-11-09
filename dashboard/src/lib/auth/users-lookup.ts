import 'server-only';

// Auth contra o Supabase (mesma fonte do app pecuária):
//   1. username → email via RPC `email_for_username` (criada no Supabase do app)
//   2. email + password via /auth/v1/token?grant_type=password
//   3. checa role='admin' no profiles do usuário autenticado
// Sem bcrypt local — fonte da verdade é o Supabase Auth + profiles.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface AuthedUser {
  username: string;
  role: 'owner' | 'gestor';
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Login no projeto do Curral com as mesmas credenciais (os usuários foram
 * clonados para lá). Não decide acesso ao dashboard: falhar aqui só deixa a
 * aba do Curral sem dado. Hoje o Curral vive no branch QA do Supabase, que
 * tem outro segredo de JWT — o token de prod não vale lá (401).
 */
export async function signInCurral(
  username: string,
  password: string,
): Promise<{ accessToken: string; expiresAt: number } | null> {
  const url = process.env.CURRAL_SUPABASE_URL;
  const key = process.env.CURRAL_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const rpcRes = await fetch(`${url}/rest/v1/rpc/email_for_username`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ u: username.trim().toLowerCase() }),
      cache: 'no-store',
    });
    if (!rpcRes.ok) return null;
    const email = await rpcRes.json();
    if (!email || typeof email !== 'string') return null;

    const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    if (!authRes.ok) {
      console.error('[auth] login no Curral falhou:', authRes.status);
      return null;
    }
    const tok = await authRes.json();
    if (!tok?.access_token) return null;
    const expiresIn = typeof tok.expires_in === 'number' ? tok.expires_in : 3600;
    return { accessToken: tok.access_token, expiresAt: Date.now() + expiresIn * 1000 };
  } catch (e) {
    console.error('[auth] login no Curral falhou:', e);
    return null;
  }
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<AuthedUser | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[auth] SUPABASE_URL ou SUPABASE_ANON_KEY ausente');
    return null;
  }
  const u = username.trim().toLowerCase();
  if (!u || !password) return null;

  // 1. Resolve username → email via RPC.
  let email: string;
  try {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/email_for_username`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ u }),
      cache: 'no-store',
    });
    if (!rpcRes.ok) return null;
    const data = await rpcRes.json();
    if (!data || typeof data !== 'string') return null;
    email = data;
  } catch (e) {
    console.error('[auth] email_for_username failed:', e);
    return null;
  }

  // 2. Sign in via Supabase Auth. Guarda access_token pra ler profile com a
  //    identidade do user (RLS permite "own profile", anon key não).
  let userId: string;
  let accessToken: string;
  let refreshToken: string;
  let expiresAt: number;
  try {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    if (!authRes.ok) return null;
    const tok = await authRes.json();
    if (!tok?.user?.id || !tok?.access_token) return null;
    userId = tok.user.id;
    accessToken = tok.access_token;
    refreshToken = tok.refresh_token ?? '';
    // expires_in vem em segundos
    const expiresIn = typeof tok.expires_in === 'number' ? tok.expires_in : 3600;
    expiresAt = Date.now() + expiresIn * 1000;
  } catch (e) {
    console.error('[auth] signin failed:', e);
    return null;
  }

  // 3. Lookup profile com JWT do user (RLS na profiles bloqueia anon).
  try {
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=username,role&id=eq.${userId}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      },
    );
    if (!profRes.ok) {
      console.error('[auth] profile fetch failed:', profRes.status, await profRes.text().catch(() => ''));
      return null;
    }
    const rows = (await profRes.json()) as Array<{ username: string | null; role: string }>;
    const profile = rows[0];
    if (!profile) {
      console.error('[auth] profile not found for user', userId);
      return null;
    }
    if (profile.role !== 'admin') {
      console.error('[auth] non-admin role rejected:', profile.role);
      return null; // peão não acessa dashboard
    }
    return {
      username: profile.username ?? u,
      role: 'owner',
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (e) {
    console.error('[auth] profile lookup failed:', e);
    return null;
  }
}
