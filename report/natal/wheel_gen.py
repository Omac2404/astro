# -*- coding: utf-8 -*-
# wheel_gen.py — chart.json -> wheel.svg  (FAZ 3: parametrik; sabit Ayşe verisi YOK)
# Vektör glif mantığı (glyph_path) DEVIR-BRIFI §3a gereği AYNEN korunur.
import math, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
# Girdi/çıktı argümanı: varsayılan chart.json -> wheel.svg. SR'da natal için: chart-natal.json wheel-natal.svg
IN_JSON = sys.argv[1] if len(sys.argv) > 1 else "chart.json"
OUT_SVG = sys.argv[2] if len(sys.argv) > 2 else "wheel.svg"

# Glif çıkarımı için fontlar — Windows (Segoe UI Symbol) + Linux (Noto/DejaVu) fallback.
FONTS = [
    "C:/Windows/Fonts/seguisym.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
_loaded = []
for p in FONTS:
    try:
        f = TTFont(p); _loaded.append((f, f.getBestCmap(), f.getGlyphSet()))
    except Exception:
        pass

def glyph_path(code, cx, cy, box, fill):
    for f, cmap, gs in _loaded:
        if code in cmap:
            g = gs[cmap[code]]
            bp = BoundsPen(gs); g.draw(bp)
            if not bp.bounds: continue
            xMin, yMin, xMax, yMax = bp.bounds
            gw, gh = xMax - xMin, yMax - yMin
            if gw <= 0 or gh <= 0: continue
            s = box / max(gw, gh)
            sp = SVGPathPen(gs); g.draw(sp); d = sp.getCommands()
            mx, my = (xMin + xMax) / 2, (yMin + yMax) / 2
            tr = f"translate({cx:.2f} {cy:.2f}) scale({s:.4f} {-s:.4f}) translate({-mx:.1f} {-my:.1f})"
            return f'<path d="{d}" fill="{fill}" transform="{tr}"/>'
    return ""

# --- chart.json oku ---
chart = json.load(open(os.path.join(HERE, IN_JSON), encoding="utf-8"))
ASC = chart["asc"]["lon"]
ASC_SI = chart["asc"]["sign_idx"]
PLANETS = chart["planets"]            # her biri: glyph(int), lon, house, ...
ASPECTS = chart["aspects"]
OCCUPIED = set(chart["occupied_houses"])
lon_by_id = {p["id"]: p["lon"] for p in PLANETS}
lon_by_id["yukselen"] = ASC

SIGN_CODES = [0x2648,0x2649,0x264A,0x264B,0x264C,0x264D,0x264E,0x264F,0x2650,0x2651,0x2652,0x2653]
CX = CY = 200; R_OUT = 196; R_ZOD = 166; R_SIGN = 181; R_PLANET = 142; R_INNER = 120; R_ASP = 110
GOLD = "#c2a36b"; GOLDB = "#dcc188"; TEAL = "#7fb0a6"; RUST = "#c07f5a"; COLW = {"teal": TEAL, "rust": RUST, "gold": GOLDB}

def ang(L): return 180 + (L - ASC)
def pt(L, r):
    a = math.radians(ang(L)); return (CX + r * math.cos(a), CY - r * math.sin(a))

S = ['<svg viewBox="-44 -44 488 488" xmlns="http://www.w3.org/2000/svg" font-family="Spectral, serif">']
S.append(f'<circle cx="{CX}" cy="{CY}" r="{R_OUT}" fill="none" stroke="{GOLD}" stroke-width="1.1" opacity=".85"/>')
S.append(f'<circle cx="{CX}" cy="{CY}" r="{R_ZOD}" fill="none" stroke="{GOLD}" stroke-width=".8" opacity=".55"/>')
S.append(f'<circle cx="{CX}" cy="{CY}" r="{R_INNER}" fill="none" stroke="{GOLD}" stroke-width=".7" opacity=".35"/>')
for d in range(0, 360, 5):
    r2 = R_OUT - (6 if d % 30 == 0 else (3 if d % 10 == 0 else 1.5))
    x1, y1 = pt(d, R_ZOD); x2, y2 = pt(d, r2)
    w = 0.9 if d % 30 == 0 else 0.5; op = ".7" if d % 30 == 0 else ".35"
    S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GOLD}" stroke-width="{w}" opacity="{op}"/>')
for i in range(12):
    x1, y1 = pt(i * 30, R_INNER); x2, y2 = pt(i * 30, R_OUT)
    S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GOLD}" stroke-width=".5" opacity=".25"/>')
for i, code in enumerate(SIGN_CODES):
    x, y = pt(i * 30 + 15, R_SIGN)
    S.append(f'<rect x="{x-9:.1f}" y="{y-9:.1f}" width="18" height="18" rx="3.5" fill="#2a2a57" stroke="{GOLD}" stroke-width=".6" opacity=".92"/>')
    S.append(glyph_path(code, x, y, 11, GOLDB))
# Tüm Burç ev etiketleri — çark DIŞINDA halka (1. ev = Yükselen burcu)
for i in range(12):
    house = ((i - ASC_SI) % 12) + 1
    hx, hy = pt(i * 30 + 15, 212)
    on = house in OCCUPIED
    col = GOLDB if on else "#8884ad"
    S.append(f'<text x="{hx:.1f}" y="{hy:.1f}" fill="{col}" font-size="{20.5 if on else 18}" font-weight="{700 if on else 400}" text-anchor="middle" dominant-baseline="central" font-family="Cormorant Garamond, serif">{house}.ev</text>')
# ASC ekseni + ASC burç glifi
xa, ya = pt(ASC, R_INNER); xd, yd = pt(ASC + 180, R_INNER)
S.append(f'<line x1="{xa:.1f}" y1="{ya:.1f}" x2="{xd:.1f}" y2="{yd:.1f}" stroke="{GOLDB}" stroke-width=".8" opacity=".5" stroke-dasharray="2 2"/>')
xacl, yacl = pt(ASC, R_INNER + 13)
S.append(glyph_path(SIGN_CODES[ASC_SI], xacl, yacl, 12, GOLDB))

# Açı çizgileri (kavuşum çizilmez — çakışık/dejenere)
def asp_line(L1, L2, c, w, op):
    x1, y1 = pt(L1, R_ASP); x2, y2 = pt(L2, R_ASP)
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}" opacity="{op}"/>'
for a in ASPECTS:
    if a["type"] == "kavusum":
        continue
    c = COLW.get(a["color"], GOLD)
    w, op = (2.2, ".95") if a["type"] == "ucgen" else (1.3, ".72")
    S.append(asp_line(lon_by_id[a["a"]], lon_by_id[a["b"]], c, w, op))

# Gezegenler — yakın olanları (cluster) farklı yarıçapa kaydır (overlap önleme)
order = sorted(range(len(PLANETS)), key=lambda k: PLANETS[k]["lon"])
radius = {i: R_PLANET for i in range(len(PLANETS))}
i = 0
while i < len(order):
    j = i
    while j + 1 < len(order) and (PLANETS[order[j+1]]["lon"] - PLANETS[order[j]]["lon"]) % 360 < 7:
        j += 1
    grp = order[i:j+1]
    if len(grp) > 1:
        for k, idx in enumerate(grp):
            radius[idx] = R_PLANET - 18 * (k - (len(grp) - 1) / 2)
    i = j + 1
for idx, p in enumerate(PLANETS):
    L = p["lon"]; r = radius[idx]; x, y = pt(L, r)
    S.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9.5" fill="#20204a" stroke="{GOLD}" stroke-width=".8"/>')
    S.append(glyph_path(p["glyph"], x, y, 11, "#ffffff"))
    xd2, yd2 = pt(L, r + 15)
    S.append(f'<text x="{xd2:.1f}" y="{yd2:.1f}" fill="{GOLDB}" font-size="7.5" text-anchor="middle" dominant-baseline="central">{int(L % 30)}°</text>')
S.append(f'<circle cx="{CX}" cy="{CY}" r="2.2" fill="{GOLDB}"/>')
# Aşk ürününde çarkın kalbine küçük bir kalp (PRODUCT=ask)
if os.environ.get("PRODUCT", "natal") == "ask":
    S.append('<path d="M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z" fill="#e6b3c5" fill-opacity="0.16" stroke="#e6b3c5" stroke-width="0.9" transform="translate(200 200) scale(1.7) translate(-12 -12)"/>')
S.append('</svg>')
svg = "\n".join(x for x in S if x)
open(os.path.join(HERE, OUT_SVG), "w", encoding="utf-8").write(svg)
print(f"{OUT_SVG} ok, len", len(svg))
