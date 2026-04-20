// Colors repassa pro sistema NSA — as telas legadas continuam referenciando
// `Colors.primary`, `Colors.danger`, etc. sem alteração, mas ganham o visual
// novo automaticamente. Quem quiser tokens completos importa de '@/theme/nsa'.
export const Colors = {
  primary: '#172514', // NSA green800
  primaryDark: '#0c1609', // NSA green900
  primaryLight: '#e8ede7', // NSA green100
  success: '#2e8c4f', // NSA ok
  warning: '#b88217', // NSA warn
  danger: '#c0392b', // NSA danger
  background: '#fcfcfb', // NSA bg
  card: '#ffffff',
  text: '#1f1f1c', // NSA inkPrimary
  textMuted: '#787873', // NSA inkMuted
  border: '#e5e5e1', // NSA border
  white: '#ffffff',
  black: '#000000',

  // Cores por domínio de ronda — dots semânticos do sistema NSA.
  suplementacao: '#8a7c2b',
  bombona: '#8a7c2b',
  forragem: '#3b7a3b',
  aguada: '#2b6a93',
  biologico: '#2f7a4d',
  sanidade: '#6e3b8a',
  cerca: '#b43a2c',
  rebanho: '#8a7c2b',
  peso: '#8a6515',
  lavagem: '#2b7a8c',
} as const;

// Ordem reflete evolução etária: mamando → desmamado → jovem → adulto.
// Macho: BEZERRO MAMANDO → BEZERRO → GARROTE → BOI.
// Fêmea: BEZERRA MAMANDO → BEZERRA → NOVILHA → VACA (SOLTEIRA/PRENHA/PARIDA).
export const CATTLE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'BEZERRO MAMANDO', label: 'Bezerro Mamando' },
  { value: 'BEZERRA MAMANDO', label: 'Bezerra Mamando' },
  { value: 'BEZERRO', label: 'Bezerro' },
  { value: 'BEZERRA', label: 'Bezerra' },
  { value: 'GARROTE', label: 'Garrote' },
  { value: 'NOVILHA', label: 'Novilha' },
  { value: 'BOI', label: 'Boi' },
  { value: 'VACA SOLTEIRA', label: 'Vaca Solteira' },
  { value: 'VACA PRENHA', label: 'Vaca Prenha' },
  { value: 'VACA PARIDA', label: 'Vaca Parida' },
];

// Categorias que podem coexistir no mesmo piquete como "lote de pares"
// (vaca parida + seus bezerros mamando). Outras categorias ficam solo.
export const PAIR_CATEGORIES = new Set(['VACA PARIDA', 'BEZERRO MAMANDO', 'BEZERRA MAMANDO']);

// Pesos médios por categoria em kg — usados só quando o lote do piquete
// não tem peso visual registrado (herd.avg_weight_kg IS NULL).
export const DEFAULT_WEIGHT_KG: Record<string, number> = {
  'BEZERRO MAMANDO': 100,
  'BEZERRA MAMANDO': 95,
  'BEZERRO': 180,
  'BEZERRA': 170,
  'GARROTE': 330,
  'NOVILHA': 290,
  'BOI': 550,
  'VACA PARIDA': 450,
  'VACA PRENHA': 470,
  'VACA SOLTEIRA': 440,
};

// Fluxo normal de evolução etária/reprodutiva. Categorias sem entrada aqui
// (BOI, VACA PARIDA) são "topo" — não evoluem. NOVILHA e VACA SOLTEIRA têm
// 2 destinos porque a inseminação com DG positivo é uma transição separada
// da passagem de idade.
export const CATEGORY_EVOLUTIONS: Record<string, string[]> = {
  'BEZERRO MAMANDO': ['BEZERRO'],
  'BEZERRA MAMANDO': ['BEZERRA'],
  'BEZERRO': ['GARROTE'],
  'BEZERRA': ['NOVILHA'],
  'GARROTE': ['BOI'],
  'NOVILHA': ['VACA SOLTEIRA', 'VACA PRENHA'],
  'VACA SOLTEIRA': ['VACA PRENHA'],
  'VACA PRENHA': ['VACA PARIDA'],
};

export function effectiveWeightKg(category: string, avgWeightKg: number | null | undefined): number {
  if (avgWeightKg != null && avgWeightKg > 0) return avgWeightKg;
  return DEFAULT_WEIGHT_KG[category] ?? 400;
}

// Cores pro ResultCard de cerca. Usam a escala NSA:
// - FORTE: green800 (deep cedar) em vez de kelly green bright — evita visual
//   "mensagem de sucesso" que ficou associado ao UI antigo.
// - ADEQUADO/FRACO/SEM CHOQUE: tons escuros semânticos (warnFg/dangerFg/inkMuted).
export const FENCE_CLASSIFICATION = {
  FORTE: { min: 4000, color: '#172514', label: 'Forte' },
  ADEQUADO: { min: 2000, color: '#7a550f', label: 'Adequado' },
  FRACO: { min: 1, color: '#7d2519', label: 'Fraco' },
  'SEM CHOQUE': { min: 0, color: '#787873', label: 'Sem choque' },
} as const;

export const WATER_QUALITY_OPTIONS = [
  { value: 'EXCELENTE', label: 'Excelente', description: 'Água límpida, sem cheiro, sem cor, sem resíduos', color: Colors.success },
  { value: 'BOA', label: 'Boa', description: 'Água sem cheiro, sem resíduos', color: Colors.success },
  { value: 'MEDIANA', label: 'Mediana', description: 'Água turva, sem cheiro', color: Colors.warning },
  { value: 'RUIM', label: 'Ruim', description: 'Água suja', color: Colors.danger },
] as const;

export const TROUGH_SCORE_OPTIONS = [
  { value: 'CHEIO', label: 'Cheio', description: 'Cocho com bastante suplemento', color: Colors.success },
  { value: 'ADEQUADA', label: 'Adequada', description: 'Consumo normal, quantidade ok', color: Colors.warning },
  { value: 'VAZIO', label: 'Vazio', description: 'Cocho sem suplemento', color: Colors.danger },
] as const;

export function classifyFence(voltage: number): 'FORTE' | 'ADEQUADO' | 'FRACO' | 'SEM CHOQUE' {
  if (voltage >= 4000) return 'FORTE';
  if (voltage >= 2000) return 'ADEQUADO';
  if (voltage >= 1) return 'FRACO';
  return 'SEM CHOQUE';
}

/**
 * Dias até o cocho zerar.
 * @param sacks sacos atuais na bombona
 * @param kgPerSack peso de cada saco da fórmula
 * @param dailyConsumptionKg consumo diário do lote em kg/dia — use {@link dailyConsumptionKg} para calcular.
 */
export function calculateSupplementDays(sacks: number, kgPerSack: number, dailyConsumptionKg: number): number {
  if (dailyConsumptionKg <= 0) return 0;
  const totalKg = sacks * kgPerSack;
  return Math.floor(totalKg / dailyConsumptionKg);
}

/**
 * Consumo diário de ração de um lote em kg, considerando peso vivo por cabeça.
 * Se `avg_weight_kg` não existe, cai em {@link DEFAULT_WEIGHT_KG} para a categoria.
 */
export function dailyConsumptionKg(
  lots: Array<{ category: string; head_count: number; avg_weight_kg?: number | null }>,
  targetGPerKgBodyDay: number,
): number {
  let totalBodyKg = 0;
  for (const l of lots) {
    totalBodyKg += l.head_count * effectiveWeightKg(l.category, l.avg_weight_kg ?? null);
  }
  return (totalBodyKg * targetGPerKgBodyDay) / 1000;
}

export function calculateStockingRate(heads: number, hectares: number): number {
  if (hectares === 0) return 0;
  return Number((heads / hectares).toFixed(2));
}

export function calculateForageAverage(m1: number, m2: number, m3: number): number {
  return Number(((m1 + m2 + m3) / 3).toFixed(1));
}
