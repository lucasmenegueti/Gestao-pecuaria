import type * as SQLite from 'expo-sqlite';
import { effectiveWeightKg } from '@/constants';
import { loadBombonaExpectations, daysBetween, type BombonaExpectation } from '@/lib/bombona';

// Retrato de um piquete e do lote que está nele hoje — a Ficha do Piquete.
//
// Duas coisas moldaram este arquivo mais do que qualquer outra:
//
// 1. LOTE NÃO É UMA ENTIDADE. Não existe tabela de lote: um lote é o conteúdo de
//    `herd` pra aquele piquete, e ele se divide e se funde a cada movimentação.
//    Consequência prática: a pesagem fica no PIQUETE, não segue o gado. Quando um
//    lote muda de piquete, o GMD dele recomeça do zero. Seguir lote entre piquetes
//    exigiria um identificador de lote de verdade.
//
// 2. CONSUMO SE MEDE ANCORADO NOS ABASTECIMENTOS, não em dias corridos — ver
//    `supplementRate` abaixo, onde a medição está registrada.

/**
 * 1 arroba = 30 kg de PESO VIVO — convenção da fazenda, definida pelo Lucas.
 * Equivale a 15 kg de carcaça com 50% de rendimento; a vantagem de fixar em peso
 * vivo é que a tela deixa de carregar premissa de rendimento própria.
 *
 * Efeito colateral bonito: como são 30 kg por arroba e ~30 dias no mês, o GMD em
 * kg/dia é numericamente o mesmo que o ganho em @/mês.
 */
const KG_PER_ARROBA_LIVE = 30;

/**
 * Categorias que NÃO entram na conta de consumo por cabeça: bezerro mamando
 * ainda mama e não come do cocho. Incluí-los dilui a média — no P47 são 6 de 13
 * cabeças, o que separa 533 de 989 g/cab/dia.
 */
const SUPPLEMENT_EXCLUDED_CATEGORIES = new Set(['BEZERRO MAMANDO', 'BEZERRA MAMANDO']);

/** Tipo de capim que marca curral de confinamento (ver `docs/ARQUITETURA-E-DADOS.md`). */
const CONFINEMENT_GRASS = 'Confinamento';

/** Abaixo disso a média de consumo ganha selo de "estimativa inicial". */
const RESTOCKS_FOR_CONFIDENCE = 4;

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Entrada do lote
// ---------------------------------------------------------------------------

interface Delta {
  date: string;
  category: string;
  delta: number;
  /** Ordinal do evento que gerou o delta. Uma EVOLUCAO gera dois deltas com o
   *  mesmo ordinal (saída da origem, entrada no destino) — é por ele que a
   *  herança de coorte sabe onde parar. */
  evt: number;
  /** Quando o delta positivo veio de uma EVOLUCAO, a categoria de origem. */
  evolutionFrom?: string;
}

/**
 * Converte os `herd_events` que tocam o piquete em deltas por categoria.
 *
 * Convenções do ledger (ver as telas em `app/admin/`):
 *  - TRANSFERENCIA: `paddock_id` é a origem, `target_paddock_id` o destino.
 *  - ALOCACAO: vem do pool (`paddock_id` NULL) pro `target_paddock_id`.
 *  - DESALOCACAO / MORTE / CONSUMO: saem do `paddock_id`.
 *  - NASCIMENTO: entra no `paddock_id`.
 *  - ABORTO: indicador reprodutivo, não mexe no rebanho — cai no `default`.
 *  - EVOLUCAO: fica no mesmo piquete e troca a categoria — `category` é a de
 *    origem e `notes` traz "ORIGEM → DESTINO" (com sufixo " · obs" opcional).
 *  - COMPRA / VENDA: sempre no pool, nunca tocam piquete.
 */
function toDeltas(
  rows: Array<{
    date: string; event_type: string; category: string; head_count: number;
    notes: string | null; paddock_id: number | null; target_paddock_id: number | null;
  }>,
  paddockId: number,
): Delta[] {
  const out: Delta[] = [];
  rows.forEach((e, evt) => {
    const isSource = e.paddock_id === paddockId;
    const isTarget = e.target_paddock_id === paddockId;
    switch (e.event_type) {
      case 'TRANSFERENCIA':
        if (isTarget) out.push({ date: e.date, category: e.category, delta: e.head_count, evt });
        if (isSource) out.push({ date: e.date, category: e.category, delta: -e.head_count, evt });
        break;
      case 'ALOCACAO':
        if (isTarget) out.push({ date: e.date, category: e.category, delta: e.head_count, evt });
        break;
      case 'NASCIMENTO':
        if (isSource) out.push({ date: e.date, category: e.category, delta: e.head_count, evt });
        break;
      case 'DESALOCACAO':
      case 'MORTE':
      case 'CONSUMO':
        if (isSource) out.push({ date: e.date, category: e.category, delta: -e.head_count, evt });
        break;
      case 'EVOLUCAO': {
        if (!isSource) break;
        out.push({ date: e.date, category: e.category, delta: -e.head_count, evt });
        const to = parseEvolutionTarget(e.notes);
        if (to) {
          out.push({ date: e.date, category: to, delta: e.head_count, evt, evolutionFrom: e.category });
        }
        break;
      }
      default:
        break;
    }
  });
  return out;
}

/** `notes` de EVOLUCAO é "ORIGEM → DESTINO" ou "ORIGEM → DESTINO · observação". */
function parseEvolutionTarget(notes: string | null): string | null {
  if (!notes) return null;
  const arrow = notes.indexOf('→');
  if (arrow < 0) return null;
  return notes.slice(arrow + 1).split('·')[0].trim() || null;
}

/**
 * Data em que a coorte atual daquela categoria entrou no piquete.
 *
 * Anda o ledger pra frente somando o saldo da categoria e guarda a ÚLTIMA vez
 * que o saldo saiu de zero — tudo antes disso é gado que já foi embora. Pegar
 * simplesmente o evento de chegada mais recente erra feio: no T34 - P02 daria
 * "há 4 dias" pra um piquete ocupado desde 22/07.
 *
 * Quando a coorte nasce de uma EVOLUCAO (garrote virou boi sem sair do lugar),
 * herda a data da categoria de origem — senão um lote de 82 dias apareceria
 * como recém-chegado só porque mudou de nome.
 *
 * Duas sutilezas que os dados de produção obrigaram:
 *
 *  - O SALDO É TRAVADO EM ZERO. O ledger fica negativo quando a mesma saída foi
 *    lançada duas vezes (aconteceu no P47 em maio: 5 vacas paridas desalocadas e
 *    transferidas). Sem a trava, o saldo negativo engolia a coorte legítima de
 *    agosto e a entrada saía como "sem registro". Piquete não guarda gado negativo.
 *
 *  - A HERANÇA PARA ANTES DO PRÓPRIO EVENTO DE EVOLUCAO (`evt` exclusivo). A
 *    EVOLUCAO fecha a categoria de origem no mesmo evento em que abre a de
 *    destino; olhar até o delta anterior ainda enxergaria esse fechamento e
 *    devolveria nulo.
 */
function cohortStart(deltas: Delta[], category: string, upToEvt: number, depth = 0): string | null {
  let balance = 0;
  let start: string | null = null;
  let startEvt = -1;
  let startFrom: string | undefined;

  for (const d of deltas) {
    if (d.evt >= upToEvt) break;
    if (d.category !== category) continue;
    if (balance === 0 && d.delta > 0) {
      start = d.date;
      startEvt = d.evt;
      startFrom = d.evolutionFrom;
    }
    balance = Math.max(0, balance + d.delta);
    if (balance === 0) {
      start = null;
      startEvt = -1;
      startFrom = undefined;
    }
  }

  // Profundidade limitada pela cadeia de CATEGORY_EVOLUTIONS (bezerro→boi são 3
  // saltos); o teto evita loop se algum dado descrever um ciclo.
  if (start && startFrom && depth < 6) {
    const inherited = cohortStart(deltas, startFrom, startEvt, depth + 1);
    if (inherited) return inherited;
  }
  return start;
}

// ---------------------------------------------------------------------------
// Tipos do retorno
// ---------------------------------------------------------------------------

export interface LoteCategory {
  category: string;
  heads: number;
  /** Peso vindo de `herd.avg_weight_kg`; null = caiu na tabela de referência. */
  measuredWeightKg: number | null;
  weightKg: number;
  /** Entrada desta categoria — pode diferir das outras num lote formado em etapas. */
  entryDate: string | null;
}

export interface SupplementRate {
  /** Sacos por dia, ancorado nos abastecimentos. */
  sacksPerDay: number;
  kgPerDay: number;
  /** Cabeças consideradas: exclui as que mamam (ver SUPPLEMENT_EXCLUDED_CATEGORIES). */
  headsCounted: number;
  gramsPerHeadDay: number;
  /**
   * Alvo cadastrado na fórmula, lido como GRAMAS POR CABEÇA/DIA.
   *
   * A coluna se chama `target_g_per_kg_body_day` e a tela de Configurações rotula
   * "g/kg PV/dia", mas o cadastro real da fazenda é por cabeça — foi o Lucas quem
   * definiu a leitura. Fórmulas antigas gravadas abaixo de 1 (ex.: "Probeef
   * Reprodução" com 0,25) são resquício da unidade anterior e vão gerar razão
   * absurda até o cadastro ser corrigido.
   */
  targetGramsPerHeadDay: number | null;
  /** Quantas vezes o alvo o consumo medido representa. Null sem alvo utilizável. */
  ratioToTarget: number | null;
  restockCount: number;
  /** Verdadeiro com poucos abastecimentos: o número aparece, mas marcado. */
  provisional: boolean;
  firstDate: string;
  lastDate: string;
  spanDays: number;
  sacksCounted: number;
  formulaNames: string[];
  events: Array<{ date: string; sacks: number; formulaName: string | null }>;
}

export interface WeightAnchor {
  date: string;
  weightKg: number;
  /** Quantas leituras foram promediadas nesse dia. */
  readings: number;
}

export interface Gmd {
  category: string;
  kgPerDay: number;
  totalGainKg: number;
  spanDays: number;
  anchors: WeightAnchor[];
}

export interface SituationRow {
  key: string;
  label: string;
  date: string | null;
  detail: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}

export interface MoveRow {
  date: string;
  direction: 'in' | 'out';
  text: string;
}

export interface PaddockInfo {
  paddockId: number;
  name: string;
  areaHectares: number;
  grassName: string;
  isConfinement: boolean;

  heads: number;
  categories: LoteCategory[];
  entryDate: string | null;
  daysInPaddock: number;
  /** Categorias entraram em datas diferentes. */
  staggeredEntry: boolean;

  avgWeightKg: number;
  /** Peso médio por cabeça em arroba de peso vivo (kg ÷ 30). */
  avgArroba: number;
  /** Alguma categoria usou peso de tabela em vez de pesagem. */
  usesReferenceWeight: boolean;

  supplement: SupplementRate | null;
  /** Motivo de não haver média — orienta o estado vazio da tela. */
  supplementGap: 'confinamento' | 'sem_entrada' | 'sem_registro' | 'poucos_abastecimentos' | null;
  bombonas: BombonaExpectation[];

  gmd: Gmd | null;
  /** Ganho por cabeça em @ desde a primeira pesagem do lote. */
  arrobaGainPerHead: number | null;

  situation: SituationRow[];
  rondaCount: number;
  lastRondaDate: string | null;
  moves: MoveRow[];
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

export async function loadPaddockInfo(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
): Promise<PaddockInfo | null> {
  const paddock = await db.getFirstAsync<{
    id: number; name: string; area_hectares: number; grass_name: string;
  }>(
    `SELECT p.id, p.name, p.area_hectares, gt.name AS grass_name
       FROM paddocks p JOIN grass_types gt ON gt.id = p.grass_type_id
      WHERE p.id = ?`,
    [paddockId]
  );
  if (!paddock) return null;

  const isConfinement = paddock.grass_name === CONFINEMENT_GRASS;
  const today = todayIsoDate();

  // ---- lote ----
  const herdRows = await db.getAllAsync<{
    category: string; head_count: number; avg_weight_kg: number | null;
  }>(
    `SELECT category, head_count, avg_weight_kg FROM herd
      WHERE paddock_id = ? AND head_count > 0 AND deleted_at IS NULL`,
    [paddockId]
  );

  const eventRows = await db.getAllAsync<{
    date: string; event_type: string; category: string; head_count: number;
    notes: string | null; paddock_id: number | null; target_paddock_id: number | null;
  }>(
    `SELECT date, event_type, category, head_count, notes, paddock_id, target_paddock_id
       FROM herd_events
      WHERE (paddock_id = ? OR target_paddock_id = ?) AND deleted_at IS NULL
      ORDER BY date, id`,
    [paddockId, paddockId]
  );
  const deltas = toDeltas(eventRows, paddockId);

  const categories: LoteCategory[] = herdRows.map((r) => ({
    category: r.category,
    heads: r.head_count,
    measuredWeightKg: r.avg_weight_kg && r.avg_weight_kg > 0 ? r.avg_weight_kg : null,
    weightKg: effectiveWeightKg(r.category, r.avg_weight_kg),
    entryDate: cohortStart(deltas, r.category, eventRows.length),
  })).sort((a, b) => b.heads - a.heads);

  const heads = categories.reduce((s, c) => s + c.heads, 0);
  const bodyWeightKg = categories.reduce((s, c) => s + c.heads * c.weightKg, 0);
  const usesReferenceWeight = categories.some((c) => c.measuredWeightKg === null);

  const entryDates = categories.map((c) => c.entryDate).filter((d): d is string => !!d);
  entryDates.sort();
  const entryDate = entryDates.length ? entryDates[0] : null;
  const staggeredEntry = entryDates.length > 1 && entryDates[0] !== entryDates[entryDates.length - 1];

  // ---- consumo ----
  // Sem data de entrada não dá pra atribuir consumo a ESTE lote: a janela abriria
  // pro histórico inteiro do piquete e a média misturaria lotes que já foram
  // embora — número plausível e errado, ao lado de "sem registro de entrada".
  // Cabeças que de fato comem do cocho — mamando fica de fora.
  const supplementHeads = categories
    .filter((c) => !SUPPLEMENT_EXCLUDED_CATEGORIES.has(c.category))
    .reduce((sum, c) => sum + c.heads, 0);

  const supplement = isConfinement || !entryDate
    ? null
    : await supplementRate(db, paddockId, entryDate, supplementHeads);
  let supplementGap: PaddockInfo['supplementGap'] = null;
  if (isConfinement) supplementGap = 'confinamento';
  else if (!entryDate) supplementGap = 'sem_entrada';
  else if (!supplement) {
    const any = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM supplement_evals se JOIN rondas r ON r.id = se.ronda_id
        WHERE r.paddock_id = ? AND se.restocked = 1 AND se.sacks_in_trough > 0
          AND se.deleted_at IS NULL AND (? IS NULL OR r.date >= ?)`,
      [paddockId, entryDate, entryDate]
    );
    supplementGap = (any?.n ?? 0) > 0 ? 'poucos_abastecimentos' : 'sem_registro';
  }

  const bombonas = isConfinement ? [] : await loadBombonaExpectations(db, paddockId);

  // ---- desempenho ----
  // Mesma razão do consumo: sem entrada, pesagem do lote anterior entraria na conta.
  const gmd = entryDate ? await loadGmd(db, paddockId, entryDate, categories) : null;

  // Ganho em @ só quando há GMD; a categoria pesada é a que ganhou o peso, então
  // não precisa casar com a dominante — o número é rotulado com ela na tela.
  const arrobaGainPerHead = gmd ? gmd.totalGainKg / KG_PER_ARROBA_LIVE : null;

  // ---- situação ----
  const situation = await loadSituation(db, paddockId);
  const rondas = await db.getFirstAsync<{ n: number; last: string | null }>(
    `SELECT COUNT(*) AS n, MAX(date) AS last FROM rondas WHERE paddock_id = ? AND deleted_at IS NULL`,
    [paddockId]
  );

  return {
    paddockId,
    name: paddock.name,
    areaHectares: paddock.area_hectares,
    grassName: paddock.grass_name,
    isConfinement,
    heads,
    categories,
    entryDate,
    daysInPaddock: entryDate ? daysBetween(entryDate, today) : 0,
    staggeredEntry,
    avgWeightKg: heads > 0 ? bodyWeightKg / heads : 0,
    avgArroba: heads > 0 ? bodyWeightKg / heads / KG_PER_ARROBA_LIVE : 0,
    usesReferenceWeight,
    supplement,
    supplementGap,
    bombonas,
    gmd,
    arrobaGainPerHead,
    situation,
    rondaCount: rondas?.n ?? 0,
    lastRondaDate: rondas?.last ?? null,
    moves: toMoves(eventRows, paddockId),
  };
}

/**
 * Consumo médio de suplemento, ANCORADO NOS ABASTECIMENTOS.
 *
 * Soma os sacos que foram pro cocho EXCETO os do último abastecimento e divide
 * pelo intervalo entre o primeiro e o último. O último saco ainda não foi comido;
 * incluí-lo é o que inflava a conta.
 *
 * Por que não dividir por dias corridos: saco vai pro cocho em pedaços e o gado
 * come ao longo de vários dias. Uma janela que começa logo depois de um
 * abastecimento e acaba antes do próximo conta ração que ainda está no cocho —
 * e um saco de 30 kg num lote de 13 cabeças é quatro dias de consumo, então o
 * arredondamento sozinho domina.
 *
 * Medido em produção (15 janelas com rebanho constante por 25+ dias, comparando
 * a estimativa curta contra a do período inteiro):
 *
 *     estimador          janela     erro mediano
 *     simples             5 dias        51%
 *     simples            10 dias        28%
 *     simples            14 dias        31%   <- esperar não compra nada
 *     ancorado            5 dias        22%   <- melhor que simples com 14
 *
 * Daí a trava ser 2 ABASTECIMENTOS e não N dias: o critério se ajusta sozinho ao
 * tamanho do lote (140 cabeças chegam a 2 abastecimentos em 2 dias; um lote que
 * consome devagar demora, e é assim que tem que ser).
 */
async function supplementRate(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
  entryDate: string,
  heads: number,
): Promise<SupplementRate | null> {
  const rows = await db.getAllAsync<{
    date: string; sacks: number; kg: number; formula_name: string | null; target: number | null;
  }>(
    `SELECT r.date AS date,
            SUM(se.sacks_in_trough) AS sacks,
            SUM(se.sacks_in_trough * COALESCE(f.kg_per_sack, 0)) AS kg,
            MIN(f.name) AS formula_name,
            MIN(f.target_g_per_kg_body_day) AS target
       FROM supplement_evals se
       JOIN rondas r ON r.id = se.ronda_id
       LEFT JOIN formulas f ON f.id = se.formula_id
      WHERE r.paddock_id = ? AND se.restocked = 1 AND se.sacks_in_trough > 0
        AND se.deleted_at IS NULL AND r.deleted_at IS NULL
        AND (? IS NULL OR r.date >= ?)
      GROUP BY r.date
      ORDER BY r.date`,
    [paddockId, entryDate, entryDate]
  );

  if (rows.length < 2) return null;

  const first = rows[0];
  const last = rows[rows.length - 1];
  const spanDays = daysBetween(first.date, last.date);
  if (spanDays <= 0) return null;

  // Tudo menos o último abastecimento — esse ainda está no cocho.
  const counted = rows.slice(0, -1);
  const sacksCounted = counted.reduce((s, r) => s + r.sacks, 0);
  const kgCounted = counted.reduce((s, r) => s + r.kg, 0);
  if (kgCounted <= 0) return null;

  const kgPerDay = kgCounted / spanDays;
  const names = Array.from(
    new Set(rows.map((r) => r.formula_name).filter((n): n is string => !!n))
  );
  const gramsPerHeadDay = heads > 0 ? (kgPerDay * 1000) / heads : 0;

  // Alvo do abastecimento mais recente: é a fórmula que está no cocho agora.
  // Valores abaixo de 1 são resquício da unidade antiga (g/kg de peso vivo) e
  // não servem de régua por cabeça — melhor não ter alvo do que ter um falso.
  const rawTarget = rows[rows.length - 1].target;
  const target = rawTarget != null && rawTarget >= 1 ? rawTarget : null;

  return {
    sacksPerDay: sacksCounted / spanDays,
    kgPerDay,
    headsCounted: heads,
    gramsPerHeadDay,
    targetGramsPerHeadDay: target,
    ratioToTarget: target ? gramsPerHeadDay / target : null,
    restockCount: rows.length,
    provisional: rows.length < RESTOCKS_FOR_CONFIDENCE,
    firstDate: first.date,
    lastDate: last.date,
    spanDays,
    sacksCounted,
    formulaNames: names,
    events: rows
      .slice()
      .reverse()
      .map((r) => ({ date: r.date, sacks: r.sacks, formulaName: r.formula_name })),
  };
}

/**
 * GMD da categoria dominante, a partir das pesagens visuais feitas NESTE piquete
 * desde a entrada do lote.
 *
 * Restrição herdada do modelo: a pesagem fica no piquete. Um lote que mudou de
 * piquete recomeça sem histórico, e não há como reconstruí-lo sem identidade de
 * lote. Por isso a janela é sempre "desde a entrada" — pegar pesagem anterior
 * misturaria o gado que estava aqui antes.
 */
async function loadGmd(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
  entryDate: string,
  categories: LoteCategory[],
): Promise<Gmd | null> {
  for (const cat of categories) {
    const rows = await db.getAllAsync<{ date: string; kg: number; readings: number }>(
      `SELECT r.date AS date, AVG(v.estimated_weight_kg) AS kg, COUNT(*) AS readings
         FROM visual_weight_evals v
         JOIN rondas r ON r.id = v.ronda_id
        WHERE r.paddock_id = ? AND v.category = ?
          AND v.deleted_at IS NULL AND r.deleted_at IS NULL
          AND (? IS NULL OR r.date >= ?)
        GROUP BY r.date
        ORDER BY r.date`,
      [paddockId, cat.category, entryDate, entryDate]
    );
    if (rows.length < 2) continue;

    const first = rows[0];
    const last = rows[rows.length - 1];
    const spanDays = daysBetween(first.date, last.date);
    if (spanDays <= 0) continue;

    const totalGainKg = last.kg - first.kg;
    return {
      category: cat.category,
      kgPerDay: totalGainKg / spanDays,
      totalGainKg,
      spanDays,
      anchors: rows.map((r) => ({ date: r.date, weightKg: r.kg, readings: r.readings })),
    };
  }
  return null;
}

/** Última avaliação de cada seção da ronda. "Nunca avaliado" é um estado visível. */
async function loadSituation(
  db: SQLite.SQLiteDatabase,
  paddockId: number,
): Promise<SituationRow[]> {
  async function last<T>(table: string, cols: string): Promise<(T & { date: string }) | null> {
    return db.getFirstAsync<T & { date: string }>(
      `SELECT r.date AS date, ${cols}
         FROM ${table} e JOIN rondas r ON r.id = e.ronda_id
        WHERE r.paddock_id = ? AND e.deleted_at IS NULL AND r.deleted_at IS NULL
        ORDER BY r.date DESC, e.id DESC LIMIT 1`,
      [paddockId]
    );
  }

  const never: Omit<SituationRow, 'key' | 'label'> = {
    date: null, detail: 'Nunca avaliado', tone: 'neutral',
  };

  const rows: SituationRow[] = [];

  const sup = await last<{ trough_score: string }>('supplement_evals', 'e.trough_score');
  rows.push({
    key: 'suplementacao', label: 'Suplementação',
    ...(sup
      ? { date: sup.date, detail: capitalize(sup.trough_score), tone: sup.trough_score === 'VAZIO' ? 'warn' : 'ok' }
      : never),
  });

  const water = await last<{ quality: string | null; available: number }>('water_evals', 'e.quality, e.available');
  rows.push({
    key: 'aguada', label: 'Aguada',
    ...(water
      ? {
          date: water.date,
          detail: water.available ? capitalize(water.quality ?? '—') : 'Sem água',
          tone: !water.available || water.quality === 'RUIM'
            ? 'danger'
            : water.quality === 'MEDIANA' ? 'warn' : 'ok',
        }
      : never),
  });

  const fence = await last<{ voltage: number; classification: string }>('fence_evals', 'e.voltage, e.classification');
  rows.push({
    key: 'cerca', label: 'Cerca',
    ...(fence
      ? {
          date: fence.date,
          detail: `${Math.round(fence.voltage)} V · ${capitalize(fence.classification)}`,
          tone: fence.classification === 'SEM CHOQUE'
            ? 'danger'
            : fence.classification === 'FRACO' ? 'warn' : 'ok',
        }
      : never),
  });

  const health = await last<{ affected_pct: number | null }>('health_evals', 'e.affected_pct');
  rows.push({
    key: 'sanidade', label: 'Sanidade',
    ...(health
      ? {
          date: health.date,
          detail: `${formatPct(health.affected_pct ?? 0)}% afetado`,
          tone: (health.affected_pct ?? 0) >= 20 ? 'danger' : (health.affected_pct ?? 0) > 0 ? 'warn' : 'ok',
        }
      : never),
  });

  const forage = await last<{ average_cm: number; quality: string }>('forage_evals', 'e.average_cm, e.quality');
  rows.push({
    key: 'forragem', label: 'Forragem',
    ...(forage
      ? { date: forage.date, detail: `${formatPct(forage.average_cm)} cm · ${capitalize(forage.quality)}`, tone: 'ok' }
      : never),
  });

  const bio = await last<{ applied: number; quantity_g: number | null }>('biological_water_evals', 'e.applied, e.quantity_g');
  rows.push({
    key: 'biologico', label: 'Biológico',
    ...(bio
      ? {
          date: bio.date,
          detail: bio.applied ? `${formatPct(bio.quantity_g ?? 0)} g aplicados` : 'Não aplicado',
          tone: bio.applied ? 'ok' : 'warn',
        }
      : never),
  });

  const weight = await last<{ estimated_weight_kg: number }>('visual_weight_evals', 'e.estimated_weight_kg');
  rows.push({
    key: 'peso_visual', label: 'Peso visual',
    ...(weight
      ? { date: weight.date, detail: `${Math.round(weight.estimated_weight_kg)} kg`, tone: 'ok' }
      : never),
  });

  // Avaliado primeiro o que exige ação: alerta, atenção, ok, nunca avaliado.
  const order: Record<SituationRow['tone'], number> = { danger: 0, warn: 1, ok: 2, neutral: 3 };
  return rows.sort((a, b) => order[a.tone] - order[b.tone]);
}

function toMoves(
  rows: Array<{
    date: string; event_type: string; category: string; head_count: number;
    notes: string | null; paddock_id: number | null; target_paddock_id: number | null;
  }>,
  paddockId: number,
): MoveRow[] {
  const out: MoveRow[] = [];
  for (const e of rows) {
    const isSource = e.paddock_id === paddockId;
    const isTarget = e.target_paddock_id === paddockId;
    const cat = capitalize(e.category);
    const n = e.head_count;
    switch (e.event_type) {
      case 'TRANSFERENCIA':
        if (isTarget) out.push({ date: e.date, direction: 'in', text: `Entraram ${n} · ${cat}` });
        if (isSource) out.push({ date: e.date, direction: 'out', text: `Saíram ${n} · ${cat}` });
        break;
      case 'ALOCACAO':
        if (isTarget) out.push({ date: e.date, direction: 'in', text: `Alocados ${n} · ${cat}` });
        break;
      case 'NASCIMENTO':
        if (isSource) out.push({ date: e.date, direction: 'in', text: `Nasceram ${n} · ${cat}` });
        break;
      case 'DESALOCACAO':
        if (isSource) out.push({ date: e.date, direction: 'out', text: `Desalocados ${n} · ${cat}` });
        break;
      case 'MORTE':
        if (isSource) out.push({ date: e.date, direction: 'out', text: `Morreram ${n} · ${cat}` });
        break;
      case 'CONSUMO':
        if (isSource) out.push({ date: e.date, direction: 'out', text: `Consumo ${n} · ${cat}` });
        break;
      case 'EVOLUCAO': {
        if (!isSource) break;
        const to = parseEvolutionTarget(e.notes);
        out.push({ date: e.date, direction: 'in', text: `${n} · ${cat} viraram ${capitalize(to ?? '—')}` });
        break;
      }
      default:
        break;
    }
  }
  return out.reverse().slice(0, 12);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Número curto pt-BR com no máximo 1 casa — vírgula, nunca ponto. */
function formatPct(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** `2026-08-22` → `22/08/2026`. */
export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** `2026-08-22` → `22/08`. */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  if (!m || !d) return iso;
  return `${d}/${m}`;
}
