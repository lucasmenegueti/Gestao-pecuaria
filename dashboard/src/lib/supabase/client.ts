import 'server-only';

// Cliente Supabase server-only via fetch direto (sem SDK).
// URL aponta pro Worker proxy do app pecuária — ver CLAUDE.md do app pra contexto.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Permite next build sem env (build-time) — falha em runtime se faltar.
  console.warn('[supabase] SUPABASE_URL ou SUPABASE_ANON_KEY ausente. Queries vão falhar.');
}

interface QueryParams {
  select?: string;
  order?: string;
  limit?: number;
  filters?: Record<string, string>;
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
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
    // Server components: cache curto pra dashboard read-only sem ficar pesado.
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[supabase] ${table}: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T[];
}

/** RPC call ao Supabase. */
export async function sbRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env missing');

  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[supabase] rpc/${fn}: ${res.status} — ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}
