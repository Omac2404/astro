import { NextResponse } from "next/server";
import { getPaytr } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Herkese açık: sitede gösterilecek ödeme sağlayıcı logosu (paytr | iyzico) + ödeme modu (pos | whatsapp).
export async function GET() {
  const c = getPaytr();
  return NextResponse.json({ saglayici: c.saglayici, odemeModu: c.odemeModu });
}
