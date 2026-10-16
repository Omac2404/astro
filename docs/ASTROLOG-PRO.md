# Astrolog Pro — Devir Notu

> Astrologlara jetonla satılan profesyonel rapor sistemi (B2B). Bu not, işi devralan kişinin
> (ve onun Claude Code oturumunun) kaldığı yerden devam edebilmesi için yazıldı.
> Son güncelleme: 16 Ekim 2026.

## 1. Ürün özeti

- **Kim için:** Danışanlarına hizmet veren astrologlar. Site ücretsiz rapor verir; Pro sistemi ayrı, ücretli bir B2B ürünüdür.
- **İş modeli:** 1 jeton = 1 Pro rapor (Sinastri 2 jeton). Satış manuel: astrolog WhatsApp/e-posta ile yazar,
  admin hesabını açar ve jeton yükler. Online ödeme yok.
- **Paketler (Deniz kararı):** 5 jeton 2.500 ₺ · 10+1 jeton 5.000 ₺ · 20+3 jeton 10.000 ₺; "daha fazla jeton isteyen belirtsin".
  Admin → Astrolog Pro → Pro ayarları'ndan girilir (kodda sadece varsayılan var).
- **Her rapor iki PDF:** ~30 sayfalık **ana rapor** + 4-5 sayfalık **Seans Kılavuzu** (ana rapora sayfa atıflı yol haritası).
- **Saklama:** Pro raporlar 365 gün panelde (admin'den değişir). Başarısız üretimde jeton otomatik iade.

### 8 rapor türü (`src/lib/db.ts` → `PRO_URUNLER`)
| slug | Ürün | Jeton | Özel olan |
|---|---|---|---|
| natal | Natal Pro Rapor | 1 | Tam natal: çekirdek, yönetici/dispozitör, gezegenler, 12 ev, açılar, karmik, yaşam alanları |
| ask | Aşk & İlişki Pro | 1 | Venüs–Mars, 5/7/8. ev, bağlanma kalıpları, partner profili |
| kariyer | Kariyer & Para Pro | 1 | MC zinciri, 10/6/2. ev, yetenekler, uygun meslekler |
| saglik | Enerji & Mizaç Pro | 1 | Klasik mizaç, canlılık, stres, yaşam ritmi (tıbbi tanı yok) |
| lilith | Lilith & Karmik Pro | 1 | Düğümler, Lilith, Kiron, Satürn/Plüton, karmik noktalar tablosu |
| solar | Solar Return Pro | 1 | SR haritası, profeksiyon (yılın lordu), Güneş takvimi; yer değiştirmeli SR |
| sinastri | Sinastri Pro | 2 | Çift çark, çapraz açılar, ev bindirmeleri, kompozit; ilişki türü seçimi |
| aylik | Aylık Dönem Pro | 1 | 30 gün: hızlı+yavaş transitler, lunasyonlar, istasyonlar, Ay takvimi |

Hepsi aynı şablonda: **seans rehberi en başta**, her bölümde ve her grafiğin altında **"Astrolog Önerisi"** kutuları
(astroloğun danışana kelimesi kelimesine söyleyebileceği cümleler), danışan soruları, yaşam olayları, zamanlama.

## 2. Mimari (üretim hattı)

```
Panel formu → POST /api/pro/raporlar → proRaporBaslat (jeton düş + kayıt) → after(runProGeneration)
  src/lib/pipeline-pro.ts (kendi kuyruğu, ProAyar.eszaman)
    1. report/natal/compute_pro.py      birth-pro.json → chart-pro.json
         build() natal çekirdek · urun_odagi() odak · build_solar / build_sinastri / build_aylik
    2. report/natal/synthesize-pro.mjs  chart-pro.json → rapor-pro.json (Claude, bölüm bölüm paralel, prompt cache)
         URUN_BILGI / DERIN (ürüne özel bölümler) · ORTAK_SON (zaman, olaylar, sorular, seans) · VERI (grafik yorumları)
    3. report/natal/render_pro.py       → pro-rapor.html.j2 → render-pro.mjs (Chrome) → pro.pdf
         pro_svg.py: çark / çift çark / transit çizelgesi / yarıküre (tüm glifler vektör path)
         veri_sayfalari_solar / _sinastri / _aylik · odak_html (aşk/kariyer/sağlık/karmik)
    4. Seans Kılavuzu (hata olursa ana rapor yine teslim edilir):
         kilavuz_pro.py metin  → pro.pdf'ten sayfa sayfa metin (sayfalar.json)
         synthesize-kilavuz.mjs → kilavuz.json (yalnız gerçekten geçen sayfaya atıf: "(→ s. 15)")
         kilavuz_pro.py render → kilavuz.html.j2 → kilavuz.pdf
  → saveFile(pro.pdf) = ProReport.dosya · saveFile(kilavuz.pdf) = ProReport.kilavuz · maliyet kaydı
  Başarısızlık → proRaporBasarisiz (jeton iadesi + admin maili)
```

### Önemli dosyalar
| Dosya | Ne |
|---|---|
| `src/lib/db.ts` (sondaki "Astrolog Pro" bölümü) | ProUrun, ProReport, jeton defteri, ProAyar (model, effort, paketler, sayfaAcik, form sınırları) |
| `src/lib/pipeline-pro.ts` | Üretim hattı, kuyruk, kılavuz adımı, yarıda kalanları kurtarma |
| `src/app/api/pro/raporlar/route.ts` | Astrolog API: liste / oluştur (alan doğrulama, sınırlar) / sil |
| `src/app/api/admin/astrolog-pro/route.ts` | Admin API: hesap aç, jeton işle, ayarlar |
| `src/components/astrolog-panel.tsx` | Astrolog paneli (/hesabim, rol=astrolog ise) + yeni rapor formu |
| `src/app/admin/astrolog-pro/page.tsx` | Admin sayfası: hesaplar, jeton, raporlar + maliyet, Pro ayarları |
| `src/app/astrolog-musunuz/page.tsx` | Satış sayfası (hero, galeri, flipbook, karşılaştırma, paketler) |
| `src/components/flipbook.tsx` | Örnek rapor flipbook'u (page-flip) |
| `src/prompts/pro-natal.md` | Ana rapor sistem promptu (tüm ürünler; ürün tarifi ayrıca eklenir) |
| `src/prompts/pro-kilavuz.md` | Seans Kılavuzu promptu |
| `public/ornekler/natal-pro/` | Örnek rapor (hayali "Defne Arslan"): PDF, sayfa görselleri, örnek kılavuz |
| `public/gorsel/pro/` | Satış sayfası görselleri (hayali "Elif" raporundan sayfalar) |

## 3. Kararlar (değiştirmeden önce sor)

- **Model:** `claude-opus-5-5`, effort `medium`. Fable 5.1 test edildi: içerik neredeyse aynı, maliyet ~2,5 kat → Opus'ta kalındı.
  Admin'den değiştirilebilir (ProAyar.model).
- **Uzunluk:** ana rapor ~30 sayfa (yorum ~6.000-6.500 kelime). İlk sürüm 53 sayfaydı, Deniz 30'a indirtti.
- **Sıra:** Seans Hazırlığı (rehber, özet, sorular) → Harita Verisi → Derin Yorum → Zamanlama → Yaşam Olayları.
- **Seans Kılavuzu ayrı PDF** (ana rapora eklenmez). Deniz'in tarifi; bir astroloğun önerisi.
- **Ev sistemi Tüm Burç (Whole Sign)**, tropikal zodyak, motor skyfield + JPL DE421 (pyswisseph değil).
- **Yazım:** uzun tire (—) yok; teknik dayanak parantez içinde; kehanet/tıbbi teşhis yok.
- **Görünürlük:** "Astrolog musunuz?" sayfası admin anahtarıyla (Pro ayarları → "sayfayı sitede göster") açılır;
  kapalıyken yalnız admin + astrolog hesapları görür, header'da "Astrologlar için" butonu çıkmaz, sitemap dışı.
- **Satış sayfası rakamları:** `.rakam` sınıfı (Spectral, hizalı rakam); Cormorant'ın eski stil rakamları kullanılmaz.

## 4. Maliyet (Opus 5.5, ölçülen)
| Rapor | Sayfa | Ana rapor | + Kılavuz |
|---|---|---|---|
| Natal | 34 | ~$1,03 | ~$0,35 |
| Aşk / Kariyer / Enerji / Karmik | 29-33 | $0,81-0,87 | ~$0,35 |
| Solar Return | 32 | ~$0,92 | ~$0,35 |
| Sinastri | 35 | ~$1,05 | ~$0,35 (toplam $1,40 ölçüldü) |
| Aylık | 28 | ~$0,86 | ~$0,35 |

Her raporun gerçek maliyeti admin → Astrolog Pro → Pro raporlar tablosunda görünür.

## 5. Yerel kurulum ve test

```bash
npm install
py -3.12 -m venv .venv                                   # Windows (Linux/mac: python3.12 -m venv .venv)
.venv\Scripts\python -m pip install -r report/natal/requirements.txt
# .env.local -> ANTHROPIC_API_KEY=... (repoda YOK; ayrıca iletilir)
npx next dev -p 3100
```
- Sistemde Chrome kurulu olmalı (PDF render). Prod: Docker (`Dockerfile`), venv `/opt/venv`, EasyPanel, kaynak Omac2404/astro `master`.
- `.data/` (JSON veritabanı) repoda yok. Yerelde admin girişi → Admin → Astrolog Pro → test astrolog hesabı aç + jeton yükle.
- **API'siz hızlı test** (tek rapor, panel olmadan):
  ```bash
  # birth-pro.json örneği: report/natal/jobs/<klasör>/birth-pro.json  ("urun": natal|ask|kariyer|saglik|lilith|solar|sinastri|aylik)
  NATAL_IO=report/natal/jobs/x .venv/Scripts/python report/natal/compute_pro.py
  NATAL_IO=report/natal/jobs/x node report/natal/synthesize-pro.mjs          # API maliyeti ~$1
  NATAL_IO=report/natal/jobs/x .venv/Scripts/python report/natal/render_pro.py
  ```
  `synthesize-pro.mjs --baglam` modele gidecek bağlamı API çağırmadan yazdırır; `--sadece ozet,seans` yalnız seçili bölümleri üretir.
- Doğrulama: `npx tsc --noEmit -p .` ve `npx eslint <dosyalar>` (site-header.tsx'teki 2 lint hatası eskiden kalma).

## 6. Sıradaki işler
1. **Deniz'in UI/UX iyileştirmeleri:** satış sayfası (`/astrolog-musunuz`) ve astrolog paneli (`astrolog-panel.tsx`).
2. Panel iyileştikten sonra **panel ekran görüntüleri** satış sayfasına eklenecek.
3. Canlıda Pro ayarları'ndan paketlerin (5 / 10+1 / 20+3) ve WhatsApp/e-posta bilgisinin girilmesi; hazır olunca sayfa anahtarının açılması.

## 7. Bilinen notlar
- `src/lib/db.ts` içinde süper admin şifresi düz metin olarak duruyor (eski kod) → ortam değişkenine taşınmalı.
- `.data` JSON dosyalarında kilit yok; jeton işlemleri senkron yazıldığı için tek süreçte yarış oluşmaz.
- Yarıda kalan üretimler (sunucu restart) okuma uçlarında otomatik "hata + jeton iadesi"ne çevrilir (`proKurtar`).
