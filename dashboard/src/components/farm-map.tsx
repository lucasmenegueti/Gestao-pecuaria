'use client';

// FarmMap interativo via Leaflet vanilla. Basemap satélite Esri (mesmo que
// o app usa). Polígonos coloridos seguindo a regra do app (types.ts):
//   - empty   (cinza):    sem gado
//   - active  (verde):    com gado + ronda feita no período
//   - pending (vermelho): com gado + sem ronda no período

import { useEffect, useRef } from 'react';

export type Status = 'active' | 'empty' | 'pending';

export interface MapPaddock {
  id: number;
  name: string;
  status: Status;
  totalHeads: number;
  /** GeoJSON Polygon ou MultiPolygon (string ou objeto). */
  geometry?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
}

const STYLES: Record<Status, { stroke: string; fill: string; fillOpacity: number }> = {
  active:  { stroke: '#16a34a', fill: '#22c55e', fillOpacity: 0.5 },
  empty:   { stroke: '#4b5563', fill: '#9ca3af', fillOpacity: 0.35 },
  pending: { stroke: '#b91c1c', fill: '#ef4444', fillOpacity: 0.45 },
};

function parseGeometry(g: unknown):
  | { type: 'polygon'; rings: number[][][] }
  | null {
  if (!g) return null;
  let parsed: unknown = g;
  if (typeof g === 'string') {
    try { parsed = JSON.parse(g); } catch { return null; }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { type?: string; coordinates?: unknown };
  const c = obj.coordinates;
  if (!Array.isArray(c)) return null;
  if (obj.type === 'Polygon') {
    return { type: 'polygon', rings: c as number[][][] };
  }
  if (obj.type === 'MultiPolygon') {
    const rings: number[][][] = [];
    for (const poly of c as unknown[][]) {
      if (Array.isArray(poly) && poly[0]) rings.push(poly[0] as number[][]);
    }
    return { type: 'polygon', rings };
  }
  return null;
}

export function FarmMap({
  paddocks,
  selectedId,
  onSelect,
  height = 580,
}: {
  paddocks: MapPaddock[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layersByIdRef = useRef<Map<number, import('leaflet').Layer>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      // Satélite Esri — mesma fonte que o app usa nos tiles bundled.
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
          maxZoom: 19,
        },
      ).addTo(map);

      // Render paddocks
      const bounds = L.latLngBounds([]);
      for (const p of paddocks) {
        const st = STYLES[p.status];
        const geo = parseGeometry(p.geometry);
        let layer: import('leaflet').Layer | null = null;
        if (geo) {
          // GeoJSON é [lng, lat]; Leaflet espera [lat, lng] — converter.
          const llRings = geo.rings.map((ring) =>
            ring.map(([lng, lat]) => [lat as number, lng as number] as [number, number]),
          );
          layer = L.polygon(llRings, {
            color: st.stroke, weight: 3, fillColor: st.fill, fillOpacity: st.fillOpacity,
          }).addTo(map);
          for (const ring of llRings) {
            for (const ll of ring) bounds.extend(ll);
          }
        } else if (p.centerLat != null && p.centerLng != null) {
          layer = L.circleMarker([p.centerLat, p.centerLng], {
            radius: 8, color: st.stroke, weight: 2, fillColor: st.fill, fillOpacity: 0.6,
          }).addTo(map);
          bounds.extend([p.centerLat, p.centerLng]);
        }

        if (layer) {
          const lyr = layer as unknown as {
            bindTooltip: (s: string, opts?: Record<string, unknown>) => unknown;
            on: (e: string, fn: () => void) => unknown;
          };
          const headsLabel = p.totalHeads > 0 ? ` · ${p.totalHeads} cab` : ' · sem gado';
          lyr.bindTooltip(`${p.name}${headsLabel}`, {
            permanent: false,
            direction: 'top',
            sticky: true,
          });
          lyr.on('click', () => onSelect(p.id));
          layersByIdRef.current.set(p.id, layer);
        }
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        map.setView([-15.24, -45.40], 13);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layersByIdRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddocks]);

  // Highlight da seleção (mesmo padrão do app: warning amarelo + weight 5)
  useEffect(() => {
    layersByIdRef.current.forEach((layer, id) => {
      const isSel = id === selectedId;
      const idx = paddocks.findIndex((p) => p.id === id);
      const status = idx >= 0 ? paddocks[idx]!.status : 'empty';
      const st = STYLES[status];
      const lyr = layer as { setStyle?: (s: Record<string, unknown>) => void };
      if (lyr.setStyle) {
        lyr.setStyle({
          color: isSel ? '#b88217' : st.stroke,
          weight: isSel ? 5 : 3,
          fillColor: isSel ? '#b88217' : st.fill,
          fillOpacity: isSel ? 0.5 : st.fillOpacity,
        });
      }
    });
  }, [selectedId, paddocks]);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8 }} />;
}
