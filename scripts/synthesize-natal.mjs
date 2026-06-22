// Doğum haritası sentez script'i.
// test/sample-chart-v3.json'u okur, element/mizaç'ı src/lib/element-mizac.mjs
// motorundan hesaplar, aktif_bloklar'a göre blokları çeker,
// synthesis-natal.md'yi system olarak kullanır, Claude'a gönderir,
// raporu output/ altına yazar ve konsola basar.
//
// Çalıştır: node scripts/synthesize-natal.mjs

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { elementMizacHesapla } from "../src/lib/element-mizac.mjs";

// --- .env.local'den ANTHROPIC_API_KEY yükle (Next.js dışında çalıştığımız için elle) ---
const envText = fs.readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  if (line.trim().startsWith("#") || !line.includes("=")) continue;
  const idx = line.indexOf("=");
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim();
  if (k) process.env[k] = v;
}

const client = new Anthropic();

// --- Girdileri oku ---
const chart = JSON.parse(fs.readFileSync("test/sample-chart-v3.json", "utf8"));

// --- Element & mizaç'ı GERÇEK motordan hesapla (asla elle girme) ---
const em = elementMizacHesapla(chart.harita_ozeti);
chart.element_dagilim = em.yuzde; // {ates,toprak,hava,su}
chart.mizac = em.mizac.ad; // "Safravi" vb.
console.log("[ELEMENT/MİZAÇ]", em.yuzde, "baskın:", em.baskin_ad, "mizaç:", em.mizac.ad);

const allBlocks = JSON.parse(fs.readFileSync("src/blocks/natal-blocks.json", "utf8"));
const system = fs.readFileSync("src/prompts/synthesis-natal.md", "utf8");

// --- aktif_bloklar'a göre blokları çek (sıra korunur, eksikleri uyar) ---
const blockById = new Map(allBlocks.map((b) => [b.id, b]));
const selected = [];
const missing = [];
for (const id of chart.aktif_bloklar) {
  if (blockById.has(id)) selected.push(blockById.get(id));
  else missing.push(id);
}
if (missing.length) {
  console.warn("⚠️  Bulunamayan bloklar (atlandı):", missing.join(", "));
}
console.log(`ℹ️  ${selected.length}/${chart.aktif_bloklar.length} blok eşleşti.`);

// --- User mesajını kur (harita verisi + anlam blokları) ---
const userMessage = [
  "## KİŞİ",
  `İsim: ${chart.kisi.isim}`,
  `Cinsiyet: ${chart.kisi.cinsiyet}`,
  `Ürün: ${chart.urun}`,
  "",
  "## HARİTA ÖZETİ",
  ...Object.entries(chart.harita_ozeti).map(([k, v]) => `- ${k}: ${v}`),
  "",
  "## AÇILAR",
  ...chart.acilar.map((a) => `- ${a}`),
  "",
  "## ELEMENT & MİZAÇ (motordan hesaplandı)",
  `- Element dağılımı: Ateş %${em.yuzde.ates}, Toprak %${em.yuzde.toprak}, Hava %${em.yuzde.hava}, Su %${em.yuzde.su}`,
  `- Baskın element: ${em.baskin_ad} (anlamı: ${em.element_anlam[em.baskin]})`,
  `- Mizaç: ${em.mizac.ad} (${em.mizac.lat}, ${em.mizac.tabiat})`,
  "",
  "## ANLAM BLOKLARI (yalnızca bunları kullan)",
  ...selected.map((b) =>
    [
      `### ${b.faktor}  [${b.id}]`,
      `- Anahtar: ${b.anahtar.join(", ")}`,
      `- Anlam: ${b.anlam}`,
      `- Güçlü: ${b.guclu}`,
      `- Gölge: ${b.golge}`,
      `- Ton: ${b.ton}`,
    ].join("\n"),
  ),
  "",
  `Yukarıdaki verileri ve blokları harmanlayıp ${chart.kisi.isim} için sistem promptundaki çıktı formatına uygun, akıcı bir doğum haritası raporu yaz. Sadece raporu yaz; düşünce/akıl yürütme sürecini yazma.`,
].join("\n");

// --- Çalıştır (Opus 4.8'de karar kılındı), streaming ile çıktıyı dosyaya yaz ---
const MODEL = "claude-opus-4-8";
const MAX_TOKENS = 14000; // rapor ~3500 kelime hedefli; uzun çıktı için streaming
const OUT_PATH = "output/rapor-ayse-v6.txt";

console.log(`\n${"=".repeat(60)}\n  MODEL: ${MODEL}  (max_tokens: ${MAX_TOKENS}, streaming)\n${"=".repeat(60)}`);
try {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" }, // tüm bütçe rapora gitsin
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  // Metni geldikçe konsola bas
  stream.on("text", (delta) => process.stdout.write(delta));

  const finalMessage = await stream.finalMessage();
  const text = finalMessage.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  fs.writeFileSync(OUT_PATH, text, "utf8");

  console.log(
    `\n\n[✓ Kaydedildi: ${OUT_PATH} | token: girdi ${finalMessage.usage.input_tokens}, çıktı ${finalMessage.usage.output_tokens} | stop_reason: ${finalMessage.stop_reason}]`,
  );
  if (finalMessage.stop_reason === "max_tokens") {
    console.warn(`⚠️  Çıktı ${MAX_TOKENS} token sınırına takıldı, rapor kesilmiş olabilir.`);
  }
} catch (e) {
  if (e instanceof Anthropic.APIError) {
    console.error(`❌ API hatası (${e.status}): ${e.message}`);
  } else {
    console.error("❌ Beklenmeyen hata:", e.message);
  }
}
