import { NextResponse } from "next/server";
import { getMembers, getReportsByEmail, getGiftCodes, deleteMember, faturaAdres, setMemberDogumAdmin } from "@/lib/db";
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
      dogum: m.dogum ?? null,
      fatura: m.fatura ? { ...m.fatura, adres: faturaAdres(m.fatura) } : null,
      analizler: getReportsByEmail(m.email).map((r) => ({ urunAd: r.urunAd, durum: r.durum })),
      hediyeKodlari: codes.filter((c) => c.sahip.toLowerCase() === e).map((c) => ({ urunAd: c.urunAd, durum: c.durum, kod: c.kod })),
      hediyeEdilen: codes.filter((c) => (c.kullanan || "").toLowerCase() === e).map((c) => ({ urunAd: c.urunAd, kod: c.kod })),
    };
  });
  return NextResponse.json({ members: list });
}

// Üyenin doğum bilgisini güncelle/tanımla (admin — üye tarafındaki "değiştirilemez" kilidine takılmaz)
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const o = (b.dogum ?? {}) as Record<string, unknown>;
  const dogum = {
    ad: String(o.ad ?? "").trim().slice(0, 25),
    tarih: String(o.tarih ?? "").trim().slice(0, 10),
    saat: String(o.saat ?? "").trim().slice(0, 5),
    yer: String(o.yer ?? "").trim().slice(0, 120),
  };
  if (!dogum.ad || !dogum.tarih || !dogum.yer) return NextResponse.json({ error: "İsim, doğum tarihi ve yer zorunlu." }, { status: 400 });
  if (!setMemberDogumAdmin(String(b.email ?? ""), dogum)) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { email } = await req.json().catch(() => ({}));
  if (!deleteMember(String(email ?? ""))) return NextResponse.json({ error: "Üye bulunamadı." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
