// Valida cancelStaleRoutes: cancela todas exceto a mais recente, devolve
// remaining ao central.
import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.exec(`
CREATE TABLE formulas (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, formula_id INTEGER, location TEXT, quantity_sacks REAL);
CREATE TABLE inventory_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, formula_id INTEGER, paddock_id INTEGER, sacks_delta REAL, reason TEXT, user_id TEXT, created_at TEXT DEFAULT (datetime('now','localtime')));
CREATE TABLE resupply_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, start_time TEXT, end_time TEXT, status TEXT);
CREATE TABLE resupply_loads (id INTEGER PRIMARY KEY AUTOINCREMENT, route_id INTEGER, formula_id INTEGER, sacks_loaded REAL, sacks_distributed REAL, sacks_returned REAL);
INSERT INTO formulas (id, name) VALUES (1, 'Mineral A'), (2, 'Mineral B');
INSERT INTO inventory (formula_id, location, quantity_sacks) VALUES (1, 'central', 0), (2, 'central', 0);

-- 10 rotas in_progress como o user tem, em ordem cronológica
INSERT INTO resupply_routes (id, start_time, status) VALUES
  (1, '2026-04-17T20:55:20', 'in_progress'),
  (2, '2026-04-18T19:43:30', 'in_progress'),
  (3, '2026-04-18T19:56:13', 'in_progress'),
  (4, '2026-04-18T20:26:31', 'in_progress'),
  (5, '2026-04-19T11:53:52', 'in_progress'),
  (6, '2026-04-19T11:55:14', 'in_progress'),
  (7, '2026-04-19T18:08:08', 'in_progress'),
  (8, '2026-04-20T22:39:29', 'in_progress'),
  (9, '2026-04-20T23:40:42', 'in_progress'),
  (10, '2026-04-21T05:34:44', 'in_progress');

-- loads: rota 1 carregou 10 (distribuiu 3 → sobram 7); rota 10 carregou 20 (distribuiu 5 → sobram 15)
INSERT INTO resupply_loads (route_id, formula_id, sacks_loaded, sacks_distributed) VALUES
  (1, 1, 10, 3),
  (2, 1, 8, 8),
  (3, 2, 6, 2),
  (10, 1, 20, 5);
`);

function countByStatus() {
  return db.prepare(`SELECT status, COUNT(*) as n FROM resupply_routes GROUP BY status`).all();
}
function invCentral() {
  return db.prepare(`SELECT formula_id, quantity_sacks FROM inventory WHERE location='central'`).all();
}

console.log('=== ESTADO INICIAL ===');
console.log('  status:', JSON.stringify(countByStatus()));
console.log('  inv:', JSON.stringify(invCentral()));

// === emula cancelStaleRoutes ===
function cancelStaleRoutes(userId) {
  const stale = db.prepare(`
    SELECT id FROM resupply_routes
    WHERE status = 'in_progress'
      AND id NOT IN (
        SELECT id FROM resupply_routes
        WHERE status = 'in_progress'
        ORDER BY start_time DESC LIMIT 1
      )
  `).all();
  if (stale.length === 0) return { cancelled: 0, returnedToStock: 0 };
  let totalReturned = 0;
  const tx = db.transaction(() => {
    for (const r of stale) {
      const loads = db.prepare(`
        SELECT formula_id, (sacks_loaded - sacks_distributed) AS remaining
        FROM resupply_loads
        WHERE route_id = ? AND (sacks_loaded - sacks_distributed) > 0
      `).all(r.id);
      for (const l of loads) {
        db.prepare(`UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE formula_id = ? AND location = 'central'`)
          .run(l.remaining, l.formula_id);
        db.prepare(`INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id) VALUES ('CANCELAMENTO_ROTA', ?, NULL, ?, ?, ?)`)
          .run(l.formula_id, l.remaining, `Limpeza rota antiga #${r.id}`, userId);
        db.prepare(`UPDATE resupply_loads SET sacks_returned = ? WHERE route_id = ? AND formula_id = ?`)
          .run(l.remaining, r.id, l.formula_id);
        totalReturned += l.remaining;
      }
      db.prepare(`UPDATE resupply_routes SET status = 'cancelled', end_time = datetime('now','localtime') WHERE id = ?`)
        .run(r.id);
    }
  });
  tx();
  return { cancelled: stale.length, returnedToStock: totalReturned };
}

const r = cancelStaleRoutes('user-test');
console.log(`\n→ cancelStaleRoutes:`, JSON.stringify(r));

console.log('\n=== ESTADO FINAL ===');
console.log('  status:', JSON.stringify(countByStatus()));
console.log('  inv:', JSON.stringify(invCentral()));

const stillActive = db.prepare(`SELECT id, start_time FROM resupply_routes WHERE status='in_progress'`).all();
console.log('  ainda in_progress:', JSON.stringify(stillActive));

const events = db.prepare(`SELECT event_type, formula_id, sacks_delta, reason FROM inventory_events`).all();
console.log('  eventos criados:', events.length);

// Validações
const checks = [
  { name: 'cancelou 9 rotas (10-1)', pass: r.cancelled === 9 },
  { name: 'devolveu 7 ao central (rota 1 tinha remaining=7)', pass: r.returnedToStock === 7 + 4 /* rota 3 tinha 6-2=4 */ },
  { name: 'rota 10 (mais recente) permanece in_progress', pass: stillActive.length === 1 && stillActive[0].id === 10 },
  { name: 'inventory fórmula 1 = 7 (devolveu da rota 1)', pass: invCentral().find(r => r.formula_id === 1)?.quantity_sacks === 7 },
  { name: 'inventory fórmula 2 = 4 (devolveu da rota 3)', pass: invCentral().find(r => r.formula_id === 2)?.quantity_sacks === 4 },
  { name: 'eventos criados = 2 (rota 1 e rota 3, não cria pra rotas sem remaining)', pass: events.length === 2 },
];

console.log('\n=== VALIDAÇÕES ===');
for (const c of checks) console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}`);
const allPass = checks.every(c => c.pass);
console.log(`\n${allPass ? '✅ TODOS OS TESTES PASSARAM' : '❌ HOUVE REGRESSÃO'}`);

// 2ª execução: idempotente
const r2 = cancelStaleRoutes('user-test');
console.log(`\n=== 2ª execução (deve ser no-op) ===`);
console.log(`→ ${JSON.stringify(r2)} ${r2.cancelled === 0 ? '✅ idempotente' : '❌ não-idempotente'}`);
