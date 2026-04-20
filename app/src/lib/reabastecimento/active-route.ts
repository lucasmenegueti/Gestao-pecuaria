import type { SQLiteDatabase } from 'expo-sqlite';

// Uma rota ativa é a fonte da verdade dos sacos "no trator". Enquanto o status
// for 'in_progress', os sacos (sacks_loaded - sacks_distributed) estão
// contabilizados como em trânsito — não voltam ao central nem aparecem em
// bombonas. A rota só fecha com 'completed' (resumo finaliza) ou 'cancelled'
// (devolução integral em qualquer momento).

export interface ActiveRouteItem {
  formula_id: number;
  formula_name: string;
  remaining: number;
}

export interface ActiveRoute {
  id: number;
  start_time: string;
  total_remaining: number;
  items: ActiveRouteItem[];
}

export async function getActiveRoute(db: SQLiteDatabase): Promise<ActiveRoute | null> {
  const route = await db.getFirstAsync<{ id: number; start_time: string }>(
    `SELECT id, start_time FROM resupply_routes
     WHERE status = 'in_progress'
     ORDER BY start_time DESC LIMIT 1`
  );
  if (!route) return null;

  const items = await db.getAllAsync<ActiveRouteItem>(
    `SELECT rl.formula_id, f.name AS formula_name,
       (rl.sacks_loaded - rl.sacks_distributed) AS remaining
     FROM resupply_loads rl JOIN formulas f ON f.id = rl.formula_id
     WHERE rl.route_id = ? AND (rl.sacks_loaded - rl.sacks_distributed) > 0
     ORDER BY f.name`,
    [route.id]
  );

  return {
    id: route.id,
    start_time: route.start_time,
    total_remaining: items.reduce((s, i) => s + i.remaining, 0),
    items,
  };
}

// Totais "no trator" por fórmula, somados por qualquer rota 'in_progress'.
// Usado na aba Central do estoque pra fechar a conta: central + trator + bombona.
export interface InTransitTotal {
  formula_id: number;
  formula_name: string;
  total: number;
}

export async function getInTransitTotals(db: SQLiteDatabase): Promise<InTransitTotal[]> {
  return db.getAllAsync<InTransitTotal>(
    `SELECT rl.formula_id, f.name AS formula_name,
       SUM(rl.sacks_loaded - rl.sacks_distributed) AS total
     FROM resupply_loads rl
     JOIN resupply_routes rr ON rr.id = rl.route_id
     JOIN formulas f ON f.id = rl.formula_id
     WHERE rr.status = 'in_progress'
     GROUP BY rl.formula_id
     HAVING SUM(rl.sacks_loaded - rl.sacks_distributed) > 0
     ORDER BY f.name`
  );
}

// Cancela a rota e devolve todo o restante ao central. Idempotente via
// status='cancelled' (se chamada 2x, a segunda encontra nada pra devolver).
export async function cancelActiveRoute(
  db: SQLiteDatabase,
  routeId: number,
  userId: string | null
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const loads = await db.getAllAsync<{ formula_id: number; remaining: number }>(
      `SELECT formula_id, (sacks_loaded - sacks_distributed) AS remaining
       FROM resupply_loads
       WHERE route_id = ? AND (sacks_loaded - sacks_distributed) > 0`,
      [routeId]
    );
    for (const l of loads) {
      await db.runAsync(
        `UPDATE inventory SET quantity_sacks = quantity_sacks + ?
         WHERE formula_id = ? AND location = 'central'`,
        [l.remaining, l.formula_id]
      );
      await db.runAsync(
        `INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id)
         VALUES ('CANCELAMENTO_ROTA', ?, NULL, ?, ?, ?)`,
        [l.formula_id, l.remaining, `Cancelamento rota #${routeId}`, userId]
      );
      await db.runAsync(
        `UPDATE resupply_loads SET sacks_returned = ?
         WHERE route_id = ? AND formula_id = ?`,
        [l.remaining, routeId, l.formula_id]
      );
    }
    await db.runAsync(
      `UPDATE resupply_routes SET status = 'cancelled', end_time = datetime('now','localtime')
       WHERE id = ?`,
      [routeId]
    );
  });
}
