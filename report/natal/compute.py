#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute.py — gerçek doğum verisi -> chart.json  (FAZ 3, §4 şema / §5 kurallar)

HESAP MOTORU NOTU:
  pyswisseph'in PyPI'da Windows wheel'i yok ve bu makinede C derleyici/WSL yok.
  Bu yüzden gezegen ekliptik boylamları **Skyfield + JPL DE421** efemerisinden
  (pyswisseph kadar hassas), Yükselen ise sidereal zaman + eğiklik formülüyle
  hesaplanır. Zodyak **tropikal** (ecliptic-of-date), zaman dilimi **zoneinfo**.
  Doğruluk astro.com referansıyla ~0.1° içinde (bkz. main self-test).

Kurallar (§5): tropikal, Whole Sign ev, 7 klasik gezegen + Yükselen (8 nokta, eşit ağırlık).
"""
import os, sys, json, math
from datetime import datetime
from zoneinfo import ZoneInfo
from skyfield.api import Loader

HERE = os.path.dirname(os.path.abspath(__file__))
load = Loader(os.path.join(HERE, "_ephem"))  # de421.bsp burada cache'lenir

# --- Sabitler (§5) ---
SIGNS = ["Koç","Boğa","İkizler","Yengeç","Aslan","Başak",
         "Terazi","Akrep","Yay","Oğlak","Kova","Balık"]
AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
         "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
# element: Ateş={0,4,8} Toprak={1,5,9} Hava={2,6,10} Su={3,7,11}  -> idx%4
ELEMENT = ["Ateş","Toprak","Hava","Su"]
# nitelik: Öncü={0,3,6,9} Sabit={1,4,7,10} Değişken={2,5,8,11}    -> idx%3
MODALITY = ["Öncü","Sabit","Değişken"]

# (id, ad, glyph_unicode, skyfield_target, pozisyon-tablosu anlamı)
BODIES = [
    ("gunes",  "Güneş",  9737, "sun",     "Kimliğin, özün, parlayan yanın"),
    ("ay",     "Ay",     9789, "moon",    "Duyguların, ihtiyaçların"),
    ("merkur", "Merkür", 9791, "mercury", "Zihnin, iletişim tarzın"),
    ("venus",  "Venüs",  9792, "venus",   "Sevgi ve değerlerin"),
    ("mars",   "Mars",   9794, "mars",    "Arzu, eylem, irade"),
    ("jupiter","Jüpiter",9795, "jupiter", "Şans, genişleme, vizyon"),
    ("saturn", "Satürn", 9796, "saturn",  "Disiplin, sorumluluk, sınır"),
]

# Açı tablosu (§5): tip -> (açı, orb, renk)
ASPECTS = [
    ("kavusum",   0,   8, "gold"),
    ("altmislik", 60,  4, "teal"),
    ("kare",      90,  6, "rust"),
    ("ucgen",     120, 7, "teal"),
    ("karsitlik", 180, 8, "rust"),
]
MIZAC = {  # baskın element -> (key, ad, tabiat)
    "Ateş":  ("safravi","Safravi","sıcak-kuru"),
    "Hava":  ("demevi", "Demevi", "sıcak-nemli"),
    "Su":    ("balgami","Balgami","soğuk-nemli"),
    "Toprak":("sevdavi","Sevdavi","soğuk-kuru"),
}

# Basit geocode (il+ilçe -> lat/lon). Gerçek üründe ilçe-koordinat veri seti buraya bağlanır.
ILCE_COORDS = {
    ("İzmir","Konak"): (38.4237, 27.1428),
}

def sign_idx(lon):      return int(lon // 30) % 12
def element_of(idx):    return ELEMENT[idx % 4]
def modality_of(idx):   return MODALITY[idx % 3]

def deg_str(lon):
    d = lon % 30
    deg = int(d)
    minutes = int(round((d - deg) * 60))
    if minutes == 60:
        minutes = 0; deg += 1
    return f"{deg:02d}°{minutes:02d}′"

def to_utc(y, mo, d, h, mi, tz="Europe/Istanbul"):
    local = datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(tz))
    return local.astimezone(ZoneInfo("UTC"))

_TZF = None
def tz_from_latlon(lat, lon):
    """Koordinattan IANA saat dilimi (yurtdışı doğum için). timezonefinder yoksa Europe/Istanbul."""
    global _TZF
    try:
        if _TZF is None:
            from timezonefinder import TimezoneFinder
            _TZF = TimezoneFinder()
        tz = _TZF.timezone_at(lat=float(lat), lng=float(lon))
        return tz or "Europe/Istanbul"
    except Exception:
        return "Europe/Istanbul"

def to_utc_birth(birth):
    """birth.json'dan UTC. Saat dilimi: birth['tz'] varsa o, yoksa lat/lon'dan çözülür."""
    y, mo, d = birth["tarih"]
    h, mi = birth["saat"]
    tz = birth.get("tz")
    if not tz and "lat" in birth and "lon" in birth:
        tz = tz_from_latlon(birth["lat"], birth["lon"])
    return to_utc(y, mo, d, h, mi, tz or "Europe/Istanbul")

def mean_obliquity_deg(jd_tt):
    """IAU 1980 ortalama eğiklik (derece). Nutasyon (<0.003°) ihmal — 0.1° tolerans için yeter."""
    T = (jd_tt - 2451545.0) / 36525.0
    sec = 84381.448 - 46.8150*T - 0.00059*T*T + 0.001813*T*T*T
    return sec / 3600.0

def ascendant_deg(ramc_deg, eps_deg, lat_deg):
    """Yükselen ekliptik boylamı. RAMC = yerel görünür sidereal zaman (derece)."""
    ramc = math.radians(ramc_deg); eps = math.radians(eps_deg); lat = math.radians(lat_deg)
    asc = math.degrees(math.atan2(
        math.cos(ramc),
        -(math.sin(ramc) * math.cos(eps) + math.tan(lat) * math.sin(eps))
    )) % 360.0
    return asc

def geocode(birth):
    if "lat" in birth and "lon" in birth:
        return float(birth["lat"]), float(birth["lon"])
    key = (birth["il"], birth["ilce"])
    if key in ILCE_COORDS:
        return ILCE_COORDS[key]
    raise SystemExit(f"geocode yok: {key} — birth'e lat/lon ekle ya da ILCE_COORDS'a kaydet.")

# --- Skyfield yükleyiciler (bir kez) + gezegen boylamı (natal ve SR ortak) ---
_EPH = None
_TS = None
def get_eph():
    global _EPH
    if _EPH is None:
        _EPH = load("de421.bsp")
    return _EPH
def get_timescale():
    global _TS
    if _TS is None:
        _TS = load.timescale()
    return _TS
def _body(name):
    eph = get_eph()
    for cand in (name, name + " barycenter"):
        try:
            return eph[cand]
        except (KeyError, ValueError):
            continue
    raise KeyError(name)
def planet_lon(target, t):
    """target gezegeninin t anındaki tropikal (of-date) ekliptik boylamı (derece)."""
    earth = get_eph()["earth"]
    astrom = earth.at(t).observe(_body(target)).apparent()
    _, lon, _ = astrom.ecliptic_latlon(epoch="date")
    return lon.degrees % 360.0

def compute_chart_at(t, lat, lon_geo, ad, dogum):
    """Verilen skyfield zamanı t + konum (lat, lon_geo) için chart dict üretir.
    Natal ve Solar Return ortak çekirdeği — tek fark girdiyi sağlayan zaman/konum."""
    # --- Yükselen ---
    gast = t.gast                                  # Greenwich görünür sidereal zaman (saat)
    ramc = (gast * 15.0 + lon_geo) % 360.0         # yerel sidereal zaman (derece) = RAMC
    eps = mean_obliquity_deg(t.tt)
    asc_lon = ascendant_deg(ramc, eps, lat)
    asc_si = sign_idx(asc_lon)

    # --- Gezegenler ---
    planets, lon_by_id = [], {}
    for pid, ad_p, glyph, target, anlam in BODIES:
        L = planet_lon(target, t)
        si = sign_idx(L)
        house = ((si - asc_si) % 12) + 1
        planets.append({
            "id": pid, "glyph": glyph, "ad": ad_p, "lon": round(L, 2),
            "sign": SIGNS[si], "deg": deg_str(L), "sign_idx": si,
            "element": element_of(si), "modality": modality_of(si),
            "house": house, "anlam": anlam,
        })
        lon_by_id[pid] = L
    lon_by_id["yukselen"] = asc_lon

    # --- Açılar (7 gezegen + Yükselen) ---
    nodes = [b[0] for b in BODIES] + ["yukselen"]
    aspects = []
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            a, b = nodes[i], nodes[j]
            diff = abs(lon_by_id[a] - lon_by_id[b]) % 360.0
            if diff > 180: diff = 360 - diff
            for typ, exact, orb, color in ASPECTS:
                if abs(diff - exact) <= orb:
                    aspects.append({"a": a, "b": b, "type": typ, "color": color,
                                    "orb": round(abs(diff - exact), 2)})
                    break

    # --- Element / Nitelik dengesi (8 nokta: 7 gezegen + Yükselen) ---
    el_count = {e: 0 for e in ELEMENT}
    mod_count = {m: 0 for m in MODALITY}
    pts = [p["sign_idx"] for p in planets] + [asc_si]
    for si in pts:
        el_count[element_of(si)] += 1
        mod_count[modality_of(si)] += 1
    n = len(pts)  # 8
    elements = {e: round(el_count[e] * 100.0 / n, 1) for e in ELEMENT}
    modalities = {m: mod_count[m] for m in MODALITY}

    # --- Mizaç (baskın element; beraberlik -> karma) ---
    mx = max(el_count.values())
    dom = [e for e in ELEMENT if el_count[e] == mx]
    if len(dom) == 1:
        key, m_ad, tabiat = MIZAC[dom[0]]
        mizac = {"key": key, "ad": m_ad, "tabiat": tabiat}
    else:
        mizac = {"key": "karma", "ad": "Karma", "tabiat": "+".join(dom)}

    occupied = sorted({p["house"] for p in planets})

    return {
        "meta": {"ad": ad, "dogum": dogum},
        "asc": {"lon": round(asc_lon, 2), "sign": SIGNS[asc_si],
                "deg": deg_str(asc_lon), "sign_idx": asc_si},
        "planets": planets,
        "aspects": aspects,
        "occupied_houses": occupied,
        "elements": elements,
        "modalities": modalities,
        "mizac": mizac,
    }

def compute_chart(birth):
    """Natal: doğum verisinden chart.json üretir (compute_chart_at sarmalayıcısı)."""
    y, mo, d = birth["tarih"]
    h, mi = birth["saat"]
    lat, lon_geo = geocode(birth)
    utc = to_utc_birth(birth)
    t = get_timescale().from_datetime(utc)
    dogum = f"{d} {AYLAR[mo-1]} {y} · {h:02d}:{mi:02d} · {birth['ilce']}, {birth['il']}"
    return compute_chart_at(t, lat, lon_geo, birth["ad"], dogum)

# --- Varsayılan örnek doğum (birth.json yoksa). NOT: FAZ2 wheel_gen'deki Ayşe
#     boylamları illüstratifti (gerçek astro.com değil); o yüzden gerçek doğrulama
#      kullanıcının gerçek verisiyle astro.com'da yapılır. Bkz. _validate.py (motor testi). ---
REFERENCE = {
    "ad": "Ayşe", "tarih": [1995, 8, 5], "saat": [15, 32],
    "il": "İzmir", "ilce": "Konak", "lat": 38.4595, "lon": 27.1496,
}

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # Windows cp1254 konsolu için (°, Δ, ✓)
    except Exception:
        pass
    # birth.json varsa onu, yoksa referans Ayşe'yi kullan
    bpath = os.path.join(HERE, "birth.json")
    if os.path.exists(bpath):
        with open(bpath, encoding="utf-8") as f:
            birth = json.load(f)
    else:
        birth = REFERENCE

    chart = compute_chart(birth)
    out = os.path.join(HERE, "chart.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(chart, f, ensure_ascii=False, indent=2)
    print("ok -> chart.json")

    a = chart["asc"]
    print(f"\nKİŞİ: {chart['meta']['ad']} — {chart['meta']['dogum']}")
    print(f"Yükselen: {a['sign']} {a['deg']}  ({a['lon']:.2f}°)")
    for p in chart["planets"]:
        print(f"  {p['ad']:8s} {p['sign']:8s} {p['deg']}  ·  {p['house']:2d}.ev   ({p['lon']:.2f}°)")
    print("elements:", chart["elements"], "| modalities:", chart["modalities"], "| mizaç:", chart["mizac"]["ad"])
    print("occupied_houses:", chart["occupied_houses"])
    print("aspects:", ", ".join(f"{x['a']}-{x['b']}:{x['type']}({x['orb']}°)" for x in chart["aspects"]))
    print("\nNOT: Gerçek astro.com doğrulaması gerçek doğum verisiyle yapılır. Motor (boylam+ASC) doğruluğu: _validate.py")

if __name__ == "__main__":
    main()
