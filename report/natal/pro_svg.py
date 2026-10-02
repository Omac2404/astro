# -*- coding: utf-8 -*-
"""
pro_svg.py — Astrolog Pro raporunun vektör görselleri (açık zeminli doküman stili).

KURAL (CLAUDE.md §3a): burç / astro sembolleri ASLA font glifi (<text>) olarak basılmaz;
fontTools ile fonttan çıkarılıp <path> olarak gömülür (emoji/boş kutu riski sıfır).
"""
import math
from datetime import date
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

FONTS = ["C:/Windows/Fonts/seguisym.ttf",
         "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
         "/usr/share/fonts/truetype/noto/NotoSansSymbols-Regular.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
_loaded = []
for _p in FONTS:
    try:
        _f = TTFont(_p)
        _loaded.append((_f.getBestCmap(), _f.getGlyphSet()))
    except Exception:
        pass

INK = "#2b2a3d"
GOLD = "#a8803e"
GOLDL = "#c2a36b"
MUTED = "#8a86a3"
RUST = "#b8573a"
BLUE = "#3f7fa6"
GREEN = "#5b8f4e"
VIOLET = "#7b5ea7"
EL_COL = {"Ateş": "#c9783b", "Toprak": "#7d8a3c", "Hava": "#5f86b0", "Su": "#3f8f8a"}
SIGN_CODES = [0x2648 + i for i in range(12)]
SIGN_EL = ["Ateş", "Toprak", "Hava", "Su"] * 3
ASP_CODE = {"kavusum": 0x260C, "karsitlik": 0x260D, "ucgen": 0x25B3, "kare": 0x25A1, "altmislik": 0x26B9,
            "quincunx": 0x26BB, "yarikare": 0x2220, "seskikare": 0x26BC, "yarialtmis": 0x26BA}
ASP_COL = {"kavusum": GOLD, "karsitlik": RUST, "kare": RUST, "yarikare": RUST, "seskikare": RUST,
           "ucgen": BLUE, "altmislik": BLUE, "yarialtmis": BLUE, "quincunx": GREEN}


def _glyph_d(code):
    for cmap, gs in _loaded:
        if code in cmap:
            g = gs[cmap[code]]
            bp = BoundsPen(gs)
            g.draw(bp)
            if not bp.bounds:
                continue
            xMin, yMin, xMax, yMax = bp.bounds
            if xMax - xMin <= 0 or yMax - yMin <= 0:
                continue
            sp = SVGPathPen(gs)
            g.draw(sp)
            return sp.getCommands(), bp.bounds
    return None, None


_CACHE = {}


def glyph_path(code, cx, cy, box, fill):
    """Glifi (cx,cy) merkezli, box boyutlu vektör path olarak döndürür."""
    if code not in _CACHE:
        _CACHE[code] = _glyph_d(code)
    d, b = _CACHE[code]
    if not d:
        return ""
    xMin, yMin, xMax, yMax = b
    s = box / max(xMax - xMin, yMax - yMin)
    mx, my = (xMin + xMax) / 2, (yMin + yMax) / 2
    return (f'<path d="{d}" fill="{fill}" transform="translate({cx:.2f} {cy:.2f}) '
            f'scale({s:.4f} {-s:.4f}) translate({-mx:.1f} {-my:.1f})"/>')


def gsvg(code, size=13, color=INK, cls="g"):
    """Satır içi (HTML metni içinde) kullanılacak küçük vektör glif."""
    if code is None:
        return ""
    inner = glyph_path(code, 12, 12, 18, color)
    if not inner:
        return ""
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" '
            f'style="vertical-align:-0.18em">{inner}</svg>')


def sign_svg(si, size=13, color=None):
    return gsvg(SIGN_CODES[si], size, color or EL_COL[SIGN_EL[si]])


def asp_svg(tip, size=12):
    return gsvg(ASP_CODE.get(tip), size, ASP_COL.get(tip, INK))


# ------------------------------------------------------------------ ÇARK
def wheel(chart):
    W = 620
    C = W / 2
    R_OUT, R_ZIN, R_HIN, R_PL, R_TICK, R_ASP = 296, 258, 236, 200, 236, 150
    asc = chart["asc"]["lon"]
    asc_si = chart["asc"]["sign_idx"]

    def ang(L):
        return math.radians(180 + (L - asc))

    def pt(L, r):
        a = ang(L)
        return C + r * math.cos(a), C - r * math.sin(a)

    S = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-26 -26 {W + 52} {W + 52}" font-family="Spectral, serif">']
    S.append(f'<circle cx="{C}" cy="{C}" r="{R_OUT}" fill="#fbf7ef" stroke="{INK}" stroke-width="1.2"/>')
    # zodyak bandı: element renkli hafif dolgu
    for i in range(12):
        a0, a1 = i * 30, i * 30 + 30
        x1, y1 = pt(a0, R_OUT); x2, y2 = pt(a1, R_OUT); x3, y3 = pt(a1, R_ZIN); x4, y4 = pt(a0, R_ZIN)
        col = EL_COL[SIGN_EL[i]]
        S.append(f'<path d="M{x1:.1f} {y1:.1f} A{R_OUT} {R_OUT} 0 0 0 {x2:.1f} {y2:.1f} L{x3:.1f} {y3:.1f} '
                 f'A{R_ZIN} {R_ZIN} 0 0 1 {x4:.1f} {y4:.1f} Z" fill="{col}" fill-opacity=".09" stroke="none"/>')
        gx, gy = pt(i * 30 + 15, (R_OUT + R_ZIN) / 2)
        S.append(glyph_path(SIGN_CODES[i], gx, gy, 19, col))
    S.append(f'<circle cx="{C}" cy="{C}" r="{R_ZIN}" fill="#ffffff" stroke="{INK}" stroke-width=".9"/>')
    # derece çentikleri
    for d in range(0, 360, 1):
        ln = 7 if d % 10 == 0 else (4.5 if d % 5 == 0 else 2.5)
        x1, y1 = pt(d, R_ZIN); x2, y2 = pt(d, R_ZIN - ln)
        S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{INK}" stroke-width="{0.7 if d % 10 == 0 else 0.35}" opacity=".7"/>')
    # burç/ev sınırları (Whole Sign: ev sınırı = burç sınırı)
    for i in range(12):
        x1, y1 = pt(i * 30, R_OUT); x2, y2 = pt(i * 30, R_ASP)
        S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{INK}" stroke-width=".55" opacity=".35"/>')
        hn = ((i - asc_si) % 12) + 1
        hx, hy = pt(i * 30 + 15, R_ASP + 13)
        S.append(f'<text x="{hx:.1f}" y="{hy:.1f}" font-size="12" fill="{MUTED}" text-anchor="middle" dominant-baseline="central">{hn}</text>')
    S.append(f'<circle cx="{C}" cy="{C}" r="{R_ASP}" fill="#fcfaf5" stroke="{INK}" stroke-width=".7" opacity=".9"/>')

    # açı çizgileri (kavuşum hariç; majör + quincunx)
    lon = {p["id"]: p["lon"] for p in chart["planets"]}
    lon.update({q["id"]: q["lon"] for q in chart["points"]})
    for a in chart["aspects"]:
        if a["type"] == "kavusum" or (not a["majör"] and a["type"] != "quincunx"):
            continue
        if a["a"] not in lon or a["b"] not in lon:
            continue
        x1, y1 = pt(lon[a["a"]], R_ASP); x2, y2 = pt(lon[a["b"]], R_ASP)
        col = ASP_COL.get(a["type"], INK)
        w = 1.6 if a["orb"] < 2 else 1.0
        dash = ' stroke-dasharray="4 3"' if a["type"] == "quincunx" else ""
        S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{col}" stroke-width="{w}" opacity=".8"{dash}/>')

    # eksenler: ASC–DSC ve MC–IC
    for key, lab in (("asc", "AC"), ("mc", "MC")):
        L = chart["asc"]["lon"] if key == "asc" else next(q["lon"] for q in chart["points"] if q["id"] == "mc")
        x1, y1 = pt(L, R_OUT + 2); x2, y2 = pt(L + 180, R_OUT + 2)
        S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{GOLD}" stroke-width="1.5" opacity=".85"/>')
        lx, ly = pt(L, R_OUT + 14)
        S.append(f'<text x="{lx:.1f}" y="{ly:.1f}" font-size="13" font-weight="700" fill="{GOLD}" text-anchor="middle" dominant-baseline="central">{lab}</text>')
        lx2, ly2 = pt(L + 180, R_OUT + 14)
        S.append(f'<text x="{lx2:.1f}" y="{ly2:.1f}" font-size="11" fill="{GOLD}" text-anchor="middle" dominant-baseline="central">{"DC" if key == "asc" else "IC"}</text>')

    # gezegen + nokta glifleri: çakışmayı açısal yayma ile çöz
    bodies = [p for p in chart["planets"]] + [q for q in chart["points"] if q["id"] in ("kuzey", "guney", "lilith", "chiron", "sans")]
    disp_codes = {"lilith": 0x26B8, "sans": 0x2297}
    items = sorted(({"lon": b["lon"], "b": b} for b in bodies), key=lambda x: x["lon"])
    pos = [x["lon"] for x in items]
    MIN = 7.2
    for _ in range(80):  # basit gevşetme
        moved = False
        for i in range(len(pos)):
            j = (i + 1) % len(pos)
            gap = (pos[j] - pos[i]) % 360
            if gap < MIN and len(pos) > 1:
                push = (MIN - gap) / 2 + 0.05
                pos[i] -= push
                pos[j] += push
                moved = True
        if not moved:
            break
    for it, dl in zip(items, pos):
        b = it["b"]
        code = disp_codes.get(b["id"], b.get("glyph"))
        tx, ty = pt(it["lon"], R_TICK)
        tx2, ty2 = pt(it["lon"], R_TICK - 8)
        S.append(f'<line x1="{tx:.1f}" y1="{ty:.1f}" x2="{tx2:.1f}" y2="{ty2:.1f}" stroke="{INK}" stroke-width="1.4"/>')
        gx, gy = pt(dl, R_PL)
        cx2, cy2 = pt(it["lon"], R_TICK - 9)
        S.append(f'<line x1="{cx2:.1f}" y1="{cy2:.1f}" x2="{gx:.1f}" y2="{gy:.1f}" stroke="{MUTED}" stroke-width=".5" opacity=".7"/>')
        is_pt = b["id"] in ("kuzey", "guney", "lilith", "chiron", "sans")
        col = VIOLET if is_pt else INK
        S.append(f'<circle cx="{gx:.1f}" cy="{gy:.1f}" r="11" fill="#ffffff" stroke="none"/>')
        S.append(glyph_path(code, gx, gy, 16 if not is_pt else 13, col))
        dx, dy = pt(dl, R_PL - 23)
        deg = int(b["lon"] % 30)
        mi = int(round((b["lon"] % 1) * 60)) % 60
        r = "R" if b.get("retro") else ""
        S.append(f'<text x="{dx:.1f}" y="{dy:.1f}" font-size="9" fill="{INK}" text-anchor="middle" dominant-baseline="central">{deg}°{mi:02d}{r}</text>')
    S.append("</svg>")
    return "\n".join(s for s in S if s)


# ------------------------------------------------------------------ TRANSİT ÇİZELGESİ
def _d(s):
    y, m, d = (int(x) for x in s.split("-"))
    return date(y, m, d)


AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
UYUM_COL = {"uyumlu": BLUE, "gergin": RUST, "nötr": GOLD, "ayar": GREEN}


def timeline(tr, max_rows=30):
    evs = list(tr["olaylar"])
    if len(evs) > max_rows:
        evs = sorted(evs, key=lambda e: -e["agirlik"])[:max_rows]
    evs.sort(key=lambda e: (e["baslangic"], e["transit"]))
    d0, d1 = _d(tr["baslangic_iso"]), _d(tr["bitis_iso"])
    span = max(1, (d1 - d0).days)
    LW, W, RH, TOP = 205, 720, 19, 34
    H = TOP + RH * len(evs) + 16

    def x(dt):
        return LW + (W - LW - 10) * ((dt - d0).days / span)

    S = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="Spectral, serif">']
    # ay ızgarası
    y, m = d0.year, d0.month
    while True:
        md = date(y, m, 1)
        if md > d1:
            break
        if md >= d0 or (md.year == d0.year and md.month == d0.month):
            xx = x(max(md, d0))
            S.append(f'<line x1="{xx:.1f}" y1="{TOP - 6}" x2="{xx:.1f}" y2="{H - 8}" stroke="#d9d3c4" stroke-width=".7"/>')
            S.append(f'<text x="{xx + 2:.1f}" y="{TOP - 12}" font-size="10" fill="{MUTED}">{AY_KISA[m - 1]}{" " + str(y)[2:] if m == 1 or md == date(d0.year, d0.month, 1) else ""}</text>')
        m += 1
        if m == 13:
            y, m = y + 1, 1
    for i, e in enumerate(evs):
        yy = TOP + i * RH
        if i % 2 == 0:
            S.append(f'<rect x="0" y="{yy - 2}" width="{W}" height="{RH}" fill="#f6f1e6" opacity=".55"/>')
        lab = f'{e["transit"]} {e["ad"]} {e["natal"]}'
        S.append(f'<text x="4" y="{yy + RH / 2 - 1:.1f}" font-size="10.5" fill="{INK}" dominant-baseline="central">{lab}</text>')
        xa, xb = x(_d(e["baslangic"])), x(_d(e["bitis"]))
        col = UYUM_COL.get(e["uyum"], INK)
        S.append(f'<rect x="{xa:.1f}" y="{yy + 3}" width="{max(3, xb - xa):.1f}" height="{RH - 9}" rx="3" fill="{col}" fill-opacity=".28" stroke="{col}" stroke-width=".8"/>')
        for t_iso in e.get("tam_iso", []):  # tam isabet: elmas
            xt, yc = x(_d(t_iso)), yy + RH / 2 - 1.5
            S.append(f'<path d="M{xt:.1f} {yc - 5:.1f} L{xt + 4.5:.1f} {yc:.1f} L{xt:.1f} {yc + 5:.1f} L{xt - 4.5:.1f} {yc:.1f} Z" fill="{col}" stroke="#ffffff" stroke-width=".8"/>')
    S.append("</svg>")
    return "\n".join(S)


# ------------------------------------------------------------------ YARIKÜRE
def hemisphere(planets, asc_si):
    W = 230
    C = W / 2
    R = 90
    S = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" font-family="Spectral, serif">']
    q = [0, 0, 0, 0]
    for p in planets:
        q[(p["house"] - 1) // 3] += 1
    # çeyrekler: ASC solda; 1-3 sol alt, 4-6 sağ alt, 7-9 sağ üst, 10-12 sol üst
    quads = [(180, 270, q[0], "1-3"), (270, 360, q[1], "4-6"), (0, 90, q[2], "7-9"), (90, 180, q[3], "10-12")]
    mx = max(q) or 1
    for a0, a1, n, lab in quads:
        r0, r1 = math.radians(a0), math.radians(a1)
        x0, y0 = C + R * math.cos(r0), C - R * math.sin(r0)
        x1, y1 = C + R * math.cos(r1), C - R * math.sin(r1)
        op = 0.08 + 0.42 * (n / mx)
        S.append(f'<path d="M{C} {C} L{x0:.1f} {y0:.1f} A{R} {R} 0 0 0 {x1:.1f} {y1:.1f} Z" fill="{GOLD}" fill-opacity="{op:.2f}" stroke="{INK}" stroke-width=".8"/>')
        am = math.radians((a0 + a1) / 2)
        tx, ty = C + R * 0.55 * math.cos(am), C - R * 0.55 * math.sin(am)
        S.append(f'<text x="{tx:.1f}" y="{ty - 6:.1f}" font-size="22" font-weight="600" fill="{INK}" text-anchor="middle" dominant-baseline="central">{n}</text>')
        S.append(f'<text x="{tx:.1f}" y="{ty + 13:.1f}" font-size="9.5" fill="{MUTED}" text-anchor="middle" dominant-baseline="central">{lab}. ev</text>')
    S.append(f'<text x="2" y="{C}" font-size="11" font-weight="700" fill="{GOLD}" dominant-baseline="central">AC</text>')
    S.append(f'<text x="{W - 2}" y="{C}" font-size="11" fill="{GOLD}" text-anchor="end" dominant-baseline="central">DC</text>')
    S.append(f'<text x="{C}" y="14" font-size="10" fill="{MUTED}" text-anchor="middle">ufkun üstü</text>')
    S.append(f'<text x="{C}" y="{W - 6}" font-size="10" fill="{MUTED}" text-anchor="middle">ufkun altı</text>')
    S.append("</svg>")
    return "\n".join(S)
