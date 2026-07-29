"""compute_aylik.py — Aylık burç yorumu: natal harita + O ANKİ AY'ın gök geçişleri (transit).

Yaklaşım: kişinin natal haritası (compute_chart) + üretim anındaki gökyüzü (transit) hesaplanır;
transit gezegenlerin natal gezegenlere açıları ve natal evlere düşüşü çıkarılır. "Bu ayın enerjisi"
bu transit verisinden yorumlanır. Çıktı chart.json = natal harita (görsel/tablo için) + `aylik` bloğu.
"""
import os
import sys
import json
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from compute import compute_chart, compute_chart_at, geocode, get_timescale, ASPECTS, AYLAR, REFERENCE

HERE = os.path.dirname(os.path.abspath(__file__))
IO = os.environ.get("NATAL_IO") or HERE
TR = ZoneInfo("Europe/Istanbul")


def transit_to_natal(transit, natal):
    """Transit gezegenlerin natal gezegenlere açıları (en sıkı orb önde)."""
    out = []
    for tp in transit["planets"]:
        for npl in natal["planets"]:
            diff = abs(tp["lon"] - npl["lon"]) % 360.0
            if diff > 180:
                diff = 360 - diff
            for typ, exact, orb, color in ASPECTS:
                if abs(diff - exact) <= orb:
                    out.append({"t": tp["ad"], "n": npl["ad"], "type": typ,
                                "orb": round(abs(diff - exact), 2), "color": color})
                    break
    out.sort(key=lambda x: x["orb"])
    return out


def main():
    bpath = os.path.join(IO, "birth.json")
    birth = json.load(open(bpath, encoding="utf-8")) if os.path.exists(bpath) else REFERENCE

    natal = compute_chart(birth)
    lat, lon_geo = geocode(birth)
    ts = get_timescale()

    now = datetime.now(TR)
    now_utc = now.astimezone(timezone.utc)
    transit = compute_chart_at(ts.from_datetime(now_utc), lat, lon_geo, "Gökyüzü", "")
    transit_ertesi = compute_chart_at(ts.from_datetime(now_utc + timedelta(days=1)), lat, lon_geo, "Gökyüzü", "")
    # Retro tespiti: 1 gün sonra boylam azalıyorsa geri hareket
    for p, p2 in zip(transit["planets"], transit_ertesi["planets"]):
        d = ((p2["lon"] - p["lon"]) + 540) % 360 - 180
        p["retro"] = bool(d < 0)

    asc_idx = natal["asc"]["sign_idx"]
    ay = f"{AYLAR[now.month - 1]} {now.year}"

    chart = dict(natal)  # görseller (çark, tablo, element, mizaç) natal haritadan
    chart["aylik"] = {
        "ay": ay,
        "transitler": [
            {"ad": p["ad"], "sign": p["sign"], "deg": p["deg"], "retro": p["retro"],
             "house": ((p["sign_idx"] - asc_idx) % 12) + 1}
            for p in transit["planets"]
        ],
        "aspects": transit_to_natal(transit, natal),
    }

    out = os.path.join(IO, "chart.json")
    json.dump(chart, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"ok -> chart.json (aylık: {ay} | {len(chart['aylik']['aspects'])} transit açısı)")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
