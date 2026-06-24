import { NextResponse } from "next/server";
import { getOrders, faturaAdres } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  // Adresi yapısal alanlardan tek satıra derle (admin görünümü 'adres' alanını kullanır).
  const orders = getOrders().map((o) => (o.fatura ? { ...o, fatura: { ...o.fatura, adres: faturaAdres(o.fatura) } } : o));
  return NextResponse.json({ orders });
}
