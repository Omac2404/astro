import { getGenelAyar } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/iletisim");

export default function IletisimPage() {
  const il = getGenelAyar().iletisim;
  const sosyalVar = (il.instagram && il.instagramAktif) || (il.x && il.xAktif) || (il.tiktok && il.tiktokAktif);
  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl font-semibold">Bize ulaş</h1>
        <p className="mt-4 text-lg leading-relaxed text-parchment/70">
          Analizlerin, siparişin ya da hediye kodun hakkında her sorunda buradayız.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        {/* İletişim bilgileri */}
        <div className="space-y-6">
          {il.eposta && (
            <div className="rounded-xl border border-gold/15 bg-night p-5">
              <h3 className="font-display text-lg text-gold-bright">E-posta</h3>
              <a href={`mailto:${il.eposta}`} className="mt-1 block text-parchment/75 transition-colors hover:text-gold-bright">{il.eposta}</a>
            </div>
          )}
          {il.telefon && (
            <div className="rounded-xl border border-gold/15 bg-night p-5">
              <h3 className="font-display text-lg text-gold-bright">Telefon</h3>
              <a href={`tel:${il.telefon.replace(/\s/g, "")}`} className="mt-1 block text-parchment/75 transition-colors hover:text-gold-bright">{il.telefon}</a>
            </div>
          )}
          {il.adres && (
            <div className="rounded-xl border border-gold/15 bg-night p-5">
              <h3 className="font-display text-lg text-gold-bright">Adres</h3>
              <p className="mt-1 leading-relaxed text-parchment/75">{il.adres}</p>
            </div>
          )}
          {sosyalVar && (
            <div className="rounded-xl border border-gold/15 bg-night p-5">
              <h3 className="font-display text-lg text-gold-bright">Sosyal medya</h3>
              <div className="mt-2 flex flex-wrap gap-3">
                {il.instagram && il.instagramAktif && (
                  <a href={il.instagram} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-4 py-1.5 text-sm text-parchment/80 transition-colors hover:text-gold-bright">
                    Instagram
                  </a>
                )}
                {il.x && il.xAktif && (
                  <a href={il.x} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-4 py-1.5 text-sm text-parchment/80 transition-colors hover:text-gold-bright">
                    X
                  </a>
                )}
                {il.tiktok && il.tiktokAktif && (
                  <a href={il.tiktok} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 px-4 py-1.5 text-sm text-parchment/80 transition-colors hover:text-gold-bright">
                    TikTok
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <ContactForm />
      </div>
    </div>
  );
}
