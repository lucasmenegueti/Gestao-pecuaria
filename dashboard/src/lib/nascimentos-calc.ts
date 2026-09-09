// Núcleo de cálculo da estação de cria — funções puras, sem I/O. Separado de
// nascimentos.ts (que é server-only) pra poder ser exercitado fora do Next.
//
// A "estação" não é uma janela configurada: começa no primeiro NASCIMENTO
// registrado e vai até hoje. Mortes de crias e de matrizes só contam a partir
// desse início — morte de bezerro anterior é do lote antigo, não desta estação.

import { dedupEventos, type HerdEventRow } from './consumo-calc';

// O app de campo só permite registrar nascimento nestas duas categorias — o
// sexo da cria vem daí (não há campo de sexo próprio).
export const CATEGORIA_CRIA_MACHO = 'BEZERRO MAMANDO';
export const CATEGORIA_CRIA_FEMEA = 'BEZERRA MAMANDO';
export const CATEGORIAS_CRIA = [CATEGORIA_CRIA_MACHO, CATEGORIA_CRIA_FEMEA];
export const CATEGORIAS_MATRIZ_PRENHA = ['VACA PRENHA', 'NOVILHA PRENHA'];
export const CATEGORIA_MATRIZ_PARIDA = 'VACA PARIDA';

export interface NascimentosPorPiquete {
  paddockId: string;
  machos: number;
  femeas: number;
  total: number;
  ultimaData: string;
}

export interface SemanaNascimentos {
  /** Segunda-feira da semana, YYYY-MM-DD. Semanas sem nascimento entram zeradas. */
  semana: string;
  machos: number;
  femeas: number;
}

export interface MorteNaEstacao {
  paddockId: string | null;
  category: string;
  headCount: number;
  causa: string | null;
  date: string;
  grupo: 'cria' | 'matriz';
}

export interface CenarioNascimentos {
  inicioEstacao: string | null;
  ultimoNascimento: string | null;
  /** Eventos de nascimento (um evento pode ter várias cabeças). */
  registros: number;
  total: number;
  machos: number;
  femeas: number;
  porPiquete: NascimentosPorPiquete[];
  porSemana: SemanaNascimentos[];
  /** Mortes de crias e de matrizes (prenha/parida) desde o início da estação. */
  mortes: MorteNaEstacao[];
  mortesCriasCab: number;
  mortesMatrizesCab: number;
  /** Mortes de crias ÷ nascidos — null enquanto não houver nascimento. */
  taxaMortalidadeCrias: number | null;
  eventosDuplicados: number;
}

/** Segunda-feira da semana do dia. `date` é dia puro — aritmética em UTC. */
export function inicioDaSemana(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function proximaSemana(segunda: string): string {
  const d = new Date(`${segunda}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

function grupoDaMorte(category: string): MorteNaEstacao['grupo'] | null {
  if (CATEGORIAS_CRIA.includes(category)) return 'cria';
  if (CATEGORIAS_MATRIZ_PRENHA.includes(category) || category === CATEGORIA_MATRIZ_PARIDA) return 'matriz';
  return null;
}

export function calcularCenarioNascimentos(eventosBrutos: HerdEventRow[]): CenarioNascimentos {
  // Dedupe (mesma regra do consumo) só sobre o que a aba conta — descartar
  // duplicata de evento que nem aparece aqui geraria aviso sobre nada.
  const { eventos: nascimentos, descartados: dupNascimentos } =
    dedupEventos(eventosBrutos.filter((e) => e.event_type === 'NASCIMENTO'));

  const inicioEstacao = nascimentos.length > 0
    ? nascimentos.reduce((min, e) => (e.date < min ? e.date : min), nascimentos[0]!.date)
    : null;
  const ultimoNascimento = nascimentos.length > 0
    ? nascimentos.reduce((max, e) => (e.date > max ? e.date : max), nascimentos[0]!.date)
    : null;

  let machos = 0;
  let femeas = 0;
  const porPiqueteMap = new Map<string, NascimentosPorPiquete>();
  const porSemanaMap = new Map<string, SemanaNascimentos>();

  for (const e of nascimentos) {
    const macho = e.category === CATEGORIA_CRIA_MACHO;
    if (macho) machos += e.head_count;
    else femeas += e.head_count;

    if (e.paddock_id) {
      const p = porPiqueteMap.get(e.paddock_id) ??
        { paddockId: e.paddock_id, machos: 0, femeas: 0, total: 0, ultimaData: e.date };
      if (macho) p.machos += e.head_count;
      else p.femeas += e.head_count;
      p.total += e.head_count;
      if (e.date > p.ultimaData) p.ultimaData = e.date;
      porPiqueteMap.set(e.paddock_id, p);
    }

    const semana = inicioDaSemana(e.date);
    const s = porSemanaMap.get(semana) ?? { semana, machos: 0, femeas: 0 };
    if (macho) s.machos += e.head_count;
    else s.femeas += e.head_count;
    porSemanaMap.set(semana, s);
  }

  // Semanas contíguas da primeira à última — buraco sem parto aparece zerado,
  // senão a curva esconde o vazio entre o início tímido e o pico da estação.
  const porSemana: SemanaNascimentos[] = [];
  if (inicioEstacao && ultimoNascimento) {
    const fim = inicioDaSemana(ultimoNascimento);
    for (let s = inicioDaSemana(inicioEstacao); s <= fim; s = proximaSemana(s)) {
      porSemana.push(porSemanaMap.get(s) ?? { semana: s, machos: 0, femeas: 0 });
    }
  }

  const { eventos: mortesEventos, descartados: dupMortes } = dedupEventos(
    eventosBrutos.filter(
      (e) =>
        e.event_type === 'MORTE' &&
        inicioEstacao != null && e.date >= inicioEstacao &&
        grupoDaMorte(e.category) != null,
    ),
  );
  const mortes: MorteNaEstacao[] = mortesEventos.map((e) => ({
    paddockId: e.paddock_id,
    category: e.category,
    headCount: e.head_count,
    causa: e.notes,
    date: e.date,
    grupo: grupoDaMorte(e.category)!,
  }));
  mortes.sort((a, b) => b.date.localeCompare(a.date));

  const total = machos + femeas;
  const mortesCriasCab = mortes.filter((m) => m.grupo === 'cria').reduce((s, m) => s + m.headCount, 0);
  const mortesMatrizesCab = mortes.filter((m) => m.grupo === 'matriz').reduce((s, m) => s + m.headCount, 0);

  return {
    inicioEstacao,
    ultimoNascimento,
    registros: nascimentos.length,
    total,
    machos,
    femeas,
    porPiquete: Array.from(porPiqueteMap.values())
      .sort((a, b) => b.total - a.total || a.paddockId.localeCompare(b.paddockId)),
    porSemana,
    mortes,
    mortesCriasCab,
    mortesMatrizesCab,
    taxaMortalidadeCrias: total > 0 ? mortesCriasCab / total : null,
    eventosDuplicados: dupNascimentos + dupMortes,
  };
}
