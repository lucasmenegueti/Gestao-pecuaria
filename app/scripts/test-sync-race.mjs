// Modelo da corrida do push append-only (v0.13.1) — reproduz a LÓGICA do engine,
// não o engine: dois ciclos concorrentes sobre o mesmo snapshot de pending.
// Antigo: UUID cunhado a partir do snapshot → pares no servidor. Novo: claim
// atômico (AND supabase_id IS NULL) + releitura → um row por linha local.
// Uso: node app/scripts/test-sync-race.mjs  (Node 22+, node:sqlite)
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
const tick = () => new Promise(r => setTimeout(r, Math.random() * 5));
function setup() {
  const d = new DatabaseSync(':memory:');
  d.exec('CREATE TABLE herd_events (id INTEGER PRIMARY KEY, supabase_id TEXT, pending_sync INT)');
  for (let i = 0; i < 4; i++) d.exec('INSERT INTO herd_events (pending_sync) VALUES (1)');
  // engine usa API async do expo-sqlite: cada chamada é um ponto de interleave
  return {
    runAsync: async (q, p) => { await tick(); d.prepare(q).run(...p); },
    getFirstAsync: async (q, p) => { await tick(); return d.prepare(q).get(...p); },
    getAllAsync: async (q) => { await tick(); return d.prepare(q).all(); },
  };
}
const server = new Set();
async function cycleOld(db) {
  for (const row of await db.getAllAsync('SELECT * FROM herd_events WHERE pending_sync = 1')) {
    let stableId = row.supabase_id;
    if (!stableId) { stableId = randomUUID(); await db.runAsync('UPDATE herd_events SET supabase_id = ? WHERE id = ?', [stableId, row.id]); }
    await tick(); server.add(stableId); // upsert onConflict:'id'
  }
}
async function cycleNew(db) {
  for (const row of await db.getAllAsync('SELECT * FROM herd_events WHERE pending_sync = 1')) {
    await db.runAsync('UPDATE herd_events SET supabase_id = ? WHERE id = ? AND supabase_id IS NULL', [randomUUID(), row.id]);
    const stableId = (await db.getFirstAsync('SELECT supabase_id FROM herd_events WHERE id = ?', [row.id])).supabase_id;
    await tick(); server.add(stableId);
  }
}
for (const [name, fn] of [['antigo', cycleOld], ['novo', cycleNew]]) {
  let worst = 0;
  for (let t = 0; t < 200; t++) {
    server.clear(); const db = setup();
    await Promise.all([fn(db), fn(db)]);
    worst = Math.max(worst, server.size);
  }
  console.log(`${name}: 4 linhas locais, 2 ciclos concorrentes → até ${worst} linhas no servidor (200 rodadas)`);
}
