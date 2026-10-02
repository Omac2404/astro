// Astrolog Pro rapor üretim hattı — ücretsiz raporların kuyruğundan AYRI (kendi eşzamanlılık havuzu).
// Zincir: birth-pro.json -> compute_pro.py -> synthesize-pro.mjs (Opus 5.5 / Fable 5.1) -> render_pro.py -> pro.pdf
// Adım bazlı yeniden deneme: render hatası pahalı metin üretimini TEKRARLATMAZ. Başarısızlıkta jeton iade edilir.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  findProReport, updateProReport, proRaporBasarisiz, saveFile, getProAyar, getSmtp, findMember,
  recoverStaleProReports, type ProReport,
} from "@/lib/db";
import { birthFromDogum } from "@/lib/pipeline";
import { sendMail } from "@/lib/mail";

const ROOT = process.cwd();
const NATAL = path.join(ROOT, "report", "natal");
const PY =
  process.env.PYTHON_BIN ||
  (process.platform === "win32" ? path.join(ROOT, ".venv", "Scripts", "python.exe") : path.join(ROOT, ".venv", "bin", "python"));
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Süreç içi durum globalThis'te: dev'de modül yeniden yüklense de aktif işler kaybolmasın.
type ProState = { aktifIdler: Set<string>; calisan: number; bekleyen: Array<() => void> };
const G = globalThis as unknown as { __gnPro?: ProState };
const S: ProState = (G.__gnPro ??= { aktifIdler: new Set(), calisan: 0, bekleyen: [] });

export function proAktifIdler(): Set<string> {
  return S.aktifIdler;
}
// Okuma uçlarında çağrılır: sunucu restart'ında yarıda kalan üretimleri "hata + iade"ye çevirir.
export function proKurtar(): number {
  return recoverStaleProReports(S.aktifIdler);
}

const ESZAMAN = () => Math.max(1, Math.min(4, Math.floor(getProAyar().eszaman) || 1));
async function siraya<T>(fn: () => Promise<T>): Promise<T> {
  if (S.calisan < ESZAMAN()) S.calisan++;
  else await new Promise<void>((r) => S.bekleyen.push(r));
  try {
    return await fn();
  } finally {
    S.calisan--;
    while (S.bekleyen.length && S.calisan < ESZAMAN()) {
      S.calisan++;
      S.bekleyen.shift()!();
    }
  }
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, env });
    let err = "", out = "";
    p.stderr.on("data", (d) => { err += d.toString(); process.stderr.write(d); });
    p.stdout.on("data", (d) => { out += d.toString(); });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${path.basename(args[0] ?? cmd)} → çıkış ${code}\n${err.slice(-500)}`))));
  });
}
async function adim<T>(ad: string, deneme: number, fn: () => Promise<T>): Promise<T> {
  let son: unknown;
  for (let i = 0; i < deneme; i++) {
    try {
      return await fn();
    } catch (e) {
      son = e;
      console.error(`[pro:${ad}] deneme ${i + 1}/${deneme} başarısız:`, e instanceof Error ? e.message : e);
      if (i < deneme - 1) await bekle(6000 * (i + 1));
    }
  }
  throw son;
}

function birthPro(r: ProReport, b: Awaited<ReturnType<typeof birthFromDogum>>) {
  const d = r.danisan;
  return {
    ...b,
    saat: d.saatKesin === "bilinmiyor" || !d.saat ? [12, 0] : b.saat,
    saat_kesin: d.saatKesin,
    yer_metin: d.yer.replace(/\s*\/\s*/g, ", "),
    olaylar: (d.olaylar ?? []).filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.tarih)),
    danisan: {
      cinsiyet: d.cinsiyet || "", meslek: d.meslek || "", iliski: d.iliski || "",
      sorular: d.sorular || "", not: d.astrologNot || "",
    },
  };
}

async function uretPro(r: ProReport): Promise<{ pdf: Buffer; maliyet?: ProReport["maliyet"] }> {
  const ayar = getProAyar();
  const jobDir = path.join(NATAL, "jobs", "pro-" + crypto.randomBytes(6).toString("hex"));
  fs.mkdirSync(jobDir, { recursive: true });
  const hazirlayan = findMember(r.email)?.astrolog;
  const env: NodeJS.ProcessEnv = {
    ...process.env, NATAL_IO: jobDir, PRO_MODEL: ayar.model, PRO_EFFORT: ayar.effort,
    PRO_RAPOR_ID: r.id, PRO_HAZIRLAYAN: hazirlayan?.marka || hazirlayan?.ad || "",
  };
  try {
    const b = await birthFromDogum(r.danisan);
    fs.writeFileSync(path.join(jobDir, "birth-pro.json"), JSON.stringify(birthPro(r, b), null, 2));
    await adim("hesap", 2, () => run(PY, [path.join(NATAL, "compute_pro.py")], env));
    const out = await adim("sentez", 2, () => run("node", [path.join(NATAL, "synthesize-pro.mjs")], env));
    let maliyet: ProReport["maliyet"];
    const m = out.match(/^PRO_MALIYET (.+)$/m);
    if (m) {
      try { maliyet = JSON.parse(m[1]); } catch {}
    }
    await adim("render", 3, () => run(PY, [path.join(NATAL, "render_pro.py")], env));
    const pdfPath = path.join(jobDir, "pro.pdf");
    if (!fs.existsSync(pdfPath)) throw new Error("PDF üretilemedi (pro.pdf yok).");
    return { pdf: fs.readFileSync(pdfPath), maliyet };
  } finally {
    try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
  }
}

export function runProGeneration(reportId: string) {
  S.aktifIdler.add(reportId);
  return siraya(async () => {
    try {
      const r = findProReport(reportId);
      if (!r) return;
      const { pdf, maliyet } = await uretPro(r);
      updateProReport(reportId, { durum: "hazir", dosya: saveFile(pdf, "pdf"), maliyet, hazirTarih: new Date().toISOString(), hata: undefined });
    } catch (e) {
      const mesaj = e instanceof Error ? e.message : String(e);
      console.error("[runProGeneration]", reportId, mesaj);
      const r = proRaporBasarisiz(reportId, "Rapor üretilemedi. Jetonun iade edildi; tekrar deneyebilirsin.");
      const c = getSmtp();
      if (c.adminEmail) {
        sendMail(c.adminEmail, `⚠️ Pro rapor üretilemedi — ${r?.urunAd ?? ""}`,
          `Bir astroloğun Pro raporu üretilemedi; jeton otomatik iade edildi.\n\nAstrolog: ${r?.email ?? "?"}\nDanışan: ${r?.danisan.ad ?? "?"}\nRapor: ${reportId}\n\nHata: ${mesaj}`);
      }
    } finally {
      S.aktifIdler.delete(reportId);
    }
  });
}
