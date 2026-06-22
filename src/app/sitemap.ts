import type { MetadataRoute } from "next";
import { getSeoAyar, getGenelAyar } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const ayar = getSeoAyar();
  const base = ayar.siteUrl.replace(/\/$/, "");
  const now = new Date();
  const cf = (s: string) => (["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].includes(s) ? s : "weekly") as MetadataRoute.Sitemap[number]["changeFrequency"];

  const giris: MetadataRoute.Sitemap = [];

  // Statik sayfalar (sitemap'e dahil + noindex değil)
  for (const s of ayar.sayfalar) {
    if (!s.sitemap || s.noindex) continue;
    giris.push({
      url: s.yol === "/" ? base + "/" : base + s.yol,
      lastModified: now,
      changeFrequency: cf(s.siklik),
      priority: Math.min(1, Math.max(0, s.oncelik)),
    });
  }

  // Yasal sayfalar (opsiyonel)
  if (ayar.yasalSitemap) {
    for (const y of getGenelAyar().yasal) {
      giris.push({ url: `${base}/yasal/${y.slug}`, lastModified: now, changeFrequency: "yearly", priority: 0.3 });
    }
  }

  // Manuel ekstra URL'ler
  for (const satir of ayar.ekstraUrl.split("\n").map((x) => x.trim()).filter(Boolean)) {
    const url = satir.startsWith("http") ? satir : base + (satir.startsWith("/") ? satir : "/" + satir);
    giris.push({ url, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }

  return giris;
}
