@AGENTS.md

---

# Yıldızname — Natal PDF Rapor (Tasarım/Şablon Katmanı)

> **Bu repoya özgü güncel kararlar (orijinal brifin üstüne notlar — çelişirse bunlar geçerli):**
>
> - **Yerleşim:** Tüm tasarım dosyaları tek klasörde → **`report/natal/`** (`natal-rapor-sablon2.html`, `wheel_gen.py`, `diagram_gen.py`, `build.py`, `sig_paths.json`, `libra_path.txt`, `requirements.txt`). Relatif yol kullandıkları için dağıtılmadı; `build.py` bu klasörden çalışır.
> - **PDF render = headless Chrome (Puppeteer), weasyprint DEĞİL.** Stack Node olduğu için `report/natal/render.mjs` sistemde kurulu Chrome'u sürücüler: `page.pdf({ format: 'A4', printBackground: true, margin: 0 })`. `printBackground` şart (mor upsell kartları + gece sayfaları). Çalıştır: `node report/natal/render.mjs`. GTK derdi yok, prod motoruyla birebir.
> - weasyprint yalnızca opsiyonel önizleme aracıdır; Windows'ta GTK yerine WSL önerilir.
> - **Python + fontTools yalnızca SVG üretimi için** (wheel/diagram, `build.py`); PDF render'ı için gerekmez.
> - Rol dağılımı: **Python+fontTools = veri→SVG**, **Chrome/Puppeteer = HTML→PDF**. (İleride SVG üretimi de JS'e taşınmak istenirse `opentype.js`, fontTools'un karşılığıdır.)

Aşağısı orijinal devir brifidir (referans bağlam):

## 0. Sen ne devralıyorsun

Otomatik, AI-sentezli **Türkçe astroloji natal PDF rapor** ürününün **tasarım/şablon katmanı**.
Şu anki durum: tek bir kendine yeten HTML şablonu (örnek "Ayşe" verisiyle dolu) + veriye-bağlı SVG
üreten 2 Python scripti + weasyprint ile PDF. Çıktı ~11 A4 sayfalık bir rapor.

**Senin görevin (Deniz buradan devam edecek):** çoğunlukla tasarım detayları (CSS/HTML), gerektikçe
SVG üreticilerinde (çark/diyagram) ince ayar. İleride Swiss Ephemeris ile gerçek veri beslenecek.

Ton: Deniz Türkçe ve samimi konuşur (bro/kanka). Kalite önceliklidir; **kısma/kolaya kaçma yok**,
imkânsız iddia/sallama olursa dürüstçe söyle. Hata olunca grovel yapma, kabul et ve düzelt.

---

## 1. Hızlı başlangıç

```bash
pip install -r requirements.txt          # weasyprint + fonttools (+ opsiyonel pymupdf, Pillow)

# Sadece tasarım tweak'i (CSS/HTML): HTML'i düzenle, sonra:
weasyprint natal-rapor-sablon2.html out.pdf

# Çark/diyagram VERİSİ ya da üretici script değişince (SVG'ler inline gömülü olduğu için):
python3 build.py        # wheel_gen + diagram_gen çalıştırır, SVG'leri HTML'e gömer, out.pdf üretir
```

**Önizleme/QA:** Tarayıcıda `natal-rapor-sablon2.html` açılır (Cormorant/Spectral fontları Google
CDN'den gelir). PDF'i göz kontrolü için sayfa→PNG: `pymupdf` (`fitz`) ile
`doc[i].get_pixmap(dpi=110).save(...)`. **Her değişiklikten sonra hem tarayıcı hem PDF render'ı kontrol et**
— weasyprint ve Chrome bazı şeylerde farklı davranır (aşağıda "kritik kararlar"a bak).

---

## 2. Dosya envanteri

| Dosya | Ne |
|---|---|
| `natal-rapor-sablon2.html` | **Ana şablon.** Tüm CSS `<style>` içinde, SVG'ler (çark + diyagram) inline gömülü. Kendi başına render olur. |
| `wheel_gen.py` | Natal **çark** SVG üreticisi (veriye bağlı). Çıktı: `wheel.svg`. |
| `diagram_gen.py` | **Element × Nitelik** ızgara diyagramı SVG üreticisi. Çıktı: `diagram.svg`. |
| `sig_paths.json` | İmza ikonlarının (Güneş/Ay/Terazi/kare/kavuşum/karşıtlık/üçgen) **vektör path**'leri. |
| `libra_path.txt` | ♎ Terazi glifinin vektör path'i (pozisyon tablosundaki Yükselen ikonu için). |
| `build.py` | SVG üret → HTML'e göm → PDF render eden yardımcı. |
| `requirements.txt` | Python bağımlılıkları. |

> SVG'ler HTML'e **inline** (harici `<img>` değil). Bu, weasyprint + tarayıcıda birebir aynı, font/emoji
> riski sıfır demek. Üreticiyi değiştirince `build.py` ile yeniden gömmen gerekir.

---

## 3. KRİTİK kararlar & tuzaklar — bunları bozmadan önce oku

### 3a. Vektör glif (EN ÖNEMLİSİ)
Zodyak/burç sembolleri (♈–♓ = U+2648..2653) ve bazı astro sembolleri Unicode'da **emoji-default**'tur.
Sonuç:
- **weasyprint**: SVG `<text>` içinde çizilmiyor (boş ya da ○ çıkıyor).
- **production tarayıcı**: renkli emoji (yeşil/kırmızı daire) olarak geliyor — markaya uymaz.

**Çözüm (zorunlu):** Bu glifleri fonttan **vektör `<path>`** olarak çıkarıyoruz.
- `wheel_gen.py` içindeki `glyph_path(code, cx, cy, box, fill)` helper'ı: `fontTools` (SVGPathPen + BoundsPen)
  ile glifi çizer, `box/max(genişlik,yükseklik)` ile normalize eder, merkeze koyar, y'yi ters çevirir.
- İmza ikonları `sig_paths.json`'da hazır path olarak tutulur; HTML'e `<svg class="sig-glyph"><g fill="#dcc188">{path}</g></svg>` şeklinde gömülü.

**KURAL:** Çark / diyagram / imza ikonlarında burç veya emoji-riskli sembol için **asla** font glifi
(`<text>&#xNNNN;</text>`) kullanma — vektör path kullan. Gezegen glifleri (☉☽☿♀♂♃♄) text-default
olduğu için **pozisyon tablosunda** (HTML metni) font olarak güvenli; yine de tutarlılık için imzalarda
vektöre çevrildi. Yeni bir sembol eklerken önce küçük bir testle "weasyprint + tarayıcıda monokrom mu,
emoji mi geliyor" diye bak; emoji riski varsa vektörle.

### 3b. Ev sistemi: **Tüm Burç (Whole Sign)**
- 1. ev = Yükselen burcunun **tamamı**. Ev sınırı = burç sınırı. Numara: `house = ((sign_index - asc_sign_index) % 12) + 1`.
- Örnek "Ayşe" datası zaten Tüm Burç ile **birebir tutarlı** (Güneş Aslan=11, Ay Yengeç=10, Merkür Başak=12,
  Venüs/Mars Koç=7, Jüpiter Yay=3, Satürn Oğlak=4).
- Çarkta ev numaraları **çark dışında** halka olarak ("1.ev … 12.ev"), dolu evler altın+bold, boş evler gri.
- ⚠️ Swiss Ephemeris entegrasyonunda **aynı sistemde kal**. Placidus/Equal'e geçersen gezegen→ev atamaları
  değişir (sınıra yakın gezegen ev atlar) ve metinlerle çark çelişir.

### 3c. weasyprint sayfa-bölme & yükseklik
- Her `<section class="sheet">` ≈ bir PDF sayfası. `.sheet{ min-height:297mm; overflow:hidden }`.
- **Sabit-yükseklikli ortalı sayfalar** (`.inner`, `.diag-inner`: `min-height:297mm; display:flex;
  flex-direction:column; justify-content:center`) **parçalanmaz** — çark/element/diyagram/kapanış bunu kullanır.
- **Akan içerik** (`.flow`) içerik uzayınca sayfalar arası bölünür. Diyagram sayfasında SVG + uzun
  paragraf toplamı 297mm'yi aşmamalı (aşınca sentez paragrafı sonraki sayfaya kaçıyordu). Çözüm: SVG'ye
  **açık mm boyut** ver + boşlukları kıs.
- **SVG'lere CSS'te açık `width`/`height` (mm) ver.** weasyprint'te `height:auto` SVG için **güvenilmez**
  (kutuyu yanlış hesaplayıp içeriği aşağı itebilir). Çark `.chart-wheel{ width/height:117mm }`,
  diyagram `.diagram{ width:133mm; height:81mm }` gibi sabit.

### 3d. Metin işleyen regex'ler SVG'yi bozabilir
- SVG `transform="translate(…) scale(…)"` ifadelerinde **parantez** var. HTML üzerinde "parantez içini
  renklendir" gibi bir regex yaparsan SVG transform'larını da yakalayıp bozarsın.
- **Ders:** `<p>` paragraflarını hedeflerken `<p[^>]*>` YANLIŞ — bu `<path>` etiketini de "`<p`" sanır.
  Doğrusu: `<p(?:\s[^>]*)?>` (sadece gerçek `<p>`/`<p attr>`). Genel kural: tüm-HTML üzerinde text-regex
  yaparken inline SVG bölgelerini dışla.

### 3e. Tipografi kuralları (Deniz'in tercihi)
- **Em-dash (—) KULLANMA.** Prozda uzun tire yok; yerine virgül/iki nokta. (En-dash `–` isimlerde kalır:
  "Venüs–Mars", "Ay–Satürn".)
- Parantez içi astro referansları (`(Aslan Güneş)`, `(11. ev)`, `(%50)`) `.paren` ile renkli:
  açık parşömen sayfada amber `#a8722b`, koyu sayfada `var(--gold-bright)`.
- Gövde ~12.5pt, metin sütunu ~155mm (mobil okunurluk önemli — kullanıcılar çoğunlukla mobilden okuyacak).

### 3f. Fontlar
- **Başlık** Cormorant Garamond, **gövde** Spectral — HTML `<head>`'de Google Fonts `<link>`. Tarayıcıda
  otomatik gelir; weasyprint için yerelde kurulu olması metrik kaymasını önler.
- **Glif çıkarımı** (`wheel_gen.py`, `sig_paths.json` üretimi) için fontTools + şu font dosyaları gerekir:
  `NotoSansSymbols2-Regular.ttf`, `DejaVuSans.ttf` (opsiyonel `Symbola`). Ubuntu'da:
  `apt-get install fonts-noto-core fonts-symbola` (veya eşdeğeri).

---

## 4. Tasarım sistemi (tokens)

`:root` CSS değişkenleri (HTML başında):
- **Gece moru:** `--night #1b1b3a`, `--night-deep #0f0f24`, ayrıca `#12122e`, `#14142e` (upsell).
- **Altın:** `--gold #c2a36b`, `--gold-bright #dcc188`. **Parşömen:** `--parchment #f7f2e9`. **Mürekkep:** `--ink ~#2b2a3d`.
- Gri-lavanta vurgu: `#8884ad` (boş ev etiketleri, ikincil).
- Element renkleri (diyagram + barlar): Ateş `#d9a85e`, Toprak `#9a8a55`, Hava `#9aa6c4`, Su `#6f9a9a`.
- Açı çizgisi renkleri (çark): üçgen/uyum `TEAL #7fb0a6`, kare/karşıtlık/gerilim `RUST #c07f5a`.

Marka tonu: sıcak + zarif + hafif mistik. Marka placeholder adı **"Yıldızname"**.

---

## 5. Sayfa yapısı (sırayla, ~11 sayfa)

1. **Kapak** (`.cover`).
2. **Çark + Pozisyon tablosu** (`.chart-page .inner`): veriye bağlı natal çark
   (dış "N.ev" halkası, AC noktası ♎, gezegenler gerçek boylamlarda, renk-kodlu açı çizgileri) +
   8 satırlık gezegen/nokta tablosu (glif · ad · burç°·ev · anlam).
3. **Ana İmzalar** (`.sig-page`): üstte 12-ev açıklama listesi (dolu evler **turuncu arkaplan** vurgulu) +
   altta 8 küratörlü imza (dairesiz, eşit boyutlu vektör ikonlar — pozisyon tablosu boyutunda).
4. **Nitelik Dengesi / Haritanın Şekli** (`.sig-page .diag-inner`): Element × Nitelik ızgara diyagramı
   (Öncü sütunu vurgulu, element vurgusu kasten kısık) + nitelik dökümü (Öncü·5 / Sabit·1 / Değişken·2) + İmza Sentezi.
5. **Element & Mizaç** (`.element-page .inner`): element barları (Ateş %50 …) + mizaç adı (Safravi) + yorum.
6. **Bölümler** (`.sections` içinde tek `.sheet`/`.flow`): 8 bölüm (I Çekirdek, II Dış İzlenim, III İç Dünya,
   IV Zihin, V Bağlar, VI Yön, VII Beden, VIII Bütünlük). **V–VIII'de paragraf aralarında inline upsell
   kartları** (mor + ince konstelasyon çizgi deseni + altın buton).
7. **Kapanış** (`.closing .inner`): "Son Söz" — uzun, ortalı, italik altın kapanış paragrafı. **Upsell yok.**

### Upsell mantığı (önemli iş kuralı) — GÜNCELLENDİ (Deniz kararı)
- Cross-sell akan içeriğe **serpiştirilmez** (eski karar bunun tersiydi; geçersiz). Sebep: inline kartlar okuma
  akışını bozuyor, rapor paylaşılınca reklam gibi duruyor.
- Tüm cross-sell **Son Söz'den sonra ayrı bir MOR "Yıldızname Serisi" sayfasında** toplu liste olarak verilir
  (2 sütunlu kompakt kart grid'i, tek sayfaya sığar). Şablon: `closing` bölümünden sonra `{% if upsell_list %}`
  `.series-page`. Stil: `.series-page` mor zemin + `.series-page .upsell` 2 sütun.
- Liste içeriği `render.py: UPSELL_LIST_NATAL` + `PRODUCTS["natal"]["upsell_list"]`. Natal diğer 5 lansman
  ürününü satar: **Aşk, Kariyer & Para, Sağlık & Enerji, Solar Return, Lilith & Karmik**. Sevgili/Eş (Sinastri)
  lansmanda YOK, listede değil (`UP_SINASTRI` sabiti duruyor ama kullanılmıyor).
- Upsell kart stili (mor + `data:image/svg+xml` konstelasyon background + altın buton) `.upsell` CSS'inde.

---

## 6. Örnek veri ("Ayşe" — illüstratif)

`wheel_gen.py` içinde sabit (ileride parametrik yapılacak):
- **ASC = 198.05°** (Terazi 18°03'). Kapak: "5 Ağustos 1995 · 15:32 · İzmir".
- Gezegen boylamları (longitude, derece): Güneş 129.733 (Aslan, 11.ev), Ay 104.333 (Yengeç, 10),
  Merkür 152.25 (Başak, 12), Venüs 24.833 (Koç, 7), Mars 21.167 (Koç, 7), Jüpiter 246.683 (Yay, 3),
  Satürn 281.917 (Oğlak, 4).
- Çizilen gerçek açılar: Güneş–Jüpiter üçgeni (teal), Ay–Satürn karşıtlığı (rust), Merkür–Jüpiter karesi
  (rust), Ay–Yükselen karesi (rust, ~3.7° orb). Venüs–Mars kavuşumu çizgisiz (çakışık).
- Element dağılımı (7 gezegen + Yükselen, eşit ağırlık): Ateş %50, Toprak %25, Su %12.5, Hava %12.5 → mizaç **Safravi**.
- Nitelik: Öncü 5, Değişken 2, Sabit 1.

> ⚠️ Ev yerleşimleri **şu an illüstratif** (gerçek house hesabı değil; Tüm Burç ile tutarlı seçilmiş).
> Swiss Ephemeris gelince gerçek olacak. Anlamlar evrensel.

---

## 7. Tamamlananlar (mevcut durum)

- Veriye-bağlı çark (vektör glifler, dış ev halkası, AC=♎, renk-kodlu açılar).
- Element×Nitelik diyagramı (Öncü vurgulu, nitelik-odaklı sayfa — element sayfasından net ayrı).
- 12-ev listesi (dolu evler turuncu bg vurgulu) + 8 imza (dairesiz, eşit boyutlu vektör ikonlar).
- "Güneş–Ay karesi" (astrolojik olarak imkânsızdı) → **Ay–Yükselen karesi** (gerçek) ile düzeltildi.
- Mobil için font büyütme + ~155mm sütun. Parantez renklendirme. Em-dash temizliği.
- Upsell kartları mor + konstelasyon deseni; kapanıştan upsell kaldırıldı, son söz uzatıldı.

## 8. Sıradaki işler

- **Tasarım detay tweak'leri** (Deniz'in asıl yapacağı) — CSS/HTML.
- **Bölüm başlığı ikonları** hâlâ daire içinde + font glifi (`.section-head .sym .astro`). İstenirse imzalar
  gibi dairesiz + vektöre çevrilebilir (emoji-riskli sembol varsa vektör şart).
- **Veriyi parametrik yap:** `wheel_gen.py`/`diagram_gen.py` içindeki sabit Ayşe verisini JSON girdisinden
  okuyacak şekilde refactor et (ASC, gezegen boylamları, açılar, ev/element/nitelik). Sonra Swiss Ephemeris
  → JSON → SVG zinciri kurulur.
- Metinler şu an elle yazılı; gerçek üründe **blok kütüphanesi + Claude sentez promptu** üretecek (ayrı sistem).
- Frontend + ödeme + KVKK (ürün tarafı).

## 9. "Yapma" listesi (regresyon önleme)

- ❌ Burç/emoji-riskli sembolleri font glifiyle koyma → vektör path.
- ❌ SVG'ye `height:auto` bırakma → açık mm boyut.
- ❌ Tüm-HTML üzerinde parantez/em-dash gibi text-regex'i SVG'yi kapsayacak şekilde çalıştırma → sadece `<p>` hedefle, `<path>`'ı dışla.
- ❌ Em-dash (—) ekleme.
- ❌ Ev sistemini Tüm Burç'tan başka bir şeye, metinlerle senkronize etmeden değiştirme.
- ❌ Sabit-yükseklikli sayfalara (`.inner`/`.diag-inner`) 297mm'yi aşacak içerik koyma → ya kıs ya SVG küçült.
- ✅ Her değişiklikten sonra **hem tarayıcı hem weasyprint PDF** render'ını gözle kontrol et.

---

# FAZ 3 — Natal Hesap + İçerik Pipeline (gerçek doğum verisi)

> FAZ2 şablonunu gerçek doğum verisiyle besleyen matematik+içerik katmanı. `report/natal/` altında, **Python 3.12 venv** (`.venv`) içinde koşar. Sistemdeki 3.14'e dokunulmaz.

## ÖNEMLİ — Hesap motoru: pyswisseph DEĞİL, **skyfield**
pyswisseph'in PyPI'da Windows wheel'i yok; bu makinede MSVC derleyici/WSL de yok → kurulamadı (canlı kanıtlandı). Yerine **skyfield + JPL DE421** (pure-Python pip, eşdeğer arcsec hassasiyet). Yükselen, sidereal zaman + eğiklik formülüyle (`compute.py: ascendant_deg`); bağımsız geometrik yöntemle **tüm quadrant'larda Δ0.000°** doğrulandı (`_validate.py`). Zodyak **tropikal**, zaman dilimi **zoneinfo** (`tzdata` paketi şart), ev sistemi **Whole Sign**.
NOT: FAZ2 `wheel_gen`'deki Ayşe boylamları **illüstratifti** (gerçek astro.com değil) — gerçek hesap onlardan farklı çıkar; bu doğru/beklenen.

## Dosyalar (hepsi report/natal/, tek klasör — relatif yol)
- `compute.py` → birth → `chart.json` (§4 şema)
- `wheel_gen.py` / `diagram_gen.py` → chart.json → `wheel.svg` / `diagram.svg` (vektör glif; Windows'ta Segoe UI Symbol fallback)
- `icerik.json` (+ `FAZ3-ICERIK-BRIFI.md`) → imza tek-cümleleri + 4 mizaç + element-yorum (v1)
- `natal-rapor.html.j2` → Jinja2 şablon (yalnız hesaplanan alanlar)
- `render.py` → chart.json + icerik.json → `natal-rapor.out.html` → `out.pdf`
- `render.mjs` → headless Chrome ile HTML→PDF (weasyprint/GTK YOK; `npm i puppeteer-core`)
- `_validate.py` → motor (boylam + ASC quadrant) bağımsız doğrulama

## Çalıştır
```
.\.venv\Scripts\python report\natal\compute.py    # birth.json yoksa örnek Ayşe -> chart.json
.\.venv\Scripts\python report\natal\render.py      # -> out.pdf + onizleme.png
```
Gerçek veri için `report/natal/birth.json`: `{ "ad", "tarih":[y,m,d], "saat":[h,m], "il", "ilce", "lat", "lon" }`.

## Kapsam
Veri görselleri (çark, pozisyon tablosu, 12-ev, nitelik diyagramı, element barları, mizaç) + imzalar + element-yorum **GERÇEK veriyle**. Düz-yazı bölümler (8 bölüm gövdesi + İmza Sentezi paragrafı) **Faz 5'e dek FAZ2 placeholder'ı** kalır.
