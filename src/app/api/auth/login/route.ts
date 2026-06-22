import { NextResponse } from "next/server";
import { findMember, verifyPw, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { email, sifre } = await req.json().catch(() => ({}));
  const m = findMember(String(email ?? ""));
  if (!m || !verifyPw(String(sifre ?? ""), m.sifre)) {
    return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 400 });
  }
  await setSessionCookie(createSession("member", m.email));
  return NextResponse.json({ ok: true, email: m.email });
}
