import { NextResponse } from "next/server";
import { readFile, getReportsByEmail, getOrdersByEmail, markReportIndirildi } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  // Admin her dosyaya erişebilir; üye yalnızca kendi rapor/fatura dosyasına
  if (u.type === "member") {
    const raporSahip = getReportsByEmail(u.email).some((r) => r.dosya === id);
    const sahip = raporSahip || getOrdersByEmail(u.email).some((o) => o.faturaDosya === id);
    if (!sahip) return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    // Müşteri kendi raporunu indirdi → işaretle
    if (raporSahip) markReportIndirildi(id, u.email);
  }

  const buf = readFile(id);
  if (!buf) return NextResponse.json({ error: "Dosya yok." }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}"`,
    },
  });
}
