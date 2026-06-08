"""
Relatório Diário da Pecuária — Fazenda NSA.

4 seções (1 página cada):
  1. Mapa (estilo dashboard: todos os talhões, verde/vermelho/cinza por gado+ronda)
     + checklist por talhão rondado: verificado / a verificar.
  2. Mudanças de pasto (transferências), nascimentos e mortes.
  3. Estoque de produtos: movimentações, rotas de reabastecimento e alertas de mínimo
     (fórmulas inativas não aparecem).
  4. Estoque de gado por categoria + gado sem alocação.

Gera HTML (design-system NSA) -> PDF (weasyprint/Chrome) -> envia via Z-API.

Uso:
    python daily_report.py 2026-06-05                       # produção (Supabase live)
    python daily_report.py 2026-06-05 --send                # + envia no WhatsApp
    python daily_report.py 2026-06-05 --dump-fixture        # salva fixtures/<data>.json
    python daily_report.py 2026-06-05 --data-file f.json    # validação offline

Env vars (na routine, nunca no repo):
  SUPABASE_URL, SUPABASE_ANON_KEY, NSA_USER, NSA_PASS    (login de admin → JWT, ignora RLS via admin)
  ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN, WHATSAPP_PHONE
"""
import argparse
import base64
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.request
import urllib.parse
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from html import escape

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
WEEKDAYS_PT = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
               "sexta-feira", "sábado", "domingo"]
MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
REQUIRED_SECTIONS = ["supplement", "water", "fence"]
SECTION_LABELS = {
    "supplement": "Suplementação", "water": "Aguada", "fence": "Cerca",
    "forage": "Forragem", "health": "Sanidade", "biological": "Biológico",
    "weight": "Peso visual", "bombona": "Bombona", "washing": "Lavagem",
}
EVAL_TABLES = [
    ("supplement", "supplement_evals"), ("water", "water_evals"),
    ("fence", "fence_evals"), ("biological", "biological_water_evals"),
    ("forage", "forage_evals"), ("health", "health_evals"),
    ("weight", "visual_weight_evals"),
]
ESRI = ("https://services.arcgisonline.com/ArcGIS/rest/services/"
        "World_Imagery/MapServer/export")
# Cores estilo dashboard
ST_GREEN, ST_RED, ST_GREY = "#46a046", "#d65745", "#9aa0a6"
NAVY = "#3a4a9a"
ST_LABEL = {"green": "Com gado · ronda feita", "red": "Com gado · sem ronda", "grey": "Sem gado"}
ST_COLOR = {"green": ST_GREEN, "red": ST_RED, "grey": ST_GREY}
BRT = timezone(timedelta(hours=-3))
# Currais de confinamento (CF1, CF2…) não passam pela ronda de pasto — ficam fora
# da cobertura de vistoria (mapa e contagem de "sem ronda"). O gado deles continua
# nos totais do rebanho (pág. 4).
CONFINEMENT_RE = re.compile(r"^CF\s*\d+$", re.IGNORECASE)


def fmt_int(n):
    return f"{int(round(n)):,}".replace(",", ".")


def plural(n, sing, plur):
    return sing if n == 1 else plur


def join_pt(items):
    items = list(items)
    if len(items) <= 1:
        return items[0] if items else ""
    return ", ".join(items[:-1]) + " e " + items[-1]


def date_extenso(iso):
    dt = datetime.strptime(iso, "%Y-%m-%d")
    return f"{dt.day} de {MONTHS_PT[dt.month - 1]} de {dt.year} · {WEEKDAYS_PT[dt.weekday()]}"


def hhmm(iso):
    if not iso:
        return ""
    s = iso.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        s2 = s[:19] + s[-6:] if ("+" in s[10:] or "-" in s[10:]) else s[:19]
        dt = datetime.fromisoformat(s2)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BRT).strftime("%H:%M")


# ---------------------------------------------------------------------------
# Carga de dados — login de admin (JWT) + REST (RLS libera admin)
# ---------------------------------------------------------------------------
_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def _req(url, headers, data=None, method="GET", timeout=60):
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method)
    headers = {"User-Agent": _UA, **headers}
    for k, v in headers.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8")) if raw else None


def login(url, anon, user, pw):
    h = {"apikey": anon, "Authorization": f"Bearer {anon}", "Content-Type": "application/json"}
    email = _req(f"{url}/rest/v1/rpc/email_for_username", h, {"u": user.lower()}, "POST")
    if not isinstance(email, str):
        raise RuntimeError("usuário não encontrado (email_for_username)")
    tok = _req(f"{url}/auth/v1/token?grant_type=password",
               {"apikey": anon, "Content-Type": "application/json"},
               {"email": email, "password": pw}, "POST")
    if not tok or not tok.get("access_token"):
        raise RuntimeError("login inválido")
    return tok["access_token"]


def make_getter(url, anon, access):
    h = {"apikey": anon, "Authorization": f"Bearer {access}", "Accept": "application/json"}
    def get(table, **params):
        qs = urllib.parse.urlencode(params, safe="().,:")
        return _req(f"{url}/rest/v1/{table}?{qs}", h)
    return get


def _ring(geom):
    if not geom:
        return None
    coords = geom.get("coordinates")
    if not coords:
        return None
    if geom.get("type") == "MultiPolygon":
        ring = coords[0][0]
    else:
        ring = coords[0]
    return [[round(float(p[0]), 5), round(float(p[1]), 5)] for p in ring]


def fetch_live(date_iso):
    url = os.environ.get("SUPABASE_URL")
    anon = os.environ.get("SUPABASE_ANON_KEY")
    user = os.environ.get("NSA_USER")
    pw = os.environ.get("NSA_PASS")
    if not all([url, anon, user, pw]):
        sys.stderr.write("ERRO: SUPABASE_URL/SUPABASE_ANON_KEY/NSA_USER/NSA_PASS ausentes "
                         "(ou use --data-file p/ validação).\n")
        sys.exit(2)
    access = login(url, anon, user, pw)
    get = make_getter(url, anon, access)

    d0 = datetime.strptime(date_iso, "%Y-%m-%d").date()
    d1 = (d0 + timedelta(days=1)).strftime("%Y-%m-%d")
    win_lo, win_hi = f"{date_iso}T00:00:00-03:00", f"{d1}T00:00:00-03:00"

    paddocks = get("paddocks", select="id,name,center_lat,center_lng,geometry,active",
                   deleted_at="is.null", limit=1000) or []
    herd = get("herd", select="paddock_id,category,head_count", head_count="gt.0",
               deleted_at="is.null", limit=2000) or []
    formulas = get("formulas", select="id,name,active", deleted_at="is.null") or []
    inventory = get("inventory", select="location,formula_id,quantity_sacks,min_sacks,paddock_id,last_resupply_date",
                    deleted_at="is.null", limit=1000) or []
    profiles = get("profiles", select="id,name") or []
    rondas = get("rondas", select="id,paddock_id,user_id,completed,created_at",
                 date=f"eq.{date_iso}", deleted_at="is.null", limit=1000) or []
    herd_events = get("herd_events",
                      select="event_type,category,head_count,paddock_id,target_paddock_id,notes,created_at",
                      date=f"eq.{date_iso}", deleted_at="is.null", order="created_at") or []
    deliveries = get("resupply_deliveries", select="paddock_id,formula_id,sacks_delivered,delivered_at",
                     delivered_at=f"gte.{win_lo}", limit=1000) or []
    deliveries = [x for x in deliveries if win_lo <= x["delivered_at"] < win_hi] if deliveries else []
    routes = get("resupply_routes", select="id,status,start_time", start_time=f"gte.{win_lo}") or []
    routes = [r for r in routes if win_lo <= r["start_time"] < win_hi]
    inv_ev = get("inventory_events", select="id", created_at=f"gte.{win_lo}", limit=1000) or []
    inv_events_day = len(inv_ev)

    pname = {p["id"]: p["name"] for p in paddocks}
    pcoord = {p["id"]: (p.get("center_lng"), p.get("center_lat")) for p in paddocks}
    prof = {p["id"]: p["name"] for p in profiles}
    fname = {f["id"]: f["name"] for f in formulas}
    factive = {f["id"]: f.get("active", True) for f in formulas}

    heads_by_paddock = defaultdict(int)
    cattle_ids = set()
    for h in herd:
        if h.get("paddock_id"):
            heads_by_paddock[h["paddock_id"]] += h["head_count"]
            cattle_ids.add(h["paddock_id"])

    # --- avaliações por ronda (carrega antes: define quais rondas têm conteúdo real) ---
    ronda_ids = [r["id"] for r in rondas]
    in_list = "(" + ",".join(ronda_ids) + ")" if ronda_ids else None
    sections_by_ronda = defaultdict(set)
    supp_by_ronda = {}
    if in_list:
        for kind, table in EVAL_TABLES:
            sel = "ronda_id"
            if kind == "supplement":
                sel = "ronda_id,trough_score,restocked,sacks_in_trough"
            rows = get(table, select=sel, ronda_id=f"in.{in_list}", deleted_at="is.null", limit=2000) or []
            for e in rows:
                sections_by_ronda[e["ronda_id"]].add(kind)
                if kind == "supplement":
                    cur = supp_by_ronda.get(e["ronda_id"])
                    sk = e.get("sacks_in_trough") or 0
                    if not cur or sk > (cur.get("sacks") or 0) or e.get("trough_score") == "VAZIO":
                        supp_by_ronda[e["ronda_id"]] = {
                            "score": e.get("trough_score"),
                            "restocked": bool(e.get("restocked")),
                            "sacks": sk}

    # Só rondas com avaliação real contam: o sync do app gera linhas de ronda vazias
    # (e duplicadas) — sem nenhuma seção. Elas não são vistoria, então as descartamos
    # para não inflar a contagem nem pintar talhão de verde sem inspeção de verdade.
    real_rondas = [r for r in rondas if sections_by_ronda.get(r["id"])]
    empty_rondas_dropped = len(rondas) - len(real_rondas)
    ronda_pids = {r["paddock_id"] for r in real_rondas}

    # --- mapa: todos os talhões ativos c/ geometria, status por gado+ronda ---
    paddocks_out, counts = [], {"green": 0, "red": 0, "grey": 0}
    for p in paddocks:
        if not p.get("active"):
            continue
        ring = _ring(p.get("geometry"))
        if not ring:
            continue
        pid = p["id"]
        if pid in cattle_ids:
            st = "green" if pid in ronda_pids else "red"
        else:
            st = "grey"
        counts[st] += 1
        paddocks_out.append({"n": p["name"], "c": ring, "status": st})

    rondas_out = []
    for r in real_rondas:
        sp = supp_by_ronda.get(r["id"], {})
        rondas_out.append({
            "talhao": pname.get(r["paddock_id"], "—"),
            "lat": pcoord.get(r["paddock_id"], (None, None))[1],
            "lng": pcoord.get(r["paddock_id"], (None, None))[0],
            "peao": prof.get(r["user_id"], "—"),
            "hora": hhmm(r.get("created_at")),
            "heads": heads_by_paddock.get(r["paddock_id"], 0),
            "completed": bool(r.get("completed")),
            "sections": sorted(sections_by_ronda.get(r["id"], [])),
            "score": sp.get("score"), "restocked": sp.get("restocked", False),
            "sacks": sp.get("sacks", 0),
        })
    rondas_out.sort(key=lambda x: (x["hora"], x["talhao"]))

    # --- herd events ---
    he_out = [{
        "type": e["event_type"], "cat": e["category"], "heads": e["head_count"],
        "origem": pname.get(e.get("paddock_id")), "destino": pname.get(e.get("target_paddock_id")),
        "notes": e.get("notes"), "hora": hhmm(e.get("created_at")),
    } for e in herd_events]

    # --- inventário: SÓ fórmulas ativas ---
    inv_out = []
    for i in inventory:
        if not factive.get(i["formula_id"], False):
            continue
        inv_out.append({
            "loc": i["location"], "formula": fname.get(i["formula_id"], "?"),
            "qty": i["quantity_sacks"], "min": i["min_sacks"],
            "alerta": i["quantity_sacks"] <= i["min_sacks"],
            "last_resupply": i.get("last_resupply_date"),
            "talhao": pname.get(i.get("paddock_id")),
        })

    # --- categorias + sem alocação ---
    cat_tot = defaultdict(lambda: [0, 0])
    unalloc = defaultdict(lambda: [0, 0])
    for h in herd:
        cat_tot[h["category"]][0] += h["head_count"]
        cat_tot[h["category"]][1] += 1
        if not h.get("paddock_id"):
            unalloc[h["category"]][0] += h["head_count"]
            unalloc[h["category"]][1] += 1
    herd_categories = sorted(
        [{"cat": c, "heads": v[0], "lots": v[1]} for c, v in cat_tot.items()],
        key=lambda x: -x["heads"])
    unallocated = sorted(
        [{"cat": c, "heads": v[0], "lots": v[1]} for c, v in unalloc.items()],
        key=lambda x: -x["heads"])

    # --- rotas de reabastecimento (entregas do dia) ---
    resupply = sorted([{
        "talhao": pname.get(x.get("paddock_id"), "—"),
        "formula": fname.get(x.get("formula_id"), "?"),
        "sacks": x["sacks_delivered"], "hora": hhmm(x.get("delivered_at")),
    } for x in deliveries], key=lambda x: x["hora"])

    return {
        "date": date_iso, "rondas": rondas_out, "herd_events": he_out,
        "inv_events_day": inv_events_day, "inventory": inv_out,
        "herd_categories": herd_categories, "unallocated": unallocated,
        "resupply": resupply, "routes_count": len(routes),
        "paddocks": paddocks_out, "status_counts": counts,
        "empty_rondas_dropped": empty_rondas_dropped,
    }


def load_fixture(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def drop_confinement(data):
    """Tira os currais de confinamento (CF*) da cobertura de ronda: somem do mapa e
    não contam em verde/vermelho/cinza nem em "com gado · sem ronda". O rebanho deles
    segue nos totais por categoria (pág. 4). Idempotente — roda sobre live e fixtures."""
    paddocks = data.get("paddocks", [])
    kept = [p for p in paddocks if not CONFINEMENT_RE.match((p.get("n") or "").strip())]
    counts = {"green": 0, "red": 0, "grey": 0}
    for p in kept:
        counts[p["status"]] = counts.get(p["status"], 0) + 1
    data["paddocks"] = kept
    data["status_counts"] = counts
    data["confinement_excluded"] = len(paddocks) - len(kept)
    return data


# ---------------------------------------------------------------------------
def parse_evolucao(notes):
    if not notes or "→" not in notes:
        return None
    a, b = notes.split("·")[0].split("→", 1)
    return a.strip(), b.strip()


def compute(data):
    by_talhao = defaultdict(lambda: {"rondas": [], "sections": set()})
    for r in data["rondas"]:
        g = by_talhao[r["talhao"]]
        g["rondas"].append(r)
        g["sections"].update(r.get("sections") or [])
    talhoes = []
    for name, g in by_talhao.items():
        secs = g["sections"]
        missing = [s for s in REQUIRED_SECTIONS if s not in secs]
        first = sorted(g["rondas"], key=lambda r: r["hora"])[0]
        talhoes.append({
            "name": name, "rondas": g["rondas"], "sections": secs, "missing": missing,
            "status": "green" if not missing else "amber", "peao": first["peao"],
            "horas": sorted({r["hora"] for r in g["rondas"]}), "heads": first["heads"],
            "n": len(g["rondas"]), "score": first.get("score"),
            "restock_sacks": sum((r.get("sacks") or 0) for r in g["rondas"] if r.get("restocked")),
            "restocked": any(r.get("restocked") for r in g["rondas"]),
        })
    talhoes.sort(key=lambda t: t["horas"][0])

    ev = data["herd_events"]
    transfers = [e for e in ev if e["type"] == "TRANSFERENCIA"]
    births = [e for e in ev if e["type"] == "NASCIMENTO"]
    deaths = [e for e in ev if e["type"] == "MORTE"]
    buys = [e for e in ev if e["type"] == "COMPRA"]
    sells = [e for e in ev if e["type"] == "VENDA"]
    evol = [e for e in ev if e["type"] == "EVOLUCAO"]

    cat_delta = defaultdict(int)
    for e in births + buys:
        cat_delta[e["cat"]] += e["heads"]
    for e in deaths + sells:
        cat_delta[e["cat"]] -= e["heads"]
    reclass_delta = defaultdict(int)
    for e in evol:
        pr = parse_evolucao(e.get("notes"))
        if pr:
            reclass_delta[pr[0]] -= e["heads"]
            reclass_delta[pr[1]] += e["heads"]
        else:
            reclass_delta[e["cat"]] -= e["heads"]

    inv = data["inventory"]
    central = [i for i in inv if i["loc"] == "central"]
    bombonas = [i for i in inv if i["loc"] == "bombona"]
    alerts = [i for i in inv if i["alerta"]]

    total_herd = sum(c["heads"] for c in data["herd_categories"])
    counts = data.get("status_counts", {"green": 0, "red": 0, "grey": 0})
    kpis = {
        "talhoes": len(talhoes), "rondas": len(data["rondas"]),
        "heads_cobertas": sum(t["heads"] for t in talhoes),
        "com_gado_sem_ronda": counts.get("red", 0),
        "completas": sum(1 for t in talhoes if t["status"] == "green"),
        "transfers": sum(e["heads"] for e in transfers),
        "births": sum(e["heads"] for e in births), "deaths": sum(e["heads"] for e in deaths),
        "alerts": len(alerts), "restock_sacks": sum(t["restock_sacks"] for t in talhoes),
        "total_herd": total_herd, "net_total": sum(cat_delta.values()),
        "unalloc": sum(u["heads"] for u in data.get("unallocated", [])),
    }
    return {"talhoes": talhoes, "transfers": transfers, "births": births, "deaths": deaths,
            "buys": buys, "sells": sells, "evol": evol, "cat_delta": cat_delta,
            "reclass_delta": reclass_delta, "central": central, "bombonas": bombonas,
            "alerts": alerts, "kpis": kpis}


# ---------------------------------------------------------------------------
# Mapa estilo dashboard
# ---------------------------------------------------------------------------
def _bbox(paddocks, pad=0.04):
    xs = [p[0] for g in paddocks for p in g["c"]]
    ys = [p[1] for g in paddocks for p in g["c"]]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    dx, dy = (maxx - minx) or 0.01, (maxy - miny) or 0.01
    return minx - dx * pad, miny - dy * pad, maxx + dx * pad, maxy + dy * pad


def build_map_svg(paddocks, counts, width=1100, target_aspect=None):
    geos = [g for g in paddocks if g.get("c")]
    if not geos:
        return ('<div class="map-fallback">Sem geometria para o mapa.</div>', counts)
    minx, miny, maxx, maxy = _bbox(geos)
    midlat = (miny + maxy) / 2
    coslat = math.cos(math.radians(midlat))
    if target_aspect:
        lng_m = (maxx - minx) * 111320 * coslat
        lat_m = (maxy - miny) * 110570
        cur = lng_m / lat_m if lat_m else target_aspect
        if cur < target_aspect:
            extra = ((target_aspect * lat_m) - lng_m) / (111320 * coslat) / 2
            minx, maxx = minx - extra, maxx + extra
        elif cur > target_aspect:
            extra = ((lng_m / target_aspect) - lat_m) / 110570 / 2
            miny, maxy = miny - extra, maxy + extra
    lng_m = (maxx - minx) * 111320 * coslat
    lat_m = (maxy - miny) * 110570
    height = int(round(width * (lat_m / lng_m))) if lng_m else int(width * 0.7)
    height = max(300, min(height, 1500))

    img_tag, ok = "", False
    try:
        params = (f"?bbox={minx},{miny},{maxx},{maxy}&bboxSR=4326&imageSR=4326"
                  f"&size={width},{height}&format=png24&transparent=false&f=image")
        with urllib.request.urlopen(ESRI + params, timeout=40) as resp:
            raw = resp.read()
        if raw[:8] == b"\x89PNG\r\n\x1a\n":
            img_tag = (f'<image href="data:image/png;base64,{base64.b64encode(raw).decode("ascii")}" '
                       f'x="0" y="0" width="{width}" height="{height}" preserveAspectRatio="none"/>')
            ok = True
    except Exception as e:  # pragma: no cover
        sys.stderr.write(f"AVISO: satélite Esri falhou ({e}).\n")
    if not ok:
        img_tag = f'<rect width="{width}" height="{height}" fill="#223018"/>'

    def px(lng, lat):
        return ((lng - minx) / (maxx - minx) * width, (maxy - lat) / (maxy - miny) * height)

    # desenha cinzas primeiro, depois com-gado por cima (destaque)
    order = {"grey": 0, "red": 1, "green": 2}
    polys = []
    for g in sorted(geos, key=lambda x: order.get(x["status"], 0)):
        col = ST_COLOR[g["status"]]
        op = 0.32 if g["status"] == "grey" else 0.52
        pts = " ".join(f"{px(p[0], p[1])[0]:.1f},{px(p[0], p[1])[1]:.1f}" for p in g["c"])
        polys.append(f'<polygon points="{pts}" fill="{col}" fill-opacity="{op}" '
                     f'stroke="{NAVY}" stroke-width="1.1" stroke-opacity="0.85"/>')
    svg = (f'<svg viewBox="0 0 {width} {height}" class="map-svg" '
           f'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">'
           f'{img_tag}{"".join(polys)}'
           f'<rect width="{width}" height="{height}" fill="none" stroke="#0c1609" stroke-width="2"/></svg>')
    return svg, counts


# ---------------------------------------------------------------------------
CSS = """
@import url('https://rsms.me/inter/inter.css');
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4; margin: 13mm 12mm 12mm 12mm; }
html { font-family: 'Inter', sans-serif; font-size: 9.5pt; color: #1f1f1c; }
body { background: #fff; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.header { background: #172514; color: #ffffe3; padding: 16px 20px; border-radius: 4px;
  display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6mm; }
.header .brand { font-family: 'Lora', Georgia, serif; letter-spacing: 0.14em; font-size: 15pt; opacity: 0.92; }
.header .title { font-size: 17pt; font-weight: 600; line-height: 1.12; margin-top: 1px; }
.header .date { font-size: 10.5pt; opacity: 0.82; margin-top: 3px; }
.header .meta { text-align: right; font-size: 8.5pt; opacity: 0.82; line-height: 1.5; }
.pagehead { display: flex; align-items: baseline; gap: 10px; margin-bottom: 5mm;
  padding-bottom: 4px; border-bottom: 2px solid #172514; }
.pagehead.tight { margin-bottom: 3mm; }
.pagehead .num { background: #172514; color: #ffffe3; width: 24px; height: 24px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; font-size: 11pt; font-weight: 700; flex: none; }
.pagehead h2 { font-size: 13pt; font-weight: 600; color: #172514; }
.pagehead .sub { margin-left: auto; font-size: 9pt; color: #787873; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 6mm; }
.kpi-grid.tight { margin-bottom: 3mm; }
.kpi { background: #f4f6f3; border: 1px solid #e5e5e1; border-radius: 6px; padding: 8px 11px; }
.kpi-grid.tight .kpi { padding: 6px 10px; }
.kpi .label { font-size: 7.5pt; font-weight: 500; text-transform: uppercase; letter-spacing: 0.07em; color: #787873; }
.kpi .value { font-size: 15pt; font-weight: 600; font-variant-numeric: tabular-nums; color: #172514; margin-top: 2px; }
.kpi-grid.tight .kpi .value { font-size: 13pt; }
.kpi .sub { font-size: 8pt; color: #787873; margin-top: 1px; }
.kpi-grid.tight .kpi .sub { font-size: 7.3pt; }
.kpi.alert .value { color: #b88217; }
.kpi.danger .value { color: #c0392b; }
table { width: 100%; border-collapse: collapse; font-size: 8.7pt; }
thead th { background: #f7f7f5; text-align: left; font-size: 7.5pt; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: #54544f; padding: 5px 7px; border-bottom: 1px solid #d2d2cd; }
tbody td { padding: 5px 7px; border-bottom: 1px solid #efefec; vertical-align: top; }
tbody tr:nth-child(odd) { background: #fcfcfb; }
table.compact thead th { padding: 3px 6px; font-size: 7pt; }
table.compact tbody td { padding: 1.7px 6px; font-size: 8.1pt; }
table.compact tbody td .muted { line-height: 1.12; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.muted { color: #787873; }
h3 { font-size: 10pt; font-weight: 600; color: #1f3520; margin: 5mm 0 2mm; }
h3 .c { font-weight: 500; color: #787873; font-size: 8.5pt; margin-left: 6px; }
.map-wrap { border: 1px solid #d2d2cd; border-radius: 6px; overflow: hidden; margin-bottom: 2.5mm; }
.map-svg { display: block; width: 100%; height: auto; }
.map-fallback { padding: 30px; text-align: center; color: #787873; background: #f4f6f3; border-radius: 6px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 8.4pt; margin-bottom: 3mm; align-items: center; }
.legend .it { display: flex; align-items: center; gap: 6px; }
.legend .sw { width: 12px; height: 12px; border-radius: 3px; border: 1px solid #3a4a9a; flex: none; }
.legend .it b { font-variant-numeric: tabular-nums; }
.chip { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.8pt; font-weight: 500;
  margin: 1px 2px 1px 0; white-space: nowrap; }
.chip.ok { background: #eaf4ec; color: #2e8c4f; }
.chip.miss { background: #faf1dc; color: #b88217; }
.chip.info { background: #eef1ee; color: #1f3520; }
.badge { font-size: 7.5pt; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
.b-green { background: #eaf4ec; color: #2e8c4f; }
.b-amber { background: #faf1dc; color: #b88217; }
.up { color: #2e8c4f; font-weight: 600; }
.down { color: #c0392b; font-weight: 600; }
.warn-row td { background: #faf1dc !important; }
.danger-row td { background: #faeae7 !important; }
.empty { font-size: 9pt; color: #2e8c4f; background: #eaf4ec; border-radius: 6px;
  padding: 9px 12px; text-align: center; font-weight: 500; }
.empty.neutral { color: #54544f; background: #f4f6f3; }
.note { font-size: 8.5pt; color: #54544f; background: #f7f7f5; border-left: 3px solid #8ba68c;
  padding: 7px 10px; border-radius: 0 4px 4px 0; margin-top: 3mm; }
.note.tight { margin-top: 1.5mm; padding: 4px 9px; font-size: 7.9pt; }
.bar { display: inline-block; height: 9px; background: #3f6340; border-radius: 2px; vertical-align: middle; }
.footer { margin-top: 4mm; font-size: 7.5pt; color: #a8a8a2; text-align: center;
  border-top: 1px solid #efefec; padding-top: 3mm; }
"""


def kpi(label, value, sub="", cls=""):
    s = f'<div class="sub">{escape(sub)}</div>' if sub else ""
    return (f'<div class="kpi{(" " + cls) if cls else ""}"><div class="label">{escape(label)}</div>'
            f'<div class="value">{escape(str(value))}</div>{s}</div>')


def leitura_do_dia(c, k, conf_clause):
    """Resumo em prosa da página 1, derivado do que as rondas de fato registraram:
    volume, obrigatórios completos × pendentes (por seção) e gado sem ronda."""
    talhoes = c["talhoes"]
    if not talhoes:
        s = "Nenhuma ronda registrada hoje."
    else:
        rondas_txt = (f'{k["rondas"]} {plural(k["rondas"], "ronda", "rondas")} em '
                      f'{k["talhoes"]} {plural(k["talhoes"], "talhão", "talhões")}')
        if k["completas"] == k["talhoes"]:
            req_labels = join_pt([SECTION_LABELS[s2] for s2 in REQUIRED_SECTIONS])
            s = f'{rondas_txt}, todos com os obrigatórios ({req_labels}) verificados.'
        else:
            pend = ", ".join(
                f'<strong>{SECTION_LABELS[sec]}</strong> em {n}'
                for sec in REQUIRED_SECTIONS
                if (n := sum(1 for t in talhoes if sec in t["missing"])))
            s = f'{rondas_txt}; {k["completas"]}/{k["talhoes"]} com todos os obrigatórios. Pendentes: {pend}.'
    red = k["com_gado_sem_ronda"]
    if red:
        s += (f' {red} {plural(red, "talhão", "talhões")} com gado ainda '
              f'{plural(red, "não recebeu", "não receberam")} ronda '
              f'({plural(red, "vermelho", "vermelhos")} no mapa).')
    else:
        s += ' Todos os talhões com gado foram rondados.'
    return s + conf_clause


def render_html(date_iso, data, c, mapsvg, counts):
    k = c["kpis"]
    gerado = datetime.now(BRT).strftime("%d/%m/%Y %H:%M")

    # ---------- Página 1 ----------
    rows1 = []
    for t in c["talhoes"]:
        secs_sorted = sorted(t["sections"], key=lambda s: SECTION_LABELS.get(s, s))
        ok = "".join(f'<span class="chip ok">{escape(SECTION_LABELS.get(s, s))}</span>' for s in secs_sorted) or "—"
        if t["restocked"] and t["restock_sacks"]:
            extra = f'<span class="chip info">Cocho reabastecido +{fmt_int(t["restock_sacks"])} sc</span>'
        elif t.get("score"):
            extra = f'<span class="chip info">Cocho {escape(str(t["score"]).lower())}</span>'
        else:
            extra = ""
        miss = ("".join(f'<span class="chip miss">{escape(SECTION_LABELS.get(s, s))}</span>' for s in t["missing"])
                or '<span class="chip ok">Tudo verificado</span>')
        badge = ('<span class="badge b-green">completa</span>' if t["status"] == "green"
                 else '<span class="badge b-amber">parcial</span>')
        nrond = f' · {t["n"]} rondas' if t["n"] > 1 else ""
        rows1.append(f"""<tr><td><strong>{escape(t["name"])}</strong> {badge}<div class="muted" style="font-size:7.1pt">
            {escape(", ".join(t["horas"]))} · {escape(t["peao"])}{nrond}</div></td>
          <td class="num">{fmt_int(t["heads"])}</td><td>{ok} {extra}</td><td>{miss}</td></tr>""")
    leg = "".join(
        f'<span class="it"><span class="sw" style="background:{ST_COLOR[s]}"></span>'
        f'{ST_LABEL[s]} <b>{counts.get(s, 0)}</b></span>' for s in ("green", "red", "grey"))
    conf_n = data.get("confinement_excluded", 0)
    conf_clause = (f' Os {conf_n} currais de confinamento (CF) ficam fora do mapa — não passam por ronda.'
                   if conf_n else "")
    leitura = leitura_do_dia(c, k, conf_clause)
    dropped = data.get("empty_rondas_dropped", 0)
    if dropped:
        leitura += (f' <span class="muted">({dropped} {plural(dropped, "linha de ronda vazia ignorada", "linhas de ronda vazias ignoradas")} '
                    f'— duplicação de sync no app.)</span>')

    page1 = f"""
    <div class="header"><div>
        <div class="brand">N · S · A</div>
        <div class="title">Relatório Diário da Pecuária</div>
        <div class="date">{escape(date_extenso(date_iso))}</div>
      </div><div class="meta">Fazenda Nossa Senhora Aparecida<br>Gerado em {escape(gerado)}</div>
    </div>
    <div class="kpi-grid tight">
      {kpi("Talhões com ronda", k["talhoes"], f'{k["rondas"]} rondas no dia')}
      {kpi("Com gado · sem ronda", k["com_gado_sem_ronda"], "talhões a rondar", "alert" if k["com_gado_sem_ronda"] else "")}
      {kpi("Cabeças cobertas", fmt_int(k["heads_cobertas"]), "nos talhões rondados")}
      {kpi("Alertas de estoque", k["alerts"], "mínimo atingido", "danger" if k["alerts"] else "")}
    </div>
    <div class="pagehead tight"><span class="num">1</span><h2>Rondas do dia — mapa e verificações</h2></div>
    <div class="map-wrap">{mapsvg}</div>
    <div class="legend">{leg}</div>
    <table class="compact">
      <thead><tr><th style="width:28%">Talhão</th><th class="num" style="width:42px">Cab.</th>
        <th style="width:36%">Verificado</th><th>Ficou a verificar</th></tr></thead>
      <tbody>{"".join(rows1)}</tbody>
    </table>
    <div class="note tight"><strong>Leitura do dia:</strong> {leitura}</div>
    """

    # ---------- Página 2 ----------
    def ev_rows(items, with_dest=True):
        out = []
        for e in items:
            dest = f' → <strong>{escape(e["destino"])}</strong>' if (with_dest and e.get("destino")) else ""
            out.append(f'<tr><td class="muted">{escape(e["hora"])}</td><td>{escape(e["cat"])}</td>'
                       f'<td class="num">{fmt_int(e["heads"])}</td><td>{escape(e.get("origem") or "—")}{dest}</td></tr>')
        return "".join(out)

    transfers, births, deaths, evol = c["transfers"], c["births"], c["deaths"], c["evol"]
    transf_tbl = (f'<table><thead><tr><th style="width:46px">Hora</th><th>Categoria</th>'
                  f'<th class="num" style="width:46px">Cab.</th><th>Origem → Destino</th></tr></thead>'
                  f'<tbody>{ev_rows(transfers)}</tbody></table>') if transfers \
        else '<div class="empty">Nenhuma mudança de pasto (transferência) registrada no dia.</div>'
    nasc = (f'<table><thead><tr><th style="width:46px">Hora</th><th>Categoria</th><th class="num">Cab.</th>'
            f'<th>Talhão</th></tr></thead><tbody>{ev_rows(births, False)}</tbody></table>') if births \
        else '<div class="empty">Nenhum nascimento no dia.</div>'
    mort = (f'<table><thead><tr><th style="width:46px">Hora</th><th>Categoria</th><th class="num">Cab.</th>'
            f'<th>Talhão</th></tr></thead><tbody>{ev_rows(deaths, False)}</tbody></table>') if deaths \
        else '<div class="empty">Nenhuma morte no dia.</div>'
    natural = [e for e in evol if not (e.get("notes") and "ajuste manual" in e["notes"])]
    manual = [e for e in evol if e.get("notes") and "ajuste manual" in e["notes"]]
    nat_rows = []
    for e in natural:
        pr = parse_evolucao(e.get("notes"))
        trans = f'{escape(pr[0])} → <strong>{escape(pr[1])}</strong>' if pr else escape(e.get("notes") or e["cat"])
        nat_rows.append(f'<tr><td class="muted">{escape(e["hora"])}</td><td class="num">{fmt_int(e["heads"])}</td>'
                        f'<td>{trans}</td><td class="muted">{escape(e.get("origem") or "—")}</td></tr>')
    nat_tbl = (f'<table class="compact"><thead><tr><th style="width:46px">Hora</th><th class="num" style="width:46px">Cab.</th>'
               f'<th>Evolução de categoria</th><th>Talhão</th></tr></thead><tbody>{"".join(nat_rows)}</tbody></table>') if natural else ''
    manual_note = (f'<div class="note"><strong>{len(manual)} reclassificações por ajuste manual</strong> '
                   f'({fmt_int(sum(e["heads"] for e in manual))} cab.) — correção de cadastro, sem efeito no '
                   f'total do rebanho. Δ por categoria na pág. 4.</div>') if manual else ''
    evol_block = (nat_tbl + manual_note) if evol else '<div class="empty">Nenhuma reclassificação no dia.</div>'

    page2 = f"""
    <div class="pagehead"><span class="num">2</span><h2>Mudanças de pasto, nascimentos e mortes</h2>
      <span class="sub">{len(transfers)} transf. · {len(births)} nasc. · {len(deaths)} mortes</span></div>
    <h3 style="margin-top:0">Mudanças de pasto (transferências)<span class="c">{len(transfers)} evento(s) · {fmt_int(sum(e["heads"] for e in transfers))} cab.</span></h3>
    {transf_tbl}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:5mm">
      <div><h3 style="margin-top:0">Nascimentos<span class="c">{len(births)}</span></h3>{nasc}</div>
      <div><h3 style="margin-top:0">Mortes<span class="c">{len(deaths)}</span></h3>{mort}</div>
    </div>
    <h3>Reclassificações de categoria<span class="c">{len(evol)} no dia · {len(natural)} evolução · {len(manual)} ajuste manual</span></h3>
    {evol_block}
    <div class="footer">NSA · Relatório automatizado da pecuária</div>
    """

    # ---------- Página 3 ----------
    central = sorted(c["central"], key=lambda i: (not i["alerta"], -i["qty"]))
    crows = []
    for i in central:
        cls = " class=\"danger-row\"" if (i["alerta"] and i["qty"] == 0) else (" class=\"warn-row\"" if i["alerta"] else "")
        flag = '<span class="badge b-amber">mín. atingido</span>' if i["alerta"] else ""
        crows.append(f'<tr{cls}><td><strong>{escape(i["formula"])}</strong></td><td class="num">{fmt_int(i["qty"])}</td>'
                     f'<td class="num muted">{fmt_int(i["min"])}</td><td>{flag}</td></tr>')

    resupply = data.get("resupply", [])
    if resupply:
        agg = defaultdict(lambda: [0, set()])
        for x in resupply:
            agg[x["talhao"]][0] += x["sacks"]
            agg[x["talhao"]][1].add(x["formula"])
        rrows = "".join(f'<tr><td><strong>{escape(t)}</strong></td><td class="muted">{escape(", ".join(sorted(v[1])))}</td>'
                        f'<td class="num">{fmt_int(v[0])} sc</td></tr>' for t, v in sorted(agg.items(), key=lambda x: -x[1][0]))
        resup_tbl = (f'<table><thead><tr><th>Talhão</th><th>Fórmula</th><th class="num">Sacos entregues</th></tr></thead>'
                     f'<tbody>{rrows}</tbody></table>')
    else:
        resup_tbl = ('<div class="empty neutral">Nenhuma rota de reabastecimento realizada no dia '
                     '(nenhum saco entregue em talhão).</div>')

    mov = data.get("inv_events_day", 0)
    mov_html = ('<div class="empty neutral">Sem movimentações de estoque no dia '
                '(entradas, saídas de rota, ajustes ou cancelamentos).</div>' if not mov
                else f'<div class="note">{mov} movimentação(ões) de estoque registrada(s) no dia.</div>')
    alert_names = ", ".join(f'{i["formula"]}' + (f' ({i["talhao"]})' if i["talhao"] else " (central)") for i in c["alerts"]) \
        or "nenhum"
    cocho = f' Em campo, {fmt_int(k["restock_sacks"])} sc foram repostos nos cochos durante as rondas.' if k["restock_sacks"] else ""

    page3 = f"""
    <div class="pagehead"><span class="num">3</span><h2>Estoque de produtos</h2>
      <span class="sub">{len(c["alerts"])} alerta(s) de mínimo</span></div>
    <h3 style="margin-top:0">Rotas de reabastecimento do dia<span class="c">onde e quantos sacos entregues</span></h3>
    {resup_tbl}
    <h3>Movimentações de estoque no dia<span class="c">entradas · saídas · ajustes</span></h3>
    {mov_html}
    <h3>Estoque central<span class="c">{len(central)} fórmulas ativas</span></h3>
    <table><thead><tr><th>Fórmula</th><th class="num">Sacos</th><th class="num">Mín</th><th></th></tr></thead>
      <tbody>{"".join(crows)}</tbody></table>
    <div class="note"><strong>Alertas de estoque mínimo ({len(c["alerts"])}):</strong> {escape(alert_names)}.{cocho}
      <span class="muted">Fórmulas inativas não são exibidas.</span></div>
    <div class="footer">NSA · Relatório automatizado da pecuária</div>
    """

    # ---------- Página 4 ----------
    cats = data["herd_categories"]
    total = k["total_herd"] or 1
    maxh = max(c0["heads"] for c0 in cats) if cats else 1
    crows4 = []
    for c0 in cats:
        share = c0["heads"] / total * 100
        barw = c0["heads"] / maxh * 120
        def dcell(v):
            if not v:
                return '<span class="muted">—</span>'
            return f'<span class="{"up" if v > 0 else "down"}">{"+" if v > 0 else "−"}{fmt_int(abs(v))}</span>'
        crows4.append(f'<tr><td><strong>{escape(c0["cat"])}</strong></td><td class="num">{fmt_int(c0["heads"])}</td>'
                      f'<td class="num muted">{share:.1f}%</td><td class="num">{c0["lots"]}</td>'
                      f'<td>{dcell(c["cat_delta"].get(c0["cat"], 0))}</td><td>{dcell(c["reclass_delta"].get(c0["cat"], 0))}</td>'
                      f'<td><span class="bar" style="width:{barw:.0f}px"></span></td></tr>')
    movement = "estável" if k["net_total"] == 0 else (f'+{fmt_int(k["net_total"])}' if k["net_total"] > 0 else f'−{fmt_int(abs(k["net_total"]))}')

    unalloc = data.get("unallocated", [])
    if unalloc:
        urows = "".join(f'<tr class="warn-row"><td><strong>{escape(u["cat"])}</strong></td>'
                        f'<td class="num">{fmt_int(u["heads"])}</td><td class="num muted">{u["lots"]} lote(s)</td></tr>'
                        for u in unalloc)
        unalloc_block = (f'<h3>⚠ Gado sem alocação<span class="c">{fmt_int(k["unalloc"])} cab. em {sum(u["lots"] for u in unalloc)} lote(s) — sem talhão definido</span></h3>'
                         f'<table><thead><tr><th>Categoria</th><th class="num">Cabeças</th><th class="num">Lotes</th></tr></thead>'
                         f'<tbody>{urows}</tbody></table>')
    else:
        unalloc_block = '<h3>Gado sem alocação</h3><div class="empty">Todo o rebanho está alocado em talhões.</div>'

    page4 = f"""
    <div class="pagehead"><span class="num">4</span><h2>Estoque de gado por categoria</h2>
      <span class="sub">total {fmt_int(k["total_herd"])} cabeças</span></div>
    <div class="kpi-grid tight">
      {kpi("Rebanho total", fmt_int(k["total_herd"]), f'{len(cats)} categorias')}
      {kpi("Entradas/saídas dia", movement, "nasc · morte · compra · venda", "" if k["net_total"] == 0 else "alert")}
      {kpi("Sem alocação", fmt_int(k["unalloc"]), "cabeças sem talhão", "alert" if k["unalloc"] else "")}
      {kpi("Mortes", k["deaths"], "no dia", "danger" if k["deaths"] else "")}
    </div>
    <table>
      <thead><tr><th>Categoria</th><th class="num">Cabeças</th><th class="num">Part.</th><th class="num">Lotes</th>
        <th>Δ líq. dia</th><th>Δ reclass.</th><th>Distribuição</th></tr></thead>
      <tbody>{"".join(crows4)}</tbody>
      <tfoot><tr style="font-weight:700;background:#f4f6f3"><td>Total</td><td class="num">{fmt_int(k["total_herd"])}</td>
        <td class="num">100%</td><td class="num">{sum(c0["lots"] for c0 in cats)}</td><td colspan="3"></td></tr></tfoot>
    </table>
    {unalloc_block}
    <div class="note"><strong>Mudança no dia:</strong> rebanho total <strong>{escape(movement)}</strong>
      (sem nascimentos, mortes, compras ou vendas). Reclassificações (Δ reclass.) redistribuem categorias sem mexer no total.</div>
    <div class="footer">NSA · Relatório automatizado da pecuária · dados do app Gestão Pecuária</div>
    """

    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>NSA · Relatório Pecuária {date_iso}</title><style>{CSS}</style></head><body>
    <div class="page">{page1}</div><div class="page">{page2}</div>
    <div class="page">{page3}</div><div class="page">{page4}</div></body></html>"""


# ---------------------------------------------------------------------------
def _find_chrome():
    for p in [shutil.which("google-chrome"), shutil.which("chromium"),
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe"]:
        if p and os.path.exists(p):
            return p
    return None


def html_to_pdf(html_path, pdf_path):
    try:
        from weasyprint import HTML
        HTML(filename=html_path).write_pdf(pdf_path)
        if os.path.getsize(pdf_path) >= 1000:
            print(f"PDF (weasyprint): {pdf_path} ({os.path.getsize(pdf_path)/1024:.0f} KB)")
            return
    except ImportError:
        pass
    chrome = _find_chrome()
    if not chrome:
        raise RuntimeError("Sem weasyprint nem Chrome para renderizar PDF.")
    cmd = [chrome, "--headless", "--disable-gpu", "--no-sandbox", "--no-pdf-header-footer",
           "--run-all-compositor-stages-before-draw", "--virtual-time-budget=6000",
           f"--print-to-pdf={pdf_path}", f"file://{html_path}"]
    subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) < 1000:
        raise RuntimeError("PDF não gerado pelo Chrome.")
    print(f"PDF (chrome): {pdf_path} ({os.path.getsize(pdf_path)/1024:.0f} KB)")


def send_pdf(pdf_path, file_name, caption):
    inst, tok, ctok, phone = (os.environ.get(x) for x in
                              ("ZAPI_INSTANCE", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN", "WHATSAPP_PHONE"))
    if not all([inst, tok, ctok, phone]):
        sys.stderr.write("ERRO: env Z-API ausente.\n")
        sys.exit(2)
    with open(pdf_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    url = f"https://api.z-api.io/instances/{inst}/token/{tok}/send-document/pdf"
    body = json.dumps({"phone": phone, "document": f"data:application/pdf;base64,{b64}",
                       "fileName": file_name, "caption": caption}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Client-Token", ctok)
    with urllib.request.urlopen(req, timeout=60) as resp:
        print("Z-API:", resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("date")
    ap.add_argument("--data-file")
    ap.add_argument("--dump-fixture", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--out", default="out")
    args = ap.parse_args()
    datetime.strptime(args.date, "%Y-%m-%d")

    data = load_fixture(args.data_file) if args.data_file else fetch_live(args.date)
    if args.dump_fixture and not args.data_file:
        os.makedirs("fixtures", exist_ok=True)
        with open(f"fixtures/{args.date}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        print(f"Fixture: fixtures/{args.date}.json")

    drop_confinement(data)  # confinamento (CF*) fora da cobertura de ronda
    c = compute(data)
    mapsvg, counts = build_map_svg(data.get("paddocks", []), data.get("status_counts", {}),
                                   target_aspect=2.95)
    html = render_html(args.date, data, c, mapsvg, counts)

    os.makedirs(args.out, exist_ok=True)
    base = f"{args.date} relatorio-diario-pecuaria"
    html_path = os.path.abspath(os.path.join(args.out, base + ".html"))
    pdf_path = os.path.abspath(os.path.join(args.out, base + ".pdf"))
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("HTML:", html_path)
    html_to_pdf(html_path, pdf_path)

    if args.send:
        cap = (f"🐂 Relatório Diário da Pecuária — {date_extenso(args.date)}\n"
               f"{c['kpis']['talhoes']} talhões rondados · {fmt_int(c['kpis']['total_herd'])} cabeças · "
               f"{c['kpis']['alerts']} alerta(s) de estoque")
        send_pdf(pdf_path, base + ".pdf", cap)
        print("Enviado.")


if __name__ == "__main__":
    main()
