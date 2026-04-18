import type * as SQLite from 'expo-sqlite';
import { supabase } from '@/lib/supabase/client';
import { SYNCED_TABLES } from '@/lib/db/schema';
import { logInfo, logWarn, logError } from '@/lib/log';

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------

export interface SyncStats {
  pulled: Record<string, number>;
  pushed: Record<string, { inserted: number; updated: number; failed: number }>;
  duration_ms: number;
}

interface SyncState {
  last_pull_at: string | null;
  last_push_at: string | null;
}

interface TableConfig {
  name: string;
  appendOnly: boolean;
  fkCols: ReadonlyArray<{ col: string; table: string }>;
}

// Colunas que nunca viajam pro servidor (local-only ou renomeadas).
const LOCAL_ONLY_COLS = new Set([
  'id', 'supabase_id', 'local_updated_at', 'pending_sync', 'sync_rev',
]);

// Colunas que o servidor tem mas o SQLite local não — precisamos ignorá-las
// ao inserir/atualizar localmente (senão "table X has no column named Y").
// client_id e created_by são convenções do schema Supabase; id/created_at/updated_at
// têm contraparte local (supabase_id/default local/local_updated_at).
const REMOTE_ONLY_COLS = new Set(['id', 'client_id', 'created_by', 'created_at', 'updated_at', 'deleted_at']);

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

async function getSyncState(db: SQLite.SQLiteDatabase): Promise<SyncState> {
  const row = await db.getFirstAsync<SyncState>('SELECT last_pull_at, last_push_at FROM sync_state WHERE id = 1');
  return row ?? { last_pull_at: null, last_push_at: null };
}

async function setPullAt(db: SQLite.SQLiteDatabase, iso: string) {
  await db.runAsync('UPDATE sync_state SET last_pull_at = ? WHERE id = 1', [iso]);
}

async function setPushAt(db: SQLite.SQLiteDatabase, iso: string) {
  await db.runAsync('UPDATE sync_state SET last_push_at = ? WHERE id = 1', [iso]);
}

/** Cache bidirecional (tabela, uuid) ↔ id local. Duas chaves distintas por
 *  direção — nunca colidem. Sob demanda. */
class IdMap {
  // Forward: "table:uuid" → local integer id. Reverse: "table:local:id" → uuid.
  private cache = new Map<string, number | string | null>();
  constructor(private db: SQLite.SQLiteDatabase) {}

  async localIdFor(table: string, supabaseUuid: string | null | undefined): Promise<number | null> {
    if (!supabaseUuid) return null;
    const key = `${table}:${supabaseUuid}`;
    if (this.cache.has(key)) return this.cache.get(key) as number | null;
    const row = await this.db.getFirstAsync<{ id: number }>(
      `SELECT id FROM ${table} WHERE supabase_id = ?`,
      [supabaseUuid]
    );
    const id = row?.id ?? null;
    this.cache.set(key, id);
    return id;
  }

  async supabaseIdFor(table: string, localId: number | null | undefined): Promise<string | null> {
    if (localId == null) return null;
    const key = `${table}:local:${localId}`;
    if (this.cache.has(key)) return this.cache.get(key) as string | null;
    const row = await this.db.getFirstAsync<{ supabase_id: string | null }>(
      `SELECT supabase_id FROM ${table} WHERE id = ?`,
      [localId]
    );
    const uuid = row?.supabase_id ?? null;
    this.cache.set(key, uuid);
    return uuid;
  }

  prime(table: string, supabaseUuid: string, localId: number) {
    this.cache.set(`${table}:${supabaseUuid}`, localId);
    this.cache.set(`${table}:local:${localId}`, supabaseUuid);
  }
}

/** Remove colunas local-only; normaliza JSON e booleans pra PostgreSQL. */
function toRemotePayload(row: any, fkMap: Record<string, string | null>) {
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (LOCAL_ONLY_COLS.has(k)) continue;
    if (k in fkMap) {
      out[k] = fkMap[k]; // UUID do remote
      continue;
    }
    // geometry local é TEXT JSON; remote é jsonb — passa como objeto
    if (k === 'geometry' && typeof v === 'string' && v) {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
      continue;
    }
    // SQLite 0/1 → boolean quando coluna é boolean no supabase
    // Deixamos ele como está; supabase-js aceita 0/1 como boolean na maioria dos casos.
    out[k] = v;
  }
  return out;
}

function toLocalValue(k: string, v: any): any {
  if (v == null) return null;
  if (k === 'geometry' && typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

/** Monta INSERT local a partir de um row do servidor (já com FKs resolvidas em localFks). */
async function localInsertFromRemote(
  db: SQLite.SQLiteDatabase,
  table: string,
  remoteRow: any,
  localFks: Record<string, number | null>,
  idMap: IdMap,
): Promise<number | null> {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(remoteRow)) {
    if (REMOTE_ONLY_COLS.has(k)) continue;
    if (k in localFks) {
      cols.push(k);
      vals.push(localFks[k]);
      continue;
    }
    cols.push(k);
    vals.push(toLocalValue(k, v));
  }
  // Sync metadata — sync_rev=1 sinaliza "veio do servidor" pro trigger não disparar
  cols.push('supabase_id', 'local_updated_at', 'deleted_at', 'pending_sync', 'sync_rev');
  vals.push(
    remoteRow.id,
    remoteRow.updated_at ?? new Date().toISOString(),
    remoteRow.deleted_at ?? null,
    0,
    1,
  );
  const placeholders = cols.map(() => '?').join(',');
  try {
    const result = await db.runAsync(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})`,
      vals
    );
    const localId = Number(result.lastInsertRowId);
    idMap.prime(table, remoteRow.id, localId);
    return localId;
  } catch (e) {
    console.warn(`[sync] insert ${table} falhou:`, (e as Error).message);
    return null;
  }
}

/** Atualiza linha local existente com dados do servidor. */
async function localUpdateFromRemote(
  db: SQLite.SQLiteDatabase,
  table: string,
  localId: number,
  remoteRow: any,
  localFks: Record<string, number | null>,
) {
  const sets: string[] = [];
  const vals: any[] = [];
  // Propaga deleted_at localmente (diferente do insert, que já o seta via metadata de sync).
  const updateSkip = new Set(['id', 'client_id', 'created_by', 'created_at', 'updated_at']);
  for (const [k, v] of Object.entries(remoteRow)) {
    if (updateSkip.has(k)) continue;
    if (k in localFks) {
      sets.push(`${k} = ?`);
      vals.push(localFks[k]);
      continue;
    }
    sets.push(`${k} = ?`);
    vals.push(toLocalValue(k, v));
  }
  // sync_rev incrementa pra trigger saber que é escrita de sync (não local)
  sets.push(`local_updated_at = ?`, `pending_sync = ?`, `sync_rev = sync_rev + 1`);
  vals.push(remoteRow.updated_at ?? new Date().toISOString(), 0);
  vals.push(localId);
  await db.runAsync(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, vals);
}

// ---------------------------------------------------------------------
// Pull (delta)
// ---------------------------------------------------------------------

async function pullOne(
  db: SQLite.SQLiteDatabase,
  table: TableConfig,
  sinceIso: string | null,
  idMap: IdMap,
): Promise<number> {
  const query = supabase.from(table.name).select('*');
  // Filtro incremental por updated_at. Primeira vez (null) traz tudo.
  const q = sinceIso ? query.gt('updated_at', sinceIso) : query;
  const { data, error } = await q.order('updated_at', { ascending: true });
  if (error) {
    throw new Error(`pull ${table.name}: ${error.message}`);
  }
  if (!data || data.length === 0) return 0;

  for (const remote of data) {
    // Resolve FKs: UUIDs remotos → IDs integer locais
    const localFks: Record<string, number | null> = {};
    for (const fk of table.fkCols) {
      localFks[fk.col] = await idMap.localIdFor(fk.table, remote[fk.col]);
    }
    // Upsert: verifica se já existe localmente via supabase_id
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM ${table.name} WHERE supabase_id = ?`,
      [remote.id]
    );
    if (existing) {
      await localUpdateFromRemote(db, table.name, existing.id, remote, localFks);
      idMap.prime(table.name, remote.id, existing.id);
    } else {
      await localInsertFromRemote(db, table.name, remote, localFks, idMap);
    }
  }
  return data.length;
}

export async function pullDelta(db: SQLite.SQLiteDatabase): Promise<Record<string, number>> {
  const state = await getSyncState(db);
  const since = state.last_pull_at;
  const idMap = new IdMap(db);
  const counts: Record<string, number> = {};
  // Desliga FKs durante pull — ordem importa e pode vir coisa fora de ordem.
  await db.execAsync('PRAGMA foreign_keys = OFF');
  let maxUpdatedAt = since;
  let hadError = false;
  try {
    for (const t of SYNCED_TABLES) {
      try {
        const res = await pullOneWithMax(db, t as TableConfig, since, idMap);
        counts[t.name] = res.count;
        if (res.maxUpdatedAt && (!maxUpdatedAt || res.maxUpdatedAt > maxUpdatedAt)) {
          maxUpdatedAt = res.maxUpdatedAt;
        }
      } catch (e) {
        hadError = true;
        console.warn(`[sync] pull ${t.name} exception:`, (e as Error).message);
        counts[t.name] = -1;
      }
    }
    // Só avança last_pull_at se algo novo chegou E não houve exceção —
    // evita "pular" linhas que falharam na inserção.
    if (!hadError && maxUpdatedAt && maxUpdatedAt !== since) {
      await setPullAt(db, maxUpdatedAt);
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  return counts;
}

async function pullOneWithMax(
  db: SQLite.SQLiteDatabase,
  table: TableConfig,
  sinceIso: string | null,
  idMap: IdMap,
): Promise<{ count: number; maxUpdatedAt: string | null }> {
  const query = supabase.from(table.name).select('*');
  const q = sinceIso ? query.gt('updated_at', sinceIso) : query;
  const { data, error } = await q.order('updated_at', { ascending: true });
  if (error) throw new Error(`pull ${table.name}: ${error.message}`);
  if (!data || data.length === 0) return { count: 0, maxUpdatedAt: null };

  let maxTs: string | null = null;
  for (const remote of data) {
    const localFks: Record<string, number | null> = {};
    for (const fk of table.fkCols) {
      localFks[fk.col] = await idMap.localIdFor(fk.table, remote[fk.col]);
    }
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM ${table.name} WHERE supabase_id = ?`,
      [remote.id]
    );
    if (existing) {
      await localUpdateFromRemote(db, table.name, existing.id, remote, localFks);
      idMap.prime(table.name, remote.id, existing.id);
    } else {
      await localInsertFromRemote(db, table.name, remote, localFks, idMap);
    }
    if (remote.updated_at && (!maxTs || remote.updated_at > maxTs)) {
      maxTs = remote.updated_at;
    }
  }
  return { count: data.length, maxUpdatedAt: maxTs };
}

// ---------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------

/**
 * Quando um insert falha com UNIQUE violation, tenta reconciliar com o servidor:
 * - Tabelas com name UNIQUE (grass_types, formulas): deleta órfão local, pull traz.
 * - herd pool (paddock_id IS NULL + category único): funde head_counts no servidor,
 *   deleta órfão local.
 * - herd alocado (paddock_id + category único): mesmo tratamento do pool mas pra paddock.
 */
async function tryHealOrphan(
  db: SQLite.SQLiteDatabase,
  table: TableConfig,
  localRow: any,
): Promise<boolean> {
  // name UNIQUE no Supabase
  if (['grass_types', 'formulas'].includes(table.name) && localRow.name) {
    const { data } = await supabase
      .from(table.name)
      .select('id')
      .eq('name', localRow.name)
      .maybeSingle();
    if (data) {
      await db.runAsync(`DELETE FROM ${table.name} WHERE id = ?`, [localRow.id]);
      await db.runAsync('UPDATE sync_state SET last_pull_at = NULL WHERE id = 1');
      logInfo('sync', 'orphan_removed', { table: table.name, localId: localRow.id, name: localRow.name });
      return true;
    }
    return false;
  }

  // herd: UNIQUE (paddock_id, category) quando alocado; UNIQUE (category) no pool
  if (table.name === 'herd' && localRow.category) {
    const remotePaddockId = localRow.paddock_id
      ? await new IdMap(db).supabaseIdFor('paddocks', localRow.paddock_id)
      : null;
    // Busca a linha conflitante no servidor
    let query = supabase.from('herd').select('id, head_count').eq('category', localRow.category).is('deleted_at', null);
    query = remotePaddockId ? query.eq('paddock_id', remotePaddockId) : query.is('paddock_id', null);
    const { data } = await query.maybeSingle();
    if (data) {
      // Merge: soma head_count local no remoto, depois deleta local.
      const newCount = Number(data.head_count) + Number(localRow.head_count);
      const { error: upErr } = await supabase
        .from('herd')
        .update({ head_count: newCount })
        .eq('id', data.id);
      if (upErr) {
        logWarn('sync', 'heal_herd_merge_failed', { error: upErr.message });
        return false;
      }
      await db.runAsync('DELETE FROM herd WHERE id = ?', [localRow.id]);
      await db.runAsync('UPDATE sync_state SET last_pull_at = NULL WHERE id = 1');
      logInfo('sync', 'heal_herd_merged', {
        localId: localRow.id, remoteId: data.id,
        category: localRow.category, paddock: remotePaddockId ?? 'pool',
        addedCount: localRow.head_count, newTotal: newCount,
      });
      return true;
    }
  }

  return false;
}

async function pushOne(
  db: SQLite.SQLiteDatabase,
  table: TableConfig,
  idMap: IdMap,
): Promise<{ inserted: number; updated: number; failed: number }> {
  const stats = { inserted: 0, updated: 0, failed: 0 };
  const pending = await db.getAllAsync<any>(
    `SELECT * FROM ${table.name} WHERE pending_sync = 1`
  );
  for (const row of pending) {
    // Resolver FKs: IDs locais → UUIDs remotos
    const fkMap: Record<string, string | null> = {};
    let fkMissing = false;
    for (const fk of table.fkCols) {
      const uuid = await idMap.supabaseIdFor(fk.table, row[fk.col]);
      if (row[fk.col] != null && !uuid) {
        fkMissing = true;
        break;
      }
      fkMap[fk.col] = uuid;
    }
    if (fkMissing) {
      // Referência ainda não sincronizada — tenta no próximo ciclo.
      console.warn(`[sync] ${table.name} #${row.id}: FK ainda não sincronizada, adiando`);
      continue;
    }
    const payload = toRemotePayload(row, fkMap);
    try {
      if (row.supabase_id && !table.appendOnly) {
        // Update no servidor
        const { data, error } = await supabase
          .from(table.name)
          .update(payload)
          .eq('id', row.supabase_id)
          .select('id, updated_at')
          .maybeSingle();
        if (error) {
          stats.failed++;
          logWarn('sync', 'push_update_failed', { table: table.name, localId: row.id, error: error.message });
          continue;
        }
        await db.runAsync(
          `UPDATE ${table.name} SET pending_sync = 0, local_updated_at = ?, sync_rev = sync_rev + 1 WHERE id = ?`,
          [data?.updated_at ?? new Date().toISOString(), row.id]
        );
        stats.updated++;
      } else {
        // Insert (ou upsert se append-only com supabase_id — raro)
        const { data, error } = await supabase
          .from(table.name)
          .insert(payload)
          .select('id, updated_at')
          .single();
        if (error) {
          // UNIQUE violation = linha órfã local duplicando uma do servidor
          const isDup = error.code === '23505' || /duplicate key/i.test(error.message);
          if (isDup) {
            const healed = await tryHealOrphan(db, table, row);
            if (healed) {
              stats.updated++;
              continue;
            }
          }
          stats.failed++;
          logWarn('sync', 'push_insert_failed', { table: table.name, localId: row.id, error: error.message });
          continue;
        }
        await db.runAsync(
          `UPDATE ${table.name} SET supabase_id = ?, pending_sync = 0, local_updated_at = ?, sync_rev = sync_rev + 1 WHERE id = ?`,
          [data.id, data.updated_at ?? new Date().toISOString(), row.id]
        );
        idMap.prime(table.name, data.id, row.id);
        stats.inserted++;
      }
    } catch (e) {
      stats.failed++;
      console.warn(`[sync] exception ${table.name} #${row.id}:`, (e as Error).message);
    }
  }
  return stats;
}

export async function pushPending(
  db: SQLite.SQLiteDatabase,
): Promise<Record<string, { inserted: number; updated: number; failed: number }>> {
  const idMap = new IdMap(db);
  const out: Record<string, { inserted: number; updated: number; failed: number }> = {};
  for (const t of SYNCED_TABLES) {
    out[t.name] = await pushOne(db, t as TableConfig, idMap);
  }
  await setPushAt(db, new Date().toISOString());
  return out;
}

// ---------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------

/**
 * Executa ciclo completo: push local → pull delta.
 * Push primeiro pra garantir que o servidor tem tudo antes do delta chegar.
 */
export async function syncAll(db: SQLite.SQLiteDatabase): Promise<SyncStats> {
  const t0 = Date.now();
  let pushed, pulled;
  try {
    pushed = await pushPending(db);
    pulled = await pullDelta(db);
  } catch (e: any) {
    logError('sync', 'sync_failed', { error: e?.message });
    throw e;
  }
  const duration_ms = Date.now() - t0;
  // Só loga se teve atividade significativa
  const totalPushed = Object.values(pushed).reduce((s, v) => s + v.inserted + v.updated + v.failed, 0);
  const totalPulled = Object.values(pulled).reduce((s: number, v: number) => s + (v > 0 ? v : 0), 0);
  if (totalPushed > 0 || totalPulled > 0) {
    const pushedSummary = Object.entries(pushed)
      .filter(([, v]) => v.inserted || v.updated || v.failed)
      .reduce((o, [k, v]) => ({ ...o, [k]: v }), {});
    const pulledSummary = Object.entries(pulled)
      .filter(([, v]) => v > 0)
      .reduce((o, [k, v]) => ({ ...o, [k]: v }), {});
    logInfo('sync', 'sync_cycle', { pushed: pushedSummary, pulled: pulledSummary, duration_ms });
  }
  return { pushed, pulled, duration_ms };
}

// Tabelas "derivadas" de uma ação do usuário — eventos/ledger/sub-steps.
// Excluídas do contador visível porque o usuário enxerga 1 ação (ex: entrada de estoque),
// mas ela gera N rows (inventory + inventory_events). Contar todos confunde.
const DERIVED_TABLES = new Set([
  'herd_events',
  'inventory_events',
  'supplement_evals',
  'bombona_evals',
  'forage_evals',
  'water_evals',
  'health_evals',
  'fence_evals',
  'visual_weight_evals',
  'washing_evals',
  'resupply_loads',
  'resupply_deliveries',
]);

export async function getSyncStatus(db: SQLite.SQLiteDatabase): Promise<SyncState & { pending: number; pendingDerived: number }> {
  const state = await getSyncState(db);
  let pending = 0;
  let pendingDerived = 0;
  for (const t of SYNCED_TABLES) {
    const row = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM ${t.name} WHERE pending_sync = 1`
    );
    const n = row?.n ?? 0;
    if (DERIVED_TABLES.has(t.name)) pendingDerived += n;
    else pending += n;
  }
  return { ...state, pending, pendingDerived };
}
