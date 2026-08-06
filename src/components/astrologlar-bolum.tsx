import Link from "next/link";
import { getAstrologAyar, getAstrologlar } from "@/lib/db";
import { AstrologKart } from "@/components/astrolog-kart";

// Anasayfa "Astrologlar" bloğu (server) — switch açıkken, admin'in seçtiği konumda render edilir.
// Admin'in seçtiği kartlar seçtiği sırayla; hiç seçmediyse ilk 2 sıra dolusu kart gösterilir.
export function AstrologlarBolum() {
  const ayar = getAstrologAyar();
  if (!ayar.acik) return null;
  const hepsi = getAstrologlar();
  const max = ayar.grid * 2;
  const secili = ayar.anasayfa
    .map((id) => hepsi.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, max);
  const kartlar = secili.length ? secili : hepsi.slice(0, max);
  if (!kartlar.length) return null;

  // flex-wrap + sabit kart genişliği: satır tam dolmadığında (2-3 kart) kalanlar ORTALI dizilir (grid sola yaslıyordu)
  const kartCls = ayar.grid === 4
    ? "w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
    : "w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]";
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-10">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <span className="mb-3 inline-block rounded-full bg-[#4e9e7d] px-3.5 py-1 text-[12.5px] font-semibold tracking-[0.06em] text-white shadow-md shadow-black/40 ring-1 ring-white/15">
          ✦ gökname.com tavsiyesi
        </span>
        <h2 className="font-display text-4xl font-semibold">{ayar.baslik}</h2>
        {ayar.altBaslik && <p className="mt-3 text-[15px] leading-relaxed text-parchment/60">{ayar.altBaslik}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-6">
        {kartlar.map((a) => <div key={a.id} className={kartCls}><AstrologKart a={a} /></div>)}
      </div>
      <div className="mt-8 text-center">
        <Link href="/astrologlar" className="text-sm text-gold-bright hover:underline">Tüm astrologları gör →</Link>
      </div>
    </section>
  );
}
