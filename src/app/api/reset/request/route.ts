import { NextResponse } from "next/server";
import { findAdmin, findMember, createResetCode, getSmtp } from "@/lib/db";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { scope, email } = await req.json().catch(() => ({}));
  const sc = scope === "admin" ? "admin" : "member";
  const e = String(email ?? "").trim();
  if (sc === "admin" && !findAdmin(e)) return NextResponse.json({ error: "Bu e-postayla bir admin bulunamadı." }, { status: 404 });
  if (sc === "member" && !findMember(e)) return NextResponse.json({ error: "Bu e-postayla bir üye bulunamadı." }, { status: 404 });
  const code = createResetCode(sc, e);

  // Doğrulama kodunu e-posta ile gönder
  sendEvent("sifreKodu", e, "Şifre sıfırlama kodun — gokname.com", `Şifre sıfırlama kodun: ${code}\n\nBu kodu sıfırlama ekranına girerek yeni şifreni belirleyebilirsin. Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.`);

  // SMTP gerçekten gönderebiliyorsa kod yalnızca e-postayla gider.
  // Aksi halde (SMTP kapalı/yapılandırılmamış ya da bildirim kapalı) yedek olarak kod yanıtta döner.
  const c = getSmtp();
  const gonderebilir = c.aktif && !!c.host && !!(c.fromEmail || c.username) && c.bildirimler.sifreKodu !== false;
  return NextResponse.json({ ok: true, ...(gonderebilir ? {} : { demoCode: code }) });
}
