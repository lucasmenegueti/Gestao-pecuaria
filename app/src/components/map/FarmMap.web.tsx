import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Asset } from 'expo-asset';
import { FarmMapProps, parsePolygon, stylePaddock } from './types';
import { Colors } from '@/constants';
import { TILE_MODULES, TILE_MIN_ZOOM, TILE_MAX_ZOOM } from './tile-manifest';

// Fix ícone default do Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 1×1 transparent PNG (RGBA, alpha=0) — usado pra tiles fora da área da fazenda.
// O base64 antigo era na verdade um pixel VERDE 50% de opacidade.
const TRANSPARENT_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

// No web, Image.resolveAssetSource (API nativa do RN) não existe — usamos
// expo-asset, que devolve a URL já bundled pelo Metro/webpack. Asset.fromModule
// é síncrono e funciona tanto pra module id (number) quanto pra objeto já
// resolvido ({ uri }). Cache local pra evitar recriar Asset em cada tile.
const tileUriCache: Record<string, string | null> = {};

function resolveTileUri(key: string): string | null {
  if (key in tileUriCache) return tileUriCache[key];
  const mod = TILE_MODULES[key];
  if (mod == null) {
    tileUriCache[key] = null;
    return null;
  }
  let uri: string | null = null;
  try {
    // Caso 1: Metro web às vezes exporta require('./foo.jpg') como string direto
    if (typeof mod === 'string') {
      uri = mod;
    } else if (typeof mod === 'object' && mod !== null && typeof (mod as any).uri === 'string') {
      // Caso 2: alguns bundlers retornam { uri, width, height }
      uri = (mod as any).uri;
    } else {
      // Caso 3 (padrão): module id numérico — resolve via expo-asset
      const asset = Asset.fromModule(mod as any);
      uri = asset?.localUri ?? asset?.uri ?? null;
    }
  } catch {
    uri = null;
  }
  tileUriCache[key] = uri;
  return uri;
}

function BundledTileLayer() {
  const map = useMap();
  useEffect(() => {
    const BundledLayer = L.TileLayer.extend({
      getTileUrl(coords: { x: number; y: number; z: number }) {
        const uri = resolveTileUri(`${coords.z}_${coords.x}_${coords.y}`);
        return uri ?? TRANSPARENT_1X1;
      },
      createTile(coords: any, done: any) {
        const tile = (L.TileLayer.prototype as any).createTile.call(this as any, coords, done);
        let retried = false;
        tile.addEventListener('error', () => {
          if (retried) return;
          retried = true;
          const src = (tile as HTMLImageElement).src;
          setTimeout(() => {
            (tile as HTMLImageElement).src = '';
            (tile as HTMLImageElement).src = src.includes('?') ? src + '&r=1' : src + '?r=1';
          }, 300);
        });
        return tile;
      },
    });
    const layer = new (BundledLayer as any)('', {
      minZoom: TILE_MIN_ZOOM,
      maxZoom: TILE_MAX_ZOOM,
      errorTileUrl: TRANSPARENT_1X1,
      keepBuffer: 4,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map]);
  return null;
}

function FitToBounds({ coords }: { coords: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords as any, { padding: [30, 30] });
    }
  }, [coords, map]);
  return null;
}

function DeselectOnMapClick({ onDeselect }: { onDeselect: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onDeselect();
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onDeselect]);
  return null;
}

function FlyToSelected({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.min(15, TILE_MAX_ZOOM), { duration: 0.8 });
  }, [target, map]);
  return null;
}

const userLocIcon = L.divIcon({
  className: 'user-loc',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px rgba(37,99,235,0.6);"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function UserLocation({
  onStatus,
  recenterKey,
}: {
  onStatus: (s: 'granted' | 'denied' | 'waiting') => void;
  recenterKey: number;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const lastPosRef = useRef<L.LatLng | null>(null);

  useEffect(() => {
    onStatus('waiting');
    map.locate({ watch: true, enableHighAccuracy: true, maximumAge: 2000 });
    const onFound = (e: L.LocationEvent) => {
      onStatus('granted');
      lastPosRef.current = e.latlng;
      if (!markerRef.current) {
        markerRef.current = L.marker(e.latlng, { icon: userLocIcon, interactive: false }).addTo(map);
        circleRef.current = L.circle(e.latlng, {
          radius: e.accuracy || 0,
          color: '#2563eb',
          weight: 1,
          fillColor: '#2563eb',
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng(e.latlng);
        circleRef.current?.setLatLng(e.latlng);
        if (e.accuracy) circleRef.current?.setRadius(e.accuracy);
      }
    };
    const onError = () => onStatus('denied');
    map.on('locationfound', onFound);
    map.on('locationerror', onError);
    return () => {
      map.stopLocate();
      map.off('locationfound', onFound);
      map.off('locationerror', onError);
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (recenterKey > 0 && lastPosRef.current) {
      map.flyTo(lastPosRef.current, Math.min(16, TILE_MAX_ZOOM), { duration: 0.6 });
    }
  }, [recenterKey, map]);

  return null;
}

export function FarmMap({ paddocks, waterTanks, selectedId, onSelect, mode = 'gado', style }: FarmMapProps) {
  const [gpsStatus, setGpsStatus] = useState<'granted' | 'denied' | 'waiting'>('waiting');
  const [recenterKey, setRecenterKey] = useState(0);
  const polygons = useMemo(
    () =>
      paddocks
        .map((p) => {
          const coords = parsePolygon(p.geometry).map((c) => [c.latitude, c.longitude] as [number, number]);
          return { ...p, coords };
        })
        .filter((p) => p.coords.length > 2),
    [paddocks]
  );

  const allCoords = useMemo(() => polygons.flatMap((p) => p.coords), [polygons]);

  const center = useMemo<[number, number]>(() => {
    if (paddocks.length === 0) return [-15.3, -45.6];
    const lat = paddocks.reduce((s, p) => s + p.center_lat, 0) / paddocks.length;
    const lng = paddocks.reduce((s, p) => s + p.center_lng, 0) / paddocks.length;
    return [lat, lng];
  }, [paddocks]);

  const selectedCenter: [number, number] | null = useMemo(() => {
    if (!selectedId) return null;
    const p = paddocks.find((x) => x.id === selectedId);
    return p ? [p.center_lat, p.center_lng] : null;
  }, [selectedId, paddocks]);

  // Limite de pan: bbox dos piquetes + folga; impede navegar pra áreas sem tile.
  const maxBounds = useMemo<[[number, number], [number, number]] | undefined>(() => {
    if (allCoords.length === 0) return undefined;
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    const pad = 0.01; // ~1km
    return [
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ];
  }, [allCoords]);

  return (
    <View style={[styles.container, style]}>
      <MapContainer
        center={center}
        zoom={Math.max(13, TILE_MIN_ZOOM)}
        minZoom={TILE_MIN_ZOOM}
        maxZoom={TILE_MAX_ZOOM}
        maxBounds={maxBounds}
        maxBoundsViscosity={1}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <BundledTileLayer />
        <FitToBounds coords={allCoords} />
        <FlyToSelected target={selectedCenter} />
        <UserLocation onStatus={setGpsStatus} recenterKey={recenterKey} />
        <DeselectOnMapClick onDeselect={() => onSelect?.(null)} />
        {polygons.map((p) => {
          const selected = p.id === selectedId;
          const s = stylePaddock(p, mode);
          return (
            <Polygon
              key={`${p.id}-${mode}`}
              positions={p.coords}
              pathOptions={{
                color: selected ? Colors.warning : s.stroke,
                weight: selected ? 5 : 3,
                fillColor: selected ? Colors.warning : s.fill,
                fillOpacity: selected ? 0.5 : s.fillOpacity,
              }}
              eventHandlers={{
                click: (e) => {
                  (e.originalEvent as any)._leaflet_disable_click = true;
                  L.DomEvent.stopPropagation(e);
                  onSelect?.(p.id);
                },
              }}
            >
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.area_hectares.toFixed(1)} ha{p.total_heads ? ` • ${p.total_heads} cab` : ''}
              </Popup>
            </Polygon>
          );
        })}
        {/* Caixas d'água removidas do mapa por ora (coerência c/ native WebView). */}
      </MapContainer>
      {gpsStatus === 'granted' && (
        <TouchableOpacity style={styles.locateBtn} onPress={() => setRecenterKey((k) => k + 1)}>
          <Text style={styles.locateIcon}>◎</Text>
        </TouchableOpacity>
      )}
      {gpsStatus === 'denied' && (
        <View style={styles.gpsBanner}>
          <Text style={styles.gpsBannerText}>GPS negado — habilite no navegador</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300 },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    // @ts-ignore - cursor é válido no web
    cursor: 'pointer',
  },
  locateIcon: { fontSize: 24, color: Colors.primary, fontWeight: '900' },
  gpsBanner: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gpsBannerText: { color: '#fff', fontSize: 12, textAlign: 'center' },
});
