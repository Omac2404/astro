import { NextResponse } from "next/server";
import { getAdmins, addAdmin, removeAdmin } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const list = getAdmins().map((a) => ({ email: a.email, ad: a.ad, super: a.super }));
  return NextResponse.json({ admins: list, me: u });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin yeni admin oluşturabilir." }, { status: 403 });
  const { ad, email, sifre } = await req.json().catch(() => ({}));
  const { error } = addAdmin(String(ad ?? ""), String(email ?? ""), String(sifre ?? ""));
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin admin silebilir." }, { status: 403 });
  const { email } = await req.json().catch(() => ({}));
  if (!removeAdmin(String(email ?? ""))) return NextResponse.json({ error: "Bu admin silinemez." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
