import { NextResponse } from "next/server";
import { addGenReport, type DogumBilgi } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { runGeneration, URETILEBILIR } from "@/lib/pipeline";
import { PRODUCTS } from "@/lib/products";

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
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const slug = String(b.slug ?? "");
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 400 });
  if (!URETILEBILIR.includes(slug)) return NextResponse.json({ error: "Bu ürün için üretim akışı henüz desteklenmiyor." }, { status: 400 });

  const dogum = parseDogum(b.dogum);
  if (!dogum) return NextResponse.json({ error: "İsim, doğum tarihi ve yer zorunlu." }, { status: 400 });

  let dogum2: DogumBilgi | undefined;
  if (slug.startsWith("sinastri")) {
    const d2 = parseDogum(b.dogum2);
    if (!d2) return NextResponse.json({ error: "Çift analiz için ikinci kişinin bilgileri zorunlu." }, { status: 400 });
    dogum2 = d2;
  }

  const g = addGenReport(slug, p.ad, dogum, dogum2);
  // Arka planda üret (sıralı kuyrukta); durum havuzdan izlenir
  runGeneration(g.id, slug, dogum, dogum2);
  return NextResponse.json({ ok: true, id: g.id });
}
