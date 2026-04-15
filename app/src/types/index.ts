export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'peao';
  password_hash: string;
  created_at: string;
}

export interface Paddock {
  id: number;
  name: string;
  area_hectares: number;
  grass_type_id: number;
  grass_type_name?: string;
  latitude?: number;
  longitude?: number;
  active: boolean;
}

export interface GrassType {
  id: number;
  name: string;
  entry_height_cm: number;
  exit_height_cm: number;
  active: boolean;
}

export interface Formula {
  id: number;
  name: string;
  kg_per_sack: number;
  target_consumption_g_per_day: number;
  active: boolean;
}

export interface HerdEntry {
  id: number;
  paddock_id: number;
  category: CattleCategory;
  head_count: number;
  avg_weight_kg?: number;
}

export type CattleCategory =
  | 'BEZERRO MAMANDO'
  | 'BEZERRA MAMANDO'
  | 'BEZERRO'
  | 'GARROTE'
  | 'BOI'
  | 'BEZERRA'
  | 'NOVILHA'
  | 'VACA'
  | 'TOURO';

export interface Ronda {
  id: number;
  paddock_id: number;
  user_id: number;
  date: string;
  completed: boolean;
  synced: boolean;
}

export interface SupplementEval {
  id: number;
  ronda_id: number;
  trough_score: 'CHEIO' | 'ADEQUADA' | 'VAZIO';
  restocked: boolean;
  formula_id?: number;
  sacks_in_trough?: number;
  trough_access: 'BOM' | 'RUIM';
  photo_uri?: string;
  created_at: string;
}

export interface BombonaEval {
  id: number;
  ronda_id: number;
  has_stock: boolean;
  formula_id?: number;
  sacks?: number;
  photo_uri?: string;
  created_at: string;
}

export interface ForageEval {
  id: number;
  ronda_id: number;
  measurement_type: 'ENTRADA' | 'AFERICAO' | 'SAIDA';
  measure_1_cm: number;
  measure_2_cm: number;
  measure_3_cm: number;
  average_cm: number;
  quality: 'BOM' | 'REGULAR' | 'RUIM';
  photo_uri?: string;
  created_at: string;
}

export interface WaterEval {
  id: number;
  ronda_id: number;
  available: boolean;
  quality?: 'EXCELENTE' | 'BOA' | 'MEDIANA' | 'RUIM';
  photo_uri?: string;
  created_at: string;
}

export interface HealthEval {
  id: number;
  ronda_id: number;
  parasite_free: boolean;
  affected_pct?: number;
  observations?: string;
  photo_uri?: string;
  created_at: string;
}

export interface FenceEval {
  id: number;
  ronda_id: number;
  voltage: number;
  is_electric: boolean;
  prevents_mixing: boolean;
  classification: 'FORTE' | 'ADEQUADO' | 'FRACO' | 'SEM CHOQUE';
  photo_uri?: string;
  created_at: string;
}

export interface VisualWeightEval {
  id: number;
  ronda_id: number;
  category: CattleCategory;
  estimated_weight_kg: number;
  previous_weight_kg?: number;
  previous_date?: string;
  photo_uri?: string;
  created_at: string;
}

export interface WashingEval {
  id: number;
  ronda_id: number;
  was_washed: boolean;
  photo_uri?: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  formula_id: number;
  formula_name?: string;
  quantity_sacks: number;
  min_sacks: number;
  location: 'central' | 'bombona';
  paddock_id?: number;
  last_resupply_date?: string;
}

export interface ResupplyRoute {
  id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  status: 'loading' | 'in_progress' | 'completed';
  created_at: string;
}

export interface ResupplyLoad {
  id: number;
  route_id: number;
  formula_id: number;
  sacks_loaded: number;
  sacks_distributed: number;
  sacks_returned: number;
}

export interface ResupplyDelivery {
  id: number;
  route_id: number;
  paddock_id: number;
  formula_id: number;
  sacks_delivered: number;
  delivered_at: string;
}

export interface HerdEvent {
  id: number;
  paddock_id: number;
  event_type: 'NASCIMENTO' | 'MORTE' | 'VENDA' | 'COMPRA' | 'TRANSFERENCIA';
  category: CattleCategory;
  head_count: number;
  target_paddock_id?: number;
  notes?: string;
  date: string;
  created_at: string;
}

export interface SyncRecord {
  id: number;
  table_name: string;
  record_id: number;
  action: 'insert' | 'update' | 'delete';
  synced: boolean;
  created_at: string;
}

// UI Types
export interface PaddockWithStatus extends Paddock {
  total_heads: number;
  last_ronda_date?: string;
  supplement_days_remaining?: number;
  status: 'ok' | 'atencao' | 'alerta';
  status_message?: string;
}

export interface EvalMenuItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  last_eval_date?: string;
  route: string;
}
