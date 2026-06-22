// Serbest metin (şehir, ülke) -> koordinat. Yurtdışı doğum için (TR illeri tablodan çözülür).
// OpenStreetMap Nominatim (ücretsiz, anahtarsız). Düşük hacim için uygun; User-Agent zorunlu.
export async function geocode(query: string): Promise<[number, number] | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=tr&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "User-Agent": "gokname.com (astroloji raporu geocode)" } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) return null;
    const lat = parseFloat(j[0].lat);
    const lon = parseFloat(j[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return [lat, lon];
  } catch {
    return null;
  }
}
