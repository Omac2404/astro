import { NextResponse } from "next/server";
import { verifyResetCode, clearResetCode, setAdminPassword, setMemberPassword } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { scope, email, code, sifre } = await req.json().catch(() => ({}));
  const sc = scope === "admin" ? "admin" : "member";
  const e = String(email ?? "").trim();
  if (!verifyResetCode(sc, e, String(code ?? ""))) {
    return NextResponse.json({ error: "Kod hatalı ya da süresi dolmuş." }, { status: 400 });
  }
  if (String(sifre ?? "").length < 6) return NextResponse.json({ error: "Şifre en az 6 karakter olmalı." }, { status: 400 });
  const ok = sc === "admin" ? setAdminPassword(e, String(sifre)) : setMemberPassword(e, String(sifre));
  if (!ok) return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 400 });
  clearResetCode(sc, e);
  return NextResponse.json({ ok: true });
}
