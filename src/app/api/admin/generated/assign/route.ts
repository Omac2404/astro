import { NextResponse } from "next/server";
import { getGenReports, updateGenReport, addReport, findMember } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { genId, email } = await req.json().catch(() => ({}));
  const g = getGenReports().find((x) => x.id === genId);
  if (!g) return NextResponse.json({ error: "Üretilen rapor bulunamadı." }, { status: 404 });
  if (g.durum !== "hazir" || !g.dosya) return NextResponse.json({ error: "Rapor henüz hazır değil." }, { status: 400 });
  const m = findMember(String(email ?? ""));
  if (!m) return NextResponse.json({ error: "Bu e-postayla bir üye yok." }, { status: 404 });

  // Müşterinin hesabına hazır rapor olarak ekle (isim + admin etiketiyle)
  addReport(m.email, g.slug, g.urunAd, "hazir", g.dosya, { dogum: g.dogum, dogum2: g.dogum2, adminIletti: true });
  updateGenReport(g.id, { atandi: m.email });
  sendEvent("raporIletildi", m.email, `Analizin hazır — ${g.urunAd}`, `"${g.urunAd}" analizin hesabına eklendi. "Analizlerim" alanından görüntüleyip indirebilirsin.`);
  return NextResponse.json({ ok: true });
}
