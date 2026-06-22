#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_sr.py — Solar Return (yıl haritası) -> chart.json

Solar Return = kişinin doğum gününde Güneş'in NATAL boylamına tam döndüğü an için
kurulan harita; o doğum gününden sonraki ~1 yılın temasını anlatır.

Adımlar:
  1) Natal Güneş boylamını hesapla (doğum anı).
  2) Hedef SR yılını belirle: "içinde bulunulan SR yılı" = en son geçen doğum günü.
  3) O yıl içinde Güneş'in natal boylamına döndüğü tam anı bul (iteratif).
  4) O an + konum için chart.json üret (compute.py: compute_chart_at ortak çekirdeği).

Konum (--loc):
  dogum  (varsayılan) : SR haritası doğum yerine göre kurulur.
  guncel              : birth.json'daki sr_lat/sr_lon (kişinin o anki şehri) ile kurulur.

Çalıştır:  venv python ile  report/natal/compute_sr.py  [dogum|guncel] [SR_YIL]
"""
import os, sys, json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import compute as C  # aynı klasör; compute.py çekirdeği

HERE = os.path.dirname(os.path.abspath(__file__))
TR = ZoneInfo("Europe/Istanbul")
UTC = ZoneInfo("UTC")
SUN_DEG_PER_DAY = 0.9856473  # ortalama; iterasyonun adım katsayısı (kök bulmaya etkisi yok)


def find_sr_moment(natal_sun_lon, sr_year, mo, d, h, mi):
    """sr_year içinde Güneş'in natal_sun_lon'a döndüğü UTC anı (iteratif kök bulma)."""
    ts = C.get_timescale()
    guess = datetime(sr_year, mo, d, h, mi, tzinfo=TR).astimezone(UTC)
    delta = 99.0
    for _ in range(12):
        t = ts.from_datetime(guess)
        lon = C.planet_lon("sun", t)
        delta = (lon - natal_sun_lon + 180.0) % 360.0 - 180.0  # [-180,180]
        if abs(delta) < 1e-6:
            break
        guess = guess - timedelta(days=delta / SUN_DEG_PER_DAY)
    return guess, abs(delta)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    birth = json.load(open(os.path.join(HERE, "birth.json"), encoding="utf-8"))
    # Güncel konum verilmişse varsayılan relocated SR (bulunulan yere göre); değilse doğum yeri.
    loc_mode = sys.argv[1] if len(sys.argv) > 1 else ("guncel" if "sr_lat" in birth else "dogum")
    y, mo, d = birth["tarih"]
    h, mi = birth["saat"]

    # 1) Natal Güneş boylamı
    ts = C.get_timescale()
    natal_utc = C.to_utc_birth(birth)
    natal_sun = C.planet_lon("sun", ts.from_datetime(natal_utc))

    # 2) SR yılı: en son geçen doğum günü (içinde bulunulan SR yılı)
    if len(sys.argv) > 2:
        sr_year = int(sys.argv[2])
    else:
        now = datetime.now(TR)
        bday_this = datetime(now.year, mo, d, h, mi, tzinfo=TR)
        sr_year = now.year if bday_this <= now else now.year - 1

    # 3) SR anı
    sr_utc, residual = find_sr_moment(natal_sun, sr_year, mo, d, h, mi)
    t_sr = ts.from_datetime(sr_utc)

    # 4) Konum
    if loc_mode == "guncel":
        if "sr_lat" not in birth or "sr_lon" not in birth:
            raise SystemExit("guncel SR için birth.json'a sr_lat/sr_lon (+ sr_il/sr_ilce) ekle.")
        lat, lon_geo = float(birth["sr_lat"]), float(birth["sr_lon"])
        yer = f"{birth.get('sr_ilce', '')}, {birth.get('sr_il', '?')}".strip(", ")
    else:
        lat, lon_geo = C.geocode(birth)
        yer = f"{birth['ilce']}, {birth['il']}"

    sr_local = sr_utc.astimezone(TR)
    dogum = (f"SR {sr_year}-{sr_year + 1} · {sr_local.day} {C.AYLAR[sr_local.month - 1]} {sr_local.year}"
             f" · {sr_local.hour:02d}:{sr_local.minute:02d} · {yer}")
    chart = C.compute_chart_at(t_sr, lat, lon_geo, birth["ad"], dogum)
    birth_yer = f"{birth['ilce']}, {birth['il']}"
    chart["sr"] = {"year": sr_year, "natal_sun": round(natal_sun, 4),
                   "moment_local": sr_local.strftime("%Y-%m-%d %H:%M"), "loc_mode": loc_mode,
                   "yer": yer, "birth_yer": birth_yer, "relocated": (loc_mode == "guncel")}

    # 2-harita sayfası + karşılaştırma için natal haritayı da üret
    natal_chart = C.compute_chart(birth)
    json.dump(natal_chart, open(os.path.join(HERE, "chart-natal.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    json.dump(chart, open(os.path.join(HERE, "chart.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # --- Doğrulama çıktısı ---
    sr_sun = next(p for p in chart["planets"] if p["id"] == "gunes")
    print("ok -> chart.json (Solar Return)")
    print(f"Konum modu : {loc_mode} ({yer})")
    print(f"SR yılı    : {sr_year}-{sr_year + 1}")
    print(f"SR anı     : {dogum}")
    print(f"Natal Güneş: {natal_sun:.4f}°  |  SR Güneş: {sr_sun['lon']:.4f}° ({sr_sun['sign']} {sr_sun['deg']})  |  fark: {residual:.2e}°")
    print(f"SR Yükselen: {chart['asc']['sign']} {chart['asc']['deg']}")
    print(f"mizaç: {chart['mizac']['ad']} | dolu evler: {chart['occupied_houses']}")
    if residual > 1e-4:
        print("⚠️  SR Güneş natal'a tam oturmadı — iterasyonu kontrol et.")


if __name__ == "__main__":
    main()
