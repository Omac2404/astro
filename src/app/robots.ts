import type { MetadataRoute } from "next";
import { getSeoAyar } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const ayar = getSeoAyar();
  const base = ayar.siteUrl.replace(/\/$/, "");

  // noindex işaretli sayfalar + admin + hesabım: arama motorlarına kapalı
  const disallow = ["/admin", "/hesabim"];
  for (const s of ayar.sayfalar) {
    if (s.noindex && s.yol !== "/") disallow.push(s.yol);
  }
  if (!ayar.yasalSitemap) disallow.push("/yasal/");

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
