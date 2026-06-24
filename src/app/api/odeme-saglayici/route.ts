import { NextResponse } from "next/server";
import { getPaytr } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Herkese açık: sitede gösterilecek ödeme sağlayıcı logosu (paytr | iyzico).
export async function GET() {
  return NextResponse.json({ saglayici: getPaytr().saglayici });
}
