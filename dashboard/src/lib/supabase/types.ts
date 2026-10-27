// Tipos espelhando as tabelas do Supabase do app pecuária.
// Schema canônico: app/src/lib/db/schema.ts no repo gestao-pecuaria.

export interface Profile {
  id: string;
  username: string | null;
  name: string;
  role: string;
}

export interface Paddock {
  id: number;
  name: string;
  area_hectares: number;
  grass_type_id: number;
  center_lat: number | null;
  center_lng: number | null;
  geometry: string | null;
  active: number;
}

export interface Formula {
  id: number;
  name: string;
  kg_per_sack: number;
  target_g_per_kg_body_day: number;
  active: number;
}

export interface GrassType {
  id: number;
  name: string;
  entry_height_cm: number;
  exit_height_cm: number;
}

export interface HerdLot {
  id: number;
  paddock_id: number | null;
  category: string;
  head_count: number;
  avg_weight_kg: number | null;
}

export interface Ronda {
  id: number;
  paddock_id: number;
  user_id: string;
  date: string;
  completed: number;
  local_updated_at: string;
}

export interface EvalBase {
  id: number;
  ronda_id: number;
  created_at: string;
}

export interface SupplementEval extends EvalBase {
  trough_score: string;
  restocked: number;
  formula_id: number | null;
  sacks_in_trough: number | null;
  trough_access: string;
}

export interface BombonaEval extends EvalBase {
  has_stock: number;
  formula_id: number | null;
  sacks: number | null;
}

export interface ForageEval extends EvalBase {
  measurement_type: string;
  average_cm: number;
  quality: string;
}

export interface WaterEval extends EvalBase {
  available: number;
  quality: string | null;
}

export interface HealthEval extends EvalBase {
  parasite_free: number;
  affected_pct: number | null;
  observations: string | null;
}

export interface FenceEval extends EvalBase {
  voltage: number;
  is_electric: number;
  prevents_mixing: number;
  classification: string;
}

export interface VisualWeightEval extends EvalBase {
  category: string;
  estimated_weight_kg: number;
  previous_weight_kg: number | null;
  previous_date: string | null;
}

export interface WashingEval extends EvalBase {
  was_washed: number;
}

export interface BiologicalWaterEval extends EvalBase {
  applied: number;
  quantity_g: number | null;
}

export interface Inventory {
  id: number;
  formula_id: number;
  quantity_sacks: number;
  min_sacks: number;
  location: string; // 'central' | 'bombona'
  paddock_id: number | null;
  last_resupply_date: string | null;
}

export interface InspectionRequest {
  id: number;
  paddock_id: number;
  eval_kind: string;
  requested_by: string;
  notes: string | null;
  status: string; // 'pending' | 'completed' | 'cancelled'
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface HerdEvent {
  id: number;
  paddock_id: number | null;
  event_type: string;
  category: string;
  head_count: number;
  target_paddock_id: number | null;
  notes: string | null;
  weight_kg: number | null;
  date: string;
  created_at: string;
}

export interface ResupplyRoute {
  id: number;
  user_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
}

export interface ResupplyDelivery {
  id: number;
  route_id: number;
  paddock_id: number;
  formula_id: number;
  sacks_delivered: number;
  delivered_at: string;
}

export type SectionKind =
  | 'supplement' | 'bombona' | 'forage' | 'water'
  | 'biological' | 'health' | 'fence' | 'weight' | 'washing';

export const SECTION_LABELS: Record<SectionKind, string> = {
  supplement: 'Suplementação',
  bombona: 'Bombona',
  forage: 'Forragem',
  water: 'Aguada',
  biological: 'Biológico',
  health: 'Sanidade',
  fence: 'Cerca',
  weight: 'Peso visual',
  washing: 'Lavagem',
};

export const SECTION_COLORS: Record<SectionKind, string> = {
  supplement: '#8a7c2b', bombona: '#8a7c2b', forage: '#3b7a3b',
  water: '#2b6a93', biological: '#2f7a4d', health: '#6e3b8a',
  fence: '#b43a2c', weight: '#8a6515', washing: '#2b7a8c',
};

/** Seções obrigatórias pra ronda "completa" — espelha alerts.ts do app. */
export const REQUIRED_SECTIONS: SectionKind[] = ['supplement', 'water', 'fence'];
