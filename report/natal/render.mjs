// report/natal/render.mjs
// natal-rapor-sablon2.html -> out.pdf  (headless Chrome / puppeteer-core; sistemde kurulu Chrome).
// Ayrıca onizleme.png (tam sayfa) üretir — görsel kontrol için.
// Çalıştır: node report/natal/render.mjs
//
// NOT: weasyprint/GTK YOK. Stack Node olduğu için prod ile birebir aynı motor (Chrome).
//      Python+fontTools yalnızca SVG üretimi (build.py) için; PDF render'ı için gerekmez.

import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// İsteğe bağlı arg: render edilecek HTML (yoksa statik şablon). FAZ3: render.py out.html'i geçer.
const HTML = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "natal-rapor-sablon2.html");
const OUT_PDF = path.join(__dirname, "out.pdf");
const OUT_PNG = path.join(__dirname, "onizleme.png");

// Sistemde kurulu Chrome (CHROME_PATH ile override edilebilir). Chromium İNDİRMİYORUZ.
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const CHROME = CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge bulunamadı. CHROME_PATH ortam değişkeniyle yol ver.");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--font-render-hinting=none"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle0", timeout: 60000 });
  // Google Fonts (Cormorant/Spectral) yüklensin
  await page.evaluate(() => document.fonts && document.fonts.ready);

  // --- TAŞMA GARANTİSİ (genel, herkese): bir blok sayfasını aşıyorsa metnini otomatik küçült.
  //     SVG (çark/diyagram/glif) ölçeklenmez. Prompt uzunluk sınırı sayesinde normalde tetiklenmez. ---
  const fitReport = await page.evaluate(() => {
    const MM = 96 / 25.4;
    const SEC_MAX = Math.round(282 * MM);       // tam sayfa - ~15mm alt güvenlik (gap artık bölüm padding'inde)
    const FLOW_MAX = Math.round(297 * MM) - 5;  // tam sayfa (full-bleed) + güvenlik
    const log = [];
    const nonSvg = (block) => [...block.querySelectorAll("*")].filter((e) => !(e instanceof SVGElement) && !e.closest("svg"));
    function shrink(block, fits, name) {
      if (!block || fits()) return;
      const els = nonSvg(block);
      const base = els.map((e) => parseFloat(getComputedStyle(e).fontSize) || 0);
      let k = 1, g = 0;
      while (!fits() && k > 0.66 && g < 80) {
        k -= 0.02; g++;
        els.forEach((e, i) => { if (base[i]) e.style.fontSize = (base[i] * k).toFixed(2) + "px"; });
      }
      if (k < 0.999) log.push(`${name}:%${Math.round(k * 100)}`);
    }
    // 1) Akan 7-8 bölüm — her biri tek printable sayfaya sığmalı
    document.querySelectorAll(".sections-sheet .section").forEach((s, i) =>
      shrink(s, () => s.offsetHeight <= SEC_MAX, `bölüm${i + 1}`));
    // 2) Ana İmzalar (auto yükseklik) — tek sayfaya
    document.querySelectorAll(".sig-page .flow").forEach((f) =>
      shrink(f, () => f.offsetHeight <= FLOW_MAX, "imzalar"));
    // 3) Sabit-yükseklikli ortalı sayfalar (İmza Sentezi / Element Yorumu / Kapanış): taşma = scrollHeight>clientHeight
    [".diag-inner", ".element-page .inner", ".closing .inner"].forEach((sel) =>
      document.querySelectorAll(sel).forEach((el) =>
        shrink(el, () => el.scrollHeight <= el.clientHeight + 1, sel)));
    return log;
  });
  if (fitReport.length) console.log("⤵ taşma-garantisi küçültme:", fitReport.join(", "));

  // --- PDF (prod motoru) — printBackground ŞART ---
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });
  console.log("✓ PDF:", OUT_PDF, `(${fs.statSync(OUT_PDF).size} B)`);

  // --- Görsel kontrol için tam sayfa PNG ---
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
  await page.screenshot({ path: OUT_PNG, fullPage: true });
  console.log("✓ PNG:", OUT_PNG, `(${fs.statSync(OUT_PNG).size} B)`);
} finally {
  await browser.close();
}
