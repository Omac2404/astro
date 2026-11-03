import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/nasil-calisir");

// Yorumlama sürecinin sade ama teknik anlatımı (ziyaretçi için)
// Vurgu yardımcıları: G = altın (sonuç/güç), V = ametist (yöntem/teknik)
function G({ children }: { children: ReactNode }) {
  return <span className="font-medium text-[#c3a6e8]">{children}</span>;
}
function V({ children }: { children: ReactNode }) {
  return <span className="font-medium text-[#c3a6e8]">{children}</span>;
}
type Surec = { t: ReactNode; d: ReactNode; sema: string[] };
// "Katman N" sihir yeşili (fiyat fontuyla sayı); başlık aynı renkte, parantez içinde ve biraz küçük
function Kat({ n, baslik }: { n: number; baslik: string }) {
  return (
    <span className="text-turkuaz">
      Katman <span className="font-body font-semibold">{n}</span>{" "}
      <span className="text-[0.78em]">({baslik})</span>
    </span>
  );
}
const SUREC: Surec[] = [
  {
    t: "Doğum anını saniyesine indiriyoruz",
    d: (
      <>
        Doğum tarihini, saatini ve yerini alır; o günkü zaman dilimi ve yaz saati farklarıyla birlikte
        tek bir <V>evrensel ana</V> çeviririz. Doğduğun şehrin <V>enlem ve boylamını</V> da katarız,
        çünkü gökyüzü dünyanın her noktasından farklı görünür. Sonuçta{" "}
        <G>saniyesine kadar net bir doğuş anı</G> elde ederiz; geri kalan her adım bu tek ana dayanır.
      </>
    ),
    sema: ["Doğum bilgilerin alınır", "Dünya saatine çevrilir", "Doğum anın sabitlenir"],
  },
  {
    t: "Gökyüzünü gerçek astronomiyle hesaplıyoruz",
    d: (
      <>
        O an için Güneş, Ay ve tüm gezegenlerin gökyüzündeki <G>gerçek konumlarını</G> hesaplarız.
        Bunu <V>“şu burçsan şöylesindir”</V> genellemeleriyle değil, gökbilimcilerin ve uzay
        ajanslarının kullandığı <V>yüksek hassasiyetli gök verisiyle</V> yaparız. Yani haritan, o an
        gökyüzüne bakıp çekilmiş <G>gerçek bir fotoğraf</G> gibidir.
      </>
    ),
    sema: ["Gök verisi sorgulanır", "Konumlar hesaplanır", "Burç ve derece bulunur"],
  },
  {
    t: "Yükselenini ve evlerini buluyoruz",
    d: (
      <>
        Doğduğun yerin ufkunda, tam o anda doğu çizgisinde hangi burcun yükseldiğini hesaplarız;
        buna <G>yükselen</G> denir ve haritanın başlangıç noktasını kurar. Ardından gökyüzünü{" "}
        <V>on iki yaşam alanına, yani evlere</V> böleriz. Bunlar tamamen <V>doğum saatine</V> bağlı
        olduğu için, saat ne kadar netse harita o kadar isabetli olur. Seni{" "}
        <G>aynı burçtan herkesten</G> ayıran asıl katman budur.
      </>
    ),
    sema: ["Yerel gök açısı alınır", "Yükselen hesaplanır", "On iki ev kurulur"],
  },
  {
    t: "Haritanın imzalarını çözümlüyoruz",
    d: (
      <>
        Gezegenlerin birbirleriyle yaptığı <V>açıları</V>, <V>element dengeni</V> (ateş-toprak-hava-su)
        ve öncü-sabit-değişken <V>nitelik dağılımını</V> matematiksel olarak tartarız. Bu hesaplardan
        haritanı en çok tanımlayan <G>öne çıkan imzalar</G> çıkar: hangi temaların baskın, hangi
        gerilimlerin belirleyici olduğunu burada görürüz.
      </>
    ),
    sema: ["Açılar ölçülür", "Element & nitelik tartılır", "Baskın imzalar çıkar"],
  },
  {
    t: <Kat n={1} baslik="Anlam Eşleme Algoritması" />,
    d: (
      <>
        Sistemimiz için <V>binlerce bloktan oluşan bir anlam kütüphanesi</V> hazırlanmıştır. Örneğin <V>“Venüs Başak burcunda, 5. evde”</V> ifadesi bir anlam bloğudur ve
        kütüphanemizde teknik açıklaması ve yorumuyla bulunur. Yukarıdaki etaplarda yapılan matematiksel
        sonuçlardan çıkan verileri <V>anlam eşleme algoritmamız</V> işleyerek binlerce blok arasında{" "}
        <G>sizle özdeşleşen onlarca bloğu</G> seçer. Algoritmamız doğum tarihine, saatine
        ve yerine göre kişiye özel bloklar seçtiği ve bu kombinasyon neredeyse her insan için benzersiz
        olduğu için, teknik olarak{" "}
        <G>milyonlarca olası doğum anı arasından tam size karşılık gelen anlam bloklarını</G> getirir!
      </>
    ),
    sema: ["Anlam kütüphanesi taranır", "Algoritma eşler", "Size özel bloklar seçilir"],
  },
  {
    t: <Kat n={2} baslik="AI ile Blokları Eşlemek" />,
    d: (
      <>
        Seçilen onlarca anlam bloğu tek başına kopuk maddeler gibidir. Bunları astrolojik olarak doğru
        bir düzlemde bağlayıp anlamlandırabilmek için astrolog ve yazılımcılarımız tarafından bu konsepte
        özel, <V>yüzlerce uzman promptundan oluşan gelişmiş bir prompt kütüphanesi</V> hazırlanmıştır.
        Sizin için seçilen blokların oluşturduğu örüntüye göre bu kütüphaneden en uygun promptlar
        tetiklenir ve <V>gelişmiş yapay zekâ modelimiz</V> blokları bu yönlendirmeyle işleyerek{" "}
        <G>anlam düzlemini yaratır</G>.
      </>
    ),
    sema: ["Prompt kütüphanesi tetiklenir", "AI bloklarını işler", "Metin oluşturulur"],
  },
  {
    t: <Kat n={3} baslik="Derinleştirmek" />,
    d: (
      <>
        AI modelimiz bu etapta, sizin için seçilen blokların oluşturduğu harita üzerindeki{" "}
        <V>gerilim noktalarını, karmaşık alanları ve zıt yönleri</V> tespit eder; bunları birer{" "}
        <G>gelişim fırsatı/kritik nokta</G> olarak ele alır ve metni bu bakışla, ince ince bu detayları
        hissettirerek kurar.
      </>
    ),
    sema: ["Gerilim noktaları bulunur", "Gelişim fırsatına çevrilir", "Kişiye özel anlatım"],
  },
  {
    t: "Zarif bir PDF rapora dönüşür",
    d: (
      <>
        Tüm bu okuma; senin gerçek verilerinle çizilen <V>harita çarkın</V>, pozisyon tabloların ve
        özenli tipografisiyle bir araya gelir. Sonuç,{" "}
        <G>okunması keyifli, saklamaya ve paylaşmaya değer zarif bir PDF rapordur</G>. Sayfa düzeni,
        hiçbir bölüm taşmadan ya da eksik kalmadan tek tek kontrol edilir. Elinde kalan şey dağınık
        bir veri yığını değil; <G>bir kitap gibi okunan, tamamen sana ait bir belgedir</G>.
      </>
    ),
    sema: ["Harita çarkı çizilir", "Tasarımla dizilir", "PDF rapor oluşur"],
  },
];

type Yon = "sag" | "sol" | "asagi";

// Masaüstünde yılan akışı: 1→2→3, aşağı, 6←5←4, aşağı, 7→8→"Hazır mısın?"
// Mobilde sayfa sırası zaten 1'den 8'e olduğu için tek sütun ve hep aşağı ok.
const YERLESIM: { hucre: string; yon: Yon }[] = [
  { hucre: "lg:col-start-1 lg:row-start-1", yon: "sag" },
  { hucre: "lg:col-start-2 lg:row-start-1", yon: "sag" },
  { hucre: "lg:col-start-3 lg:row-start-1", yon: "asagi" },
  { hucre: "lg:col-start-3 lg:row-start-2", yon: "sol" },
  { hucre: "lg:col-start-2 lg:row-start-2", yon: "sol" },
  { hucre: "lg:col-start-1 lg:row-start-2", yon: "asagi" },
  { hucre: "lg:col-start-1 lg:row-start-3", yon: "sag" },
  { hucre: "lg:col-start-2 lg:row-start-3", yon: "sag" },
];

function AkisOk({ yon, renk }: { yon: Yon; renk: string }) {
  const ok = (sinif: string) => (
    <span className={`akis-ok ${renk} ${sinif}`} aria-hidden>
      <svg viewBox="0 0 46 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path className="akis-cizgi" d="M2 12h32" />
        <path d="M32 5l9 7-9 7" />
      </svg>
    </span>
  );
  return (
    <>
      {ok("akis-asagi block lg:hidden")}
      {ok(`akis-${yon} hidden lg:block`)}
    </>
  );
}

function StepCard({ s, i, grup, sihirli }: { s: Surec; i: number; grup?: string; sihirli?: boolean }) {
  return (
    <div className={`cam-panel flex h-full flex-col p-5 sm:p-6 ${sihirli ? "shadow-[0_0_38px_-14px_rgba(56,228,228,0.6)]" : ""}`}>
      {grup && (
        <span className={`mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] ${sihirli ? "text-turkuaz" : "text-gold"}`}>{grup}</span>
      )}
      <div className="flex items-start justify-between gap-3">
        <span
          className="block text-xl font-bold uppercase tracking-[0.15em] text-[#c3a6e8]"
          style={{ fontFamily: "ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif" }}
        >
          {i + 1}. Etap
        </span>
        {sihirli && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-turkuaz/50 bg-turkuaz/10 px-2.5 py-1 text-[11px] font-medium text-turkuaz shadow-[0_0_14px_-4px_rgba(56,228,228,0.7)]">
            <span aria-hidden>✦</span> Sihirli kısım
          </span>
        )}
      </div>
      <h3 className="mt-1 font-display text-xl text-gold-bright leading-tight">{s.t}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-parchment/80">{s.d}</p>

      {s.sema && (
        <div className="mt-auto flex flex-col items-stretch gap-1.5 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5 lg:flex-col lg:items-stretch lg:gap-1.5">
          {s.sema.map((node, j) => (
            <Fragment key={node}>
              {j > 0 && (
                <svg viewBox="0 0 24 24" className="mx-auto h-[16px] w-[16px] shrink-0 rotate-90 text-gold-bright/60 sm:mx-0 sm:rotate-0 lg:mx-auto lg:rotate-90" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
              <div className="cam-satir w-full rounded-lg px-3.5 py-2 text-center sm:w-auto lg:w-full">
                <span className="block text-[14px] leading-tight text-gold-bright">{node}</span>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NasilCalisirPage() {
  return (
    <div className="gok-sahne">
    <div className="mx-auto max-w-3xl px-5 py-16 lg:max-w-7xl">
      <header className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display text-5xl font-semibold">Raporun nasıl hazırlanır?</h1>
        <p className="mt-4 text-lg leading-relaxed text-parchment/70">
          “Bu kadar kişiye özel nasıl olabiliyor?” sorusunun cevabı burada. Sen sadece doğum bilgini
          girersin; gerisini bu <span className="text-gold-bright">8 etaplık titiz süreç</span> halleder.
        </p>
        {/* Etaplara işaret eden ok */}
        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mt-8 animate-bounce text-gold-bright/70" aria-hidden>
          <path d="M12 4v15M6 13l6 6 6-6" />
        </svg>
      </header>

      <section className="akis mt-10 grid lg:grid-cols-3">
        {SUREC.map((s, i) => {
          const sihirli = i >= 4 && i < 7;
          const grup = i < 4 ? "Gökyüzü Hesabı" : sihirli ? "Derin Anlam ve Yorumlama" : undefined;
          return (
            <div key={i} className={`relative ${YERLESIM[i].hucre}`}>
              <StepCard s={s} i={i} grup={grup} sihirli={sihirli} />
              <AkisOk yon={YERLESIM[i].yon} renk={sihirli ? "text-turkuaz" : "text-gold-bright"} />
            </div>
          );
        })}

        <div className="cam-panel flex flex-col items-center justify-center p-8 text-center lg:col-start-3 lg:row-start-3">
          <h2 className="font-display text-3xl font-semibold">Hazır mısın?</h2>
          <p className="mt-2 text-parchment/70">Önce bir örnek inceleyebilir, sonra analizini seçebilirsin.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/analizler" className="altin-buton rounded-full px-7 py-3 font-medium">
              Analizleri Keşfet
            </Link>
            <Link href="/ornekler" className="rounded-full border border-gold/40 px-7 py-3 font-medium text-gold-bright hover:bg-gold/10">
              Örnekleri İncele
            </Link>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}
