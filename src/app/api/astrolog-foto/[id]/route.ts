import { NextResponse } from "next/server";
import { readFile, getAstrologlar, getAstrologAyar } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Herkese açık astrolog fotoğrafı. Yalnız bir astrologa bağlı foto id'leri servis edilir
// (rastgele .data/files dosyalarına açık kapı olmasın). Switch kapalıysa yalnız admin görür (panel önizlemesi).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!getAstrologAyar().acik && !(await requireAdmin())) return NextResponse.json({ error: "Yok." }, { status: 404 });
  if (!getAstrologlar().some((a) => a.fotoId === id)) return NextResponse.json({ error: "Yok." }, { status: 404 });
  const buf = readFile(id);
  if (!buf) return NextResponse.json({ error: "Yok." }, { status: 404 });
  const ext = id.split(".").pop() ?? "";
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=3600" },
  });
}
