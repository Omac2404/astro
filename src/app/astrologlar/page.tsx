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
  // flex-wrap + sabit kart genişliği: satır tam dolmadığında kalan kartlar ortalı dizilir
  const kartCls = ayar.grid === 4
    ? "w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
    : "w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]";

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="mx-auto max-w-2xl text-center">
        <span className="mb-4 inline-block rounded-full bg-[#4e9e7d] px-3.5 py-1 text-[12.5px] font-semibold tracking-[0.06em] text-white shadow-md shadow-black/40 ring-1 ring-white/15">
          ✦ gökname.com tavsiyesi
        </span>
        <h1 className="font-display text-5xl font-semibold">{ayar.baslik}</h1>
        {ayar.altBaslik && <p className="mt-4 text-lg leading-relaxed text-parchment/70">{ayar.altBaslik}</p>}
      </header>
      <div className="mt-12 flex flex-wrap justify-center gap-6">
        {astrologlar.map((a) => <div key={a.id} className={kartCls}><AstrologKart a={a} /></div>)}
      </div>
      {astrologlar.length === 0 && (
        <p className="py-16 text-center text-parchment/45">Henüz astrolog eklenmemiş.</p>
      )}
    </div>
  );
}
