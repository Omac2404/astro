import { NextResponse } from "next/server";
import { getSeoAyar, setSeoAyar, type SeoAyar, type SeoSayfa } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin." }, { status: 403 });
  return NextResponse.json({ seo: getSeoAyar() });
}

export async function POST(req: Request) {
  const u = await requireAdmin();
  if (!u) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  if (!u.super) return NextResponse.json({ error: "Yalnızca süper admin yapılandırabilir." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const patch: Partial<SeoAyar> = {};

  if ("siteUrl" in b) patch.siteUrl = String(b.siteUrl ?? "").trim().replace(/\/+$/, "") || "https://gokname.com";
  if ("favicon" in b) patch.favicon = String(b.favicon ?? "").trim().slice(0, 300);
  if ("yasalSitemap" in b) patch.yasalSitemap = !!b.yasalSitemap;
  if ("ekstraUrl" in b) patch.ekstraUrl = String(b.ekstraUrl ?? "").slice(0, 4000);
  if ("headKod" in b) patch.headKod = String(b.headKod ?? "").slice(0, 20000);
  if ("headAktif" in b) patch.headAktif = !!b.headAktif;
  if ("bodyKod" in b) patch.bodyKod = String(b.bodyKod ?? "").slice(0, 20000);
  if ("bodyAktif" in b) patch.bodyAktif = !!b.bodyAktif;

  if ("sayfalar" in b && Array.isArray(b.sayfalar)) {
    const mevcut = getSeoAyar().sayfalar;
    patch.sayfalar = (b.sayfalar as unknown[])
      .map((x): SeoSayfa | null => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const yol = String(o.yol ?? "").trim();
        const ref = mevcut.find((m) => m.yol === yol);
        if (!yol || !ref) return null; // yalnızca tanımlı statik sayfalar
        return {
          yol,
          ad: ref.ad,
          baslik: String(o.baslik ?? "").slice(0, 200),
          aciklama: String(o.aciklama ?? "").slice(0, 400),
          anahtar: String(o.anahtar ?? "").slice(0, 500),
          og: String(o.og ?? "").trim().slice(0, 300),
          oncelik: Math.min(1, Math.max(0, Number(o.oncelik) || 0)),
          siklik: String(o.siklik ?? "weekly"),
          sitemap: o.sitemap !== false,
          noindex: !!o.noindex,
        };
      })
      .filter((x): x is SeoSayfa => x !== null);
    if (!patch.sayfalar.length) delete patch.sayfalar;
  }

  return NextResponse.json({ seo: setSeoAyar(patch) });
}
