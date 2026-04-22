// Reproduz o bug: user cai em offlineMode via abort, e daemon NÃO sai mais.
// Valida que o fix (re-auth proativo no tryRun quando offlineMode+online) resolve.

// Simplificação: testa a LÓGICA do daemon.tryRun num estado fake.

let fakeAuth = { isAuthenticated: true, offlineMode: true, offlineCache: { username: 'lucas', password: 'RENTabilidade!5' }, login: null };
let fakeNet = { online: true };
let reAuthCalls = 0;

// Emula tryReAuthOffline (sem a chamada real ao Supabase — só conta)
async function tryReAuthOffline() {
  reAuthCalls++;
  // Simula sucesso no re-auth
  fakeAuth.offlineMode = false;
  return true;
}

// Emula tryRun do daemon — CÓDIGO NOVO (com o fix)
async function tryRun_novo() {
  if (!fakeNet.online) return;
  if (!fakeAuth.isAuthenticated) return;
  if (fakeAuth.offlineMode) {
    await tryReAuthOffline();
    if (fakeAuth.offlineMode) return;
  }
  return 'synced';
}

// Emula tryRun do daemon — CÓDIGO VELHO (sem o fix)
async function tryRun_velho() {
  if (!fakeNet.online) return;
  if (!fakeAuth.isAuthenticated) return;
  if (fakeAuth.offlineMode) return; // ← bug: nunca tenta re-auth aqui
  return 'synced';
}

console.log('=== Cenário A: CÓDIGO VELHO (com bug) ===');
console.log('Estado inicial: offlineMode=true, online=true');
reAuthCalls = 0;
fakeAuth = { ...fakeAuth, offlineMode: true };
let r = await tryRun_velho();
console.log(`  → tryRun retornou: ${r ?? '(pula, offlineMode)'}`);
console.log(`  → reAuth chamadas: ${reAuthCalls}`);
console.log(`  → offlineMode depois: ${fakeAuth.offlineMode}`);
console.log(r ? '  ❌' : '  🐛 BUG: ficou preso em offlineMode, nunca sincroniza');

console.log('\n=== Cenário B: CÓDIGO NOVO (com fix) ===');
console.log('Estado inicial: offlineMode=true, online=true');
reAuthCalls = 0;
fakeAuth = { ...fakeAuth, offlineMode: true };
r = await tryRun_novo();
console.log(`  → tryRun retornou: ${r ?? '(pula)'}`);
console.log(`  → reAuth chamadas: ${reAuthCalls}`);
console.log(`  → offlineMode depois: ${fakeAuth.offlineMode}`);
console.log(r === 'synced' && !fakeAuth.offlineMode ? '  ✅ Fix: tentou re-auth, saiu de offlineMode, sincronizou' : '  ❌ Fix falhou');

console.log('\n=== Cenário C: offline REAL — fix não deve tentar re-auth em vão ===');
reAuthCalls = 0;
fakeAuth = { ...fakeAuth, offlineMode: true };
fakeNet.online = false;
r = await tryRun_novo();
console.log(`  → tryRun retornou: ${r ?? '(pula, sem rede)'}`);
console.log(`  → reAuth chamadas: ${reAuthCalls}`);
console.log(reAuthCalls === 0 ? '  ✅ Correto: sem rede, não tenta re-auth' : '  ❌ Tentou re-auth sem rede');
