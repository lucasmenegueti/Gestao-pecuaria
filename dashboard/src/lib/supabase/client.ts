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
  offset?: number;
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
  if (params.offset) search.set('offset', String(params.offset));
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

/**
 * Igual ao `sbList`, mas pagina até acabar. Use quando o resultado pode passar
 * do teto de linhas do PostgREST — truncamento ali é silencioso.
 */
export async function sbListAll<T>(
  table: string,
  params: Omit<QueryParams, 'limit' | 'offset'> = {},
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await sbList<T>(table, { ...params, limit: pageSize, offset });
    out.push(...page);
    if (page.length < pageSize) return out;
  }
}

/**
 * Upsert numa tabela via PostgREST, resolvendo conflito pela coluna indicada.
 * Escreve com o JWT do usuário logado — RLS decide se pode.
 */
export async function sbUpsert(
  table: string,
  rows: Array<Record<string, unknown>>,
  opts: { onConflict: string; accessToken?: string },
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env missing');
  if (rows.length === 0) return;

  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(opts.onConflict)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: authHeader(opts.accessToken),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[supabase] upsert ${table}: ${res.status} — ${body.slice(0, 200)}`);
  }
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
