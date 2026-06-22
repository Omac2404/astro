import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";

export function ProductCard({ p, badge }: { p: Product; badge?: string }) {
  // Bireysel → yeşil (sağlık tonu), Çift/Sinastri → cırt gül pembesi
  const cift = !!badge && !badge.toLowerCase().startsWith("bireysel");
  const badgeBg = cift ? "bg-[#ec4d8f]" : "bg-[#9b72d0]";
  return (
    <Link
      href={`/analizler/${p.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gold/15 bg-night transition-all hover:border-gold/40 hover:-translate-y-1"
    >
      {badge && (
        <span className={`absolute right-3.5 top-3.5 z-10 inline-flex items-center rounded-full ${badgeBg} px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white shadow-md shadow-black/40 ring-1 ring-white/15`}>
          {badge}
        </span>
      )}
      {/* Görsel alanı (Udemy tarzı kapak) */}
      <div className="relative h-64 w-full overflow-hidden">
        {p.gorsel ? (
          <>
            <Image
              src={p.gorsel}
              alt={p.ad}
              fill
              sizes="(max-width:640px) 100vw, 400px"
              style={{ objectPosition: p.objectPos ?? "center 22%" }}
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night to-transparent" />
          </>
        ) : (
          <div className="img-ph absolute inset-0" style={{ borderColor: `${p.accent}55` }}>
            <span className="absolute top-3 left-3 text-3xl leading-none" style={{ color: p.accent }}>
              {p.glyph}
            </span>
            <span>görsel gelecek</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="text-[12.5px] font-medium leading-snug text-gold-bright">{p.kisa}</span>
        <h3 className="mt-1.5 font-display text-[1.65rem] leading-tight font-semibold text-parchment">
          {p.ad}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-parchment/65 flex-1">{p.kartKisa}</p>

        <div className="mt-4 flex items-end justify-between border-t border-gold/10 pt-3">
          <div className="flex flex-col items-start gap-1.5">
            <span className="inline-flex w-fit items-center rounded-full border border-gold/25 bg-night-deep px-2.5 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-gold-bright/80">
              {p.sure}
            </span>
            <span className="inline-flex w-fit items-center rounded-full border border-gold/25 bg-night-deep px-2.5 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-gold-bright/80">
              PDF raporu
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {p.eskiFiyat && (
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[#a98fd6]">
                Lansmana özel
              </span>
            )}
            <div className="flex items-baseline gap-2">
              {p.eskiFiyat && (
                <span className="text-lg font-medium text-[#a98fd6] line-through">{p.eskiFiyat} ₺</span>
              )}
              <span className="font-body text-3xl font-semibold text-gold-bright">{p.fiyat} ₺</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
