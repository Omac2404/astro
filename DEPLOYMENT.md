# Gökname — Kurulum & Dağıtım (VPS)

Kişiye özel astroloji analizi e-ticaret sitesi. **Next.js 16** (App Router) ön yüz/API + **Python** (skyfield) & **headless Chrome** ile PDF rapor üretim pipeline'ı.

> ⚠️ **Serverless'ta (Vercel/Netlify) ÇALIŞMAZ.** Rapor üretimi sunucuda `child_process` ile Python + Node + Chrome çalıştırır. **VPS / kendi sunucun gerekir.**

---

## 1. Sistem gereksinimleri

- **Node.js 20+** (önerilen 22)
- **Python 3.12** (rapor hesap motoru için)
- **Google Chrome / Chromium** (PDF render — puppeteer-core sistemdeki Chrome'u sürer)
- Linux VPS (Ubuntu 22.04+ önerilir)

```bash
# Chrome (Ubuntu örneği)
sudo apt-get install -y fonts-noto-core fonts-noto-cjk   # Türkçe + sembol fontları
# Google Chrome stable kur (resmi depo) veya chromium-browser
```

---

## 2. Kurulum

```bash
git clone https://github.com/Webreta/astro.git
cd astro

# 1) Node bağımlılıkları
npm install

# 2) Python sanal ortam + bağımlılıklar (rapor motoru)
python3.12 -m venv .venv
.venv/bin/pip install -r report/natal/requirements.txt
#   (Windows'ta: .venv\Scripts\pip install -r report\natal\requirements.txt)
```

### Chrome yolu
`report/natal/render.mjs` ve görsel testler Chrome'u `C:\Program Files\Google\Chrome\Application\chrome.exe` (Windows) yolundan arar. **Linux'ta** bu yolu sunucudaki Chrome/Chromium yoluna göre güncelle (ör. `/usr/bin/google-chrome`).

---

## 3. Ortam değişkenleri — `.env.local`

Proje kökünde `.env.local` oluştur:

```
ANTHROPIC_API_KEY=sk-ant-...
```

- Rapor sentezi **Claude Opus** ile yapılır; bu anahtar zorunludur.
- `.env.local` **git'e dahil değildir** (`.gitignore`). Sunucuda elle oluştur.

---

## 4. Build & çalıştırma

```bash
npm run build
npm start            # production (port 3000)
# Süreklilik için: pm2 start npm --name gokname -- start
```

Önüne **Nginx** reverse proxy + HTTPS (Let's Encrypt) koy. SEO için site adresini admin panelden gerçek domain olarak ayarla.

---

## 5. Kalıcı veri — `.data/`

- Tüm uygulama verisi `repo/.data/*.json` içinde tutulur: üyeler, adminler, siparişler, raporlar, hediye kodları, ayarlar (SMTP/PayTR/SEO/genel) ve `.data/files/` (PDF'ler).
- **`.data/` git'e dahil DEĞİLDİR** (üye e-postaları, scrypt şifre hash'leri, PII içerir).
- İlk çalıştırmada otomatik oluşur. **Düzenli yedekle** (örn. günlük `.data/` snapshot).
- İleride gerçek DB'ye taşınabilir; arayüz `src/lib/db.ts`.

---

## 6. İlk giriş — süper admin

- Süper admin ilk çalıştırmada otomatik seed edilir:
  - **E-posta:** `webreta.digital@gmail.com`
  - **Şifre:** `Webreta.2331`
- Panel: `/admin/giris`
- 🔐 **Canlıya alır almaz şifreyi değiştir** (admin → şifre sıfırlama akışı).

---

## 7. Admin panelden yapılandırılacaklar (`/admin/ayarlar`)

| Sekme | Ne yapılır |
|---|---|
| **Genel Ayarlar** | API maliyeti, sanal POS oranı, **bakım modu**, anasayfa hero, SSS, iletişim bilgileri |
| **SMTP Ayarları** | E-posta gönderimi (host/port/kullanıcı/şifre) + Test E-postası |
| **E-posta Bildirimleri** | Hangi olayda mail gider (üyelik, sipariş, şifre, fatura…) — tek tek aç/kapa |
| **Sanal POS** | PayTR mağaza bilgileri + **Başvuru Modu** (aşağıda) |
| **Yasal Sayfalar** | Mesafeli satış, KVKK, iade, kullanım koşulları vb. — `[Şirket Unvanı]/[Adres]/[Telefon]` yer tutucularını doldur |
| **SEO ve Sitemap** | Site adresi, favicon, sayfa meta'ları, sitemap.xml/robots.txt, `<head>`/`<body>` kod ekleme (Analytics/Search Console) |

### PayTR başvuru modu
Sanal POS sekmesinde **Başvuru Modu**'nu açarsan: ödeme akışı görünür ama "Ödemeyi Tamamla"da *"Sanal pos bağlantısı bekleniyor"* uyarısı verir, sipariş oluşmaz. **PayTR başvurusu sırasında açık tut**; onay + mağaza bilgileri gelince kapat, gerçek tahsilat başlar. Callback URL: `https://<domain>/api/paytr/callback`.

---

## 8. Rapor üretim pipeline'ı (özet)

`src/lib/pipeline.ts` → `report/natal/` altındaki zinciri `child_process` ile koşar:

```
birth.json → compute(.py / _karmik / _sr / _sinastri) → selectBlocks.mjs
          → synthesize-real.mjs <ürün> (Opus) → render.py <ürün> → out.pdf
```

- Üretimler **tek sıralı kuyrukta** çalışır (paylaşılan dosya çakışmasını önler) → normalde 1 rapor birkaç dakika. Yüksek eşzamanlı yükte sıra uzar (çökmez).
- Geçici API/ağ hatalarında **otomatik 3 deneme**; yine olmazsa rapor "bekliyor"a döner, admin'e uyarı maili gider, müşteri "Tekrar dene" görür.
- Desteklenen ürünler: natal, ask, kariyer, saglik, solar (gizli), lilith, sinastri-sevgili, sinastri-arkadas.

---

## 9. Notlar

- `görseller/` (kaynak görseller) ve `output/` git'e dahil değildir; sitenin kullandığı görseller `public/gorsel/` ve `public/ornekler/` altındadır (commit'li).
- Gerçek üyeler korunmalı; `.data/` asla toptan silinmez.
- Tasarım/kararlar için `CLAUDE.md` ve `AGENTS.md` dosyalarına bak.
