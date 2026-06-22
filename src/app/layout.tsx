import { Cormorant_Garamond, Spectral } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import type { Metadata } from "next";
import { getSeoAyar } from "@/lib/db";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const fav = getSeoAyar().favicon.trim();
  return fav ? { icons: { icon: fav, shortcut: fav, apple: fav } } : {};
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
        {/* Header kodu — Search Console / Analytics / Pixel. SSR ile basılır, scriptler çalışır. */}
        {seo.headAktif && seo.headKod ? <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: seo.headKod }} /> : null}
        <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>
        {/* Body (</body>) öncesi kod — chat widget, dönüşüm/uzak API. */}
        {seo.bodyAktif && seo.bodyKod ? <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: seo.bodyKod }} /> : null}
      </body>
    </html>
  );
}
