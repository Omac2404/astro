# -*- coding: utf-8 -*-
# diagram_gen.py — chart.json -> diagram.svg  (FAZ 3: parametrik; Element × Nitelik ızgarası)
# Vektör glif (gp) DEVIR-BRIFI §3a gereği AYNEN. Sabit Ayşe verisi YOK.
import json, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = ["C:/Windows/Fonts/seguisym.ttf",
         "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
_l = []
for p in FONTS:
    try:
        f = TTFont(p); _l.append((f, f.getBestCmap(), f.getGlyphSet()))
    except Exception:
        pass

def gp(code, cx, cy, box, fill):
    for f, cmap, gs in _l:
        if code in cmap:
            g = gs[cmap[code]]; bp = BoundsPen(gs); g.draw(bp)
            if not bp.bounds: continue
            xMin, yMin, xMax, yMax = bp.bounds; gw, gh = xMax - xMin, yMax - yMin
            if gw <= 0 or gh <= 0: continue
            s = box / max(gw, gh); sp = SVGPathPen(gs); g.draw(sp); d = sp.getCommands()
            mx, my = (xMin + xMax) / 2, (yMin + yMax) / 2
            return f'<path d="{d}" fill="{fill}" transform="translate({cx:.2f} {cy:.2f}) scale({s:.4f} {-s:.4f}) translate({-mx:.1f} {-my:.1f})"/>'
    return ""

chart = json.load(open(os.path.join(HERE, "chart.json"), encoding="utf-8"))

GOLD = "#c2a36b"; GOLDB = "#dcc188"; MUT = "#9a96bd"
EL = [("Ateş", "#d9a85e"), ("Toprak", "#9a8a55"), ("Hava", "#9aa6c4"), ("Su", "#6f9a9a")]
# (nitelik, alt-kelime, BÜYÜK gösterim — Türkçe İ elle doğru)
MOD = [("Öncü", "başlatan", "ÖNCÜ"), ("Sabit", "sürdüren", "SABİT"), ("Değişken", "uyarlayan", "DEĞİŞKEN")]
ELEMENT_OF = ["Ateş", "Toprak", "Hava", "Su"]
MODALITY_OF = ["Öncü", "Sabit", "Değişken"]

# Hücre içerikleri: (element, nitelik) -> [glyph kodları / "AC"]
CELLS = {}
for p in chart["planets"]:
    CELLS.setdefault((p["element"], p["modality"]), []).append(p["glyph"])
asc_si = chart["asc"]["sign_idx"]
asc_el, asc_mod = ELEMENT_OF[asc_si % 4], MODALITY_OF[asc_si % 3]
CELLS.setdefault((asc_el, asc_mod), []).append("AC")

# Baskın sütun (en çok nitelik) ve baskın hücre (baskın element × baskın nitelik)
modalities = chart["modalities"]
elements = chart["elements"]
DOM_MOD = max(modalities, key=lambda k: modalities[k])
DOM_EL = max(elements, key=lambda k: elements[k])
DOM = (DOM_EL, DOM_MOD)

# geometri (FAZ2 ile aynı)
LX = 96; CW, CH = 156, 66; GAP = 9
X0 = LX + 6; Y0 = 64
xs = [X0 + i * (CW + GAP) for i in range(3)]
ys = [Y0 + j * (CH + GAP) for j in range(4)]
W = xs[-1] + CW + 8; H = ys[-1] + CH + 10
S = [f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg" font-family="Spectral, serif">']
# nitelik başlıkları (sayı parantezde; baskın sütun altın)
for i, (m, sub, disp) in enumerate(MOD):
    cx = xs[i] + CW / 2
    col = GOLDB if m == DOM_MOD else "#cfcae6"
    S.append(f'<text x="{cx:.0f}" y="30" fill="{col}" font-size="17" font-weight="600" text-anchor="middle" letter-spacing="1">{disp} ({modalities[m]})</text>')
    S.append(f'<text x="{cx:.0f}" y="46" fill="{MUT}" font-size="13" font-style="italic" text-anchor="middle">{sub}</text>')
# element satırları + hücreler
for j, (el, ec) in enumerate(EL):
    cy = ys[j] + CH / 2
    S.append(f'<circle cx="20" cy="{cy:.0f}" r="5" fill="{ec}"/>')
    S.append(f'<text x="34" y="{cy:.0f}" fill="#e7e3f4" font-size="16.5" font-weight="400" dominant-baseline="central">{el}</text>')
    for i, (m, _, _) in enumerate(MOD):
        x = xs[i]; y = ys[j]; items = CELLS.get((el, m), [])
        if (el, m) == DOM:
            S.append(f'<rect x="{x}" y="{y}" width="{CW}" height="{CH}" rx="6" fill="rgba(194,163,107,.20)" stroke="{GOLD}" stroke-width="1.4"/>')
        elif items:
            S.append(f'<rect x="{x}" y="{y}" width="{CW}" height="{CH}" rx="6" fill="rgba(110,108,170,.16)" stroke="{GOLD}" stroke-width=".7"/>')
        else:
            S.append(f'<rect x="{x}" y="{y}" width="{CW}" height="{CH}" rx="6" fill="none" stroke="#3a3a63" stroke-width=".7" stroke-dasharray="3 4"/>')
        n = len(items)
        for k, it in enumerate(items):
            gx = x + CW / 2 + (k - (n - 1) / 2) * 30
            gy = y + CH / 2
            if it == "AC":
                S.append(f'<text x="{gx:.0f}" y="{gy:.0f}" fill="#ffffff" font-size="13" font-family="Spectral,serif" text-anchor="middle" dominant-baseline="central">AC</text>')
            else:
                S.append(gp(it, gx, gy, 17, "#ffffff"))
S.append('</svg>')
svg = "\n".join(x for x in S if x)
open(os.path.join(HERE, "diagram.svg"), "w", encoding="utf-8").write(svg)
print("diagram.svg ok", W, H, len(svg))
