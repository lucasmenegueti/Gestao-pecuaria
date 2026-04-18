import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'react-native';
import * as Location from 'expo-location';
import { FarmMapProps, parsePolygon, stylePaddock } from './types';
import { Colors } from '@/constants';
import { LEAFLET_CSS, LEAFLET_JS } from './leaflet-inline';
import { TILE_MODULES, TILE_MIN_ZOOM, TILE_MAX_ZOOM } from './tile-manifest';

function buildHtml(
  initialJson: string,
  colorWarning: string,
  tileUrisJson: string,
  minZoom: number,
  maxZoom: number,
  maxBoundsJson: string,
) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
<style>${LEAFLET_CSS}</style>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #eee; }
  .leaflet-popup-content b { font-size: 14px; }
</style>
<script>${LEAFLET_JS}</script>
</head>
<body>
<div id="map"></div>
<script>
  (function () {
    var data = ${initialJson};
    var tileUris = ${tileUrisJson};
    var TRANSPARENT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    var mbRaw = ${maxBoundsJson};
    var mapOpts = { zoomControl: true, attributionControl: true, minZoom: ${minZoom}, maxZoom: ${maxZoom} };
    if (mbRaw) { mapOpts.maxBounds = L.latLngBounds(mbRaw); mapOpts.maxBoundsViscosity = 1.0; }
    var map = L.map('map', mapOpts);

    var BundledLayer = L.TileLayer.extend({
      getTileUrl: function (coords) {
        var key = coords.z + '_' + coords.x + '_' + coords.y;
        return tileUris[key] || TRANSPARENT;
      },
      // Retry 1x com pequeno delay se falhar — Metro dev pode dropar requests quando satura
      createTile: function (coords, done) {
        var tile = L.TileLayer.prototype.createTile.call(this, coords, done);
        var retried = false;
        tile.addEventListener('error', function () {
          if (retried) return;
          retried = true;
          var src = tile.src;
          setTimeout(function () {
            tile.src = ''; tile.src = src.includes('?') ? src + '&r=1' : src + '?r=1';
          }, 300);
        });
        return tile;
      }
    });
    var bundledLayer = new BundledLayer('', {
      minZoom: ${minZoom}, maxZoom: ${maxZoom},
      errorTileUrl: TRANSPARENT,
      keepBuffer: 4,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
    });
    bundledLayer.addTo(map);

    var layers = {};
    var baseStyles = {};
    var allLatLngs = [];
    data.paddocks.forEach(function (p) {
      if (!p.coords || p.coords.length < 3) return;
      var st = p.style;
      var layer = L.polygon(p.coords, {
        color: st.stroke, weight: 3, fillColor: st.fill, fillOpacity: st.fillOpacity
      }).addTo(map);
      var popupExtra = p.heads ? ' • ' + p.heads + ' cab' : '';
      layer.bindPopup('<b>' + p.name + '</b><br/>' + p.area.toFixed(1) + ' ha' + popupExtra);
      layer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: p.id }));
        }
      });
      layers[p.id] = layer;
      baseStyles[p.id] = st;
      p.coords.forEach(function (c) { allLatLngs.push(c); });
    });

    // Clique no mapa (fora de polígono) deseleciona.
    map.on('click', function () {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: null }));
      }
    });

    // Caixas d'água: removidas do mapa (markers do Leaflet default dependem de
    // imagens externas que o WebView inline não acessa, viravam broken-image).
    // Se voltar, usar L.divIcon c/ emoji.

    if (allLatLngs.length > 0) {
      map.fitBounds(allLatLngs, { padding: [30, 30] });
    } else {
      map.setView([-15.3, -45.6], ${minZoom});
    }

    // GPS do usuário — atualizado via window.__setUserLocation(lat, lng, acc)
    var userMarker = null;
    var userAccCircle = null;
    var userIcon = L.divIcon({
      className: 'user-loc',
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px rgba(37,99,235,0.6);"></div>',
      iconSize: [18,18],
      iconAnchor: [9,9]
    });
    window.__setUserLocation = function (lat, lng, acc) {
      var pos = [lat, lng];
      if (!userMarker) {
        userMarker = L.marker(pos, { icon: userIcon, interactive: false }).addTo(map);
        userAccCircle = L.circle(pos, {
          radius: acc || 0,
          color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12
        }).addTo(map);
      } else {
        userMarker.setLatLng(pos);
        userAccCircle.setLatLng(pos);
        if (acc) userAccCircle.setRadius(acc);
      }
    };
    window.__recenterOnUser = function () {
      if (userMarker) map.flyTo(userMarker.getLatLng(), Math.min(16, ${maxZoom}), { duration: 0.6 });
    };

    function applySelection(id) {
      Object.keys(layers).forEach(function (k) {
        var sel = String(k) === String(id);
        var st = baseStyles[k];
        layers[k].setStyle({
          color: sel ? '${colorWarning}' : st.stroke,
          weight: sel ? 5 : 3,
          fillColor: sel ? '${colorWarning}' : st.fill,
          fillOpacity: sel ? 0.5 : st.fillOpacity
        });
      });
      if (id && layers[id]) {
        map.flyToBounds(layers[id].getBounds(), { padding: [40, 40], duration: 0.8 });
      }
    }
    window.__setSelected = applySelection;
    if (data.selectedId != null) applySelection(data.selectedId);
  })();
  true;
</script>
</body>
</html>`;
}

export function FarmMap({ paddocks, waterTanks, selectedId, onSelect, mode = 'gado', style }: FarmMapProps) {
  const webRef = useRef<WebView | null>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  // URI map {z_x_y: url}. Resolução é síncrona via Image.resolveAssetSource —
  // em Expo Go retorna http://<metro>/assets/... (servido pelo dev server);
  // em APK release retorna file:///android_asset/... (bundled).
  // Ambos são URLs válidas para <img src> / L.TileLayer no WebView.
  const tileUris = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, mod] of Object.entries(TILE_MODULES)) {
      const src = Image.resolveAssetSource(mod as any);
      if (src?.uri) map[key] = src.uri;
    }
    return map;
  }, []);

  const payload = useMemo(() => {
    const parsed = paddocks
      .map((p) => {
        const ring = parsePolygon(p.geometry).map((c) => [c.latitude, c.longitude]);
        return {
          id: p.id,
          name: p.name,
          area: p.area_hectares,
          heads: p.total_heads ?? 0,
          coords: ring,
          style: stylePaddock(p, mode),
        };
      })
      .filter((p) => p.coords.length > 2);
    const tanks = waterTanks.map((t) => ({ id: t.id, name: t.name, lat: t.lat, lng: t.lng }));
    return JSON.stringify({ paddocks: parsed, tanks, selectedId: selectedId ?? null });
  }, [paddocks, waterTanks, selectedId, mode]);

  // Limite de pan: bbox dos polígonos + folga.
  const maxBoundsJson = useMemo(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    paddocks.forEach((p) => {
      parsePolygon(p.geometry).forEach((c) => {
        lats.push(c.latitude);
        lngs.push(c.longitude);
      });
    });
    if (lats.length === 0) return 'null';
    const pad = 0.01;
    return JSON.stringify([
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ]);
  }, [paddocks]);

  const html = useMemo(
    () =>
      buildHtml(
        payload,
        Colors.warning,
        JSON.stringify(tileUris),
        TILE_MIN_ZOOM,
        TILE_MAX_ZOOM,
        maxBoundsJson,
      ),
    // Selection não reconstrói HTML — é injetada via __setSelected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paddocks, waterTanks, mode, tileUris, maxBoundsJson],
  );

  // Memoizado pra não disparar reload do WebView (perda de zoom/pan/Leaflet init
  // + 2700 tile lookups) a cada re-render do parent.
  const webSource = useMemo(() => ({ html, baseUrl: 'file:///' }), [html]);

  useEffect(() => {
    if (!webRef.current) return;
    const id = selectedId ?? 'null';
    webRef.current.injectJavaScript(`window.__setSelected && window.__setSelected(${id}); true;`);
  }, [selectedId]);

  // GPS: subscreve atualizações de posição e injeta no WebView
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setLocationDenied(true);
        return;
      }
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // m
          timeInterval: 2000, // ms
        },
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (!webRef.current) return;
          webRef.current.injectJavaScript(
            `window.__setUserLocation && window.__setUserLocation(${latitude}, ${longitude}, ${accuracy ?? 0}); true;`
          );
          if (!cancelled) setHasLocation(true);
        }
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  function recenterOnUser() {
    if (!webRef.current || !hasLocation) return;
    webRef.current.injectJavaScript(`window.__recenterOnUser && window.__recenterOnUser(); true;`);
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        // baseUrl 'file:///' dá ao HTML um origin `file://`, permitindo que
        // <img src="file:///android_asset/..."> dos tiles carregue. Sem isso o
        // WebView cai em `about:blank` e same-origin policy bloqueia file://.
        source={webSource}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'select' && typeof msg.id === 'number') onSelect?.(msg.id);
          } catch {}
        }}
      />
      {hasLocation && (
        <TouchableOpacity style={styles.locateBtn} onPress={recenterOnUser}>
          <Text style={styles.locateIcon}>◎</Text>
        </TouchableOpacity>
      )}
      {locationDenied && (
        <View style={styles.gpsBanner}>
          <Text style={styles.gpsBannerText}>GPS negado — habilite nas configurações do celular</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, backgroundColor: '#eee' },
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
