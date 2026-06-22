import { bireysel, cift } from "@/lib/catalog";
import { seoMetadata } from "@/lib/seo";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/analizler");

export default function AnalizlerPage() {
  const BIREYSEL = bireysel();
  const CIFT = cift();
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <h1 className="font-display text-5xl font-semibold">Tüm analizler</h1>
        <p className="mt-4 text-lg leading-relaxed text-parchment/70">
          Her biri gerçek gökyüzü hesabına dayalı, tamamen sana özel hazırlanır.
        </p>
      </header>

      {/* Bireysel analizler — ilk 3, sonra ortalı 2 */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BIREYSEL.slice(0, 3).map((p) => (
          <ProductCard key={p.slug} p={p} badge="Bireysel Analiz" />
        ))}
      </div>
      {BIREYSEL.length > 3 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:mx-auto lg:max-w-[760px]">
          {BIREYSEL.slice(3).map((p) => (
            <ProductCard key={p.slug} p={p} badge="Bireysel Analiz" />
          ))}
        </div>
      )}

      {/* Çift analizleri — çerçeve içinde 2'li */}
      <div className="relative mt-16 rounded-3xl border-2 border-gold/30 p-5 sm:p-8">
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
    </div>
  );
}
