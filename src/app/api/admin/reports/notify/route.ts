import { NextResponse } from "next/server";
import { findReport } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { sendEvent } from "@/lib/mail";

export const runtime = "nodejs";

// Hazır raporu müşteriye e-posta ile ilet (müşteri hesabından erişemediyse).
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const { reportId } = await req.json().catch(() => ({}));
  const r = findReport(String(reportId ?? ""));
  if (!r) return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
  if (r.durum !== "hazir" || !r.dosya) return NextResponse.json({ error: "Rapor henüz hazır değil." }, { status: 400 });

  sendEvent(
    "raporIletildi",
    r.email,
    `Analizin hazır — ${r.urunAd}`,
    `Merhaba,\n"${r.urunAd}" analizin hazır. Hesabına giriş yapıp "Analizlerim" alanından görüntüleyip indirebilirsin.\nHerhangi bir sorun yaşarsan bu e-postayı yanıtlaman yeterli.\n— Gökname`
  );
  return NextResponse.json({ ok: true });
}
