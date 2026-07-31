// E-posta gönderimi. Aktif SMTP yapılandırması varsa nodemailer ile GERÇEKTEN gönderir;
// yoksa ya da hata olursa .data/mails.json'a kaydeder (denetim/yedek).
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { getSmtp, bildirimAcik, type BildirimKey } from "@/lib/db";

const DIR = path.join(process.cwd(), ".data");

export type Mail = { to: string; subject: string; body: string; tarih: string; gonderildi?: boolean; hata?: string };
export type MailEk = { filename: string; content: Buffer };

function logMail(m: Mail) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const p = path.join(DIR, "mails.json");
  let list: Mail[] = [];
  try { if (fs.existsSync(p)) list = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  list.unshift(m);
  fs.writeFileSync(p, JSON.stringify(list.slice(0, 500), null, 2));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Müşteriye giden mailler için kurumsal, çizgisel, sade HTML şablonu (az renk, açık zemin, okunur).
// body düz metni paragraflara çevrilir (boş satır = paragraf, tek satır kırılımı = <br>).
export function htmlSar(subject: string, body: string): string {
  const govde = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3b3a48;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2ea;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ea;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e7e1d4;border-radius:10px;overflow:hidden;">
        <!-- Marka -->
        <tr><td style="padding:26px 36px 18px;border-bottom:1px solid #ece6d8;">
          <div style="font-size:21px;color:#b08d4f;font-weight:bold;">gokname.com</div>
          <div style="margin-top:3px;font-size:11px;letter-spacing:1px;color:#a9a293;text-transform:uppercase;">Kişiye Özel Astroloji Analizleri</div>
        </td></tr>
        <!-- İçerik -->
        <tr><td style="padding:30px 36px 14px;">
          <h1 style="margin:0 0 18px;font-size:21px;line-height:1.4;color:#2b2a3d;font-weight:normal;">${escapeHtml(subject)}</h1>
          ${govde}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 36px 26px;border-top:1px solid #ece6d8;">
          <div style="font-size:12px;line-height:1.6;color:#a9a293;">
            Bu e-posta <a href="https://gokname.com" style="color:#b08d4f;text-decoration:none;">gokname.com</a> üzerinden gönderildi.<br>
            Gerçek astronomik hesaba dayalı, tamamen sana özel hazırlanan astroloji analizleri.
          </div>
          <div style="margin-top:12px;font-size:11px;color:#c3bcab;">© ${new Date().getFullYear()} gokname.com · Tüm hakları saklıdır.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Doğrulama/şifre KODU e-postası için Gökname temalı (koyu gece moru + altın) şablon.
// Kod büyük, ortada, tek başına. body düz metni koddan bağımsız alt açıklama olarak geçer.
export function htmlKodMaili(baslik: string, kod: string, altMetin: string): string {
  const alt = altMetin
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#b9b6cf;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f24;font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f24;">
    <tr><td align="center" style="padding:34px 16px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:100%;background:#1b1b3a;border:1px solid rgba(194,163,107,0.28);border-radius:16px;overflow:hidden;">
        <!-- Marka -->
        <tr><td align="center" style="padding:32px 36px 10px;">
          <div style="font-size:26px;font-weight:bold;color:#dcc188;letter-spacing:0.5px;">gökname.com</div>
          <div style="margin-top:6px;font-size:11px;letter-spacing:2px;color:#8884ad;text-transform:uppercase;">Kişiye Özel Astroloji Analizleri</div>
        </td></tr>
        <!-- Başlık -->
        <tr><td align="center" style="padding:14px 36px 0;">
          <div style="font-size:15px;color:#e8e4f2;">${escapeHtml(baslik)}</div>
        </td></tr>
        <!-- KOD -->
        <tr><td align="center" style="padding:22px 36px 6px;">
          <div style="display:inline-block;background:#12122e;border:1px solid rgba(220,193,136,0.45);border-radius:14px;padding:20px 34px;">
            <span style="font-family:'Courier New',monospace;font-size:42px;font-weight:bold;letter-spacing:12px;color:#dcc188;">${escapeHtml(kod)}</span>
          </div>
        </td></tr>
        <!-- Alt açıklama -->
        <tr><td align="center" style="padding:22px 40px 6px;text-align:center;">
          ${alt}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:18px 36px 28px;border-top:1px solid rgba(194,163,107,0.14);margin-top:10px;">
          <div style="font-size:11px;line-height:1.6;color:#6f6c8a;text-align:center;">
            Bu e-posta <span style="color:#c2a36b;">gokname.com</span> üzerinden gönderildi.<br>
            © ${new Date().getFullYear()} gokname.com · Tüm hakları saklıdır.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function transport(c: ReturnType<typeof getSmtp>) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.sifreleme === "ssl" || c.port === 465, // SSL (465) doğrudan TLS
    auth: c.auth ? { user: c.username, pass: c.password } : undefined,
    tls: { rejectUnauthorized: c.sslDogrulama !== false },
    requireTLS: c.sifreleme === "tls",
    // Yanlış host/port/firewall durumunda istek sonsuza dek asılı kalmasın
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
}

// to verilmezse gönderilmez (boş alıcı). Fire-and-forget; istek bloklanmaz.
// html verilirse zengin gövde olarak gönderilir (text de yedek olarak kalır).
export function sendMail(to: string, subject: string, body: string, ekler?: MailEk[], html?: string) {
  const tarih = new Date().toISOString();
  if (!to || !to.trim()) return;
  const c = getSmtp();
  const ad = c.fromName || "gokname.com";
  const from = c.fromEmail ? `${ad} <${c.fromEmail}>` : c.username ? `${ad} <${c.username}>` : undefined;

  if (!c.aktif || !c.host || !from) {
    logMail({ to, subject, body, tarih, gonderildi: false, hata: c.aktif ? "SMTP eksik (host/from)" : "SMTP kapalı" });
    return;
  }

  const attachments = ekler?.length ? ekler.map((e) => ({ filename: e.filename, content: e.content })) : undefined;
  transport(c)
    .sendMail({ from, to, subject, text: body, html, attachments })
    .then(() => logMail({ to, subject, body, tarih, gonderildi: true }))
    .catch((e) => logMail({ to, subject, body, tarih, gonderildi: false, hata: e instanceof Error ? e.message : String(e) }));
}

// Olay bazlı gönderim (MÜŞTERİYE): kurumsal HTML şablonuyla gider. Bildirim kapalıysa gönderilmez.
export function sendEvent(key: BildirimKey, to: string, subject: string, body: string, ekler?: MailEk[]) {
  if (!bildirimAcik(key)) return;
  sendMail(to, subject, body, ekler, htmlSar(subject, body));
}
// Admin bildirim adresine olay gönder (alıcı ayarlardan gelir).
export function sendAdminEvent(key: BildirimKey, subject: string, body: string) {
  if (!bildirimAcik(key)) return;
  sendMail(getSmtp().adminEmail, subject, body);
}
// İletişim adresine olay gönder.
export function sendIletisimEvent(key: BildirimKey, subject: string, body: string) {
  if (!bildirimAcik(key)) return;
  sendMail(getSmtp().iletisimEmail, subject, body);
}

// Test maili — sonucu döndürür (await edilir).
export async function sendTestMail(to: string): Promise<{ ok: boolean; error?: string }> {
  const c = getSmtp();
  const ad = c.fromName || "gokname.com";
  const from = c.fromEmail ? `${ad} <${c.fromEmail}>` : c.username ? `${ad} <${c.username}>` : "";
  if (!c.host || !from) return { ok: false, error: "Önce SMTP Host ve From adresini kaydet." };
  try {
    await transport(c).sendMail({ from, to, subject: "Gökname SMTP test", text: "Bu bir test e-postasıdır. SMTP ayarların çalışıyor ✓" });
    logMail({ to, subject: "Gökname SMTP test", body: "(test)", tarih: new Date().toISOString(), gonderildi: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
