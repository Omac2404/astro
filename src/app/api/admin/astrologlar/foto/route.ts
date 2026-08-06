import { NextResponse } from "next/server";
import { getAstrologlar, updateAstrolog, saveFile, deleteFile } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

// Astrolog fotoğrafı yükle (form-data: id + file). Eski foto varsa silinir.
export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const form = await req.formData();
  const id = String(form.get("id") ?? "");
  const file = form.get("file");
  const a = getAstrologlar().find((x) => x.id === id);
  if (!a) return NextResponse.json({ error: "Astrolog bulunamadı." }, { status: 404 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });

  const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Yalnızca JPG, PNG ya da WebP yükleyebilirsin." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Dosya 4MB'den küçük olmalı." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (a.fotoId) deleteFile(a.fotoId);
  const fotoId = saveFile(buf, ext);
  updateAstrolog(id, { fotoId });
  return NextResponse.json({ ok: true, fotoId });
}
