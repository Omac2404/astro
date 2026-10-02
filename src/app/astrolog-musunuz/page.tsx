import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/faq";
import { getProAyar, getPaytr, getGenelAyar, isAstrolog } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => seoMetadata("/astrolog-musunuz");

// Astrologlara B2B satış sayfası: jetonla Pro rapor. Satış manuel (WhatsApp/e-posta); paketler admin'den.
// ŞU AN GİZLİ: header/footer linki kaldırıldı, sitemap dışı + noindex; yalnız admin ve astrologlara açık.
const ICERIK: { t: string; d: string }[] = [
  { t: "Tam teknik veri", d: "10 gezegen, Ay Düğümleri, Kiron, Lilith, Şans Noktası, MC/IC; derece-dakika, ev, öz-onur durumu, retro ve günlük hız." },
  { t: "Açı ızgarası", d: "Majör ve minör açılar; orb, yaklaşan/ayrılan fazı ve uyum niteliğiyle tablo halinde." },
  { t: "Ev yöneticileri ve dispozitörler", d: "12 evin burcu, yöneticisi ve yöneticinin konumu; dispozitör zincirleri ve karşılıklı ağırlamalar." },
  { t: "Harita kalıpları ve güç dengesi", d: "Stelyum, T-kare, büyük üçgen, yod gibi kalıplar; element, nitelik, yarıküre dağılımı ve gezegen güç skoru." },
  { t: "Derin yorum", d: "Güneş-Ay-Yükselen üçlüsünden kuşak gezegenlerine, 12 evden karmik eksene kadar 11 ayrı yorum bölümü. Her çıkarımın teknik dayanağı parantez içinde." },
  { t: "12 aylık zamanlama", d: "Yavaş gezegen transitlerinin zaman çizelgesi ve tam isabet tarihleri; ikincil progresyonlar, progresif Ay yolculuğu ve geçerli Solar Return." },
  { t: "Yaşam olayları analizi", d: "Danışanın verdiği tarihlerdeki transit ve progresyon tetikleyicileri; desen okuması ve doğum saati doğrulamasına katkı." },
  { t: "Danışan sorularına cevaplar", d: "Danışanın odak sorularının her biri haritaya ve zamanlamaya dayanarak ayrı ayrı ele alınır." },
  { t: "Seans rehberi", d: "Açılış önerisi, haritanın işaret ettiği 8-10 soru, hassas noktalar ve dil önerisi, pratik öneriler ve seansta kullanabileceğin vurucu cümleler." },
];

const KARSILASTIRMA: [string, string, string][] = [
  ["Sayfa", "6-9 sayfa", "20+ sayfa"],
  ["Hesaplanan noktalar", "7 gezegen + Yükselen", "10 gezegen + düğümler, Kiron, Lilith, Şans Noktası, MC"],
  ["Açılar", "Majör açıların özeti", "Majör + minör, orb ve faz ile tam ızgara"],
  ["Yorum derinliği", "Bölüm başına kısa okuma", "Teknik dayanaklı, katmanlı profesyonel yorum"],
  ["Zamanlama", "Yok", "12 aylık transit takvimi, progresyonlar, Solar Return"],
  ["Ek danışan bilgisi", "Yok", "Sorular, yaşam olayları, meslek, ilişki durumu, astrolog notu"],
  ["Seans rehberi", "Yok", "Var"],
  ["Saklama", "90 gün", "1 yıl, panelinde"],
];

const ADIMLAR: { t: string; d: string }[] = [
  { t: "Bize ulaş", d: "Sana uygun jeton paketini seç, WhatsApp ya da e-postadan yaz." },
  { t: "Hesabın tanımlansın", d: "Astrolog hesabını açar, jetonlarını yükleriz. 1 jeton = 1 Pro rapor." },
  { t: "Danışanını gir", d: "Üye girişinden panelin açılır. Doğum bilgilerini ve istersen soruları, yaşam olaylarını ekle." },
  { t: "Dosyan hazır", d: "Birkaç dakika içinde PDF panelinde. Raporların 1 yıl boyunca orada saklanır." },
];

function waLink(numara: string, mesaj: string) {
  const n = numara.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mesaj)}` : "";
}

export default async function AstrologMusunuzPage() {
  // Şimdilik GİZLİ: menü/footer'da yok; yalnız admin ve astrolog hesapları açabilir, diğerleri 404.
  const u = await currentUser();
  if (!u || (u.type === "member" && !isAstrolog(u.email))) notFound();
  const ayar = getProAyar();
  const whatsapp = ayar.whatsapp || getPaytr().whatsappNumara;
  const eposta = ayar.eposta || getGenelAyar().iletisim.eposta;
  const genelWa = waLink(whatsapp, "Merhaba, astroloğum. Gökname Pro raporları ve jeton paketleri hakkında bilgi almak istiyorum.");
  const sss = [
    { q: "Jetonu nasıl alırım?", a: "Bize WhatsApp ya da e-postadan ulaşman yeterli. Ödeme tamamlanınca **astrolog hesabını açar ve jetonlarını yükleriz**; giriş bilgilerin sana iletilir." },
    { q: "Rapor ne kadar sürede hazırlanır?", a: "Genellikle **birkaç dakika**. Raporu başlattıktan sonra sayfayı kapatabilirsin; hazır olunca panelinde görünür." },
    { q: "Üretim başarısız olursa jetonum gider mi?", a: "Hayır. Teknik bir nedenle rapor üretilemezse **jetonun otomatik olarak iade edilir** ve aynı bilgilerle tekrar oluşturabilirsin." },
    { q: "Danışanın doğum saati belli değilse?", a: "“Saat bilinmiyor” seçeneğiyle rapor yine üretilir; Yükselen ve ev yorumları **doğrulanması gereken** noktalar olarak işaretlenir. Yaşam olayları girersen saat doğrulamasına yardımcı tetikleyiciler de rapora eklenir." },
    { q: "Raporlar ne kadar saklanır?", a: `Pro raporların **${ayar.saklamaGun} gün** boyunca panelinde saklanır. Dilediğin raporu danışan bilgileriyle birlikte istediğin an silebilirsin.` },
    { q: "Raporu danışanımla paylaşabilir miyim?", a: "Rapor senin çalışma dosyan; kapağında senin adın ya da markan yer alır. Seansında kullanmak, danışanına sunmak ya da yalnızca hazırlık için okumak tamamen senin tercihin." },
    { q: "Danışan verileri güvende mi?", a: "Danışan bilgileri **yalnızca raporun üretimi için** işlenir, üçüncü kişilerle paylaşılmaz. Saklama süresi sonunda rapor ve bilgiler otomatik silinir." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-16">
      {/* Hero */}
      <header className="mx-auto max-w-3xl text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-gold-bright/75">Astrologlar için · Gökname Pro</span>
        <h1 className="mt-4 font-display text-5xl font-semibold leading-tight sm:text-6xl">
          Astrolog musunuz?
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-parchment/75">
          Danışanın için dakikalar içinde <span className="text-gold-bright">20 sayfayı aşan profesyonel bir harita dosyası</span>:
          tam teknik veri, derin yorum, 12 aylık zamanlama ve sana özel seans rehberi. Sen danışanına odaklan, hazırlığı biz yapalım.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#paketler" className="rounded-full bg-gold px-7 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">Jeton paketleri</a>
          {ayar.ornekPdf && (
            <a href={ayar.ornekPdf} target="_blank" rel="noopener" className="rounded-full border border-gold/40 px-7 py-3 font-medium text-gold-bright transition-colors hover:bg-gold/10">Örnek raporu incele</a>
          )}
          <Link href="/giris?next=/hesabim" className="rounded-full border border-gold/25 px-7 py-3 text-parchment/80 transition-colors hover:border-gold/50 hover:text-gold-bright">Astrolog girişi</Link>
        </div>
      </header>

      {/* Nasıl çalışır */}
      <section className="mt-20">
        <h2 className="text-center font-display text-3xl font-semibold">Nasıl çalışır?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ADIMLAR.map((a, i) => (
            <div key={a.t} className="rounded-2xl border border-gold/15 bg-night p-5">
              <div className="font-body text-3xl font-semibold text-gold-bright/80">{i + 1}</div>
              <h3 className="mt-2 font-display text-xl text-parchment">{a.t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-parchment/65">{a.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-parchment/60">
          <span className="text-gold-bright">1 jeton = 1 Pro rapor.</span> Jetonlarını, kalan hakkını ve geçmiş raporlarını panelinden takip edersin.
        </p>
      </section>

      {/* İçerik */}
      <section className="mt-20">
        <h2 className="text-center font-display text-3xl font-semibold">Pro raporun içinde ne var?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-parchment/65">
          Sitedeki ücretsiz raporların profesyonel ve çok daha kapsamlı versiyonu. Tasarım değil bilgi odaklı: okuyup seansını kurman için hazırlanmış bir bilgi deryası.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ICERIK.map((x) => (
            <div key={x.t} className="rounded-2xl border border-gold/15 bg-night p-5">
              <h3 className="font-display text-xl text-gold-bright">{x.t}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-parchment/70">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Karşılaştırma */}
      <section className="mt-20">
        <h2 className="text-center font-display text-3xl font-semibold">Ücretsiz rapor ile Pro rapor</h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-gold/15 bg-night">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-gold/15 text-xs uppercase tracking-[0.14em] text-parchment/50">
                <th className="px-5 py-3.5"></th><th className="px-5">Ücretsiz rapor</th><th className="px-5 text-gold-bright">Pro rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10">
              {KARSILASTIRMA.map(([k, a, b]) => (
                <tr key={k}>
                  <td className="px-5 py-3 text-parchment/55">{k}</td>
                  <td className="px-5 py-3 text-parchment/70">{a}</td>
                  <td className="px-5 py-3 text-parchment/95">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Paketler */}
      <section id="paketler" className="mt-20 scroll-mt-28">
        <h2 className="text-center font-display text-3xl font-semibold">Jeton paketleri</h2>
        <p className="mt-3 text-center text-parchment/65">Paketini seç, bize yaz; hesabını tanımlayıp jetonlarını yükleyelim.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ayar.paketler.map((p, i) => {
            const wa = waLink(whatsapp, `Merhaba, astroloğum. ${p.jeton} jetonluk Gökname Pro paketini almak istiyorum.`);
            const vurgu = i === Math.floor(ayar.paketler.length / 2) && ayar.paketler.length > 1;
            return (
              <div key={i} className={`flex flex-col rounded-2xl border p-6 text-center ${vurgu ? "border-gold/55 bg-gold/[0.07]" : "border-gold/15 bg-night"}`}>
                {p.etiket && <span className="text-xs uppercase tracking-[0.2em] text-gold-bright/80">{p.etiket}</span>}
                <div className="mt-3 font-body text-5xl font-semibold text-parchment">{p.jeton}</div>
                <div className="text-parchment/55">jeton · {p.jeton} Pro rapor</div>
                <div className="mt-5 font-display text-3xl text-gold-bright">{p.fiyat > 0 ? `${p.fiyat.toLocaleString("tr-TR")} ₺` : "Fiyat için yaz"}</div>
                {p.fiyat > 0 && <div className="mt-1 text-sm text-parchment/50">rapor başı {Math.round(p.fiyat / p.jeton).toLocaleString("tr-TR")} ₺</div>}
                <div className="mt-6 flex-1" />
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener" className="rounded-full bg-gold px-6 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">WhatsApp ile al</a>
                ) : (
                  <a href={`mailto:${eposta}?subject=${encodeURIComponent(`Gökname Pro · ${p.jeton} jeton`)}`} className="rounded-full bg-gold px-6 py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">E-posta ile al</a>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-parchment/55">
          Daha büyük ihtiyaçlar ya da ofis kullanımı için{" "}
          {genelWa ? <a href={genelWa} target="_blank" rel="noopener" className="text-gold-bright hover:underline">WhatsApp</a> : null}
          {genelWa && eposta ? " ya da " : ""}
          {eposta ? <a href={`mailto:${eposta}`} className="text-gold-bright hover:underline">{eposta}</a> : null} üzerinden yaz.
        </p>
      </section>

      {/* SSS */}
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center font-display text-3xl font-semibold">Merak edilenler</h2>
        <div className="mt-8"><Faq items={sss} /></div>
      </section>

      <div className="mt-16 rounded-2xl border border-gold/15 bg-night p-8 text-center">
        <h2 className="font-display text-3xl font-semibold">Hesabın zaten var mı?</h2>
        <p className="mt-2 text-parchment/70">Üye girişinden gir; astrolog panelin otomatik açılır.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/giris?next=/hesabim" className="rounded-full bg-gold px-7 py-3 font-medium text-night-deep hover:bg-gold-bright">Giriş yap</Link>
          {genelWa && <a href={genelWa} target="_blank" rel="noopener" className="rounded-full border border-gold/40 px-7 py-3 font-medium text-gold-bright hover:bg-gold/10">Bize yaz</a>}
        </div>
      </div>
    </div>
  );
}
