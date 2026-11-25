// Testes do cálculo da IATF (src/lib/iatf-calc.ts), sem Next. De dashboard/:
//   node --experimental-strip-types --import ./scripts/register-hooks.mjs scripts/teste-iatf-calc.ts
import assert from 'node:assert/strict';
import {
  calcularCenarioIatf,
  calcularFunil,
  calcularIndicadores,
  calcularTouros,
  dedupePassagens,
  estacaoAtual,
  estacaoDe,
  intervaloEstacao,
  quemFaltou,
  resumirLotes,
  somarDias,
  type IatfAnimalRow,
  type IatfEventoRow,
  type IatfSessaoRow,
} from '../src/lib/iatf-calc';

let ok = 0;
function teste(nome: string, fn: () => void) {
  fn();
  ok++;
  console.log(`ok  ${nome}`);
}

// ---------------------------------------------------------------- fixture
const sessoes: IatfSessaoRow[] = [];
const eventos: IatfEventoRow[] = [];
const animais: IatfAnimalRow[] = [];
let seq = 0;

function sessao(date: string, lot: string, stage: string, extra: Partial<IatfSessaoRow> = {}): string {
  const id = `s${++seq}`;
  sessoes.push({ id, date, lot_id: lot, status: 'fechada', ops: 'iatf', iatf_stage: stage, vet: null, ...extra });
  return id;
}
function ev(sessionId: string, animal: string, extra: Partial<IatfEventoRow> = {}, at?: string) {
  const s = sessoes.find((x) => x.id === sessionId)!;
  eventos.push({
    id: `e${++seq}`,
    session_id: sessionId,
    animal_id: animal,
    event_at: at ?? `${s.date}T12:00:00Z`,
    iatf_stage: s.iatf_stage,
    iatf_result: null,
    bull_id: null,
    ovary_status: null,
    body_score: null,
    implant_lost: null,
    weight_kg: null,
    ...extra,
  });
}
function animal(id: string, category: string) {
  animals_push({ id, eid: `0000${id}`, category });
}
function animals_push(a: IatfAnimalRow) {
  animais.push(a);
}

// Lote A (vacas, "lotes 1–2"): dois implantes, SEM D8, inseminação.
const A0 = sessao('2026-11-05', 'A', 'implante');
const A0b = sessao('2026-11-14', 'A', 'implante');
const AIA = sessao('2026-11-16', 'A', 'inseminacao');
for (const id of ['a1', 'a2', 'a3']) {
  animal(id, 'VACA SOLTEIRA');
  ev(A0, id, { ovary_status: 'CL', body_score: '3.5' });
  ev(A0b, id);
}
ev(AIA, 'a1', { bull_id: 'T1' });
ev(AIA, 'a2', { bull_id: 'T2' });
// a3 implantada e não inseminada → faltou na inseminação.

// Lote B (novilhas): D0 → D8 → IA → DG (prenha / vazia→D8 / descarte) → 2ª IA → DG → DG final.
const B0 = sessao('2026-11-12', 'B', 'protocolo');
const B8 = sessao('2026-11-20', 'B', 'd8');
const BIA = sessao('2026-11-22', 'B', 'inseminacao');
const BDG = sessao('2026-12-22', 'B', 'diagnostico');
const B8b = sessao('2026-12-22', 'B2', 'd8'); // o DG move as vazias para outro lote
const BIAb = sessao('2026-12-24', 'B2', 'inseminacao');
const BDGb = sessao('2027-01-23', 'B2', 'diagnostico');
const BFIN = sessao('2027-02-20', 'B', 'dg_final');
for (const id of ['b1', 'b2', 'b3', 'b4']) {
  animal(id, 'NOVILHA');
  ev(B0, id, { ovary_status: id === 'b4' ? 'ANESTRO' : 'FOLICULO', body_score: 3 });
  ev(B8, id, { implant_lost: id === 'b4' });
  ev(BIA, id, { bull_id: 'T1' });
}
// b5: inseminada e faltou ao DG — entra no denominador da concepção, não no do 1º DG.
animal('b5', 'NOVILHA');
ev(B0, 'b5');
ev(B8, 'b5');
ev(BIA, 'b5', { bull_id: 'T1' });
// Duplicata: b1 bipado duas vezes no DG; vale a última (PRENHA).
ev(BDG, 'b1', { iatf_result: 'VAZIA' }, '2026-12-22T12:00:00Z');
ev(BDG, 'b1', { iatf_result: 'PRENHA' }, '2026-12-22T12:05:00Z');
ev(BDG, 'b2', { iatf_result: 'VAZIA' });
ev(BDG, 'b3', { iatf_result: 'DESCARTE' });
ev(BDG, 'b4', { iatf_result: 'PRENHA' });
// b2: volta ao D8 (já com o implante da ressinc), 2ª IA, prenha.
ev(B8b, 'b2');
ev(BIAb, 'b2', { bull_id: 'T2' });
ev(BDGb, 'b2', { iatf_result: 'PRENHA' });
// DG final: b1 confirma, b4 perdeu a gestação.
ev(BFIN, 'b1', { iatf_result: 'PRENHA' });
ev(BFIN, 'b4', { iatf_result: 'VAZIA' });

// Lote C: triagem na passada do implante (útero sujo, prenha, descarte) + aptas.
const CT = sessao('2026-11-23', 'C', 'triagem');
const C0 = sessao('2026-11-23', 'C', 'implante');
for (const id of ['c1', 'c2', 'c3', 'c4']) animal(id, 'VACA SOLTEIRA');
ev(C0, 'c1');
ev(CT, 'c2', { iatf_result: 'UTERO_SUJO' });
ev(CT, 'c3', { iatf_result: 'PRENHA' });
ev(CT, 'c4', { iatf_result: 'DESCARTE' });
// Útero sujo que volta na próxima passada e é implantada em OUTRA sessão/lote → apta, lote do D0.
animal('c5', 'VACA SOLTEIRA');
const CT2 = sessao('2026-11-10', 'X', 'triagem');
ev(CT2, 'c5', { iatf_result: 'UTERO_SUJO' });
ev(C0, 'c5');

// Fora da estação / teste / cancelada: não entram.
const fora = sessao('2026-09-30', 'A', 'implante');
ev(fora, 'a1');
const canc = sessao('2026-11-20', 'A', 'd8', { status: 'cancelada' });
ev(canc, 'a1');

const HOJE = '2026-11-25';
const cen = calcularCenarioIatf(sessoes, eventos, animais, '26/27', HOJE);
const porId = new Map(cen.animais.map((a) => [a.animalId, a]));
const lotes = new Map(resumirLotes(cen.animais).map((l) => [l.loteId, l]));

// ---------------------------------------------------------------- estação
teste('estação: limites 30/09, 01/10, 30/04, 01/05', () => {
  assert.equal(estacaoDe('2026-09-30'), null);
  assert.equal(estacaoDe('2026-10-01'), '26/27');
  assert.equal(estacaoDe('2027-04-30'), '26/27');
  assert.equal(estacaoDe('2027-05-01'), null);
  assert.equal(estacaoDe('2099-12-31'), '99/00');
  assert.deepEqual(intervaloEstacao('26/27'), { inicio: '2026-10-01', fim: '2027-04-30' });
  assert.equal(estacaoAtual('2026-11-25'), '26/27');
  assert.equal(estacaoAtual('2027-07-01'), '26/27'); // fora da estação: a que acabou
  assert.equal(estacaoAtual('2027-10-01'), '27/28');
  assert.equal(somarDias('2026-11-23', 8), '2026-12-01');
  assert.equal(somarDias('2026-12-30', 2), '2027-01-01');
});

teste('estação: sessão fora da estação e cancelada ficam de fora', () => {
  assert.equal(porId.get('a1')!.eventos.length, 3);
  assert.deepEqual(cen.estacoes, ['26/27']); // 30/09 não é estação
});

// ---------------------------------------------------------------- dedupe
teste('dedupe: uma linha por (sessão, animal), vale a última', () => {
  assert.equal(cen.descartados, 1);
  const b1 = porId.get('b1')!;
  assert.equal(b1.ciclos[0]!.dg!.iatf_result, 'PRENHA');
  const r = dedupePassagens([
    { id: 'x1', session_id: 's', animal_id: 'a', event_at: '2026-11-01T10:00:00Z' },
    { id: 'x2', session_id: 's', animal_id: 'a', event_at: '2026-11-01T10:00:00Z' },
  ]);
  assert.equal(r.eventos[0]!.id, 'x2');
});

// ---------------------------------------------------------------- funil
teste('funil monotônico: lote sem D8 conta inseminadas como chegadas ao D8', () => {
  const f = lotes.get('A')!.funil;
  assert.equal(f.implante, 3);
  assert.equal(f.d8, 2); // a1 e a2 inseminadas = passaram do D8 mesmo sem registro
  assert.equal(f.inseminacao, 2);
  assert.equal(f.literal.d8, 0);
  // dois implantes não inflam: 3 animais, não 6
  assert.equal(f.literal.implante, 3);
});

teste('ciclo: DG VAZIA → D8 abre 2º ciclo com D0 implícito; DESCARTE sai', () => {
  const b2 = porId.get('b2')!;
  assert.equal(b2.ciclos.length, 2);
  assert.equal(b2.ciclos[1]!.porVazia, true);
  assert.equal(b2.ciclos[1]!.rank, 4);
  assert.equal(b2.status, 'prenha');
  assert.equal(b2.loteId, 'B'); // lote do D0, não o lote para onde o DG moveu
  const b3 = porId.get('b3')!;
  assert.equal(b3.ciclos.length, 1);
  assert.equal(b3.status, 'descarte');
  const f = lotes.get('B')!.funil;
  assert.deepEqual(f.dg, { total: 4, prenha: 2, vazia: 1, descarte: 1 });
  assert.equal(f.segundaIatf, 1);
  assert.deepEqual(f.dgFinal, { total: 2, prenha: 1, vazia: 1 });
  assert.equal(porId.get('b4')!.status, 'descarte'); // vazia no DG final = descarte
});

teste('indicadores de estação: concepção 1ª/2ª, perda gestacional, prenhez, doses', () => {
  const b = calcularIndicadores(lotes.get('B')!.animais);
  assert.deepEqual(b.concepcao1, { n: 2, d: 5 }); // b5 inseminada sem DG conta no denominador
  assert.deepEqual(b.concepcao2, { n: 1, d: 1 });
  assert.deepEqual(b.perdaGestacional, { n: 1, d: 2 });
  assert.equal(b.prenhas, 2); // b1 e b2 (b4 perdeu)
  assert.deepEqual(b.prenhez, { n: 2, d: 5 });
  assert.equal(b.doses, 6);
  assert.equal(b.dosesPorPrenhez, 3);
  assert.deepEqual(b.descartes, { total: 2, dg: 1, dgFinal: 1, triagem: 0 });
  assert.deepEqual(b.perdaImplante, { n: 1, d: 4 }); // b5 sem a pergunta respondida
});

teste('taxa de serviço só nos lotes que já inseminaram', () => {
  const t = calcularIndicadores(cen.animais);
  // A: 3 implantadas, 2 inseminadas; B: 5 e 5; C ainda não inseminou → fora.
  assert.deepEqual(t.taxaServico, { n: 7, d: 8 });
});

// ---------------------------------------------------------------- triagem
teste('triagem fora do D0: não é implante; útero sujo implantada depois vira apta', () => {
  const f = lotes.get('C')!.funil;
  assert.deepEqual(f.triagem, { aptas: 2, uteroSujo: 1, prenha: 1, descarte: 1 });
  assert.equal(f.matrizes, 5);
  assert.equal(f.implante, 2);
  const c5 = porId.get('c5')!;
  assert.equal(c5.apta, true);
  assert.equal(c5.loteId, 'C'); // lote do D0, não da triagem
  assert.equal(porId.get('c2')!.loteId, 'C'); // sem D0: lote da 1ª sessão
  assert.equal(porId.get('c4')!.status, 'triagem_descarte');
  const t = calcularIndicadores(cen.animais);
  assert.equal(t.descartes.triagem, 1);
  assert.equal(t.prenhas, 2); // "já prenha" da triagem não conta como prenhez da IATF
});

// ---------------------------------------------------------------- lotes
teste('lote: etapa atual, próxima prevista e quem faltou', () => {
  const a = lotes.get('A')!;
  assert.equal(a.atual!.etapa, 'inseminacao');
  assert.deepEqual(a.proxima, { rotulo: 'DG', prevista: '2026-12-16' });
  const faltas = quemFaltou(a);
  assert.equal(faltas.length, 1); // não acusa D8 que o lote nunca teve
  assert.equal(faltas[0]!.etapa, 'inseminacao');
  assert.equal(faltas[0]!.anterior, 'd0');
  assert.deepEqual(faltas[0]!.animais.map((x) => x.animalId), ['a3']);
  const c = lotes.get('C')!;
  assert.deepEqual(c.proxima, { rotulo: 'D8', prevista: '2026-12-01' });
  assert.equal(quemFaltou(c).length, 0); // D8 ainda no futuro
});

teste('touros: doses e concepção pela última inseminação do ciclo', () => {
  const t = calcularTouros(cen.animais, [
    { id: 'T1', name: 'Touro 1', breed: 'Nelore' },
    { id: 'T2', name: 'Touro 2', breed: 'Angus' },
  ]);
  assert.equal(t.doses, 8);
  const t1 = t.porTouro.find((x) => x.chave === 'T1')!;
  assert.deepEqual([t1.doses, t1.comResultado, t1.prenhas], [6, 4, 2]);
  const t2 = t.porTouro.find((x) => x.chave === 'T2')!;
  assert.deepEqual([t2.doses, t2.comResultado, t2.prenhas], [2, 1, 1]);
  assert.equal(t.porInseminador[0]!.rotulo, 'Não informado');
});

teste('funil geral = soma dos lotes', () => {
  const g = calcularFunil(cen.animais);
  assert.equal(g.implante, 3 + 5 + 2);
});

console.log(`\n${ok} testes passaram`);
