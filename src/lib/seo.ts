// Statik sayfaların metadata'sını admin SEO ayarından üretir.
// Her statik sayfada: export const generateMetadata = () => seoMetadata("/...")
import type { Metadata } from "next";
import { getSeoAyar, getSeoSayfa } from "@/lib/db";

export function seoMetadata(yol: string): Metadata {
  const ayar = getSeoAyar();
  const s = getSeoSayfa(yol);
  if (!s) return {};

  const base = ayar.siteUrl.replace(/\/$/, "");
  const url = yol === "/" ? base + "/" : base + yol;
  const og = s.og ? (s.og.startsWith("http") ? s.og : base + s.og) : undefined;
  const anahtar = s.anahtar ? s.anahtar.split(/[,\n]/).map((k) => k.trim()).filter(Boolean) : undefined;

  const meta: Metadata = {
    title: s.baslik || undefined,
    description: s.aciklama || undefined,
    keywords: anahtar,
    alternates: { canonical: url },
    openGraph: {
      title: s.baslik || undefined,
      description: s.aciklama || undefined,
      url,
      siteName: "Gökname",
      type: "website",
      images: og ? [{ url: og }] : undefined,
    },
    twitter: {
      card: og ? "summary_large_image" : "summary",
      title: s.baslik || undefined,
      description: s.aciklama || undefined,
      images: og ? [og] : undefined,
    },
  };
  if (s.noindex) meta.robots = { index: false, follow: false };
  return meta;
}
