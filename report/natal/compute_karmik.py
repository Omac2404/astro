#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_karmik.py — Lilith & Karmik (Motor 2) -> chart.json

Natal haritayı (compute.py) hesaplar, üstüne karmik noktaları (Lilith, Kuzey/Güney
Düğüm, Kiron — karmik.py) ekler: chart["karmik"]. Böylece selectBlocks hem Motor-1
natal bloklarını hem LILITH_/KUZEY_/CHIRON_ karmik bloklarını seçer; rapor natal
zenginliği + karmik katmanı taşır.

Çalıştır:  venv python ile  report/natal/compute_karmik.py
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import compute as C
import karmik as K

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    birth = json.load(open(os.path.join(HERE, "birth.json"), encoding="utf-8"))
    chart = C.compute_chart(birth)  # natal

    y, mo, d = birth["tarih"]
    h, mi = birth["saat"]
    utc = C.to_utc_birth(birth)
    t = C.get_timescale().from_datetime(utc)
    asc_si = chart["asc"]["sign_idx"]

    # Kiron UTC bileşenleriyle (karmik.chiron_lon str2et'i UTC sayar)
    chart["karmik"] = K.karmik_points(t, utc.year, utc.month, utc.day, utc.hour, utc.minute, asc_si)

    json.dump(chart, open(os.path.join(HERE, "chart.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    print("ok -> chart.json (natal + karmik)")
    print(f"KİŞİ: {chart['meta']['ad']} — {chart['meta']['dogum']}")
    print(f"Yükselen: {chart['asc']['sign']} {chart['asc']['deg']}")
    for p in chart["karmik"]:
        print(f"  {p['ad']:14s} {p['sign']:8s} {p['deg']}  ·  {p['house']:2d}. ev")


if __name__ == "__main__":
    main()
