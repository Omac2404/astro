# -*- coding: utf-8 -*-
"""
_validate.py — compute.py'ı DIŞ referans olmadan bağımsız doğrular.

A) Boylam çıkarımı doğru mu: Skyfield Güneş'i, bağımsız analitik Güneş formülüyle
   (Meeus düşük-hassasiyet, ~0.01°) karşılaştır. Tutarsa epoch='date' tropikal çıkarımı doğru.
B) ASC formülü + QUADRANT doğru mu: ascendant_deg()'i, bağımsız GEOMETRİK yükselen
   (ekliptiği tarayıp doğu ufkundaki yükselen dereceyi bulan) yöntemiyle, çok sayıda
   (enlem, sidereal zaman) örneğinde — sınır/farklı çeyrek dahil — karşılaştır.
"""
import sys, math, random
sys.stdout.reconfigure(encoding="utf-8")
from datetime import datetime
from zoneinfo import ZoneInfo
from skyfield.api import Loader
import os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import compute as C

load = Loader(os.path.join(HERE, "_ephem"))

# ---------- A) Güneş boylamı: skyfield vs analitik ----------
def analytic_sun_lon(jd_tt):
    n = jd_tt - 2451545.0
    L = (280.460 + 0.9856474 * n) % 360
    g = math.radians((357.528 + 0.9856003 * n) % 360)
    lam = L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)
    return lam % 360

eph = load("de421.bsp"); earth = eph["earth"]; ts = load.timescale()
utc = C.to_utc(1995, 8, 5, 15, 32)
t = ts.from_datetime(utc)
sky_sun = earth.at(t).observe(eph["sun"]).apparent().ecliptic_latlon(epoch="date")[1].degrees % 360
ana_sun = analytic_sun_lon(t.tt)
dsun = abs((sky_sun - ana_sun + 180) % 360 - 180)
print("=== A) GÜNEŞ boylamı (skyfield vs bağımsız analitik) ===")
print(f"  skyfield: {sky_sun:.4f}°  | analitik: {ana_sun:.4f}°  | Δ {dsun:.4f}°  -> {'OK ✓' if dsun < 0.1 else 'HATA ✗'}")
print(f"  (FAZ2 wheel_gen referansı 129.73° idi; skyfield {sky_sun:.2f}° -> referans illüstratifmiş.)")

# ---------- B) ASC: formül vs bağımsız geometrik ----------
def geometric_asc(ramc_deg, eps_deg, lat_deg):
    """Ekliptiği tarayıp ufuktaki (alt=0) noktaları bulur; doğuda YÜKSELEN olanı (sinH<0) seçer."""
    eps = math.radians(eps_deg); lat = math.radians(lat_deg); ramc = math.radians(ramc_deg)
    step = 0.05
    def altitude(lam_deg):
        l = math.radians(lam_deg % 360)
        ra = math.atan2(math.sin(l) * math.cos(eps), math.cos(l))
        dec = math.asin(math.sin(eps) * math.sin(l))
        H = ramc - ra
        return math.asin(math.sin(lat) * math.sin(dec) + math.cos(lat) * math.cos(dec) * math.cos(H))
    def is_rising(lam_deg):
        l = math.radians(lam_deg % 360)
        ra = math.atan2(math.sin(l) * math.cos(eps), math.cos(l))
        H = ramc - ra
        return math.sin(H) < 0          # doğu ufku = yükselen (zaman artınca alt artar)
    prev_alt = altitude(0.0); prev = 0.0
    lam = step
    while lam <= 360.0 + step:
        alt = altitude(lam)
        if (prev_alt < 0) != (alt < 0):                       # işaret değişimi = ufuk geçişi
            frac = (0 - prev_alt) / (alt - prev_alt)
            lam0 = (prev + frac * step) % 360
            if is_rising(lam0):
                return lam0
        prev_alt = alt; prev = lam % 360
        lam += step
    return None

random.seed(42)
print("\n=== B) ASC formül vs geometrik (quadrant testi) ===")
# Gerçek birth + sınır/çeşitli çeyrek örnekleri
gast = t.gast
ramc0 = (gast * 15 + 27.1496) % 360
eps0 = C.mean_obliquity_deg(t.tt)
cases = [("birth Konak/İzmir", ramc0, eps0, 38.4595)]
for k in range(14):
    cases.append((f"rand{k}", random.uniform(0, 360), 23.44, random.uniform(-60, 60)))
# sınıra yakın RAMC'ler (çeyrek geçişleri)
for r in (0.3, 89.7, 90.3, 179.7, 180.3, 269.7, 270.3, 359.7):
    cases.append((f"ramc~{r}", r, 23.44, 41.0))

worst = 0.0
for name, ramc, eps, lat in cases:
    f = C.ascendant_deg(ramc, eps, lat)
    g = geometric_asc(ramc, eps, lat)
    if g is None:
        print(f"  {name:20s} geometrik bulunamadı (kutup?) atlandı"); continue
    d = abs((f - g + 180) % 360 - 180)
    worst = max(worst, d)
    flag = "" if d < 0.1 else "  <-- SAPMA!"
    print(f"  {name:20s} formül {f:7.2f}°  geom {g:7.2f}°  Δ {d:.3f}°{flag}")
print(f"\n  EN KÖTÜ ASC SAPMASI: {worst:.3f}°  ->  {'QUADRANT DOĞRU ✓' if worst < 0.1 else 'QUADRANT HATASI ✗'}")
