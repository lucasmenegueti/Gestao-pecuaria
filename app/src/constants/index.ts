export const Colors = {
  primary: '#1a6b54',
  primaryDark: '#124a3a',
  primaryLight: '#e8f5f0',
  success: '#2d8a4e',
  warning: '#e67e22',
  danger: '#c0392b',
  background: '#f4f1ec',
  card: '#ffffff',
  text: '#2c2c2c',
  textMuted: '#7a7a7a',
  border: '#e0dcd5',
  white: '#ffffff',
  black: '#000000',

  // Ronda accent colors
  suplementacao: '#3498db',
  bombona: '#d35400',
  forragem: '#27ae60',
  aguada: '#2980b9',
  sanidade: '#8e44ad',
  cerca: '#e74c3c',
  rebanho: '#f39c12',
  peso: '#e67e22',
  lavagem: '#1abc9c',
} as const;

export const CATTLE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'BEZERRO MAMANDO', label: 'Bezerro Mamando' },
  { value: 'BEZERRA MAMANDO', label: 'Bezerra Mamando' },
  { value: 'BEZERRO', label: 'Bezerro' },
  { value: 'GARROTE', label: 'Garrote' },
  { value: 'BOI', label: 'Boi' },
  { value: 'BEZERRA', label: 'Bezerra' },
  { value: 'NOVILHA', label: 'Novilha' },
  { value: 'VACA', label: 'Vaca' },
  { value: 'TOURO', label: 'Touro' },
];

export const FENCE_CLASSIFICATION = {
  FORTE: { min: 4000, color: Colors.success, label: 'Forte' },
  ADEQUADO: { min: 2000, color: Colors.warning, label: 'Adequado' },
  FRACO: { min: 1, color: Colors.danger, label: 'Fraco' },
  'SEM CHOQUE': { min: 0, color: Colors.textMuted, label: 'Sem Choque' },
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

export function calculateSupplementDays(sacks: number, kgPerSack: number, heads: number, consumptionGPerDay: number): number {
  if (heads === 0 || consumptionGPerDay === 0) return 0;
  const totalKg = sacks * kgPerSack;
  const dailyConsumptionKg = (heads * consumptionGPerDay) / 1000;
  return Math.floor(totalKg / dailyConsumptionKg);
}

export function calculateStockingRate(heads: number, hectares: number): number {
  if (hectares === 0) return 0;
  return Number((heads / hectares).toFixed(2));
}

export function calculateForageAverage(m1: number, m2: number, m3: number): number {
  return Number(((m1 + m2 + m3) / 3).toFixed(1));
}
