import Link from "next/link";
import Image from "next/image";
import { getGenelAyar, getPaytr } from "@/lib/db";

// Header ile aynı sıra (hesabım/giriş yok)
const LINKS = [
  { href: "/", label: "Anasayfa" },
  { href: "/analizler", label: "Analizler" },
  { href: "/ornekler", label: "Örnek Analizler" },
  { href: "/nasil-calisir", label: "Nasıl Hazırlanır?" },
  { href: "/sss", label: "S.S.S." },
  { href: "/iletisim", label: "İletişim" },
];

function Social({ href, label, external, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-parchment/70 transition-colors hover:border-gold/60 hover:text-gold-bright"
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  const { yasal, iletisim: il } = getGenelAyar();
  const saglayici = getPaytr().saglayici;
  return (
    <footer className="relative overflow-hidden border-t border-gold/15 bg-night-deep">
      {/* ince üst ışıltı + hafif yıldız dokusu + üstte ortalı hâle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />
      <div className="starfield pointer-events-none absolute inset-0 opacity-25" />
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[40rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(220,193,136,0.4), transparent)" }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center">
        {/* Dikey logo — ortada */}
        <Link href="/" aria-label="Gökname ana sayfa" className="inline-block">
          <Image
            src="/gorsel/logo-dikey.png"
            alt="Gökname"
            width={588}
            height={373}
            className="mx-auto h-36 w-auto select-none"
          />
        </Link>

        {/* Açıklama */}
        <p className="mt-6 max-w-md text-sm leading-relaxed text-parchment/60">
          Gerçek astronomik hesaba dayalı, tamamen sana özel hazırlanan astroloji analizleri.
        </p>

        {/* İnce ayraç */}
        <div className="mt-8 h-px w-16 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

        {/* Linkler — header sırası, tek blok ortalı */}
        <nav className="mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-7 gap-y-3.5 text-sm text-parchment/70">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-gold-bright">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Yasal sayfalar — alt satır */}
        {yasal.length > 0 && (
          <nav className="mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-parchment/45">
            {yasal.map((y) => (
              <Link key={y.slug} href={`/yasal/${y.slug}`} className="transition-colors hover:text-gold-bright">
                {y.baslik}
              </Link>
            ))}
          </nav>
        )}

        {/* Sosyal — yalnızca admin'de switch'i AÇIK ve linki girilmiş hesaplar + e-posta */}
        <div className="mt-9 flex justify-center gap-3">
          {il.instagramAktif && il.instagram && (
            <Social href={il.instagram} label="Instagram" external>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
              </svg>
            </Social>
          )}
          {il.xAktif && il.x && (
            <Social href={il.x} label="X" external>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Social>
          )}
          {il.tiktokAktif && il.tiktok && (
            <Social href={il.tiktok} label="TikTok" external>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M16.5 3c.26 1.94 1.62 3.5 3.5 3.77v2.4c-1.27.02-2.45-.36-3.5-1.06v6.06a5.6 5.6 0 1 1-5.6-5.6c.24 0 .47.02.7.05v2.55a3.06 3.06 0 1 0 2.15 2.92V3h2.75z" />
              </svg>
            </Social>
          )}
          {il.eposta && (
            <Social href={`mailto:${il.eposta}`} label="E-posta">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m3.5 7 8.5 5.5L20.5 7" />
              </svg>
            </Social>
          )}
        </div>

        {/* Ödeme logoları — Mastercard · Visa · Troy + PayTR (sistemdeki görseller) */}
        <div className="mt-9 flex flex-col items-center gap-2.5 opacity-90">
          <Image src="/gorsel/odeme-kartlar.png" alt="Mastercard, Visa, Troy" width={1152} height={272} unoptimized className="h-7 w-auto" />
          {saglayici === "iyzico" ? (
            <Image src="/gorsel/odeme-iyzico.png" alt="iyzico" width={462} height={123} unoptimized className="h-4 w-auto" />
          ) : (
            <Image src="/gorsel/odeme-paytr.webp" alt="PayTR" width={2000} height={430} unoptimized className="h-3.5 w-auto brightness-0 invert" />
          )}
        </div>
      </div>

      {/* Alt bar */}
      <div className="relative border-t border-gold/10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-2 px-5 py-5 text-xs text-parchment/45 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} gokname.com. Tüm hakları saklıdır.</span>
          <span className="inline-flex items-center gap-1.5 tracking-wide">
            <span className="text-gold-bright/60">✶</span>
            <a href="https://webreta.com.tr" target="_blank" rel="noopener" className="font-medium text-emerald-300 transition-colors hover:text-emerald-200">Webreta</a>
            tarafından yıldızların ışığında geliştirilmektedir.
          </span>
        </div>
      </div>
    </footer>
  );
}
