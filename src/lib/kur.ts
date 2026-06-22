// Canlı USD→TRY kuru. open.er-api.com (ücretsiz, anahtarsız) üzerinden çekilir,
// .data/kur.json'a 6 saat cache'lenir. Çekim başarısızsa son bilinen kur (yoksa makul varsayılan) döner.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), ".data");
const CACHE = path.join(DIR, "kur.json");
const TTL_MS = 6 * 60 * 60 * 1000; // 6 saat
const FALLBACK = 40; // hiç veri yoksa kaba varsayılan

type KurCache = { rate: number; ts: number };

function read(): KurCache | null {
  try { return JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch { return null; }
}
function write(c: KurCache) {
  try { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(c)); } catch {}
}

export async function getUsdTry(): Promise<number> {
  const cached = read();
  const now = Date.now();
  if (cached && now - cached.ts < TTL_MS && cached.rate > 0) return cached.rate;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const rate = Number(data?.rates?.TRY);
    if (rate && rate > 0) { write({ rate, ts: now }); return rate; }
  } catch {}

  // Çekim başarısız → son bilinen kur, o da yoksa varsayılan
  return cached?.rate && cached.rate > 0 ? cached.rate : FALLBACK;
}
