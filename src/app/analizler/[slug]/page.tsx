import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/products";
import { getProductPriced } from "@/lib/catalog";
import { getSeoSayfa } from "@/lib/db";
import { seoMetadata } from "@/lib/seo";
import { BuyButtons, MobileBuyBar } from "@/components/product-buy";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/analizler/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = getProduct(slug);
  if (!p) return { title: "Analiz bulunamadı — Gökname" };
  // Admin SEO ayarında bu ürün için kayıt varsa onu kullan, yoksa ürün verisinden üret
  if (getSeoSayfa(`/analizler/${slug}`)) return seoMetadata(`/analizler/${slug}`);
  return { title: `${p.ad} — Gökname`, description: p.kisa };
}

export default async function ProductPage(props: PageProps<"/analizler/[slug]">) {
  const { slug } = await props.params;
  const p = getProductPriced(slug);
  if (!p || p.gizli) notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 pb-28 lg:pb-12">
      {/* Üst başlık */}
      <div className="mb-3">
        <Link href="/analizler" className="text-sm text-parchment/55 hover:text-gold-bright">
          ← Tüm analizler
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 items-start">
        {/* SOL — içerik */}
        <div>
          <span className="text-base font-medium tracking-wide text-gold-bright">{p.tamAd}</span>
          <h1 className="mt-2 font-display text-5xl sm:text-6xl font-semibold leading-[1.02]">{p.ad}</h1>
          <p className="mt-4 text-2xl text-parchment/75">{p.kisa}</p>

          {/* Kapak görseli — yalnız mobil (masaüstünde sağ karttaki görsel kullanılır) */}
          <div className="relative mt-7 aspect-[4/3] w-full overflow-hidden rounded-2xl lg:hidden">
            {p.gorsel ? (
              <>
                <Image
                  src={p.gorsel}
                  alt={p.ad}
                  fill
                  priority
                  sizes="(max-width:1024px) 100vw, 780px"
                  style={{ objectPosition: p.objectPos ?? "center 22%" }}
                  className="object-cover"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/15 rounded-2xl" />
              </>
            ) : (
              <div className="img-ph absolute inset-0 text-sm" style={{ borderColor: `${p.accent}55` }}>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl" style={{ color: p.accent }}>{p.glyph}</span>
                  <span>görsel gelecek (analiz tanıtım kapağı)</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-9 max-w-2xl">
            <h2 className="font-display text-3xl text-gold-bright">Bu analiz neyi anlatır?</h2>
            <p className="mt-3 text-lg leading-relaxed text-parchment/75">{p.aciklama}</p>
          </div>

          {/* Satın almadan önce gör */}
          <div
            className="relative mt-9 max-w-2xl overflow-hidden rounded-2xl border border-gold/10 bg-night/70 p-5"
            style={{ "--glow": p.accent } as React.CSSProperties}
          >
            <div className="card-glow" />
            <div className="relative">
              <h3 className="font-display text-xl text-gold-bright">Satın almadan önce gör</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-parchment/65">
                Bu analizin gerçek örneklerini inceleyebilirsin.
              </p>
              <Link
                href={`/ornekler#${p.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-night-deep transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: p.accent }}
              >
                Örnekleri İncele →
              </Link>
            </div>
          </div>

          {/* Rapor kalitesi */}
          <div
            className="relative mt-9 max-w-2xl overflow-hidden rounded-2xl border border-gold/10 bg-night/70 p-5"
            style={{ "--glow": p.accent } as React.CSSProperties}
          >
            <div className="card-glow" />
            <div className="relative">
              <h3 className="font-display text-xl text-gold-bright">Rapor kalitesi</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-parchment/65">
                Uzman astrolog ve yazılımcılar tarafından tasarlanan 8 etaplı sistemle hazırlanır.
              </p>
              <Link
                href="/nasil-calisir"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-night-deep transition-colors hover:bg-gold-bright"
              >
                Nasıl hazırlanır →
              </Link>
            </div>
          </div>

          {/* Müfredat */}
          <div className="mt-9 max-w-2xl">
            <h2 className="font-display text-3xl text-gold-bright">İçindekiler</h2>
            <ul className="mt-4 space-y-2.5">
              {p.bolumler.map((b, i) => (
                <li
                  key={b.baslik}
                  className="flex items-start gap-4 rounded-lg border border-gold/10 bg-night px-4 py-3.5"
                >
                  <span className="mt-0.5 font-body text-xl font-semibold leading-none w-7 shrink-0 text-center" style={{ color: p.accent }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-lg text-parchment/90">{b.baslik}</span>
                    <span className="mt-0.5 block text-[15px] leading-relaxed text-parchment/60">{b.aciklama}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Analizi nasıl yapacağım? */}
          <div className="mt-10 max-w-2xl rounded-2xl border border-gold/15 bg-night p-6">
            <h2 className="font-display text-3xl text-gold-bright">Analizi nasıl yapacağım?</h2>
            <ol className="mt-5 space-y-4">
              {[
                { t: "Satın al", d: `${p.ad}'ni sepete ekle ve ödemeni tamamla.` },
                { t: "Doğum bilgilerini gir", d: "Hesabındaki “Analizlerim” alanından doğum tarihi, saati ve yerini gir." },
                { t: "Raporun hazırlansın", d: "Birkaç dakika içinde gerçek gökyüzü hesaplanır, sana özel sentezlenir ve yorumlanır." },
                { t: "İndir", d: "Hesabından dilediğin zaman raporunu PDF olarak indirebilirsin." },
              ].map((s, i) => (
                <li key={s.t} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold" style={{ borderColor: `${p.accent}66`, color: p.accent }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-lg text-parchment/90">{s.t}</div>
                    <div className="mt-0.5 text-[15px] leading-relaxed text-parchment/60">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

        </div>

        {/* SAĞ — satın alma kartı (sticky) */}
        <aside className="lg:sticky lg:top-32">
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-night">
            <div className="relative hidden h-56 overflow-hidden lg:block">
              {p.gorsel ? (
                <>
                  <Image src={p.gorsel} alt="" fill sizes="380px" style={{ objectPosition: p.objectPos ?? "center 22%" }} className="object-cover" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night to-transparent" />
                </>
              ) : (
                <div className="img-ph absolute inset-0" style={{ borderColor: `${p.accent}55` }}>
                  <span>görsel gelecek</span>
                </div>
              )}
            </div>
            <div className="p-6">
              {/* Mobilde fiyat üstüne ürün adı (masaüstünde görsel var, gerek yok) */}
              <div className="mb-3 lg:hidden">
                <h2 className="font-display text-2xl font-semibold leading-tight text-parchment">{p.ad}</h2>
              </div>
              <div className="flex flex-col gap-1">
                {p.eskiFiyat ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a98fd6]">Lansmana özel</span>
                ) : null}
                <div className="flex items-baseline gap-2.5">
                  {p.eskiFiyat ? (
                    <span className="text-2xl font-medium text-[#a98fd6] line-through">{p.eskiFiyat} ₺</span>
                  ) : null}
                  <span className="font-body text-6xl font-semibold text-gold-bright">{p.fiyat} ₺</span>
                  <span className="text-sm text-parchment/50">tek seferlik</span>
                </div>
              </div>

              <BuyButtons slug={p.slug} ad={p.ad} fiyat={p.fiyat} eskiFiyat={p.eskiFiyat} gorsel={p.gorsel} objectPos={p.objectPos} />

              <ul className="mt-6 space-y-2 border-t border-gold/10 pt-5 text-sm text-parchment/65">
                <li className="flex justify-between"><span>Format</span><span className="text-parchment/85">PDF raporu</span></li>
                <li className="flex justify-between"><span>Uzunluk</span><span className="text-parchment/85">{p.sure}</span></li>
                <li className="flex justify-between"><span>Teslim</span><span className="text-parchment/85">Hesabında</span></li>
                <li className="flex justify-between"><span>Hazırlanış</span><span className="text-parchment/85">Kişiye özel</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-3 flex justify-center">
            <Image src="/gorsel/odeme-kartlar.png" alt="Mastercard, Visa, Troy" width={1152} height={272} unoptimized className="h-7 w-auto" />
          </div>
        </aside>
      </div>

      <MobileBuyBar slug={p.slug} ad={p.ad} fiyat={p.fiyat} eskiFiyat={p.eskiFiyat} gorsel={p.gorsel} objectPos={p.objectPos} />
    </div>
  );
}
