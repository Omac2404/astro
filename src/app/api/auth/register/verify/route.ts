import { NextResponse } from "next/server";
import { verifyPendingRegAndCreate, createSession } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

// 2. AŞAMA — kod doğrulama: doğru kod girilince bekleyen kayıt gerçek üyeye dönüşür, oturum açılır.
// NOT: "Hoş geldin" e-postası kaldırıldı — sistem yalnızca doğrulama/şifre kodu e-postaları gönderir.
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  const { error, member } = verifyPendingRegAndCreate(String(email ?? ""), String(code ?? ""));
  if (error || !member) return NextResponse.json({ error: error ?? "Doğrulama başarısız." }, { status: 400 });

  await setSessionCookie(createSession("member", member.email));
  return NextResponse.json({ ok: true, email: member.email });
}
