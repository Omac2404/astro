# -*- coding: utf-8 -*-
"""
render.py — chart.json + icerik.json -> natal-rapor.out.html -> out.pdf  (FAZ 3, T4 + içerik)

Akış:
  1) wheel_gen.py + diagram_gen.py (chart.json -> wheel.svg, diagram.svg)
  2) İçerik seçimi: imzalar (yerleşim+açı+baskınlık), mizaç kartı, element-yorum  (FAZ3-ICERIK-BRIFI)
  3) Jinja2 ile natal-rapor.html.j2 doldur (meta, pozisyon, ev, bar, mizaç, nitelik intro)
  4) Regex swap: çark / diyagram / Yükselen-glifi + imza kartları + element-yorum paragrafı
  5) node render.mjs <html> -> out.pdf (headless Chrome)
Düz-yazı bölümler (8 bölüm + İmza Sentezi paragrafı) Faz 5'e dek placeholder kalır.
"""
import os, sys, re, json, base64, subprocess
from jinja2 import Environment, FileSystemLoader
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
IO = os.environ.get("NATAL_IO") or HERE  # işe-özel I/O (eşzamanlılık izolasyonu); yoksa script dizini
PY = sys.executable
REPO = os.path.dirname(os.path.dirname(HERE))
COVER_IMG = os.path.join(REPO, "src", "kapak", "113854.jpg")  # tüm raporların kapak arkaplanı
LOGO_DIKEY = os.path.join(REPO, "public", "gorsel", "logo-dikey.png")  # kapak markası (dikey gökname logosu)

def _data_uri(path, mime):
    return (f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()) if os.path.exists(path) else ""

DISCLAIMER_NATAL = ("Bu rapor, doğum haritanın astrolojik yorumuna dayalı, kişisel farkındalık ve içgörü "
                    "amaçlı bir okumadır. Kesin gelecek iddiası taşımaz; tıbbi, psikolojik, hukuki ya da "
                    "finansal danışmanlığın yerine geçmez ve kararların sorumluluğu kişinin kendisine aittir.")
DISCLAIMER_SINASTRI = ("Bu rapor, iki doğum haritasının astrolojik yorumuna dayalı, kişisel farkındalık ve "
                       "içgörü amaçlı bir okumadır. Kesin gelecek iddiası taşımaz; tıbbi, psikolojik, hukuki "
                       "ya da finansal danışmanlığın yerine geçmez ve kararların sorumluluğu kişilere aittir.")

# ---- sabit deterministik lookup'lar ----
HOUSE_DESC = [
    "Kişilik, görünüş, ilk izlenim", "Para, değerler, sahip oldukların",
    "Zihin, iletişim, yakın çevre", "Yuva, kökler, aile",
    "Aşk, yaratıcılık, oyun", "İş, sağlık, günlük düzen",
    "İlişkiler, ortaklık, evlilik", "Dönüşüm, ortak kaynaklar, derinlik",
    "İnanç, felsefe, uzak yolculuk", "Kariyer, itibar, toplumsal rol",
    "Arkadaşlık, topluluk, idealler", "Bilinçaltı, ruhsallık, geri çekiliş",
]
EL_MEAN = {"Ateş": "irade, coşku, eylem ve ilham", "Toprak": "pratiklik, istikrar, somutluk ve güven",
           "Hava": "düşünce, iletişim, sosyallik ve esneklik", "Su": "duygu, sezgi, şefkat ve derinlik"}
EL_COLOR = {"Ateş": "#d9a85e", "Toprak": "#9a8a55", "Hava": "#9aa6c4", "Su": "#6f9a9a"}
EL_GRAD = {"Ateş": "linear-gradient(90deg,#d9a85e,#c98a45)", "Toprak": "linear-gradient(90deg,#9a8a55,#857640)",
           "Hava": "linear-gradient(90deg,#9aa6c4,#7e8cae)", "Su": "linear-gradient(90deg,#6f9a9a,#588484)"}
EL_ORDER = ["Ateş", "Toprak", "Hava", "Su"]
MIZAC_BY_EL = {"Ateş": "Safravi", "Toprak": "Sevdavi", "Hava": "Demevi", "Su": "Balgami"}
# Klasik element sembolleri (çizgisel; imza panelindeki baskınlık ikonu için)
EL_SYMBOL = {
    "Ateş": '<path d="M12 4 L20.5 19 L3.5 19 Z"/>',
    "Hava": '<path d="M12 4 L20.5 19 L3.5 19 Z"/><path d="M7.5 14 H16.5"/>',
    "Su": '<path d="M3.5 5 L20.5 5 L12 20 Z"/>',
    "Toprak": '<path d="M3.5 5 L20.5 5 L12 20 Z"/><path d="M8 13 H16"/>',
}
KW_AD = {"gunes": "Güneş", "ay": "Ay", "merkur": "Merkür", "venus": "Venüs",
         "mars": "Mars", "jupiter": "Jüpiter", "saturn": "Satürn", "yukselen": "Yükselen"}
ASP_GLYPH = {"kavusum": "conj", "ucgen": "trine", "kare": "square", "karsitlik": "oppo"}
SIGN_CODES = [0x2648,0x2649,0x264A,0x264B,0x264C,0x264D,0x264E,0x264F,0x2650,0x2651,0x2652,0x2653]
FONTS = ["C:/Windows/Fonts/seguisym.ttf",
         "/usr/share/fonts/truetype/noto/NotoSansSymbols2-Regular.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
_loaded = []
for p in FONTS:
    try:
        f = TTFont(p); _loaded.append((f, f.getBestCmap(), f.getGlyphSet()))
    except Exception:
        pass

def glyph_path(code, cx, cy, box, fill):
    for f, cmap, gs in _loaded:
        if code in cmap:
            g = gs[cmap[code]]; bp = BoundsPen(gs); g.draw(bp)
            if not bp.bounds: continue
            xMin, yMin, xMax, yMax = bp.bounds; gw, gh = xMax - xMin, yMax - yMin
            if gw <= 0 or gh <= 0: continue
            s = box / max(gw, gh); sp = SVGPathPen(gs); g.draw(sp); d = sp.getCommands()
            mx, my = (xMin + xMax) / 2, (yMin + yMax) / 2
            return f'<path d="{d}" fill="{fill}" transform="translate({cx:.2f} {cy:.2f}) scale({s:.4f} {-s:.4f}) translate({-mx:.1f} {-my:.1f})"/>'
    return ""

def pct_str(v):
    return f"%{int(v)}" if float(v).is_integer() else ("%" + f"{v:.1f}".replace(".", ","))

def cap(s):
    if not s: return s
    h = {"i": "İ", "ı": "I"}.get(s[0], s[0].upper())
    return h + s[1:]

def sig_svg(inner_path):
    return f'<svg class="sig-glyph" viewBox="0 0 24 24"><g fill="#dcc188">{inner_path}</g></svg>'

SEXTILE_SVG = ('<svg class="sig-glyph" viewBox="0 0 24 24"><g stroke="#dcc188" stroke-width="1.6" '
               'stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/>'
               '<line x1="5.9" y1="8.5" x2="18.1" y2="15.5"/>'
               '<line x1="5.9" y1="15.5" x2="18.1" y2="8.5"/></g></svg>')

# --- Upsell kartları (cross-sell) ---
UP_ASK = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Aşk &amp; İlişki Haritan</div><p>Venüs, Mars, 5. ve 8. evin, ilişki kalıpların, ideal partner profilin ve zamanlaman derinlemesine.</p><a href="#">Aşk Haritanı keşfet</a></div>'
UP_KARIYER = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Kariyer &amp; Para Haritan</div><p>10. ev, Satürn, MC ve para göstergelerin, sana uygun meslekler ve doğru zamanlamalar üzerine tam analiz.</p><a href="#">Kariyer Haritanı keşfet</a></div>'
UP_SAGLIK = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Sağlık &amp; Enerji Haritan</div><p>6. ev, bedensel enerjin ve element dengen üzerine, sana özel denge ve canlılık rehberi.</p><a href="#">Sağlık Haritanı keşfet</a></div>'
UP_LILITH = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Lilith &amp; Karmik Raporun</div><p>Lilith, Ay Düğümleri ve Kiron üzerinden ruhsal yolculuğun, karmik desenlerin ve gölge tarafın.</p><a href="#">Karmik Raporunu keşfet</a></div>'
UP_SINASTRI = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Sevgili / Eş Uyum Raporu</div><p>Haritanı sevdiğininkiyle karşılaştırıp aranızdaki çekim, uyum ve gerilim noktalarını ortaya koyan ikili analiz. İki doğum verisiyle, tek tıkla.</p><a href="#">Uyum Raporunu keşfet</a></div>'
UP_SOLAR = '<div class="upsell"><span class="eyebrow">Daha Derine</span><div class="u-title">Solar Return (Yıl Haritan)</div><p>Bu doğum gününden bir sonrakine, yılın ana temaları, öne çıkan yaşam alanların ve fırsat pencereleri üzerine kişisel yıllık harita okuması.</p><a href="#">Yıl Haritanı keşfet</a></div>'

# Natal raporun SONUNDA (Son Söz'den sonra) toplu cross-sell listesi — içerik akışına serpiştirilmez
UPSELL_LIST_NATAL = [UP_ASK, UP_KARIYER, UP_SAGLIK, UP_SOLAR, UP_LILITH]

# --- Tema (hafif, dekoratif aksan; marka altını + veri renkleri korunur) ---
SIGIL_NATAL = '<span class="astro">&#9737;&nbsp;&#9789;</span>'
SIGIL_ASK = ('<svg viewBox="0 0 24 24" width="40" height="40" style="vertical-align:middle">'
             '<path d="M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 '
             'C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z" '
             'fill="none" stroke="#e6b3c5" stroke-width="1.2"/></svg>')
THEME_ASK = (
    ":root{--accent-soft:#e6b3c5;}"
    ".eyebrow{color:#d98fae;}"
    ".cover .eyebrow,.chart-page .eyebrow,.element-page .eyebrow,.closing .eyebrow,.elemental .eyebrow,.sig-page .eyebrow,.upsell .eyebrow{color:#e6b3c5;}"
    ".page-title{color:#e6b3c5;}"
    ".sig-head .dash{background:#d98fae;}"
    ".cover .rule{background:linear-gradient(90deg,transparent,#d98fae,transparent);}"
    ".section-head .sym{border-color:#d98fae;}.section-head .sym .astro{color:#d98fae;}"
    ".section-head .hr{background:linear-gradient(90deg,#d98fae,transparent);}"
    ".paren,.sig-synth .paren,.element-page .el-comment .paren{color:#d98fae;}"
    ".inner,.flow,.diag-inner,.cover-inner{position:relative;z-index:1;}"
    ".cover::before,.chart-page::before,.sig-page::before,.element-page::before,.closing::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.095;background-repeat:repeat;background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E%3Cg fill=%22none%22 stroke=%22%23d98fae%22 stroke-width=%221.1%22%3E%3Cpath d=%22M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z%22 transform=%22translate(45 55) rotate(-22) scale(1.6) translate(-12 -12)%22/%3E%3Cpath d=%22M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z%22 transform=%22translate(170 42) rotate(16) scale(1.1) translate(-12 -12)%22/%3E%3Cpath d=%22M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z%22 transform=%22translate(205 158) rotate(-10) scale(1.85) translate(-12 -12)%22/%3E%3Cpath d=%22M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z%22 transform=%22translate(70 188) rotate(28) scale(1.25) translate(-12 -12)%22/%3E%3Cpath d=%22M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z%22 transform=%22translate(138 118) rotate(-40) scale(0.95) translate(-12 -12)%22/%3E%3C/g%3E%3C/svg%3E');}"
)

SIGIL_KARIYER = '<span class="astro">&#9796;&nbsp;&#9795;</span>'  # Satürn + Jüpiter (kariyer başrol gezegenleri)
# Kariyer teması: zümrüt yeşili aksan (bereket/büyüme) + ince yıldız (✦) arkaplan deseni. Marka altını/veri renkleri korunur.
_KSTAR_D = "M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z"
_KSTAR_TF = [("45 55", "-22", "1.7"), ("170 42", "16", "1.15"), ("205 158", "-10", "1.9"),
             ("70 188", "28", "1.3"), ("138 118", "-40", "1.0"), ("108 24", "10", "0.78")]
_KSTARS = "".join(
    "%3Cpath d=%22" + _KSTAR_D + "%22 transform=%22translate(" + t + ") rotate(" + r + ") scale(" + s + ") translate(-12 -12)%22/%3E"
    for (t, r, s) in _KSTAR_TF)
_KMOTIF = ("url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E"
           "%3Cg fill=%22%235cae8a%22%3E" + _KSTARS + "%3C/g%3E%3C/svg%3E')")
THEME_KARIYER = (
    ":root{"
    "--focus-line:rgba(110,190,150,.62);--focus-line-strong:rgba(132,206,166,.95);"
    "--focus-fill:rgba(110,190,150,.20);--focus-fill-soft:rgba(110,190,150,.13);"
    "--focus-hn:#9ad9b8;--focus-hn-strong:#b6e6cd;--focus-text:#9ad9b8;"
    "--focus-glyph-color:#86cfac;--focus-glyph:'\\2726';--accent-soft:#86cfac;"
    "}"
    ".eyebrow{color:#4e9e7d;}"
    ".cover .eyebrow,.chart-page .eyebrow,.element-page .eyebrow,.closing .eyebrow,.sig-page .eyebrow{color:#86cfac;}"
    ".page-title{color:#86cfac;}"
    ".cover .sigil{color:#86cfac;}"
    ".sig-head .dash{background:#4e9e7d;}"
    ".cover .rule{background:linear-gradient(90deg,transparent,#4e9e7d,transparent);}"
    ".section-head .sym .astro{color:#4e9e7d;}"
    ".section-head .hr{background:linear-gradient(90deg,#4e9e7d,transparent);}"
    ".paren,.sig-synth .paren,.element-page .el-comment .paren{color:#4e9e7d;}"
    ".inner,.flow,.diag-inner,.cover-inner{position:relative;z-index:1;}"
    ".chart-page::before,.sig-page::before,.element-page::before,.closing::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.085;background-repeat:repeat;background-image:" + _KMOTIF + ";}"
)

# --- Ürün odak (focus) tanımları: ev vurguları + notlar + başrol gezegenleri (ürün-bağımsız motor) ---
FOCUS_ASK = {
    "noun": "İlişki", "houses": [5, 7, 8],
    "labels": {4: "yuva ve kökler", 5: "flört ve yaratıcı aşk", 7: "ortaklık ve evlilik", 8: "derin bağ ve mahremiyet"},
    "houses_lead": "İlişkiyle en doğrudan ilgili evler", "area": "ilişki", "area2": "aşkın",
    "read_from": "Venüs ve Mars'ının burç ve ev yerleşiminden",
    "planets": ["venus", "mars"],
    "roles": {"venus": ("Venüs", "nasıl sevdiğini ve neye değer verdiğini"),
              "mars": ("Mars", "neye çekildiğini ve arzu tarzını"),
              "ay": ("Ay", "duygusal güvenlik ihtiyaçlarını")},
    "chart_lead": "Aşk ve ilişki haritanın başrolünde",
}
FOCUS_KARIYER = {
    "noun": "Kariyer", "houses": [2, 6, 10],
    "labels": {2: "para ve değerler", 6: "iş, hizmet ve günlük rutin", 10: "kariyer, itibar ve hedefler"},
    "houses_lead": "Kariyerinle en doğrudan ilgili evler", "area": "kariyer", "area2": "kariyerinin",
    "read_from": "Satürn ve Jüpiter'inin burç ve ev yerleşiminden",
    "planets": ["saturn", "jupiter"],
    "roles": {"saturn": ("Satürn", "sorumluluğunu, disiplinini ve ustalaştığın alanı"),
              "jupiter": ("Jüpiter", "büyüme, fırsat ve şans alanını"),
              "gunes": ("Güneş", "çekirdek hedefini ve görünürlüğünü")},
    "chart_lead": "Kariyer haritanın başrolünde",
}

# Sağlık & Enerji teması: şifa teali (aqua) aksan + yaprak arkaplan deseni + yaprak sigil.
SIGIL_SAGLIK = ('<svg viewBox="0 0 24 24" width="40" height="40" style="vertical-align:middle">'
                '<path d="M12 2 C17 7 17 15 12 22 C7 15 7 7 12 2 Z" fill="none" stroke="#97d68b" stroke-width="1.2"/>'
                '<path d="M12 4.5 L12 19.5" fill="none" stroke="#97d68b" stroke-width="1"/></svg>')
_LEAF_D = "M12 2 C17 7 17 15 12 22 C7 15 7 7 12 2 Z"
_LEAF_TF = [("45 55", "-22", "1.6"), ("170 42", "16", "1.1"), ("205 158", "-10", "1.8"),
            ("70 188", "28", "1.25"), ("138 118", "-40", "0.95"), ("108 24", "10", "0.75")]
_LEAVES = "".join(
    "%3Cpath d=%22" + _LEAF_D + "%22 transform=%22translate(" + t + ") rotate(" + r + ") scale(" + s + ") translate(-12 -12)%22/%3E"
    for (t, r, s) in _LEAF_TF)
_LMOTIF = ("url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E"
           "%3Cg fill=%22none%22 stroke=%22%234ea64a%22 stroke-width=%221.1%22%3E" + _LEAVES + "%3C/g%3E%3C/svg%3E')")
THEME_SAGLIK = (
    ":root{"
    "--focus-line:rgba(96,178,90,.62);--focus-line-strong:rgba(118,200,112,.95);"
    "--focus-fill:rgba(96,178,90,.20);--focus-fill-soft:rgba(96,178,90,.13);"
    "--focus-hn:#a6dd97;--focus-hn-strong:#c2e8b3;--focus-text:#a6dd97;"
    "--focus-glyph-color:#97d68b;--focus-glyph:'\\2742';--accent-soft:#97d68b;"
    "}"
    ".eyebrow{color:#4ea64a;}"
    ".cover .eyebrow,.chart-page .eyebrow,.element-page .eyebrow,.closing .eyebrow,.sig-page .eyebrow{color:#97d68b;}"
    ".page-title{color:#97d68b;}"
    ".cover .sigil{color:#97d68b;}"
    ".sig-head .dash{background:#4ea64a;}"
    ".cover .rule{background:linear-gradient(90deg,transparent,#4ea64a,transparent);}"
    ".section-head .sym .astro{color:#4ea64a;}"
    ".section-head .hr{background:linear-gradient(90deg,#4ea64a,transparent);}"
    ".paren,.sig-synth .paren,.element-page .el-comment .paren{color:#4ea64a;}"
    ".inner,.flow,.diag-inner,.cover-inner{position:relative;z-index:1;}"
    ".chart-page::before,.sig-page::before,.element-page::before,.closing::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.08;background-repeat:repeat;background-image:" + _LMOTIF + ";}"
)
FOCUS_SAGLIK = {
    "noun": "Sağlık", "houses": [1, 6, 8],
    "labels": {1: "beden ve canlılık", 6: "sağlık, rutin ve bağışıklık", 8: "yenilenme ve dayanıklılık"},
    "houses_lead": "Sağlık ve enerjinle en doğrudan ilgili evler", "area": "sağlık", "area2": "sağlık",
    "read_from": "Güneş ve Mars'ının burç ve ev yerleşiminden",
    "planets": ["gunes", "mars"],
    "roles": {"gunes": ("Güneş", "yaşam gücünü ve genel canlılığını"),
              "mars": ("Mars", "fiziksel enerjini, dayanıklılığını ve hareket dürtünü"),
              "ay": ("Ay", "bedensel ritmini ve günlük enerji dalgalanmanı")},
    "chart_lead": "Sağlık ve enerji haritanın başrolünde",
}

# Solar Return teması: ametist/mor-leylak aksan + güneş-ışını (sunburst) desen + güneş sigil.
_SUN_D = "M12 1.5 L13.3 9 L19.6 4.4 L15 10.7 L22.5 12 L15 13.3 L19.6 19.6 L13.3 15 L12 22.5 L10.7 15 L4.4 19.6 L9 13.3 L1.5 12 L9 10.7 L4.4 4.4 L10.7 9 Z"
SIGIL_SOLAR = ('<svg viewBox="0 0 24 24" width="42" height="42" style="vertical-align:middle">'
               f'<path d="{_SUN_D}" fill="none" stroke="#c3a6e8" stroke-width="0.9"/>'
               '<circle cx="12" cy="12" r="2.6" fill="none" stroke="#c3a6e8" stroke-width="1"/></svg>')
_SUN_TF = [("45 55", "0", "1.5"), ("172 44", "20", "1.0"), ("205 160", "-12", "1.7"),
           ("70 190", "30", "1.2"), ("138 116", "12", "0.9"), ("108 26", "-8", "0.7")]
_SUNS = "".join(
    "%3Cpath d=%22" + _SUN_D + "%22 transform=%22translate(" + t + ") rotate(" + r + ") scale(" + s + ") translate(-12 -12)%22/%3E"
    for (t, r, s) in _SUN_TF)
_SMOTIF = ("url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E"
           "%3Cg fill=%22none%22 stroke=%22%239b72d0%22 stroke-width=%221%22%3E" + _SUNS + "%3C/g%3E%3C/svg%3E')")
THEME_SOLAR = (
    ":root{"
    "--focus-line:rgba(155,114,208,.62);--focus-line-strong:rgba(175,140,225,.95);"
    "--focus-fill:rgba(155,114,208,.20);--focus-fill-soft:rgba(155,114,208,.13);"
    "--focus-hn:#c3a6e8;--focus-hn-strong:#d8c4f0;--focus-text:#c3a6e8;"
    "--focus-glyph-color:#c3a6e8;--focus-glyph:'\\2742';--accent-soft:#c3a6e8;"
    "}"
    ".eyebrow{color:#9b72d0;}"
    ".cover .eyebrow,.chart-page .eyebrow,.element-page .eyebrow,.closing .eyebrow,.sig-page .eyebrow{color:#c3a6e8;}"
    ".page-title{color:#c3a6e8;}"
    ".cover .sigil{color:#c3a6e8;}"
    ".sig-head .dash{background:#9b72d0;}"
    ".cover .rule{background:linear-gradient(90deg,transparent,#9b72d0,transparent);}"
    ".section-head .sym .astro{color:#9b72d0;}"
    ".section-head .hr{background:linear-gradient(90deg,#9b72d0,transparent);}"
    ".paren,.sig-synth .paren,.element-page .el-comment .paren{color:#9b72d0;}"
    ".inner,.flow,.diag-inner,.cover-inner{position:relative;z-index:1;}"
    ".chart-page::before,.sig-page::before,.element-page::before,.closing::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.07;background-repeat:repeat;background-image:" + _SMOTIF + ";}"
)

# Lilith & Karmik teması: kızıl/bordo aksan + hilal ("Kara Ay") arkaplan deseni + hilal sigil.
_MOON_D = "M16 4 A 9 9 0 1 0 16 22 A 11.5 11 0 0 1 16 4 Z"
SIGIL_LILITH = ('<svg viewBox="0 0 24 24" width="40" height="40" style="vertical-align:middle">'
                f'<path d="{_MOON_D}" fill="none" stroke="#e0859a" stroke-width="1.1"/></svg>')
_MOON_TF = [("44 56", "-18", "1.4"), ("172 44", "200", "1.0"), ("206 158", "-12", "1.6"),
            ("70 190", "150", "1.15"), ("138 116", "30", "0.85"), ("108 26", "190", "0.7")]
_MOONS = "".join(
    "%3Cpath d=%22" + _MOON_D + "%22 transform=%22translate(" + t + ") rotate(" + r + ") scale(" + s + ") translate(-13 -13)%22/%3E"
    for (t, r, s) in _MOON_TF)
_MMOTIF = ("url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E"
           "%3Cg fill=%22none%22 stroke=%22%23bb3850%22 stroke-width=%221.1%22%3E" + _MOONS + "%3C/g%3E%3C/svg%3E')")
THEME_LILITH = (
    ":root{"
    "--focus-line:rgba(187,56,80,.62);--focus-line-strong:rgba(205,80,105,.95);"
    "--focus-fill:rgba(187,56,80,.20);--focus-fill-soft:rgba(187,56,80,.13);"
    "--focus-hn:#e0859a;--focus-hn-strong:#eaa6b5;--focus-text:#e0859a;"
    "--focus-glyph-color:#e0859a;--focus-glyph:'\\263E';--accent-soft:#e0859a;"
    "}"
    ".eyebrow{color:#bb3850;}"
    ".cover .eyebrow,.chart-page .eyebrow,.element-page .eyebrow,.closing .eyebrow,.sig-page .eyebrow{color:#e0859a;}"
    ".page-title{color:#e0859a;}"
    ".cover .sigil{color:#e0859a;}"
    ".sig-head .dash{background:#bb3850;}"
    ".cover .rule{background:linear-gradient(90deg,transparent,#bb3850,transparent);}"
    ".section-head .sym .astro{color:#bb3850;}"
    ".section-head .hr{background:linear-gradient(90deg,#bb3850,transparent);}"
    ".paren,.sig-synth .paren,.element-page .el-comment .paren{color:#bb3850;}"
    ".inner,.flow,.diag-inner,.cover-inner{position:relative;z-index:1;}"
    ".chart-page::before,.sig-page::before,.element-page::before,.closing::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.075;background-repeat:repeat;background-image:" + _MMOTIF + ";}"
)

# Sinastri Sevgili/Eş teması: gül-pembe aksan + kalp arkaplan deseni (çift dark sayfalar: cover/chart/txt/denge/closing).
_SVHEART_D = "M12 20.5 C12 20.5 3.8 14.2 3.8 8.7 C3.8 6 6 3.8 8.6 3.8 C10.3 3.8 11.6 4.9 12 6.2 C12.4 4.9 13.7 3.8 15.4 3.8 C18 3.8 20.2 6 20.2 8.7 C20.2 14.2 12 20.5 12 20.5 Z"
_SVHEART_TF = [("45 55", "-22", "1.6"), ("170 42", "16", "1.1"), ("205 158", "-10", "1.85"),
               ("70 188", "28", "1.25"), ("138 118", "-40", "0.95"), ("108 24", "10", "0.78")]
_SVHEARTS = "".join(
    "%3Cpath d=%22" + _SVHEART_D + "%22 transform=%22translate(" + t + ") rotate(" + r + ") scale(" + s + ") translate(-12 -12)%22/%3E"
    for (t, r, s) in _SVHEART_TF)
_SVMOTIF = ("url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22%3E"
            "%3Cg fill=%22none%22 stroke=%22%23dd7a99%22 stroke-width=%221.1%22%3E" + _SVHEARTS + "%3C/g%3E%3C/svg%3E')")
THEME_SINASTRI_SEVGILI = (
    ".inner,.cover-inner{position:relative;z-index:1;}"
    ".cover::before,.chart-page::before,.txt-page::before,.denge::before,.closing::before{content:'';"
    "position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.09;background-repeat:repeat;"
    "background-image:" + _SVMOTIF + ";}"
)

# --- Ürün config'i: (sentez-başlık-öneki, eyebrow, h2-başlık, glif, upsell) ---
PRODUCTS = {
    "natal": {
        "urun_baslik": "Doğum Haritası Raporu", "urun_alt": "", "theme_css": "", "sigil": SIGIL_NATAL, "urun_etiket": "",
        "focus": None,
        "sections": [
            ("Sen Kimsin", "I · Çekirdek", "Sen Kimsin?", 9737, None),
            ("Dışarıya Yansıman", "II · Dış İzlenim", "Dışarıya Yansıman", 9810, None),
            ("Duygusal Dünyan", "III · İç Dünya", "Duygusal Dünyan", 9789, None),
            ("Zihnin", "IV · Zihin", "Zihnin &amp; İletişimin", 9791, None),
            ("Aşk", "V · Bağlar", "Aşk &amp; İlişkiler", 9792, None),
            ("Kariyer", "VI · Yön", "Kariyer &amp; Yaşam Yönün", 9796, None),
            ("Sağlık", "VII · Beden", "Sağlık &amp; Enerji", 9792, None),
            ("Güçlü", "VIII · Bütünlük", "Güçlü Yönlerin &amp; Gelişim Alanların", 10022, None),
        ],
    },
    "ask": {
        "urun_baslik": "Aşk & İlişki Haritası",
        "urun_alt": "doğum haritanın aşk ve ilişki odaklı okuması",
        "theme_css": THEME_ASK, "sigil": SIGIL_ASK,
        "urun_etiket": ' <span class="lbl-sub">(aşk &amp; ilişkilere yönelik)</span>',
        "focus": FOCUS_ASK,
        "sections": [
            ("Sevgi Dilin", "I · Sevgi", "Sevgi Dilin", 9792, None),
            ("Çekim", "II · Arzu", "Çekim &amp; Arzu", 9794, None),
            ("İlişkide Duruşun", "III · Duruş", "İlişkide Duruşun", 9737, None),
            ("Duygusal İhtiyaçların", "IV · İhtiyaç", "Duygusal İhtiyaçların", 9789, None),
            ("Yakınlık", "V · Derinlik", "Yakınlık &amp; Derinlik", 9795, None),
            ("Aşkta Kalıpların", "VI · Kalıplar", "Aşkta Kalıpların", 9796, None),
            ("Sana Yakışan Bağ", "VII · Yön", "Sana Yakışan Bağ", 10022, None),
        ],
    },
    "kariyer": {
        "urun_baslik": "Kariyer & Para Haritası",
        "urun_alt": "doğum haritanın kariyer ve para odaklı okuması",
        "theme_css": THEME_KARIYER, "sigil": SIGIL_KARIYER,
        "urun_etiket": ' <span class="lbl-sub">(kariyer &amp; paraya yönelik)</span>',
        "focus": FOCUS_KARIYER,
        "sections": [
            ("İş Kimliğin", "I · Kimlik", "İş Kimliğin", 9737, None),
            ("Çalışma Tarzın", "II · Tarz", "Çalışma Tarzın &amp; Ritmin", 9791, None),
            ("Para ile İlişkin", "III · Para", "Para ile İlişkin", 9792, None),
            ("Kariyer Yönün", "IV · Yön", "Kariyer Yönün &amp; Çağrın", 9796, None),
            ("Büyüme", "V · Fırsat", "Büyüme &amp; Fırsat Alanın", 9795, None),
            ("Zorluk", "VI · Ustalaşma", "Zorluk &amp; Ustalaşma", 9794, None),
            ("Sana Yakışan Yol", "VII · Çağrı", "Sana Yakışan Yol", 10022, None),
        ],
    },
    "saglik": {
        "urun_baslik": "Sağlık & Enerji Haritası",
        "urun_alt": "doğum haritanın sağlık ve enerji odaklı okuması",
        "theme_css": THEME_SAGLIK, "sigil": SIGIL_SAGLIK,
        "urun_etiket": ' <span class="lbl-sub">(sağlık &amp; enerjiye yönelik)</span>',
        "focus": FOCUS_SAGLIK,
        "sections": [
            ("Enerji İmzan", "I · Canlılık", "Enerji İmzan &amp; Yaşam Gücün", 9737, None),
            ("Bedensel Yapın", "II · Beden", "Bedensel Yapın &amp; Mizacın", 9789, None),
            ("Günlük Sağlık", "III · Rutin", "Günlük Sağlık &amp; Rutinin", 9791, None),
            ("Stres", "IV · Denge", "Stres &amp; Denge", 9796, None),
            ("Güçlü ve Hassas", "V · Eğilim", "Güçlü ve Hassas Alanların", 9794, None),
            ("Yenilenme", "VI · Yenilenme", "Yenilenme &amp; Dayanıklılık", 9795, None),
            ("Sana Yakışan Yaşam Ritmi", "VII · Ritim", "Sana Yakışan Yaşam Ritmi", 10022, None),
        ],
    },
    "solar": {
        "urun_baslik": "Solar Return · Yıl Haritası",
        "urun_alt": "doğum gününden bir sonrakine, yılının gökyüzü okuması",
        "theme_css": THEME_SOLAR, "sigil": SIGIL_SOLAR,
        "urun_etiket": ' <span class="lbl-sub">(yıl haritası)</span>',
        "gokyuzu_baslik": "Yılın Gökyüzü",
        "meta_not": ("Yukarıdaki an, Güneş'in doğduğun andaki tam konumuna geri döndüğü "
                     "“yıl dönüşü” (Solar Return) anıdır. Bu yüzden takvim doğum gününden "
                     "bir gün önce ya da sonra ve farklı bir saatte olabilir; bu normaldir."),
        "focus": None,
        "sections": [
            ("Yılın Tonu", "I · Ton", "Yılın Tonu", 10022, None),
            ("Yılın Odağı", "II · Odak", "Yılın Odağı", 9737, None),
            ("Duygusal İklim", "III · İklim", "Duygusal İklim", 9789, None),
            ("Öne Çıkan Alanlar", "IV · Alanlar", "Öne Çıkan Alanlar", 9795, None),
            ("Fırsat ve Akış", "V · Fırsat", "Fırsat ve Akış", 9792, None),
            ("Zorluk ve Gerilim", "VI · Gerilim", "Zorluk ve Gerilim", 9796, None),
            ("Yılın Daveti", "VII · Davet", "Yılın Daveti", 10022, None),
        ],
    },
    "lilith": {
        "urun_baslik": "Lilith & Karmik Harita",
        "urun_alt": "doğum haritanın gölge, karma ve ruhsal yolculuk okuması",
        "theme_css": THEME_LILITH, "sigil": SIGIL_LILITH,
        "urun_etiket": ' <span class="lbl-sub">(karmik &amp; ruhsal)</span>',
        "focus": None,
        "sections": [
            ("Gölgen ve Bastırdığın Güç", "I · Gölge", "Gölgen ve Bastırdığın Güç", 9789, None),
            ("Karmik Geçmişin", "II · Geçmiş", "Karmik Geçmişin", 9739, None),
            ("Ruhsal Gelişim Yönün", "III · Yön", "Ruhsal Gelişim Yönün", 9738, None),
            ("Yaran ve Şifan", "IV · Şifa", "Yaran ve Şifan", 9911, None),
            ("Tekrar Eden Örüntülerin", "V · Örüntü", "Tekrar Eden Örüntülerin", 10022, None),
            ("Ruhsal Bütünleşme", "VI · Bütünleşme", "Ruhsal Bütünleşme", 10022, None),
        ],
    },
    "sinastri-sevgili": {
        "urun_baslik": "Sevgili / Eş Uyum Raporu",
        "urun_alt": "iki doğum haritasının çekim ve uyum okuması",
        "accent": "#dd7a99", "accent_soft": "#ecaec1",
        "theme_css": THEME_SINASTRI_SEVGILI,
        "sigil": '<span class="astro">&#9792;&nbsp;&#9794;</span>',
        "eyebrow_text": "İki Kişilik Uyum Analizi",
        "sections": [
            ("İlk Çekim", "I · Çekim", "İlk Çekim &amp; Kimya"),
            ("Duygusal Bağ", "II · Bağ", "Duygusal Bağ"),
            ("Zihinsel", "III · Zihin", "Zihinsel &amp; İletişim Uyumu"),
            ("Tutku ve Yakınlık", "IV · Tutku", "Tutku ve Yakınlık"),
            ("Güven ve Süreklilik", "V · Güven", "Güven ve Süreklilik"),
            ("Çatışma", "VI · Gerilim", "Çatışma ve Gerilim Noktaları"),
            ("Birlikte Büyümek", "VII · Sentez", "Birlikte Büyümek"),
        ],
    },
    "sinastri-arkadas": {
        "urun_baslik": "Arkadaşlık Uyum Raporu",
        "urun_alt": "iki doğum haritasının dostluk uyumu okuması",
        "accent": "#e08e4f", "accent_soft": "#f2b585",
        "sigil": '<span class="astro">&#10022;&nbsp;&#10022;</span>',
        "eyebrow_text": "İki Kişilik Dostluk Analizi",
        "sections": [
            ("İlk Tanışma", "I · Tanışma", "İlk Tanışma ve Kıvılcım"),
            ("Duygusal Anlayış", "II · Anlayış", "Duygusal Anlayış"),
            ("Zihinsel Uyum", "III · Sohbet", "Zihinsel Uyum ve Sohbet"),
            ("Ortak Enerji", "IV · Enerji", "Ortak Enerji ve Eylem"),
            ("Güven ve Sadakat", "V · Güven", "Güven ve Sadakat"),
            ("Sürtüşme", "VI · Sürtüşme", "Sürtüşme Noktaları"),
            ("Dostluğunuzu", "VII · Sentez", "Dostluğunuzu Besleyen"),
        ],
    },
}

def parse_report(txt):
    secs, cur, buf = {}, None, []
    for line in txt.splitlines():
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if m:
            if cur is not None: secs[cur] = "\n".join(buf).strip()
            cur, buf = m.group(1).strip(), []
        elif cur is not None:
            buf.append(line)
    if cur is not None: secs[cur] = "\n".join(buf).strip()
    return secs

def paren(s):
    return re.sub(r"\(([^()]+)\)", r'<span class="paren">(\1)</span>', s)

def body_html(body):
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    return "\n      ".join(f"<p>{paren(p)}</p>" for p in paras) or "<p>…</p>"


ASP_AD_R = {"kavusum": "kavuşum", "altmislik": "altmışlık", "ucgen": "üçgen", "kare": "kare", "karsitlik": "karşıt"}
UYUM_COLOR = {"uyumlu": "#6fb59f", "zorlu": "#c98a6a", "notr": "#dcc188"}
PA_COL, PB_COL, ORTAK_COL = "#7fa6d0", "#d98fae", "#dcc188"  # Kişi A / Kişi B / ortak
_MODS = ["Öncü", "Sabit", "Değişken"]
_SIGNS12 = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"]

def syn_element_table(A, B, adA, adB):
    """İki kişilik element×nitelik tablosu (Nitelik Dengesi tarzı): A bir renk, B başka renk, çakışan ortak."""
    sign_at = {(EL_ORDER[i % 4], _MODS[i % 3]): _SIGNS12[i] for i in range(12)}
    def pts(c):
        d = {}
        for p in c["planets"]:
            d.setdefault((p["element"], p["modality"]), []).append(p["glyph"])
        si = c["asc"]["sign_idx"]
        d.setdefault((EL_ORDER[si % 4], _MODS[si % 3]), []).append("AC")
        return d
    pa, pb = pts(A), pts(B)
    def glyphs(lst, col):
        return "".join(f'<span class="astro" style="color:{col}">{("&#%d;" % g) if g != "AC" else "AC"}</span>' for g in lst)
    head = "<tr><th></th>" + "".join(f"<th>{m}</th>" for m in _MODS) + "</tr>"
    rows = []
    for el in EL_ORDER:
        cells = [f'<th class="em-el">{el}</th>']
        for m in _MODS:
            a, b = pa.get((el, m), []), pb.get((el, m), [])
            if a and b: cls, lab = "ortak", "ortak"
            elif a: cls, lab = "pa", adA
            elif b: cls, lab = "pb", adB
            else: cls, lab = "empty", ""
            own = f'<span class="em-own">{lab}</span>' if lab else ""
            cells.append(f'<td class="em-cell {cls}"><span class="em-sign">{sign_at[(el, m)]}</span>'
                         f'<span class="em-pts">{glyphs(a, PA_COL)}{glyphs(b, PB_COL)}</span>{own}</td>')
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return f'<table class="em-grid"><thead>{head}</thead><tbody>{"".join(rows)}</tbody></table>'

def render_sinastri(product):
    """Motor 3 — Sinastri (çift uyum): iki harita + çapraz açılar, kendine yeten şablon."""
    cfg = PRODUCTS[product]
    chart = json.load(open(os.path.join(IO, "chart.json"), encoding="utf-8"))
    A, B = chart["person_a"], chart["person_b"]
    adA, adB = A["meta"]["ad"], B["meta"]["ad"]

    # 1) İki çark: person_a / person_b -> ayrı dosya -> wheel_gen
    json.dump(A, open(os.path.join(IO, "_pa.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(B, open(os.path.join(IO, "_pb.json"), "w", encoding="utf-8"), ensure_ascii=False)
    genenv = {**os.environ, "PRODUCT": product}
    subprocess.run([PY, os.path.join(HERE, "wheel_gen.py"), "_pa.json", "wheel-a.svg"], check=True, env=genenv)
    subprocess.run([PY, os.path.join(HERE, "wheel_gen.py"), "_pb.json", "wheel-b.svg"], check=True, env=genenv)
    wheel_a = open(os.path.join(IO, "wheel-a.svg"), encoding="utf-8").read().replace("<svg ", '<svg class="chart-wheel" ', 1)
    wheel_b = open(os.path.join(IO, "wheel-b.svg"), encoding="utf-8").read().replace("<svg ", '<svg class="chart-wheel" ', 1)
    dual_wheel = (
        '<div class="dual-wheel">'
        f'<div class="dw-col"><div class="dw-label">{adA}</div>{wheel_a}<div class="dw-sub">Doğum Haritası</div></div>'
        f'<div class="dw-col"><div class="dw-label">{adB}</div>{wheel_b}<div class="dw-sub">Doğum Haritası</div></div>'
        '</div>')

    # 2) Çapraz açı satırları (en güçlü 12) + ev bindirmeleri
    rows = []
    for x in chart["synastry_aspects"][:12]:
        col = UYUM_COLOR.get(x["uyum"], "#dcc188")
        rows.append(
            f'<div class="asp-row"><span class="dot" style="background:{col}"></span>'
            f'<span class="ap">{x["a_ad"]} <em>({adA})</em></span>'
            f'<span class="at">{ASP_AD_R.get(x["type"], x["type"])}</span>'
            f'<span class="ap">{x["b_ad"]} <em>({adB})</em></span></div>')
    aspects_html = "".join(rows)
    ov = [f'<li>{adA}: {o["ad"]} &rarr; {adB} <b>{o["house"]}. ev</b></li>' for o in chart["overlays_ab"]]
    ov += [f'<li>{adB}: {o["ad"]} &rarr; {adA} <b>{o["house"]}. ev</b></li>' for o in chart["overlays_ba"]]
    overlays_html = "".join(ov)

    # 3) Sentez prozları
    rpath = os.path.join(IO, f"rapor-{product}.txt")
    parsed = parse_report(open(rpath, encoding="utf-8").read()) if os.path.exists(rpath) else {}
    if not parsed:
        print(f"[uyarı] rapor-{product}.txt yok — bölümler boş")
    def find_body(pref): return next((b for h, b in parsed.items() if h.startswith(pref)), "")
    sections = [{"eyebrow": eb, "baslik": bs, "govde": body_html(find_body(hd))} for (hd, eb, bs) in cfg["sections"]]
    _bos = [bs for (hd, eb, bs) in cfg["sections"] if not find_body(hd).strip()]
    if _bos:
        print("\n" + "!" * 64 + f"\n⛔ BOŞ BÖLÜM(LER): {', '.join(_bos)} — rapor KUSURLU!\n" + "!" * 64 + "\n")
    imza = find_body("İmza Sentezi")
    imza_sentezi = paren(re.sub(r"\s+", " ", imza)) if imza else "…"
    _ili = find_body("İlişki İmzanız")
    iliski_imzaniz = paren(re.sub(r"\s+", " ", _ili)) if _ili else ""
    _eyo = find_body("Element Uyumu")
    element_yorum = paren(re.sub(r"\s+", " ", _eyo)) if _eyo else ""
    element_table = syn_element_table(A, B, adA, adB)
    KNOWN = ["İmza Sentezi", "İlişki İmzanız", "Element Uyumu", "Kapanış"] + [s[0] for s in cfg["sections"]]
    extra = [h for h in parsed if not any(h.startswith(p) for p in KNOWN)]
    kapanis_baslik = re.sub(r"[*#]", "", extra[0]).strip() if extra else "Son Söz"
    kap = find_body("Kapanış") or (parsed.get(extra[0], "") if extra else "")
    kapanis_text = paren(re.sub(r"\s+", " ", kap)) if kap else "…"

    ctx = {
        "ad_cift": chart["meta"]["ad"], "adA": adA, "adB": adB,
        "dogumA": A["meta"]["dogum"], "dogumB": B["meta"]["dogum"],
        "urun_baslik": cfg["urun_baslik"], "urun_alt": cfg["urun_alt"],
        "accent": cfg["accent"], "accent_soft": cfg["accent_soft"],
        "dual_wheel": dual_wheel, "overlays_html": overlays_html,
        "imza_sentezi": imza_sentezi, "iliski_imzaniz": iliski_imzaniz,
        "element_table": element_table, "sections": sections, "element_yorum": element_yorum,
        "kapanis_baslik": kapanis_baslik, "kapanis_text": kapanis_text,
        "sigil": cfg.get("sigil", ""), "eyebrow_text": cfg.get("eyebrow_text", "Kişiye Özel Astrolojik Analiz"),
        "theme_css": cfg.get("theme_css", ""),
        "cover_bg": ("data:image/jpeg;base64," + base64.b64encode(open(COVER_IMG, "rb").read()).decode()) if os.path.exists(COVER_IMG) else "",
        "logo": _data_uri(LOGO_DIKEY, "image/png"), "disclaimer": DISCLAIMER_SINASTRI,
    }
    # Standart görsel dili koru: natal şablonun <style>'ını çek, ctx'le çözüp birebir enjekte et (drift yok)
    nat_tpl = open(os.path.join(HERE, "natal-rapor.html.j2"), encoding="utf-8").read()
    mstyle = re.search(r"<style>([\s\S]*?)</style>", nat_tpl)
    ctx["base_css"] = Environment(autoescape=False).from_string(mstyle.group(1)).render(**ctx) if mstyle else ""
    env = Environment(loader=FileSystemLoader(HERE), autoescape=False)
    html = env.get_template("sinastri-rapor.html.j2").render(**ctx)
    out_html = os.path.join(IO, "natal-rapor.out.html")
    open(out_html, "w", encoding="utf-8").write(html)
    print(f"ok -> natal-rapor.out.html (sinastri: {adA} & {adB})")
    r = subprocess.run(["node", os.path.join(HERE, "render.mjs"), out_html], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        print("PDF render hata:", r.stderr.strip()[:500])


def main():
    try: sys.stdout.reconfigure(encoding="utf-8")
    except Exception: pass

    product = sys.argv[1] if len(sys.argv) > 1 else "natal"
    if product.startswith("sinastri"):
        render_sinastri(product); return
    cfg = PRODUCTS.get(product, PRODUCTS["natal"])

    chart = json.load(open(os.path.join(IO, "chart.json"), encoding="utf-8"))
    icr = json.load(open(os.path.join(HERE, "icerik.json"), encoding="utf-8"))
    # Solar Return kapak notu (dinamik): SR anı açıklaması + doğum-yeri/bulunduğun-yer
    sr_meta = chart.get("sr")
    meta_not = cfg.get("meta_not", "")
    if product == "solar" and sr_meta:
        meta_not = ("Yukarıdaki an, Güneş'in doğduğun andaki tam konumuna geri döndüğü "
                    "“yıl dönüşü” (Solar Return) anıdır; takvim doğum gününden bir gün önce ya da sonra olabilir.")
        if sr_meta.get("relocated") and sr_meta.get("birth_yer") and sr_meta.get("birth_yer") != sr_meta.get("yer"):
            meta_not += (" Bu harita doğum yerine (%s) göre değil, bu yıl bulunduğun yere (%s) göre kurulmuştur; "
                         "Yükselen ve ev yerleşimleri buna göre belirlenir." % (sr_meta["birth_yer"], sr_meta["yer"]))
    SIG = json.load(open(os.path.join(HERE, "sig_paths.json"), encoding="utf-8"))

    # 1) jeneratörler
    genenv = {**os.environ, "PRODUCT": product}
    subprocess.run([PY, os.path.join(HERE, "wheel_gen.py")], check=True, env=genenv)
    subprocess.run([PY, os.path.join(HERE, "diagram_gen.py")], check=True, env=genenv)
    wheel_svg = open(os.path.join(IO, "wheel.svg"), encoding="utf-8").read()
    diagram_svg = open(os.path.join(IO, "diagram.svg"), encoding="utf-8").read()
    # Solar Return: 2-haritalı sayfa için natal çarkı da üret (chart-natal.json -> wheel-natal.svg)
    natal_wheel_svg = ""
    if product == "solar" and os.path.exists(os.path.join(IO, "chart-natal.json")):
        subprocess.run([PY, os.path.join(HERE, "wheel_gen.py"), "chart-natal.json", "wheel-natal.svg"], check=True, env=genenv)
        natal_wheel_svg = open(os.path.join(IO, "wheel-natal.svg"), encoding="utf-8").read()

    P = {p["id"]: p for p in chart["planets"]}
    asc = chart["asc"]; asc_si = asc["sign_idx"]
    elements = chart["elements"]; modalities = chart["modalities"]
    order = sorted(elements, key=lambda k: elements[k], reverse=True)  # baskından zayıfa
    dom_el = order[0]
    dom_mod = max(modalities, key=lambda k: modalities[k])

    def miss(d, k):  # eksik anahtar -> stub + log
        if k not in d:
            print(f"[icerik EKSİK] {k}"); return "…"
        return d[k]

    # 2a) İMZALAR
    signatures = []
    signatures.append({"icon": sig_svg(SIG["sun"]),
        "title": f"{P['gunes']['sign']} Güneş · {P['gunes']['house']}. Ev",
        "text": miss(icr["gunes"], P["gunes"]["sign"])})
    signatures.append({"icon": sig_svg(SIG["moon"]),
        "title": f"{P['ay']['sign']} Ay · {P['ay']['house']}. Ev",
        "text": miss(icr["ay"], P["ay"]["sign"])})
    signatures.append({"icon": sig_svg(glyph_path(SIGN_CODES[asc_si], 12, 12, 18, "#dcc188")),
        "title": f"{asc['sign']} Yükselen",
        "text": miss(icr["yukselen"], asc["sign"])})

    def is_light(a): return a["a"] in ("gunes", "ay") or a["b"] in ("gunes", "ay")
    asps = sorted(chart["aspects"], key=lambda a: (0 if is_light(a) else 1, a["orb"]))[:4]
    for a in asps:
        icon = sig_svg(SIG[ASP_GLYPH[a["type"]]]) if a["type"] in ASP_GLYPH else SEXTILE_SVG
        title = f"{KW_AD[a['a']]}–{KW_AD[a['b']]} {icr['aspect_etiket'][a['type']]}"
        text = f"{cap(icr['aspect_kw'][a['a']])} ile {icr['aspect_kw'][a['b']]} {icr['aspect_relation'][a['type']]}."
        signatures.append({"icon": icon, "title": title, "text": text})

    signatures.append({"icon": f'<svg class="sig-glyph" viewBox="0 0 24 24"><g fill="none" stroke="#dcc188" stroke-width="1.6" stroke-linejoin="round">{EL_SYMBOL[dom_el]}</g></svg>',
        "title": f"{dom_mod}-{dom_el} Baskınlığı",
        "text": f"{cap(icr['nitelik_dom'][dom_mod])}, {icr['element_dom'][dom_el]}."})

    sig_cards = "\n".join(
        f'<div class="sig"><div class="badge">{s["icon"]}</div><div class="t">'
        f'<strong>{s["title"]}</strong><span>{s["text"]}</span></div></div>'
        for s in signatures)

    # 2b) MİZAÇ kartı
    mk = chart["mizac"]["key"]; m = icr["mizac"].get(mk, {})
    mizac_ad = m.get("ad", chart["mizac"]["ad"])
    mizac_desc = m.get("metin", "…")
    if mk == "karma":
        mizac_desc = mizac_desc.replace("{E1}", order[0]).replace("{E2}", order[1])
    mizac_desc = re.sub(r"\s*\{NOT:[^}]*\}", "", mizac_desc)  # render notunu temizle

    # 2c) ELEMENT-YORUM
    B = icr["element_blocks"]; d, s2, w = order[0], order[1], order[-1]
    element_yorum = (f"Element dağılımında {B[d]['baskin']}; bu senin genel tonunu belirliyor. "
                     f"Yanında {B[s2]['destek']}, bu tabloyu dengeliyor. "
                     f"Buna karşılık {B[w]['eksik']}; bu bir kusur değil, farkındalıkla güçlendirebileceğin bir alan.")

    # 3) Jinja context
    occ = set(chart["occupied_houses"])
    bars = [{"name": n, "width": elements[n], "pct": pct_str(elements[n]),
             "bg": EL_GRAD[n] if n == dom_el else EL_COLOR[n], "dom": n == dom_el} for n in order]
    el_legend = [{"name": f"{e} ({MIZAC_BY_EL[e]})", "mean": EL_MEAN[e], "dom": e == dom_el} for e in EL_ORDER]
    focus = cfg.get("focus")
    focus_houses = sorted(focus["houses"]) if focus else []
    focus_planets = focus["planets"] if focus else []
    # Lilith: odak evler = karmik noktaların (Lilith/Düğümler/Kiron) düştüğü evler → Ana İmzalar'da vurgula
    karmik_pts = chart.get("karmik", [])
    if product == "lilith" and karmik_pts:
        focus_houses = sorted({k["house"] for k in karmik_pts})
    if product == "solar":
        focus_houses = [P["gunes"]["house"]]  # SR Güneş'inin evi = yılın ana odağı
    houses = [{"n": n, "desc": HOUSE_DESC[n-1], "on": n in occ, "love": n in focus_houses} for n in range(1, 13)]
    # Ürünün odak evlerinin doluluk durumuna göre KALIP yorum (her ihtimale karşı) — ürün-bağımsız
    love_note = ""
    chart_love_note = ""
    if focus:
        def _hl(hs): return ", ".join("%d. ev (%s)" % (h, focus["labels"].get(h, HOUSE_DESC[h-1])) for h in hs)
        occf = [h for h in focus_houses if h in occ]
        empf = [h for h in focus_houses if h not in occ]
        lead, noun, area, area2, rf = focus["houses_lead"], focus["noun"], focus["area"], focus["area2"], focus["read_from"]
        if not occf:        # hiçbiri dolu değil
            love_note = ("%sin hiçbirinde gezegenin yok: %s. "
                         "Bu, %s hayatında sönük olduğu anlamına gelmez; %s enerjin bu evlere yerleşmiş gezegenlerden değil, "
                         "%s okunur." % (lead, _hl(focus_houses), area2, area, rf))
        elif not empf:      # hepsi dolu
            love_note = ("%sin hepsinde gezegenin var: %s. "
                         "Bu tema haritanda belirgin bir ağırlık taşıyor; bu evlere düşen gezegenler %s hayatını doğrudan renklendirir."
                         % (lead, _hl(focus_houses), area))
        else:               # bir kısmı dolu, bir kısmı boş
            occ_word = "Dolu evdeki gezegen" if len(occf) == 1 else "Dolu evlerdeki gezegenler"
            love_note = ("%s evlerinden %s dolu, %s ise boş. "
                         "%s %s hayatının o yönünü doğrudan öne çıkarır; boş kalan evler o temaların sende olmadığı anlamına gelmez, "
                         "oralardaki %s enerjin %s okunur."
                         % (noun, _hl(occf), _hl(empf), occ_word, area, area, rf))
        # Doğum Anının Gökyüzü sayfası: ürünün başrol gezegenleri için tek-cümle kalıp not
        _lc = [(focus["roles"][p][0], P[p]["sign"], focus["roles"][p][1]) for p in focus_planets if p in P and p in focus["roles"]]
        if _lc:
            chart_love_note = ("%s %s yer alır: %s anlatıyor."
                               % (focus["chart_lead"], " ve ".join(n for n, _, _ in _lc),
                                  ", ".join('%s (<span class="paren">%s burcu</span>) %s' % (n, s, r) for n, s, r in _lc)))
    # Lilith: Ana İmzalar notu — karmik noktaların düştüğü evler
    if product == "lilith" and karmik_pts:
        love_note = ("Karmik yolculuğunun sahnesi bu evlerdir: Lilith, Ay Düğümleri ve Kiron'un düştüğü "
                     "%s vurgulandı. Yaşamında bu alanlar ruhsal ders, gölge ve dönüşüm taşır."
                     % ", ".join("%d. ev" % h for h in focus_houses))
    # Solar: Ana İmzalar = yılın ana odağı (SR Güneş'in evi); chart sayfası = çift harita açıklaması
    if product == "solar":
        love_note = ("Bu yıl enerjinin ana odağı: Solar Return Güneş'inin düştüğü %d. ev. "
                     "Yıl boyunca dikkatin, canlılığın ve gelişimin en çok bu yaşam alanında toplanıyor."
                     % focus_houses[0])
        chart_love_note = ("Soldaki doğum haritan değişmeyen sensin, sağdaki bu yılın göğü (Solar Return); "
                           "yıl haritası doğduğun haritanın üzerine biner ve onu bu yıl için harekete geçirir.")
    asc_glyph_svg = f'<svg class="asc-svg-sm" viewBox="0 0 24 24">{glyph_path(SIGN_CODES[asc_si], 12, 12, 17, "#dcc188")}</svg>'

    # --- Sentez prozları (ürünün bölümleri + İmza Sentezi + kapanış) ---
    rpath = os.path.join(IO, f"rapor-{product}.txt")
    if os.path.exists(rpath):
        parsed = parse_report(open(rpath, encoding="utf-8").read())
    else:
        parsed = {}; print(f"[uyarı] rapor-{product}.txt yok — bölüm prozları boş")
    def find_body(pref): return next((b for h, b in parsed.items() if h.startswith(pref)), "")
    sections = [{"eyebrow": eb, "baslik": bs, "glyph": gl,
                 "govde": body_html(find_body(hd)), "upsell": up}
                for (hd, eb, bs, gl, up) in cfg["sections"]]
    # GÜVENLİK: boş bölüm = kusurlu rapor (AI bölüm atlamış olabilir). Görünür uyarı bas.
    _bos = [bs for (hd, eb, bs, gl, up) in cfg["sections"] if not find_body(hd).strip()]
    if _bos:
        print("\n" + "!" * 64)
        print(f"⛔ BOŞ BÖLÜM(LER): {', '.join(_bos)} — rapor KUSURLU, müşteriye gönderme!")
        print("   (Sentezi yeniden çalıştır: node report/natal/synthesize-real.mjs " + product + ")")
        print("!" * 64 + "\n")
    # Element-yorum: sentez "Element Yorumu" ürettiyse onu kullan (ürüne özel/aşk odaklı), yoksa deterministik
    _eyo = find_body("Element Yorumu")
    if _eyo:
        element_yorum = paren(re.sub(r"\s+", " ", _eyo))
    imza = find_body("İmza Sentezi")
    imza_sentezi = paren(re.sub(r"\s+", " ", imza)) if imza else "…"
    # Kapanış: model başlığı "## Kapanış" yerine kişiye özel şiirsel başlıkla yazabiliyor.
    KNOWN = ["Ana İmzalar", "İmza Sentezi", "Element Yorumu", "Kapanış"] + [s[0] for s in cfg["sections"]]
    extra = [h for h in parsed if not any(h.startswith(p) for p in KNOWN)]
    kapanis_baslik = re.sub(r"[*#]", "", extra[0]).strip() if extra else "Son Söz"
    kap_body = find_body("Kapanış") or (parsed.get(extra[0], "") if extra else "")
    kapanis_text = paren(re.sub(r"\s+", " ", kap_body)) if kap_body else "…"

    ctx = {
        "meta": chart["meta"], "asc": asc, "planets": chart["planets"], "P": P,
        "houses": houses, "bars": bars, "el_legend": el_legend,
        "mizac": {"ad": mizac_ad}, "mizac_desc": mizac_desc,
        "dom_modality": dom_mod, "nitelik_phrase": miss(icr["nitelik_dom"], dom_mod),
        "asc_glyph_svg": asc_glyph_svg, "sections": sections, "kapanis_text": kapanis_text,
        "imza_sentezi": imza_sentezi, "kapanis_baslik": kapanis_baslik,
        "urun_baslik": cfg["urun_baslik"], "urun_alt": cfg["urun_alt"],
        "gokyuzu_baslik": cfg.get("gokyuzu_baslik", "Doğum Anının Gökyüzü"),
        "meta_not": meta_not, "karmik": chart.get("karmik", []),
        "theme_css": cfg.get("theme_css", ""), "sigil": cfg.get("sigil", SIGIL_NATAL),
        "urun_etiket": cfg.get("urun_etiket", ""), "pos_love": focus_planets,
        "love_note": love_note, "chart_love_note": chart_love_note,
        "upsell_list": cfg.get("upsell_list", []),
        "cover_bg": ("data:image/jpeg;base64," + base64.b64encode(open(COVER_IMG, "rb").read()).decode()) if os.path.exists(COVER_IMG) else "",
        "logo": _data_uri(LOGO_DIKEY, "image/png"), "disclaimer": DISCLAIMER_NATAL,
    }
    env = Environment(loader=FileSystemLoader(HERE), autoescape=False)
    html = env.get_template("natal-rapor.html.j2").render(**ctx)

    # 4) Regex swap'lar
    gen_wheel = wheel_svg.replace("<svg ", '<svg class="chart-wheel" ', 1)
    if natal_wheel_svg:
        # Solar Return: tek çark yerine "Doğum Haritan + Yıl Haritan" yan yana
        nat_w = natal_wheel_svg.replace("<svg ", '<svg class="chart-wheel" ', 1)
        sr_w = wheel_svg.replace("<svg ", '<svg class="chart-wheel" ', 1)
        dual = ('<div class="dual-wheel">'
                f'<div class="dw-col"><div class="dw-label">Doğum Haritan</div>{nat_w}<div class="dw-sub">Natal · değişmeyen sen</div></div>'
                f'<div class="dw-col"><div class="dw-label">Yıl Haritan</div>{sr_w}<div class="dw-sub">Solar Return · bu yıl</div></div>'
                '</div>')
        html = re.sub(r'<svg class="chart-wheel"[\s\S]*?</svg>', lambda mm: dual, html, count=1)
    elif product == "lilith" and chart.get("karmik"):
        # Lilith: çark solda (normal boy) + 4 karmik nokta sağda vurgulu liste
        items = "".join(
            f'<div class="kc-item"><span class="kc-glyph astro">&#{k["glyph"]};</span>'
            f'<div class="kc-txt"><strong>{k["ad"]}</strong><span>{k["sign"]} {k["deg"]} · {k["house"]}. ev</span>'
            f'<em>{k["anlam"]}</em></div></div>'
            for k in chart["karmik"])
        kc = f'<div class="karmik-chart">{gen_wheel}<div class="kc-list">{items}</div></div>'
        html = re.sub(r'<svg class="chart-wheel"[\s\S]*?</svg>', lambda mm: kc, html, count=1)
    else:
        html = re.sub(r'<svg class="chart-wheel"[\s\S]*?</svg>', lambda mm: gen_wheel, html, count=1)
    html = re.sub(r'(<div class="diagram">)<svg[\s\S]*?</svg>(</div>)',
                  lambda mm: mm.group(1) + diagram_svg + mm.group(2), html, count=1)
    html = re.sub(r'<svg class="asc-svg-sm"[\s\S]*?</svg>', lambda mm: asc_glyph_svg, html, count=1)
    # imza kartları (8 .sig) -> üretilen kartlar
    html = re.sub(r'<div class="sig"><div class="badge">[\s\S]*</div></div>(?=\s*</div>\s*</section>)',
                  lambda mm: sig_cards, html, count=1)
    # element-yorum paragrafı
    html = re.sub(r'(<div class="el-comment">[\s\S]*?)<p>[\s\S]*?</p>',
                  lambda mm: mm.group(1) + f"<p>{element_yorum}</p>", html, count=1)
    # İmza Sentezi paragrafı (nitelik sayfası)
    html = re.sub(r'(<div class="sig-synth">[\s\S]*?)<p>[\s\S]*?</p>',
                  lambda mm: mm.group(1) + f"<p>{imza_sentezi}</p>", html, count=1)

    out_html = os.path.join(IO, "natal-rapor.out.html")
    open(out_html, "w", encoding="utf-8").write(html)
    print("ok -> natal-rapor.out.html | imza:", len(signatures), "| mizaç:", mizac_ad)

    # 5) PDF
    r = subprocess.run(["node", os.path.join(HERE, "render.mjs"), out_html], capture_output=True, text=True)
    print(r.stdout.strip())
    if r.returncode != 0:
        print("PDF render hata:", r.stderr.strip()[:500])

if __name__ == "__main__":
    main()
