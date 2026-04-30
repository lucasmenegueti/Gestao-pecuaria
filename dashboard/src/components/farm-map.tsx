'use client';

// FarmMap interativo via Leaflet vanilla (sem react-leaflet pra evitar atrito
// React 19 / Next 16). Basemap OSM, polígonos coloridos por status, click
// dispara onSelect.

import { useEffect, useRef } from 'react';

type Status = 'green' | 'yellow' | 'red';

export interface MapPaddock {
  id: number;
  name: string;
  status: Status;
  /** GeoJSON Polygon ou MultiPolygon (string ou objeto). */
  geometry?: unknown;
  centerLat?: number | null;
  centerLng?: number | null;
}

const COLORS: Record<Status, { fill: string; stroke: string }> = {
  green:  { fill: '#2e8c4f', stroke: '#1f5d36' },
  yellow: { fill: '#b88217', stroke: '#7a550f' },
  red:    { fill: '#c0392b', stroke: '#7d2519' },
};

function parseGeometry(g: unknown):
  | { type: 'polygon'; rings: number[][][] }
  | { type: 'point'; latlng: [number, number] }
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
    // Junta todos os anéis externos de cada polígono num só array.
    const rings: number[][][] = [];
    for (const poly of c as unknown[][]) {
      if (Array.isArray(poly) && poly[0]) rings.push(poly[0] as number[][]);
    }
    return { type: 'polygon', rings };
  }
  if (obj.type === 'Point') {
    const pt = c as [number, number];
    return { type: 'point', latlng: [pt[1], pt[0]] };
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

  // Mount map (uma vez)
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      // CSS do Leaflet precisa estar carregado — injetamos uma única vez.
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

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Render paddocks
      const bounds = L.latLngBounds([]);
      for (const p of paddocks) {
        const c = COLORS[p.status];
        const geo = parseGeometry(p.geometry);
        let layer: import('leaflet').Layer | null = null;
        if (geo?.type === 'polygon') {
          // Leaflet espera [[lat, lng], ...] mas GeoJSON é [lng, lat] — converter.
          const llRings = geo.rings.map((ring) =>
            ring.map(([lng, lat]) => [lat as number, lng as number] as [number, number]),
          );
          layer = L.polygon(llRings, {
            color: c.stroke, weight: 1.5, fillColor: c.fill, fillOpacity: 0.45,
          }).addTo(map);
          for (const ring of llRings) {
            for (const ll of ring) bounds.extend(ll);
          }
        } else if (p.centerLat != null && p.centerLng != null) {
          layer = L.circleMarker([p.centerLat, p.centerLng], {
            radius: 8, color: c.stroke, weight: 1.5, fillColor: c.fill, fillOpacity: 0.6,
          }).addTo(map);
          bounds.extend([p.centerLat, p.centerLng]);
        }

        if (layer) {
          const lyr = layer as unknown as {
            bindTooltip: (s: string, opts?: Record<string, unknown>) => unknown;
            on: (e: string, fn: () => void) => unknown;
          };
          lyr.bindTooltip(p.name, { permanent: false, direction: 'top', sticky: true });
          lyr.on('click', () => onSelect(p.id));
          layersByIdRef.current.set(p.id, layer);
        }
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        // fallback: centro aproximado da fazenda NSA
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
    // Recria o map se a lista mudar (ex: filtro de status novo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paddocks]);

  // Highlight da seleção
  useEffect(() => {
    layersByIdRef.current.forEach((layer, id) => {
      const isSel = id === selectedId;
      const lyr = layer as { setStyle?: (s: Record<string, unknown>) => void };
      if (lyr.setStyle) {
        lyr.setStyle({ weight: isSel ? 3 : 1.5, fillOpacity: isSel ? 0.7 : 0.45 });
      }
    });
  }, [selectedId]);

  return <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8 }} />;
}
