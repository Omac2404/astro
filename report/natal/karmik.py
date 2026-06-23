# -*- coding: utf-8 -*-
"""
karmik.py — Lilith & Karmik (Motor 2) ek noktaları: Lilith, Ay Düğümleri, Kiron.

- Lilith  : Mean Black Moon (ortalama ay apogee) — Meeus formülü (of-date tropikal)
- K.Düğüm : Mean ascending node (ortalama Kuzey Düğüm) — Meeus 47.7 (of-date)
- G.Düğüm : K.Düğüm + 180
- Kiron   : JPL SPK (2060 Chiron, NAIF 20002060) spiceypy ile okunur, skyfield ile
            of-date ekliptik boylama çevrilir (compute.py gezegenleriyle birebir tutarlı).

Konvansiyon: astro.com "Mean Node" + "Mean Black Moon (Lilith)" + Chiron ile karşılaştır.
"""
import os
import compute as C

HERE = os.path.dirname(os.path.abspath(__file__))
EPH = os.path.join(HERE, "_ephem")        # skyfield runtime indirmeleri (de421.bsp)
KERN = os.path.join(HERE, "kernels")      # commit'li statik SPICE kernel'leri (naif0012.tls, chiron.bsp)
AU_KM = 149597870.7
_SPICE_READY = False


def _T(t):
    """Julian yüzyıl (TT, J2000'den)."""
    return (t.tt - 2451545.0) / 36525.0


def mean_node_lon(t):
    """Ortalama Kuzey Ay Düğümü ekliptik boylamı (of-date), Meeus 47.7."""
    T = _T(t)
    omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T ** 3) / 450000.0
    return omega % 360.0


def mean_lilith_lon(t):
    """Mean Black Moon Lilith (ortalama ay apogee) ekliptik boylamı (of-date).
    Apogee = ay perigee boylamı + 180; perigee = L' - M' (Meeus ay ortalama elemanları)."""
    T = _T(t)
    Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T ** 3) / 538841.0 - (T ** 4) / 65194000.0
    Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T ** 3) / 69699.0 - (T ** 4) / 14712000.0
    perigee = Lp - Mp
    return (perigee + 180.0) % 360.0


def _ensure_spice():
    global _SPICE_READY
    if _SPICE_READY:
        return
    import spiceypy as spice
    # Statik kernel'ler kernels/ altında (commit'li); de421.bsp skyfield ile _ephem'e iner.
    spice.furnsh(os.path.join(KERN, "naif0012.tls"))
    spice.furnsh(os.path.join(EPH, "de421.bsp"))
    spice.furnsh(os.path.join(KERN, "chiron.bsp"))
    _SPICE_READY = True


def chiron_lon(t, y, mo, d, h, mi):
    """Kiron of-date tropikal ekliptik boylamı. t: skyfield zamanı (aynı an)."""
    import spiceypy as spice
    from skyfield.positionlib import Geocentric
    _ensure_spice()
    et = spice.str2et(f"{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}:00")
    state, _ = spice.spkezr("20002060", et, "J2000", "LT+S", "EARTH")
    pos_au = [state[0] / AU_KM, state[1] / AU_KM, state[2] / AU_KM]
    _, lon, _ = Geocentric(pos_au, t=t).ecliptic_latlon(epoch="date")
    return lon.degrees % 360.0


# (id, ad, glyph_unicode, anlam) — Kiron/Lilith/Düğüm glifleri Segoe UI Symbol'de var
KARMIK_BODIES = [
    ("lilith",  "Lilith",        9790, "Gölge ve güç"),          # ☾ (Kara Ay)
    ("kuzey",   "Kuzey Düğüm",   9738, "Gelişim yönü"),          # ☊
    ("guney",   "Güney Düğüm",   9739, "Karmik geçmiş"),         # ☋
    ("chiron",  "Kiron",         9911, "Yara ve şifa"),          # ⚷
]


def karmik_points(t, y, mo, d, h, mi, asc_si):
    """4 karmik noktayı (Lilith, Kuzey/Güney Düğüm, Kiron) chart 'planet' şemasında döndürür."""
    nn = mean_node_lon(t)
    lons = {
        "lilith": mean_lilith_lon(t),
        "kuzey": nn,
        "guney": (nn + 180.0) % 360.0,
        "chiron": chiron_lon(t, y, mo, d, h, mi),
    }
    out = []
    for pid, ad, glyph, anlam in KARMIK_BODIES:
        L = lons[pid]
        si = C.sign_idx(L)
        house = ((si - asc_si) % 12) + 1
        out.append({
            "id": pid, "glyph": glyph, "ad": ad, "lon": round(L, 2),
            "sign": C.SIGNS[si], "deg": C.deg_str(L), "sign_idx": si,
            "element": C.element_of(si), "modality": C.modality_of(si),
            "house": house, "anlam": anlam,
        })
    return out
