import { NextResponse } from "next/server";
import { verifyPendingRegAndCreate, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

// 2. AŞAMA — kod doğrulama: doğru kod girilince bekleyen kayıt gerçek üyeye dönüşür, oturum açılır.
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  const { error, member } = verifyPendingRegAndCreate(String(email ?? ""), String(code ?? ""));
  if (error || !member) return NextResponse.json({ error: error ?? "Doğrulama başarısız." }, { status: 400 });

  await setSessionCookie(createSession("member", member.email));
  // Hoşgeldin e-postası (uyeKayit bildirimi açıksa)
  sendEvent(
    "uyeKayit",
    member.email,
    "Aramıza hoş geldin — gokname.com",
    `Merhaba,\n\ngokname.com'a hoş geldin! Hesabın oluşturuldu.\n\nDilediğin analizi seçip "Analizi Yap" diyerek, gerçek gökyüzü hesabıyla tamamen sana özel raporunu oluşturabilirsin.\n\nYıldızlı yolculuğunda yanındayız.`
  );
  return NextResponse.json({ ok: true, email: member.email });
}
