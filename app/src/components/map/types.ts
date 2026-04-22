export interface PaddockGeo {
  id: number;
  name: string;
  area_hectares: number;
  center_lat: number;
  center_lng: number;
  geometry: string;
  // Usados p/ colorização por modo
  total_heads?: number;
  has_ronda_today?: boolean;
}

export interface WaterTank {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export type MapMode = 'gado' | 'ronda';

export interface FarmMapProps {
  paddocks: PaddockGeo[];
  waterTanks: WaterTank[];
  selectedId?: number | null;
  /** Passa o id do piquete ao clicar nele, ou null quando clica no mapa fora de piquetes. */
  onSelect?: (id: number | null) => void;
  mode?: MapMode;
  style?: any;
}

export interface PaddockStyle {
  stroke: string;
  fill: string;
  fillOpacity: number;
}

// Cores (hex) por estado do piquete — ajustadas pra ficarem visíveis sobre satélite.
export const PADDOCK_STYLES = {
  // Com gado no modo Gado; ronda feita no modo Ronda.
  active: { stroke: '#16a34a', fill: '#22c55e', fillOpacity: 0.5 },
  // Sem gado (não precisa de ronda).
  empty: { stroke: '#4b5563', fill: '#9ca3af', fillOpacity: 0.35 },
  // Com gado e sem ronda feita hoje (modo Ronda).
  pending: { stroke: '#b91c1c', fill: '#ef4444', fillOpacity: 0.45 },
} satisfies Record<string, PaddockStyle>;

export function stylePaddock(p: PaddockGeo, mode: MapMode): PaddockStyle {
  const hasCattle = (p.total_heads ?? 0) > 0;
  if (mode === 'gado') {
    return hasCattle ? PADDOCK_STYLES.active : PADDOCK_STYLES.empty;
  }
  // mode === 'ronda'
  if (!hasCattle) return PADDOCK_STYLES.empty;
  return p.has_ronda_today ? PADDOCK_STYLES.active : PADDOCK_STYLES.pending;
}

export function parsePolygon(geometry: string): Array<{ latitude: number; longitude: number }> {
  try {
    const geo = JSON.parse(geometry);
    if (geo.type !== 'Polygon') return [];
    const ring: Array<[number, number]> = geo.coordinates[0];
    return ring.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  } catch {
    return [];
  }
}
