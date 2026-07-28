import { NextResponse } from "next/server";
import { getReportsByEmail, pruneOldReports } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  pruneOldReports(); // 30 günden eski analizleri temizle (tembel)
  return NextResponse.json({ reports: getReportsByEmail(u.email) });
}
