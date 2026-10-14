import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Faq } from "@/components/faq";
import { getProAyar, getPaytr, getGenelAyar, isAstrolog, PRO_URUNLER } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/astrolog-musunuz");

// Astrologlara B2B satış sayfası: jetonla Pro rapor. Satış manuel (WhatsApp/e-posta); paketler admin'den.
// Görünürlük admin anahtarına bağlı (ProAyar.sayfaAcik): kapalıyken menüde yok, sitemap dışı + noindex, yalnız admin/astrolog açar.
// Görseller: public/gorsel/pro/*.jpg — örnek (hayali danışan "Elif") Natal Pro raporunun gerçek sayfaları.

// ---- küçük çizgisel ikonlar ----
const IK: Record<string, ReactNode> = {
  veri: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" /></>,
  aci: <><path d="M5 19 19 5M5 5l14 14" /><circle cx="12" cy="12" r="2" /></>,
  ev: <><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></>,
  kalip: <><path d="M12 3 21 19H3z" /><circle cx="12" cy="13" r="2.2" /></>,
  yorum: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  zaman: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  olay: <><path d="M5 4v16M5 5h11l-2 3.5L16 12H5" /></>,
  soru: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 16.5v.1" /></>,
  seans: <><path d="M4 18c2-4 5-6 8-6s6 2 8 6" /><circle cx="12" cy="7.5" r="3.5" /><path d="M17.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" /></>,
  natal: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.5" /></>,
  ask: <path d="M12 20s-7.5-4.7-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10z" />,
  kariyer: <><path d="M4 8h16v11H4z" /><path d="M9 8V5.5h6V8M4 13h16" /></>,
  saglik: <path d="M12 3c4 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6.5 6-11z" />,
  lilith: <path d="M15.5 4a8 8 0 1 0 0 16 9.5 9.5 0 0 1 0-16z" />,
  solar: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  sinastri: <><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></>,
  aylik: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
};
function Ikon({ ad, className = "" }: { ad: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {IK[ad] ?? IK.veri}
    </svg>
  );
}

const ICERIK: { t: string; d: string; i: string }[] = [
  { i: "seans", t: "Seans rehberi", d: "60 dakikalık seans akışı, açılış cümleleri, sorulacak sorular, hassas noktalar ve takip seansı için tarih önerileri. Raporun en başında." },
  { i: "yorum", t: "Astrolog Önerisi kutuları", d: "Her bölümde ve her grafiğin altında, seansta danışanına kelimesi kelimesine söyleyebileceğin hazır cümleler." },
  { i: "veri", t: "Tam teknik veri", d: "10 gezegen, Ay Düğümleri, Kiron, Lilith, Şans Noktası, MC/IC; derece-dakika, ev, öz-onur, retro ve hız." },
  { i: "aci", t: "Açı ızgarası", d: "Majör ve minör açılar; orb, yaklaşan/ayrılan fazı ve uyum niteliğiyle." },
  { i: "ev", t: "Ev zincirleri ve dispozitörler", d: "12 evin burcu, yöneticisi ve yöneticinin konumu; dispozitör zincirleri ve karşılıklı ağırlamalar." },
  { i: "kalip", t: "Kalıplar ve güç dengesi", d: "Stelyum, T-kare, yod, büyük üçgen; element, nitelik, yarıküre dağılımı ve gezegen güç skoru." },
  { i: "zaman", t: "12 aylık zamanlama", d: "Transit zaman çizelgesi ve tam isabet tarihleri, ikincil progresyonlar ve Solar Return." },
  { i: "olay", t: "Yaşam olayları analizi", d: "Danışanın verdiği tarihlerdeki tetikleyiciler; desen okuması ve doğum saati doğrulamasına katkı." },
  { i: "soru", t: "Danışanın sorularına cevaplar", d: "Danışanın odak soruları haritaya ve zamanlamaya dayanarak tek tek ele alınır." },
];

const GALERI: { src: string; t: string; d: string }[] = [
  { src: "/gorsel/pro/seans.jpg", t: "Seans Rehberi", d: "Raporun ilk sayfaları: seans akışı ve hazır cümleler" },
  { src: "/gorsel/pro/oneri.jpg", t: "Astrolog Önerisi", d: "Teknik yorum ve danışana söylenecek cümle bir arada" },
  { src: "/gorsel/pro/cark.jpg", t: "Natal Çark", d: "Vektör çizim, renk kodlu açılar, Tüm Burç evleri" },
  { src: "/gorsel/pro/transit.jpg", t: "Transit Takvimi", d: "12 aylık pencereler ve tam isabet tarihleri" },
];

const KARSILASTIRMA: { k: string; a: string | null; b: string }[] = [
  { k: "Sayfa", a: "6-9 sayfa", b: "30+ sayfa" },
  { k: "Seans rehberi ve Astrolog Önerisi", a: null, b: "En başta seans planı + her bölümde hazır cümleler" },
  { k: "Hesaplanan noktalar", a: "7 gezegen + Yükselen", b: "10 gezegen, düğümler, Kiron, Lilith, Şans Noktası, MC" },
  { k: "Açılar", a: "Majör açıların özeti", b: "Majör + minör, orb ve faz ile tam ızgara" },
  { k: "Yorum derinliği", a: "Bölüm başına kısa okuma", b: "Teknik dayanaklı, katmanlı profesyonel yorum" },
  { k: "Zamanlama", a: null, b: "12 aylık transit takvimi, progresyonlar, Solar Return" },
  { k: "Ek danışan bilgisi", a: null, b: "Sorular, yaşam olayları, meslek, ilişki durumu, astrolog notu" },
  { k: "Rapor türleri", a: "Kişisel kullanım", b: "8 profesyonel tür: natal, aşk, kariyer, sinastri, solar…" },
];

const ADIMLAR: { t: string; d: string }[] = [
  { t: "Bize ulaş", d: "Sana uygun jeton paketini seç, WhatsApp ya da e-postadan yaz." },
  { t: "Hesabın tanımlansın", d: "Astrolog hesabını açar, jetonlarını yükleriz. 1 jeton = 1 Pro rapor." },
  { t: "Danışanını gir", d: "Doğum bilgileri, sorular ve yaşam olayları; birkaç dakikalık form." },
  { t: "Dosyan hazır", d: "Dakikalar içinde 30+ sayfalık PDF panelinde; 1 yıl saklanır." },
];

function waLink(numara: string, mesaj: string) {
  const n = numara.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mesaj)}` : "";
}

function Tik() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-emerald-300" aria-hidden>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}
function Yok() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0 text-parchment/30" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

function Baslik({ ust, children, alt }: { ust: string; children: ReactNode; alt?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="text-[11px] uppercase tracking-[0.32em] text-[#c3a6e8]">{ust}</span>
      <h2 className="mt-2 font-display text-4xl font-semibold leading-tight text-parchment sm:text-[2.7rem]">{children}</h2>
      {alt && <p className="mt-3 text-[16px] leading-relaxed text-parchment/65">{alt}</p>}
    </div>
  );
}

export default async function AstrologMusunuzPage() {
  const ayar = getProAyar();
  // Admin → Astrolog Pro → "sayfayı sitede göster" kapalıyken yalnız admin ve astrolog hesapları açabilir, diğerleri 404.
  if (!ayar.sayfaAcik) {
    const u = await currentUser();
    if (!u || (u.type === "member" && !isAstrolog(u.email))) notFound();
  }
  const whatsapp = ayar.whatsapp || getPaytr().whatsappNumara;
  const eposta = ayar.eposta || getGenelAyar().iletisim.eposta;
  const genelWa = waLink(whatsapp, "Merhaba, astroloğum. Gökname Pro raporları ve jeton paketleri hakkında bilgi almak istiyorum.");
  const urunler = PRO_URUNLER.filter((u) => u.aktif);
  const sss = [
    { q: "Jetonu nasıl alırım?", a: "Bize WhatsApp ya da e-postadan ulaşman yeterli. Ödeme tamamlanınca **astrolog hesabını açar ve jetonlarını yükleriz**; giriş bilgilerin sana iletilir." },
    { q: "Rapor ne kadar sürede hazırlanır?", a: "Genellikle **birkaç dakika**. Raporu başlattıktan sonra sayfayı kapatabilirsin; hazır olunca panelinde görünür." },
    { q: "Örnek rapor görebilir miyim?", a: "Elbette. Bize yaz, **örnek bir Pro raporu** sana gönderelim; seans rehberini ve yorumların derinliğini kendin gör." },
    { q: "Üretim başarısız olursa jetonum gider mi?", a: "Hayır. Teknik bir nedenle rapor üretilemezse **jetonun otomatik olarak iade edilir** ve aynı bilgilerle tekrar oluşturabilirsin." },
    { q: "Danışanın doğum saati belli değilse?", a: "“Saat bilinmiyor” seçeneğiyle rapor yine üretilir; Yükselen ve ev yorumları **doğrulanması gereken** noktalar olarak işaretlenir. Yaşam olayları girersen saat doğrulamasına yardımcı tetikleyiciler de rapora eklenir." },
    { q: "Raporlar ne kadar saklanır?", a: `Pro raporların **${ayar.saklamaGun} gün** boyunca panelinde saklanır. Dilediğin raporu danışan bilgileriyle birlikte istediğin an silebilirsin.` },
    { q: "Raporu danışanımla paylaşabilir miyim?", a: "Rapor senin çalışma dosyan; kapağında senin adın ya da markan yer alır. Seansında kullanmak, danışanına sunmak ya da yalnızca hazırlık için okumak tamamen senin tercihin." },
    { q: "Danışan verileri güvende mi?", a: "Danışan bilgileri **yalnızca raporun üretimi için** işlenir, üçüncü kişilerle paylaşılmaz. Saklama süresi sonunda rapor ve bilgiler otomatik silinir." },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* arka plan ışıltıları */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[70rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(155,114,208,0.55), rgba(220,193,136,0.18) 55%, transparent)" }} />
      <div className="starfield pointer-events-none absolute inset-0 opacity-30" />

      {/* ================= HERO ================= */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-10 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-[12px] uppercase tracking-[0.22em] text-gold-bright">
            <Ikon ad="seans" className="h-4 w-4" /> Astrologlar için · Gökname Pro
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-parchment sm:text-6xl lg:text-[4.1rem]">
            Seansına <span className="bg-gradient-to-r from-gold-bright via-[#f3dca8] to-[#c3a6e8] bg-clip-text text-transparent">hazır gel.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-parchment/75">
            Danışanın için dakikalar içinde <span className="text-gold-bright">30 sayfayı aşan profesyonel bir çalışma dosyası</span>:
            seans rehberi, tam teknik veri, derin yorum, 12 aylık zamanlama ve danışanına doğrudan söyleyebileceğin hazır cümleler.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="#paketler" className="rounded-full bg-gradient-to-r from-gold to-gold-bright px-8 py-3.5 font-medium text-night-deep shadow-[0_10px_40px_-12px_rgba(220,193,136,0.8)] transition-transform hover:-translate-y-0.5">
              Jeton paketlerini gör
            </a>
            {genelWa && (
              <a href={genelWa} target="_blank" rel="noopener" className="rounded-full border border-gold/45 bg-night/40 px-7 py-3.5 font-medium text-gold-bright backdrop-blur transition-colors hover:bg-gold/10">
                Örnek rapor iste
              </a>
            )}
            {ayar.ornekPdf && (
              <a href={ayar.ornekPdf} target="_blank" rel="noopener" className="rounded-full border border-gold/30 px-7 py-3.5 text-parchment/85 transition-colors hover:text-gold-bright">Örneği incele</a>
            )}
          </div>
          <Link href="/giris?next=/hesabim" className="mt-5 inline-block text-sm text-parchment/55 underline-offset-4 hover:text-gold-bright hover:underline">
            Zaten astrolog hesabın var mı? Giriş yap →
          </Link>
        </div>

        {/* sayfa önizleme yığını */}
        <div className="relative mx-auto h-[25rem] w-full max-w-[27rem] sm:h-[30rem]">
          <div className="absolute inset-x-8 bottom-0 top-10 rounded-[2rem] opacity-60 blur-2xl" style={{ background: "radial-gradient(closest-side, rgba(220,193,136,0.45), transparent)" }} />
          <Image src="/gorsel/pro/cark.jpg" alt="Pro rapor natal çark sayfası" width={893} height={1263}
            className="absolute left-0 top-12 w-[52%] -rotate-[9deg] rounded-lg border border-white/10 shadow-2xl shadow-black/60" />
          <Image src="/gorsel/pro/seans.jpg" alt="Pro rapor seans rehberi sayfası" width={893} height={1263}
            className="absolute right-0 top-14 w-[52%] rotate-[8deg] rounded-lg border border-white/10 shadow-2xl shadow-black/60" />
          <Image src="/gorsel/pro/kapak.jpg" alt="Natal Pro Rapor kapağı" width={893} height={1263} priority
            className="absolute left-1/2 top-0 w-[58%] -translate-x-1/2 rounded-lg border border-gold/40 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]" />
        </div>
      </section>

      {/* ================= İSTATİSTİK ŞERİDİ ================= */}
      <section className="relative mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gold/20 bg-gold/15 sm:grid-cols-4">
          {[["30+", "sayfa"], [String(urunler.length), "rapor türü"], ["~5 dk", "hazırlanma"], [`${Math.round(ayar.saklamaGun / 30)} ay`, "panelde saklama"]].map(([v, l]) => (
            <div key={l} className="bg-night-deep/90 px-5 py-6 text-center">
              <div className="font-display text-4xl font-semibold text-gold-bright">{v}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-parchment/55">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="relative mx-auto max-w-6xl px-5 pb-20">
        {/* ================= NASIL ÇALIŞIR ================= */}
        <section className="mt-24">
          <Baslik ust="Dört adım">Nasıl çalışır?</Baslik>
          <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent lg:block" />
            {ADIMLAR.map((a, i) => (
              <div key={a.t} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/60 bg-night-deep font-display text-2xl font-semibold text-gold-bright shadow-[0_0_30px_-6px_rgba(220,193,136,0.6)]">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-display text-xl text-parchment">{a.t}</h3>
                <p className="mx-auto mt-1.5 max-w-[16rem] text-[15px] leading-relaxed text-parchment/65">{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= RAPORUN İÇİNDEN ================= */}
        <section className="mt-28">
          <Baslik ust="Gerçek sayfalar" alt="Tasarım değil bilgi odaklı: okuyup seansını kurman, danışanına doğrudan aktarman için hazırlanmış bir çalışma dosyası.">
            Raporun içinden
          </Baslik>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {GALERI.map((g) => (
              <figure key={g.src} className="group">
                <div className="overflow-hidden rounded-xl border border-gold/20 bg-white/5 shadow-xl shadow-black/40 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-gold/60 group-hover:shadow-[0_20px_50px_-18px_rgba(220,193,136,0.55)]">
                  <Image src={g.src} alt={g.t} width={893} height={1263} className="w-full" />
                </div>
                <figcaption className="mt-3 text-center">
                  <div className="font-display text-lg text-gold-bright">{g.t}</div>
                  <div className="text-[13px] text-parchment/55">{g.d}</div>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-parchment/40">Görseller hayali bir danışan için üretilmiş örnek Natal Pro raporundan alınmıştır.</p>
        </section>

        {/* ================= İÇERİK ================= */}
        <section className="mt-28">
          <Baslik ust="Pro raporun içinde" alt="Sitedeki ücretsiz raporların profesyonel ve çok daha kapsamlı versiyonu.">
            Bir seansa gereken her şey
          </Baslik>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ICERIK.map((x, i) => (
              <div key={x.t} className={`group rounded-2xl border p-6 transition-all hover:-translate-y-0.5 ${i < 2 ? "border-gold/45 bg-gradient-to-br from-gold/[0.12] to-[#9b72d0]/[0.08]" : "border-gold/15 bg-night/70 hover:border-gold/40"}`}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/35 bg-night-deep text-gold-bright">
                  <Ikon ad={x.i} className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl text-parchment">{x.t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-parchment/65">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= KARŞILAŞTIRMA ================= */}
        <section className="mt-28">
          <Baslik ust="Fark">Ücretsiz rapor ile Pro rapor</Baslik>
          <div className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
            <div className="rounded-3xl border border-white/10 bg-night/60 p-7">
              <div className="text-xs uppercase tracking-[0.25em] text-parchment/45">Ücretsiz rapor</div>
              <div className="mt-1 font-display text-2xl text-parchment/70">Kişisel kullanım</div>
              <ul className="mt-6 space-y-4">
                {KARSILASTIRMA.map((r) => (
                  <li key={r.k} className="flex gap-3">
                    {r.a ? <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-parchment/30" /> : <Yok />}
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.12em] text-parchment/40">{r.k}</div>
                      <div className="text-[15px] text-parchment/55">{r.a ?? "Yok"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl p-[1.5px]" style={{ background: "linear-gradient(135deg,#dcc188,#9b72d0 55%,#dcc188)" }}>
              <div className="relative h-full rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-[#1f1a3f] via-night-deep to-[#17132e] p-7">
                <span className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-gold to-gold-bright px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-night-deep shadow-lg">
                  Astrologlar için
                </span>
                <div className="text-xs uppercase tracking-[0.25em] text-gold-bright">Pro rapor</div>
                <div className="mt-1 font-display text-2xl text-parchment">Profesyonel çalışma dosyası</div>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {KARSILASTIRMA.map((r) => (
                    <li key={r.k} className="flex gap-3">
                      <Tik />
                      <div>
                        <div className="text-[12px] uppercase tracking-[0.12em] text-gold-bright/70">{r.k}</div>
                        <div className="text-[15px] leading-snug text-parchment/95">{r.b}</div>
                      </div>
                    </li>
                  ))}
                  <li className="flex gap-3">
                    <Tik />
                    <div>
                      <div className="text-[12px] uppercase tracking-[0.12em] text-gold-bright/70">Saklama</div>
                      <div className="text-[15px] leading-snug text-parchment/95">{ayar.saklamaGun} gün, panelinde</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RAPOR TÜRLERİ ================= */}
        <section className="mt-28">
          <Baslik ust={`${urunler.length} rapor türü`} alt="Hepsi aynı profesyonel yapıda: seans rehberi, Astrolog Önerisi kutuları, tam teknik veri ve zamanlama.">
            Danışanının ihtiyacına göre seç
          </Baslik>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {urunler.map((u) => (
              <div key={u.slug} className="group relative overflow-hidden rounded-2xl border border-gold/15 bg-night/70 p-5 transition-all hover:-translate-y-0.5 hover:border-gold/45">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#9b72d0]/15 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold-bright">
                    <Ikon ad={u.slug} className="h-[22px] w-[22px]" />
                  </div>
                  <span className="rounded-full border border-gold/30 px-2.5 py-0.5 text-[11px] text-gold-bright">{u.jeton} jeton</span>
                </div>
                <h3 className="mt-4 font-display text-lg leading-snug text-parchment">{u.ad}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-parchment/60">{u.aciklama}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= PAKETLER ================= */}
        <section id="paketler" className="mt-28 scroll-mt-28">
          <Baslik ust="Jeton paketleri" alt="Paketini seç, bize yaz; hesabını tanımlayıp jetonlarını yükleyelim.">Hemen başla</Baslik>
          <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ayar.paketler.map((p, i) => {
              const hediye = p.hediye ?? 0;
              const toplam = p.jeton + hediye;
              const wa = waLink(whatsapp, `Merhaba, astroloğum. ${p.jeton}${hediye ? ` + ${hediye} hediye` : ""} jetonluk Gökname Pro paketini almak istiyorum.`);
              const vurgu = i === Math.floor(ayar.paketler.length / 2) && ayar.paketler.length > 1;
              return (
                <div key={i} className={`relative flex flex-col rounded-3xl p-7 text-center ${vurgu ? "border border-gold/70 bg-gradient-to-b from-gold/[0.14] to-night-deep shadow-[0_25px_70px_-25px_rgba(220,193,136,0.7)] lg:-translate-y-3" : "border border-gold/15 bg-night/70"}`}>
                  {vurgu && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold to-gold-bright px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-night-deep">En popüler</span>
                  )}
                  {p.etiket && <span className="text-xs uppercase tracking-[0.22em] text-gold-bright/80">{p.etiket}</span>}
                  <div className="mt-4 flex items-end justify-center gap-2">
                    <span className="font-display text-6xl font-semibold leading-none text-parchment">{p.jeton}</span>
                    {hediye > 0 && (
                      <span className="mb-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-sm font-semibold text-emerald-300">+{hediye} hediye</span>
                    )}
                  </div>
                  <div className="mt-2 text-parchment/55">jeton · {toplam} Pro rapor</div>
                  <div className="mx-auto my-6 h-px w-16 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                  <div className="font-display text-4xl text-gold-bright">{p.fiyat > 0 ? `${p.fiyat.toLocaleString("tr-TR")} ₺` : "Fiyat için yaz"}</div>
                  {p.fiyat > 0 && <div className="mt-1 text-sm text-parchment/50">rapor başı {Math.round(p.fiyat / toplam).toLocaleString("tr-TR")} ₺</div>}
                  <div className="mt-7 flex-1" />
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener" className={`rounded-full px-6 py-3 font-medium transition-all ${vurgu ? "bg-gradient-to-r from-gold to-gold-bright text-night-deep hover:shadow-[0_10px_30px_-10px_rgba(220,193,136,0.9)]" : "border border-gold/45 text-gold-bright hover:bg-gold/10"}`}>WhatsApp ile al</a>
                  ) : (
                    <a href={`mailto:${eposta}?subject=${encodeURIComponent(`Gökname Pro · ${p.jeton} jeton`)}`} className="rounded-full bg-gold px-6 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">E-posta ile al</a>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-parchment/60">
            Daha fazla jeton talebiniz varsa lütfen belirtin; ihtiyacınıza göre size özel düzenleme yapalım.{" "}
            {genelWa ? <a href={genelWa} target="_blank" rel="noopener" className="text-gold-bright hover:underline">WhatsApp</a> : null}
            {genelWa && eposta ? " ya da " : ""}
            {eposta ? <a href={`mailto:${eposta}`} className="text-gold-bright hover:underline">{eposta}</a> : null}
          </p>
        </section>

        {/* ================= SSS ================= */}
        <section className="mx-auto mt-28 max-w-3xl">
          <Baslik ust="Sorular">Merak edilenler</Baslik>
          <div className="mt-10"><Faq items={sss} /></div>
        </section>

        {/* ================= KAPANIŞ ================= */}
        <section className="relative mt-24 overflow-hidden rounded-3xl border border-gold/35 px-6 py-14 text-center"
          style={{ background: "radial-gradient(120% 140% at 50% 0%, rgba(155,114,208,0.35), rgba(15,15,36,0.95) 60%)" }}>
          <div className="starfield pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <h2 className="font-display text-4xl font-semibold text-parchment sm:text-5xl">Bir sonraki seansın hazır olsun.</h2>
            <p className="mx-auto mt-3 max-w-xl text-parchment/70">Bize yaz, örnek raporu gönderelim ve hesabını hemen tanımlayalım.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {genelWa && (
                <a href={genelWa} target="_blank" rel="noopener" className="rounded-full bg-gradient-to-r from-gold to-gold-bright px-8 py-3.5 font-medium text-night-deep shadow-[0_10px_40px_-12px_rgba(220,193,136,0.8)] transition-transform hover:-translate-y-0.5">WhatsApp&apos;tan yaz</a>
              )}
              <Link href="/giris?next=/hesabim" className="rounded-full border border-gold/45 px-8 py-3.5 font-medium text-gold-bright transition-colors hover:bg-gold/10">Astrolog girişi</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
