import Link from "next/link";
import Image from "next/image";
import { bireysel, cift } from "@/lib/catalog";
import { getGenelAyar, getAstrologAyar } from "@/lib/db";
import { seoMetadata } from "@/lib/seo";
import { ProductCard } from "@/components/product-card";
import { Faq } from "@/components/faq";
import { AstrologlarBolum } from "@/components/astrologlar-bolum";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/");

// Hero başlığında **...** → altın vurgu
function heroBaslik(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <span key={i} className="text-gold-bright">{part.slice(2, -2)}</span>
      : <span key={i}>{part}</span>
  );
}

export default function Home() {
  const BIREYSEL = bireysel();
  const CIFT = cift();
  const ayar = getGenelAyar();
  const hero = ayar.hero;
  const SSS_HOME = ayar.sss.slice(0, 6);
  const astrologKonum = getAstrologAyar().konum; // blok yalnız switch açıkken render olur (bileşen içinde kontrol)
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative z-10 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(155,114,208,0.18), transparent 55%)" }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <h1 className="font-display text-[2.35rem] sm:text-6xl font-semibold leading-[1.05] text-parchment">
              {heroBaslik(hero.baslik)}
            </h1>
            {hero.altMetin && (
              <p className="mt-5 max-w-md text-lg leading-relaxed text-parchment/70">{hero.altMetin}</p>
            )}
            {/* Instagram tanıtım cümlesi — tek renk IG turuncusu (ss10: gradyandan vazgeçildi); metin adminden */}
            {hero.igMetin && (
              <a href={hero.igLink || "https://instagram.com"} target="_blank" rel="noopener noreferrer"
                className="mt-4 block max-w-md text-[15px] font-semibold leading-relaxed text-[#FBCE5A] transition-opacity hover:opacity-85">
                {hero.igMetin}
              </a>
            )}
            {/* Fiyat/lansman promosu kaldırıldı (ücretsiz modele geçildi) */}
            {/* Butonlar mobilde HER ZAMAN yan yana (ss11): dar ekranda eşit bölüşür, sm+ doğal genişlik */}
            <div className="mt-8 flex flex-nowrap items-stretch gap-3 sm:gap-4">
              {/* 1. buton: Instagram (IG renklerinde, ikonlu) — metin/link adminden */}
              {hero.igButonMetin && (
                <a href={hero.igLink || "https://instagram.com"} target="_blank" rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2.5 text-[13.5px] font-medium text-white sm:py-3 shadow-lg shadow-[#ee2a7b]/25 transition-opacity hover:opacity-90 sm:flex-initial sm:gap-2.5 sm:px-7 sm:text-base"
                  style={{ background: "linear-gradient(60deg,#f9ce34 0%,#ee2a7b 45%,#6228d7 100%)" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                    <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
                  </svg>
                  {hero.igButonMetin}
                </a>
              )}
              {hero.btn1Metin && (
                <Link href={hero.btn1Link || "/analizler"} className="group inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-gold/40 px-2.5 py-2.5 text-[13.5px] font-medium text-gold-bright sm:py-3 transition-colors hover:bg-gold/10 sm:flex-initial sm:px-7 sm:text-base">
                  {hero.btn1Metin}
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              )}
              {/* 2. buton (Örnekler) ss9 ile kaldırıldı — kayıtlı eski ayarlar geri getirmesin diye render da yok */}
            </div>
          </div>

          {/* Hero görseli — mobilde en üstte (başlığın üstünde); masaüstünde sağda, sola yazıların arkasına yayılır */}
          <div className="relative order-first w-full lg:order-none lg:-ml-48 lg:-mr-10 lg:w-[calc(100%+14rem)]">
            <Image
              src="/gorsel/hero.png"
              alt="Gökname örnek raporları"
              width={1251}
              height={795}
              priority
              sizes="(max-width:1024px) 100vw, 780px"
              className="h-auto w-full select-none [-webkit-mask-image:linear-gradient(to_bottom,#000_70%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_70%,transparent_100%)] lg:[-webkit-mask-composite:source-in] lg:[-webkit-mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%),linear-gradient(to_right,transparent_0%,#000_34%)] lg:[mask-composite:intersect] lg:[mask-image:linear-gradient(to_bottom,#000_68%,transparent_100%),linear-gradient(to_right,transparent_0%,#000_34%)]"
            />
          </div>
        </div>
      </section>

      {/* ASTROLOGLAR — hero altı konumu (admin: Astrologlar switch + konum) */}
      {astrologKonum === "hero" && <AstrologlarBolum />}

      {/* ANALİZLER */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-8 pt-4 sm:pt-6">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-4xl font-semibold">Sana özel analizler</h2>
          </div>
          <Link href="/analizler" className="hidden sm:inline text-sm text-gold-bright hover:underline">
            Tümünü gör →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BIREYSEL.map((p) => (
            <ProductCard key={p.slug} p={p} badge="Bireysel Analiz" />
          ))}
        </div>

        {/* Çift analizleri — çerçeve içinde 2'li */}
        <div className="relative mt-14 rounded-3xl border-2 border-gold/30 p-5 sm:p-8">
          <span className="absolute -top-3.5 left-7 bg-night-deep px-3 font-display text-2xl font-semibold text-gold-bright">
            Çift <span className="font-normal italic text-[#c3a6e8]">(Sinastri)</span> Analizleri
          </span>
          <p className="mb-6 mt-1 max-w-2xl text-[15px] leading-relaxed text-parchment/60">
            İki kişinin doğum haritasını karşılaştıran uyum (sinastri) analizleri.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {CIFT.map((p) => (
              <ProductCard key={p.slug} p={p} badge="Çift Analizi" />
            ))}
          </div>
        </div>
      </section>

      {/* ASTROLOGLAR — SSS üstü konumu */}
      {astrologKonum === "sss" && <AstrologlarBolum />}

      {/* SIKÇA SORULAN SORULAR */}
      <section className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl font-semibold">Sıkça sorulan sorular</h2>
        </div>
        <Faq items={SSS_HOME} />
        <div className="mt-10 text-center">
          <Link
            href="/sss"
            className="rounded-full border border-gold/40 px-7 py-3 font-medium text-gold-bright transition-colors hover:bg-gold/10"
          >
            Tüm soruları gör
          </Link>
        </div>
      </section>

      {/* SON CTA — ayrı bant, gradient + yıldızlı zemin */}
      <section className="relative z-10 mt-6 overflow-hidden border-y border-gold/15 bg-gradient-to-b from-night-deep via-[#1a1542] to-night-deep">
        {/* yıldız dokusu */}
        <div className="starfield pointer-events-none absolute inset-0 opacity-50" />
        {/* mor üst hâle — px tabanlı, ekran genişlese de ortada toplanır */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(420px 240px at 50% 8%, rgba(155,114,208,0.24), transparent 70%)" }}
        />
        {/* altın merkez parıltı */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(360px 220px at 50% 55%, rgba(220,193,136,0.18), transparent 70%)" }}
        />
        {/* üst/alt çizgi ışıltısı */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold leading-tight">
            Kendi yıldız haritanı
            <br />
            <span className="text-gold-bright">keşfetmeye hazır mısın?</span>
          </h2>
          <p className="mt-4 text-parchment/70">
            Satın almadan önce örnek bir analizi inceleyebilir, dilersen sevdiğine hediye edebilirsin.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/analizler"
              className="rounded-full bg-gold px-7 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright"
            >
              Analizleri Keşfet
            </Link>
            <Link
              href="/ornekler"
              className="rounded-full border border-gold/40 px-7 py-3 font-medium text-gold-bright transition-colors hover:bg-gold/10"
            >
              Örnekleri İncele
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
