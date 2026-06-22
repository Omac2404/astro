#!/usr/bin/env python3
"""
Yildizname natal rapor — build helper.

Ne yapar:
  1) wheel_gen.py ve diagram_gen.py'yi calistirir  -> wheel.svg, diagram.svg
  2) Uretilen SVG'leri natal-rapor-sablon2.html icine INLINE gomer
  3) weasyprint ile out.pdf uretir (kuruluysa)

Kullanim:
  python3 build.py

NOT: Sadece CSS/HTML tasarim tweak'i yapacaksan build'e gerek yok; dogrudan
HTML'i duzenle. build.py yalnizca cark/diyagram VERISI veya uretici scriptler
degisince gerekir (SVG'ler HTML'e inline gomulu oldugu icin yeniden gommek lazim).
"""
import re, subprocess, sys, pathlib

HTML = "natal-rapor-sablon2.html"


def run(script):
    print(f"-> calistiriliyor: {script}")
    subprocess.run([sys.executable, script], check=True)


def embed_svg_in_tag(html, svg, wrapper_open, wrapper_close):
    """<div class="diagram">...</div> gibi bir sarmalin ICINI svg ile degistir."""
    pat = re.escape(wrapper_open) + r".*?" + re.escape(wrapper_close)
    return re.sub(pat, lambda m: wrapper_open + svg + wrapper_close, html, count=1, flags=re.S)


def main():
    run("wheel_gen.py")
    run("diagram_gen.py")

    html = pathlib.Path(HTML).read_text(encoding="utf-8")

    # --- Cark: <svg class="chart-wheel" ...> ... </svg> ---
    wheel = pathlib.Path("wheel.svg").read_text(encoding="utf-8")
    if 'class="chart-wheel"' not in wheel:
        wheel = wheel.replace("<svg ", '<svg class="chart-wheel" ', 1)
    html = re.sub(r'<svg class="chart-wheel".*?</svg>', lambda m: wheel, html, count=1, flags=re.S)

    # --- Diyagram: <div class="diagram"> <svg...> </div> ---
    diagram = pathlib.Path("diagram.svg").read_text(encoding="utf-8")
    html = embed_svg_in_tag(html, diagram, '<div class="diagram">', "</div>")

    pathlib.Path(HTML).write_text(html, encoding="utf-8")
    print("ok: SVG'ler HTML'e gomuldu")

    try:
        subprocess.run(["weasyprint", HTML, "out.pdf"], check=True)
        print("ok: out.pdf uretildi")
    except FileNotFoundError:
        print("! weasyprint bulunamadi -> 'pip install weasyprint' (PDF atlandi, HTML hazir)")
    except subprocess.CalledProcessError as e:
        print(f"! weasyprint hata verdi: {e} (HTML yine de hazir)")


if __name__ == "__main__":
    main()
