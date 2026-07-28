import { NextResponse } from "next/server";
import { addMember, createSession, type DogumBilgi } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

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

export async function POST(req: Request) {
  const { email, sifre, dogum } = await req.json().catch(() => ({}));
  const d = parseDogum(dogum);
  if (!d) return NextResponse.json({ error: "Doğum bilgin (isim, tarih, yer) zorunlu." }, { status: 400 });
  const { error, member } = addMember(String(email ?? ""), String(sifre ?? ""), d);
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
