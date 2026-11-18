// Operações de curral (app curral-nsa): síntese por sessão e ficha animal a animal.
// Funções puras, sem I/O — testáveis fora do Next.

/**
 * Primeiro dia de operação real. Antes disso o banco do Curral só tem a base
 * de teste semeada (ids `c0000000-…`) e os testes do Lucas de 20–22/09.
 */
export const INICIO_OPERACAO_REAL = '2026-09-23';

/** Intervalo entre dois bipes acima disto conta como pausa, não como ritmo. */
export const PAUSA_MS = 15 * 60_000;

/** Peso fora desta faixa é erro de digitação (ex.: 9.820 kg) — fica fora das médias. */
export const PESO_MIN_KG = 30;
export const PESO_MAX_KG = 1200;

export const OP_ORDER = ['pesagem', 'apartacao', 'entrada', 'venda', 'iatf', 'exame'] as const;

export const OP_LABELS: Record<string, string> = {
  pesagem: 'Pesagem',
  apartacao: 'Apartação',
  entrada: 'Entrada',
  venda: 'Venda',
  iatf: 'IATF',
  exame: 'Exame',
};

export const IATF_STAGE_LABELS: Record<string, string> = {
  implante: 'Implante',
  protocolo: 'Protocolo',
  inseminacao: 'Inseminação',
  diagnostico: 'DG',
  dg_final: 'DG final',
};

export const OVARY_LABELS: Record<string, string> = {
  CL: 'Corpo lúteo',
  FOLICULO: 'Folículo',
  ANESTRO: 'Anestro',
};

export interface SessaoRow {
  id: string;
  date: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  ops: string | null;
  lot_id: string | null;
  protocol_name: string | null;
  protocol_items: string | null;
  iatf_stage: string | null;
  default_category: string | null;
  buyer: string | null;
  vet: string | null;
  origin: string | null;
  sale_head_count: number | null;
  sale_total_kg: number | null;
  user_id: string | null;
  notes: string | null;
}

export interface PassagemRow {
  id: string;
  session_id: string;
  animal_id: string;
  event_at: string;
  eid: string | null;
  weight_kg: number | null;
  from_lot_id: string | null;
  to_lot_id: string | null;
  iatf_result: string | null;
  ovary_status: string | null;
  /** numeric no Postgres — PostgREST pode devolver como string. */
  body_score: number | string | null;
  exam_notes: string | null;
  notes: string | null;
  prev_state: string | null;
  bull_id?: string | null;
  implant_lost?: boolean | null;
}

export interface AnimalRow {
  id: string;
  eid: string | null;
  category: string | null;
  sex?: string | null;
  breed?: string | null;
  birth_date?: string | null;
  sisbov_number?: string | null;
}

export interface Tempos {
  /** Primeiro e último bipe — o trabalho de fato, não a abertura/fechamento no app. */
  inicio: string | null;
  fim: string | null;
  duracaoMs: number;
  /** Duração menos as pausas longas. */
  ativoMs: number;
  pausas: number;
  pausaMs: number;
  /** Mediana dos intervalos entre bipes, sem as pausas. */
  ritmoSeg: number | null;
  /** Intervalos válidos — para a mediana geral. */
  intervalosSeg: number[];
}

export interface SessaoResumo {
  sessao: SessaoRow;
  ops: string[];
  animais: number;
  novos: number;
  /** Animal que já existia e saiu de um lote para outro. */
  mudaramLote: number;
  comPeso: number;
  pesoMedio: number | null;
  pesoMin: number | null;
  pesoMax: number | null;
  /** Pesos fora de [PESO_MIN_KG, PESO_MAX_KG], fora das médias. */
  pesosSuspeitos: number;
  /** Animais com pesagem anterior em outra sessão. */
  comPesagemAnterior: number;
  ganhoMedioKg: number | null;
  gmdMedio: number | null;
  tempos: Tempos;
  /** Categoria ATUAL do animal (o evento não grava a da data). */
  categorias: Array<{ categoria: string; n: number }>;
  destinos: Array<{ lotId: string | null; n: number }>;
  prenhas: number;
  vazias: number;
  ovarios: Array<{ status: string; n: number }>;
  eccMedio: number | null;
  comEcc: number;
  exames: number;
}

export interface PassagemDetalhe {
  ordem: number;
  passagem: PassagemRow;
  categoria: string | null;
  novo: boolean;
  pesoValido: boolean;
  /** Segundos desde o bipe anterior da mesma sessão. */
  intervaloSeg: number | null;
  anterior: { pesoKg: number; data: string; dias: number; ganhoKg: number; gmd: number | null } | null;
}

export interface CurralCenario {
  sessoes: SessaoResumo[];
  /** Sessões de teste (antes de INICIO_OPERACAO_REAL) e canceladas, não mostradas. */
  ocultas: number;
  totais: {
    sessoes: number;
    passagens: number;
    animaisDistintos: number;
    ativoMs: number;
    ritmoSeg: number | null;
    pesosSuspeitos: number;
  };
}

export function opsDe(s: SessaoRow): string[] {
  const set = new Set((s.ops ?? '').split(',').map((o) => o.trim()).filter(Boolean));
  return [...OP_ORDER.filter((o) => set.has(o)), ...[...set].filter((o) => !(OP_ORDER as readonly string[]).includes(o))];
}

export function ehNovo(p: PassagemRow): boolean {
  if (!p.prev_state) return false;
  try {
    return JSON.parse(p.prev_state)?.novo === true;
  } catch {
    return false;
  }
}

export function pesoValido(kg: number | null): kg is number {
  return kg != null && kg >= PESO_MIN_KG && kg <= PESO_MAX_KG;
}

function mediana(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function media(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function contar<K>(xs: K[]): Array<{ k: K; n: number }> {
  const m = new Map<K, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
}

export function calcularTempos(passagens: PassagemRow[]): Tempos {
  const ts = passagens.map((p) => Date.parse(p.event_at)).sort((a, b) => a - b);
  if (ts.length === 0) {
    return { inicio: null, fim: null, duracaoMs: 0, ativoMs: 0, pausas: 0, pausaMs: 0, ritmoSeg: null, intervalosSeg: [] };
  }
  let pausas = 0;
  let pausaMs = 0;
  const intervalosSeg: number[] = [];
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i]! - ts[i - 1]!;
    if (d > PAUSA_MS) {
      pausas++;
      pausaMs += d;
    } else {
      intervalosSeg.push(d / 1000);
    }
  }
  const primeiro = ts[0]!;
  const ultimo = ts[ts.length - 1]!;
  const duracaoMs = ultimo - primeiro;
  return {
    inicio: new Date(primeiro).toISOString(),
    fim: new Date(ultimo).toISOString(),
    duracaoMs,
    ativoMs: duracaoMs - pausaMs,
    pausas,
    pausaMs,
    ritmoSeg: mediana(intervalosSeg),
    intervalosSeg,
  };
}

/**
 * Pesagem anterior de cada passagem: a última com peso válido do mesmo animal,
 * em outra sessão e antes dela. Chave = id da passagem.
 */
export function pesagensAnteriores(todas: PassagemRow[]): Map<string, PassagemDetalhe['anterior']> {
  const porAnimal = new Map<string, PassagemRow[]>();
  for (const p of todas) {
    const l = porAnimal.get(p.animal_id) ?? [];
    l.push(p);
    porAnimal.set(p.animal_id, l);
  }
  const out = new Map<string, PassagemDetalhe['anterior']>();
  for (const lista of porAnimal.values()) {
    lista.sort((a, b) => a.event_at.localeCompare(b.event_at));
    for (let i = 0; i < lista.length; i++) {
      const atual = lista[i]!;
      if (!pesoValido(atual.weight_kg)) continue;
      for (let j = i - 1; j >= 0; j--) {
        const ant = lista[j]!;
        if (ant.session_id === atual.session_id || !pesoValido(ant.weight_kg)) continue;
        const dias = (Date.parse(atual.event_at) - Date.parse(ant.event_at)) / 86_400_000;
        const ganhoKg = atual.weight_kg - ant.weight_kg;
        out.set(atual.id, {
          pesoKg: ant.weight_kg,
          data: ant.event_at,
          dias: Math.round(dias),
          ganhoKg,
          gmd: dias >= 1 ? ganhoKg / dias : null,
        });
        break;
      }
    }
  }
  return out;
}

function resumir(
  sessao: SessaoRow,
  passagens: PassagemRow[],
  categoriaDe: Map<string, string | null>,
  anteriores: Map<string, PassagemDetalhe['anterior']>,
): SessaoResumo {
  const pesos = passagens.map((p) => p.weight_kg).filter(pesoValido);
  const ganhos = passagens.map((p) => anteriores.get(p.id)).filter((a): a is NonNullable<typeof a> => a != null);
  const ecc = passagens
    .map((p) => (p.body_score == null ? null : Number(p.body_score)))
    .filter((x): x is number => x != null && Number.isFinite(x));

  return {
    sessao,
    ops: opsDe(sessao),
    animais: passagens.length,
    novos: passagens.filter(ehNovo).length,
    mudaramLote: passagens.filter((p) => !ehNovo(p) && p.from_lot_id != null && p.from_lot_id !== p.to_lot_id).length,
    comPeso: pesos.length,
    pesoMedio: media(pesos),
    pesoMin: pesos.length ? Math.min(...pesos) : null,
    pesoMax: pesos.length ? Math.max(...pesos) : null,
    pesosSuspeitos: passagens.filter((p) => p.weight_kg != null && !pesoValido(p.weight_kg)).length,
    comPesagemAnterior: ganhos.length,
    ganhoMedioKg: media(ganhos.map((g) => g.ganhoKg)),
    gmdMedio: media(ganhos.map((g) => g.gmd).filter((x): x is number => x != null)),
    tempos: calcularTempos(passagens),
    categorias: contar(passagens.map((p) => categoriaDe.get(p.animal_id) ?? 'Sem categoria')).map(({ k, n }) => ({
      categoria: k,
      n,
    })),
    destinos: contar(passagens.map((p) => p.to_lot_id)).map(({ k, n }) => ({ lotId: k, n })),
    prenhas: passagens.filter((p) => p.iatf_result === 'PRENHA').length,
    vazias: passagens.filter((p) => p.iatf_result === 'VAZIA').length,
    ovarios: contar(passagens.map((p) => p.ovary_status).filter((x): x is string => !!x)).map(({ k, n }) => ({
      status: k,
      n,
    })),
    eccMedio: media(ecc),
    comEcc: ecc.length,
    exames: passagens.filter((p) => p.exam_notes?.trim()).length,
  };
}

export function ehSessaoReal(s: SessaoRow): boolean {
  return s.date >= INICIO_OPERACAO_REAL && s.status !== 'cancelada';
}

/**
 * Síntese das sessões reais. `todasPassagens` deve trazer o histórico inteiro
 * (não só o da janela), para achar a pesagem anterior de cada animal.
 */
export function calcularCenarioCurral(
  sessoes: SessaoRow[],
  todasPassagens: PassagemRow[],
  animais: AnimalRow[],
  janela?: { start: string; end: string },
): CurralCenario {
  const categoriaDe = new Map(animais.map((a) => [a.id, a.category]));
  const anteriores = pesagensAnteriores(todasPassagens);
  const porSessao = new Map<string, PassagemRow[]>();
  for (const p of todasPassagens) {
    const l = porSessao.get(p.session_id) ?? [];
    l.push(p);
    porSessao.set(p.session_id, l);
  }

  const reais = sessoes.filter(ehSessaoReal);
  const naJanela = janela ? reais.filter((s) => s.date >= janela.start && s.date <= janela.end) : reais;
  const resumos = naJanela
    .map((s) => resumir(s, porSessao.get(s.id) ?? [], categoriaDe, anteriores))
    .sort((a, b) => b.sessao.started_at.localeCompare(a.sessao.started_at));

  const animaisDistintos = new Set<string>();
  for (const r of resumos) for (const p of porSessao.get(r.sessao.id) ?? []) animaisDistintos.add(p.animal_id);

  return {
    sessoes: resumos,
    ocultas: sessoes.length - reais.length,
    totais: {
      sessoes: resumos.length,
      passagens: resumos.reduce((a, r) => a + r.animais, 0),
      animaisDistintos: animaisDistintos.size,
      ativoMs: resumos.reduce((a, r) => a + r.tempos.ativoMs, 0),
      ritmoSeg: mediana(resumos.flatMap((r) => r.tempos.intervalosSeg)),
      pesosSuspeitos: resumos.reduce((a, r) => a + r.pesosSuspeitos, 0),
    },
  };
}

/** Ficha animal a animal de uma sessão, na ordem dos bipes. */
export function detalharSessao(
  sessaoId: string,
  todasPassagens: PassagemRow[],
  animais: AnimalRow[],
): PassagemDetalhe[] {
  const categoriaDe = new Map(animais.map((a) => [a.id, a.category]));
  const anteriores = pesagensAnteriores(todasPassagens);
  const lista = todasPassagens
    .filter((p) => p.session_id === sessaoId)
    .sort((a, b) => a.event_at.localeCompare(b.event_at));
  return lista.map((p, i) => ({
    ordem: i + 1,
    passagem: p,
    categoria: categoriaDe.get(p.animal_id) ?? null,
    novo: ehNovo(p),
    pesoValido: pesoValido(p.weight_kg),
    intervaloSeg: i > 0 ? (Date.parse(p.event_at) - Date.parse(lista[i - 1]!.event_at)) / 1000 : null,
    anterior: anteriores.get(p.id) ?? null,
  }));
}

// ----------------------------------------------------------------------------
// Exportação para Excel

export function rotuloOps(r: SessaoResumo): string[] {
  return r.ops.map((o) =>
    o === 'iatf' && r.sessao.iatf_stage
      ? `IATF · ${IATF_STAGE_LABELS[r.sessao.iatf_stage] ?? r.sessao.iatf_stage}`
      : OP_LABELS[o] ?? o,
  );
}

export type CelulaExport = string | number | Date | null;

export interface AbaExport {
  nome: string;
  /** `formato` = formato numérico do Excel, aplicado à coluna inteira. */
  colunas: Array<{ titulo: string; largura: number; formato?: string }>;
  linhas: CelulaExport[][];
}

const F_DATA = 'dd/mm/yyyy';
const F_DATA_HORA = 'dd/mm/yyyy hh:mm:ss';

/**
 * A planilha não tem fuso: grava o relógio de Brasília como se fosse UTC, que é
 * como as libs de xlsx leem um Date. Brasil sem horário de verão = -3h fixo.
 */
function horaBrt(iso: string | null): Date | null {
  return iso ? new Date(Date.parse(iso) - 3 * 3_600_000) : null;
}

function dia(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

const arred = (x: number | null, casas: number) => (x == null ? null : Number(x.toFixed(casas)));
const minutos = (ms: number) => Math.round(ms / 60_000);

/**
 * Duas abas: uma linha por sessão e uma linha por passagem, para as sessões do
 * cenário (já filtrado pelo período). Valores crus — número é número, brinco
 * inteiro e como texto — para servir de base a filtro e tabela dinâmica.
 */
export function montarExportacao(
  cenario: CurralCenario,
  todasPassagens: PassagemRow[],
  animais: AnimalRow[],
  loteById: Map<string, { nome: string; piquete: string | null }>,
  usuarioById: Map<string, string>,
  touroById: Map<string, string>,
): AbaExport[] {
  const animalDe = new Map(animais.map((a) => [a.id, a]));
  const anteriores = pesagensAnteriores(todasPassagens);
  const porSessao = new Map<string, PassagemRow[]>();
  for (const p of todasPassagens) {
    const l = porSessao.get(p.session_id) ?? [];
    l.push(p);
    porSessao.set(p.session_id, l);
  }
  const lote = (id: string | null) => (id ? loteById.get(id)?.nome ?? null : null);
  // Mais antiga primeiro: é a ordem em que a planilha vai crescendo.
  const resumos = [...cenario.sessoes].reverse();

  const sessoes: AbaExport = {
    nome: 'Sessões',
    colunas: [
      { titulo: 'Data', largura: 12, formato: F_DATA },
      { titulo: 'Lote', largura: 22 },
      { titulo: 'Piquete', largura: 12 },
      { titulo: 'Operações', largura: 28 },
      { titulo: 'Status', largura: 10 },
      { titulo: 'Quem conduziu', largura: 16 },
      { titulo: 'Animais', largura: 10 },
      { titulo: 'Novos', largura: 8 },
      { titulo: 'Mudaram de lote', largura: 16 },
      { titulo: 'Com peso', largura: 10 },
      { titulo: 'Peso médio (kg)', largura: 15, formato: '0.0' },
      { titulo: 'Peso mínimo (kg)', largura: 16 },
      { titulo: 'Peso máximo (kg)', largura: 16 },
      { titulo: 'Pesos fora da faixa', largura: 18 },
      { titulo: 'Com pesagem anterior', largura: 20 },
      { titulo: 'Ganho médio (kg)', largura: 16, formato: '0.0' },
      { titulo: 'GMD médio (kg/dia)', largura: 18, formato: '0.000' },
      { titulo: 'Prenhas', largura: 9 },
      { titulo: 'Vazias', largura: 8 },
      { titulo: 'ECC médio', largura: 10, formato: '0.0' },
      { titulo: 'Primeiro bipe', largura: 19, formato: F_DATA_HORA },
      { titulo: 'Último bipe', largura: 19, formato: F_DATA_HORA },
      { titulo: 'Tempo de curral (min)', largura: 20 },
      { titulo: 'Pausas', largura: 8 },
      { titulo: 'Tempo em pausa (min)', largura: 20 },
      { titulo: 'Ritmo (s por animal)', largura: 19 },
      { titulo: 'Protocolo sanitário', largura: 24 },
      { titulo: 'Itens do protocolo', largura: 36 },
      { titulo: 'Categoria de entrada', largura: 20 },
      { titulo: 'Origem', largura: 18 },
      { titulo: 'Veterinário', largura: 18 },
      { titulo: 'Comprador', largura: 18 },
      { titulo: 'Venda (cab)', largura: 12 },
      { titulo: 'Venda (kg)', largura: 12 },
      { titulo: 'Aberta no app', largura: 19, formato: F_DATA_HORA },
      { titulo: 'Fechada no app', largura: 19, formato: F_DATA_HORA },
      { titulo: 'Obs.', largura: 40 },
    ],
    linhas: resumos.map((r) => {
      const s = r.sessao;
      return [
        dia(s.date),
        lote(s.lot_id),
        s.lot_id ? loteById.get(s.lot_id)?.piquete ?? null : null,
        rotuloOps(r).join(', '),
        s.status.charAt(0).toUpperCase() + s.status.slice(1),
        s.user_id ? usuarioById.get(s.user_id) ?? null : null,
        r.animais,
        r.novos,
        r.mudaramLote,
        r.comPeso,
        arred(r.pesoMedio, 1),
        r.pesoMin,
        r.pesoMax,
        r.pesosSuspeitos,
        r.comPesagemAnterior,
        arred(r.ganhoMedioKg, 1),
        arred(r.gmdMedio, 3),
        r.prenhas,
        r.vazias,
        arred(r.eccMedio, 1),
        horaBrt(r.tempos.inicio),
        horaBrt(r.tempos.fim),
        r.animais > 1 ? minutos(r.tempos.ativoMs) : null,
        r.tempos.pausas,
        minutos(r.tempos.pausaMs),
        arred(r.tempos.ritmoSeg, 0),
        s.protocol_name,
        (s.protocol_items ?? '').split('\n').map((x) => x.trim()).filter(Boolean).join('; ') || null,
        s.default_category,
        s.origin,
        s.vet,
        s.buyer,
        s.sale_head_count,
        s.sale_total_kg,
        horaBrt(s.started_at),
        horaBrt(s.closed_at),
        s.notes,
      ];
    }),
  };

  const passagens: AbaExport = {
    nome: 'Passagens',
    colunas: [
      { titulo: 'Data da sessão', largura: 14, formato: F_DATA },
      { titulo: 'Lote da sessão', largura: 22 },
      { titulo: 'Operações', largura: 28 },
      { titulo: 'Ordem', largura: 8 },
      { titulo: 'Bipe', largura: 19, formato: F_DATA_HORA },
      { titulo: 'Brinco', largura: 20 },
      { titulo: 'Categoria (hoje)', largura: 18 },
      { titulo: 'Sexo', largura: 8 },
      { titulo: 'Raça', largura: 12 },
      { titulo: 'Nascimento', largura: 12, formato: F_DATA },
      { titulo: 'SISBOV', largura: 18 },
      { titulo: 'Novo', largura: 7 },
      { titulo: 'Peso (kg)', largura: 10 },
      { titulo: 'Peso fora da faixa', largura: 17 },
      { titulo: 'Peso anterior (kg)', largura: 17 },
      { titulo: 'Pesagem anterior', largura: 16, formato: F_DATA },
      { titulo: 'Dias desde a anterior', largura: 19 },
      { titulo: 'Ganho (kg)', largura: 11, formato: '0.0' },
      { titulo: 'GMD (kg/dia)', largura: 13, formato: '0.000' },
      { titulo: 'IATF', largura: 9 },
      { titulo: 'Ovário', largura: 13 },
      { titulo: 'ECC', largura: 7 },
      { titulo: 'Touro', largura: 18 },
      { titulo: 'Perdeu implante', largura: 15 },
      { titulo: 'Lote de origem', largura: 22 },
      { titulo: 'Lote de destino', largura: 22 },
      { titulo: 'Intervalo (s)', largura: 12 },
      { titulo: 'Exame', largura: 30 },
      { titulo: 'Obs.', largura: 40 },
    ],
    linhas: resumos.flatMap((r) => {
      const s = r.sessao;
      const lista = [...(porSessao.get(s.id) ?? [])].sort((a, b) => a.event_at.localeCompare(b.event_at));
      const ops = rotuloOps(r).join(', ');
      return lista.map((p, i): CelulaExport[] => {
        const ant = anteriores.get(p.id) ?? null;
        const ecc = p.body_score == null ? null : Number(p.body_score);
        const a = animalDe.get(p.animal_id);
        return [
          dia(s.date),
          lote(s.lot_id),
          ops,
          i + 1,
          horaBrt(p.event_at),
          p.eid,
          a?.category ?? null,
          a?.sex === 'M' ? 'Macho' : a?.sex === 'F' ? 'Fêmea' : a?.sex ?? null,
          a?.breed ?? null,
          a?.birth_date ? dia(a.birth_date) : null,
          a?.sisbov_number ?? null,
          ehNovo(p) ? 'Sim' : 'Não',
          p.weight_kg,
          p.weight_kg != null && !pesoValido(p.weight_kg) ? 'Sim' : null,
          ant ? ant.pesoKg : null,
          ant ? dia(horaBrt(ant.data)!.toISOString()) : null,
          ant ? ant.dias : null,
          ant ? arred(ant.ganhoKg, 1) : null,
          ant ? arred(ant.gmd, 3) : null,
          p.iatf_result === 'PRENHA' ? 'Prenha' : p.iatf_result === 'VAZIA' ? 'Vazia' : p.iatf_result,
          p.ovary_status ? OVARY_LABELS[p.ovary_status] ?? p.ovary_status : null,
          ecc != null && Number.isFinite(ecc) ? ecc : null,
          p.bull_id ? touroById.get(p.bull_id) ?? null : null,
          p.implant_lost == null ? null : p.implant_lost ? 'Sim' : 'Não',
          lote(p.from_lot_id),
          lote(p.to_lot_id),
          i > 0 ? Math.round((Date.parse(p.event_at) - Date.parse(lista[i - 1]!.event_at)) / 1000) : null,
          p.exam_notes?.trim() || null,
          p.notes?.trim() || null,
        ];
      });
    }),
  };

  return [sessoes, passagens];
}
