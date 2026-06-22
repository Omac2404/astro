import { NextResponse } from "next/server";
import { addOrder, setMemberFatura, getPaytr, type OrderItem, type Fatura } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendEvent, sendAdminEvent } from "@/lib/mail";
import { getProductPriced } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") {
    return NextResponse.json({ error: "Önce üye girişi yapmalısın.", needLogin: true }, { status: 401 });
  }
  // PayTR başvuru modu: ödeme akışı henüz açılmadı; sipariş oluşturma, uyarı dön.
  if (getPaytr().basvuruModu) {
    return NextResponse.json({ error: "Sanal pos bağlantısı bekleniyor. Ödeme altyapısı kısa süre içinde aktif olacak." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const raw: Array<string | { slug: string; hediye?: boolean }> = Array.isArray(body.items) ? body.items : [];
  const fatura: Fatura | undefined = body.fatura;
  if (!raw.length) return NextResponse.json({ error: "Sepet boş." }, { status: 400 });

  // Fiyatları sunucudan al (güvenli) — client'a güvenme
  const items: OrderItem[] = [];
  for (const it of raw) {
    const slug = typeof it === "string" ? it : it.slug;
    const hediye = typeof it === "string" ? false : !!it.hediye;
    const p = getProductPriced(slug);
    if (p) items.push({ slug: p.slug, ad: p.ad, fiyat: p.fiyat, hediye });
  }
  if (!items.length) return NextResponse.json({ error: "Geçerli ürün yok." }, { status: 400 });

  // Fatura bilgilerini üyeye kaydet (bir dahaki ödemede otomatik dolsun)
  if (fatura && fatura.ad) setMemberFatura(u.email, { ad: fatura.ad, email: fatura.email || u.email, tel: fatura.tel, adres: fatura.adres });

  const order = addOrder(u.email, items, fatura, typeof body.kaynak === "string" ? body.kaynak : undefined);
  const urunListe = items.map((it) => `• ${it.ad}${it.hediye ? " (hediye)" : ""} — ${it.fiyat} ₺`).join("\n");

  // Müşteriye sipariş onayı — aldığı ürünler liste olarak
  sendEvent(
    "siparisMusteri",
    u.email,
    "Siparişin alındı — gokname.com",
    `Siparişin alındı, teşekkür ederiz.\n\nSipariş no: ${order.id}\n\nAldığın analizler:\n${urunListe}\n\nToplam: ${order.total} ₺\n\nHesabındaki "Analizlerim" alanından doğum bilgilerini girip raporunu oluşturabilirsin. Hazır olunca seni haberdar edeceğiz.`
  );
  // Admine yeni sipariş bildirimi
  sendAdminEvent(
    "siparisAdmin",
    `Yeni sipariş — ${order.total} ₺`,
    `Yeni sipariş alındı.\n\nSipariş: ${order.id}\nMüşteri: ${u.email}\n\n${urunListe}\n\nToplam: ${order.total} ₺`
  );
  return NextResponse.json({ ok: true, orderId: order.id });
}
