import { NextResponse } from "next/server";
import { getAstrologlar, addAstrolog, updateAstrolog, removeAstrolog, getAstrologAyar, setAstrologAyar, getAstrologTik } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ astrologlar: getAstrologlar(), ayar: getAstrologAyar(), tik: getAstrologTik() });
}

// Alan sanitizasyonu: metinler kırpılır, linkler http(s) ile başlamıyorsa başına eklenir.
function temizle(b: Record<string, unknown>) {
  const url = (v: unknown) => {
    const s = String(v ?? "").trim().slice(0, 300);
    return s && !/^https?:\/\//i.test(s) ? "https://" + s : s;
  };
  return {
    ad: String(b.ad ?? "").trim().slice(0, 80),
    hakkinda: String(b.hakkinda ?? "").trim().slice(0, 300),
    profilLink: url(b.profilLink),
    instagram: url(b.instagram), facebook: url(b.facebook), x: url(b.x), youtube: url(b.youtube), tiktok: url(b.tiktok),
    website: url(b.website),
    email: String(b.email ?? "").trim().toLowerCase().slice(0, 120),
  };
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "ayar") {
    const p = b.patch ?? {};
    const patch: Record<string, unknown> = {};
    if (typeof p.acik === "boolean") patch.acik = p.acik;
    if (p.konum === "hero" || p.konum === "sss") patch.konum = p.konum;
    if (p.grid === 3 || p.grid === 4) patch.grid = p.grid;
    if (Array.isArray(p.anasayfa)) {
      const ids = p.anasayfa.map(String).filter((id: string) => getAstrologlar().some((a) => a.id === id));
      patch.anasayfa = ids.slice(0, 8); // en fazla 2 sıra × 4
    }
    if (typeof p.baslik === "string") patch.baslik = p.baslik.trim().slice(0, 120);
    if (typeof p.altBaslik === "string") patch.altBaslik = p.altBaslik.trim().slice(0, 300);
    return NextResponse.json({ ok: true, ayar: setAstrologAyar(patch) });
  }

  if (action === "ekle") {
    const t = temizle(b);
    if (!t.ad) return NextResponse.json({ error: "İsim soyisim gerekli." }, { status: 400 });
    return NextResponse.json({ ok: true, astrolog: addAstrolog(t) });
  }

  if (action === "guncelle") {
    const a = updateAstrolog(String(b.id ?? ""), temizle(b));
    if (!a) return NextResponse.json({ error: "Astrolog bulunamadı." }, { status: 404 });
    return NextResponse.json({ ok: true, astrolog: a });
  }

  if (action === "sil") {
    removeAstrolog(String(b.id ?? ""));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}
