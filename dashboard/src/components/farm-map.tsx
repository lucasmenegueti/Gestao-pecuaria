// FarmMap server-side. Renderiza polígonos reais do GeoJSON salvo em paddock.geometry.
// Cada talhão é colorido pelo status passado.

import type { PaddockEnriched } from '@/lib/queries';

type Status = 'green' | 'yellow' | 'red';

const COLORS: Record<Status, { fill: string; stroke: string; op: number }> = {
  green:  { fill: '#2e8c4f', stroke: '#1f5d36', op: 0.42 },
  yellow: { fill: '#b88217', stroke: '#7a550f', op: 0.42 },
  red:    { fill: '#c0392b', stroke: '#7d2519', op: 0.32 },
};

export function FarmMap({
  paddocksEnriched,
  height = 580,
}: {
  paddocksEnriched: PaddockEnriched[];
  height?: number;
}) {
  // Bounding box de todos os polígonos.
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const polys: Array<{ id: number; name: string; coords: number[][]; status: Status; cx: number; cy: number }> = [];

  for (const e of paddocksEnriched) {
    const g = e.paddock.geometry;
    if (!g) continue;
    let coords: number[][];
    try {
      const parsed = JSON.parse(g);
      const c = parsed.coordinates;
      coords = parsed.type === 'Polygon' ? c[0] : c[0][0];
    } catch {
      continue;
    }
    if (!coords || coords.length < 3) continue;
    let cxSum = 0, cySum = 0;
    for (const c of coords) {
      const lng = c[0] as number;
      const lat = c[1] as number;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      cxSum += lng;
      cySum += lat;
    }
    polys.push({
      id: e.paddock.id,
      name: e.paddock.name,
      coords,
      status: e.status,
      cx: cxSum / coords.length,
      cy: cySum / coords.length,
    });
  }

  if (polys.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-border bg-grey-50 text-fg-muted">
        Sem geometria de talhões disponível.
      </div>
    );
  }

  const W = 720;
  const H = height;
  const pad = 16;
  const dLng = maxLng - minLng;
  const dLat = maxLat - minLat;
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

        {polys.map((p) => {
          const c = COLORS[p.status];
          const ptStr = p.coords.map((c) => `${projX(c[0] as number).toFixed(1)},${projY(c[1] as number).toFixed(1)}`).join(' ');
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
                x={projX(p.cx)}
                y={projY(p.cy)}
                textAnchor="middle"
                fontSize="9"
                fontWeight="500"
                fill="#1f1f1c"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >{p.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
