import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, baseUrl } from "@/lib/google";
import { upsertGoogleMember, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

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

    const { member } = upsertGoogleMember(email);
    await setSessionCookie(createSession("member", member.email));
    // NOT: "Hoş geldin" e-postası kaldırıldı — sistem yalnızca doğrulama/şifre kodu e-postaları gönderir.

    const next = saved.next && saved.next.startsWith("/") ? saved.next : "/hesabim";
    // Doğum bilgisi yoksa (Google üyeleri vermez) önce onu iste — bir kez, sonra kilitli.
    if (!member.dogum) return NextResponse.redirect(base + "/hesabim/dogum?next=" + encodeURIComponent(next));
    return NextResponse.redirect(base + next);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Google girişi başarısız.");
  }
}
