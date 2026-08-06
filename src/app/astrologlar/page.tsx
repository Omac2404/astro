import { notFound } from "next/navigation";
import { getAstrologAyar, getAstrologlar } from "@/lib/db";
import { seoMetadata } from "@/lib/seo";
import { AstrologKart } from "@/components/astrolog-kart";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/astrologlar");

// Astrologlar dizini — admin switch'i kapalıysa sayfa yok (404).
export default function AstrologlarSayfasi() {
  const ayar = getAstrologAyar();
  if (!ayar.acik) notFound();
  const astrologlar = getAstrologlar();
  const gridCls = ayar.grid === 4 ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-block rounded-full bg-[#4e9e7d] px-3.5 py-1 text-[12.5px] font-semibold tracking-[0.06em] text-white shadow-md shadow-black/40 ring-1 ring-white/15">
          ✦ gökname.com tavsiyesi
        </span>
        <h1 className="font-display text-5xl font-semibold">{ayar.baslik}</h1>
        {ayar.altBaslik && <p className="mt-4 text-lg leading-relaxed text-parchment/70">{ayar.altBaslik}</p>}
      </header>
      <div className={`mt-12 ${gridCls}`}>
        {astrologlar.map((a) => <AstrologKart key={a.id} a={a} />)}
      </div>
      {astrologlar.length === 0 && (
        <p className="py-16 text-center text-parchment/45">Henüz astrolog eklenmemiş.</p>
      )}
    </div>
  );
}
