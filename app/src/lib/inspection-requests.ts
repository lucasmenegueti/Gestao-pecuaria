import type * as SQLite from 'expo-sqlite';

// Tipos canônicos das inspeções "sob demanda" que admin pode delegar.
// Mesmas keys usadas no menu de avaliação do piquete (EVAL_ITEMS.evalKind).
export const EVAL_KINDS = [
  'bombona',
  'forragem',
  'biologico',
  'sanidade',
  'peso_visual',
  'lavagem',
] as const;
export type EvalKind = (typeof EVAL_KINDS)[number];

export const EVAL_KIND_LABELS: Record<EvalKind, string> = {
  bombona: 'Bombona',
  forragem: 'Forragem',
  biologico: 'Biológico',
  sanidade: 'Sanidade',
  peso_visual: 'Peso visual',
  lavagem: 'Lavagem',
};

export interface InspectionRequest {
  id: number;
  paddock_id: number;
  paddock_name: string;
  eval_kind: EvalKind;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
}

/** Lista solicitações pendentes agrupadas por piquete (mais recentes primeiro). */
export async function listPendingRequests(db: SQLite.SQLiteDatabase): Promise<InspectionRequest[]> {
  return db.getAllAsync<InspectionRequest>(
    `SELECT ir.id, ir.paddock_id, p.name as paddock_name, ir.eval_kind, ir.notes,
            ir.status, ir.created_at, ir.completed_at
     FROM inspection_requests ir
     JOIN paddocks p ON p.id = ir.paddock_id
     WHERE ir.status = 'pending' AND ir.deleted_at IS NULL
     ORDER BY ir.created_at DESC`
  );
}

/** Conta solicitações pendentes (uso no Painel). */
export async function countPendingRequests(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM inspection_requests
     WHERE status = 'pending' AND deleted_at IS NULL`
  );
  return row?.n ?? 0;
}

/** Lista as N solicitações pendentes mais antigas (top da fila no Painel). */
export async function listPendingTop(db: SQLite.SQLiteDatabase, limit = 5): Promise<InspectionRequest[]> {
  return db.getAllAsync<InspectionRequest>(
    `SELECT ir.id, ir.paddock_id, p.name as paddock_name, ir.eval_kind, ir.notes,
            ir.status, ir.created_at, ir.completed_at
     FROM inspection_requests ir
     JOIN paddocks p ON p.id = ir.paddock_id
     WHERE ir.status = 'pending' AND ir.deleted_at IS NULL
     ORDER BY ir.created_at ASC
     LIMIT ?`,
    [limit]
  );
}

/** Cria uma solicitação por par (piquete, kind). Idempotente: se já existe pending, ignora. */
export async function createRequest(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
  evalKind: EvalKind,
  requestedBy: string,
  notes: string | null
): Promise<void> {
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM inspection_requests
     WHERE paddock_id = ? AND eval_kind = ? AND status = 'pending' AND deleted_at IS NULL`,
    [paddockId, evalKind]
  );
  if (existing) return;
  await db.runAsync(
    `INSERT INTO inspection_requests (paddock_id, eval_kind, requested_by, notes, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [paddockId, evalKind, requestedBy, notes]
  );
}

/** Cancela (soft-cancel via status). Não deleta a row pra preservar histórico. */
export async function cancelRequest(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    `UPDATE inspection_requests SET status = 'cancelled' WHERE id = ?`,
    [id]
  );
}

/** Auto-completa solicitações pendentes para (piquete, kind). Chamado nas summaries
 *  das inspeções sob demanda quando o peão termina a avaliação. */
export async function completeRequestFor(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
  evalKind: EvalKind,
  completedBy: string
): Promise<void> {
  await db.runAsync(
    `UPDATE inspection_requests
     SET status = 'completed', completed_at = datetime('now','localtime'), completed_by = ?
     WHERE paddock_id = ? AND eval_kind = ? AND status = 'pending' AND deleted_at IS NULL`,
    [completedBy, paddockId, evalKind]
  );
}

/** Lista piquetes com gado, ordenados por nome — usado no picker da tela admin. */
export async function listPaddocksForPicker(db: SQLite.SQLiteDatabase): Promise<Array<{ id: number; name: string }>> {
  return db.getAllAsync<{ id: number; name: string }>(
    `SELECT DISTINCT p.id, p.name FROM paddocks p
     JOIN herd h ON h.paddock_id = p.id
     WHERE p.active = 1 AND h.head_count > 0
     ORDER BY p.name`
  );
}
