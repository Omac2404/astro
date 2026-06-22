// selectBlocks.mjs — FAZ 4: chart.json'dan deterministik blok seçimi.
// chart.json (compute.py çıktısı) + natal-blocks.json (kütüphane) -> aktif blok listesi.
// Kütüphanede olmayan blokları "eksik" diye loglar (= FAZ 5 içerik iş emri).
//
// Çalıştır: node report/natal/selectBlocks.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));

const chart = JSON.parse(fs.readFileSync(path.join(HERE, "chart.json"), "utf8"));
const isSinastri = chart.tip === "sinastri";
const LIB = path.resolve(HERE, "../../src/blocks/" + (isSinastri ? "sinastri-blocks.json" : "natal-blocks.json"));
const blocks = JSON.parse(fs.readFileSync(LIB, "utf8"));
const have = new Set(blocks.map((b) => b.id));

// --- ID konvansiyonu ---
const PREFIX = { gunes: "GUN", ay: "AY", merkur: "MER", venus: "VEN", mars: "MARS", jupiter: "JUP", saturn: "SAT", yukselen: "YUK" };
const SIGN_TOK = { "Koç": "KOC", "Boğa": "BOGA", "İkizler": "IKIZLER", "Yengeç": "YENGEC", "Aslan": "ASLAN", "Başak": "BASAK", "Terazi": "TERAZI", "Akrep": "AKREP", "Yay": "YAY", "Oğlak": "OGLAK", "Kova": "KOVA", "Balık": "BALIK" };
const EL_TOK = { "Ateş": "ATES", "Toprak": "TOPRAK", "Hava": "HAVA", "Su": "SU" };
const MOD_TOK = { "Öncü": "ONCU", "Sabit": "SABIT", "Değişken": "DEGISKEN" };
const ASP_TOK = { kavusum: "KAVUSUM", altmislik: "ALTMISLIK", ucgen: "UCGEN", kare: "KARE", karsitlik: "KARSIT" };

// Sinastri: gezegen çifti kanonik sırası + tokenları
const SIN_ORDER = { gunes: 0, ay: 1, merkur: 2, venus: 3, mars: 4, jupiter: 5, saturn: 6, yukselen: 7 };
const SIN_TOK = { gunes: "GUNES", ay: "AY", merkur: "MERKUR", venus: "VENUS", mars: "MARS", jupiter: "JUPITER", saturn: "SATURN", yukselen: "YUKSELEN" };
const SIN_QUAL = { kavusum: "KAVUSUM", altmislik: "UYUMLU", ucgen: "UYUMLU", kare: "ZORLU", karsitlik: "ZORLU" };
const EL_PAIR = {
  "Ateş|Hava": "SIN_EL_ATES_HAVA", "Toprak|Su": "SIN_EL_TOPRAK_SU", "Ateş|Su": "SIN_EL_ATES_SU",
  "Ateş|Toprak": "SIN_EL_ATES_TOPRAK", "Hava|Su": "SIN_EL_HAVA_SU", "Hava|Toprak": "SIN_EL_HAVA_TOPRAK",
};
const elPairId = (a, b) => (a === b) ? "SIN_EL_AYNI" : (EL_PAIR[`${a}|${b}`] || EL_PAIR[`${b}|${a}`]);
const domElOf = (c) => Object.keys(c.elements).reduce((x, y) => c.elements[x] >= c.elements[y] ? x : y);

// --- Seçim (deterministik, kategori sıralı) ---
const want = []; // {id, kategori, neden}
const add = (id, kategori, neden) => want.push({ id, kategori, neden });

if (isSinastri) {
  const A = chart.person_a, B = chart.person_b;
  // 1) Çapraz açılar -> gezegen çifti × kalite (kanonik sıra)
  for (const x of chart.synastry_aspects) {
    const [lo, hi] = SIN_ORDER[x.a] <= SIN_ORDER[x.b] ? [x.a, x.b] : [x.b, x.a];
    add(`SIN_ACI_${SIN_TOK[lo]}_${SIN_TOK[hi]}_${SIN_QUAL[x.type]}`, "sinastri-aci", `${x.a_ad}-${x.b_ad} ${x.type}`);
  }
  // 2) Ev bindirmeleri (her iki yön)
  for (const o of [...chart.overlays_ab, ...chart.overlays_ba]) {
    add(`SIN_EV_${SIN_TOK[o.planet]}_${o.house}`, "sinastri-ev", `${o.src}: ${o.ad} -> ${o.dest} ${o.house}. ev`);
  }
  // 3) Genel: element uyumu
  const elA = domElOf(A), elB = domElOf(B);
  add(elPairId(elA, elB), "sinastri-genel", `element ${elA} + ${elB}`);
  // 3b) Güneş burcu aynı / karşıt
  const sa = A.planets[0].sign_idx, sb = B.planets[0].sign_idx;
  if (sa === sb) add("SIN_GENEL_GUNES_AYNI_BURC", "sinastri-genel", "aynı Güneş burcu");
  else if (Math.abs(sa - sb) === 6) add("SIN_GENEL_GUNES_KARSIT_BURC", "sinastri-genel", "zıt Güneş burçları");
  // 3c) Açı dengesi
  const nU = chart.synastry_aspects.filter((a) => a.uyum === "uyumlu").length;
  const nZ = chart.synastry_aspects.filter((a) => a.uyum === "zorlu").length;
  if (nU >= nZ + 3) add("SIN_GENEL_COK_UYUMLU", "sinastri-genel", `uyumlu baskın (${nU}/${nZ})`);
  else if (nZ >= nU + 3) add("SIN_GENEL_COK_ZORLU", "sinastri-genel", `gerilim baskın (${nU}/${nZ})`);
  else add("SIN_GENEL_DENGELI", "sinastri-genel", `dengeli (${nU}/${nZ})`);
} else {
  // 1) Gezegen-burç yerleşimleri (tarz)
  for (const p of chart.planets) add(`${PREFIX[p.id]}_${SIGN_TOK[p.sign]}`, "gezegen-burc", `${p.ad} ${p.sign}`);
  // 1b) Gezegen-ev yerleşimleri (yaşam alanı / arena — zenginleştirme)
  for (const p of chart.planets) add(`${PREFIX[p.id]}_EV${p.house}`, "gezegen-ev", `${p.ad} ${p.house}. ev`);
  // 2) Yükselen
  add(`YUK_${SIGN_TOK[chart.asc.sign]}`, "yukselen", `Yükselen ${chart.asc.sign}`);
  // 3) Dolu evler
  for (const h of chart.occupied_houses) add(`EV_${h}`, "ev", `${h}. ev dolu`);
  // 3b) Karmik noktalar (Motor 2 — Lilith & Karmik): Lilith / Kuzey Düğüm / Kiron burç blokları
  const KARMIK_PREFIX = { lilith: "LILITH", kuzey: "KUZEY", chiron: "CHIRON" };
  for (const p of (chart.karmik || [])) {
    if (KARMIK_PREFIX[p.id]) add(`${KARMIK_PREFIX[p.id]}_${SIGN_TOK[p.sign]}`, p.id, `${p.ad} ${p.sign}`);
  }
  // 4) Açılar — tip-bazlı GENERIC (kompozisyon: spesifik çiftleri sentez, açılar listesinden kurar)
  for (const t of new Set(chart.aspects.map((a) => a.type))) add(`ACI_${ASP_TOK[t]}`, "aci", `${t} (genel; haritada var)`);
  // 5) Baskın element + nitelik
  const domEl = Object.keys(chart.elements).reduce((x, y) => chart.elements[x] >= chart.elements[y] ? x : y);
  const domMod = Object.keys(chart.modalities).reduce((x, y) => chart.modalities[x] >= chart.modalities[y] ? x : y);
  add(`ELEMENT_${EL_TOK[domEl]}`, "element", `baskın element ${domEl}`);
  add(`NITELIK_${MOD_TOK[domMod]}`, "nitelik", `baskın nitelik ${domMod}`);
  // 6) Mizaç
  add(`MIZAC_${chart.mizac.key.toUpperCase()}`, "mizac", `mizaç ${chart.mizac.ad}`);
}

const selected = want.filter((w) => have.has(w.id));
const missing = want.filter((w) => !have.has(w.id));

console.log(`=== selectBlocks: ${chart.meta.ad} ===`);
console.log(`İstenen: ${want.length} | Kütüphanede VAR: ${selected.length} | EKSİK: ${missing.length}\n`);
console.log("VAR (sentde kullanılacak):");
for (const w of selected) console.log(`  ✓ ${w.id.padEnd(22)} (${w.neden})`);
console.log("\nEKSİK (FAZ 5 üretilecek):");
const byCat = {};
for (const w of missing) (byCat[w.kategori] ||= []).push(w);
for (const [cat, list] of Object.entries(byCat)) {
  console.log(`  [${cat}]`);
  for (const w of list) console.log(`     ✗ ${w.id.padEnd(22)} (${w.neden})`);
}

// aktif_bloklar olarak da yaz (sentez pipeline'ı için) — tekilleştirilmiş
const uniq = (arr) => [...new Set(arr)];
const out = path.join(HERE, "aktif-bloklar.json");
const aktif = uniq(selected.map((w) => w.id));
fs.writeFileSync(out, JSON.stringify({ ad: chart.meta.ad, aktif_bloklar: aktif, eksik: uniq(missing.map((w) => w.id)) }, null, 2), "utf8");
console.log(`\n-> aktif-bloklar.json yazıldı (${aktif.length} benzersiz blok)`);
