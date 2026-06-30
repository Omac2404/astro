import { NextResponse } from "next/server";
import { addOrder, setMemberFatura, getPaytr, faturaAdres, type OrderItem, type Fatura } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendEvent, sendAdminEvent } from "@/lib/mail";
import { getProductPriced } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") {
    return NextResponse.json({ error: "Önce üye girişi yapmalısın.", needLogin: true }, { status: 401 });
  }
  const cfg = getPaytr();
  const whatsappModu = cfg.odemeModu === "whatsapp";
  // PayTR başvuru modu yalnızca sanal pos akışını kilitler; WhatsApp/havale modunda sipariş alınabilir.
  if (!whatsappModu && cfg.basvuruModu) {
    return NextResponse.json({ error: "Sanal pos bağlantısı bekleniyor. Ödeme altyapısı kısa süre içinde aktif olacak." }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const raw: Array<string | { slug: string; hediye?: boolean }> = Array.isArray(body.items) ? body.items : [];
  // Fatura — client'tan gelen yapısal adresi temizleyerek al (güvenli).
  const rf = body.fatura && typeof body.fatura === "object" ? (body.fatura as Record<string, unknown>) : undefined;
  const s = (k: string) => String(rf?.[k] ?? "").trim().slice(0, 200);
  const fatura: Fatura | undefined = rf
    ? { ad: s("ad"), email: s("email") || u.email, tel: s("tel"), yurtdisi: !!rf.yurtdisi, il: s("il"), ilce: s("ilce"), ulke: s("ulke"), sehir: s("sehir"), acikAdres: s("acikAdres") }
    : undefined;
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
  if (fatura && fatura.ad) setMemberFatura(u.email, fatura);

  const kaynak = typeof body.kaynak === "string" ? body.kaynak : undefined;

  // Sepeti grupla — aynı üründen 2+ olabilir; mesaj/mail için adet ve satır toplamı
  const grupMap = new Map<string, { ad: string; hediye: boolean; adet: number; birim: number }>();
  for (const it of items) {
    const key = it.slug + (it.hediye ? ":h" : "");
    const g = grupMap.get(key);
    if (g) g.adet++;
    else grupMap.set(key, { ad: it.ad, hediye: !!it.hediye, adet: 1, birim: it.fiyat });
  }
  const satirlar = [...grupMap.values()].map((g) => `• ${g.ad}${g.hediye ? " (hediye)" : ""} ×${g.adet} — ${g.birim * g.adet} ₺`);
  const urunListe = satirlar.join("\n");

  // --- WhatsApp / havale modu: sipariş "bekliyor" oluşur, ürünler "Ödendi" anında atanır ---
  if (whatsappModu) {
    const order = addOrder(u.email, items, fatura, kaynak, { pending: true });
    const mesaj = [
      "Merhaba, Gökname'den havale/EFT ile sipariş vermek istiyorum.",
      "",
      `Sipariş No: ${order.id}`,
      "",
      "Ürünler:",
      ...satirlar,
      `Toplam: ${order.total} ₺`,
      "",
      "Fatura Bilgileri:",
      `Ad Soyad: ${fatura?.ad || "-"}`,
      `E-posta: ${fatura?.email || u.email}`,
      `Telefon: ${fatura?.tel || "-"}`,
      `Adres: ${faturaAdres(fatura) || "-"}`,
    ].join("\n");
    const numara = (cfg.whatsappNumara || "").replace(/\D/g, "");
    const url = `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`;
    sendAdminEvent(
      "siparisAdmin",
      `Yeni bekleyen sipariş (WhatsApp/havale) — ${order.total} ₺`,
      `WhatsApp/havale ile yeni bir sipariş talebi alındı ve "bekliyor" durumunda.\n\nSipariş: ${order.id}\nMüşteri: ${u.email}\n\n${urunListe}\nToplam: ${order.total} ₺\n\nHavaleyi aldıktan sonra admin → Siparişler'den "Ödendi" ile tamamla.`
    );
    sendEvent(
      "siparisMusteri",
      u.email,
      "Sipariş talebin alındı — gokname.com",
      `Sipariş talebin alındı.\n\nSipariş no: ${order.id}\n\nSeçtiğin analizler:\n${urunListe}\nToplam: ${order.total} ₺\n\nÖdemen (havale/EFT) onaylandıktan sonra analizlerin hesabına tanımlanacak ve "Analizlerim"den raporunu oluşturabileceksin. Seni haberdar edeceğiz.`
    );
    return NextResponse.json({ ok: true, orderId: order.id, whatsapp: { url } });
  }

  // --- Sanal POS / normal mod (mevcut davranış: anında ödendi + ürünler atanır) ---
  const order = addOrder(u.email, items, fatura, kaynak);
  sendEvent(
    "siparisMusteri",
    u.email,
    "Siparişin alındı — gokname.com",
    `Siparişin alındı, teşekkür ederiz.\n\nSipariş no: ${order.id}\n\nAldığın analizler:\n${urunListe}\n\nToplam: ${order.total} ₺\n\nHesabındaki "Analizlerim" alanından doğum bilgilerini girip raporunu oluşturabilirsin. Hazır olunca seni haberdar edeceğiz.`
  );
  sendAdminEvent(
    "siparisAdmin",
    `Yeni sipariş — ${order.total} ₺`,
    `Yeni sipariş alındı.\n\nSipariş: ${order.id}\nMüşteri: ${u.email}\n\n${urunListe}\n\nToplam: ${order.total} ₺`
  );
  return NextResponse.json({ ok: true, orderId: order.id });
}
