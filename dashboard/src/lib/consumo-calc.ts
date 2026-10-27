// Núcleo de cálculo do consumo — funções puras, sem I/O. Separado de consumo.ts
// (que é server-only) pra poder ser exercitado fora do Next.

export interface HerdRow {
  paddock_id: string | null;
  category: string;
  head_count: number;
  avg_weight_kg: number | null;
}

export interface HerdEventRow {
  paddock_id: string | null;
  target_paddock_id: string | null;
  event_type: string;
  category: string;
  head_count: number;
  notes: string | null;
  date: string;
}

const BRT = 'America/Sao_Paulo';

export function hojeBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRT, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + n));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

export function loteKey(paddockId: string, category: string): string {
  return `${paddockId}|${category}`;
}

/** EVOLUCAO grava só a categoria de origem; o destino vive em `notes`: "BEZERRO → GARROTE". */
export function categoriaDestinoDaEvolucao(notes: string | null): string | null {
  if (!notes) return null;
  const seta = notes.indexOf('→');
  if (seta < 0) return null;
  const destino = notes.slice(seta + 1).split('·')[0]?.trim();
  return destino || null;
}

/**
 * Descarta repetições exatas de um mesmo movimento no mesmo dia.
 *
 * O sync do app grava o mesmo evento mais de uma vez com UUIDs diferentes (ver
 * BRIEFING-duplicacao-rondas.md no repo do app) enquanto o `herd` é atualizado
 * uma vez só. Desfazer a duplicata jogaria o lote pra contagem negativa.
 */
export function dedupEventos(eventos: HerdEventRow[]): { eventos: HerdEventRow[]; descartados: number } {
  const vistos = new Set<string>();
  const out: HerdEventRow[] = [];
  for (const e of eventos) {
    const chave = [e.date, e.event_type, e.category, e.head_count, e.paddock_id, e.target_paddock_id, e.notes].join('|');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(e);
  }
  return { eventos: out, descartados: eventos.length - out.length };
}

/**
 * Reconstrói o rebanho dia a dia desfazendo os `herd_events` a partir do estado
 * atual (`herd`), e devolve a soma de cabeças por dia de cada (talhão, categoria).
 *
 * Reverso e não acumulado desde a origem: o ledger não cobre o rebanho inicial
 * (veio de seed), então só o trecho recente é confiável.
 */
export function calcularCabecasDia(
  herd: HerdRow[],
  eventosBrutos: HerdEventRow[],
  inicio: string,
  fim: string,
  hoje: string,
): { cabecasDia: Map<string, number>; evolucoesSemDestino: number; eventosDuplicados: number } {
  const { eventos, descartados: eventosDuplicados } = dedupEventos(eventosBrutos);
  const estado = new Map<string, number>();
  for (const h of herd) {
    if (!h.paddock_id || h.head_count <= 0) continue;
    const key = loteKey(h.paddock_id, h.category);
    estado.set(key, (estado.get(key) ?? 0) + h.head_count);
  }

  const porDia = new Map<string, HerdEventRow[]>();
  for (const e of eventos) {
    const doDia = porDia.get(e.date);
    if (doDia) doDia.push(e);
    else porDia.set(e.date, [e]);
  }

  let evolucoesSemDestino = 0;
  const soma = (key: string, delta: number) => {
    estado.set(key, (estado.get(key) ?? 0) + delta);
  };

  /** Aplica o inverso do evento: leva o estado do fim do dia D pro fim do dia D-1. */
  function desfazer(e: HerdEventRow) {
    const origem = e.paddock_id ? loteKey(e.paddock_id, e.category) : null;
    const destino = e.target_paddock_id ? loteKey(e.target_paddock_id, e.category) : null;
    const n = e.head_count;
    switch (e.event_type) {
      case 'ALOCACAO':
        if (destino) soma(destino, -n);
        break;
      case 'DESALOCACAO':
      case 'MORTE':
      case 'AJUSTE': // no app, AJUSTE subtrai do talhão
        if (origem) soma(origem, +n);
        break;
      case 'NASCIMENTO':
        if (origem) soma(origem, -n);
        break;
      case 'TRANSFERENCIA':
        if (origem) soma(origem, +n);
        if (destino) soma(destino, -n);
        break;
      case 'EVOLUCAO': {
        // Troca de categoria dentro do mesmo talhão: neutro no total do talhão.
        if (!e.paddock_id) break;
        const para = categoriaDestinoDaEvolucao(e.notes);
        if (!para) { evolucoesSemDestino += 1; break; }
        soma(loteKey(e.paddock_id, e.category), +n);
        soma(loteKey(e.paddock_id, para), -n);
        break;
      }
      // COMPRA e VENDA mexem no pool de gado sem talhão — não afetam piquete.
      default:
        break;
    }
  }

  const cabecasDia = new Map<string, number>();
  for (let dia = hoje; dia >= inicio; dia = addDaysIso(dia, -1)) {
    if (dia <= fim) {
      for (const [key, heads] of estado) {
        if (heads > 0) cabecasDia.set(key, (cabecasDia.get(key) ?? 0) + heads);
      }
    }
    for (const e of porDia.get(dia) ?? []) desfazer(e);
  }

  return { cabecasDia, evolucoesSemDestino, eventosDuplicados };
}

/**
 * Soma custos tratando null como "desconhecido" — um null contamina o total.
 * Lista vazia é zero: nenhuma ração colocada = nenhum custo, não "não sei".
 */
export function somaCustos(valores: Array<number | null>): number | null {
  if (valores.length === 0) return 0;
  if (valores.some((v) => v == null)) return null;
  return valores.reduce<number>((s, v) => s + (v ?? 0), 0);
}
