import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { authUrl, googleConfigured, baseUrl } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kullanıcıyı Google onay ekranına yönlendirir. CSRF için rastgele state üretir,
// state + dönüş adresini (next) kısa ömürlü httpOnly cookie'ye yazar.
export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(baseUrl(req) + "/giris?hata=" + encodeURIComponent("Google girişi şu an kullanılamıyor."));
  }
  const nextParam = new URL(req.url).searchParams.get("next") || "/hesabim";
  const next = nextParam.startsWith("/") ? nextParam : "/hesabim"; // açık yönlendirme (open redirect) koruması
  const state = crypto.randomBytes(16).toString("hex");

  const c = await cookies();
  c.set("gn_oauth", JSON.stringify({ state, next }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 600, // 10 dk
  });
  return NextResponse.redirect(authUrl(req, state));
}
