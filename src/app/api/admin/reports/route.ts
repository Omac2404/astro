import { NextResponse } from "next/server";
import { getReports, addReport, attachReportFile, saveFile, findMember } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PRODUCTS } from "@/lib/products";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ reports: getReports() });
}

// Hazır rapor PDF'i yükle:
//  - reportId verilirse: mevcut "bekliyor" hakka dosya iliştir (hazır yap)
//  - email + slug verilirse: yeni hazır rapor oluştur ve müşteriye ata
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "PDF dosyası gerekli." }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const dosyaId = saveFile(buf, "pdf");

  const reportId = String(form.get("reportId") ?? "");
  if (reportId) {
    const r = attachReportFile(reportId, dosyaId);
    if (!r) return NextResponse.json({ error: "Rapor kaydı bulunamadı." }, { status: 404 });
    sendEvent("raporIletildi", r.email, `Analizin hazır — ${r.urunAd}`, `"${r.urunAd}" analizin hazır. Hesabındaki "Analizlerim" alanından görüntüleyip indirebilirsin.`);
    return NextResponse.json({ ok: true });
  }

  const email = String(form.get("email") ?? "");
  const slug = String(form.get("slug") ?? "");
  const m = findMember(email);
  const p = PRODUCTS.find((x) => x.slug === slug);
  if (!m || !p) return NextResponse.json({ error: "Geçerli üye ve ürün seç." }, { status: 400 });
  addReport(m.email, p.slug, p.ad, "hazir", dosyaId);
  sendEvent("raporIletildi", m.email, `Analizin hazır — ${p.ad}`, `"${p.ad}" analizin hesabına eklendi. "Analizlerim" alanından indirebilirsin.`);
  return NextResponse.json({ ok: true });
}
