// synthesize-kilavuz.mjs — Seans Kılavuzu (4-5 sayfalık mini rapor) metni.
// Girdi : $NATAL_IO/sayfalar.json  (ana rapor PDF'inin sayfa sayfa metni: kilavuz_pro.py metin)
// Çıktı : $NATAL_IO/kilavuz.json   { metin, usage, maliyet_usd }
// Sayfa atıfları gerçek PDF sayfalarından gelir; model yalnız metinde geçen sayfaya atıf yapabilir.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const IO = process.env.NATAL_IO || HERE;
const envLocal = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
    if (line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("="); const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}
if (!process.env.ANTHROPIC_API_KEY) { console.error("HATA: ANTHROPIC_API_KEY tanımlı değil."); process.exit(1); }

const MODEL = process.env.PRO_MODEL || "claude-opus-5-5";
const EFFORT = process.env.PRO_EFFORT || "medium";
const FIYAT = { "claude-opus-5-5": [4, 20, 5, 0.4], "claude-fable-5-1": [10, 50, 12.5, 0.25] };
const client = new Anthropic({ maxRetries: 0 });

const veri = JSON.parse(fs.readFileSync(path.join(IO, "sayfalar.json"), "utf8"));
const SYSTEM = fs.readFileSync(path.join(ROOT, "src/prompts/pro-kilavuz.md"), "utf8");
const metin = veri.sayfalar.map((t, i) => `=== SAYFA ${i + 1} ===\n${t.trim()}`).join("\n\n");
const user = `Ana rapor: ${veri.urun_ad} · Danışan: ${veri.ad} · Toplam ${veri.sayfalar.length} sayfa.\n\n` +
  `Aşağıda ana raporun sayfa sayfa metni var. Buna dayanarak Seans Kılavuzunu yaz.\n\n${metin}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function gecici(e) {
  const s = e?.status; const t = e?.error?.error?.type || e?.error?.type;
  if (t === "overloaded_error" || t === "api_error") return true;
  if (s === 429 || s === 408 || s === 409 || (s >= 500 && s <= 599)) return true;
  return s === undefined && /overload|timeout|abort|ECONNRESET|ETIMEDOUT|fetch failed|socket/i.test(e?.message || "");
}

const t0 = Date.now();
let fin;
for (let r = 0; ; r++) {
  try {
    const stream = client.beta.messages.stream({
      model: MODEL, max_tokens: 16000, output_config: { effort: EFFORT },
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      system: SYSTEM, messages: [{ role: "user", content: user }],
    });
    fin = await stream.finalMessage();
    if (fin.stop_reason === "refusal") throw Object.assign(new Error("Model kılavuzu reddetti"), { kalici: true });
    break;
  } catch (e) {
    if (e.kalici || r >= 4 || !gecici(e)) { console.error("❌", e.message); process.exit(1); }
    await sleep(Math.min(2 ** (r + 1) * 1000, 30000));
  }
}
let txt = fin.content.filter((x) => x.type === "text").map((x) => x.text).join("")
  .replace(/\s*—\s*/g, ", ").replace(/^#{1,2}\s+.*\n+/, "").trim();
// Sayfa atfı denetimi: mevcut sayfa aralığı dışındaki atıfları temizle
const N = veri.sayfalar.length;
txt = txt.replace(/\(→\s*s\.\s*([\d\s,–-]+)\)/g, (m, g) => {
  const ok = g.split(/[,–-]/).map((x) => parseInt(x, 10)).every((n) => n >= 1 && n <= N);
  return ok ? m : "";
});
const u = fin.usage || {};
const [pin, pout, pcw, pcr] = FIYAT[MODEL] || FIYAT["claude-opus-5-5"];
const usd = ((u.input_tokens || 0) * pin + (u.output_tokens || 0) * pout + (u.cache_creation_input_tokens || 0) * pcw + (u.cache_read_input_tokens || 0) * pcr) / 1e6;
const kelime = txt.split(/\s+/).filter(Boolean).length;
fs.writeFileSync(path.join(IO, "kilavuz.json"), JSON.stringify({ metin: txt, kelime, model: MODEL, usage: u, maliyet_usd: Number(usd.toFixed(4)) }, null, 2), "utf8");
console.error(`[✓ kilavuz.json | ${kelime} kelime · ${Math.round((Date.now() - t0) / 1000)} sn | girdi ${u.input_tokens}, çıktı ${u.output_tokens} | ~$${usd.toFixed(3)}]`);
console.log(`PRO_MALIYET ${JSON.stringify({ usd: Number(usd.toFixed(4)), girdi: u.input_tokens || 0, cikti: u.output_tokens || 0, model: MODEL, sure: Math.round((Date.now() - t0) / 1000) })}`);
