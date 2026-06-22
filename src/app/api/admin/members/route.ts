import { NextResponse } from "next/server";
import { getMembers, getReportsByEmail, getGiftCodes, deleteMember } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const codes = getGiftCodes();
  const list = getMembers().map((m) => {
    const e = m.email.toLowerCase();
    return {
      id: m.id,
      email: m.email,
      kayit: m.kayit,
      fatura: m.fatura ?? null,
      analizler: getReportsByEmail(m.email).map((r) => ({ urunAd: r.urunAd, durum: r.durum })),
      hediyeKodlari: codes.filter((c) => c.sahip.toLowerCase() === e).map((c) => ({ urunAd: c.urunAd, durum: c.durum, kod: c.kod })),
      hediyeEdilen: codes.filter((c) => (c.kullanan || "").toLowerCase() === e).map((c) => ({ urunAd: c.urunAd, kod: c.kod })),
    };
  });
  return NextResponse.json({ members: list });
}

export async function DELETE(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { email } = await req.json().catch(() => ({}));
  if (!deleteMember(String(email ?? ""))) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
