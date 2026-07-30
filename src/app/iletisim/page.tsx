import { getGenelAyar } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/iletisim");

export default function IletisimPage() {
  const il = getGenelAyar().iletisim;
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <header className="text-center">
        <h1 className="font-display text-5xl font-semibold">Bize ulaş</h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-parchment/70">
          Analizlerin hakkında her sorunda buradayız. <span className="text-parchment/85">Reklam ve iş birliği</span> teklifleri için de bu sayfadan yazabilirsin.
        </p>
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
