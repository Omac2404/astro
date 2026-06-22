import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { sendTestMail } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin." }, { status: 403 });
  const { to } = await req.json().catch(() => ({}));
  const adres = String(to ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adres)) return NextResponse.json({ error: "Geçerli bir e-posta gir." }, { status: 400 });
  const r = await sendTestMail(adres);
  if (!r.ok) return NextResponse.json({ error: r.error || "Gönderilemedi." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
