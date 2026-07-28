import { NextResponse } from "next/server";
import { addReport, getMemberDogum, uyeAnalizYapabilirMi, uyeUrunKilitli, GUNLUK_ANALIZ_LIMITI } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getProductPriced } from "@/lib/catalog";
import { runReportGeneration, URETILEBILIR } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 600;

// Ücretsiz "Analizi Yap": üye + doğum bilgisi + günlük/aylık limit kontrolü.
// Tek kişilik: hesabın doğum bilgisiyle ANINDA üretilir. Çift (sinastri): 2. kişi analiz sayfasında girilir.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") {
    return NextResponse.json({ error: "Analiz yapmak için üye girişi gerekli.", needLogin: true }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({}));
  const p = getProductPriced(String(slug ?? ""));
  if (!p) return NextResponse.json({ error: "Geçersiz analiz." }, { status: 400 });

  // Doğum bilgisi zorunlu (yoksa önce onu iste)
  const dogum = getMemberDogum(u.email);
  if (!dogum) {
    return NextResponse.json({ error: "Önce doğum bilgini girmelisin.", needBirth: true }, { status: 400 });
  }

  // Ürün başına aylık limit: aynı analizi 30 günde bir (rapor silinince slot açılır)
  if (uyeUrunKilitli(u.email, p.slug)) {
    return NextResponse.json(
      { error: "Bu analizi zaten yaptın. Aynı analizi ayda bir kez oluşturabilirsin; mevcut raporun (30 gün sonra) silindiğinde tekrar yapabilirsin.", urunKilit: true },
      { status: 429 }
    );
  }
  // Günlük limit: hesap başına gün 1 analiz
  if (!uyeAnalizYapabilirMi(u.email)) {
    return NextResponse.json(
      { error: `Günde ${GUNLUK_ANALIZ_LIMITI} analiz hakkın var. Yarın tekrar deneyebilirsin.`, limit: true },
      { status: 429 }
    );
  }

  const cift = p.slug.startsWith("sinastri");
  const r = addReport(u.email, p.slug, p.ad, "bekliyor", undefined, { dogum });

  if (!cift) {
    // Tek kişilik: hesabın doğum bilgisiyle anında üretime al (arka planda kuyrukta)
    if (URETILEBILIR.includes(p.slug)) runReportGeneration(r.id, p.slug, dogum);
    return NextResponse.json({ ok: true, reportId: r.id, uretiliyor: true });
  }
  // Çift (sinastri): 2. kişi bilgisi analiz sayfasında girilecek
  return NextResponse.json({ ok: true, reportId: r.id, cift: true });
}
