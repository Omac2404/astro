// Rapor üretim pipeline'ı — admin "Rapor Oluştur" + üye doğum bilgisi girişi tetikler.
// Zincir: birth(.json | birth-a/b.json) -> compute(_karmik/_sr/_sinastri).py -> selectBlocks.mjs
//         -> synthesize-real.mjs <product> -> render.py <product> -> out.pdf
// Paylaşılan dosyalar (birth.json, chart.json, out.pdf) kullanıldığı için üretimler SIRALI kuyrukta koşar.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { updateGenReport, attachReportFile, setReportDurum, saveFile, getGenReports, getSmtp, findReport, type DogumBilgi } from "@/lib/db";
import { ilKoordinat } from "@/lib/tr-cities";
import { geocode } from "@/lib/geocode";
import { sendMail } from "@/lib/mail";

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ROOT = process.cwd();
const NATAL = path.join(ROOT, "report", "natal");
// venv Python yolu OS'a göre değişir: Windows -> .venv\Scripts\python.exe, Linux/macOS -> .venv/bin/python.
// PYTHON_BIN ile tamamen override edilebilir (ör. Docker'da sistem python'u veya farklı venv yolu).
const PY =
  process.env.PYTHON_BIN ||
  (process.platform === "win32"
    ? path.join(ROOT, ".venv", "Scripts", "python.exe")
    : path.join(ROOT, ".venv", "bin", "python"));

export const URETILEBILIR = ["natal", "ask", "kariyer", "saglik", "solar", "lilith", "sinastri-sevgili", "sinastri-arkadas"];

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env: process.env });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.stdout.on("data", () => {});
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} ${args.join(" ")} → çıkış ${code}\n${err.slice(-400)}`))));
  });
}

// --- Sıralı üretim kuyruğu (paylaşılan dosya çakışmasını önler) ---
let kuyruk: Promise<unknown> = Promise.resolve();
function siraya<T>(fn: () => Promise<T>): Promise<T> {
  const next = kuyruk.then(fn, fn);
  kuyruk = next.catch(() => {});
  return next as Promise<T>;
}

type Birth = { ad: string; tarih: [number, number, number]; saat: [number, number]; il: string; ilce: string; lat: number; lon: number };

// DogumBilgi: TR ise yer = "İl / İlçe" (tablodan); yurtdışı ise serbest metin (geocode)
async function birthFromDogum(d: DogumBilgi): Promise<Birth> {
  const [y, m, dd] = d.tarih.split("-").map(Number);
  const [hh, mm] = (d.saat || "12:00").split(":").map(Number);
  const parts = d.yer.split("/");
  const ilTahmin = (parts[0] || "").trim();
  const tr = ilKoordinat(ilTahmin);
  if (tr) {
    return { ad: d.ad, tarih: [y, m, dd], saat: [hh || 0, mm || 0], il: ilTahmin, ilce: (parts[1] || "").trim(), lat: tr[0], lon: tr[1] };
  }
  // TR tablosunda yok → yurtdışı: serbest metni geocode et
  const g = await geocode(d.yer);
  if (!g) throw new Error(`Doğum yeri çözülemedi: "${d.yer}"`);
  return { ad: d.ad, tarih: [y, m, dd], saat: [hh || 0, mm || 0], il: d.yer, ilce: "", lat: g[0], lon: g[1] };
}

function writeBirth(file: string, b: Birth) {
  fs.writeFileSync(path.join(NATAL, file), JSON.stringify({ ...b, sr_lat: b.lat, sr_lon: b.lon }, null, 2));
}

// Ana üretim: slug + 1 (veya çift için 2) kişi -> out.pdf buffer
async function uret(slug: string, a: Birth, b2?: Birth): Promise<Buffer> {
  const cift = slug.startsWith("sinastri");
  if (cift) {
    if (!b2) throw new Error("Çift analiz için ikinci kişi gerekli.");
    writeBirth("birth-a.json", a);
    writeBirth("birth-b.json", b2);
    await run(PY, [path.join(NATAL, "compute_sinastri.py")]);
  } else {
    writeBirth("birth.json", a);
    if (slug === "lilith") await run(PY, [path.join(NATAL, "compute_karmik.py")]);
    else if (slug === "solar") await run(PY, [path.join(NATAL, "compute_sr.py"), "dogum"]);
    else await run(PY, [path.join(NATAL, "compute.py")]);
  }
  await run("node", [path.join(NATAL, "selectBlocks.mjs")]);
  await run("node", [path.join(NATAL, "synthesize-real.mjs"), slug]);
  await run(PY, [path.join(NATAL, "render.py"), slug]);
  const pdfPath = path.join(NATAL, "out.pdf");
  if (!fs.existsSync(pdfPath)) throw new Error("PDF üretilemedi (out.pdf yok).");
  return fs.readFileSync(pdfPath);
}

// Geçici API/ağ hatalarına karşı otomatik tekrar: 3 deneme, arada artan bekleme.
async function uretRetry(slug: string, a: Birth, b2?: Birth): Promise<Buffer> {
  const DENEME = 3;
  let sonHata: unknown;
  for (let i = 0; i < DENEME; i++) {
    try {
      return await uret(slug, a, b2);
    } catch (e) {
      sonHata = e;
      console.error(`[uret] deneme ${i + 1}/${DENEME} başarısız (${slug}):`, e instanceof Error ? e.message : e);
      if (i < DENEME - 1) await bekle(8000 * (i + 1)); // 8sn, 16sn
    }
  }
  throw sonHata;
}

// Üretim başarısız olursa admin'e bilgi maili (SMTP + admin adresi varsa).
function adminHataMaili(baslik: string, detay: string) {
  const c = getSmtp();
  if (c.adminEmail) sendMail(c.adminEmail, baslik, detay);
}

// Admin "Rapor Oluştur" havuzu için (üye akışıyla aynı: DogumBilgi + çift)
export function runGeneration(genId: string, slug: string, dogum: DogumBilgi, dogum2?: DogumBilgi) {
  return siraya(async () => {
    try {
      const a = await birthFromDogum(dogum);
      const b2 = dogum2 ? await birthFromDogum(dogum2) : undefined;
      const pdf = await uretRetry(slug, a, b2);
      updateGenReport(genId, { durum: "hazir", dosya: saveFile(pdf, "pdf") });
    } catch (e) {
      updateGenReport(genId, { durum: "hata", hata: e instanceof Error ? e.message : String(e) });
    }
  });
}

// Üye doğum bilgisi girince kendi raporunu üretir (sıralı kuyrukta)
export function runReportGeneration(reportId: string, slug: string, dogum: DogumBilgi, dogum2?: DogumBilgi) {
  return siraya(async () => {
    try {
      const a = await birthFromDogum(dogum);
      const b2 = dogum2 ? await birthFromDogum(dogum2) : undefined;
      const pdf = await uretRetry(slug, a, b2);
      attachReportFile(reportId, saveFile(pdf, "pdf")); // -> hazir + dosya
    } catch (e) {
      // 3 denemeye rağmen üretilemedi: kullanıcı tekrar deneyebilsin / admin elle üretebilsin
      const mesaj = e instanceof Error ? e.message : String(e);
      setReportDurum(reportId, "bekliyor", mesaj); // hatayı sakla -> popup/Analizlerim'de görünür
      console.error("[runReportGeneration]", reportId, mesaj);
      const r = findReport(reportId);
      adminHataMaili(
        `⚠️ Rapor üretilemedi — ${r?.urunAd ?? slug}`,
        `Bir müşterinin raporu 3 denemeye rağmen üretilemedi ve "bekliyor" durumuna alındı.\n\nMüşteri: ${r?.email ?? "?"}\nÜrün: ${r?.urunAd ?? slug}\nKişi: ${dogum.ad}\n\nHata: ${mesaj}\n\nAdmin panel → Rapor Oluştur'dan elle üretip atayabilir ya da müşteri "Analizlerim"den tekrar deneyebilir.`
      );
    }
  });
}

export function uretimMesgul(): boolean {
  return getGenReports().some((g) => g.durum === "olusturuluyor");
}
