import Link from "next/link";
import Image from "next/image";
import { PRODUCTS } from "@/lib/products";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/ornekler");

export default function OrneklerPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl font-semibold">Örnek analizler</h1>
        <p className="mt-4 text-lg leading-relaxed text-parchment/70">
          Karar vermeden önce her analizin gerçek bir örneğini incelemeni tavsiye ederiz.
        </p>
      </header>

      <div className="mt-14 space-y-16">
        {PRODUCTS.filter((p) => !p.gizli).map((p) => (
          <section key={p.slug} id={p.slug} className="scroll-mt-24">
            <div className="flex items-center gap-3">
              <span className="text-3xl" style={{ color: p.accent }}>{p.glyph}</span>
              <h2 className="font-display text-3xl font-semibold">{p.ad}</h2>
            </div>

            <div className="ornek-slider mt-6 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-4 sm:grid sm:snap-none sm:gap-5 sm:overflow-visible sm:pb-0 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => {
                const ornek = p.ornekler?.[i];
                const indir = p.ornekIndir?.[i];
                const slide = "ornek-slide w-[86%] shrink-0 snap-center sm:w-full sm:shrink";
                if (!ornek) {
                  return (
                    <div
                      key={i}
                      className={`img-ph aspect-[71/99] rounded-xl text-xs ${slide}`}
                      style={{ borderColor: `${p.accent}55` }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl" style={{ color: p.accent }}>{p.glyph}</span>
                        <span>görsel gelecek</span>
                        <span className="opacity-70">örnek {p.ad} #{i + 1}</span>
                      </div>
                    </div>
                  );
                }
                const cardClass =
                  `group relative block aspect-[71/99] overflow-hidden rounded-xl border transition-all ${slide}`;
                const img = (
                  <Image
                    src={ornek}
                    alt={`Örnek ${p.ad} #${i + 1}`}
                    fill
                    sizes="(max-width:1024px) 100vw, 360px"
                    className="object-cover object-top"
                  />
                );
                return indir ? (
                  <a
                    key={i}
                    href={indir.dosya}
                    download={indir.indirAd}
                    className={cardClass}
                    style={{ borderColor: `${p.accent}66` }}
                  >
                    {img}
                    <span
                      className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-night shadow-sm"
                      style={{ backgroundColor: p.accent }}
                    >
                      ↓ PDF indir
                    </span>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-night/85 py-2 text-xs font-medium text-parchment opacity-0 transition-opacity group-hover:opacity-100">
                      Örnek raporu indir
                    </span>
                  </a>
                ) : (
                  <Link
                    key={i}
                    href={`/analizler/${p.slug}`}
                    className={cardClass}
                    style={{ borderColor: `${p.accent}66` }}
                  >
                    {img}
                  </Link>
                );
              })}
            </div>

            <div className="mt-5">
              <Link
                href={`/analizler/${p.slug}`}
                className="text-sm font-medium hover:underline"
                style={{ color: p.accent }}
              >
                {p.ad} analizini al →
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
