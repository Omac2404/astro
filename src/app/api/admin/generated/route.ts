import { NextResponse } from "next/server";
import { getGenReports } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ generated: getGenReports() });
}
