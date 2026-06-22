import { NextResponse } from "next/server";
import { addReport, findMember } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PRODUCTS } from "@/lib/products";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

// Müşteriye ürün (analiz hakkı) atar — "bekliyor" rapor kaydı açar.
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { email, slug } = await req.json().catch(() => ({}));
  const m = findMember(String(email ?? ""));
  if (!m) return NextResponse.json({ error: "Bu e-postayla bir üye yok." }, { status: 404 });
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!p) return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 400 });

  addReport(m.email, p.slug, p.ad, "bekliyor");
  sendMail(m.email, `Yeni analiz hakkın tanımlandı — ${p.ad}`, `Hesabına "${p.ad}" analizi tanımlandı. "Analizlerim" alanından doğum bilgilerini girip raporunu oluşturabilirsin.`);
  return NextResponse.json({ ok: true });
}
