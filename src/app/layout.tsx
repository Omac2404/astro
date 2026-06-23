import { Cormorant_Garamond, Spectral } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { getSeoAyar } from "@/lib/db";

export const dynamic = "force-dynamic";

// headKod içindeki <meta name="..." content="..."> etiketlerini ayıkla — Metadata API ile
// gerçekten <head>'e basılsınlar (Google site-verification yalnız head'de okunur). İki sıra varyantı.
function metaCiftleri(headKod: string): Record<string, string> {
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  const reNameFirst = /<meta\s+[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
  while ((m = reNameFirst.exec(headKod))) out[m[1]] = m[2];
  const reContentFirst = /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']([^"']+)["'][^>]*>/gi;
  while ((m = reContentFirst.exec(headKod))) out[m[2]] ??= m[1];
  return out;
}

export function generateMetadata(): Metadata {
  const seo = getSeoAyar();
  const meta: Metadata = {};
  const fav = seo.favicon.trim();
  if (fav) meta.icons = { icon: fav, shortcut: fav, apple: fav };
  if (seo.headAktif && seo.headKod) {
    const other = metaCiftleri(seo.headKod);
    if (Object.keys(other).length) meta.other = other;
  }
  return meta;
}

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-spectral",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const seo = getSeoAyar();
  return (
    <html lang="tr" className={`${cormorant.variable} ${spectral.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-night-deep text-parchment antialiased">
        {/* Header kodu — Analytics / Pixel scriptleri (body'de de çalışır). <meta> etiketleri
            buradan çıkarılır; onlar generateMetadata ile gerçek <head>'e basılır (verification için şart). */}
        {(() => {
          const govde = seo.headAktif && seo.headKod ? seo.headKod.replace(/<meta\b[^>]*>/gi, "").trim() : "";
          return govde ? <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: govde }} /> : null;
        })()}
        <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>
        {/* Body (</body>) öncesi kod — chat widget, dönüşüm/uzak API. */}
        {seo.bodyAktif && seo.bodyKod ? <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: seo.bodyKod }} /> : null}
      </body>
    </html>
  );
}
