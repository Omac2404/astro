import { NextResponse } from "next/server";
import { getAstrologlar, getAstrologAyar, incAstrologTik } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Herkese açık: astrolog dizini (switch kapalıysa yalnız acik:false döner — kart verisi sızmaz).
export async function GET() {
  const ayar = getAstrologAyar();
  if (!ayar.acik) return NextResponse.json({ acik: false });
  const astrologlar = getAstrologlar().map((a) => ({
    id: a.id, ad: a.ad, hakkinda: a.hakkinda, fotoId: a.fotoId ?? null, profilLink: a.profilLink ?? "",
    instagram: a.instagram ?? "", facebook: a.facebook ?? "", x: a.x ?? "", youtube: a.youtube ?? "", tiktok: a.tiktok ?? "",
    website: a.website ?? "", email: a.email ?? "",
  }));
  return NextResponse.json({
    acik: true, konum: ayar.konum, grid: ayar.grid, anasayfa: ayar.anasayfa,
    baslik: ayar.baslik, altBaslik: ayar.altBaslik, astrologlar,
  });
}

// Kart tık sayacı. Gün + cihaz tekilleştirmesi istemcide (localStorage) yapılır; burada yalnız sayılır.
export async function POST(req: Request) {
  if (!getAstrologAyar().acik) return NextResponse.json({ ok: true }); // kapalıyken sessizce yut
  const b = await req.json().catch(() => ({}));
  incAstrologTik(String(b.id ?? ""));
  return NextResponse.json({ ok: true });
}
