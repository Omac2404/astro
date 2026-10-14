# -*- coding: utf-8 -*-
"""
render_pro.py — chart-pro.json + rapor-pro.json -> pro-rapor.out.html -> pro.pdf (headless Chrome)

Astrolog Pro raporu: açık zeminli, yazdırılabilir çalışma dosyası. Akan sayfalar (Chrome sayfa
bölmesi) + her ana bölüm yeni sayfada. Tüm astro sembolleri vektör path (pro_svg.gsvg).
Çalıştır: python render_pro.py   (NATAL_IO = iş klasörü)
"""
import os, sys, re, json, base64, html, subprocess
from jinja2 import Environment, FileSystemLoader
import pro_svg as G

HERE = os.path.dirname(os.path.abspath(__file__))
IO = os.environ.get("NATAL_IO") or HERE
REPO = os.path.dirname(os.path.dirname(HERE))
LOGO = os.path.join(REPO, "public", "gorsel", "logo-dikey.png")

PT_CODE = {"kuzey": 0x260A, "guney": 0x260B, "lilith": 0x26B8, "chiron": 0x26B7, "sans": 0x2297}
DIG_CLS = {"yönetim": "dg-pos", "yücelim": "dg-pos", "zarar": "dg-neg", "düşüş": "dg-neg", "nötr": ""}
UYUM_CLS = {"uyumlu": "u-pos", "gergin": "u-neg", "nötr": "u-neu", "ayar": "u-adj"}
SIGNS = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"]


def esc(s):
    return html.escape(str(s if s is not None else ""), quote=False)


def paren(s):
    return re.sub(r"\(([^()]+)\)", r'<span class="paren">(\1)</span>', s)


def inline(s):
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = s.replace("*", "")
    return paren(s)


def oneri_html(ic):
    """'Astrolog Önerisi' etiketli kutu: astroloğun danışana doğrudan söyleyebileceği cümle(ler)."""
    return f'<div class="oneri"><span class="oneri-lab">Astrolog Önerisi</span><p>{ic}</p></div>'


def veri_yorumlari(metin):
    """'veri' bölümünü '### anahtar' başlıklarına göre ayırır -> {anahtar: kutu html}."""
    out, cur, buf = {}, None, []
    for line in (metin or "").split("\n"):
        m = re.match(r"^#{2,4}\s*([a-zçğıöşü]+)\s*$", line.strip().lower())
        if m:
            if cur and " ".join(buf).strip():
                out[cur] = oneri_html(inline(" ".join(buf).strip().lstrip("> ")))
            cur, buf = m.group(1), []
        elif cur is not None and line.strip():
            buf.append(line.strip())
    if cur and " ".join(buf).strip():
        out[cur] = oneri_html(inline(" ".join(buf).strip().lstrip("> ")))
    return out


def md_html(t):
    """Sentez metninin kısıtlı markdown'unu (###, -, >, **) güvenli HTML'e çevirir."""
    out, para, ul = [], [], []

    def flush_p():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()

    def flush_ul():
        if ul:
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in ul) + "</ul>")
            ul.clear()

    for raw in (t or "").split("\n"):
        line = raw.rstrip()
        s = line.strip()
        if not s:
            flush_p(); flush_ul(); continue
        if re.match(r"^#{3,6}\s+", s):
            flush_p(); flush_ul()
            out.append("<h3>" + inline(re.sub(r"^#{3,6}\s+", "", s)) + "</h3>"); continue
        if re.match(r"^#{1,2}\s+", s):  # model yine de ana başlık yazdıysa alt başlığa indir
            flush_p(); flush_ul()
            out.append("<h3>" + inline(re.sub(r"^#{1,2}\s+", "", s)) + "</h3>"); continue
        if s.startswith(">"):
            flush_p(); flush_ul()
            out.append(oneri_html(inline(s.lstrip("> ").strip()))); continue
        m = re.match(r"^(?:[-*•]|\d+[.)])\s+(.*)$", s)
        if m:
            flush_p(); ul.append(m.group(1)); continue
        if re.match(r"^-{3,}$", s):
            continue
        flush_ul(); para.append(s)
    flush_p(); flush_ul()
    return "\n".join(out)


def planet_cell(code, ad, color=G.INK):
    return f'<span class="pl">{G.gsvg(code, 14, color)}<span>{esc(ad)}</span></span>'


def sign_cell(si, deg=None):
    return f'<span class="sg">{G.sign_svg(si, 13)}<span>{esc(SIGNS[si])}{(" " + esc(deg)) if deg else ""}</span></span>'


def build_tables(ch):
    P = ch["planets"]
    # --- pozisyon tablosu
    rows = []
    for p in P:
        rows.append(
            f'<tr><td>{planet_cell(p["glyph"], p["ad"])}</td><td>{sign_cell(p["sign_idx"])}</td>'
            f'<td class="num">{esc(p["deg"])}</td><td class="num">{p["house"]}</td>'
            f'<td class="{DIG_CLS.get(p["dignity"], "")}">{esc(p["dignity"])}</td>'
            f'<td class="c">{"R" if p["retro"] else ""}</td><td class="num">{p["hiz"]:+.3f}°</td>'
            f'<td class="small">{esc(p["element"])} · {esc(p["modality"])}</td></tr>')
    for q in ch["points"]:
        code = PT_CODE.get(q["id"])
        ic = planet_cell(code, q["ad"], G.VIOLET) if code else f'<span class="pl"><b class="ang">{"AC" if q["id"] == "asc" else ("MC" if q["id"] == "mc" else ("DC" if q["id"] == "dsc" else "IC"))}</b><span>{esc(q["ad"])}</span></span>'
        rows.append(
            f'<tr class="pt-row"><td>{ic}</td><td>{sign_cell(q["sign_idx"])}</td><td class="num">{esc(q["deg"])}</td>'
            f'<td class="num">{q["house"]}</td><td colspan="4" class="small">{"saate bağlı" if q["zamana_bagli"] else ""}</td></tr>')
    pos = ('<table class="tbl"><thead><tr><th>Gezegen / Nokta</th><th>Burç</th><th>Derece</th><th>Ev</th>'
           '<th>Öz-onur</th><th>R</th><th>Hız/gün</th><th>Element · Nitelik</th></tr></thead><tbody>'
           + "".join(rows) + "</tbody></table>")

    # --- ev tablosu
    hr = []
    for h in ch["houses"]:
        si = SIGNS.index(h["sign"])
        yon = esc(h["yonetici"]) + f' → {h["yonetici_ev"]}. ev'
        if h["modern_yonetici"]:
            yon += f'<br><span class="small">modern: {esc(h["modern_yonetici"])} → {h["modern_yonetici_ev"]}. ev</span>'
        ic = ", ".join(esc(x) for x in h["icindekiler"]) or '<span class="muted">boş</span>'
        hr.append(f'<tr><td class="num"><b>{h["n"]}</b></td><td>{sign_cell(si)}</td><td class="small">{esc(h["konu"])}</td>'
                  f'<td>{yon}</td><td>{ic}</td></tr>')
    evler = ('<table class="tbl"><thead><tr><th>Ev</th><th>Burç</th><th>Yaşam alanı</th><th>Yönetici → konumu</th>'
             '<th>İçindekiler</th></tr></thead><tbody>' + "".join(hr) + "</tbody></table>")

    # --- açı ızgarası (üçgen)
    ids = [p["id"] for p in P] + ["asc", "mc", "kuzey"] + (["chiron"] if any(q["id"] == "chiron" for q in ch["points"]) else [])
    lab = {p["id"]: G.gsvg(p["glyph"], 13) for p in P}
    lab.update({"asc": '<b class="ang">AC</b>', "mc": '<b class="ang">MC</b>',
                "kuzey": G.gsvg(0x260A, 13, G.VIOLET), "chiron": G.gsvg(0x26B7, 13, G.VIOLET)})
    amap = {}
    for a in ch["aspects"]:
        amap[(a["a"], a["b"])] = a
        amap[(a["b"], a["a"])] = a
    gr = ['<table class="grid"><tbody>']
    for i, r in enumerate(ids):
        cells = []
        for j in range(i):
            a = amap.get((r, ids[j]))
            if a:
                cells.append(f'<td class="gc">{G.asp_svg(a["type"], 12)}<span class="orb">{a["orb"]:.0f}{"a" if a["yaklasan"] else "s"}</span></td>')
            else:
                cells.append('<td class="gc"></td>')
        gr.append(f'<tr>{"".join(cells)}<td class="gh">{lab[r]}</td></tr>')
    gr.append("</tbody></table>")
    grid = "".join(gr)

    # --- açı listesi
    al = []
    for a in ch["aspects"]:
        al.append(f'<tr class="{"" if a["majör"] else "minor"}"><td>{esc(a["a_ad"])}</td><td class="c">{G.asp_svg(a["type"], 12)}</td>'
                  f'<td>{esc(a["ad"])}</td><td>{esc(a["b_ad"])}</td><td class="num">{a["orb"]:.2f}°</td>'
                  f'<td class="small">{"yaklaşan" if a["yaklasan"] else "ayrılan"}</td><td class="{UYUM_CLS.get(a["uyum"], "")}">{esc(a["uyum"])}</td></tr>')
    acilar = ('<table class="tbl compact"><thead><tr><th>Gezegen</th><th></th><th>Açı</th><th>Gezegen</th><th>Orb</th>'
              '<th>Faz</th><th>Nitelik</th></tr></thead><tbody>' + "".join(al) + "</tbody></table>")
    return pos, evler, grid, acilar


def bar_rows(d, colors=None, mx=None):
    mx = mx or max(d.values()) or 1
    out = []
    for k, v in d.items():
        col = (colors or {}).get(k.split(" ")[0], G.GOLDL)
        out.append(f'<div class="bar"><span class="bl">{esc(k)}</span><span class="bt"><span class="bf" style="width:{100 * v / mx:.0f}%;background:{col}"></span></span><span class="bv">{v}</span></div>')
    return "".join(out)


def guc_rows(guc):
    mx = max(abs(g["puan"]) for g in guc) or 1
    out = []
    for g in guc:
        w = 50 * abs(g["puan"]) / mx
        if g["puan"] >= 0:
            bar = f'<span class="gpos" style="left:50%;width:{w:.0f}%"></span>'
        else:
            bar = f'<span class="gneg" style="left:{50 - w:.0f}%;width:{w:.0f}%"></span>'
        out.append(f'<div class="gbar"><span class="bl">{esc(g["ad"])}</span><span class="gt">{bar}<span class="gmid"></span></span>'
                   f'<span class="bv">{g["puan"]:+d}</span><span class="gs small">{esc(g["dignity"])}, {g["house"]}. ev</span></div>')
    return "".join(out)


URUN_AD = {
    "natal": ("Natal Pro Rapor", "derinlemesine doğum haritası analizi · zamanlama · seans rehberi"),
    "ask": ("Aşk & İlişki Pro Rapor", "sevgi dili · bağlanma · ilişki evleri · ilişki zamanlaması · seans rehberi"),
    "kariyer": ("Kariyer & Para Pro Rapor", "mesleki kimlik · MC zinciri · para · uygun alanlar · zamanlama · seans rehberi"),
    "saglik": ("Enerji & Mizaç Pro Rapor", "mizaç · canlılık · stres kalıpları · yaşam ritmi · zamanlama · seans rehberi"),
    "lilith": ("Lilith & Karmik Pro Rapor", "ay düğümleri · Lilith · Kiron · karmik sınavlar · zamanlama · seans rehberi"),
}
ODAK_BASLIK = {
    "ask": ("İlişki Göstergeleri", "İlişki evleri, yöneticileri ve ilişkiyi belirleyen noktalar"),
    "kariyer": ("Kariyer ve Para Göstergeleri", "Kariyer, iş ve para evleri; MC zinciri ve meslek göstergeleri"),
    "saglik": ("Enerji ve Mizaç Göstergeleri", "Canlılık evleri, mizaç ve enerji gezegenleri"),
    "lilith": ("Karmik Göstergeler", "Ay Düğümleri, Lilith, Kiron ve karmik evler"),
}
# Natal Pro'nun derin yorum sırası; diğer ürünlerde rapor-pro.json sırası kullanılır
OZEL = {"seans", "ozet", "sorular", "zaman", "olaylar", "veri"}


def odak_html(ch):
    """Ürüne özel odak veri sayfası (natal'de boş)."""
    o = ch.get("odak") or {}
    urun = ch.get("urun", "natal")
    if urun == "natal" or not o:
        return ""
    P = {p["id"]: p for p in ch["planets"]}
    Q = {q["id"]: q for q in ch["points"]}
    out = []
    # odak noktaları tablosu
    rows = []
    for nid in o.get("noktalar", []):
        x = P.get(nid) or Q.get(nid)
        if not x:
            continue
        code = x.get("glyph") if nid in P else PT_CODE.get(nid)
        ad_html = planet_cell(code, x["ad"], G.INK if nid in P else G.VIOLET) if code else f'<span class="pl"><b class="ang">{ {"asc": "AC", "mc": "MC", "dsc": "DC", "ic": "IC"}.get(nid, "") }</b><span>{esc(x["ad"])}</span></span>'
        dig = x.get("dignity", "")
        rows.append(f'<tr><td>{ad_html}</td><td>{sign_cell(x["sign_idx"], x["deg"])}</td><td class="num">{x["house"]}</td>'
                    f'<td class="{DIG_CLS.get(dig, "")}">{esc(dig) if dig else ""}{" · R" if x.get("retro") else ""}</td></tr>')
    out.append('<h2 class="sub" style="margin-top:0">Odak Noktaları</h2>'
               '<table class="tbl compact"><thead><tr><th>Nokta</th><th>Konum</th><th>Ev</th><th>Durum</th></tr></thead><tbody>'
               + "".join(rows) + "</tbody></table>")
    # odak evleri
    hr = []
    for h in o.get("evler", []):
        si = SIGNS.index(h["sign"])
        hr.append(f'<tr><td class="num"><b>{h["n"]}</b></td><td>{sign_cell(si)}</td><td class="small">{esc(h["konu"])}</td>'
                  f'<td>{esc(h["yonetici"])} → {h["yonetici_ev"]}. ev <span class="small">({esc(h["yonetici_burc"])})</span></td>'
                  f'<td>{", ".join(esc(x) for x in h["icindekiler"]) or "<span class=muted>boş</span>"}</td></tr>')
    if hr:
        out.append('<h2 class="sub">Odak Evleri</h2><table class="tbl compact"><thead><tr><th>Ev</th><th>Burç</th><th>Yaşam alanı</th>'
                   '<th>Yönetici → konumu</th><th>İçindekiler</th></tr></thead><tbody>' + "".join(hr) + "</tbody></table>")
    # mizaç (Enerji & Mizaç)
    if urun == "saglik" and ch.get("mizac"):
        mz = ch["mizac"]
        out.append(f'<div class="box"><b>Klasik mizaç:</b> {esc(mz["ad"])} <span class="small">({esc(mz["tabiat"])})</span> · '
                   f'element sayımı (7 gezegen + Yükselen): ' + ", ".join(f'{esc(k)} {v}' for k, v in mz["element8"].items()) + '</div>')
    # karmik noktalar (Lilith & Karmik)
    if o.get("karmik"):
        kr = []
        for k in o["karmik"]:
            tm = "; ".join(f'{esc(t["ad"])} {esc(t["aci"])} ({t["orb"]}°)' for t in k["temaslar"][:5]) or '<span class="muted">belirgin temas yok</span>'
            kr.append(f'<tr><td>{planet_cell(PT_CODE.get(k["id"]), k["ad"], G.VIOLET)}</td><td>{sign_cell(k["sign_idx"], k["deg"])}</td>'
                      f'<td class="num">{k["house"]}</td><td>{esc(k["yonetici"])} → {k["yonetici_ev"]}. ev</td><td class="small">{tm}</td></tr>')
        out.append('<h2 class="sub">Karmik Noktalar ve Temasları</h2><table class="tbl compact"><thead><tr><th>Nokta</th><th>Konum</th>'
                   '<th>Ev</th><th>Burç yöneticisi</th><th>Gezegen temasları</th></tr></thead><tbody>' + "".join(kr) + "</tbody></table>")
    # odak açıları
    al = []
    for a in o.get("acilar", [])[:16]:
        al.append(f'<tr class="{"" if a["majör"] else "minor"}"><td>{esc(a["a_ad"])}</td><td class="c">{G.asp_svg(a["type"], 12)}</td>'
                  f'<td>{esc(a["ad"])}</td><td>{esc(a["b_ad"])}</td><td class="num">{a["orb"]:.2f}°</td>'
                  f'<td class="{UYUM_CLS.get(a["uyum"], "")}">{esc(a["uyum"])}</td></tr>')
    if al:
        out.append('<h2 class="sub">Odak Açıları</h2><table class="tbl compact"><thead><tr><th>Gezegen</th><th></th><th>Açı</th>'
                   '<th>Gezegen</th><th>Orb</th><th>Nitelik</th></tr></thead><tbody>' + "".join(al) + "</tbody></table>")
    return "".join(out)


def transit_table(tr):
    rows = []
    for e in tr["olaylar"]:
        tam = ", ".join(e["tam"]) if e["tam"] else '<span class="muted">dönem dışında</span>'
        rows.append(f'<tr><td>{esc(e["transit"])}</td><td class="c">{G.asp_svg(e["tip"], 12)}</td><td>{esc(e["natal"])}</td>'
                    f'<td class="small">{esc(e["baslangic_tr"])} – {esc(e["bitis_tr"])}</td><td class="small">{tam}</td>'
                    f'<td class="{UYUM_CLS.get(e["uyum"], "")}">{esc(e["uyum"])}</td></tr>')
    return ('<table class="tbl compact"><thead><tr><th>Transit</th><th></th><th>Natal</th><th>Etki penceresi (≤1,5°)</th>'
            '<th>Tam isabet</th><th>Nitelik</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ch = json.load(open(os.path.join(IO, "chart-pro.json"), encoding="utf-8"))
    rp = json.load(open(os.path.join(IO, "rapor-pro.json"), encoding="utf-8"))
    sec = {s["key"]: {"baslik": s["baslik"], "html": md_html(s["metin"])} for s in rp["sections"] if s["key"] != "veri"}
    vy = veri_yorumlari(next((s["metin"] for s in rp["sections"] if s["key"] == "veri"), ""))

    pos, evler, grid, acilar = build_tables(ch)
    urun = ch.get("urun", "natal")
    urun_ad, urun_alt = URUN_AD.get(urun, URUN_AD["natal"])
    yorum_keys = [s["key"] for s in rp["sections"] if s["key"] not in OZEL]
    D = ch["denge"]
    el_col = {"Ateş": G.EL_COL["Ateş"], "Toprak": G.EL_COL["Toprak"], "Hava": G.EL_COL["Hava"], "Su": G.EL_COL["Su"]}
    tr = ch["transitler"]
    pr = ch["progresyon"]
    sr = ch["solar_return"]

    prog_rows = "".join(
        f'<tr><td>Progresif {esc(pr[k]["ad"])}</td><td>{sign_cell(SIGNS.index(pr[k]["sign"]), pr[k]["deg"])}</td><td class="num">{pr[k]["natal_ev"]}</td></tr>'
        for k in ("gunes", "ay", "merkur", "venus", "mars"))
    prog_rows += "".join(
        f'<tr><td>{esc(pr[k]["ad"])}</td><td>{sign_cell(SIGNS.index(pr[k]["sign"]), pr[k]["deg"])}</td><td class="num">–</td></tr>'
        for k in ("sa_mc", "sa_asc"))
    sr_rows = ""
    if sr:
        sr_rows = "".join(f'<tr><td>{esc(g["ad"])}</td><td>{sign_cell(SIGNS.index(g["sign"]), g["deg"])}</td><td class="num">{g["house"]}</td></tr>'
                          for g in sr["gezegenler"])

    dn = ch.get("danisan") or {}
    logo = ("data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()) if os.path.exists(LOGO) else ""
    ctx = {
        "m": ch["meta"], "dn": dn, "ch": ch, "sec": sec, "logo": logo,
        "wheel": G.wheel(ch), "hemi": G.hemisphere(ch["planets"], ch["asc"]["sign_idx"]),
        "timeline": G.timeline(tr) if tr["olaylar"] else "",
        "pos_table": pos, "house_table": evler, "asp_grid": grid, "asp_table": acilar,
        "el_bars": bar_rows(D["element"], el_col, 12), "md_bars": bar_rows(D["nitelik"], None, 12),
        "kutup_bars": bar_rows(D["kutup"], None, 12), "guc": guc_rows(ch["guc"]),
        "transit_table": transit_table(tr), "prog_rows": prog_rows, "sr_rows": sr_rows,
        "olaylar": ch["olaylar"], "sr": sr, "pr": pr, "tr": tr,
        "esc": esc, "sign_cell": sign_cell, "SIGNS": SIGNS, "asp_svg": G.asp_svg,
        "rapor_id": os.environ.get("PRO_RAPOR_ID", ""), "hazirlayan": os.environ.get("PRO_HAZIRLAYAN", ""),
        "model": rp.get("model", ""),
        "vy": vy,
        "urun": urun, "urun_ad": urun_ad, "urun_alt": urun_alt, "yorum_keys": yorum_keys,
        "odak_html": odak_html(ch), "odak_baslik": ODAK_BASLIK.get(urun, ("", "")),
        "goster_yapi": urun in ("natal", "saglik"),
    }
    env = Environment(loader=FileSystemLoader(HERE), autoescape=False)
    out_html = os.path.join(IO, "pro-rapor.out.html")
    open(out_html, "w", encoding="utf-8").write(env.get_template("pro-rapor.html.j2").render(**ctx))
    print("ok -> pro-rapor.out.html")
    footer_ad = ch["meta"]["ad"]
    r = subprocess.run(["node", os.path.join(HERE, "render-pro.mjs"), out_html, footer_ad, urun_ad], capture_output=True, text=True, encoding="utf-8")
    print(r.stdout.strip())
    if r.returncode != 0:
        print("PDF render hata:", (r.stderr or "").strip()[:800])
        sys.exit(1)


if __name__ == "__main__":
    main()
