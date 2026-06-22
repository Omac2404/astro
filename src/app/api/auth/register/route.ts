import { NextResponse } from "next/server";
import { addMember, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, sifre } = await req.json().catch(() => ({}));
  const { error, member } = addMember(String(email ?? ""), String(sifre ?? ""));
  if (error || !member) return NextResponse.json({ error: error ?? "Kayıt başarısız." }, { status: 400 });
  await setSessionCookie(createSession("member", member.email));
  // Hoşgeldin e-postası (uyeKayit bildirimi açıksa)
  sendEvent(
    "uyeKayit",
    member.email,
    "Aramıza hoş geldin — gokname.com",
    `Merhaba,\n\ngokname.com'a hoş geldin! Hesabın oluşturuldu.\n\nDilediğin analizi seçip satın aldıktan sonra, hesabındaki "Analizlerim" alanından doğum bilgilerini girerek raporunu oluşturabilirsin. Gerçek gökyüzü hesabıyla, tamamen sana özel hazırlanır.\n\nYıldızlı yolculuğunda yanındayız.`
  );
  return NextResponse.json({ ok: true, email: member.email });
}
