import { getGenelAyar, iletisimEtiket } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
// Sekme/SEO başlığı moda göre (İletişim | Reklam ve İşbirliği)
export const generateMetadata = () => ({ ...seoMetadata("/iletisim"), title: `${iletisimEtiket()} — Gökname` });

export default function IletisimPage() {
  const ayar = getGenelAyar();
  const il = ayar.iletisim;
  const s = ayar.iletisimSayfa;
  const baslik = s.mod === "reklam" ? s.reklamBaslik : s.iletisimBaslik;
  const alt = s.mod === "reklam" ? s.reklamAlt : s.iletisimAlt;
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <header className="text-center">
        <h1 className="font-display text-5xl font-semibold">{baslik}</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-parchment/70">{alt}</p>
        {il.eposta && (
          <a
            href={`mailto:${il.eposta}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-night px-5 py-2.5 text-parchment/80 transition-colors hover:border-gold/45 hover:text-gold-bright"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            {il.eposta}
          </a>
        )}
      </header>

      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
