import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, baseUrl } from "@/lib/google";
import { upsertGoogleMember, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Google'dan dönüş: code'u doğrula, e-postayı al, üyeyi bul/oluştur, oturum aç.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthErr = url.searchParams.get("error");

  const c = await cookies();
  const raw = c.get("gn_oauth")?.value;
  c.delete("gn_oauth");

  const base = baseUrl(req);
  const fail = (msg: string) => NextResponse.redirect(base + "/giris?hata=" + encodeURIComponent(msg));

  if (oauthErr) return fail("Google girişi tamamlanmadı.");
  if (!code || !state || !raw) return fail("Google oturumu doğrulanamadı, tekrar dene.");

  let saved: { state: string; next: string };
  try { saved = JSON.parse(raw); } catch { return fail("Google oturumu doğrulanamadı, tekrar dene."); }
  if (saved.state !== state) return fail("Güvenlik doğrulaması başarısız, tekrar dene.");

  try {
    const { email, emailVerified } = await exchangeCode(req, code);
    if (!emailVerified) return fail("Google e-posta adresin doğrulanmamış.");

    const { member, created } = upsertGoogleMember(email);
    await setSessionCookie(createSession("member", member.email));

    if (created) {
      sendEvent(
        "uyeKayit",
        member.email,
        "Aramıza hoş geldin — gokname.com",
        `Merhaba,\n\ngokname.com'a Google ile hoş geldin! Hesabın oluşturuldu.\n\nDilediğin analizi seçip satın aldıktan sonra, hesabındaki "Analizlerim" alanından doğum bilgilerini girerek raporunu oluşturabilirsin. Gerçek gökyüzü hesabıyla, tamamen sana özel hazırlanır.\n\nYıldızlı yolculuğunda yanındayız.`
      );
    }

    const next = saved.next && saved.next.startsWith("/") ? saved.next : "/hesabim";
    return NextResponse.redirect(base + next);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Google girişi başarısız.");
  }
}
