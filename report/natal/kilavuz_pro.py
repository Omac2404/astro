# -*- coding: utf-8 -*-
"""
kilavuz_pro.py — Seans Kılavuzu (ana Pro raporun yanında 4-5 sayfalık mini rapor).

  python kilavuz_pro.py metin <ana.pdf> <danışan adı> <ürün adı>   -> $NATAL_IO/sayfalar.json
  python kilavuz_pro.py render                                      -> kilavuz.out.html -> kilavuz.pdf

Akış: ana rapor PDF'i -> sayfa sayfa metin (sayfa numaraları GERÇEK PDF sayfaları) ->
synthesize-kilavuz.mjs (atıflı metin) -> bu dosya (render) -> render-pro.mjs (Chrome).
"""
import os, sys, re, json, base64, subprocess
from jinja2 import Environment, FileSystemLoader
import fitz  # PyMuPDF
from render_pro import md_html, esc

HERE = os.path.dirname(os.path.abspath(__file__))
IO = os.environ.get("NATAL_IO") or HERE
REPO = os.path.dirname(os.path.dirname(HERE))
LOGO = os.path.join(REPO, "public", "gorsel", "logo-dikey.png")
ALTBILGI = re.compile(r"^gökname\s·.*$|^\d+\s*/\s*\d+$")


def metin(pdf, ad, urun_ad):
    d = fitz.open(pdf)
    sayfalar = []
    for pg in d:
        satirlar = [x.strip() for x in pg.get_text().split("\n") if x.strip() and not ALTBILGI.match(x.strip())]
        sayfalar.append("\n".join(satirlar))
    json.dump({"ad": ad, "urun_ad": urun_ad, "sayfalar": sayfalar}, open(os.path.join(IO, "sayfalar.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"ok -> sayfalar.json ({len(sayfalar)} sayfa)")


SREF = re.compile(r'<span class="paren">\(→\s*s\.\s*([0-9][0-9\s,–-]*)\)</span>|\(→\s*s\.\s*([0-9][0-9\s,–-]*)\)')


def render():
    veri = json.load(open(os.path.join(IO, "sayfalar.json"), encoding="utf-8"))
    k = json.load(open(os.path.join(IO, "kilavuz.json"), encoding="utf-8"))
    html = md_html(k["metin"])
    # sayfa atıfları -> rozet
    html = SREF.sub(lambda m: f'<span class="sref">s. {esc((m.group(1) or m.group(2)).strip())}</span>', html)
    html = html.replace("Astrolog Önerisi</span>", "Danışana söyle</span>")
    # bölümleri numaralı kartlara böl
    parcalar = re.split(r"(<h3>.*?</h3>)", html)
    bolumler, giris = [], parcalar[0]
    for i in range(1, len(parcalar), 2):
        bolumler.append({"baslik": parcalar[i][4:-5], "html": parcalar[i + 1] if i + 1 < len(parcalar) else ""})
    logo = ("data:image/png;base64," + base64.b64encode(open(LOGO, "rb").read()).decode()) if os.path.exists(LOGO) else ""
    ctx = {"ad": veri["ad"], "urun_ad": veri["urun_ad"], "ana_sayfa": len(veri["sayfalar"]), "giris": giris,
           "bolumler": bolumler, "logo": logo, "esc": esc,
           "hazirlayan": os.environ.get("PRO_HAZIRLAYAN", ""), "rapor_id": os.environ.get("PRO_RAPOR_ID", ""),
           "tarih": os.environ.get("PRO_TARIH", "")}
    env = Environment(loader=FileSystemLoader(HERE), autoescape=False)
    out = os.path.join(IO, "kilavuz.out.html")
    open(out, "w", encoding="utf-8").write(env.get_template("kilavuz.html.j2").render(**ctx))
    r = subprocess.run(["node", os.path.join(HERE, "render-pro.mjs"), out, veri["ad"], "Seans Kılavuzu", "kilavuz.pdf"],
                       capture_output=True, text=True, encoding="utf-8")
    print(r.stdout.strip())
    if r.returncode != 0:
        print("PDF render hata:", (r.stderr or "").strip()[:800])
        sys.exit(1)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    if sys.argv[1] == "metin":
        metin(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        render()
