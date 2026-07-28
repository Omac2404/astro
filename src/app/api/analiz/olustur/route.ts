import { NextResponse } from "next/server";
import { addReport, uyeAnalizYapabilirMi, GUNLUK_ANALIZ_LIMITI } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getProductPriced } from "@/lib/catalog";

export const runtime = "nodejs";

// Ücretsiz "Analizi Yap": üye + günlük limit kontrolü -> analiz hakkı (rapor) oluşturur.
// Ödeme/sepet yok. Kullanıcı sonra "Analizlerim"de doğum bilgisini girip üretir.
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") {
    return NextResponse.json({ error: "Analiz yapmak için üye girişi gerekli.", needLogin: true }, { status: 401 });
  }
  const { slug } = await req.json().catch(() => ({}));
  const p = getProductPriced(String(slug ?? ""));
  if (!p) return NextResponse.json({ error: "Geçersiz analiz." }, { status: 400 });

  if (!uyeAnalizYapabilirMi(u.email)) {
    return NextResponse.json(
      { error: `Günde ${GUNLUK_ANALIZ_LIMITI} analiz hakkın var. Yarın tekrar deneyebilirsin.`, limit: true },
      { status: 429 }
    );
  }

  const r = addReport(u.email, p.slug, p.ad, "bekliyor");
  return NextResponse.json({ ok: true, reportId: r.id });
}
