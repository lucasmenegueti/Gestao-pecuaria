// FarmMap server-side. Renderiza polígonos do GeoJSON salvo em paddock.geometry.
// Cada talhão é colorido pelo status passado. Quando o talhão não tem geometry,
// desenha um círculo no center_lat/center_lng (fallback).

import type { PaddockEnriched } from '@/lib/queries';

type Status = 'green' | 'yellow' | 'red';

const COLORS: Record<Status, { fill: string; stroke: string; op: number }> = {
  green:  { fill: '#2e8c4f', stroke: '#1f5d36', op: 0.42 },
  yellow: { fill: '#b88217', stroke: '#7a550f', op: 0.42 },
  red:    { fill: '#c0392b', stroke: '#7d2519', op: 0.32 },
};

interface PolyShape {
  id: number; name: string; status: Status; cx: number; cy: number;
  /** Anel externo do polígono. Se ausente, é um ponto (fallback center). */
  coords?: number[][];
}

/** Aceita string JSON OU objeto (jsonb). Retorna array de pontos do anel
 *  externo, ou null. Lida com Polygon e MultiPolygon. */
function extractCoords(g: unknown): number[][] | null {
  if (!g) return null;
  let parsed: unknown;
  if (typeof g === 'string') {
    try {
      parsed = JSON.parse(g);
    } catch {
      return null;
    }
  } else {
    parsed = g;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { type?: string; coordinates?: unknown };
  const c = obj.coordinates;
  if (!Array.isArray(c)) return null;
  let ring: unknown;
  if (obj.type === 'Polygon') ring = c[0];
  else if (obj.type === 'MultiPolygon') ring = (c[0] as unknown[])?.[0];
  else ring = c[0]; // tenta um fallback razoável
  if (!Array.isArray(ring) || ring.length < 3) return null;
  // valida shape de cada ponto
  const pts: number[][] = [];
  for (const pt of ring) {
    if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
      pts.push([pt[0], pt[1]]);
    }
  }
  return pts.length >= 3 ? pts : null;
}

export function FarmMap({
  paddocksEnriched,
  height = 580,
}: {
  paddocksEnriched: PaddockEnriched[];
  height?: number;
}) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const shapes: PolyShape[] = [];

  for (const e of paddocksEnriched) {
    const coords = extractCoords(e.paddock.geometry as unknown);
    if (coords) {
      let cxSum = 0, cySum = 0;
      for (const pt of coords) {
        const lng = pt[0]!, lat = pt[1]!;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        cxSum += lng;
        cySum += lat;
      }
      shapes.push({
        id: e.paddock.id, name: e.paddock.name, status: e.status,
        cx: cxSum / coords.length, cy: cySum / coords.length, coords,
      });
    } else if (e.paddock.center_lat != null && e.paddock.center_lng != null) {
      const lat = e.paddock.center_lat;
      const lng = e.paddock.center_lng;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      shapes.push({
        id: e.paddock.id, name: e.paddock.name, status: e.status,
        cx: lng, cy: lat,
      });
    }
  }

  if (shapes.length === 0) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-grey-50 px-6 text-center text-fg-muted">
        <p className="text-[14px] font-medium text-fg">Sem geometria de talhões</p>
        <p className="text-[12px]">
          Os talhões não têm <code>geometry</code> nem <code>center_lat/center_lng</code> preenchidos
          no Supabase. Rode o seed do KML no app para popular.
        </p>
      </div>
    );
  }

  const W = 720;
  const H = height;
  const pad = 16;
  const dLng = (maxLng - minLng) || 0.001;
  const dLat = (maxLat - minLat) || 0.001;
  const projX = (lng: number) => pad + ((lng - minLng) / dLng) * (W - 2 * pad);
  const projY = (lat: number) => pad + ((maxLat - lat) / dLat) * (H - 2 * pad);

  return (
    <div className="rounded-lg border border-border bg-[#f4f6f3] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8ede7" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {shapes.map((p) => {
          const c = COLORS[p.status];
          if (p.coords) {
            const ptStr = p.coords.map((pt) => `${projX(pt[0]!).toFixed(1)},${projY(pt[1]!).toFixed(1)}`).join(' ');
            return (
              <g key={p.id}>
                <polygon
                  points={ptStr}
                  fill={c.fill}
                  fillOpacity={c.op}
                  stroke={c.stroke}
                  strokeWidth={1}
                />
                <text
                  x={projX(p.cx)} y={projY(p.cy)}
                  textAnchor="middle" fontSize="9" fontWeight="500" fill="#1f1f1c"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{p.name}</text>
              </g>
            );
          }
          // Fallback: círculo no centro
          return (
            <g key={p.id}>
              <circle
                cx={projX(p.cx)} cy={projY(p.cy)} r={8}
                fill={c.fill} fillOpacity={c.op}
                stroke={c.stroke} strokeWidth={1}
              />
              <text
                x={projX(p.cx)} y={projY(p.cy) + 18}
                textAnchor="middle" fontSize="9" fontWeight="500" fill="#1f1f1c"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >{p.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
