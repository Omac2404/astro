import { NextResponse } from "next/server";
import { getOrdersByEmail } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await currentUser();
  if (!u || u.type !== "member") return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ orders: getOrdersByEmail(u.email) });
}
