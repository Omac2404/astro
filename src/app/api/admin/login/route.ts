import { NextResponse } from "next/server";
import { findAdmin, verifyPw, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, sifre } = await req.json().catch(() => ({}));
  const a = findAdmin(String(email ?? ""));
  if (!a || !verifyPw(String(sifre ?? ""), a.sifre)) {
    return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 400 });
  }
  await setSessionCookie(createSession("admin", a.email));
  return NextResponse.json({ ok: true, email: a.email, super: a.super, ad: a.ad });
}
