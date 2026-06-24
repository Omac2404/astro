import { NextResponse } from "next/server";
import { getGenelAyar, setGenelAyar, type GenelAyar, type SssItem, type HeroAyar, type YasalSayfa } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  return NextResponse.json({ ayar: getGenelAyar() });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin yapılandırabilir." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const patch: Partial<GenelAyar> = {};
  if ("apiMaliyetUSD" in b) patch.apiMaliyetUSD = Math.max(0, Number(b.apiMaliyetUSD) || 0);
  if ("posOrani" in b) patch.posOrani = Math.max(0, Number(b.posOrani) || 0);
  if ("esRaporSayisi" in b) patch.esRaporSayisi = Math.max(1, Math.min(5, Math.floor(Number(b.esRaporSayisi) || 1)));
  if ("bakimModu" in b) patch.bakimModu = !!b.bakimModu;
  if ("bakimMesaj" in b) patch.bakimMesaj = String(b.bakimMesaj ?? "").slice(0, 500);
  if ("bakimBitis" in b) patch.bakimBitis = String(b.bakimBitis ?? "").trim();
  if ("sss" in b && Array.isArray(b.sss)) {
    patch.sss = (b.sss as unknown[])
      .map((x): SssItem | null => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const q = String(o.q ?? "").trim();
        const a = String(o.a ?? "").trim();
        if (!q && !a) return null;
        const btnText = String(o.btnText ?? "").trim();
        const btnHref = String(o.btnHref ?? "").trim();
        return { q, a, ...(btnText ? { btnText } : {}), ...(btnHref ? { btnHref } : {}) };
      })
      .filter((x): x is SssItem => x !== null);
  }
  if ("hero" in b && b.hero && typeof b.hero === "object") {
    const h = b.hero as Record<string, unknown>;
    const str = (k: string, max = 400) => String(h[k] ?? "").slice(0, max);
    patch.hero = {
      baslik: str("baslik", 160), altMetin: str("altMetin", 600),
      rozet: str("rozet", 80), fiyatMetin: str("fiyatMetin", 120), eskiFiyat: str("eskiFiyat", 40), yeniFiyat: str("yeniFiyat", 40),
      btn1Metin: str("btn1Metin", 60), btn1Link: str("btn1Link", 200), btn2Metin: str("btn2Metin", 60), btn2Link: str("btn2Link", 200),
    } as HeroAyar;
  }
  if ("iletisim" in b && b.iletisim && typeof b.iletisim === "object") {
    const it = b.iletisim as Record<string, unknown>;
    patch.iletisim = {
      eposta: String(it.eposta ?? "").trim().slice(0, 120),
      telefon: String(it.telefon ?? "").trim().slice(0, 40),
      adres: String(it.adres ?? "").trim().slice(0, 300),
      instagram: String(it.instagram ?? "").trim().slice(0, 200),
      x: String(it.x ?? "").trim().slice(0, 200),
      tiktok: String(it.tiktok ?? "").trim().slice(0, 200),
      instagramAktif: !!it.instagramAktif,
      xAktif: !!it.xAktif,
      tiktokAktif: !!it.tiktokAktif,
    };
  }
  if ("yasal" in b && Array.isArray(b.yasal)) {
    patch.yasal = (b.yasal as unknown[])
      .map((x): YasalSayfa | null => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const slug = String(o.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
        const baslik = String(o.baslik ?? "").trim().slice(0, 160);
        const icerik = String(o.icerik ?? "").slice(0, 20000);
        if (!slug || !baslik) return null;
        return { slug, baslik, icerik };
      })
      .filter((x): x is YasalSayfa => x !== null);
  }

  return NextResponse.json({ ayar: setGenelAyar(patch) });
}
