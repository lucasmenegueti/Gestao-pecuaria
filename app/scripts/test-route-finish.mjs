// Reproduz localmente handleFinish do resumo.tsx e cancelActiveRoute,
// usa SQLite real, testa TODOS os cenários (routeId válido, NaN, vazio, etc).

import Database from 'better-sqlite3';

const db = new Database(':memory:');

// Schema mínimo que o test cobre
db.exec(`
CREATE TABLE formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formula_id INTEGER,
  paddock_id INTEGER,
  location TEXT,
  quantity_sacks REAL
);
CREATE TABLE inventory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  formula_id INTEGER,
  paddock_id INTEGER,
  sacks_delta REAL,
  reason TEXT,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE resupply_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  start_time TEXT DEFAULT (datetime('now','localtime')),
  end_time TEXT,
  status TEXT DEFAULT 'in_progress'
);
CREATE TABLE resupply_loads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER,
  formula_id INTEGER,
  sacks_loaded REAL,
  sacks_distributed REAL DEFAULT 0,
  sacks_returned REAL
);

INSERT INTO formulas (id, name) VALUES (1, 'Mineral A'), (2, 'Mineral B');
INSERT INTO inventory (formula_id, location, quantity_sacks) VALUES (1, 'central', 50), (2, 'central', 30);
`);

function currentState(label) {
  const r = db.prepare('SELECT id, status FROM resupply_routes ORDER BY id').all();
  const loads = db.prepare('SELECT route_id, formula_id, sacks_loaded, sacks_distributed, sacks_returned FROM resupply_loads').all();
  const inv = db.prepare("SELECT formula_id, quantity_sacks FROM inventory WHERE location='central'").all();
  console.log(`\n  [${label}]`);
  console.log(`    routes:  ${JSON.stringify(r)}`);
  console.log(`    loads:   ${JSON.stringify(loads)}`);
  console.log(`    inv:     ${JSON.stringify(inv)}`);
}

// Emula handleFinish do resumo.tsx
function handleFinish(routeId) {
  const tx = db.transaction(() => {
    const loads = db.prepare(`
      SELECT rl.formula_id, f.name, rl.sacks_loaded, rl.sacks_distributed
      FROM resupply_loads rl JOIN formulas f ON f.id=rl.formula_id
      WHERE rl.route_id=?
    `).all(Number(routeId));

    const loadInfos = loads.map(r => ({
      formula_id: r.formula_id, loaded: r.sacks_loaded, distributed: r.sacks_distributed,
      returned: r.sacks_loaded - r.sacks_distributed,
    }));

    for (const load of loadInfos) {
      if (load.returned > 0) {
        db.prepare(`UPDATE inventory SET quantity_sacks = quantity_sacks + ? WHERE formula_id = ? AND location='central'`)
          .run(load.returned, load.formula_id);
        db.prepare(`INSERT INTO inventory_events (event_type, formula_id, paddock_id, sacks_delta, reason, user_id) VALUES ('RETORNO_CENTRAL_ROTA', ?, NULL, ?, ?, ?)`)
          .run(load.formula_id, load.returned, `Retorno rota #${routeId}`, 'user-test');
      }
      db.prepare(`UPDATE resupply_loads SET sacks_returned=? WHERE route_id=? AND formula_id=?`)
        .run(load.returned, Number(routeId), load.formula_id);
    }
    const result = db.prepare(`UPDATE resupply_routes SET status='completed', end_time=datetime('now','localtime') WHERE id=?`)
      .run(Number(routeId));
    return { rowsAffected: result.changes, loadsFound: loadInfos.length };
  });
  return tx();
}

// === Cenário A: rota válida, routeId=1, com loads ===
console.log('=== Cenário A: routeId correto ===');
db.exec(`
  DELETE FROM resupply_routes; DELETE FROM resupply_loads;
  INSERT INTO resupply_routes (id, status) VALUES (1, 'in_progress');
  INSERT INTO resupply_loads (route_id, formula_id, sacks_loaded, sacks_distributed) VALUES (1, 1, 10, 7);
`);
currentState('antes');
const rA = handleFinish(1);
console.log(`  handleFinish(1) → ${JSON.stringify(rA)}`);
currentState('depois');
const statusA = db.prepare('SELECT status FROM resupply_routes WHERE id=1').get();
console.log(`  ${statusA.status === 'completed' ? '✅ Rota fechou' : '❌ Rota NÃO fechou'}`);

// === Cenário B: routeId = undefined (string 'undefined' na URL) ===
console.log('\n=== Cenário B: routeId="undefined" (simula URL quebrada) ===');
db.exec(`
  DELETE FROM resupply_routes; DELETE FROM resupply_loads;
  INSERT INTO resupply_routes (id, status) VALUES (99, 'in_progress');
  INSERT INTO resupply_loads (route_id, formula_id, sacks_loaded, sacks_distributed) VALUES (99, 1, 10, 7);
`);
currentState('antes');
try {
  const rB = handleFinish('undefined');
  console.log(`  handleFinish("undefined") → ${JSON.stringify(rB)}`);
} catch (e) { console.log(`  THREW: ${e.message}`); }
currentState('depois');
const statusB = db.prepare('SELECT status FROM resupply_routes WHERE id=99').get();
console.log(`  Rota 99 status: ${statusB.status}`);
if (statusB.status === 'in_progress') console.log('  🐛 BUG CONFIRMADO: rota permanece in_progress quando routeId inválido');

// === Cenário C: routeId = '' (string vazia) ===
console.log('\n=== Cenário C: routeId="" (param ausente) ===');
db.exec(`
  DELETE FROM resupply_routes; DELETE FROM resupply_loads;
  INSERT INTO resupply_routes (id, status) VALUES (42, 'in_progress');
  INSERT INTO resupply_loads (route_id, formula_id, sacks_loaded, sacks_distributed) VALUES (42, 1, 10, 7);
`);
try {
  const rC = handleFinish('');
  console.log(`  handleFinish("") → ${JSON.stringify(rC)}`);
} catch (e) { console.log(`  THREW: ${e.message}`); }
const statusC = db.prepare('SELECT status FROM resupply_routes WHERE id=42').get();
console.log(`  Rota 42 status: ${statusC.status}`);
if (statusC.status === 'in_progress') console.log('  🐛 BUG: handleFinish("") não falha mas também não cancela a rota');

// === Cenário D: rota com loads vazios (tudo zerado) ===
console.log('\n=== Cenário D: rota sem loads ===');
db.exec(`
  DELETE FROM resupply_routes; DELETE FROM resupply_loads;
  INSERT INTO resupply_routes (id, status) VALUES (5, 'in_progress');
`);
const rD = handleFinish(5);
console.log(`  handleFinish(5) sem loads → ${JSON.stringify(rD)}`);
const statusD = db.prepare('SELECT status FROM resupply_routes WHERE id=5').get();
console.log(`  Rota 5 status: ${statusD.status}`);
console.log(statusD.status === 'completed' ? '  ✅ Rota fecha mesmo sem loads' : '  ❌ Rota não fechou');

// === Cenário E: duas rotas in_progress ao mesmo tempo (teoricamente impossível, mas...) ===
console.log('\n=== Cenário E: múltiplas rotas in_progress ===');
db.exec(`
  DELETE FROM resupply_routes; DELETE FROM resupply_loads;
  INSERT INTO resupply_routes (id, status) VALUES (100, 'in_progress'), (101, 'in_progress');
`);
const rE = handleFinish(100);
console.log(`  handleFinish(100) → ${JSON.stringify(rE)}`);
const activeE = db.prepare("SELECT id, status FROM resupply_routes WHERE status='in_progress'").all();
console.log(`  Rotas in_progress depois: ${JSON.stringify(activeE)}`);

console.log('\n=== Resumo ===');
console.log('Se cenário B ou C mostrar 🐛 BUG, é porque routeId chegou quebrado no resumo.tsx');
console.log('handleFinish não tem guard contra routeId inválido — UPDATE silencioso que não afeta nada.');
