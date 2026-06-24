import { NextResponse } from "next/server";
import { getMembers, getOrders, getGenelAyar, faturaAdres } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getUsdTry } from "@/lib/kur";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const members = getMembers().map((m) => ({ email: m.email, ad: m.fatura?.ad ?? null, tel: m.fatura?.tel ?? null, adres: faturaAdres(m.fatura) || null, kayit: m.kayit }));
  const orders = getOrders().map((o) => ({
    id: o.id,
    email: o.email,
    ad: o.fatura?.ad ?? o.email,
    urunler: o.items.map((i) => i.ad),
    items: o.items.map((i) => ({ slug: i.slug, ad: i.ad, fiyat: i.fiyat, hediye: !!i.hediye })),
    adet: o.items.length,
    total: o.total,
    tarih: o.tarih,
  }));

  const ayar = getGenelAyar();
  const kur = await getUsdTry();
  return NextResponse.json({ members, orders, ayar: { apiMaliyetUSD: ayar.apiMaliyetUSD, posOrani: ayar.posOrani }, kur });
}
