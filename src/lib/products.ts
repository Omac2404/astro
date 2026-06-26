// Yıldızname ürün kataloğu (çıkış dalgası 6 ürün). Front + detay + örnekler buradan beslenir.
// Aksan renkleri raporlardaki temalarla birebir aynı.

export type Product = {
  slug: string;
  ad: string; // kısa ürün adı (kart/nav)
  tamAd: string; // açıklayıcı tam ad (ör. "Aşk ve ilişkiler odaklı doğum haritası analizi")
  kisa: string; // detay sayfası başlık altı (açıklayıcı: "...derin okuması")
  kartKisa: string; // katalog kartı başlık altı (şiirsel kısa tagline)
  aciklama: string; // detay paragrafı
  accent: string; // hex aksan rengi (rapor temasıyla aynı)
  accentVar: string; // tailwind token adı (acc-*)
  glyph: string; // unicode sembol
  gorsel?: string; // kapak görseli (public/gorsel/<slug>.png); yoksa placeholder
  objectPos?: string; // görsel kırpma konumu (CSS object-position); yoksa "center 10%"
  fiyat: number; // TL (lansman fiyatı)
  eskiFiyat?: number; // TL (üstü çizili referans fiyat — lansman indirimi)
  sure: string; // örn. "12-15 sayfa"
  bolumler: { baslik: string; aciklama: string }[]; // Udemy tarzı "müfredat" — PDF bölüm başlıkları + 1 cümle
  ornekSayisi: number; // örnek analiz adedi (placeholder)
  ornekler?: string[]; // gerçek örnek kapak görselleri (public/ornekler/...); slot sırasıyla
  ornekIndir?: { dosya: string; indirAd: string }[]; // indirilebilir örnek PDF'ler (ornekler[] ile aynı index); varsa o slot ürün sayfasına değil PDF'e gider
  gizli?: boolean; // true ise herkese açık sayfalarda gösterilmez (admin/pipeline'da kalır)
};

export const PRODUCTS: Product[] = [
  {
    slug: "natal",
    ad: "Doğum Haritası Analizi",
    tamAd: "Kişiye özel doğum haritası analizi",
    kisa: "Genel doğum haritası analizin",
    kartKisa: "Kim olduğunun kozmik haritası",
    aciklama:
      "Doğduğun anın gökyüzünden yola çıkarak çekirdek kimliğini, duygusal dünyanı, zihnini, ilişki ve kariyer eğilimlerini, güçlü yanlarını ve gelişim alanlarını derinlemesine okuyan bayrak gemisi analiz.",
    accent: "#dcc188",
    accentVar: "acc-natal",
    glyph: "☉",
    gorsel: "/gorsel/natal.png",
    ornekler: ["/ornekler/natal-1.png", "/ornekler/natal-2.png", "/ornekler/natal-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/natal-ornek.pdf", indirAd: "Gökname Doğum Haritası — Örnek Rapor.pdf" },
      { dosya: "/ornekler/natal-ornek-2.pdf", indirAd: "Gökname Doğum Haritası — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/natal-ornek-3.pdf", indirAd: "Gökname Doğum Haritası — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Doğum Haritası & Ana İmzalar", aciklama: "Doğduğun anın gök haritası, gezegen yerleşimlerin ve seni en çok tanımlayan sekiz ana imza." },
      { baslik: "Sen Kimsin? — Çekirdek Kimliğin", aciklama: "Güneş'in ve baskın temanın üzerinden çekirdek karakterinin portresi." },
      { baslik: "Dışarıya Yansıman", aciklama: "Yükselenin: ilk izlenimin ve insanların seni nasıl gördüğü." },
      { baslik: "Duygusal Dünyan", aciklama: "Ay'ın: iç dünyan, duygusal ihtiyaçların ve neyle güvende hissettiğin." },
      { baslik: "Zihnin & İletişimin", aciklama: "Merkür'ün: düşünme, öğrenme ve kendini ifade etme tarzın." },
      { baslik: "Aşk & İlişkiler", aciklama: "Venüs ve Mars üzerinden ilişki eğilimlerine genel bir bakış." },
      { baslik: "Kariyer & Yaşam Yönün", aciklama: "10. ev, Satürn ve Jüpiter ile mesleki eğilimin ve yön duygun." },
      { baslik: "Enerji & Mizaç", aciklama: "Genel enerji tonun, element dengen ve mizacın." },
      { baslik: "Güçlü Yönlerin & Gelişim Alanların", aciklama: "Doğal güçlerin ve büyümeye açık yanların, yargısız bir dille." },
      { baslik: "Element Dengen & Mizacın", aciklama: "Dört elementin dağılımı, mizacın ve sana özel denge yorumu." },
      { baslik: "Son Söz", aciklama: "Tüm haritanı toparlayan, kişiye özel sıcak bir kapanış." },
    ],
    ornekSayisi: 3,
  },
  {
    slug: "ask",
    ad: "Aşk & İlişkiler Analizi",
    tamAd: "Aşk ve ilişkiler odaklı doğum haritası analizi",
    kisa: "Doğum haritanın aşk ve ilişkiler odaklı derin okuması",
    kartKisa: "Sevgi dilin, çekimin, ilişki kalıpların",
    aciklama:
      "Venüs, Mars ve ilişki evlerin üzerinden nasıl sevdiğini, neye çekildiğini, ilişkide nasıl davrandığını, duygusal ihtiyaçlarını ve tekrar eden kalıplarını aşk merceğinden okuyan analiz.",
    accent: "#d98fae",
    accentVar: "acc-ask",
    glyph: "♀",
    gorsel: "/gorsel/ask.png",
    ornekler: ["/ornekler/ask-1.png", "/ornekler/ask-2.png", "/ornekler/ask-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/ask-ornek.pdf", indirAd: "Gökname Aşk & İlişkiler — Örnek Rapor.pdf" },
      { dosya: "/ornekler/ask-ornek-2.pdf", indirAd: "Gökname Aşk & İlişkiler — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/ask-ornek-3.pdf", indirAd: "Gökname Aşk & İlişkiler — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Aşk Haritan & Ana İmzalar", aciklama: "Haritanın ilişki merceğinden okunuşu ve aşk hayatını tanımlayan ana imzalar." },
      { baslik: "Sevgi Dilin", aciklama: "Venüs'ün: nasıl sevdiğin, neye değer verdiğin, sevgiyi nasıl gösterip aldığın." },
      { baslik: "Çekim & Arzu", aciklama: "Mars'ın: seni neyin çektiği, tutku tarzın ve ilk adımı atış biçimin." },
      { baslik: "İlişkide Duruşun", aciklama: "Yükselen ve 7. ev: ilişkide nasıl göründüğün ve 'biz' kurma tarzın." },
      { baslik: "Duygusal İhtiyaçların", aciklama: "Ay'ın: sevgide neye ihtiyaç duyduğun ve güvende hissetmen için ne gerektiği." },
      { baslik: "Yakınlık & Derinlik", aciklama: "Mahremiyet, bağlanma derinliğin ve güven temaların." },
      { baslik: "Aşkta Kalıpların", aciklama: "Tekrar eden temaların, zorlandığın yerler ve bunların büyümeye dönüşmesi." },
      { baslik: "Sana Yakışan Bağ", aciklama: "Seni besleyen ilişki dinamiğinin resmi: hem ateşini koruyan hem güven veren bağ." },
      { baslik: "Element Dengen", aciklama: "Element dağılımının duygusal ifadene etkisi ve denge yorumu." },
      { baslik: "Son Söz", aciklama: "Aşk haritanı toparlayan, kişiye özel sıcak bir kapanış." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "kariyer",
    ad: "Kariyer & Para Analizi",
    tamAd: "Kariyer ve para odaklı doğum haritası analizi",
    kisa: "Doğum haritanın kariyer ve para odaklı derin okuması",
    kartKisa: "İş kimliğin, para ile ilişkin, çağrın",
    aciklama:
      "10. ev, Satürn, Jüpiter ve para göstergelerin üzerinden çalışma tarzını, para ile ilişkini, kariyer yönünü, fırsat alanlarını ve sana yakışan yolu okuyan analiz.",
    accent: "#4e9e7d",
    accentVar: "acc-kariyer",
    glyph: "♄",
    gorsel: "/gorsel/kariyer.png",
    objectPos: "center 10%",
    ornekler: ["/ornekler/kariyer-1.png", "/ornekler/kariyer-2.png", "/ornekler/kariyer-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/kariyer-ornek.pdf", indirAd: "Gökname Kariyer & Para — Örnek Rapor.pdf" },
      { dosya: "/ornekler/kariyer-ornek-2.pdf", indirAd: "Gökname Kariyer & Para — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/kariyer-ornek-3.pdf", indirAd: "Gökname Kariyer & Para — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Kariyer Haritan & Ana İmzalar", aciklama: "Haritanın iş ve para merceğinden okunuşu ve mesleki ana imzaların." },
      { baslik: "İş Kimliğin", aciklama: "Güneş ve 10. ev: çekirdek mesleki kimliğin ve neyle var olmak istediğin." },
      { baslik: "Çalışma Tarzın & Ritmin", aciklama: "Nasıl ürettiğin: tempo, düzen, ekip mi yalnız mı, detay mı bütün mü." },
      { baslik: "Para ile İlişkin", aciklama: "2. ev ve Venüs: parayı kazanma, harcama ve değerlendirme tarzın." },
      { baslik: "Kariyer Yönün & Çağrın", aciklama: "10. ev ve Satürn: uzun vadeli yönün ve ustalaşacağın alan." },
      { baslik: "Büyüme & Fırsat Alanın", aciklama: "Jüpiter'in: şansının açık olduğu ve genişlediğin alanlar." },
      { baslik: "Zorluk & Ustalaşma", aciklama: "Zorlandığın yerler ve bunların zamanla en güçlü becerine dönüşmesi." },
      { baslik: "Sana Yakışan Yol", aciklama: "Seni besleyen kariyer dinamiğinin resmi: hem güven hem büyüme veren bir iş hayatı." },
      { baslik: "Element Dengen", aciklama: "Element dağılımının çalışma ve üretim tarzına etkisi, denge yorumu." },
      { baslik: "Son Söz", aciklama: "Kariyer haritanı toparlayan, kişiye özel sıcak bir kapanış." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "saglik",
    ad: "Enerji & Mizaç Analizi",
    tamAd: "Enerji ve mizaç odaklı doğum haritası analizi",
    kisa: "Doğum haritanın enerji ve mizaç odaklı derin okuması",
    kartKisa: "Yaşam gücün, mizacın, denge rehberin",
    aciklama:
      "Mizacın ve element dengen merkezde olmak üzere yaşam gücünü, bedensel yapını, günlük enerji ritmini, stres-denge tarzını ve sana yakışan yaşam temposunu okuyan analiz. (Tıbbi teşhis değil, enerji ve denge rehberi.)",
    accent: "#4ea64a",
    accentVar: "acc-saglik",
    glyph: "☘",
    gorsel: "/gorsel/saglik.png",
    objectPos: "center 10%",
    ornekler: ["/ornekler/saglik-1.png", "/ornekler/saglik-2.png", "/ornekler/saglik-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/saglik-ornek-1.pdf", indirAd: "Gökname Enerji & Mizaç — Örnek Rapor 1.pdf" },
      { dosya: "/ornekler/saglik-ornek-2.pdf", indirAd: "Gökname Enerji & Mizaç — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/saglik-ornek-3.pdf", indirAd: "Gökname Enerji & Mizaç — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Enerji Haritan & Ana İmzalar", aciklama: "Haritanın enerji ve beden merceğinden okunuşu ve enerji ve mizaçla ilgili ana imzaların." },
      { baslik: "Enerji İmzan & Yaşam Gücün", aciklama: "Güneş ve Mars: temel canlılığın, enerjini nereden alıp nasıl harcadığın." },
      { baslik: "Bedensel Yapın & Mizacın", aciklama: "Yükselen ve mizacın: bedeninle ilişkin ve tabiatının sana kattığı tempo." },
      { baslik: "Günlük Enerji & Rutinin", aciklama: "6. ev ve Merkür: beslenme, uyku ve hareket düzenine yatkınlığın." },
      { baslik: "Stres & Denge", aciklama: "Stresi nasıl yaşadığın, biriktirdiğin ve neyle toparlandığın." },
      { baslik: "Güçlü ve Hassas Alanların", aciklama: "Bedeninin doğal güçleri ve özen isteyen hassas eğilimleri (teşhis değil, eğilim)." },
      { baslik: "Yenilenme & Dayanıklılık", aciklama: "Kendini nasıl onardığın, dinlenme ihtiyacın ve dirayet kazandığın koşullar." },
      { baslik: "Sana Yakışan Yaşam Ritmi", aciklama: "Seni canlı tutan tempo, öz-bakım ve denge biçiminin resmi." },
      { baslik: "Element Dengen", aciklama: "Element dağılımının bedensel ve enerjik dengene etkisi, denge yorumu." },
      { baslik: "Son Söz", aciklama: "Enerji haritanı toparlayan, kişiye özel sıcak bir kapanış." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "solar",
    gizli: true, // siteden gizlendi (admin/pipeline'da kalır) — 2026-06-21
    ad: "Solar Return Analizi",
    tamAd: "Doğum gününe özel yıllık gökyüzü analizi",
    kisa: "Önümüzdeki bir yılının gökyüzü odaklı derin okuması",
    kartKisa: "Bu yılın gökyüzü, yıl temanın haritası",
    aciklama:
      "Güneş'in doğduğun andaki konumuna döndüğü an için kurulan yıl haritası: önümüzdeki bir yılın tonunu, odağını, duygusal iklimini, fırsat ve zorluk alanlarını ve yılın davetini okuyan dönemsel analiz.",
    accent: "#9b72d0",
    accentVar: "acc-solar",
    glyph: "✴",
    gorsel: "/gorsel/solar.png",
    ornekler: ["/ornekler/solar-1.png"],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Yıl Haritan & Ana İmzalar", aciklama: "Doğum ve yıl haritan birlikte, yılı tanımlayan ana imzalarla." },
      { baslik: "Yılın Tonu", aciklama: "Yıl haritasının yükseleni: bu yıla hangi enerjiyle girdiğin ve genel havası." },
      { baslik: "Yılın Odağı", aciklama: "Güneş'in yıl evi: dikkatinin ve enerjinin en çok toplandığı yaşam alanı." },
      { baslik: "Duygusal İklim", aciklama: "Yıl Ay'ı: yılın duygusal tonu ve neyin seni beslediği." },
      { baslik: "Öne Çıkan Alanlar", aciklama: "Bu yıl hangi yaşam alanlarının (iş, ilişki, ev, öğrenme) aktif olduğu." },
      { baslik: "Fırsat ve Akış", aciklama: "Yılın açık kapıları, kolay aktığın ve şansının yaver gittiği yerler." },
      { baslik: "Zorluk ve Gerilim", aciklama: "Yılın sınavları, sabır isteyen alanlar ve bunların büyümeye dönüşmesi." },
      { baslik: "Yılın Daveti", aciklama: "Bu yılın sana ana mesajı: neyi kucaklarsan yılı en iyi yaşayacağın." },
      { baslik: "Element Dengen", aciklama: "Yıl haritasının element dağılımının yılın temposuna etkisi." },
      { baslik: "Son Söz", aciklama: "Yılını toparlayan, umut veren kişiye özel bir kapanış." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "lilith",
    ad: "Lilith & Karmik Analizi",
    tamAd: "Lilith ve karmik odaklı derin doğum haritası analizi",
    kisa: "Doğum haritanın Lilith ve karmik odaklı derin okuması",
    kartKisa: "Gölgen, karman, ruhsal yolculuğun",
    aciklama:
      "Lilith, Ay Düğümleri ve Kiron üzerinden gölgeni ve bastırdığın gücü, karmik geçmişini, ruhsal gelişim yönünü, yaranı ve şifanı ve ruhsal bütünleşme yolunu okuyan derin analiz.",
    accent: "#bb3850",
    accentVar: "acc-lilith",
    glyph: "☾",
    gorsel: "/gorsel/lilith.png",
    objectPos: "center 10%",
    ornekler: ["/ornekler/lilith-1.png", "/ornekler/lilith-2.png", "/ornekler/lilith-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/lilith-ornek-1.pdf", indirAd: "Gökname Lilith & Karmik — Örnek Rapor 1.pdf" },
      { dosya: "/ornekler/lilith-ornek-2.pdf", indirAd: "Gökname Lilith & Karmik — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/lilith-ornek-3.pdf", indirAd: "Gökname Lilith & Karmik — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Karmik Haritan & Ana İmzalar", aciklama: "Haritan ve dört karmik noktan (Lilith, Ay Düğümleri, Kiron) bir arada." },
      { baslik: "Gölgen ve Bastırdığın Güç", aciklama: "Lilith'in: içe ittiğin ham gücün ve sahiplenince nasıl özgürleştiğin." },
      { baslik: "Karmik Geçmişin", aciklama: "Güney Düğüm: fazla yaslandığın, tanıdık ama seni büyütmeyen eski kalıp." },
      { baslik: "Ruhsal Gelişim Yönün", aciklama: "Kuzey Düğüm: ruhunun bu yaşamdaki çağrısı ve büyümeye davet edildiğin yön." },
      { baslik: "Yaran ve Şifan", aciklama: "Kiron'un: en derin yaran ve tam o yaradan doğan şifa armağanın." },
      { baslik: "Tekrar Eden Örüntülerin", aciklama: "Hayatında dönüp dönüp gelen ders ve onun büyümeye dönüşmesi." },
      { baslik: "Ruhsal Bütünleşme", aciklama: "Tüm karmik parçaların tek bir bütünde toplanıp özgürleşme yolun." },
      { baslik: "Element Dengen", aciklama: "Element dağılımının ruhsal ve duygusal tonuna etkisi." },
      { baslik: "Son Söz", aciklama: "Ruhsal yolculuğunu toparlayan, özgürleştiren kişiye özel bir kapanış." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "sinastri-sevgili",
    ad: "Sevgili & Eş Uyumu",
    tamAd: "İki doğum haritasının çekim ve uyum analizi",
    kisa: "İki doğum haritasının çekim ve uyum okuması",
    kartKisa: "Çekiminiz, uyumunuz, gerilim noktalarınız",
    aciklama:
      "İki kişinin doğum haritasını yan yana koyup aranızdaki çekimi, duygusal bağı, iletişim ve tutku uyumunu, güven zeminini ve gerilim noktalarını okuyan çift uyum (sinastri) analizi. Romantik ilişkiler ve evlilik için.",
    accent: "#dd7a99",
    accentVar: "acc-sevgili",
    glyph: "♥",
    gorsel: "/gorsel/sinastri-sevgili.png",
    objectPos: "center 70%",
    ornekler: ["/ornekler/sinastri-sevgili-1.png", "/ornekler/sinastri-sevgili-2.png", "/ornekler/sinastri-sevgili-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/sinastri-sevgili-ornek.pdf", indirAd: "Gökname Sevgili & Eş Uyumu — Örnek Rapor.pdf" },
      { dosya: "/ornekler/sinastri-sevgili-ornek-2.pdf", indirAd: "Gökname Sevgili & Eş Uyumu — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/sinastri-sevgili-ornek-3.pdf", indirAd: "Gökname Sevgili & Eş Uyumu — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Aranızdaki Gökyüzü", aciklama: "İki haritanız yan yana ve gezegenlerin birbirinizin evlerine düşüşü (bindirmeler)." },
      { baslik: "Aranızdaki Gökyüzü Yorumu", aciklama: "Bu bindirmelerin ilişkinize pratikte ne kattığının okuması." },
      { baslik: "Aranızdaki Denge", aciklama: "İki kişilik element ve nitelik tablosu: dengeniz ve farklarınız." },
      { baslik: "Elementlerinizin İmza Sentezi", aciklama: "İlişkinizin ana imzasını tek bir portrede eriten özet." },
      { baslik: "İlk Çekim & Kimya", aciklama: "Aranızdaki çekimin ve kimyanın nereden geldiği." },
      { baslik: "Duygusal Bağ", aciklama: "Birbirinizi nasıl hissettirdiğiniz, güven ve yakınlık." },
      { baslik: "Zihinsel & İletişim Uyumu", aciklama: "Anlaşmak ne kadar kolay, sohbet ve fikir uyumunuz." },
      { baslik: "Tutku ve Yakınlık", aciklama: "Arzu, mahremiyet ve aranızdaki yoğunluk." },
      { baslik: "Güven ve Süreklilik", aciklama: "Bağın kalıcılığı, sorumluluk ve sadakat zemini." },
      { baslik: "Çatışma ve Gerilim Noktaları", aciklama: "Tekrar eden sürtüşmeler ve bunların dönüşümü." },
      { baslik: "Birlikte Büyümek", aciklama: "Birbirinizi nasıl beslediğiniz ve bu bağın özü." },
    ],
    ornekSayisi: 2,
  },
  {
    slug: "sinastri-arkadas",
    ad: "Arkadaşlık Uyumu",
    tamAd: "İki doğum haritasının dostluk uyumu analizi",
    kisa: "İki doğum haritasının dostluk uyumu okuması",
    kartKisa: "Sohbetiniz, ortak enerjiniz, güven bağınız",
    aciklama:
      "İki kişinin doğum haritasını karşılaştırıp dostluğunuzdaki kıvılcımı, duygusal anlayışı, sohbet ve enerji uyumunu, güven ve sadakat zeminini ve sürtüşme noktalarını okuyan platonik uyum (sinastri) analizi. Arkadaşlıklar için.",
    accent: "#e08e4f",
    accentVar: "acc-arkadas",
    glyph: "✦",
    gorsel: "/gorsel/sinastri-arkadas.png",
    objectPos: "center 70%",
    ornekler: ["/ornekler/sinastri-arkadas-1.png", "/ornekler/sinastri-arkadas-2.png", "/ornekler/sinastri-arkadas-3.png"],
    ornekIndir: [
      { dosya: "/ornekler/sinastri-arkadas-ornek-1.pdf", indirAd: "Gökname Arkadaşlık Uyumu — Örnek Rapor 1.pdf" },
      { dosya: "/ornekler/sinastri-arkadas-ornek-2.pdf", indirAd: "Gökname Arkadaşlık Uyumu — Örnek Rapor 2.pdf" },
      { dosya: "/ornekler/sinastri-arkadas-ornek-3.pdf", indirAd: "Gökname Arkadaşlık Uyumu — Örnek Rapor 3.pdf" },
    ],
    fiyat: 99,
    eskiFiyat: 249,
    sure: "12-14 sayfa",
    bolumler: [
      { baslik: "Aranızdaki Gökyüzü", aciklama: "İki haritanız yan yana ve gezegenlerin birbirinizin evlerine düşüşü (bindirmeler)." },
      { baslik: "Aranızdaki Gökyüzü Yorumu", aciklama: "Bu bindirmelerin dostluğunuza pratikte ne kattığının okuması." },
      { baslik: "Aranızdaki Denge", aciklama: "İki kişilik element ve nitelik tablosu: dengeniz ve farklarınız." },
      { baslik: "Elementlerinizin İmza Sentezi", aciklama: "Dostluğunuzun ana imzasını tek bir portrede eriten özet." },
      { baslik: "İlk Tanışma ve Kıvılcım", aciklama: "İlk karşılaşmada hissedilen sıcaklık ve sempatinin kaynağı." },
      { baslik: "Duygusal Anlayış", aciklama: "Birbirinizi ne kadar anladığınız, yanında hissetme." },
      { baslik: "Zihinsel Uyum ve Sohbet", aciklama: "Muhabbetiniz, fikir alışverişi ve ortak diliniz." },
      { baslik: "Ortak Enerji ve Eylem", aciklama: "Birlikte ne yapmaktan keyif aldığınız, ortak coşku." },
      { baslik: "Güven ve Sadakat", aciklama: "Dostluğun kalıcılığı, sırdaşlık ve zor günde yanında olma." },
      { baslik: "Sürtüşme Noktaları", aciklama: "Tekrar eden farklar ve dostluğu yıpratmadan yönetimi." },
      { baslik: "Dostluğunuzu Besleyen", aciklama: "Birbirinize ne kattığınız ve bağın özü." },
    ],
    ornekSayisi: 2,
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
export const BIREYSEL = PRODUCTS.filter((p) => !p.slug.startsWith("sinastri"));
export const CIFT = PRODUCTS.filter((p) => p.slug.startsWith("sinastri"));
