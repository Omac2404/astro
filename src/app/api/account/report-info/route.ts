import { NextResponse } from "next/server";
import { setReportBirthInfo, type DogumBilgi } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { runReportGeneration, URETILEBILIR } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 600;

function parseDogum(o: Record<string, unknown> | undefined): DogumBilgi | null {
  if (!o) return null;
  const ad = String(o.ad ?? "").trim().slice(0, 25);
  const tarih = String(o.tarih ?? "").trim();
  const saat = String(o.saat ?? "").trim();
  const yer = String(o.yer ?? "").trim();
  if (!ad || !tarih || !yer) return null;
  return { ad, tarih, saat, yer };
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  const dogum = parseDogum(b.dogum);
  if (!dogum) return NextResponse.json({ error: "İsim, doğum tarihi ve yer zorunlu." }, { status: 400 });

  let dogum2: DogumBilgi | undefined;
  if (b.dogum2) {
    const d2 = parseDogum(b.dogum2);
    if (!d2) return NextResponse.json({ error: "İkinci kişi için isim, doğum tarihi ve yer zorunlu." }, { status: 400 });
    dogum2 = d2;
  }

  const r = setReportBirthInfo(String(b.reportId ?? ""), u.email, dogum, dogum2);
  if (!r) return NextResponse.json({ error: "Analiz kaydı bulunamadı." }, { status: 404 });
  // NOT: "Analizin hazırlanıyor" bilgi e-postası kaldırıldı (e-posta maliyeti/trafiği).
  //      Durum zaten sayfadaki popup + "Analizlerim"de canlı görünüyor.

  // Gerçek üretimi başlat (sıralı kuyrukta, arka planda). Desteklenen ürünler için.
  if (URETILEBILIR.includes(r.slug)) {
    runReportGeneration(r.id, r.slug, dogum, dogum2);
  }
  return NextResponse.json({ ok: true });
}
