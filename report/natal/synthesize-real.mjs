// synthesize-real.mjs — FAZ 4 zinciri: compute chart.json + selectBlocks -> Claude sentez -> rapor.
// compute.py(chart.json) + selectBlocks(aktif-bloklar.json) + natal-blocks.json + v5 prompt(Opus 4.8)
// Çalıştır (repo kökünden):  node report/natal/synthesize-real.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

// --- .env.local'den ANTHROPIC_API_KEY ---
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
  if (line.trim().startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("="); const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim();
  if (k) process.env[k] = v;
}
const client = new Anthropic();

// --- Girdiler ---
const chart = JSON.parse(fs.readFileSync(path.join(HERE, "chart.json"), "utf8"));
const sel = JSON.parse(fs.readFileSync(path.join(HERE, "aktif-bloklar.json"), "utf8"));
const product = process.argv[2] || "natal";
const isSinastri = product.startsWith("sinastri") || chart.tip === "sinastri";
const allBlocks = JSON.parse(fs.readFileSync(path.join(ROOT, "src/blocks/" + (isSinastri ? "sinastri-blocks.json" : "natal-blocks.json")), "utf8"));
const URUN_AD = { natal: "Doğum Haritası (Natal)", ask: "Aşk & İlişki Haritası (doğum haritasının aşk odaklı okuması)", kariyer: "Kariyer & Para Haritası (doğum haritasının kariyer ve para odaklı okuması)", saglik: "Sağlık & Enerji Haritası (doğum haritasının sağlık ve enerji odaklı okuması)", solar: "Solar Return / Yıl Haritası (doğum gününden bir sonrakine, o yılın gökyüzü teması)", lilith: "Lilith & Karmik Harita (doğum haritasının gölge, karma ve ruhsal yolculuk okuması)", "sinastri-sevgili": "Sevgili/Eş Uyum Raporu (iki doğum haritasının birbirine etkisi, çekim ve uyum dinamikleri)", "sinastri-arkadas": "Arkadaşlık Uyum Raporu (iki doğum haritasının dostluk uyumu ve dinamikleri)" };
const system = fs.readFileSync(path.join(ROOT, `src/prompts/synthesis-${product}.md`), "utf8");

const KW_AD = { gunes: "Güneş", ay: "Ay", merkur: "Merkür", venus: "Venüs", mars: "Mars", jupiter: "Jüpiter", saturn: "Satürn", yukselen: "Yükselen" };
const ASP_AD = { kavusum: "kavuşum", altmislik: "altmışlık", ucgen: "üçgen", kare: "kare", karsitlik: "karşıt" };

// --- aktif bloklar (selectBlocks sırasını koru; eksikleri atla+uyar) ---
const byId = new Map(allBlocks.map((b) => [b.id, b]));
const selected = []; const missing = [];
for (const id of sel.aktif_bloklar) (byId.has(id) ? selected.push(byId.get(id)) : missing.push(id));
if (missing.length) console.warn("⚠️  Eksik blok (atlandı):", missing.join(", "));
console.log(`ℹ️  ${selected.length}/${sel.aktif_bloklar.length} blok eşleşti.`);

const blokMetni = selected.map((b) => [
  `### ${b.faktor}  [${b.id}]`,
  `- Anahtar: ${b.anahtar.join(", ")}`,
  `- Anlam: ${b.anlam}`,
  `- Güçlü: ${b.guclu}`,
  `- Gölge: ${b.golge}`,
  `- Ton: ${b.ton}`,
].join("\n"));

let userMessage;
if (isSinastri) {
  // --- İki harita + çapraz açılar + ev bindirmeleri ---
  const ozet = (c) => [
    `- Yükselen: ${c.asc.sign}, ${c.asc.deg}`,
    ...c.planets.map((p) => `- ${p.ad}: ${p.sign}, ${p.deg}, ${p.house}. ev`),
    `- Element: Ateş %${c.elements["Ateş"]}, Toprak %${c.elements["Toprak"]}, Hava %${c.elements["Hava"]}, Su %${c.elements["Su"]} · Mizaç: ${c.mizac.ad}`,
  ];
  const A = chart.person_a, B = chart.person_b;
  const acilar = chart.synastry_aspects.map(
    (a) => `- ${a.a_ad} (${A.meta.ad}) ${ASP_AD[a.type]} ${a.b_ad} (${B.meta.ad})  [${a.uyum}, ${a.orb}°]`);
  const bindir = [
    ...chart.overlays_ab.map((o) => `- ${A.meta.ad}'nin ${o.ad}'i, ${B.meta.ad}'nin ${o.house}. evinde`),
    ...chart.overlays_ba.map((o) => `- ${B.meta.ad}'nin ${o.ad}'i, ${A.meta.ad}'nin ${o.house}. evinde`),
  ];
  userMessage = [
    "## ÇİFT", `Ürün: ${URUN_AD[product]}`,
    `Kişi A: ${A.meta.ad} — ${A.meta.dogum}`,
    `Kişi B: ${B.meta.ad} — ${B.meta.dogum}`, "",
    `## ${A.meta.ad} HARİTA ÖZETİ`, ...ozet(A), "",
    `## ${B.meta.ad} HARİTA ÖZETİ`, ...ozet(B), "",
    "## ÇAPRAZ AÇILAR (aralarındaki bağlar — en güçlüden, uyum sınıfıyla)", ...acilar, "",
    "## EV BİNDİRMELERİ (kimin gezegeni diğerinin hangi yaşam alanını aktive ediyor)", ...bindir, "",
    "## ANLAM BLOKLARI (yalnızca bunları kullan)", ...blokMetni, "",
    `Yukarıdaki iki haritanın birbirine etkisini, çapraz açıları ve bindirmeleri verilen bloklarla harmanlayıp ${A.meta.ad} ile ${B.meta.ad} için sistem promptundaki çıktı formatına uygun, akıcı bir uyum raporu yaz. İkisine de adıyla hitap et; "ikiniz / aranızda" dilini kullan. Sadece raporu yaz; düşünce sürecini yazma.`,
  ].join("\n");
} else {
  // --- Tek harita (natal / ask / kariyer / saglik / solar / lilith) ---
  const haritaOzeti = {};
  haritaOzeti["Yükselen"] = `${chart.asc.sign}, ${chart.asc.deg}`;
  for (const p of chart.planets) haritaOzeti[p.ad] = `${p.sign}, ${p.deg}, ${p.house}. ev`;
  const acilar = chart.aspects.map((a) => `${KW_AD[a.a]} - ${KW_AD[a.b]}: ${ASP_AD[a.type]}`);
  const elDag = chart.elements;
  userMessage = [
    "## KİŞİ", `İsim: ${chart.meta.ad}`, `Ürün: ${URUN_AD[product] || "Doğum Haritası"}`, `Doğum: ${chart.meta.dogum}`, "",
    "## HARİTA ÖZETİ", ...Object.entries(haritaOzeti).map(([k, v]) => `- ${k}: ${v}`), "",
    "## AÇILAR", ...acilar.map((a) => `- ${a}`), "",
    ...(chart.karmik ? ["## KARMİK NOKTALAR (Lilith & Karmik motoru)",
                        ...chart.karmik.map((p) => `- ${p.ad}: ${p.sign} ${p.deg}, ${p.house}. ev`), ""] : []),
    "## ELEMENT & MİZAÇ (motordan hesaplandı)",
    `- Element dağılımı: Ateş %${elDag["Ateş"]}, Toprak %${elDag["Toprak"]}, Hava %${elDag["Hava"]}, Su %${elDag["Su"]}`,
    `- Mizaç: ${chart.mizac.ad} (${chart.mizac.tabiat})`, "",
    "## ANLAM BLOKLARI (yalnızca bunları kullan)", ...blokMetni, "",
    `Yukarıdaki verileri ve blokları harmanlayıp ${chart.meta.ad} için sistem promptundaki çıktı formatına uygun, akıcı bir rapor yaz. Sadece raporu yaz; düşünce sürecini yazma.`,
  ].join("\n");
}

const MODEL = "claude-opus-4-8";
const OUT = path.join(HERE, `rapor-${product}.txt`);

// Em-dash (—, U+2014) temizliği: bağlaçtan önceyse boşluk, değilse virgül. Kısa tire (–, U+2013) dokunulmaz.
function stripEmDash(s) {
  return s
    .replace(/\s*—\s*(ve|ya da|ki|ama|ancak|fakat|çünkü)\b/g, " $1")
    .replace(/\s*—\s*/g, ", ");
}
// Ürün başına ZORUNLU başlıklar — biri eksik/boşsa rapor kusurlu (müşteriye gitmemeli).
const REQUIRED = {
  natal: ["İmza Sentezi", "Sen Kimsin", "Dışarıya Yansıman", "Duygusal Dünyan", "Zihnin", "Aşk", "Kariyer", "Sağlık", "Güçlü", "Element Yorumu"],
  ask: ["İmza Sentezi", "Sevgi Dilin", "Çekim", "İlişkide Duruşun", "Duygusal İhtiyaçların", "Yakınlık", "Aşkta Kalıpların", "Sana Yakışan Bağ", "Element Yorumu"],
  kariyer: ["İmza Sentezi", "İş Kimliğin", "Çalışma Tarzın", "Para ile İlişkin", "Kariyer Yönün", "Büyüme", "Zorluk", "Sana Yakışan Yol", "Element Yorumu"],
  saglik: ["İmza Sentezi", "Enerji İmzan", "Bedensel Yapın", "Günlük Sağlık", "Stres", "Güçlü ve Hassas", "Yenilenme", "Sana Yakışan Yaşam Ritmi", "Element Yorumu"],
  solar: ["İmza Sentezi", "Yılın Tonu", "Yılın Odağı", "Duygusal İklim", "Öne Çıkan Alanlar", "Fırsat ve Akış", "Zorluk ve Gerilim", "Yılın Daveti", "Element Yorumu"],
  lilith: ["İmza Sentezi", "Gölgen", "Karmik Geçmiş", "Ruhsal Gelişim", "Yaran", "Tekrar Eden", "Ruhsal Bütünleşme", "Element Yorumu"],
  "sinastri-sevgili": ["İmza Sentezi", "İlişki İmzanız", "İlk Çekim", "Duygusal Bağ", "Zihinsel", "Tutku ve Yakınlık", "Güven ve Süreklilik", "Çatışma", "Birlikte Büyümek", "Element Uyumu"],
  "sinastri-arkadas": ["İmza Sentezi", "İlişki İmzanız", "İlk Tanışma", "Duygusal Anlayış", "Zihinsel Uyum", "Ortak Enerji", "Güven ve Sadakat", "Sürtüşme", "Dostluğunuzu", "Element Uyumu"],
};
// Metni ## başlıklara böl, her başlığın gövdesi dolu mu bak.
function sectionsOf(text) {
  const map = {}; let cur = null, buf = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) { if (cur !== null) map[cur] = buf.join("\n").trim(); cur = m[1].trim(); buf = []; }
    else if (cur !== null) buf.push(line);
  }
  if (cur !== null) map[cur] = buf.join("\n").trim();
  return map;
}
function missingSections(text, req) {
  const secs = sectionsOf(text); const heads = Object.keys(secs);
  return req.filter((key) => { const h = heads.find((x) => x.includes(key)); return !h || !secs[h]; });
}

console.log(`\n${"=".repeat(60)}\n  MODEL: ${MODEL} (gerçek chart + otomatik selectBlocks)\n${"=".repeat(60)}`);
const req = REQUIRED[product] || [];
const MAX_ATTEMPTS = 3;
let text = "", fin = null, miss = [];
try {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) console.warn(`\n⚠️  Eksik/boş bölüm: [${miss.join(", ")}] → yeniden üretiliyor (deneme ${attempt}/${MAX_ATTEMPTS})...\n`);
    const stream = client.messages.stream({
      model: MODEL, max_tokens: 14000, thinking: { type: "disabled" },
      system, messages: [{ role: "user", content: userMessage }],
    });
    stream.on("text", (d) => process.stdout.write(d));
    fin = await stream.finalMessage();
    text = stripEmDash(fin.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
    miss = missingSections(text, req);
    if (!miss.length) break;
  }
  fs.writeFileSync(OUT, text, "utf8");
  if (miss.length) {
    console.error(`\n\n⛔ HATA: ${MAX_ATTEMPTS} denemede de eksik/boş bölüm var: [${miss.join(", ")}].`);
    console.error("   Bu rapor KUSURLU — RENDER ETME / MÜŞTERİYE GÖNDERME. Tekrar çalıştır ya da prompt'u gözden geçir.");
    process.exit(1);
  }
  console.log(`\n\n[✓ ${OUT} | token: girdi ${fin.usage.input_tokens}, çıktı ${fin.usage.output_tokens} | ${fin.stop_reason} | ${req.length} bölüm tam]`);
} catch (e) {
  console.error("❌", e instanceof Anthropic.APIError ? `API ${e.status}: ${e.message}` : e.message);
  process.exit(1);
}
