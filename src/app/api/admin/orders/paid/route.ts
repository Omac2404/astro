import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

// Admin "Ödendi" butonu (WhatsApp/havale): bekleyen siparişi tamamlar, ürünleri hesaba tanımlar,
// müşteriye onay e-postası gönderir. İdempotent: zaten ödendiyse tekrar atama/mail yapmaz.
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { orderId } = await req.json().catch(() => ({}));
  const res = markOrderPaid(String(orderId ?? ""));
  if (!res) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });

  if (res.created) {
    const o = res.order;
    // Sepeti grupla (aynı üründen 2+ olabilir) — mail listesi için adet
    const grup = new Map<string, { ad: string; hediye: boolean; adet: number }>();
    for (const it of o.items) {
      const key = it.slug + (it.hediye ? ":h" : "");
      const g = grup.get(key);
      if (g) g.adet++;
      else grup.set(key, { ad: it.ad, hediye: !!it.hediye, adet: 1 });
    }
    const urunListe = [...grup.values()].map((g) => `• ${g.ad}${g.hediye ? " (hediye)" : ""} ×${g.adet}`).join("\n");
    sendEvent(
      "siparisMusteri",
      o.email,
      "Siparişin onaylandı — gokname.com",
      `Ödemen alındı, siparişin onaylandı. Teşekkür ederiz.\n\nSipariş no: ${o.id}\n\nHesabına tanımlanan analizler:\n${urunListe}\n\nHesabındaki "Analizlerim" alanından doğum bilgilerini girip raporunu oluşturabilirsin. Hazır olunca seni haberdar edeceğiz.`
    );
  }
  return NextResponse.json({ ok: true, durum: res.order.durum, created: res.created });
}
