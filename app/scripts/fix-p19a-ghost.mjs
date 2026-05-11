// Correção manual: P19A GARROTE 214 → 107 (remove 107 cab fantasmas).
// Causa: bug em tryHealOrphan (engine.ts:391) somou head_counts quando o mesmo
// INSERT subiu de 2 devices ou em retry → +107 cab. Detectado 2026-05-11.
//
// Uso: node scripts/fix-p19a-ghost.mjs <user> <pass>

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => env.match(new RegExp(`${k}=(.+)`))?.[1]?.trim();
const supa = createClient(get('EXPO_PUBLIC_SUPABASE_URL'), get('EXPO_PUBLIC_SUPABASE_ANON_KEY'), {auth:{persistSession:false}});

const [, , user, pass] = process.argv;
if (!user || !pass) { console.error('uso: node scripts/fix-p19a-ghost.mjs <user> <pass>'); process.exit(1); }
const email = (await supa.rpc('email_for_username', {u:user})).data;
const sign = await supa.auth.signInWithPassword({email, password:pass});
if (sign.error) { console.error('login falhou:', sign.error.message); process.exit(1); }

const TARGET_ID = 'b48c0673-21af-4032-a478-232372e57251';

console.log('[fix] estado atual...');
const { data: before } = await supa.from('herd').select('*').eq('id', TARGET_ID).maybeSingle();
if (!before) { console.error('row não encontrada'); process.exit(1); }
console.log(`  P19A GARROTE: head_count=${before.head_count}, updated_at=${before.updated_at}`);

if (before.head_count !== 214) {
  console.error(`[fix] estado inesperado: head_count=${before.head_count} (esperado 214). Abortando pra evitar correção dupla.`);
  process.exit(1);
}

console.log('[fix] aplicando UPDATE head_count=107...');
const { data, error } = await supa
  .from('herd')
  .update({ head_count: 107 })
  .eq('id', TARGET_ID)
  .select('*')
  .single();
if (error) { console.error('UPDATE falhou:', error.message); process.exit(1); }
console.log(`[fix] novo estado: head_count=${data.head_count}, updated_at=${data.updated_at}`);

// Registra um herd_event de AJUSTE pra deixar rastro auditável.
// Usamos event_type='AJUSTE' (novo) com notes explicando, head_count=107 (qtd removida).
// O servidor pode não aceitar 'AJUSTE' se houver CHECK constraint — tenta e reporta.
console.log('[fix] tentando registrar evento de auditoria...');
const { error: evErr } = await supa.from('herd_events').insert({
  paddock_id: data.paddock_id,
  event_type: 'AJUSTE',
  category: data.category,
  head_count: 107,
  notes: 'Correção manual: P19A GARROTE estava com 214 (DOBRO). Bug tryHealOrphan engine.ts:391 somou head_counts em UNIQUE violation. Removidos 107 cab fantasmas.',
  date: new Date().toISOString().slice(0, 10),
});
if (evErr) {
  console.log(`[fix] evento de auditoria não pôde ser registrado: ${evErr.message}`);
  console.log('[fix] (continua mesmo assim — o UPDATE foi aplicado com sucesso)');
} else {
  console.log('[fix] evento de auditoria registrado');
}

await supa.auth.signOut();
console.log('\n[fix] Concluído. Rode `node scripts/audit-herd.mjs` para confirmar novo total = 4085 cab.');
