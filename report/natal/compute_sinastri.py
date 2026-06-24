#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_sinastri.py — iki doğum verisi -> chart.json (Motor 3: Sinastri / çift uyum)

İki kişinin natal haritasını compute.py çekirdeğiyle hesaplar, sonra ARALARINDAKİ
ilişkiyi çıkarır:
  - synastry_aspects: A'nın 8 noktası (7 gezegen + Yükselen) × B'nin 8 noktası çapraz açılar
  - overlays_ab / overlays_ba: A'nın gezegenleri B'nin (Whole Sign) evlerine düşüşü ve tersi

Açı tablosu + orblar compute.ASPECTS ile aynı (tutarlılık). Açılar uyum sınıfına ayrılır:
  uyumlu = üçgen/altmışlık, zorlu = kare/karşıtlık, notr = kavuşum (bağlama göre).

Girdi: report/natal/birth-a.json + birth-b.json (her biri compute.birth şemasında).
       Yoksa iki referans kişi (Ayşe + Mehmet) kullanılır.
Çıktı: report/natal/chart.json  (tip="sinastri")
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from compute import compute_chart, ASPECTS, AYLAR  # tek-harita çekirdeği + açı tablosu

# Çapraz açı için noktalar: 7 gezegen + Yükselen, okunur etiketlerle
def _node_lons(chart):
    """chart -> {id: (lon, ad)}  (7 gezegen + yukselen)"""
    out = {}
    for p in chart["planets"]:
        out[p["id"]] = (p["lon"], p["ad"])
    out["yukselen"] = (chart["asc"]["lon"], "Yükselen")
    return out

# Açı uyum sınıfı
UYUM = {
    "kavusum":   "notr",
    "altmislik": "uyumlu",
    "ucgen":     "uyumlu",
    "kare":      "zorlu",
    "karsitlik": "zorlu",
}

def cross_aspects(chart_a, chart_b):
    """A'nın her noktası × B'nin her noktası çapraz açılar (orb sırasına göre)."""
    na, nb = _node_lons(chart_a), _node_lons(chart_b)
    out = []
    for ida, (la, ada) in na.items():
        for idb, (lb, adb) in nb.items():
            diff = abs(la - lb) % 360.0
            if diff > 180:
                diff = 360 - diff
            for typ, exact, orb, color in ASPECTS:
                if abs(diff - exact) <= orb:
                    out.append({
                        "a": ida, "a_ad": ada,        # A kişisinin noktası
                        "b": idb, "b_ad": adb,        # B kişisinin noktası
                        "type": typ, "color": color,
                        "uyum": UYUM[typ],
                        "orb": round(abs(diff - exact), 2),
                    })
                    break
    # Önce uyum sınıfı (uyumlu/zorlu önde), sonra en sıkı orb
    sinif = {"uyumlu": 0, "zorlu": 0, "notr": 1}
    out.sort(key=lambda x: (sinif[x["uyum"]], x["orb"]))
    return out

def overlays(planets_src, asc_idx_dest, src_ad, dest_ad):
    """src kişisinin gezegenleri, dest kişisinin Whole Sign evlerine nasıl düşüyor."""
    out = []
    for p in planets_src:
        house = ((p["sign_idx"] - asc_idx_dest) % 12) + 1
        out.append({
            "planet": p["id"], "ad": p["ad"], "sign": p["sign"], "deg": p["deg"],
            "house": house, "src": src_ad, "dest": dest_ad,
        })
    return out

def compute_synastry(birth_a, birth_b):
    ca = compute_chart(birth_a)
    cb = compute_chart(birth_b)
    asp = cross_aspects(ca, cb)
    ov_ab = overlays(ca["planets"], cb["asc"]["sign_idx"], ca["meta"]["ad"], cb["meta"]["ad"])
    ov_ba = overlays(cb["planets"], ca["asc"]["sign_idx"], cb["meta"]["ad"], ca["meta"]["ad"])
    return {
        "tip": "sinastri",
        "meta": {
            "ad": f"{ca['meta']['ad']} & {cb['meta']['ad']}",
            "ad_a": ca["meta"]["ad"], "ad_b": cb["meta"]["ad"],
            "dogum_a": ca["meta"]["dogum"], "dogum_b": cb["meta"]["dogum"],
        },
        "person_a": ca,
        "person_b": cb,
        "synastry_aspects": asp,
        "overlays_ab": ov_ab,   # A'nın gezegenleri B'nin evlerinde
        "overlays_ba": ov_ba,   # B'nin gezegenleri A'nın evlerinde
    }

# İki referans kişi (birth-a/b.json yoksa). İllüstratif; gerçek doğrulama gerçek veriyle.
REF_A = {"ad": "Ayşe", "tarih": [1995, 8, 5], "saat": [15, 32],
         "il": "İzmir", "ilce": "Konak", "lat": 38.4595, "lon": 27.1496}
REF_B = {"ad": "Mehmet", "tarih": [1992, 3, 18], "saat": [9, 10],
         "il": "İstanbul", "ilce": "Kadıköy", "lat": 40.9904, "lon": 29.0270}

def _load(name, fallback):
    p = os.path.join(HERE, name)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return fallback

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    birth_a = _load("birth-a.json", REF_A)
    birth_b = _load("birth-b.json", REF_B)
    chart = compute_synastry(birth_a, birth_b)
    out = os.path.join(HERE, "chart.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(chart, f, ensure_ascii=False, indent=2)
    print("ok -> chart.json (sinastri)")

    a, b = chart["person_a"], chart["person_b"]
    print(f"\nÇİFT: {chart['meta']['ad']}")
    print(f"  A · {a['meta']['ad']:8s} — Yük {a['asc']['sign']}, Güneş {a['planets'][0]['sign']}, Ay {a['planets'][1]['sign']}")
    print(f"  B · {b['meta']['ad']:8s} — Yük {b['asc']['sign']}, Güneş {b['planets'][0]['sign']}, Ay {b['planets'][1]['sign']}")
    print(f"\nÇAPRAZ AÇILAR ({len(chart['synastry_aspects'])} adet, en güçlüden):")
    for x in chart["synastry_aspects"][:14]:
        print(f"  {x['a_ad']:9s}(A) {x['type']:9s} {x['b_ad']:9s}(B)  [{x['uyum']:7s} · {x['orb']:.2f}°]")
    print(f"\n{a['meta']['ad']}'nın gezegenleri {b['meta']['ad']}'in evlerinde:")
    for o in chart["overlays_ab"]:
        print(f"  {o['ad']:8s} -> {o['house']:2d}. ev")

if __name__ == "__main__":
    main()
