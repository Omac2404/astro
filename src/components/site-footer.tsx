import Link from "next/link";
import Image from "next/image";
import { getGenelAyar } from "@/lib/db";

// Header ile aynı sıra (hesabım/giriş yok)
const LINKS = [
  { href: "/", label: "Anasayfa" },
  { href: "/analizler", label: "Analizler" },
  { href: "/ornekler", label: "Örnek Analizler" },
  { href: "/nasil-calisir", label: "Nasıl Hazırlanır?" },
  { href: "/sss", label: "S.S.S." },
  { href: "/iletisim", label: "İletişim" },
];

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-parchment/70 transition-colors hover:border-gold/60 hover:text-gold-bright"
    >
      {children}
    </a>
  );
}

export function SiteFooter() {
  const yasal = getGenelAyar().yasal;
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

        {/* Sosyal */}
        <div className="mt-9 flex justify-center gap-3">
          <Social href="#" label="Instagram">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </Social>
          <Social href="#" label="X">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Social>
          <Social href="mailto:destek@gokname.com" label="E-posta">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m3.5 7 8.5 5.5L20.5 7" />
            </svg>
          </Social>
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
