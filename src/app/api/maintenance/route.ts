import { NextResponse } from "next/server";
import { getGenelAyar } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Herkese açık: site bakım modunda mı? (SiteChrome bunu okur)
export async function GET() {
  const a = getGenelAyar();
  return NextResponse.json({ bakimModu: a.bakimModu, bakimMesaj: a.bakimMesaj, bakimBitis: a.bakimBitis });
}
