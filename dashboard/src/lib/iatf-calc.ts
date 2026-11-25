// IATF (app curral-nsa): estação de monta, ciclo de cada matriz, funil, touros e fatores do D0.
// Funções puras, sem I/O — testáveis fora do Next (scripts/teste-iatf-calc.ts).
//
// Regras portadas de curral-nsa/app/src/lib/curral/iatf.ts (fonte da verdade):
// - implante e protocolo são o MESMO D0; ressinc é um novo D0 que NÃO fecha o ciclo;
// - só o DG (diagnostico) e o DG final (dg_final) fecham o ciclo;
// - a vazia do DG volta ao D8 com o implante da ressinc → o ciclo seguinte já tem D0;
// - DESCARTE no DG de rodada = vazia que sai do programa; VAZIA no DG final = descarte.
// Triagem (nova, 11/2026): exame na passada do implante de quem NÃO foi implantada
// (útero sujo, já prenha, descarte). Não é D0 nem DG.

import { INICIO_OPERACAO_REAL, pesagensAnteriores, pesoValido, type PassagemRow } from './curral-calc';

// ----------------------------------------------------------------------------
// Tipos de entrada (o que o loader traz do banco)

export interface IatfSessaoRow {
  id: string;
  date: string;
  lot_id: string | null;
  status: string;
  ops: string | null;
  iatf_stage: string | null;
  vet: string | null;
}

export interface IatfEventoRow {
  id: string;
  session_id: string;
  animal_id: string;
  event_at: string;
  iatf_stage: string | null;
  iatf_result: string | null;
  bull_id: string | null;
  ovary_status: string | null;
  /** numeric no Postgres — PostgREST pode devolver como string. */
  body_score: number | string | null;
  implant_lost: boolean | null;
  weight_kg: number | null;
}

export interface IatfAnimalRow {
  id: string;
  eid: string | null;
  category: string | null;
}

export interface TouroRow {
  id: string;
  name: string;
  breed: string | null;
}

// ----------------------------------------------------------------------------
// Estação de monta: 01/10 a 30/04 (data BRT), recorrente.

/** Código da estação de um dia `YYYY-MM-DD` ("26/27"), ou null de maio a setembro. */
export function estacaoDe(dia: string): string | null {
  const ano = Number(dia.slice(0, 4));
  const mes = Number(dia.slice(5, 7));
  const yy = (a: number) => String(a % 100).padStart(2, '0');
  if (mes >= 10) return `${yy(ano)}/${yy(ano + 1)}`;
  if (mes <= 4) return `${yy(ano - 1)}/${yy(ano)}`;
  return null;
}

/** Primeiro e último dia (inclusive) da estação "26/27". */
export function intervaloEstacao(cod: string): { inicio: string; fim: string } {
  const a = 2000 + Number(cod.slice(0, 2));
  return { inicio: `${a}-10-01`, fim: `${a + 1}-04-30` };
}

/** Estação de hoje; de maio a setembro, a que acabou de terminar. */
export function estacaoAtual(hoje: string): string {
  const e = estacaoDe(hoje);
  if (e) return e;
  const ano = Number(hoje.slice(0, 4));
  return estacaoDe(`${ano}-04-30`)!;
}

/** Dia no relógio de Brasília (sem horário de verão: -3h fixo). */
export function diaBrt(iso: string): string {
  return new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Soma dias a uma data `YYYY-MM-DD`, sem passar pelo fuso local. */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Etapas

export type Etapa = 'triagem' | 'd0' | 'd8' | 'inseminacao' | 'diagnostico' | 'dg_final';

/** Normaliza o código gravado. Implante, protocolo e ressinc são todos D0. */
export function etapaDe(stage: string | null): Etapa | null {
  switch (stage) {
    case 'implante':
    case 'protocolo':
    case 'ressinc':
      return 'd0';
    case 'triagem':
    case 'd8':
    case 'inseminacao':
    case 'diagnostico':
    case 'dg_final':
      return stage;
    default:
      return null; // etapa que este código não conhece: fica fora, não derruba a tela
  }
}

/** Posição no ciclo, para o funil "chegou a esta etapa ou além". */
const RANK: Record<Exclude<Etapa, 'triagem'>, number> = { d0: 1, d8: 2, inseminacao: 3, diagnostico: 4, dg_final: 4 };

export const ETAPA_LABELS: Record<Etapa, string> = {
  triagem: 'Triagem',
  d0: 'Implante',
  d8: 'D8',
  inseminacao: 'Inseminação',
  diagnostico: 'DG',
  dg_final: 'DG final',
};

export const TRIAGEM_LABELS: Record<string, string> = {
  UTERO_SUJO: 'Útero sujo',
  PRENHA: 'Já prenha',
  DESCARTE: 'Descarte',
};

/** Intervalos do protocolo, para a data PREVISTA da próxima etapa. */
export const DIAS_D0_D8 = 8;
export const DIAS_D8_IA = 2;
export const DIAS_IA_DG = 30;

/** Amostra abaixo disto não sustenta taxa de concepção por touro. */
export const AMOSTRA_MINIMA = 30;

// ----------------------------------------------------------------------------
// Dedupe e montagem dos eventos da estação

export interface EventoIatf extends IatfEventoRow {
  etapa: Etapa;
  dia: string;
  sessao: IatfSessaoRow;
}

export function ehSessaoValida(s: IatfSessaoRow): boolean {
  return s.date >= INICIO_OPERACAO_REAL && s.status !== 'cancelada';
}

/**
 * Uma linha por (sessão, animal): vale a última passagem (event_at, desempate por id).
 * O app regrava o animal quando o peão corrige a leitura.
 */
export function dedupePassagens<T extends { session_id: string; animal_id: string; event_at: string; id: string }>(
  eventos: T[],
): { eventos: T[]; descartados: number } {
  const m = new Map<string, T>();
  for (const e of eventos) {
    const k = `${e.session_id}|${e.animal_id}`;
    const atual = m.get(k);
    if (!atual || e.event_at > atual.event_at || (e.event_at === atual.event_at && e.id > atual.id)) m.set(k, e);
  }
  return { eventos: [...m.values()], descartados: eventos.length - m.size };
}

/** Eventos de IATF de sessões válidas da estação, deduplicados e em ordem cronológica. */
export function eventosDaEstacao(
  sessoes: IatfSessaoRow[],
  eventos: IatfEventoRow[],
  estacao: string,
): { eventos: EventoIatf[]; descartados: number } {
  const { inicio, fim } = intervaloEstacao(estacao);
  const sessaoById = new Map(sessoes.filter(ehSessaoValida).map((s) => [s.id, s]));
  const candidatos: EventoIatf[] = [];
  for (const e of eventos) {
    const s = sessaoById.get(e.session_id);
    if (!s || s.date < inicio || s.date > fim) continue;
    const etapa = etapaDe(e.iatf_stage ?? s.iatf_stage);
    if (!etapa) continue;
    candidatos.push({ ...e, etapa, dia: s.date, sessao: s });
  }
  const r = dedupePassagens(candidatos);
  r.eventos.sort((a, b) => a.event_at.localeCompare(b.event_at) || a.id.localeCompare(b.id));
  return r;
}

// ----------------------------------------------------------------------------
// O animal na estação

export interface Ciclo {
  n: number;
  /** Começou num DG VAZIA: volta ao D8 com o implante da ressinc (D0 implícito). */
  porVazia: boolean;
  d0: EventoIatf[];
  d8: EventoIatf[];
  inseminacoes: EventoIatf[];
  /** O DG (ou DG final) que fechou o ciclo. */
  dg: EventoIatf | null;
  /** Maior etapa alcançada no ciclo (1 = D0 … 4 = DG). */
  rank: number;
  /** Ovário e ECC do D0 do ciclo (o último D0 com o dado). */
  ovario: string | null;
  ecc: number | null;
}

export type StatusFinal =
  | 'prenha'
  | 'vazia' // vazia no DG de rodada, voltando ao D8
  | 'descarte'
  | 'triagem_utero_sujo'
  | 'triagem_prenha'
  | 'triagem_descarte'
  | 'em_protocolo';

export interface AnimalIatf {
  animalId: string;
  eid: string | null;
  categoria: string | null;
  grupo: Grupo;
  loteId: string | null;
  /** Tem alguma etapa além da triagem: entrou no protocolo. */
  apta: boolean;
  triagem: EventoIatf | null;
  ciclos: Ciclo[];
  eventos: EventoIatf[];
  status: StatusFinal;
  /** Algum DG de rodada deu PRENHA e o DG final depois deu VAZIA. */
  perdaGestacional: boolean;
  /** Teve DG de rodada PRENHA e passou pelo DG final depois. */
  prenhaConferidaNoFinal: boolean;
}

export type Grupo = 'vacas' | 'novilhas';

export function filtrarGrupo(animais: AnimalIatf[], grupo: string | undefined): AnimalIatf[] {
  return grupo === 'vacas' || grupo === 'novilhas' ? animais.filter((a) => a.grupo === grupo) : animais;
}

export function grupoDe(categoria: string | null): Grupo {
  return (categoria ?? '').toUpperCase().startsWith('NOVILHA') ? 'novilhas' : 'vacas';
}

function novoCiclo(n: number, porVazia: boolean): Ciclo {
  return { n, porVazia, d0: [], d8: [], inseminacoes: [], dg: null, rank: porVazia ? 1 : 0, ovario: null, ecc: null };
}

function numero(x: number | string | null): number | null {
  if (x == null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

/** Monta o histórico de um animal a partir dos seus eventos (ordem cronológica). */
export function montarAnimal(
  animalId: string,
  eventos: EventoIatf[],
  animal: IatfAnimalRow | undefined,
): AnimalIatf {
  const ciclos: Ciclo[] = [];
  let atual: Ciclo | null = null;
  let triagem: EventoIatf | null = null;
  let prenhaNoDg = false;
  let perdaGestacional = false;
  let prenhaConferidaNoFinal = false;

  for (const e of eventos) {
    if (e.etapa === 'triagem') {
      triagem = e;
      continue;
    }
    // DG final da prenha confirmada: o ciclo dela já fechou no DG, não abre outro.
    if (!atual && e.etapa === 'dg_final' && prenhaNoDg) {
      prenhaConferidaNoFinal = true;
      if (e.iatf_result !== 'PRENHA') perdaGestacional = true;
      continue;
    }
    if (!atual) {
      atual = novoCiclo(ciclos.length + 1, false);
      ciclos.push(atual);
    }
    atual.rank = Math.max(atual.rank, RANK[e.etapa]);
    if (e.etapa === 'd0') {
      atual.d0.push(e);
      if (e.ovary_status) atual.ovario = e.ovary_status;
      const ecc = numero(e.body_score);
      if (ecc != null) atual.ecc = ecc;
    } else if (e.etapa === 'd8') {
      atual.d8.push(e);
    } else if (e.etapa === 'inseminacao') {
      atual.inseminacoes.push(e);
    } else {
      // DG ou DG final: fecha o ciclo.
      atual.dg = e;
      if (e.etapa === 'diagnostico' && e.iatf_result === 'PRENHA') prenhaNoDg = true;
      if (e.etapa === 'dg_final' && prenhaNoDg) {
        prenhaConferidaNoFinal = true;
        if (e.iatf_result !== 'PRENHA') perdaGestacional = true;
      }
      const vazia = e.etapa === 'diagnostico' && e.iatf_result === 'VAZIA';
      atual = vazia ? novoCiclo(ciclos.length + 1, true) : null;
      if (atual) ciclos.push(atual);
    }
  }

  const apta = ciclos.length > 0;
  return {
    animalId,
    eid: animal?.eid ?? null,
    categoria: animal?.category ?? null,
    grupo: grupoDe(animal?.category ?? null),
    loteId: loteDoAnimal(eventos),
    apta,
    triagem,
    ciclos,
    eventos,
    status: statusFinal(eventos, apta, triagem),
    perdaGestacional,
    prenhaConferidaNoFinal,
  };
}

/** Lote na IATF = lote da SESSÃO do primeiro D0; sem D0, o da primeira sessão de IATF. */
export function loteDoAnimal(eventos: EventoIatf[]): string | null {
  const ref = eventos.find((e) => e.etapa === 'd0') ?? eventos[0];
  return ref ? ref.sessao.lot_id : null;
}

function statusFinal(eventos: EventoIatf[], apta: boolean, triagem: EventoIatf | null): StatusFinal {
  const dgs = eventos.filter((e) => e.etapa === 'diagnostico' || e.etapa === 'dg_final');
  const ultimo = dgs[dgs.length - 1];
  if (ultimo) {
    if (ultimo.iatf_result === 'PRENHA') return 'prenha';
    if (ultimo.etapa === 'dg_final' || ultimo.iatf_result === 'DESCARTE') return 'descarte';
    if (ultimo.iatf_result === 'VAZIA') return 'vazia';
  }
  if (apta) return 'em_protocolo';
  if (triagem?.iatf_result === 'UTERO_SUJO') return 'triagem_utero_sujo';
  if (triagem?.iatf_result === 'PRENHA') return 'triagem_prenha';
  if (triagem?.iatf_result === 'DESCARTE') return 'triagem_descarte';
  return 'em_protocolo';
}

export function montarAnimais(eventos: EventoIatf[], animais: IatfAnimalRow[]): AnimalIatf[] {
  const animalById = new Map(animais.map((a) => [a.id, a]));
  const porAnimal = new Map<string, EventoIatf[]>();
  for (const e of eventos) {
    const l = porAnimal.get(e.animal_id) ?? [];
    l.push(e);
    porAnimal.set(e.animal_id, l);
  }
  return [...porAnimal.entries()].map(([id, evs]) => montarAnimal(id, evs, animalById.get(id)));
}

// ----------------------------------------------------------------------------
// Funil

export interface Funil {
  /** Matrizes no programa: aptas + triadas não aptas. */
  matrizes: number;
  triagem: { aptas: number; uteroSujo: number; prenha: number; descarte: number };
  /** Ciclo 1, monotônico: chegou a esta etapa ou além. */
  implante: number;
  d8: number;
  inseminacao: number;
  dg: { total: number; prenha: number; vazia: number; descarte: number };
  /** Inseminadas num 2º ciclo (vazias do DG que voltaram ao D8). */
  segundaIatf: number;
  dgFinal: { total: number; prenha: number; vazia: number };
  /** Contagem pelo rótulo gravado (com registro naquela etapa), para conferência. */
  literal: { implante: number; d8: number; inseminacao: number };
}

export function calcularFunil(animais: AnimalIatf[]): Funil {
  const f: Funil = {
    matrizes: animais.length,
    triagem: { aptas: 0, uteroSujo: 0, prenha: 0, descarte: 0 },
    implante: 0,
    d8: 0,
    inseminacao: 0,
    dg: { total: 0, prenha: 0, vazia: 0, descarte: 0 },
    segundaIatf: 0,
    dgFinal: { total: 0, prenha: 0, vazia: 0 },
    literal: { implante: 0, d8: 0, inseminacao: 0 },
  };
  for (const a of animais) {
    if (a.apta) f.triagem.aptas++;
    else if (a.triagem?.iatf_result === 'UTERO_SUJO') f.triagem.uteroSujo++;
    else if (a.triagem?.iatf_result === 'PRENHA') f.triagem.prenha++;
    else if (a.triagem?.iatf_result === 'DESCARTE') f.triagem.descarte++;

    const c1 = a.ciclos[0];
    if (c1) {
      if (c1.rank >= 1) f.implante++;
      if (c1.rank >= 2) f.d8++;
      if (c1.rank >= 3) f.inseminacao++;
      if (c1.d0.length) f.literal.implante++;
      if (c1.d8.length) f.literal.d8++;
      if (c1.inseminacoes.length) f.literal.inseminacao++;
      if (c1.dg?.etapa === 'diagnostico') {
        f.dg.total++;
        if (c1.dg.iatf_result === 'PRENHA') f.dg.prenha++;
        else if (c1.dg.iatf_result === 'DESCARTE') f.dg.descarte++;
        else if (c1.dg.iatf_result === 'VAZIA') f.dg.vazia++;
      }
    }
    if (a.ciclos.slice(1).some((c) => c.inseminacoes.length > 0)) f.segundaIatf++;
    const fin = [...a.eventos].reverse().find((e) => e.etapa === 'dg_final');
    if (fin) {
      f.dgFinal.total++;
      if (fin.iatf_result === 'PRENHA') f.dgFinal.prenha++;
      else f.dgFinal.vazia++;
    }
  }
  return f;
}

// ----------------------------------------------------------------------------
// Indicadores (cartões + estação)

export interface Taxa {
  n: number;
  d: number;
}

export const pct = (t: Taxa): number | null => (t.d > 0 ? t.n / t.d : null);

/** Lotes que já tiveram registro numa etapa (algum animal do lote com aquele rótulo). */
export function lotesQueChegaram(animais: AnimalIatf[], etapa: Etapa): Set<string | null> {
  const s = new Set<string | null>();
  for (const a of animais) if (a.eventos.some((e) => e.etapa === etapa)) s.add(a.loteId);
  return s;
}

export interface Indicadores {
  matrizes: number;
  aptas: number;
  triadasNaoAptas: number;
  implantadas: number;
  inseminadas: number;
  /** Inseminadas ÷ implantadas, só nos lotes que já inseminaram. */
  taxaServico: Taxa;
  /** Perderam o implante ÷ registros de D8 com a pergunta respondida. */
  perdaImplante: Taxa;
  prenhas: number;
  /** Prenhas ÷ aptas dos lotes que já tiveram DG (prenhez acumulada). */
  prenhez: Taxa;
  descartes: { total: number; dg: number; dgFinal: number; triagem: number };
  temDg: boolean;
  /** Prenhas no 1º DG ÷ inseminadas no 1º ciclo (lotes que já tiveram DG). */
  concepcao1: Taxa;
  /** Prenhas no DG do 2º ciclo ÷ inseminadas no 2º ciclo (idem). */
  concepcao2: Taxa;
  /** Prenha no DG de rodada → vazia no DG final ÷ prenhas que passaram pelo DG final. */
  perdaGestacional: Taxa;
  /** Doses de sêmen dos lotes com DG ÷ prenhas. */
  dosesPorPrenhez: number | null;
  doses: number;
}

export function calcularIndicadores(animais: AnimalIatf[]): Indicadores {
  const aptas = animais.filter((a) => a.apta);
  const f = calcularFunil(animais);
  const lotesIa = lotesQueChegaram(animais, 'inseminacao');
  const lotesDg = new Set([...lotesQueChegaram(animais, 'diagnostico'), ...lotesQueChegaram(animais, 'dg_final')]);

  const servico: Taxa = { n: 0, d: 0 };
  for (const a of aptas) {
    if (!lotesIa.has(a.loteId)) continue;
    servico.d++;
    if (a.ciclos[0]!.rank >= 3) servico.n++;
  }

  const perdaImplante: Taxa = { n: 0, d: 0 };
  for (const a of aptas)
    for (const e of a.eventos)
      if (e.etapa === 'd8' && e.implant_lost != null) {
        perdaImplante.d++;
        if (e.implant_lost) perdaImplante.n++;
      }

  const prenhas = animais.filter((a) => a.status === 'prenha').length;
  const prenhez: Taxa = { n: 0, d: 0 };
  for (const a of aptas) {
    if (!lotesDg.has(a.loteId)) continue;
    prenhez.d++;
    if (a.status === 'prenha') prenhez.n++;
  }

  // Prenhas no DG do ciclo ÷ inseminadas no ciclo, nos lotes que já tiveram DG: a inseminada
  // que faltou ao DG conta no denominador (não se sabe se emprenhou).
  const concepcao = (i: number): Taxa => {
    const t: Taxa = { n: 0, d: 0 };
    for (const a of aptas) {
      const c = a.ciclos[i];
      if (!c || c.inseminacoes.length === 0 || !lotesDg.has(a.loteId)) continue;
      t.d++;
      if (c.dg?.iatf_result === 'PRENHA') t.n++;
    }
    return t;
  };

  const perdaGest: Taxa = { n: 0, d: 0 };
  for (const a of aptas) {
    if (!a.prenhaConferidaNoFinal) continue;
    perdaGest.d++;
    if (a.perdaGestacional) perdaGest.n++;
  }

  let doses = 0;
  let dosesLotesDg = 0;
  for (const a of aptas)
    for (const c of a.ciclos) {
      doses += c.inseminacoes.length;
      if (lotesDg.has(a.loteId)) dosesLotesDg += c.inseminacoes.length;
    }

  const desc = { total: 0, dg: 0, dgFinal: 0, triagem: 0 };
  for (const a of animais) {
    if (a.status === 'triagem_descarte') desc.triagem++;
    else if (a.status === 'descarte') {
      const ult = [...a.eventos].reverse().find((e) => e.etapa === 'diagnostico' || e.etapa === 'dg_final');
      if (ult?.etapa === 'dg_final') desc.dgFinal++;
      else desc.dg++;
    }
  }
  desc.total = desc.dg + desc.dgFinal + desc.triagem;

  return {
    matrizes: animais.length,
    aptas: aptas.length,
    triadasNaoAptas: animais.length - aptas.length,
    implantadas: f.implante,
    inseminadas: f.inseminacao,
    taxaServico: servico,
    perdaImplante,
    prenhas,
    prenhez,
    descartes: desc,
    temDg: lotesDg.size > 0,
    concepcao1: concepcao(0),
    concepcao2: concepcao(1),
    perdaGestacional: perdaGest,
    dosesPorPrenhez: prenhas > 0 && dosesLotesDg > 0 ? dosesLotesDg / prenhas : null,
    doses,
  };
}

// ----------------------------------------------------------------------------
// Touros, sêmen e inseminador

export interface LinhaTouro {
  chave: string;
  rotulo: string;
  raca?: string | null;
  doses: number;
  /** Doses cujo ciclo já teve DG, e quantas deram prenhez. */
  comResultado: number;
  prenhas: number;
}

export function calcularTouros(
  animais: AnimalIatf[],
  touros: TouroRow[],
): { porTouro: LinhaTouro[]; porRaca: LinhaTouro[]; porInseminador: LinhaTouro[]; doses: number; semTouro: number } {
  const touroById = new Map(touros.map((t) => [t.id, t]));
  const porTouro = new Map<string, LinhaTouro>();
  const porRaca = new Map<string, LinhaTouro>();
  const porInsem = new Map<string, LinhaTouro>();
  let doses = 0;
  let semTouro = 0;
  const somar = (m: Map<string, LinhaTouro>, chave: string, rotulo: string, raca: string | null, res: string | null | undefined) => {
    const l = m.get(chave) ?? { chave, rotulo, raca, doses: 0, comResultado: 0, prenhas: 0 };
    l.doses++;
    if (res != null) {
      l.comResultado++;
      if (res === 'PRENHA') l.prenhas++;
    }
    m.set(chave, l);
  };
  for (const a of animais)
    for (const c of a.ciclos)
      c.inseminacoes.forEach((e, i) => {
        doses++;
        // Só a última inseminação do ciclo responde pelo DG.
        const res = i === c.inseminacoes.length - 1 ? c.dg?.iatf_result ?? null : null;
        const t = e.bull_id ? touroById.get(e.bull_id) : undefined;
        if (!e.bull_id) semTouro++;
        somar(porTouro, e.bull_id ?? '—', t?.name ?? (e.bull_id ? 'Touro não cadastrado' : 'Sem touro'), t?.breed ?? null, res);
        const raca = t?.breed?.trim() || 'Sem raça';
        somar(porRaca, raca, raca, null, res);
        const vet = e.sessao.vet?.trim() || 'Não informado';
        somar(porInsem, vet, vet, null, res);
      });
  const ord = (m: Map<string, LinhaTouro>) => [...m.values()].sort((a, b) => b.doses - a.doses || a.rotulo.localeCompare(b.rotulo));
  return { porTouro: ord(porTouro), porRaca: ord(porRaca), porInseminador: ord(porInsem), doses, semTouro };
}

// ----------------------------------------------------------------------------
// Fatores do D0

export const OVARIO_ORDEM = ['CL', 'FOLICULO', 'ANESTRO'] as const;

export function faixaEcc(ecc: number): string {
  if (ecc <= 2.5) return '≤ 2,5';
  if (ecc >= 4) return '≥ 4,0';
  return ecc.toFixed(1).replace('.', ',');
}
export const FAIXAS_ECC = ['≤ 2,5', '3,0', '3,5', '≥ 4,0'];

export interface Contagem {
  rotulo: string;
  n: number;
  /** Prenhez no 1º DG desse grupo. */
  dg: Taxa;
}

function contarPor(animais: AnimalIatf[], chave: (a: AnimalIatf) => string | null, ordem?: readonly string[]): Contagem[] {
  const m = new Map<string, Contagem>();
  for (const a of animais) {
    const k = chave(a);
    if (k == null) continue;
    const c = m.get(k) ?? { rotulo: k, n: 0, dg: { n: 0, d: 0 } };
    c.n++;
    const c1 = a.ciclos[0];
    if (c1?.dg) {
      c.dg.d++;
      if (c1.dg.iatf_result === 'PRENHA') c.dg.n++;
    }
    m.set(k, c);
  }
  const out = [...m.values()];
  return ordem
    ? out.sort((a, b) => ordem.indexOf(a.rotulo) - ordem.indexOf(b.rotulo))
    : out.sort((a, b) => b.n - a.n || a.rotulo.localeCompare(b.rotulo));
}

/** Ovário e ECC do D0 do 1º ciclo; prenhez do 1º DG por ovário, ECC, categoria e lote. */
export function calcularFatores(animais: AnimalIatf[]) {
  const aptas = animais.filter((a) => a.apta);
  return {
    aptas: aptas.length,
    ovario: contarPor(aptas, (a) => a.ciclos[0]!.ovario, OVARIO_ORDEM),
    ecc: contarPor(aptas, (a) => (a.ciclos[0]!.ecc == null ? null : faixaEcc(a.ciclos[0]!.ecc)), FAIXAS_ECC),
    eccMedio: media(aptas.map((a) => a.ciclos[0]!.ecc).filter((x): x is number => x != null)),
    categoria: contarPor(aptas, (a) => a.categoria ?? 'Sem categoria'),
    lote: contarPor(aptas, (a) => a.loteId ?? ''),
  };
}

function media(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// ----------------------------------------------------------------------------
// Lotes

export interface EtapaDoLote {
  etapa: Etapa;
  dia: string;
  sessaoId: string;
  animais: number;
}

export interface ResumoLote {
  loteId: string | null;
  animais: AnimalIatf[];
  categoria: string | null;
  funil: Funil;
  /** Sessões em que animais do lote passaram, em ordem (linha do tempo). */
  etapas: EtapaDoLote[];
  atual: EtapaDoLote | null;
  proxima: { rotulo: string; prevista: string | null } | null;
}

/** Sessão conta como etapa do lote se passou ao menos isto do lote (filtra animal desgarrado). */
export const FRACAO_MINIMA_ETAPA = 0.1;

export function etapasDoLote(animais: AnimalIatf[]): EtapaDoLote[] {
  const porSessao = new Map<string, { evs: EventoIatf[] }>();
  for (const a of animais)
    for (const e of a.eventos) {
      const s = porSessao.get(e.session_id) ?? { evs: [] };
      s.evs.push(e);
      porSessao.set(e.session_id, s);
    }
  const out: EtapaDoLote[] = [];
  for (const [sessaoId, { evs }] of porSessao) {
    const cont = new Map<Etapa, number>();
    for (const e of evs) cont.set(e.etapa, (cont.get(e.etapa) ?? 0) + 1);
    const etapa = [...cont.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    out.push({ etapa, dia: evs[0]!.dia, sessaoId, animais: evs.length });
  }
  return out.sort((a, b) => a.dia.localeCompare(b.dia) || RANK_ORDEM(a.etapa) - RANK_ORDEM(b.etapa));
}

const RANK_ORDEM = (e: Etapa) => (e === 'triagem' ? 0 : RANK[e]);

export function proximaEtapa(atual: EtapaDoLote | null, funil: Funil): ResumoLote['proxima'] {
  if (!atual) return null;
  switch (atual.etapa) {
    case 'triagem':
    case 'd0':
      return { rotulo: 'D8', prevista: somarDias(atual.dia, DIAS_D0_D8) };
    case 'd8':
      return { rotulo: 'Inseminação', prevista: somarDias(atual.dia, DIAS_D8_IA) };
    case 'inseminacao':
      return { rotulo: 'DG', prevista: somarDias(atual.dia, DIAS_IA_DG) };
    case 'diagnostico':
      return funil.dg.vazia > 0 ? { rotulo: 'D8 das vazias', prevista: null } : { rotulo: 'DG final', prevista: null };
    case 'dg_final':
      return null;
  }
}

export function resumirLotes(animais: AnimalIatf[]): ResumoLote[] {
  const porLote = new Map<string | null, AnimalIatf[]>();
  for (const a of animais) {
    const l = porLote.get(a.loteId) ?? [];
    l.push(a);
    porLote.set(a.loteId, l);
  }
  return [...porLote.entries()].map(([loteId, lista]) => resumirLote(loteId, lista));
}

export function resumirLote(loteId: string | null, lista: AnimalIatf[]): ResumoLote {
  const funil = calcularFunil(lista);
  const etapas = etapasDoLote(lista);
  const minimo = Math.max(1, Math.ceil(lista.length * FRACAO_MINIMA_ETAPA));
  const relevantes = etapas.filter((e) => e.animais >= minimo);
  const atual = relevantes[relevantes.length - 1] ?? null;
  const cats = new Map<string, number>();
  for (const a of lista) cats.set(a.categoria ?? 'Sem categoria', (cats.get(a.categoria ?? 'Sem categoria') ?? 0) + 1);
  const categoria = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { loteId, animais: lista, categoria, funil, etapas, atual, proxima: proximaEtapa(atual, funil) };
}

// ----------------------------------------------------------------------------
// Quem faltou

export interface Falta {
  etapa: Etapa;
  /** Etapa anterior que o lote teve (base da comparação). */
  anterior: Etapa;
  dia: string;
  animais: AnimalIatf[];
}

const ETAPAS_DO_CICLO: Etapa[] = ['d0', 'd8', 'inseminacao', 'diagnostico'];

/**
 * Para cada etapa do 1º ciclo que o lote já teve: quem tem registro na etapa anterior QUE O
 * LOTE TEVE e não tem registro nesta. Etapa que o lote nunca teve (D8 dos lotes 1–2, ou o
 * futuro) não entra — senão o lote inteiro "faltaria".
 */
export function quemFaltou(r: ResumoLote): Falta[] {
  const minimo = Math.max(1, Math.ceil(r.animais.length * FRACAO_MINIMA_ETAPA));
  const teve = ETAPAS_DO_CICLO.filter((et) => r.etapas.some((e) => e.etapa === et && e.animais >= minimo));
  const registro = (a: AnimalIatf, et: Etapa) => {
    const c = a.ciclos[0];
    if (!c) return false;
    if (et === 'd0') return c.d0.length > 0;
    if (et === 'd8') return c.d8.length > 0;
    if (et === 'inseminacao') return c.inseminacoes.length > 0;
    return c.dg?.etapa === 'diagnostico';
  };
  const out: Falta[] = [];
  for (let i = 1; i < teve.length; i++) {
    const et = teve[i]!;
    const ant = teve[i - 1]!;
    const dia = r.etapas.find((e) => e.etapa === et && e.animais >= minimo)!.dia;
    out.push({ etapa: et, anterior: ant, dia, animais: r.animais.filter((a) => registro(a, ant) && !registro(a, et)) });
  }
  return out;
}

// ----------------------------------------------------------------------------
// GMD do lote (mesma régua da página do Curral: pesagem anterior do mesmo animal)

export function gmdDoLote(
  animais: AnimalIatf[],
  pesagens: PassagemRow[],
  estacao: string,
): { pesoMedio: number | null; comPeso: number; gmd: number | null; comGmd: number } {
  const ids = new Set(animais.map((a) => a.animalId));
  const { inicio, fim } = intervaloEstacao(estacao);
  const anteriores = pesagensAnteriores(pesagens);
  const naEstacao = pesagens.filter((p) => {
    if (!ids.has(p.animal_id) || !pesoValido(p.weight_kg)) return false;
    const d = diaBrt(p.event_at);
    return d >= inicio && d <= fim;
  });
  // A última pesagem de cada animal na estação: peso médio, e GMD dela contra a anterior.
  const ultima = new Map<string, PassagemRow>();
  for (const p of [...naEstacao].sort((a, b) => a.event_at.localeCompare(b.event_at))) ultima.set(p.animal_id, p);
  const gmds = [...ultima.values()].map((p) => anteriores.get(p.id)?.gmd).filter((x): x is number => x != null);
  return { pesoMedio: media([...ultima.values()].map((p) => p.weight_kg!)), comPeso: ultima.size, gmd: media(gmds), comGmd: gmds.length };
}

// ----------------------------------------------------------------------------
// Cenário completo da estação

export interface CenarioIatf {
  estacao: string;
  estacoes: string[];
  descartados: number;
  animais: AnimalIatf[];
}

/** Estações com dado de IATF, mais a atual — a mais recente primeiro. */
export function estacoesDisponiveis(sessoes: IatfSessaoRow[], eventos: IatfEventoRow[], hoje: string): string[] {
  const sessaoById = new Map(sessoes.filter(ehSessaoValida).map((s) => [s.id, s]));
  const set = new Set<string>([estacaoAtual(hoje)]);
  for (const e of eventos) {
    const s = sessaoById.get(e.session_id);
    if (!s || !etapaDe(e.iatf_stage ?? s.iatf_stage)) continue;
    const est = estacaoDe(s.date);
    if (est) set.add(est);
  }
  return [...set].sort().reverse();
}

export function calcularCenarioIatf(
  sessoes: IatfSessaoRow[],
  eventos: IatfEventoRow[],
  animais: IatfAnimalRow[],
  estacao: string,
  hoje: string,
): CenarioIatf {
  const r = eventosDaEstacao(sessoes, eventos, estacao);
  return {
    estacao,
    estacoes: estacoesDisponiveis(sessoes, eventos, hoje),
    descartados: r.descartados,
    animais: montarAnimais(r.eventos, animais),
  };
}
