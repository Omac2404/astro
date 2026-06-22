import { NextResponse } from "next/server";
import { getPrices, setPrice } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ prices: getPrices() });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { slug, fiyat, eskiFiyat } = await req.json().catch(() => ({}));
  const f = Number(fiyat);
  const e = Number(eskiFiyat);
  if (!slug || !Number.isFinite(f) || f < 0 || !Number.isFinite(e) || e < 0) {
    return NextResponse.json({ error: "Geçersiz fiyat." }, { status: 400 });
  }
  setPrice(String(slug), f, e);
  return NextResponse.json({ ok: true });
}
