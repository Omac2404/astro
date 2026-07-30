import { NextResponse } from "next/server";
import { getReportsByEmail, pruneOldReports, raporSilmeTarihi, raporSiraNo } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  pruneOldReports(); // silme tarihi gelen analizleri temizle (tembel)
  const reports = getReportsByEmail(u.email).map((r) => ({
    ...r,
    silmeTarih: raporSilmeTarihi(r.slug, r.tarih).toISOString(),
    sira: r.durum === "olusturuluyor" ? raporSiraNo(r.id) : 0, // üretim kuyruğundaki sıra (0 = geçerli değil)
  }));
  return NextResponse.json({ reports });
}
