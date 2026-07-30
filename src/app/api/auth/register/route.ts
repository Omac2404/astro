import { NextResponse } from "next/server";
import { createPendingReg, getSmtp, type DogumBilgi } from "@/lib/db";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

function parseDogum(o: Record<string, unknown> | undefined): DogumBilgi | null {
  if (!o) return null;
  const ad = String(o.ad ?? "").trim().slice(0, 25);
  const tarih = String(o.tarih ?? "").trim();
  const saat = String(o.saat ?? "").trim();
  const yer = String(o.yer ?? "").trim();
  if (!ad || !tarih || !yer) return null;
  return { ad, tarih, saat, yer };
}

// 1. AŞAMA — e-posta doğrulaması: hesabı HEMEN açmaz; 6 haneli kodu e-postaya gönderir ve kayıt
// "bekleyen" olarak (şifre hash'li) tutulur. Kod /api/auth/register/verify ile doğrulanınca gerçek
// üye oluşturulur ve oturum açılır.
export async function POST(req: Request) {
  const { email, sifre, dogum } = await req.json().catch(() => ({}));
  const d = parseDogum(dogum);
  if (!d) return NextResponse.json({ error: "Doğum bilgin (isim, tarih, yer) zorunlu." }, { status: 400 });
  const { error, code } = createPendingReg(String(email ?? ""), String(sifre ?? ""), d);
  if (error || !code) return NextResponse.json({ error: error ?? "Kayıt başlatılamadı." }, { status: 400 });

  const e = String(email).trim().toLowerCase();
  // Doğrulama e-postası doğrudan gönderilir (yönetim aç/kapa toggle'ına bağlı değil — doğrulama zorunlu).
  sendMail(
    e,
    "Doğrulama kodun — gokname.com",
    `gokname.com üyelik doğrulama kodun: ${code}\n\nKodu kayıt ekranındaki alana girerek hesabını oluşturabilirsin. Kod 15 dakika geçerlidir.\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`
  );

  // SMTP gerçekten gönderebiliyorsa kod yalnızca e-postayla gider; aksi halde (SMTP kapalı/
  // yapılandırılmamış) yerel/demo test için kod yanıtta döner.
  const c = getSmtp();
  const gonderebilir = c.aktif && !!c.host && !!(c.fromEmail || c.username);
  return NextResponse.json({ ok: true, needCode: true, email: e, ...(gonderebilir ? {} : { demoCode: code }) });
}
