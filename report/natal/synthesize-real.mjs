// synthesize-real.mjs — FAZ 4 zinciri: compute chart.json + selectBlocks -> Claude sentez -> rapor.
// compute.py(chart.json) + selectBlocks(aktif-bloklar.json) + natal-blocks.json + v5 prompt(Sonnet 5)
// Çalıştır (repo kökünden):  node report/natal/synthesize-real.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const IO = process.env.NATAL_IO || HERE; // işe-özel I/O (eşzamanlılık izolasyonu); yoksa script dizini

// --- ANTHROPIC_API_KEY: önce process.env (EasyPanel/Docker ortam değişkeni),
//     yoksa .env.local (yerel geliştirme). Prod'da .env.local imajda bulunmaz; çökmemeli. ---
const envLocal = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
    if (line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("="); const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v; // ortam değişkeni önceliklidir
  }
}
// --- Sağlayıcı seçimi: LLM_PROVIDER=anthropic (VARSAYILAN) | gemini.
//     Claude ayarları korunur; LLM_PROVIDER=gemini ile Gemini'ye geçilir, değişkeni kaldırınca Claude'a döner. ---
const PROVIDER = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
const MODEL = PROVIDER === "gemini"
  ? (process.env.GEMINI_MODEL || "gemini-2.5-flash") // GEMINI_MODEL=gemini-2.5-pro daha kaliteli
  : "claude-sonnet-5";                               // Claude tarafı: Sonnet 5 (değişmedi)
// Haiku (eski nesil) thinking:{disabled}'ı farklı ele alır; Sonnet 5'te açıkça disabled (Gemini'de kullanılmaz).
const THINKING = MODEL.startsWith("claude-haiku") ? {} : { thinking: { type: "disabled" } };

if (PROVIDER === "gemini") {
  if (!process.env.GEMINI_API_KEY) { console.error("HATA: GEMINI_API_KEY tanımlı değil (ne ortam değişkeni ne .env.local)."); process.exit(1); }
} else if (!process.env.ANTHROPIC_API_KEY) {
  console.error("HATA: ANTHROPIC_API_KEY tanımlı değil (ne ortam değişkeni ne .env.local)."); process.exit(1);
}
const client = PROVIDER === "gemini" ? null : new Anthropic({ maxRetries: 0 }); // retry'ı aşağıda elle yönetiyoruz

// --- Girdiler ---
const chart = JSON.parse(fs.readFileSync(path.join(IO, "chart.json"), "utf8"));
const sel = JSON.parse(fs.readFileSync(path.join(IO, "aktif-bloklar.json"), "utf8"));
const product = process.argv[2] || "natal";
const isSinastri = product.startsWith("sinastri") || chart.tip === "sinastri";
const allBlocks = JSON.parse(fs.readFileSync(path.join(ROOT, "src/blocks/" + (isSinastri ? "sinastri-blocks.json" : "natal-blocks.json")), "utf8"));
const URUN_AD = { natal: "Doğum Haritası (Natal)", ask: "Aşk & İlişki Haritası (doğum haritasının aşk odaklı okuması)", kariyer: "Kariyer & Para Haritası (doğum haritasının kariyer ve para odaklı okuması)", saglik: "Enerji & Mizaç Haritası (doğum haritasının enerji ve mizaç odaklı okuması)", solar: "Solar Return / Yıl Haritası (doğum gününden bir sonrakine, o yılın gökyüzü teması)", aylik: "Aylık Burç Yorumu (doğum haritasının o ayki gök geçişleriyle/transitleriyle okunması)", lilith: "Lilith & Karmik Harita (doğum haritasının gölge, karma ve ruhsal yolculuk okuması)", "sinastri-sevgili": "Sevgili/Eş Uyum Raporu (iki doğum haritasının birbirine etkisi, çekim ve uyum dinamikleri)", "sinastri-arkadas": "Arkadaşlık Uyum Raporu (iki doğum haritasının dostluk uyumu ve dinamikleri)" };
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
    // Aylık burç yorumu: o ayın gökyüzü (transit) verisi
    ...(chart.aylik ? [
      `## BU AYIN GÖKYÜZÜ — ${chart.aylik.ay} (transit; yorumun ODAĞI budur)`,
      "Bu ayki gezegenlerin burcu ve SENİN natal evlerinden hangisini aktive ettiği:",
      ...chart.aylik.transitler.map((t) => `- ${t.ad}: ${t.sign}${t.retro ? " (retro/geri)" : ""} — senin ${t.house}. evinde`),
      "",
      "### Bu ayın tetiklediği natal temalar (transit açıları, en sıkıdan)",
      ...chart.aylik.aspects.slice(0, 14).map((a) => `- transit ${a.t} ${ASP_AD[a.type]} natal ${a.n} (${a.orb}°)`),
      "",
    ] : []),
    "## ANLAM BLOKLARI (yalnızca bunları kullan)", ...blokMetni, "",
    chart.aylik
      ? `Yukarıdaki natal haritayı BU AYIN gökyüzü (transit) verisiyle harmanlayıp ${chart.meta.ad} için ${chart.aylik.ay} aylık burç yorumunu yaz. Odak: bu ay hangi enerjiler öne çıkıyor, hangi yaşam alanları (evler) aktive oluyor, fırsat ve dikkat alanları neler. Natal blokları o ayın transitleriyle bağla. Sistem promptundaki çıktı formatına uy. Sadece raporu yaz; düşünce sürecini yazma.`
      : `Yukarıdaki verileri ve blokları harmanlayıp ${chart.meta.ad} için sistem promptundaki çıktı formatına uygun, akıcı bir rapor yaz. Sadece raporu yaz; düşünce sürecini yazma.`,
  ].join("\n");
}

const OUT = path.join(IO, `rapor-${product}.txt`);

// Em-dash (—, U+2014) temizliği: bağlaçtan önceyse boşluk, değilse virgül. Kısa tire (–, U+2013) dokunulmaz.
function stripEmDash(s) {
  return s
    .replace(/\s*—\s*(ve|ya da|ki|ama|ancak|fakat|çünkü)\b/g, " $1")
    .replace(/\s*—\s*/g, ", ");
}
// Model başlık formatı kaydırırsa tolere et: "1. **Başlık**" ve "**Başlık**" (zorunlu başlıksa)
// satırları kanonik "## Başlık"a çevrilir. Aksi halde parser bölümleri boş sanıp TÜM raporu
// yeniden ürettiriyordu (rapor başına ~2x token maliyeti). Çıktı dosyasına da normalize hali yazılır
// ki render.py aynı formatı görsün.
function normalizeHeadings(text, req) {
  return text.split("\n").map((line) => {
    if (/^\s{0,3}##\s+/.test(line)) return line;
    let m = line.match(/^\s{0,3}\d+[.)]\s*\*\*(.+?)\*\*[:\s]*$/); // 1. **Başlık**
    if (m) return "## " + m[1].trim();
    m = line.match(/^\s{0,3}\*\*(.+?)\*\*[:\s]*$/);               // **Başlık** — yalnız zorunlu başlık listesindeyse
    if (m && req.some((k) => m[1].includes(k))) return "## " + m[1].trim();
    return line;
  }).join("\n");
}
// Ürün başına ZORUNLU başlıklar — biri eksik/boşsa rapor kusurlu (müşteriye gitmemeli).
const REQUIRED = {
  natal: ["İmza Sentezi", "Sen Kimsin", "Dışarıya Yansıman", "Duygusal Dünyan", "Zihnin", "Aşk", "Kariyer", "Sağlık", "Güçlü", "Element Yorumu"],
  ask: ["İmza Sentezi", "Sevgi Dilin", "Çekim", "İlişkide Duruşun", "Duygusal İhtiyaçların", "Yakınlık", "Aşkta Kalıpların", "Sana Yakışan Bağ", "Element Yorumu"],
  kariyer: ["İmza Sentezi", "İş Kimliğin", "Çalışma Tarzın", "Para ile İlişkin", "Kariyer Yönün", "Büyüme", "Zorluk", "Sana Yakışan Yol", "Element Yorumu"],
  saglik: ["İmza Sentezi", "Enerji İmzan", "Bedensel Yapın", "Günlük Enerji", "Stres", "Güçlü ve Hassas", "Yenilenme", "Sana Yakışan Yaşam Ritmi", "Element Yorumu"],
  solar: ["İmza Sentezi", "Yılın Tonu", "Yılın Odağı", "Duygusal İklim", "Öne Çıkan Alanlar", "Fırsat ve Akış", "Zorluk ve Gerilim", "Yılın Daveti", "Element Yorumu"],
  aylik: ["İmza Sentezi", "Ayın Tonu", "Öne Çıkan", "Aşk", "İş", "Enerji", "Fırsat", "Dikkat", "Element Yorumu"],
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

// --- DRY-RUN: `--dry-run` bayrağıyla üretim YAPMADAN prompt boyutunu ölç (countTokens ücretsizdir).
//     Maliyet mühendisliği için: ürün başına girdi tokenını API faturası ödemeden raporlar. ---
if (process.argv.includes("--dry-run")) {
  let girdiTok = "?";
  if (PROVIDER === "gemini") {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:countTokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ generateContentRequest: { model: `models/${MODEL}`,
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }] } }),
    });
    const d = await r.json();
    girdiTok = d.totalTokens ?? `HATA: ${JSON.stringify(d).slice(0, 160)}`;
  }
  console.log(`[dry-run ${product}] girdi: ${girdiTok} token (sistem ${system.length} + kullanıcı ${userMessage.length} karakter) | zorunlu bölüm: ${(REQUIRED[product] || []).length}`);
  process.exit(0);
}

console.error(`\n${"=".repeat(60)}\n  SAĞLAYICI: ${PROVIDER} · MODEL: ${MODEL}\n${"=".repeat(60)}`); // stderr → container logunda görünür
const req = REQUIRED[product] || [];
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Geçici (retry edilebilir) hata mı? Overloaded (529), rate limit (429), 5xx, ağ kopması.
function isTransient(e) {
  const status = e?.status;
  const type = e?.error?.error?.type || e?.error?.type;
  if (type === "overloaded_error" || type === "api_error") return true;
  if (status === 429 || status === 408 || status === 409 || (status >= 500 && status <= 599)) return true;
  if (status === undefined && /overload|timeout|abort|ECONNRESET|ETIMEDOUT|fetch failed/i.test(e?.message || "")) return true;
  return false;
}
// --- Sağlayıcı-bağımsız tek üretim: { text, input, output, stop } döndürür ---
// Anthropic (Claude): streaming + canlı stdout.
async function generateAnthropic(msg) {
  const stream = client.messages.stream({
    model: MODEL, max_tokens: 14000, ...THINKING,
    system, messages: [{ role: "user", content: msg }],
  });
  stream.on("text", (d) => process.stdout.write(d));
  const fin = await stream.finalMessage();
  return {
    text: fin.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
    input: fin.usage.input_tokens, output: fin.usage.output_tokens, stop: fin.stop_reason,
  };
}
// Gemini (Google): REST generateContent (yeni bağımlılık yok). Astroloji içeriği bloklanmasın diye güvenlik eşikleri gevşek.
async function generateGemini(msg) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: msg }] }],
    // GEMINI_THINKING=0 → düşünmeyi kapat (thinking token'ı harcamaz, maliyet düşer; bu yaratıcı iş için genelde yeterli).
    // Parametre nesle göre değişir: 2.5 ailesi thinkingBudget:0, 3.x ailesi thinkingLevel:"MINIMAL" (budget 400 veriyor).
    generationConfig: { maxOutputTokens: 14000, temperature: 1,
      ...(process.env.GEMINI_THINKING === "0"
        ? { thinkingConfig: MODEL.startsWith("gemini-2") ? { thinkingBudget: 0 } : { thinkingLevel: "MINIMAL" } }
        : {}) },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 120000); // 120 sn zaman aşımı — istek asılı kalıp sonsuza dek beklemesin
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(to); }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`); err.status = res.status; throw err;
  }
  const data = await res.json();
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("");
  process.stdout.write(text); // operatör görsün (Gemini non-streaming)
  const um = data.usageMetadata || {};
  const thoughts = um.thoughtsTokenCount || 0; // düşünme token'ı (çıktı fiyatından faturalanır)
  // Faturalanan çıktı = görünen çıktı + düşünme; toplam faturalanan = girdi + bu.
  return { text, input: um.promptTokenCount ?? 0, output: (um.candidatesTokenCount ?? 0) + thoughts,
           stop: cand?.finishReason || "STOP", thoughts, total: um.totalTokenCount ?? 0 };
}
const generateOnce = PROVIDER === "gemini" ? generateGemini : generateAnthropic;

// Geçici hatalarda exponential backoff ile yeniden dener (her iki sağlayıcı için).
const API_RETRIES = 6; // ~ 2,4,8,16,32,60 sn ⇒ toplam ~2 dk dayanır
async function generateWithRetry(msg) {
  for (let r = 0; ; r++) {
    try {
      return await generateOnce(msg);
    } catch (e) {
      if (r >= API_RETRIES || !isTransient(e)) throw e;
      const wait = Math.min(2 ** (r + 1) * 1000, 60000) + Math.floor(Math.random() * 1000);
      const why = e?.error?.error?.type || e?.error?.type || e?.status || e?.message;
      console.warn(`\n⏳ API geçici hata (${why}) → ${Math.round(wait / 1000)} sn sonra tekrar (${r + 1}/${API_RETRIES})...`);
      await sleep(wait);
    }
  }
}

// Eksik bölümleri ikinci metinden alıp mevcut rapora ekler (parse_report dict-lookup yaptığı için sıra önemsiz;
// aynı başlık iki kez geçerse dolu olan sonraki kazanır).
function mergeMissing(base, add, keys) {
  const secs = sectionsOf(add);
  let out = base;
  for (const key of keys) {
    const h = Object.keys(secs).find((x) => x.includes(key));
    if (h && secs[h]) out += `\n\n## ${h}\n\n${secs[h]}`;
  }
  return out;
}

let text = "", res = null, miss = [];
let topIn = 0, topOut = 0, topDus = 0; // tüm denemelerin toplamı — gerçek fatura bu
try {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // 2.+ denemede TÜM raporu değil, YALNIZCA eksik bölümleri ürettir (maliyet: tam retry ~2x'ti).
    const msg = attempt === 1 ? userMessage
      : userMessage + `\n\nNOT: Önceki üretimde şu bölümler eksik ya da boş kaldı: [${miss.join(", ")}]. ŞİMDİ YALNIZCA bu eksik bölümleri yaz. Her bölüm "## Başlık" satırıyla başlasın ve dolu bir gövde içersin. Diğer bölümleri TEKRAR YAZMA.`;
    if (attempt > 1) console.warn(`\n⚠️  Eksik/boş bölüm: [${miss.join(", ")}] → yalnız bu bölümler yeniden üretiliyor (deneme ${attempt}/${MAX_ATTEMPTS})...\n`);
    res = await generateWithRetry(msg);
    topIn += res.input || 0; topOut += res.output || 0; topDus += res.thoughts || 0;
    const t = normalizeHeadings(stripEmDash(res.text), req);
    text = attempt === 1 ? t : mergeMissing(text, t, miss);
    miss = missingSections(text, req);
    if (!miss.length) break;
  }
  fs.writeFileSync(OUT, text, "utf8");
  if (miss.length) {
    console.error(`\n\n⛔ HATA: ${MAX_ATTEMPTS} denemede de eksik/boş bölüm var: [${miss.join(", ")}].`);
    console.error("   Bu rapor KUSURLU — RENDER ETME / MÜŞTERİYE GÖNDERME. Tekrar çalıştır ya da prompt'u gözden geçir.");
    process.exit(1);
  }
  const dus = topDus ? ` (düşünme ${topDus})` : ""; // Gemini düşünme token'ı varsa göster
  console.error(`\n\n[✓ ${OUT} | token TOPLAM: girdi ${topIn}, çıktı ${topOut}${dus} | ${res.stop} | ${req.length} bölüm tam]`); // stderr → log'da görünür
} catch (e) {
  const t = e?.error?.error?.type || e?.error?.type;
  if (isTransient(e)) {
    console.error(`\n❌ API hâlâ yoğun (${t || e?.status || e?.message}) — ${API_RETRIES} denemeye rağmen geçmedi. Birkaç dakika sonra tekrar dene.`);
  } else {
    console.error("❌", e instanceof Anthropic.APIError ? `API ${e.status} ${t || ""}: ${e.message}` : e.message);
  }
  process.exit(1);
}
