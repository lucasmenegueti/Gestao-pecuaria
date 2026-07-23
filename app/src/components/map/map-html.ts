// HTML da página Leaflet renderizada dentro do WebView nativo (FarmMap.native).
// Função pura (sem imports) — recebe CSS/JS do Leaflet e dados por parâmetro,
// o que permite gerar o mesmo HTML fora do app (harness de teste no browser).
//
// Tiles: a página NÃO acessa file:// diretamente. O WKWebView do iOS bloqueia
// subresources file:// em documentos carregados via loadHTMLString (sandbox do
// processo WebContent — allowFileAccess* não resolve). Em vez disso, cada tile
// é pedido ao lado nativo via postMessage {type:'tile', key} e entregue como
// data URI via window.__deliverTile(key, uri). Funciona igual em iOS e Android.

export interface MapHtmlOptions {
  leafletCss: string;
  leafletJs: string;
  /** JSON de { paddocks: [{id,name,area,heads,coords,style}], selectedId } */
  initialJson: string;
  /** Cor de destaque do piquete selecionado (Colors.warning) */
  colorWarning: string;
  /** JSON de string[] com as chaves "z_x_y" dos tiles empacotados */
  tileKeysJson: string;
  minZoom: number;
  maxZoom: number;
  /** JSON de [[latMin,lngMin],[latMax,lngMax]] ou 'null' */
  maxBoundsJson: string;
}

// 1×1 PNG com RGBA(0,0,0,0) — verificado byte a byte. O valor antigo usado como
// "transparente" era na verdade um pixel VERDE 50% (origem do mapa todo verde
// no iPhone quando os tiles falhavam).
export const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

export function buildMapHtml(opts: MapHtmlOptions): string {
  const {
    leafletCss,
    leafletJs,
    colorWarning,
    minZoom,
    maxZoom,
    maxBoundsJson,
  } = opts;
  // '<' escapado como < dentro das strings JSON: o parser HTML5 fecha o
  // <script> na primeira ocorrência de '</script' MESMO dentro de string JS —
  // um nome de piquete contendo isso derrubaria a página inteira.
  const initialJson = opts.initialJson.replace(/</g, '\\u003c');
  const tileKeysJson = opts.tileKeysJson.replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
<style>${leafletCss}</style>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #eee; }
  .leaflet-popup-content b { font-size: 14px; }
  .pk-label, .user-loc { pointer-events: none !important; }
  .pk-label-txt {
    transform: translate(-50%, -50%);
    display: inline-block;
    color: #fff;
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    font-weight: 700;
    white-space: nowrap;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8);
  }
</style>
<script>${leafletJs}</script>
</head>
<body>
<div id="map"></div>
<script>
  (function () {
    var data = ${initialJson};
    var TRANSPARENT = '${TRANSPARENT_PNG}';
    var tileKeys = {};
    ${tileKeysJson}.forEach(function (k) { tileKeys[k] = true; });

    function post(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    var mbRaw = ${maxBoundsJson};
    var mapOpts = { zoomControl: true, attributionControl: true, minZoom: ${minZoom}, maxZoom: ${maxZoom} };
    if (mbRaw) { mapOpts.maxBounds = L.latLngBounds(mbRaw); mapOpts.maxBoundsViscosity = 1.0; }
    var map = L.map('map', mapOpts);

    // Tiles sob demanda via bridge nativo. pendingTiles agrupa <img>s esperando
    // a mesma chave — 1 request por chave por vez, com 1 retry se o nativo não
    // responder (ex.: injectJavaScript perdido num reload) e limpeza da chave ao
    // desistir, pra um createTile futuro poder re-pedir.
    var pendingTiles = {};
    window.__deliverTile = function (key, uri) {
      var p = pendingTiles[key];
      if (!p) return;
      clearTimeout(p.timer);
      delete pendingTiles[key];
      p.imgs.forEach(function (img) { img.src = uri || TRANSPARENT; });
    };
    function armTileTimeout(key) {
      var p = pendingTiles[key];
      if (!p) return;
      p.timer = setTimeout(function () {
        var q = pendingTiles[key];
        if (!q) return;
        if (q.tries < 1) {
          q.tries++;
          post({ type: 'tile', key: key });
          armTileTimeout(key);
        } else {
          delete pendingTiles[key];
          q.imgs.forEach(function (img) { if (!img.src) img.src = TRANSPARENT; });
        }
      }, 8000);
    }
    var BundledLayer = L.GridLayer.extend({
      createTile: function (coords, done) {
        var img = document.createElement('img');
        img.alt = '';
        var settled = false;
        img.addEventListener('load', function () {
          if (!settled) { settled = true; done(null, img); }
        });
        img.addEventListener('error', function () {
          // data URI corrompida → cai pro transparente (nunca tile quebrado)
          if (img.src !== TRANSPARENT) { img.src = TRANSPARENT; }
          else if (!settled) { settled = true; done(null, img); }
        });
        var key = coords.z + '_' + coords.x + '_' + coords.y;
        if (!tileKeys[key] || !window.ReactNativeWebView) {
          img.src = TRANSPARENT;
          return img;
        }
        var p = pendingTiles[key];
        if (!p) {
          p = pendingTiles[key] = { imgs: [], tries: 0, timer: null };
          post({ type: 'tile', key: key });
          armTileTimeout(key);
        }
        p.imgs.push(img);
        return img;
      }
    });
    var bundledLayer = new BundledLayer({
      minZoom: ${minZoom}, maxZoom: ${maxZoom},
      keepBuffer: 4,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics'
    });
    bundledLayer.addTo(map);

    // Centroide (shoelace) — melhor que o centro do bbox pra polígonos em L/C.
    function polygonCentroid(coords) {
      var f, area = 0, cx = 0, cy = 0;
      for (var i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        // x = lng, y = lat
        f = coords[j][1] * coords[i][0] - coords[i][1] * coords[j][0];
        area += f;
        cx += (coords[j][1] + coords[i][1]) * f;
        cy += (coords[j][0] + coords[i][0]) * f;
      }
      if (!area) return coords[0];
      return [cy / (3 * area), cx / (3 * area)]; // [lat, lng]
    }

    function escapeHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Espaço disponível REAL na linha do texto: cordas horizontal e vertical do
    // polígono passando pelo centroide. O bbox superestima muito em polígonos
    // diagonais (paralelogramos) — label vazava a cerca.
    function chordAtCentroid(coords, centroid) {
      var clat = centroid[0], clng = centroid[1];
      var xs = [], ys = [], a, b, t, k;
      for (var i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        a = coords[j]; b = coords[i];
        if ((a[0] <= clat && b[0] > clat) || (b[0] <= clat && a[0] > clat)) {
          t = (clat - a[0]) / (b[0] - a[0]);
          xs.push(a[1] + t * (b[1] - a[1]));
        }
        if ((a[1] <= clng && b[1] > clng) || (b[1] <= clng && a[1] > clng)) {
          t = (clng - a[1]) / (b[1] - a[1]);
          ys.push(a[0] + t * (b[0] - a[0]));
        }
      }
      xs.sort(function (m, n) { return m - n; });
      ys.sort(function (m, n) { return m - n; });
      var out = { lngL: null, lngR: null, latB: null, latT: null };
      for (k = 0; k + 1 < xs.length; k += 2) {
        if (xs[k] <= clng && clng <= xs[k + 1]) { out.lngL = xs[k]; out.lngR = xs[k + 1]; break; }
      }
      for (k = 0; k + 1 < ys.length; k += 2) {
        if (ys[k] <= clat && clat <= ys[k + 1]) { out.latB = ys[k]; out.latT = ys[k + 1]; break; }
      }
      return out;
    }

    var layers = {};
    var baseStyles = {};
    var allLatLngs = [];
    var labelInfos = [];
    data.paddocks.forEach(function (p) {
      if (!p.coords || p.coords.length < 3) return;
      var st = p.style;
      var layer = L.polygon(p.coords, {
        color: st.stroke, weight: 3, fillColor: st.fill, fillOpacity: st.fillOpacity
      }).addTo(map);
      var popupExtra = p.heads ? ' · ' + p.heads + ' cab' : '';
      layer.bindPopup('<b>' + escapeHtml(p.name) + '</b><br/>' + p.area.toFixed(1) + ' ha' + popupExtra);
      layer.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        post({ type: 'select', id: p.id });
      });
      layers[p.id] = layer;
      baseStyles[p.id] = st;
      p.coords.forEach(function (c) { allLatLngs.push(c); });

      // Nome do piquete no centro do polígono. Fonte dimensionada por zoom em
      // updateLabels(); pointer-events none pra não roubar o clique do polígono.
      var centroid = polygonCentroid(p.coords);
      var labelMarker = L.marker(centroid, {
        icon: L.divIcon({
          className: 'pk-label',
          html: '<div class="pk-label-txt">' + escapeHtml(p.name) + '</div>',
          iconSize: null
        }),
        interactive: false,
        keyboard: false
      }).addTo(map);
      labelInfos.push({
        name: p.name, layer: layer, marker: labelMarker, el: null,
        ratio: 0.64 * String(p.name).length,
        centroid: centroid,
        chord: chordAtCentroid(p.coords, centroid)
      });
    });

    function updateLabels() {
      labelInfos.forEach(function (li) {
        if (!li.el) return;
        var pw, ph;
        var c = li.chord, ct = li.centroid;
        if (c.lngL != null) {
          pw = Math.abs(map.latLngToLayerPoint([ct[0], c.lngR]).x - map.latLngToLayerPoint([ct[0], c.lngL]).x);
        }
        if (c.latB != null) {
          ph = Math.abs(map.latLngToLayerPoint([c.latB, ct[1]]).y - map.latLngToLayerPoint([c.latT, ct[1]]).y);
        }
        if (pw == null || ph == null) {
          // fallback: bbox (centroide fora do polígono ou forma degenerada)
          var b = li.layer.getBounds();
          var ne = map.latLngToLayerPoint(b.getNorthEast());
          var sw = map.latLngToLayerPoint(b.getSouthWest());
          if (pw == null) pw = Math.abs(ne.x - sw.x) * 0.6;
          if (ph == null) ph = Math.abs(sw.y - ne.y) * 0.6;
        }
        var size = Math.min((pw * 0.8) / li.ratio, ph * 0.6, 18);
        // < 11px é ilegível sob sol forte (público-alvo) — melhor esconder
        if (size < 11) {
          li.el.style.display = 'none';
        } else {
          li.el.style.display = '';
          li.el.style.fontSize = size.toFixed(1) + 'px';
        }
      });
    }
    map.on('zoomend', updateLabels);

    // Clique no mapa (fora de polígono) deseleciona.
    map.on('click', function () {
      post({ type: 'select', id: null });
    });

    // Caixas d'água: removidas do mapa (markers do Leaflet default dependem de
    // imagens externas que o WebView inline não acessa, viravam broken-image).
    // Se voltar, usar L.divIcon c/ emoji.

    if (allLatLngs.length > 0) {
      map.fitBounds(allLatLngs, { padding: [30, 30] });
    } else {
      map.setView([-15.3, -45.6], ${minZoom});
    }

    // Mede a largura real de cada texto a 100px → ratio px de largura por px de
    // fonte. Faz o fit exato do nome no espaço do polígono. Precisa rodar DEPOIS
    // do fitBounds/setView: o Leaflet só cria o DOM dos markers quando a view
    // do mapa é definida (whenReady) — antes disso getElement() é undefined.
    labelInfos.forEach(function (li) {
      var iconEl = li.marker.getElement();
      li.el = iconEl ? iconEl.firstChild : null;
      if (!li.el) return;
      li.el.style.fontSize = '100px';
      var w = li.el.offsetWidth;
      if (w > 0) li.ratio = w / 100;
    });
    updateLabels();

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
        // interactive:false é essencial: sem isso o círculo (desenhado por cima
        // dos polígonos) engole o toque de quem clica na própria posição e
        // dispara o click do mapa → deseleciona em vez de selecionar o piquete.
        userAccCircle = L.circle(pos, {
          radius: acc || 0, interactive: false,
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
    window.__map = map; // exposto p/ debug e harness de teste
  })();
  true;
</script>
</body>
</html>`;
}
