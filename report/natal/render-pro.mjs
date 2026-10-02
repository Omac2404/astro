// render-pro.mjs — Astrolog Pro raporu: HTML -> pro.pdf (headless Chrome, sayfa numaralı alt bilgi).
// render.mjs'ten farkı: akan doküman (CSS @page kenar boşlukları) + displayHeaderFooter ile sayfa no.
// Çalıştır: node render-pro.mjs <html> [altbilgi-ad]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const IO = process.env.NATAL_IO || path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(process.argv[2]);
const AD = (process.argv[3] || "").replace(/[<>&"]/g, "");
const OUT_PDF = path.join(IO, "pro.pdf");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const CHROME = CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge bulunamadı. CHROME_PATH ortam değişkeniyle yol ver.");

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle0", timeout: 90000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const footer = `<div style="width:100%;font-family:Georgia,serif;font-size:7.5pt;color:#8a86a3;padding:0 16mm;display:flex;justify-content:space-between;">
    <span>gökname · Natal Pro Rapor${AD ? " · " + AD : ""}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
  await page.pdf({
    path: OUT_PDF, format: "A4", printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: footer,
  });
  console.log("✓ PDF:", OUT_PDF, `(${fs.statSync(OUT_PDF).size} B)`);
} finally {
  await browser.close();
}
