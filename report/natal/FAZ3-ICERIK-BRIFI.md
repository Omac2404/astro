# FAZ 3 — İçerik Bağlama Brifi (imza tek-cümleleri + mizaç + element-yorum)

> Faz 3'ün küçük içerik parçası. `FAZ3-SWISS-EPHEMERIS-BRIFI.md` ile birlikte oku. Bu brif,
> `icerik.json`'u şablona bağlamayı anlatır. **250 blok DEĞİL** — sadece şu 4 alanı gerçekleştiren
> v1 içerik: imza tek-cümleleri, baskınlık, 4 mizaç, element-yorum. (Kalite Faz 5'te yükseltilir;
> kritik açılar elle override edilebilir.)

## Dosya
`content/icerik.json` (verildi). Tüm burç anahtarları `chart.json` ile **birebir aynı** Türkçe:
`Koç, Boğa, İkizler, Yengeç, Aslan, Başak, Terazi, Akrep, Yay, Oğlak, Kova, Balık`.

## render seçim mantığı (chart.json + icerik.json → şablon değişkenleri)

**İmzalar (yerleşim):**
- Güneş satırı: başlık `f"{gunes.sign} Güneş · {gunes.house}. Ev"`, cümle `icerik.gunes[gunes.sign]`
- Ay satırı: başlık `f"{ay.sign} Ay · {ay.house}. Ev"`, cümle `icerik.ay[ay.sign]`
- Yükselen satırı: başlık `f"{asc.sign} Yükselen"`, cümle `icerik.yukselen[asc.sign]`

**İmzalar (açı):** her `aspects[]` için:
- başlık: `f"{KW_AD[a]}–{KW_AD[b]} {icerik.aspect_etiket[type]}"` (örn. "Ay–Satürn Karşıtlığı"). `KW_AD` = okunur ad: gunes→Güneş, ay→Ay, merkur→Merkür, venus→Venüs, mars→Mars, jupiter→Jüpiter, saturn→Satürn, yukselen→Yükselen.
- cümle (kompozisyon): `cap(icerik.aspect_kw[a]) + " ile " + icerik.aspect_kw[b] + " " + icerik.aspect_relation[type] + "."`
  - Örnek (gunes ucgen jupiter): "Özün ile genişleme ve şans yanın akıcı bir uyumla birbirini besliyor."
  - Örnek (ay karsitlik saturn): "Duygusal dünyan ile disiplin ve sınırların arasında denge kurman gereken bir çekim var."
- İkona vektör glif: kavuşum/üçgen/kare/karşıtlık için `sig_paths.json`'daki ilgili açı glifi (conj/trine/square/oppo).

**İmzalar (baskınlık) — her zaman son satır:**
- baskın element `E` = `max(chart.elements)`, baskın nitelik `N` = `max(chart.modalities)`
- başlık: `f"{N}-{E} Baskınlığı"` (örn. "Öncü-Ateş Baskınlığı")
- cümle: `cap(icerik.nitelik_dom[N]) + ", " + icerik.element_dom[E] + "."`
  - Örnek: "Başlatan, inisiyatif alan, hevesli, coşkulu, harekete hazır bir genel ton."

**İmza SEÇİMİ (en fazla ~8, deterministik):**
1. Güneş, 2. Ay, 3. Yükselen (her zaman)
4. Açılar: `orb`a göre artan sırala (en sıkı ilk), **ışık (gunes/ay) içerenlere öncelik**, en fazla 4 al
5. Baskınlık (her zaman, en sonda)
→ 8'i aşarsa en zayıf (en büyük orb) açıları çıkar.

**Nitelik dökümü (sayfa 4):** doğrudan `chart.modalities` (Öncü·N / Sabit·N / Değişken·N) + etiketler
sabit (Öncü=başlatan, Sabit=sürdüren, Değişken=uyarlayan).

**Element barları + mizaç (sayfa 5):**
- Barlar: `chart.elements` yüzdeleri.
- Mizaç kartı: `icerik.mizac[chart.mizac.key]` → `ad`, `tabiat`, `tagline`, `metin`.
  - `key == "karma"` ise `metin` içindeki `{E1}`/`{E2}` yerine baskın iki elementi koy.

**Element-yorum paragrafı (sayfa 5):** `chart.elements`'i azalan sırala → `d`=baskın, `s`=ikincil, `w`=en zayıf.
`B = icerik.element_blocks`. Şablon:
```
Element dağılımında {B[d].baskin}; bu senin genel tonunu belirliyor.
Yanında {B[s].destek}, bu tabloyu dengeliyor.
Buna karşılık {B[w].eksik}; bu bir kusur değil, farkındalıkla güçlendirebileceğin bir alan.
```
(Tek paragraf olarak birleştir. İlk harfleri büyüt, em-dash kullanma.)

## Kurallar
- Bir burç/anahtar `icerik.json`'da yoksa hata verme; `"…"` stub bırak ve logla (eksik içerik görünür olsun).
- Em-dash (—) yok; İsim ayırıcı en-dash (–) açı başlıklarında serbest ("Ay–Satürn").
- `cap()` = ilk harfi büyüt (Türkçe i/İ'ye dikkat: "i"→"İ").
- Bu içerik **v1**. Kritik açılar/yerleşimler için ileride elle override tablosu eklenebilir (Faz 5);
  şimdilik kompozisyon + lookup yeterli.

## Test akışı
`chart.json` (Faz 3 compute) + `icerik.json` → render → 4 alan gerçek veriyle dolu PDF.
Beklenen: imzalar Deniz'in gerçek Güneş/Ay/Yükselen + açıları + baskınlığıyla; mizaç baskın elemente
göre; element-yorum dağılıma göre. Ayşe metni yalnız düz-yazı bölümlerde placeholder kalır (Faz 5).
