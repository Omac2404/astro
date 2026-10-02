#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compute_pro.py — Astrolog Pro raporu için GENİŞLETİLMİŞ hesap: birth-pro.json -> chart-pro.json

compute.py (skyfield + DE421, tropikal, Whole Sign) çekirdeğini kullanır; üstüne ekler:
  - 10 gezegen (Uranüs/Neptün/Plüton dahil) + hız + retro
  - MC/IC/DSC, Ay Düğümleri, Lilith, Kiron, Şans Noktası
  - Yönetim/yücelim/zarar/düşüş + basit güç skoru
  - Majör + minör açılar (orb, yaklaşan/ayrılan)
  - Harita kalıpları (stelyum, T-kare, büyük üçgen, büyük haç, yod, uçurtma)
  - Ev tablosu (burç, yönetici, yöneticinin evi, içindekiler), harita yöneticisi, dispozitör zinciri, karşılıklı ağırlama
  - Yarıküre/çeyrek dağılımı, element/nitelik/kutup dengesi, doğum Ay fazı
  - Önümüzdeki 12 ayın transitleri (yavaş gezegenler -> natal noktalar; pencere + tam isabet tarihleri)
  - İkincil progresyonlar (+ Güneş yayı MC/ASC) ve önümüzdeki 24 ayda progresif Ay
  - Geçerli Solar Return özeti
  - Yaşam olayları: her tarih için transit + progresif Ay tetikleyicileri

Ev sistemi Whole Sign (sitenin geri kalanıyla aynı). Saat bilinmiyorsa 12:00 kullanılır ve
ev/ASC/MC'ye dayalı her şey "zaman_guven=dusuk" ile işaretlenir.
"""
import os, sys, json, math
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import numpy as np

import compute as C
import karmik as K

HERE = os.path.dirname(os.path.abspath(__file__))
IO = os.environ.get("NATAL_IO") or HERE
TR = ZoneInfo("Europe/Istanbul")
UTC = ZoneInfo("UTC")
YIL_GUN = 365.2422

SIGNS = C.SIGNS
AYLAR = C.AYLAR

# (id, ad, glyph, skyfield hedefi, kısa anlam)
PLANETS = C.BODIES + [
    ("uranus",  "Uranüs", 9797, "uranus",  "Özgürlük, kırılma, yenilik"),
    ("neptun",  "Neptün", 9798, "neptune", "Hayal, sezgi, çözülme"),
    ("pluton",  "Plüton", 9799, "pluto",   "Güç, dönüşüm, derinlik"),
]
PLANET_IDS = [p[0] for p in PLANETS]
AD = {p[0]: p[1] for p in PLANETS}
AD.update({"asc": "Yükselen", "mc": "MC", "kuzey": "Kuzey Düğüm", "guney": "Güney Düğüm",
           "lilith": "Lilith", "chiron": "Kiron", "sans": "Şans Noktası", "dsc": "Alçalan", "ic": "IC"})
GLYPH = {p[0]: p[2] for p in PLANETS}
GLYPH.update({"kuzey": 9738, "guney": 9739, "lilith": 9790, "chiron": 9911})
LUMINER = {"gunes", "ay"}
KISISEL = {"gunes", "ay", "merkur", "venus", "mars"}

# ---- Yönetim / yücelim (gelenek + modern) ----
RULER_TRAD = ["mars", "venus", "merkur", "ay", "gunes", "merkur", "venus", "mars", "jupiter", "saturn", "saturn", "jupiter"]
RULER_MOD = ["mars", "venus", "merkur", "ay", "gunes", "merkur", "venus", "pluton", "jupiter", "saturn", "uranus", "neptun"]
DOMICILE = {
    "gunes": [4], "ay": [3], "merkur": [2, 5], "venus": [1, 6], "mars": [0, 7], "jupiter": [8, 11],
    "saturn": [9, 10], "uranus": [10], "neptun": [11], "pluton": [7],
}
EXALT = {"gunes": 0, "ay": 1, "merkur": 5, "venus": 11, "mars": 9, "jupiter": 3, "saturn": 6}

# ---- Açılar: (id, ad, derece, temel orb, renk/aile, majör mü) ----
ASPECTS = [
    ("kavusum",     "kavuşum",      0,   8, "gold", True),
    ("karsitlik",   "karşıt",       180, 8, "rust", True),
    ("ucgen",       "üçgen",        120, 7, "teal", True),
    ("kare",        "kare",         90,  7, "rust", True),
    ("altmislik",   "altmışlık",    60,  5, "teal", True),
    ("quincunx",    "quincunx",     150, 3, "violet", False),
    ("yarikare",    "yarım kare",   45,  2, "rust", False),
    ("seskikare",   "seskikare",    135, 2, "rust", False),
    ("yarialtmis",  "yarım altmışlık", 30, 2, "teal", False),
]
ASP_AD = {a[0]: a[1] for a in ASPECTS}
ASP_UYUM = {"kavusum": "nötr", "karsitlik": "gergin", "ucgen": "uyumlu", "kare": "gergin", "altmislik": "uyumlu",
            "quincunx": "ayar", "yarikare": "gergin", "seskikare": "gergin", "yarialtmis": "uyumlu"}

HOUSE_KONU = [
    "Kimlik, beden, ilk izlenim", "Para, değerler, öz-değer", "Zihin, iletişim, kardeşler, yakın çevre",
    "Yuva, aile, kökler, iç dünya", "Aşk, yaratıcılık, çocuklar, keyif", "İş, rutin, sağlık, hizmet",
    "Evlilik, ortaklık, açık ilişkiler", "Dönüşüm, ortak kaynaklar, mahremiyet, kriz",
    "İnanç, felsefe, yüksek öğrenim, uzak yollar", "Kariyer, itibar, toplumsal rol, hedefler",
    "Arkadaşlık, topluluk, idealler, gelecek planı", "Bilinçaltı, ruhsallık, geri çekilme, gizli olan",
]
MOON_PHASES = ["Yeni Ay", "Hilal", "İlk Dördün", "Şişkin Ay", "Dolunay", "Yayılan Ay", "Son Dördün", "Balsamik Ay"]
MOON_PHASE_ANLAM = [
    "Başlatıcı, içgüdüsel, geleceğe dönük; yeni bir döngünün tohumu.",
    "Mücadeleyle kendini kanıtlayan, geçmişin çekimine karşı ilerleyen ruh.",
    "Krizde harekete geçen, kararlı, inşa eden enerji.",
    "Mükemmeliyetçi, geliştiren, anlam arayan analitik ruh.",
    "İlişkiler ve farkındalıkla doruğa çıkan, karşıtları gören bilinç.",
    "Öğrendiğini paylaşan, öğretmen ve yayıcı ruh.",
    "İnançlarını yeniden yapılandıran, eskiyi bırakan dönüşümcü.",
    "Kapanış, bilgelik ve geleceğe tohum bırakan vizyoner.",
]


def norm(x):
    return x % 360.0


def sep(a, b):
    d = abs(norm(a) - norm(b)) % 360.0
    return 360.0 - d if d > 180 else d


def sign_idx(lon):
    return int(norm(lon) // 30) % 12


def deg_min(lon):
    d = norm(lon) % 30
    deg = int(d)
    mi = int(round((d - deg) * 60))
    if mi == 60:
        deg, mi = deg + 1, 0
    return f"{deg:02d}°{mi:02d}′"


def tr_tarih(dt):
    return f"{dt.day} {AYLAR[dt.month - 1]} {dt.year}"


def iso_gun(dt):
    return dt.strftime("%Y-%m-%d")


# ---------- Konum hesapları ----------
def lon_at(target, t):
    return C.planet_lon(target, t)


def lon_series(target, ts_arr):
    """Vektörel: zaman dizisi için tropikal boylamlar (numpy)."""
    earth = C.get_eph()["earth"]
    astrom = earth.at(ts_arr).observe(C._body(target)).apparent()
    _, lon, _ = astrom.ecliptic_latlon(epoch="date")
    return lon.degrees % 360.0


def mean_node_series(ts_arr):
    T = (ts_arr.tt - 2451545.0) / 36525.0
    om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T ** 3) / 450000.0
    return om % 360.0


def mc_deg(ramc_deg, eps_deg):
    r = math.radians(ramc_deg)
    e = math.radians(eps_deg)
    return math.degrees(math.atan2(math.sin(r), math.cos(r) * math.cos(e))) % 360.0


def angles_at(t, lat, lon_geo):
    ramc = (t.gast * 15.0 + lon_geo) % 360.0
    eps = C.mean_obliquity_deg(t.tt)
    return C.ascendant_deg(ramc, eps, lat), mc_deg(ramc, eps)


def dignity(pid, si):
    if pid in DOMICILE and si in DOMICILE[pid]:
        return "yönetim"
    if EXALT.get(pid) == si:
        return "yücelim"
    if pid in DOMICILE and any((d + 6) % 12 == si for d in DOMICILE[pid]):
        return "zarar"
    if pid in EXALT and (EXALT[pid] + 6) % 12 == si:
        return "düşüş"
    return "nötr"


DIG_PUAN = {"yönetim": 5, "yücelim": 4, "nötr": 0, "düşüş": -4, "zarar": -5}


# ---------- Ana hesap ----------
def build(birth, now_tr=None):
    now_tr = now_tr or datetime.now(TR)
    ts = C.get_timescale()
    y, mo, d = birth["tarih"]
    h, mi = birth["saat"]
    lat, lon_geo = C.geocode(birth)
    tzname = birth.get("tz") or C.tz_from_latlon(lat, lon_geo)
    local = datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(tzname))
    utc = local.astimezone(UTC)
    t = ts.from_datetime(utc)
    saat_kesin = birth.get("saat_kesin", "kesin")  # kesin | yaklasik | bilinmiyor
    zaman_guven = {"kesin": "yuksek", "yaklasik": "orta", "bilinmiyor": "dusuk"}.get(saat_kesin, "yuksek")

    asc, mc = angles_at(t, lat, lon_geo)
    asc_si = sign_idx(asc)

    def house_of(lon):
        return ((sign_idx(lon) - asc_si) % 12) + 1

    # --- Gezegenler (+ hız) ---
    t_m = ts.from_datetime(utc - timedelta(hours=12))
    t_p = ts.from_datetime(utc + timedelta(hours=12))
    lon = {}
    speed = {}
    planets = []
    for pid, ad, glyph, target, anlam in PLANETS:
        L = lon_at(target, t)
        sp = ((lon_at(target, t_p) - lon_at(target, t_m) + 540) % 360) - 180
        lon[pid], speed[pid] = L, sp
        si = sign_idx(L)
        dig = dignity(pid, si)
        planets.append({
            "id": pid, "ad": ad, "glyph": glyph, "lon": round(L, 4), "sign": SIGNS[si], "sign_idx": si,
            "deg": deg_min(L), "house": house_of(L), "element": C.element_of(si), "modality": C.modality_of(si),
            "retro": sp < 0, "hiz": round(sp, 4), "dignity": dig, "anlam": anlam,
        })

    # --- Noktalar ---
    nn = K.mean_node_lon(t)
    lil = K.mean_lilith_lon(t)
    try:
        chi = K.chiron_lon(t, utc.year, utc.month, utc.day, utc.hour, utc.minute) if 1920 <= utc.year <= 2078 else None
    except Exception:
        chi = None
    gunduz = norm(lon["gunes"] - asc) >= 180  # Güneş ufkun üstünde (7-12. ev yarısı)
    sans = norm(asc + lon["ay"] - lon["gunes"]) if gunduz else norm(asc + lon["gunes"] - lon["ay"])
    pts = {"asc": asc, "mc": mc, "dsc": norm(asc + 180), "ic": norm(mc + 180),
           "kuzey": nn, "guney": norm(nn + 180), "lilith": lil, "sans": sans}
    if chi is not None:
        pts["chiron"] = chi
    points = []
    for pid in ["asc", "mc", "dsc", "ic", "kuzey", "guney", "lilith", "chiron", "sans"]:
        if pid not in pts:
            continue
        L = pts[pid]
        si = sign_idx(L)
        points.append({"id": pid, "ad": AD[pid], "glyph": GLYPH.get(pid), "lon": round(L, 4), "sign": SIGNS[si],
                       "sign_idx": si, "deg": deg_min(L), "house": house_of(L),
                       "zamana_bagli": pid in ("asc", "mc", "dsc", "ic", "sans")})
    lon.update(pts)
    speed.update({"asc": 0.0, "mc": 0.0, "kuzey": -0.053, "guney": -0.053, "chiron": 0.0, "lilith": 0.111})

    # --- Açılar ---
    asp_nodes = PLANET_IDS + ["asc", "mc", "kuzey"] + (["chiron"] if "chiron" in pts else [])
    aspects = []
    for i in range(len(asp_nodes)):
        for j in range(i + 1, len(asp_nodes)):
            a, b = asp_nodes[i], asp_nodes[j]
            if {a, b} == {"asc", "mc"}:
                continue
            s = sep(lon[a], lon[b])
            nokta = a not in PLANET_IDS or b not in PLANET_IDS
            for aid, aad, exact, orb, renk, majör in ASPECTS:
                o = orb + (2 if (a in LUMINER or b in LUMINER) and majör else 0)
                if nokta:
                    o = min(o, 5 if majör else 1.5)
                if abs(s - exact) <= o:
                    # yaklaşan mı? küçük dt sonra orb azalıyorsa
                    dt = 0.05
                    s2 = sep(lon[a] + speed[a] * dt, lon[b] + speed[b] * dt)
                    yaklasan = abs(s2 - exact) < abs(s - exact)
                    aspects.append({"a": a, "b": b, "a_ad": AD[a], "b_ad": AD[b], "type": aid, "ad": aad,
                                    "orb": round(abs(s - exact), 2), "yaklasan": yaklasan, "majör": majör,
                                    "uyum": ASP_UYUM[aid], "color": renk})
                    break
    aspects.sort(key=lambda x: (not x["majör"], x["orb"]))

    # --- Kalıplar (yalnız 10 gezegen) ---
    pl_asp = {}
    for a in aspects:
        if a["a"] in PLANET_IDS and a["b"] in PLANET_IDS:
            pl_asp[frozenset((a["a"], a["b"]))] = a["type"]

    def has(q1, q2, typ):
        return pl_asp.get(frozenset((q1, q2))) == typ

    patterns = []
    by_sign = {}
    for p in planets:
        by_sign.setdefault(p["sign"], []).append(p["ad"])
    for sg, lst in by_sign.items():
        if len(lst) >= 3:
            patterns.append({"tip": "Stelyum", "detay": f"{sg} burcunda ({len(lst)} gezegen): {', '.join(lst)}"})
    ids = PLANET_IDS
    seen = set()
    for q1 in ids:
        for q2 in ids:
            if q1 >= q2 or not has(q1, q2, "karsitlik"):
                continue
            for q3 in ids:
                if q3 in (q1, q2):
                    continue
                if has(q1, q3, "kare") and has(q2, q3, "kare"):
                    # büyük haç mı?
                    for q4 in ids:
                        if q4 not in (q1, q2, q3) and has(q3, q4, "karsitlik") and has(q1, q4, "kare") and has(q2, q4, "kare"):
                            k = frozenset((q1, q2, q3, q4))
                            if ("haç", k) not in seen:
                                seen.add(("haç", k))
                                patterns.append({"tip": "Büyük Haç", "detay": " / ".join(AD[q] for q in (q1, q2, q3, q4))})
                    k = frozenset((q1, q2, q3))
                    if ("t", k) not in seen:
                        seen.add(("t", k))
                        patterns.append({"tip": "T-Kare", "detay": f"{AD[q1]} karşıt {AD[q2]}, odak (apeks): {AD[q3]}"})
    for q1 in ids:
        for q2 in ids:
            for q3 in ids:
                if q1 < q2 < q3 and has(q1, q2, "ucgen") and has(q2, q3, "ucgen") and has(q1, q3, "ucgen"):
                    patterns.append({"tip": "Büyük Üçgen", "detay": f"{AD[q1]}, {AD[q2]}, {AD[q3]}"})
                    for q4 in ids:
                        if q4 in (q1, q2, q3):
                            continue
                        for q5, o1, o2 in ((q1, q2, q3), (q2, q1, q3), (q3, q1, q2)):
                            if has(q5, q4, "karsitlik") and has(q4, o1, "altmislik") and has(q4, o2, "altmislik"):
                                patterns.append({"tip": "Uçurtma", "detay": f"Büyük üçgen + {AD[q4]} (ip ucu {AD[q5]} karşısında)"})
    for q1 in ids:
        for q2 in ids:
            if q1 >= q2 or not has(q1, q2, "altmislik"):
                continue
            for q3 in ids:
                if q3 not in (q1, q2) and has(q1, q3, "quincunx") and has(q2, q3, "quincunx"):
                    patterns.append({"tip": "Yod (Tanrı'nın Parmağı)", "detay": f"{AD[q1]} ve {AD[q2]} -> apeks {AD[q3]}"})

    # --- Ev tablosu, yöneticiler ---
    pl_by_house = {}
    for p in planets:
        pl_by_house.setdefault(p["house"], []).append(p["ad"] + (" (R)" if p["retro"] else ""))
    for q in points:
        if q["id"] in ("kuzey", "guney", "lilith", "chiron", "sans"):
            pl_by_house.setdefault(q["house"], []).append(q["ad"])
    P = {p["id"]: p for p in planets}
    houses = []
    for hn in range(1, 13):
        si = (asc_si + hn - 1) % 12
        rt, rm = RULER_TRAD[si], RULER_MOD[si]
        houses.append({
            "n": hn, "sign": SIGNS[si], "konu": HOUSE_KONU[hn - 1],
            "yonetici": AD[rt], "yonetici_ev": P[rt]["house"], "yonetici_burc": P[rt]["sign"],
            "modern_yonetici": AD[rm] if rm != rt else None,
            "modern_yonetici_ev": P[rm]["house"] if rm != rt else None,
            "icindekiler": pl_by_house.get(hn, []),
        })
    harita_yoneticisi = {"id": RULER_TRAD[asc_si], "ad": AD[RULER_TRAD[asc_si]],
                         "sign": P[RULER_TRAD[asc_si]]["sign"], "house": P[RULER_TRAD[asc_si]]["house"],
                         "dignity": P[RULER_TRAD[asc_si]]["dignity"],
                         "modern": AD[RULER_MOD[asc_si]] if RULER_MOD[asc_si] != RULER_TRAD[asc_si] else None}
    mc_si = sign_idx(mc)
    mc_info = {"sign": SIGNS[mc_si], "deg": deg_min(mc), "house": house_of(mc),
               "yonetici": AD[RULER_TRAD[mc_si]], "yonetici_ev": P[RULER_TRAD[mc_si]]["house"]}

    # --- Dispozitörler (gelenek; 7 klasik + dış gezegenlerin dispozitörü) ---
    disp = {pid: RULER_TRAD[P[pid]["sign_idx"]] for pid in PLANET_IDS}
    zincir = {}
    for pid in PLANET_IDS:
        ch, cur = [pid], pid
        while True:
            nx = disp[cur]
            if nx in ch:
                ch.append(nx)
                break
            ch.append(nx)
            cur = nx
        zincir[pid] = " → ".join(AD[x] for x in ch)
    kendi_evinde = [pid for pid in PLANET_IDS[:7] if disp[pid] == pid]
    son_disp = None
    if len(kendi_evinde) == 1:
        tek = kendi_evinde[0]
        ok = True
        for pid in PLANET_IDS:
            cur, adim = pid, 0
            while cur != tek and adim < 12:
                cur, adim = disp[cur], adim + 1
            if cur != tek:
                ok = False
        if ok:
            son_disp = AD[tek]
    ag_list = []
    for i, g1 in enumerate(PLANET_IDS[:7]):
        for g2 in PLANET_IDS[i + 1:7]:
            if disp[g1] == g2 and disp[g2] == g1:
                ag_list.append(f"{AD[g1]} ({P[g1]['sign']}) ⇄ {AD[g2]} ({P[g2]['sign']})")

    # --- Güç skoru (basitleştirilmiş: öz-onur + açısallık + retro + açı yoğunluğu) ---
    guc = []
    for p in planets:
        pid = p["id"]
        s = DIG_PUAN[p["dignity"]]
        s += {1: 3, 4: 3, 7: 3, 10: 3, 2: 1, 5: 1, 8: 1, 11: 1}.get(p["house"], 0)
        if p["retro"] and pid not in LUMINER:
            s -= 1
        for ang_id in ("asc", "mc"):
            if sep(p["lon"], lon[ang_id]) <= 5:
                s += 2
        s += min(3, sum(1 for a in aspects if a["majör"] and pid in (a["a"], a["b"])) // 2)
        guc.append({"id": pid, "ad": p["ad"], "puan": s, "dignity": p["dignity"], "house": p["house"]})
    guc.sort(key=lambda g: -g["puan"])

    # --- Dengeler (10 gezegen + ASC + MC) ---
    pts12 = [p["sign_idx"] for p in planets] + [asc_si, mc_si]
    el = {e: 0 for e in C.ELEMENT}
    md = {m: 0 for m in C.MODALITY}
    for si in pts12:
        el[C.element_of(si)] += 1
        md[C.modality_of(si)] += 1
    polar = {"Eril (Ateş+Hava)": el["Ateş"] + el["Hava"], "Dişil (Toprak+Su)": el["Toprak"] + el["Su"]}
    ust = sum(1 for p in planets if p["house"] >= 7)
    dogu = sum(1 for p in planets if p["house"] in (10, 11, 12, 1, 2, 3))
    ceyrek = {f"{i + 1}. çeyrek ({['1-3', '4-6', '7-9', '10-12'][i]}. evler)":
              sum(1 for p in planets if (p["house"] - 1) // 3 == i) for i in range(4)}
    el_gez = {e: [p["ad"] for p in planets if p["element"] == e] for e in C.ELEMENT}
    md_gez = {m: [p["ad"] for p in planets if p["modality"] == m] for m in C.MODALITY}

    elong = norm(lon["ay"] - lon["gunes"])
    faz_i = int(elong // 45) % 8
    ay_fazi = {"ad": MOON_PHASES[faz_i], "aci": round(elong, 1), "anlam": MOON_PHASE_ANLAM[faz_i]}

    # --- Önümüzdeki 12 ay transitleri ---
    transits = transit_timeline(ts, lon, now_tr, asc_si, days=372)

    # --- Progresyonlar ---
    prog = progressions(ts, utc, lon, now_tr, asc_si, lat, lon_geo)

    # --- Solar Return ---
    sr = solar_return(ts, lon["gunes"], local, now_tr, lat, lon_geo)

    # --- Yaşam olayları ---
    olaylar = []
    for ev in birth.get("olaylar", []) or []:
        try:
            olaylar.append(event_triggers(ts, ev, lon, utc, asc_si))
        except Exception as e:
            olaylar.append({"tarih": ev.get("tarih"), "aciklama": ev.get("aciklama", ""), "hata": str(e)})

    yas = (now_tr.astimezone(UTC) - utc).days / YIL_GUN
    return {
        "tip": "pro-natal",
        "meta": {
            "ad": birth["ad"], "tarih": f"{d} {AYLAR[mo - 1]} {y}", "saat": f"{h:02d}:{mi:02d}",
            "yer": birth.get("yer_metin") or ", ".join(x for x in (birth.get("ilce"), birth.get("il")) if x),
            "lat": round(lat, 4), "lon": round(lon_geo, 4), "tz": tzname, "utc": utc.strftime("%Y-%m-%d %H:%M UTC"),
            "saat_kesin": saat_kesin, "zaman_guven": zaman_guven, "gunduz_dogum": gunduz,
            "yas": round(yas, 1), "uretim": tr_tarih(now_tr), "uretim_iso": iso_gun(now_tr),
            "ev_sistemi": "Tüm Burç (Whole Sign)", "zodyak": "Tropikal",
        },
        "danisan": birth.get("danisan", {}),
        "asc": {"lon": round(asc, 4), "sign": SIGNS[asc_si], "deg": deg_min(asc), "sign_idx": asc_si},
        "mc": mc_info,
        "planets": planets, "points": points, "aspects": aspects, "patterns": patterns,
        "houses": houses, "harita_yoneticisi": harita_yoneticisi,
        "dispozitor": {"zincir": zincir, "son": son_disp, "kendi_burcunda": [AD[x] for x in kendi_evinde], "karsilikli_agirlama": ag_list},
        "guc": guc,
        "denge": {"element": el, "nitelik": md, "kutup": polar, "element_gezegen": el_gez, "nitelik_gezegen": md_gez,
                  "ust_yari": ust, "alt_yari": 10 - ust, "dogu": dogu, "bati": 10 - dogu, "ceyrek": ceyrek},
        "ay_fazi": ay_fazi,
        "transitler": transits, "progresyon": prog, "solar_return": sr, "olaylar": olaylar,
    }


# ---------- Transit zaman çizelgesi ----------
TRANSIT_BODIES = [("jupiter", "jupiter"), ("saturn", "saturn"), ("uranus", "uranus"), ("neptun", "neptune"),
                  ("pluton", "pluto"), ("kuzey", None)]
NATAL_TARGETS = ["gunes", "ay", "merkur", "venus", "mars", "jupiter", "saturn", "asc", "mc"]
TR_ASPECTS = [a for a in ASPECTS if a[5]]  # majörler


def _windows(mask):
    out, i, n = [], 0, len(mask)
    while i < n:
        if mask[i]:
            j = i
            while j + 1 < n and mask[j + 1]:
                j += 1
            out.append((i, j))
            i = j + 1
        else:
            i += 1
    return out


def transit_timeline(ts, natal_lon, now_tr, asc_si, days=372):
    start = datetime(now_tr.year, now_tr.month, now_tr.day, 12, 0, tzinfo=TR).astimezone(UTC)
    dates = [start + timedelta(days=k) for k in range(days)]
    t_arr = ts.from_datetimes(dates)
    series = {}
    for tid, target in TRANSIT_BODIES:
        series[tid] = mean_node_series(t_arr) if target is None else lon_series(target, t_arr)
    events = []
    ingresler = []
    for tid, _ in TRANSIT_BODIES:
        L = series[tid]
        # burç değişimleri
        sidx = (L // 30).astype(int) % 12
        for k in range(1, len(sidx)):
            if sidx[k] != sidx[k - 1]:
                ingresler.append({"gezegen": AD[tid], "burc": SIGNS[sidx[k]], "tarih": tr_tarih(dates[k].astimezone(TR)),
                                  "iso": iso_gun(dates[k].astimezone(TR)), "ev": ((sidx[k] - asc_si) % 12) + 1})
        for nid in NATAL_TARGETS:
            if tid == nid:
                continue  # dönüşler (Satürn dönüşü vs.) aşağıda kavuşum olarak zaten yakalanır
            for aid, aad, exact, _, renk, _ in TR_ASPECTS:
                orb = 1.5 if tid in ("jupiter", "saturn", "kuzey") else 1.2
                d = np.abs(np.abs(((L - natal_lon[nid]) + 540) % 360 - 180) - exact)
                for (i, j) in _windows(d <= orb):
                    seg = d[i:j + 1]
                    k0 = i + int(np.argmin(seg))
                    # Tam isabet = pencere İÇİNDEKİ yerel minimum. Minimum dönem sınırındaysa (bugünden önce
                    # ya da 12 ay sonrasında tam oluyor) o tarih gerçek isabet değildir; listelenmez.
                    sinirda = (k0 == 0 or k0 == len(d) - 1) and float(d[k0]) > 0.12
                    tam = [] if sinirda else [dates[k0]]
                    # aynı pencerede birden fazla tam isabet (retro geçişi)
                    for k in range(max(i, 1), min(j, len(d) - 2) + 1):
                        if d[k] < d[k - 1] and d[k] <= d[k + 1] and d[k] < 0.25 and k != k0:
                            tam.append(dates[k])
                    tam = sorted(set(tam))
                    events.append({
                        "transit": AD[tid], "natal": AD[nid], "tip": aid, "ad": aad, "uyum": ASP_UYUM[aid],
                        "baslangic": iso_gun(dates[i].astimezone(TR)), "bitis": iso_gun(dates[j].astimezone(TR)),
                        "baslangic_tr": tr_tarih(dates[i].astimezone(TR)), "bitis_tr": tr_tarih(dates[j].astimezone(TR)),
                        "tam": [tr_tarih(x.astimezone(TR)) for x in tam], "tam_iso": [iso_gun(x.astimezone(TR)) for x in tam], "min_orb": round(float(seg.min()), 2),
                        "devam_ediyor": i == 0, "suruyor_sonra": j == len(d) - 1,
                        "agirlik": _transit_agirlik(tid, nid, aid),
                    })
    events.sort(key=lambda e: (e["baslangic"], -e["agirlik"]))
    # şu an ev konumları
    simdi = {AD[tid]: {"burc": SIGNS[int(series[tid][0] // 30) % 12],
                       "ev": ((int(series[tid][0] // 30) % 12 - asc_si) % 12) + 1,
                       "deg": deg_min(series[tid][0])} for tid, _ in TRANSIT_BODIES}
    return {"baslangic": tr_tarih(now_tr), "bitis": tr_tarih((start + timedelta(days=days - 1)).astimezone(TR)),
            "baslangic_iso": iso_gun(now_tr), "bitis_iso": iso_gun((start + timedelta(days=days - 1)).astimezone(TR)),
            "olaylar": events, "ingresler": ingresler, "simdi": simdi}


def _transit_agirlik(tid, nid, aid):
    w = {"pluton": 5, "neptun": 4, "uranus": 4, "saturn": 4, "jupiter": 2, "kuzey": 2}[tid]
    w += {"gunes": 2, "ay": 2, "asc": 2, "mc": 2}.get(nid, 1)
    w += {"kavusum": 2, "karsitlik": 1, "kare": 1}.get(aid, 0)
    return w


# ---------- Progresyonlar ----------
def _prog_time(ts, birth_utc, when_utc):
    age_days = (when_utc - birth_utc).total_seconds() / 86400.0
    return ts.from_datetime(birth_utc + timedelta(days=age_days / YIL_GUN))


def progressions(ts, birth_utc, natal_lon, now_tr, asc_si, lat, lon_geo):
    now_utc = now_tr.astimezone(UTC)
    tp = _prog_time(ts, birth_utc, now_utc)
    out = {}
    for pid, target in (("gunes", "sun"), ("ay", "moon"), ("merkur", "mercury"), ("venus", "venus"), ("mars", "mars")):
        L = lon_at(target, tp)
        si = sign_idx(L)
        out[pid] = {"ad": AD[pid], "lon": round(L, 3), "sign": SIGNS[si], "deg": deg_min(L),
                    "natal_ev": ((si - asc_si) % 12) + 1}
    arc = norm(out["gunes"]["lon"] - natal_lon["gunes"])
    sa_mc, sa_asc = norm(natal_lon["mc"] + arc), norm(natal_lon["asc"] + arc)
    out["sa_mc"] = {"ad": "Güneş yayı MC", "sign": SIGNS[sign_idx(sa_mc)], "deg": deg_min(sa_mc), "lon": round(sa_mc, 3)}
    out["sa_asc"] = {"ad": "Güneş yayı ASC", "sign": SIGNS[sign_idx(sa_asc)], "deg": deg_min(sa_asc), "lon": round(sa_asc, 3)}
    el = norm(out["ay"]["lon"] - out["gunes"]["lon"])
    out["ay_fazi"] = {"ad": MOON_PHASES[int(el // 45) % 8], "aci": round(el, 1)}
    # progresif açılar (Güneş/Ay/Merkür/Venüs/Mars + SA açıları) -> natal, orb 1°
    aktif = []
    for pid in ("gunes", "ay", "merkur", "venus", "mars", "sa_mc", "sa_asc"):
        for nid in PLANET_IDS + ["asc", "mc"]:
            s = sep(out[pid]["lon"], natal_lon[nid])
            for aid, aad, exact, _, _, maj in ASPECTS:
                if maj and abs(s - exact) <= 1.0:
                    aktif.append({"prog": out[pid]["ad"], "natal": AD[nid], "tip": aid, "ad": aad,
                                  "orb": round(abs(s - exact), 2), "uyum": ASP_UYUM[aid]})
    out["aktif_acilar"] = aktif
    # önümüzdeki 24 ay progresif Ay
    ay_yol = []
    prev = None
    for k in range(0, 25):
        when = now_utc + timedelta(days=30.44 * k)
        L = lon_at("moon", _prog_time(ts, birth_utc, when))
        si = sign_idx(L)
        if prev is None or si != prev:
            ay_yol.append({"tarih": tr_tarih(when.astimezone(TR)), "burc": SIGNS[si], "ev": ((si - asc_si) % 12) + 1,
                           "deg": deg_min(L), "baslangic": prev is None})
        prev = si
    out["ay_yolculugu"] = ay_yol
    out["yay"] = round(arc, 2)
    return out


# ---------- Solar Return ----------
def solar_return(ts, natal_sun, birth_local, now_tr, lat, lon_geo):
    from compute_sr import find_sr_moment
    y = now_tr.year
    cands = []
    for yy in (y - 1, y):
        try:
            m, _ = find_sr_moment(natal_sun, yy, birth_local.month, birth_local.day, birth_local.hour, birth_local.minute)
            cands.append(m)
        except Exception:
            pass
    now_utc = now_tr.astimezone(UTC)
    gecmis = [m for m in cands if m <= now_utc]
    if not gecmis:
        return None
    m = max(gecmis)
    t = ts.from_datetime(m)
    sr = C.compute_chart_at(t, lat, lon_geo, "SR", "")
    asc_si = sr["asc"]["sign_idx"]
    for extra in (("uranus", "Uranüs", "uranus"), ("neptun", "Neptün", "neptune"), ("pluton", "Plüton", "pluto")):
        L = lon_at(extra[2], t)
        si = sign_idx(L)
        sr["planets"].append({"id": extra[0], "ad": extra[1], "sign": SIGNS[si], "deg": deg_min(L), "lon": L,
                              "house": ((si - asc_si) % 12) + 1})
    mtr = m.astimezone(TR)
    asc_lon = sr["asc"]["lon"]
    mc = angles_at(t, lat, lon_geo)[1]
    return {
        "an": f"{tr_tarih(mtr)} {mtr.strftime('%H:%M')}", "yil": f"{mtr.year}–{mtr.year + 1}",
        "asc": {"sign": sr["asc"]["sign"], "deg": sr["asc"]["deg"]},
        "mc": {"sign": SIGNS[sign_idx(mc)], "deg": deg_min(mc)},
        "gezegenler": [{"ad": p["ad"], "sign": p["sign"], "deg": p["deg"], "house": p["house"]} for p in sr["planets"]],
        "acisal_gezegenler": [p["ad"] for p in sr["planets"] if p["house"] in (1, 4, 7, 10)],
        "not": "Doğum yeri koordinatlarıyla kurulmuştur (yer değişikliği uygulanmadı).",
        "_asc_lon": asc_lon,
    }


# ---------- Yaşam olayları ----------
EVENT_BODIES = [("jupiter", "jupiter"), ("saturn", "saturn"), ("uranus", "uranus"), ("neptun", "neptune"),
                ("pluton", "pluto"), ("kuzey", None)]


def event_triggers(ts, ev, natal_lon, birth_utc, asc_si):
    tarih = str(ev.get("tarih", "")).strip()
    y, mo, d = [int(x) for x in tarih.split("-")[:3]]
    when = datetime(y, mo, d, 12, 0, tzinfo=TR).astimezone(UTC)
    t = ts.from_datetime(when)
    hits = []
    for tid, target in EVENT_BODIES:
        L = K.mean_node_lon(t) if target is None else lon_at(target, t)
        for nid in NATAL_TARGETS + ["uranus", "neptun", "pluton"]:
            if tid == nid and tid != "saturn" and tid != "jupiter":
                continue
            s = sep(L, natal_lon[nid])
            for aid, aad, exact, _, _, maj in ASPECTS:
                if maj and abs(s - exact) <= 2.0:
                    hits.append({"transit": AD[tid], "natal": AD[nid], "tip": aid, "ad": aad,
                                 "orb": round(abs(s - exact), 2), "uyum": ASP_UYUM[aid],
                                 "agirlik": _transit_agirlik(tid, nid if nid in NATAL_TARGETS else "x", aid)})
    hits.sort(key=lambda x: (x["orb"] - x["agirlik"] * 0.15))
    evler = {}
    for tid, target in (("jupiter", "jupiter"), ("saturn", "saturn")):
        L = lon_at(target, t)
        evler[AD[tid]] = {"burc": SIGNS[sign_idx(L)], "ev": ((sign_idx(L) - asc_si) % 12) + 1}
    pL = lon_at("moon", _prog_time(ts, birth_utc, when))
    pmoon = {"burc": SIGNS[sign_idx(pL)], "ev": ((sign_idx(pL) - asc_si) % 12) + 1, "deg": deg_min(pL)}
    pm_hits = []
    for nid in PLANET_IDS + ["asc", "mc"]:
        s = sep(pL, natal_lon[nid])
        for aid, aad, exact, _, _, maj in ASPECTS:
            if maj and abs(s - exact) <= 1.5:
                pm_hits.append(f"progresif Ay {aad} natal {AD[nid]} ({abs(s - exact):.1f}°)")
    yas = (when - birth_utc).days / YIL_GUN
    return {"tarih": tarih, "tarih_tr": tr_tarih(when.astimezone(TR)), "aciklama": str(ev.get("aciklama", ""))[:300],
            "yas": round(yas, 1), "tetikleyiciler": hits[:10], "transit_evler": evler,
            "progresif_ay": pmoon, "progresif_ay_acilari": pm_hits}


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    bpath = os.path.join(IO, "birth-pro.json")
    if os.path.exists(bpath):
        birth = json.load(open(bpath, encoding="utf-8"))
    else:
        birth = dict(C.REFERENCE, saat_kesin="kesin",
                     olaylar=[{"tarih": "2019-09-14", "aciklama": "Evlilik"}, {"tarih": "2022-03-02", "aciklama": "İş değişikliği"}])
    chart = build(birth)
    out = os.path.join(IO, "chart-pro.json")
    def _np(o):  # skyfield/numpy skalerleri (np.bool_, np.float64, np.int64) -> yerel tip
        return o.item() if hasattr(o, "item") else str(o)
    json.dump(chart, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=_np)
    m = chart["meta"]
    print(f"ok -> chart-pro.json | {m['ad']} {m['tarih']} {m['saat']} | ASC {chart['asc']['sign']} {chart['asc']['deg']} "
          f"| MC {chart['mc']['sign']} {chart['mc']['deg']} | açı {len(chart['aspects'])} | kalıp {len(chart['patterns'])} "
          f"| transit {len(chart['transitler']['olaylar'])} | olay {len(chart['olaylar'])}")


if __name__ == "__main__":
    main()
