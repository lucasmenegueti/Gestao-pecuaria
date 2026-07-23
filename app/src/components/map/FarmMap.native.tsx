import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { FarmMapProps, parsePolygon, stylePaddock } from './types';
import { Colors } from '@/constants';
import { LEAFLET_CSS, LEAFLET_JS } from './leaflet-inline';
import { TILE_MODULES, TILE_MIN_ZOOM, TILE_MAX_ZOOM } from './tile-manifest';
import { buildMapHtml, TRANSPARENT_PNG } from './map-html';

export function FarmMap({ paddocks, waterTanks, selectedId, onSelect, mode = 'gado', style }: FarmMapProps) {
  const webRef = useRef<WebView | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump p/ forçar recarga manual
  // Última posição conhecida — re-injetada quando o WebView recarrega (iOS mata
  // o processo do WKWebView em background; sem isso o pontinho do GPS sumia ao
  // voltar de outro app).
  const lastLocRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);
  const watchPromiseRef = useRef<Promise<Location.LocationSubscription> | null>(null);
  const mountedRef = useRef(true);
  const gpsMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      buildMapHtml({
        leafletCss: LEAFLET_CSS,
        leafletJs: LEAFLET_JS,
        initialJson: payload,
        colorWarning: Colors.warning,
        tileKeysJson: JSON.stringify(Object.keys(TILE_MODULES)),
        minZoom: TILE_MIN_ZOOM,
        maxZoom: TILE_MAX_ZOOM,
        maxBoundsJson,
      }),
    // Selection não reconstrói HTML — é injetada via __setSelected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paddocks, waterTanks, mode, maxBoundsJson],
  );

  // Memoizado pra não disparar reload do WebView (perda de zoom/pan/Leaflet init)
  // a cada re-render do parent.
  const webSource = useMemo(() => ({ html, baseUrl: 'file:///' }), [html]);

  useEffect(() => {
    if (!webRef.current) return;
    const id = selectedId ?? 'null';
    webRef.current.injectJavaScript(`window.__setSelected && window.__setSelected(${id}); true;`);
  }, [selectedId]);

  // Tile pedido pela página via postMessage — lê o asset local e devolve como
  // data URI. Evita <img src="file://..."> que o WKWebView do iOS bloqueia
  // (sandbox do processo WebContent em documentos loadHTMLString), causa do
  // mapa sem imagem no iPhone.
  async function deliverTile(key: string) {
    let uri = TRANSPARENT_PNG;
    const mod = TILE_MODULES[key];
    if (mod != null) {
      // 2 tentativas: no Expo Go o Metro pode dropar o download quando satura.
      for (let attempt = 0; attempt < 2 && uri === TRANSPARENT_PNG; attempt++) {
        try {
          const asset = Asset.fromModule(mod);
          if (!asset.localUri) await asset.downloadAsync();
          if (asset.localUri) {
            const b64 = await FileSystem.readAsStringAsync(asset.localUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            uri = 'data:image/jpeg;base64,' + b64;
          }
        } catch {
          // tile ilegível → retry; persistindo, transparente (fundo neutro, nunca verde)
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
    webRef.current?.injectJavaScript(
      `window.__deliverTile && window.__deliverTile(${JSON.stringify(key)}, ${JSON.stringify(uri)}); true;`
    );
  }

  function pushLocation(lat: number, lng: number, acc: number, recenter = false) {
    lastLocRef.current = { lat, lng, acc };
    webRef.current?.injectJavaScript(
      `window.__setUserLocation && window.__setUserLocation(${lat}, ${lng}, ${acc});` +
        (recenter ? `window.__recenterOnUser && window.__recenterOnUser();` : '') +
        ` true;`
    );
  }

  // Inicia (uma vez) o watch contínuo de posição. Idempotente — chamado no
  // mount e também pelo botão de GPS, pra cobrir o caso "negou a permissão no
  // boot, concedeu depois pelo botão" (Android): sem isso o pontinho ficava
  // congelado no fix pontual e não acompanhava mais o movimento.
  function ensureWatch() {
    if (watchPromiseRef.current) return watchPromiseRef.current;
    const p = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5, // m
        timeInterval: 2000, // ms
      },
      (pos) => {
        if (!mountedRef.current) return;
        const { latitude, longitude, accuracy } = pos.coords;
        pushLocation(latitude, longitude, accuracy ?? 0);
      }
    ).catch((err) => {
      watchPromiseRef.current = null; // permite nova tentativa
      throw err;
    });
    watchPromiseRef.current = p;
    return p;
  }

  // GPS: subscreve atualizações de posição e injeta no WebView
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      ensureWatch().catch(() => {});
    })();
    return () => {
      mountedRef.current = false;
      watchPromiseRef.current?.then((s) => s.remove()).catch(() => {});
      if (gpsMsgTimerRef.current) clearTimeout(gpsMsgTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ao voltar de outro app, re-injeta a última posição — se o WebView foi
  // recarregado enquanto o app estava em background, o marker é recriado.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      const last = lastLocRef.current;
      if (last) pushLocation(last.lat, last.lng, last.acc);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showGpsMsg(msg: string) {
    setGpsMsg(msg);
    if (gpsMsgTimerRef.current) clearTimeout(gpsMsgTimerRef.current);
    gpsMsgTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setGpsMsg(null);
    }, 4000);
  }

  // Botão de GPS: busca ativamente a posição atual (não depende do watch já ter
  // emitido) e recentra o mapa nela.
  async function locateMe() {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      setLocationDenied(false);
      ensureWatch().catch(() => {});
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('gps-timeout')), 8000)),
      ]);
      pushLocation(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? 0, true);
    } catch {
      // Fix atual indisponível (GPS frio/indoor) — usa a última conhecida do OS
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          pushLocation(last.coords.latitude, last.coords.longitude, last.coords.accuracy ?? 0, true);
        } else if (lastLocRef.current) {
          const l = lastLocRef.current;
          pushLocation(l.lat, l.lng, l.acc, true);
        } else {
          showGpsMsg('GPS indisponível no momento — tente de novo em céu aberto');
        }
      } catch {
        showGpsMsg('GPS indisponível no momento — tente de novo em céu aberto');
      }
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        key={reloadKey}
        ref={webRef}
        originWhitelist={['*']}
        source={webSource}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        // iOS mata o processo do WKWebView sob pressão de memória / background
        // longo — sem recuperação a tela do mapa ficava morta/branca ao voltar.
        // Tem que ser REMOUNT (bump da key), não reload(): pra source={{html}} o
        // WKWebView não retém o HTML string após a morte do processo — reload()
        // navega pro baseURL e termina numa tela branca. O remount refaz o
        // loadHTMLString do zero. onRenderProcessGone é o equivalente Android.
        onContentProcessDidTerminate={() => setReloadKey((k) => k + 1)}
        onRenderProcessGone={() => setReloadKey((k) => k + 1)}
        onLoadEnd={() => {
          // Página (re)carregada: restaura marker do GPS e seleção atual.
          // __setSelected SEMPRE (mesmo null): o HTML pode ter embutido uma
          // seleção antiga de quando foi gerado — null aqui limpa o fantasma.
          const last = lastLocRef.current;
          if (last) pushLocation(last.lat, last.lng, last.acc);
          webRef.current?.injectJavaScript(
            `window.__setSelected && window.__setSelected(${selectedId ?? 'null'}); true;`
          );
        }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            // type='select' com id numérico = clique em polígono.
            // type='select' com id=null = clique no mapa fora dos piquetes (deseleciona).
            if (msg.type === 'select') {
              onSelect?.(typeof msg.id === 'number' ? msg.id : null);
            } else if (msg.type === 'tile' && typeof msg.key === 'string') {
              deliverTile(msg.key);
            }
          } catch {}
        }}
      />
      {/* Botão discreto de refresh — recarrega o WebView se algo travar. */}
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={() => setReloadKey((k) => k + 1)}
        hitSlop={6}
      >
        <Text style={styles.refreshIcon}>⟳</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.locateBtn} onPress={locateMe} disabled={locating}>
        {locating ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Text style={styles.locateIcon}>◎</Text>
        )}
      </TouchableOpacity>
      {(locationDenied || gpsMsg) && (
        <View style={styles.gpsBanner}>
          <Text style={styles.gpsBannerText}>
            {locationDenied ? 'GPS negado — habilite nas configurações do celular' : gpsMsg}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1, backgroundColor: '#eee' },
  refreshBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  refreshIcon: { fontSize: 16, color: Colors.primary, fontWeight: '900', lineHeight: 18 },
  locateBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    // Acima do botão de GPS (56px + margem) — embaixo cobria metade do botão
    // exatamente no estado em que o peão precisa tocá-lo pra re-pedir permissão.
    bottom: 80,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  gpsBannerText: { color: '#fff', fontSize: 12, textAlign: 'center' },
});
