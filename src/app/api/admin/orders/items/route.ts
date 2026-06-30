import { NextResponse } from "next/server";
import { updateOrderItems, type OrderItem } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getProductPriced } from "@/lib/catalog";

export const runtime = "nodejs";

// Admin "Sepeti Düzenle": bekleyen siparişin normal kalemlerini güncelle.
// Body: { orderId, items: [{ slug, adet }] }. Fiyat/ad sunucudan (catalog) alınır; client'a güvenilmez.
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const raw: Array<{ slug?: unknown; adet?: unknown }> = Array.isArray(b.items) ? b.items : [];

  const normal: OrderItem[] = [];
  for (const it of raw) {
    const slug = String(it?.slug ?? "");
    const adet = Math.max(0, Math.min(50, Math.floor(Number(it?.adet) || 0)));
    if (!slug || adet <= 0) continue;
    const p = getProductPriced(slug);
    if (!p) continue;
    for (let k = 0; k < adet; k++) normal.push({ slug: p.slug, ad: p.ad, fiyat: p.fiyat, hediye: false });
  }

  const order = updateOrderItems(String(b.orderId ?? ""), normal);
  if (!order) return NextResponse.json({ error: "Sipariş bulunamadı ya da düzenlenemez (yalnızca bekleyen siparişler)." }, { status: 400 });
  return NextResponse.json({ ok: true, order });
}
