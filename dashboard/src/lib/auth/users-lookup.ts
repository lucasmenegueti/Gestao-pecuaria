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

  // 2. Sign in via Supabase Auth.
  let userId: string;
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
    if (!tok?.user?.id) return null;
    userId = tok.user.id;
  } catch (e) {
    console.error('[auth] signin failed:', e);
    return null;
  }

  // 3. Lookup profile. Só admin entra no dashboard.
  try {
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=username,role&id=eq.${userId}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      },
    );
    if (!profRes.ok) return null;
    const rows = (await profRes.json()) as Array<{ username: string | null; role: string }>;
    const profile = rows[0];
    if (!profile) return null;
    if (profile.role !== 'admin') return null; // peão não acessa dashboard
    return { username: profile.username ?? u, role: 'owner' };
  } catch (e) {
    console.error('[auth] profile lookup failed:', e);
    return null;
  }
}
