import 'server-only';

// Cliente Supabase server-only via fetch direto (sem SDK).
// URL aponta pro Worker proxy do app pecuária — ver CLAUDE.md do app pra contexto.
//
// IMPORTANTE: queries usam o JWT do user logado (lido da iron-session) porque
// RLS bloqueia leitura anônima na maioria das tabelas. Sem token, nada vem.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[supabase] SUPABASE_URL ou SUPABASE_ANON_KEY ausente. Queries vão falhar.');
}

interface QueryParams {
  select?: string;
  order?: string;
  limit?: number;
  filters?: Record<string, string>;
  /** JWT de acesso do user (Supabase Auth). Sem isso, RLS bloqueia. */
  accessToken?: string;
}

function authHeader(accessToken: string | undefined): string {
  // PostgREST aceita o JWT no Authorization. apikey precisa do anon (sempre).
  return accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`;
}

/** Lista registros de uma tabela via REST API do Supabase (PostgREST). */
export async function sbList<T>(
  table: string,
  params: QueryParams = {},
): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];

  const search = new URLSearchParams();
  search.set('select', params.select ?? '*');
  if (params.order) search.set('order', params.order);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      search.set(k, v);
    }
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}?${search.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: authHeader(params.accessToken),
      Accept: 'application/json',
    },
    // Cache zero quando o request é por user — JWT tem TTL próprio.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[supabase] ${table}: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T[];
}

/** RPC call ao Supabase. */
export async function sbRpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  accessToken?: string,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env missing');

  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: authHeader(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[supabase] rpc/${fn}: ${res.status} — ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
