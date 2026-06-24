// Gerçek (dosya tabanlı) veri deposu — sunucu tarafı. .data/*.json içinde kalıcı.
// İleride gerçek DB'ye (Postgres/SQLite) taşınabilir; arayüz aynı kalır.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PRODUCTS } from "@/lib/products";

const DIR = path.join(process.cwd(), ".data");

function ensure() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}
function read<T>(file: string, fallback: T): T {
  ensure();
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}
function write(file: string, data: unknown) {
  ensure();
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(data, null, 2));
}

// ---- Şifre hash (scrypt) ----
export function hashPw(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPw(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(h, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Üyeler ----
export type FaturaBilgi = {
  ad: string; email: string; tel?: string;
  yurtdisi?: boolean;        // true: ülke/şehir serbest metin; false/undefined: il (dropdown)/ilçe
  il?: string; ilce?: string;        // Türkiye
  ulke?: string; sehir?: string;     // yurtdışı
  acikAdres?: string;        // mahalle/cadde/no/daire
  adres?: string;            // ESKİ kayıtlar (tek satır) — geriye uyumlu, salt görüntü
};

// Fatura adresini görüntü için tek satıra dönüştürür (yapısal alanlar; yoksa eski 'adres').
export function faturaAdres(f?: Partial<FaturaBilgi> | null): string {
  if (!f) return "";
  const parts = f.yurtdisi ? [f.acikAdres, f.sehir, f.ulke] : [f.acikAdres, f.ilce, f.il];
  const s = parts.map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
  return s || String(f.adres ?? "").trim();
}
export type Member = { id: string; email: string; sifre: string; kayit: string; fatura?: FaturaBilgi };

export function getMembers(): Member[] {
  return read<Member[]>("members.json", []);
}
export function findMember(email: string): Member | undefined {
  return getMembers().find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
}
export function addMember(email: string, pw: string): { error?: string; member?: Member } {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Geçerli bir e-posta gir." };
  if (pw.length < 6) return { error: "Şifre en az 6 karakter olmalı." };
  if (findMember(e)) return { error: "Bu e-posta zaten kayıtlı." };
  const member: Member = { id: "U-" + crypto.randomBytes(3).toString("hex"), email: e, sifre: hashPw(pw), kayit: new Date().toISOString() };
  write("members.json", [...getMembers(), member]);
  return { member };
}
export function setMemberPassword(email: string, pw: string): boolean {
  const list = getMembers();
  const i = list.findIndex((m) => m.email.toLowerCase() === email.trim().toLowerCase());
  if (i < 0) return false;
  list[i] = { ...list[i], sifre: hashPw(pw) };
  write("members.json", list);
  return true;
}
export function getMemberFatura(email: string): FaturaBilgi | undefined {
  return findMember(email)?.fatura;
}
export function setMemberFatura(email: string, fatura: FaturaBilgi): boolean {
  const list = getMembers();
  const i = list.findIndex((m) => m.email.toLowerCase() === email.trim().toLowerCase());
  if (i < 0) return false;
  list[i] = { ...list[i], fatura };
  write("members.json", list);
  return true;
}
// Hesap silme (KVKK talebi): üye + raporları + siparişleri + sahip olduğu hediye kodları + oturumları
export function deleteMember(email: string): boolean {
  const e = email.trim().toLowerCase();
  const members = getMembers();
  if (!members.some((m) => m.email.toLowerCase() === e)) return false;

  // Bu üyenin dosyaları (rapor PDF + fatura PDF) — silinebilir adaylar
  const adayDosyalar = [
    ...getReports().filter((r) => r.email.toLowerCase() === e).map((r) => r.dosya),
    ...getOrders().filter((o) => o.email.toLowerCase() === e).map((o) => o.faturaDosya),
  ].filter(Boolean) as string[];

  // Kayıtları sil (üye + raporları + siparişleri + sahip olduğu hediye kodları + oturumlar)
  write("members.json", members.filter((m) => m.email.toLowerCase() !== e));
  const kalanRapor = getReports().filter((r) => r.email.toLowerCase() !== e);
  const kalanSiparis = getOrders().filter((o) => o.email.toLowerCase() !== e);
  write("reports.json", kalanRapor);
  write("orders.json", kalanSiparis);
  write("giftcodes.json", getGiftCodes().filter((g) => g.sahip.toLowerCase() !== e));
  const sess = read<Record<string, { email: string }>>("sessions.json", {});
  for (const k of Object.keys(sess)) if ((sess[k].email || "").toLowerCase() === e) delete sess[k];
  write("sessions.json", sess);

  // Başka kayıt kullanmıyorsa öksüz PDF dosyalarını sil
  const halaKullanilan = new Set([
    ...kalanRapor.map((r) => r.dosya),
    ...kalanSiparis.map((o) => o.faturaDosya),
    ...getGenReports().map((g) => g.dosya),
  ].filter(Boolean) as string[]);
  for (const f of adayDosyalar) if (!halaKullanilan.has(f)) deleteFile(f);

  return true;
}

// ---- Adminler ----
export type Admin = { email: string; sifre: string; super: boolean; ad: string };

const SUPER_EMAIL = "webreta.digital@gmail.com";

export function getAdmins(): Admin[] {
  let list = read<Admin[]>("admins.json", []);
  if (!list.some((a) => a.email.toLowerCase() === SUPER_EMAIL)) {
    const seed: Admin = { email: SUPER_EMAIL, sifre: hashPw("Webreta.2331"), super: true, ad: "Süper Admin" };
    list = [seed, ...list];
    write("admins.json", list);
  }
  return list;
}
export function findAdmin(email: string): Admin | undefined {
  return getAdmins().find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
}
export function addAdmin(ad: string, email: string, pw: string): { error?: string } {
  const e = email.trim().toLowerCase();
  if (!ad.trim()) return { error: "Ad gerekli." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Geçerli bir e-posta gir." };
  if (pw.length < 6) return { error: "Şifre en az 6 karakter olmalı." };
  if (findAdmin(e)) return { error: "Bu e-posta zaten admin." };
  write("admins.json", [...getAdmins(), { ad: ad.trim(), email: e, sifre: hashPw(pw), super: false }]);
  return {};
}
export function removeAdmin(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (e === SUPER_EMAIL) return false;
  write("admins.json", getAdmins().filter((a) => a.email.toLowerCase() !== e));
  return true;
}
export function setAdminPassword(email: string, pw: string): boolean {
  const list = getAdmins();
  const i = list.findIndex((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (i < 0) return false;
  list[i] = { ...list[i], sifre: hashPw(pw) };
  write("admins.json", list);
  return true;
}

// ---- SMTP / e-posta ayarları ----
// Hangi olayda e-posta gönderilsin? (tek tek aç/kapa)
export type BildirimKey =
  | "uyeKayit"         // müşteri üye olunca → hoşgeldin maili
  | "siparisMusteri"   // müşteri sipariş verince → müşteriye onay maili
  | "siparisAdmin"     // müşteri sipariş verince → admine bildirim
  | "sifreKodu"        // müşteri şifre değiştirince → doğrulama kodu
  | "hediyeKodu"       // admin müşteriye hediye kodu tanımlayınca → müşteriye
  | "raporIletildi"    // admin müşteriye rapor iletince → müşteriye
  | "faturaEklendi"    // admin siparişe fatura ekleyince → müşteriye (fatura ekli)
  | "iletisimForm";    // iletişim formu doldurulunca → iletişim adresine
export const BILDIRIM_KEYS: BildirimKey[] = ["uyeKayit", "siparisMusteri", "siparisAdmin", "sifreKodu", "hediyeKodu", "raporIletildi", "faturaEklendi", "iletisimForm"];
export const BILDIRIM_DEFAULT: Record<BildirimKey, boolean> = {
  uyeKayit: true, siparisMusteri: true, siparisAdmin: true, sifreKodu: true, hediyeKodu: true, raporIletildi: true, faturaEklendi: true, iletisimForm: true,
};

export type SmtpConfig = {
  aktif: boolean;
  host: string;
  port: number;
  sifreleme: "ssl" | "tls" | "yok";
  auth: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  forceFrom: boolean;
  sslDogrulama: boolean; // false = sertifika doğrulamasını atla
  adminEmail: string;    // admin bildirimleri (yeni sipariş vb.) bu adrese düşer
  iletisimEmail: string; // iletişim formu mesajları bu adrese düşer
  bildirimler: Record<BildirimKey, boolean>; // olay bazlı aç/kapa
};
const SMTP_DEFAULT: SmtpConfig = {
  aktif: false, host: "", port: 465, sifreleme: "ssl", auth: true,
  username: "", password: "", fromEmail: "", fromName: "", forceFrom: false, sslDogrulama: true,
  adminEmail: "", iletisimEmail: "", bildirimler: { ...BILDIRIM_DEFAULT },
};
export function getSmtp(): SmtpConfig {
  const stored = read<Partial<SmtpConfig>>("smtp.json", {});
  return { ...SMTP_DEFAULT, ...stored, bildirimler: { ...BILDIRIM_DEFAULT, ...(stored.bildirimler ?? {}) } };
}
export function setSmtp(patch: Partial<SmtpConfig>): SmtpConfig {
  const cur = getSmtp();
  const next = { ...cur, ...patch };
  if (patch.bildirimler) next.bildirimler = { ...cur.bildirimler, ...patch.bildirimler };
  write("smtp.json", next);
  return next;
}
// Olay bildirimi açık mı? (varsayılan açık)
export function bildirimAcik(key: BildirimKey): boolean {
  return getSmtp().bildirimler[key] !== false;
}

// ---- Genel ayarlar (maliyet/oran + bakım modu + SSS) ----
// Cevap metninde **...** ile vurgu yapılır; btnText+btnHref doluysa metin sonunda buton görünür.
export type SssItem = { q: string; a: string; btnText?: string; btnHref?: string };
const SSS_DEFAULT: SssItem[] = [
  { q: "Analizler gerçekten kişiye özel mi?", a: "Evet. **Şablon metin kullanmıyoruz.** Doğduğun anın gökyüzü gerçek astronomik veriyle hesaplanır ve tam senin haritana özel, akıcı bir okuma sentezlenir." },
  { q: "Hangi astroloji sistemini kullanıyorsunuz?", a: "Tropikal zodyak ve **gerçek astronomik hesap** kullanıyoruz; gezegen konumların doğduğun anın gökyüzünden tam isabetle çıkarılır. Ev sisteminde Tüm Burç (Whole Sign) yöntemini esas alırız." },
  { q: "Doğum saatimi tam bilmiyorum, yine de alabilir miyim?", a: "Alabilirsin. Ancak yükselen burç ve ev yerleşimleri doğum saatine bağlıdır; saat ne kadar net olursa rapor o kadar isabetli olur. Saatini bilmiyorsan da gezegen burçları ve genel okuma anlamlıdır." },
  { q: "Yurt dışında doğdum, yine de alabilir miyim?", a: "Tabii. **Dünyanın her yerindeki doğum yerleri** desteklenir; şehir ile ülkeyi girmen yeterli, saat dilimi ve koordinatlar otomatik hesaplanır." },
  { q: "Raporu ne zaman alırım?", a: "Doğum bilgilerini girdikten sonra raporun kısa bir sürede hazırlanır. Hazır olunca sana e-posta ile haber veririz. Analizi e-postada göndermeyiz; hesabına giriş yapıp orada görüntüler ve indirirsin." },
  { q: "Raporu nasıl ve nereden görüntülerim?", a: "Tüm analizlerin hesabındaki “Hesabım” sayfasında listelenir. Hazır olan raporu oradan istediğin zaman okuyabilir ve PDF olarak indirebilirsin." },
  { q: "Önce satın almadan örnek görebilir miyim?", a: "Evet. Her analizin “Örnek Analizler” sayfasında gerçek örnekleri var.", btnText: "Örnekleri İncele", btnHref: "/ornekler" },
  { q: "Ödeme bilgilerim güvende mi?", a: "Evet. Ödemeler **güvenli sanal pos altyapısı** üzerinden alınır; kart bilgilerin bizim sunucularımızda saklanmaz, doğrudan banka altyapısında işlenir." },
  { q: "Raporu beğenmezsem iade alabilir miyim?", a: "Her analiz **tamamen sana özel üretildiği** için hazırlandıktan sonra iade yapılamaz. Yine de bir sorun yaşarsan bizimle iletişime geç; çözüm bulmak için elimizden geleni yaparız.", btnText: "Bize Ulaş", btnHref: "/iletisim" },
  { q: "Başkasına hediye edebilir miyim?", a: "Evet. Ürün sayfasında “Hediye Olarak Al” ile satın alırsan bir hediye kodu verilir. Bu kodu sevdiğine iletirsin; o da sisteme üye olup hesabından kodu girerek analizini açar." },
  { q: "Bu bir kehanet mi?", a: "Hayır. **Kesin gelecek iddiası kurmuyoruz.** Analizler eğilim, potansiyel ve farkındalık dilinde; seni tanımana ve yolunu daha bilinçli kurmana yardımcı olacak içgörüler sunar." },
  { q: "Sağlık analizi tıbbi tavsiye mi?", a: "Hayır. Sağlık & Enerji analizi mizaç, element dengesi ve enerji tarzı üzerine bir denge rehberidir; **tıbbi teşhis ya da tedavi yerine geçmez.** Ciddi şikâyetlerde mutlaka bir uzmana başvurmalısın." },
];

// Anasayfa hero (başlıkta **...** = altın vurgu)
export type HeroAyar = {
  baslik: string; altMetin: string;
  rozet: string; fiyatMetin: string; eskiFiyat: string; yeniFiyat: string;
  btn1Metin: string; btn1Link: string; btn2Metin: string; btn2Link: string;
};
const HERO_DEFAULT: HeroAyar = {
  baslik: "Sana, **seni anlatalım.**",
  altMetin: "Gerçek gökyüzü hesabına dayalı, tamamen sana özel hazırlanan astroloji analizleri. Doğum haritandan aşka, kariyere, karmik yolculuğuna.",
  rozet: "Lansmana özel",
  fiyatMetin: "Tüm analizler kısa süreliğine",
  eskiFiyat: "249 ₺",
  yeniFiyat: "99 ₺",
  btn1Metin: "Analizleri Keşfet", btn1Link: "/analizler",
  btn2Metin: "Örnekler", btn2Link: "/ornekler",
};

// İletişim sayfasında gösterilen bilgiler
export type IletisimAyar = { eposta: string; telefon: string; adres: string; instagram: string; x: string; tiktok: string; instagramAktif: boolean; xAktif: boolean; tiktokAktif: boolean };
const ILETISIM_DEFAULT: IletisimAyar = { eposta: "destek@gokname.com", telefon: "", adres: "", instagram: "", x: "", tiktok: "", instagramAktif: false, xAktif: false, tiktokAktif: false };

// Yasal sayfalar (footer + /yasal/[slug]). icerik: ## başlık + boş satır = paragraf.
export type YasalSayfa = { slug: string; baslik: string; icerik: string };
const YASAL_DEFAULT: YasalSayfa[] = [
  {
    slug: "mesafeli-satis",
    baslik: "Mesafeli Satış Sözleşmesi",
    icerik: `## 1. Taraflar
İşbu Mesafeli Satış Sözleşmesi, bir tarafta [Şirket Unvanı] ("Satıcı") ile diğer tarafta gokname.com üzerinden sipariş veren müşteri ("Alıcı") arasında, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde, aşağıdaki koşullarla elektronik ortamda kurulmuştur.

## 2. Konu
İşbu sözleşmenin konusu, Alıcı'nın Satıcı'ya ait gokname.com sitesinden elektronik ortamda siparişini verdiği, aşağıda nitelikleri ve satış fiyatı belirtilen dijital astroloji analiz raporunun (PDF) satışı ve teslimine ilişkin olarak tarafların hak ve yükümlülüklerinin belirlenmesidir. Alıcı, satışa konu ürünün temel nitelikleri, satış fiyatı, ödeme şekli ve teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini kabul eder.

## 3. Ürünün Niteliği ve Teslimi
Sunulan hizmet, Alıcı'nın sağladığı doğum bilgileri (tarih, saat, yer) esas alınarak gerçek astronomik hesaplarla üretilen, kişiye özel hazırlanmış dijital bir PDF rapordur. Ürün fiziksel olarak teslim edilmez; Alıcı doğum bilgilerini girdikten sonra rapor hazırlanır ve Alıcı'nın hesabındaki "Analizlerim" alanına tanımlanır. Rapor hazır olduğunda Alıcı'ya e-posta ile bilgi verilir. Analiz, e-posta ekinde gönderilmez; yalnızca hesap üzerinden görüntülenir ve indirilir.

## 4. Bedel ve Ödeme
Ürün bedeli, sipariş anında sitede gösterilen ve Alıcı tarafından onaylanan, KDV dahil tutardır. Ödemeler güvenli sanal pos altyapısı üzerinden tek seferde tahsil edilir; kart bilgileri Satıcı sunucularında saklanmaz, doğrudan banka/ödeme kuruluşu altyapısında işlenir. Ödeme onaylanmadan sipariş tamamlanmış sayılmaz.

## 5. Cayma Hakkı
Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca, elektronik ortamda anında ifa edilen hizmetler ile Alıcı'ya anında teslim edilen ve kişiye özel olarak hazırlanan gayrimaddi (dijital) içeriklere ilişkin sözleşmelerde cayma hakkı kullanılamaz. Gökname analizleri Alıcı'nın doğum bilgilerine göre özel olarak üretildiğinden ve üretimine Alıcı'nın onayıyla başlandığından, bu kapsamda cayma hakkı bulunmamaktadır. Ayrıntılar İptal, İade ve Cayma Hakkı sayfasında yer alır.

## 6. Tarafların Yükümlülükleri
Alıcı, doğum bilgilerini doğru ve eksiksiz girmekle yükümlüdür; yanlış bilgi nedeniyle oluşan isabetsizlikten Satıcı sorumlu tutulamaz. Satıcı, siparişi konusu hizmeti zamanında ve niteliğine uygun olarak sunmakla yükümlüdür.

## 7. Mücbir Sebep
Tarafların kontrolü dışında gelişen, makul önlemlerle önlenemeyen olaylar (doğal afet, altyapı/iletişim kesintileri, hizmet sağlayıcı arızaları vb.) nedeniyle yükümlülüklerin yerine getirilememesi mücbir sebep sayılır ve bu süre boyunca taraflar sorumlu tutulamaz.

## 8. Uyuşmazlıkların Çözümü
İşbu sözleşmeden doğabilecek uyuşmazlıklarda, Ticaret Bakanlığı'nca ilan edilen parasal sınırlar dahilinde Alıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir. Alıcı, şikâyet ve taleplerini destek@gokname.com adresine iletebilir.`,
  },
  {
    slug: "on-bilgilendirme",
    baslik: "Ön Bilgilendirme Formu",
    icerik: `## Satıcı Bilgileri
Unvan: [Şirket Unvanı]
Adres: [Adres]
E-posta: destek@gokname.com
Telefon: [Telefon]

## Sözleşme Konusu Ürün/Hizmet
gokname.com üzerinden sunulan ürünler, kişinin doğum bilgilerine (tarih, saat, yer) göre gerçek astronomik hesaplarla üretilen, kişiye özel dijital astroloji analiz raporlarıdır (PDF). Her ürünün adı, kapsamı ve güncel satış fiyatı ilgili ürün sayfasında belirtilir. Ürün dijitaldir; fiziksel kargo/teslimat yapılmaz.

## Fiyat ve Ödeme
Sitede belirtilen tüm fiyatlara KDV dahildir. Ödeme, sipariş sırasında güvenli sanal pos altyapısıyla tek seferde tahsil edilir. Kart bilgileri Satıcı tarafından saklanmaz.

## Teslimat Şekli ve Süresi
Alıcı, satın alma sonrası hesabındaki "Analizlerim" alanından doğum bilgilerini girer; rapor kısa süre içinde otomatik olarak hazırlanır ve hesabına tanımlanır. Hazır olduğunda Alıcı'ya e-posta ile bilgi verilir.

## Cayma Hakkı
Kişiye özel olarak hazırlanan ve ifasına Alıcı'nın onayıyla başlanan dijital içeriklerde, Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi gereği cayma hakkı bulunmamaktadır. Alıcı, siparişi onaylayarak bu durumu kabul etmiş sayılır.

## Şikâyet ve İtiraz Başvuruları
Talep ve şikâyetlerinizi destek@gokname.com adresine iletebilirsiniz. Çözümlenemeyen uyuşmazlıklarda, ilgili parasal sınırlar dahilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.`,
  },
  {
    slug: "gizlilik",
    baslik: "Gizlilik ve KVKK Aydınlatma Metni",
    icerik: `## Veri Sorumlusu
Kişisel verileriniz, veri sorumlusu sıfatıyla [Şirket Unvanı] ("Gökname") tarafından 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında, aşağıda açıklanan amaç ve sınırlar dahilinde işlenmektedir.

## İşlenen Kişisel Veriler
- Hesap bilgileri: e-posta adresiniz ve şifreniz (şifreler geri döndürülemez biçimde, özetlenerek/şifrelenerek saklanır).
- Sipariş ve fatura bilgileri: ad-soyad, e-posta, telefon ve fatura adresi.
- Analiz girdileri: rapor üretimi için sağladığınız doğum tarihi, saati ve yeri.
- Teknik veriler: oturum bilgileri ve site kullanımı sırasında oluşan zorunlu kayıtlar.

## İşleme Amaçları
Verileriniz; üyelik işlemlerinin yürütülmesi, siparişlerin ve ödemelerin alınması, kişiye özel raporun hazırlanması ve teslimi, müşteri desteği sağlanması, hizmet kalitesinin iyileştirilmesi ve ilgili mevzuattan doğan yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.

## Hukuki Sebep
Verileriniz; sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin yerine getirilmesi ve Gökname'nin meşru menfaatleri hukuki sebeplerine dayanılarak işlenir.

## Aktarım
Verileriniz; ödeme altyapısı, e-posta gönderimi ve sunucu/barındırma gibi hizmetlerin yürütülmesi amacıyla, yalnızca gerekli olduğu ölçüde ve gizlilik yükümlülüğü altında yetkili hizmet sağlayıcılarla paylaşılabilir. Verileriniz pazarlama amacıyla üçüncü kişilere satılmaz veya kiralanmaz.

## Saklama Süresi
Kişisel verileriniz, işleme amacının gerektirdiği ve ilgili mevzuatın öngördüğü süreler boyunca saklanır; bu sürelerin sonunda silinir, yok edilir veya anonim hale getirilir.

## Veri Güvenliği
Gökname, kişisel verilerinizi yetkisiz erişime, kayba ve hukuka aykırı işlemeye karşı korumak için uygun teknik ve idari tedbirleri alır.

## Çerezler
Site, deneyimi iyileştirmek için çerezlerden yararlanır. Ayrıntılar Çerez Politikası sayfasında yer alır.

## Haklarınız
KVKK'nın 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, erişme, düzeltilmesini, silinmesini veya yok edilmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Taleplerinizi destek@gokname.com adresine iletebilirsiniz.`,
  },
  {
    slug: "iade",
    baslik: "İptal, İade ve Cayma Hakkı",
    icerik: `## Dijital ve Kişiye Özel Ürün
gokname.com'da sunulan analizler, sizin doğum bilgilerinize göre üretilen, tamamen kişiye özel dijital raporlardır. Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi gereği, ifasına onayınızla başlanan kişiye özel dijital içeriklerde cayma hakkı kullanılamaz. Siparişi onaylayarak bu durumu kabul etmiş olursunuz.

## Üretim Öncesi İptal ve İade
Sipariş verdikten sonra henüz doğum bilgilerinizi girmediyseniz ve rapor üretimi başlamadıysa, destek@gokname.com üzerinden bize ulaşarak siparişinizi iptal edebilir ve ücret iadesi talep edebilirsiniz. Bu aşamada henüz kişiye özel bir üretim yapılmadığından iadeniz gerçekleştirilir.

## Sorun Durumunda Çözüm
Raporunuzda teknik bir hata, eksik teslim, yanlış üretim ya da erişim sorunu gibi bir durum yaşarsanız bizimle iletişime geçin. Durumu inceleyip raporu ücretsiz yeniden üretir veya size uygun bir çözüm sunarız. Memnuniyetiniz bizim için önemlidir.

## İade Süreci ve Süresi
İadeye uygun durumlarda ödemeniz, kullandığınız ödeme yöntemine iade edilir. Bankanıza/ödeme kuruluşuna bağlı olarak tutarın hesabınıza yansıması genellikle birkaç iş günü sürer.

## İletişim
Tüm iptal, iade ve sorun bildirimleriniz için: destek@gokname.com`,
  },
  {
    slug: "cerez",
    baslik: "Çerez Politikası",
    icerik: `## Çerez Nedir?
Çerezler, bir siteyi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır. gokname.com, hizmetin düzgün çalışması, tercihlerinizin hatırlanması ve deneyimin iyileştirilmesi için çerezlerden yararlanır.

## Kullandığımız Çerez Türleri
- Zorunlu çerezler: Oturum açma, sepet ve güvenlik gibi temel işlevler için gereklidir; bunlar olmadan site düzgün çalışmaz.
- Tercih çerezleri: Seçimlerinizi hatırlayarak kullanımı kolaylaştırır.
- Analitik/performans çerezleri: Sitenin nasıl kullanıldığını anlamamıza ve geliştirmemize yardımcı olur.
- Üçüncü taraf çerezleri: Analitik veya reklam ölçümü gibi amaçlarla, ilgili hizmet sağlayıcılar tarafından (ör. ölçümleme araçları) yerleştirilebilir.

## Çerezleri Yönetme
Tarayıcınızın ayarlarından çerezleri görüntüleyebilir, silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezleri engellemeniz, sitenin bazı bölümlerinin düzgün çalışmamasına yol açabilir.

## Değişiklikler
Bu politika zaman zaman güncellenebilir; güncel sürüm her zaman bu sayfada yayımlanır.`,
  },
  {
    slug: "kullanim",
    baslik: "Kullanım Koşulları",
    icerik: `## 1. Genel
Bu Kullanım Koşulları, gokname.com ("Site") ve sunduğu hizmetlerin kullanımına ilişkin kuralları belirler. Siteyi ziyaret ederek veya bir hesap oluşturarak bu koşulları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Koşulları kabul etmiyorsanız Site'yi kullanmamanız gerekir.

## 2. Tanımlar
"Site", gokname.com'u; "Hizmet", Site üzerinden sunulan kişiye özel dijital astroloji analiz raporlarını; "Kullanıcı" veya "Üye", Site'yi kullanan ya da hesap oluşturan gerçek kişiyi ifade eder.

## 3. Hesap ve Güvenlik
Hizmetin tamamından yararlanmak için üye olmanız gerekir. Hesabınızın güvenliğinden ve hesabınız üzerinden gerçekleşen tüm işlemlerden siz sorumlusunuz. Şifrenizi gizli tutmalı, doğru ve güncel bilgi vermelisiniz. Hesabınızda yetkisiz bir kullanım fark ederseniz derhal bizimle iletişime geçmelisiniz. 18 yaşından küçükseniz Hizmet'i yalnızca veli/vasi gözetiminde kullanabilirsiniz.

## 4. Hizmetin Niteliği ve Sorumluluk Reddi
Analizler; astrolojik geleneğe ve gerçek astronomik hesaplara dayalı olarak, eğilim, potansiyel ve farkındalık dilinde hazırlanır. Kesin gelecek iddiası, kehanet ya da garanti içermez. Hizmet; tıbbi, psikolojik, hukuki, finansal veya mesleki tavsiye niteliği taşımaz ve bu tür danışmanlıkların yerine geçmez. Sağlık, hukuk, para ve benzeri önemli konulardaki kararlarınızda mutlaka ilgili uzmanlara başvurmalısınız. Rapor içeriğine dayanarak aldığınız kararlardan doğan sonuçlardan Gökname sorumlu tutulamaz.

## 5. Doğum Bilgilerinin Doğruluğu
Raporun isabeti, sağladığınız doğum tarihi, saati ve yerinin doğruluğuna bağlıdır. Eksik veya hatalı bilgi nedeniyle oluşan isabetsizliklerden Gökname sorumlu değildir. Bilgilerinizi doğru ve eksiksiz girmek sizin sorumluluğunuzdadır.

## 6. Satın Alma ve Ödeme
Ürün fiyatları ve kapsamı ilgili ürün sayfalarında belirtilir; tüm fiyatlara KDV dahildir. Ödemeler güvenli sanal pos altyapısı üzerinden alınır. Satın alma, ödeme ve iade koşulları için Mesafeli Satış Sözleşmesi ile İptal, İade ve Cayma Hakkı sayfaları geçerlidir.

## 7. Fikri Mülkiyet
Site'nin tasarımı, metinleri, görselleri, yazılımı, marka ve logoları ile üretilen raporların biçim ve sunum özellikleri Gökname'ye veya lisans verenlerine aittir ve fikri mülkiyet mevzuatıyla korunur. Size sunulan rapor, yalnızca kişisel ve ticari olmayan kullanımınız içindir; izinsiz çoğaltılamaz, dağıtılamaz, satılamaz veya ticari amaçla kullanılamaz.

## 8. Kullanıcı Yükümlülükleri ve Yasak Kullanımlar
Site'yi yürürlükteki mevzuata ve bu koşullara uygun şekilde kullanmayı kabul edersiniz. Aşağıdakiler yasaktır: Site'nin güvenliğini tehdit etmek veya açıklarını sömürmek; otomatik araçlarla izinsiz veri toplamak (scraping); Hizmet'i veya altyapıyı aşırı yük bindirecek ya da işleyişini bozacak şekilde kullanmak; başkasının hesabını veya kimliğini izinsiz kullanmak; içerikleri izinsiz kopyalayıp yeniden yayımlamak veya satmak; hukuka aykırı, yanıltıcı ya da üçüncü kişilerin haklarını ihlal eden faaliyetlerde bulunmak.

## 9. Hizmette Değişiklik ve Askıya Alma
Gökname, Hizmet'in içeriğini, kapsamını ve fiyatlarını güncelleme; teknik bakım, geliştirme veya zorunlu nedenlerle Hizmet'i geçici olarak askıya alma hakkını saklı tutar. Bu koşulları ihlal eden hesapları uyarısız askıya alabilir veya kapatabilir.

## 10. Sorumluluğun Sınırlandırılması
Hizmet "olduğu gibi" sunulur. Gökname, yürürlükteki mevzuatın izin verdiği azami ölçüde, Hizmet'in kullanımından doğan dolaylı, arızi veya sonuç niteliğindeki zararlardan sorumlu değildir. Her hâlükârda Gökname'nin toplam sorumluluğu, ilgili siparişe ilişkin ödediğiniz tutarla sınırlıdır.

## 11. Üçüncü Taraf Bağlantıları
Site, üçüncü taraf sitelere bağlantılar içerebilir. Bu sitelerin içeriğinden ve gizlilik uygulamalarından Gökname sorumlu değildir.

## 12. Uygulanacak Hukuk ve Yetki
Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda, tüketici mevzuatındaki parasal sınırlar dahilinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.

## 13. Değişiklikler ve İletişim
Bu koşullar zaman zaman güncellenebilir; güncel sürüm her zaman bu sayfada yayımlanır. Site'yi kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir. Sorularınız için: destek@gokname.com`,
  },
  {
    slug: "hakkimizda",
    baslik: "Hakkımızda",
    icerik: `Gökname, gökyüzünün senin doğduğun andaki eşsiz duruşunu; gerçek astronomik hesaplara ve özenle tasarlanmış bir yorum sistemine dayanarak, tamamen sana özel astroloji raporlarına dönüştüren dijital bir platformdur. gokname.com ekibi olarak amacımız, astrolojiyi genel geçer burç yorumlarının ötesine taşımak; herkesin kendini daha derin, daha şefkatli ve daha berrak bir gözle tanımasına yardımcı olan, anlaşılır ve içten bir rehber sunmaktır.

Her analiz, doğum tarihin, saatin ve yerinden yola çıkılarak gerçek gök konumlarının hassas biçimde hesaplanmasıyla başlar; ardından alanında uzmanlarca hazırlanan kapsamlı bir anlam kütüphanesi ve gelişmiş yorum altyapımızla sentezlenir. Sonuç, internetteki sıradan yorumlardan değil, yalnızca senin doğum haritandan doğan; derinlikli ve okuması keyifli bir rapordur. gokname.com ekibi olarak verilerinin gizliliğine önem verir, bilgilerini yalnızca senin raporunu hazırlamak için kullanırız. Bu yıldızlı yolculukta sana eşlik etmekten mutluluk duyuyoruz.`,
  },
];

export type GenelAyar = {
  apiMaliyetUSD: number;  // üretim başına yaklaşık API maliyeti ($)
  posOrani: number;       // sanal pos komisyon oranı (%)
  bakimModu: boolean;     // site bakım modunda mı
  bakimMesaj: string;     // logo altı açıklama
  bakimBitis: string;     // ISO bitiş zamanı (geri sayım için); "" = geri sayım yok
  sss: SssItem[];         // sıkça sorulan sorular (site /sss sayfası)
  hero: HeroAyar;         // anasayfa hero metin/butonları
  iletisim: IletisimAyar; // iletişim sayfası bilgileri
  yasal: YasalSayfa[];    // yasal sayfalar (footer + /yasal/[slug])
};
const GENEL_DEFAULT: GenelAyar = { apiMaliyetUSD: 0.225, posOrani: 0, bakimModu: false, bakimMesaj: "", bakimBitis: "", sss: SSS_DEFAULT, hero: HERO_DEFAULT, iletisim: ILETISIM_DEFAULT, yasal: YASAL_DEFAULT };
export function getGenelAyar(): GenelAyar {
  const stored = read<Partial<GenelAyar>>("genel.json", {});
  return {
    ...GENEL_DEFAULT, ...stored,
    sss: Array.isArray(stored.sss) ? stored.sss : SSS_DEFAULT,
    hero: { ...HERO_DEFAULT, ...(stored.hero ?? {}) },
    iletisim: { ...ILETISIM_DEFAULT, ...(stored.iletisim ?? {}) },
    // Kayıtlı yasal sayfalar kullanılır; ancak içeriği BOŞ bırakılmış bir sayfa varsa
    // (ör. Hakkımızda) aynı slug'lı varsayılan içerikle doldurulur — boş "yakında eklenecek" kalmasın.
    yasal: (Array.isArray(stored.yasal) ? stored.yasal : YASAL_DEFAULT).map((y) => {
      const def = YASAL_DEFAULT.find((d) => d.slug === y.slug);
      const ic = def && !String(y.icerik ?? "").trim() ? def.icerik : (y.icerik ?? "");
      // Domain her zaman gokname.com (Türkçe karaktersiz). Kayıtlı eski metinlerde ö'lü
      // yazılmış "Gökname.com/gökname.com" varsa düzelt (marka adı "Gökname" korunur).
      return { ...y, icerik: ic.replace(/[Gg]ökname\.com/g, "gokname.com") };
    }),
  };
}
export function setGenelAyar(patch: Partial<GenelAyar>): GenelAyar {
  const cur = getGenelAyar();
  const next = { ...cur, ...patch };
  if (patch.hero) next.hero = { ...cur.hero, ...patch.hero };
  if (patch.iletisim) next.iletisim = { ...cur.iletisim, ...patch.iletisim };
  write("genel.json", next);
  return next;
}

// ---- SEO & Sitemap ----
// Her statik sayfa için arama motoru meta'sı + sitemap kontrolleri.
export type SeoSayfa = {
  yol: string;        // "/" , "/analizler" ...
  ad: string;         // admin'de gösterilen etiket
  baslik: string;     // <title>
  aciklama: string;   // meta description
  anahtar: string;    // virgülle anahtar kelimeler
  og: string;         // OG/paylaşım görseli (boşsa varsayılan)
  oncelik: number;    // sitemap priority 0-1
  siklik: string;     // changefreq
  sitemap: boolean;   // sitemap'e dahil
  noindex: boolean;   // arama motorlarına gösterme
};
export type SeoAyar = {
  siteUrl: string;        // mutlak adres (sitemap/robots/og için)
  favicon: string;        // site ikonu (favicon) yolu/URL'i
  sayfalar: SeoSayfa[];
  yasalSitemap: boolean;  // yasal sayfalar sitemap'e dahil
  ekstraUrl: string;      // manuel ekstra URL'ler (satır satır)
  headKod: string;        // <head> içine enjekte
  headAktif: boolean;
  bodyKod: string;        // </body> öncesi enjekte
  bodyAktif: boolean;
};
const SEO_SAYFA = (yol: string, ad: string, baslik: string, aciklama: string, oncelik = 0.7): SeoSayfa =>
  ({ yol, ad, baslik, aciklama, anahtar: "", og: "", oncelik, siklik: "weekly", sitemap: true, noindex: false });
const SEO_DEFAULT: SeoAyar = {
  siteUrl: "https://gokname.com",
  favicon: "",
  sayfalar: [
    SEO_SAYFA("/", "Anasayfa", "Gökname — Kişiye Özel Astroloji Analizleri", "Gerçek astronomik hesaba dayalı, tamamen sana özel hazırlanan astroloji analizleri: doğum haritası, aşk, kariyer, sağlık ve karmik raporlar.", 1),
    SEO_SAYFA("/analizler", "Analizler", "Analizler — Gökname", "Doğum haritası, aşk, kariyer, sağlık, karmik ve çift uyumu analizleri. Kişiye özel, gerçek gökyüzü hesabıyla."),
    SEO_SAYFA("/ornekler", "Örnek Analizler", "Örnek Analizler — Gökname", "Satın almadan önce her analizin gerçek bir örneğini incele."),
    SEO_SAYFA("/nasil-calisir", "Nasıl Hazırlanır?", "Nasıl Hazırlanır? — Gökname", "Raporun, doğum anından elindeki PDF'e sekiz titiz aşamadan geçer. Gerçek astronomi + yapay zekâ sentezi."),
    SEO_SAYFA("/sss", "S.S.S.", "Sıkça Sorulan Sorular — Gökname", "Gökname analizleri hakkında merak edilenler."),
    SEO_SAYFA("/iletisim", "İletişim", "İletişim — Gökname", "Sorularınız ve destek için bize ulaşın."),
    // Ürün detay sayfaları — gizli ürün sitemap dışı + noindex
    ...PRODUCTS.map((p) => ({
      yol: `/analizler/${p.slug}`,
      ad: `Ürün: ${p.ad}`,
      baslik: `${p.ad} — Gökname`,
      aciklama: p.kisa,
      anahtar: "",
      og: p.gorsel ?? "",
      oncelik: 0.8,
      siklik: "monthly",
      sitemap: !p.gizli,
      noindex: !!p.gizli,
    })),
  ],
  yasalSitemap: false,
  ekstraUrl: "",
  headKod: "", headAktif: true,
  bodyKod: "", bodyAktif: true,
};
export function getSeoAyar(): SeoAyar {
  const stored = read<Partial<SeoAyar>>("seo.json", {});
  const kayitli = Array.isArray(stored.sayfalar) ? stored.sayfalar : [];
  // Default sayfa listesini esas al; kayıtlı değer varsa onu kullan (yeni eklenen ürün sayfaları otomatik gelir,
  // kaldırılan ürünler düşer — admin SEO listesi PRODUCTS ile her zaman senkron).
  const sayfalar = SEO_DEFAULT.sayfalar.map((def) => {
    const v = kayitli.find((s) => s.yol === def.yol);
    return v ? { ...def, ...v, ad: def.ad } : def;
  });
  return { ...SEO_DEFAULT, ...stored, sayfalar };
}
export function setSeoAyar(patch: Partial<SeoAyar>): SeoAyar {
  const next = { ...getSeoAyar(), ...patch };
  write("seo.json", next);
  return next;
}
// Belirli bir yola ait SEO sayfa kaydı (yoksa undefined)
export function getSeoSayfa(yol: string): SeoSayfa | undefined {
  return getSeoAyar().sayfalar.find((s) => s.yol === yol);
}

// ---- PayTR sanal pos ----
export type PaytrConfig = {
  aktif: boolean;        // sanal pos ödeme akışı açık mı
  merchantId: string;    // Mağaza No
  merchantKey: string;   // Mağaza Parolası (gizli)
  merchantSalt: string;  // Mağaza Gizli Anahtarı (gizli)
  testMod: boolean;      // test_mode (1/0)
  maxTaksit: number;     // max_installment (0 = PayTR varsayılanı)
  tekCekim: boolean;     // no_installment — taksidi kapat
  basvuruModu: boolean;  // PayTR başvuru modu: ödeme butonu çalışmaz, "bağlantı bekleniyor" uyarısı verir
};
const PAYTR_DEFAULT: PaytrConfig = {
  aktif: false, merchantId: "", merchantKey: "", merchantSalt: "", testMod: true, maxTaksit: 0, tekCekim: false, basvuruModu: false,
};
export function getPaytr(): PaytrConfig {
  return { ...PAYTR_DEFAULT, ...read<Partial<PaytrConfig>>("paytr.json", {}) };
}
export function setPaytr(patch: Partial<PaytrConfig>): PaytrConfig {
  const next = { ...getPaytr(), ...patch };
  write("paytr.json", next);
  return next;
}
// PayTR merchant_oid (yalnız harf+rakam) sipariş id'sine eşlenir
export function paytrOid(orderId: string): string {
  return orderId.replace(/[^a-zA-Z0-9]/g, "");
}
// Callback sonrası siparişi ödendi işaretle (merchant_oid ile bul)
export function markOrderPaidByOid(merchantOid: string): Order | null {
  const list = getOrders();
  const i = list.findIndex((o) => paytrOid(o.id) === merchantOid);
  if (i < 0) return null;
  list[i] = { ...list[i], durum: "odendi", odemeTarih: new Date().toISOString() };
  write("orders.json", list);
  return list[i];
}

// ---- Fiyat override'ları (admin -> fronta yansır). eskiFiyat=0 → indirim yok (üstü çizili gösterilmez) ----
export type PriceOverride = { fiyat: number; eskiFiyat: number };
export function getPrices(): Record<string, PriceOverride> {
  return read<Record<string, PriceOverride>>("prices.json", {});
}
export function setPrice(slug: string, fiyat: number, eskiFiyat: number) {
  write("prices.json", { ...getPrices(), [slug]: { fiyat: Math.round(fiyat), eskiFiyat: Math.round(eskiFiyat) } });
}

// ---- Oturumlar ----
type SessionRec = { type: "member" | "admin"; email: string; exp: number };
function sessions(): Record<string, SessionRec> {
  return read<Record<string, SessionRec>>("sessions.json", {});
}
export function createSession(type: "member" | "admin", email: string): string {
  const token = crypto.randomBytes(24).toString("hex");
  const all = sessions();
  all[token] = { type, email: email.toLowerCase(), exp: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  write("sessions.json", all);
  return token;
}
export function readSession(token: string | undefined): SessionRec | null {
  if (!token) return null;
  const rec = sessions()[token];
  if (!rec || rec.exp < Date.now()) return null;
  return rec;
}
export function deleteSession(token: string | undefined) {
  if (!token) return;
  const all = sessions();
  delete all[token];
  write("sessions.json", all);
}

// ---- Şifre sıfırlama kodları ----
type ResetRec = { code: string; exp: number };
function resets(): Record<string, ResetRec> {
  return read<Record<string, ResetRec>>("resets.json", {});
}
export function createResetCode(scope: "member" | "admin", email: string): string {
  const code = String(crypto.randomInt(100000, 1000000));
  const all = resets();
  all[`${scope}:${email.toLowerCase()}`] = { code, exp: Date.now() + 1000 * 60 * 15 };
  write("resets.json", all);
  return code;
}
export function verifyResetCode(scope: "member" | "admin", email: string, code: string): boolean {
  const rec = resets()[`${scope}:${email.toLowerCase()}`];
  return !!rec && rec.exp > Date.now() && rec.code === code.trim();
}
export function clearResetCode(scope: "member" | "admin", email: string) {
  const all = resets();
  delete all[`${scope}:${email.toLowerCase()}`];
  write("resets.json", all);
}

// ---- Dosya saklama (fatura PDF, rapor PDF) ----
function filesDir() {
  const d = path.join(DIR, "files");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}
export function saveFile(buf: Buffer, ext = "pdf"): string {
  const id = crypto.randomBytes(10).toString("hex") + "." + ext.replace(/[^a-z0-9]/gi, "");
  fs.writeFileSync(path.join(filesDir(), id), buf);
  return id;
}
export function readFile(id: string): Buffer | null {
  const safe = path.basename(id);
  const p = path.join(filesDir(), safe);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}
export function deleteFile(id: string) {
  try { fs.unlinkSync(path.join(filesDir(), path.basename(id))); } catch {}
}

// ---- Siparişler ----
export type OrderItem = { slug: string; ad: string; fiyat: number; hediye?: boolean };
export type Fatura = FaturaBilgi; // sipariş faturası = üye fatura bilgisiyle aynı şema
export type Order = {
  id: string;
  email: string;
  items: OrderItem[];
  total: number;
  durum: "odendi" | "bekliyor" | "iade";
  hediye: boolean;
  fatura?: Fatura;
  faturaDosya?: string; // dosya id (admin yüklediği fatura PDF)
  kaynak?: string; // sipariş kaynağı (instagram, google, direkt vb.)
  odemeTarih?: string; // PayTR ile ödendiğinde işlenir
  tarih: string;
};

export function getOrders(): Order[] {
  return read<Order[]>("orders.json", []);
}
export function getOrdersByEmail(email: string): Order[] {
  return getOrders().filter((o) => o.email.toLowerCase() === email.trim().toLowerCase());
}
export function addOrder(email: string, items: OrderItem[], fatura: Fatura | undefined, kaynak?: string): Order {
  const order: Order = {
    id: "GN-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    email: email.trim().toLowerCase(),
    items,
    total: items.reduce((t, i) => t + i.fiyat, 0),
    durum: "odendi",
    hediye: items.some((i) => i.hediye),
    fatura,
    kaynak: kaynak && kaynak.trim() ? kaynak.trim().toLowerCase() : "direkt",
    tarih: new Date().toISOString(),
  };
  write("orders.json", [order, ...getOrders()]);
  // Hediye kalemi → hediye kodu (alıcı=satın alan); normal kalem → analiz hakkı
  for (const it of items) {
    if (it.hediye) createGiftCode(it.slug, it.ad, email, "musteri");
    else addReport(email, it.slug, it.ad, "bekliyor");
  }
  return order;
}
export function attachInvoice(orderId: string, dosyaId: string): Order | null {
  const list = getOrders();
  const i = list.findIndex((o) => o.id === orderId);
  if (i < 0) return null;
  list[i] = { ...list[i], faturaDosya: dosyaId };
  write("orders.json", list);
  return list[i];
}

// ---- Üye raporları (hesaba atanan analizler) ----
export type DogumBilgi = { ad: string; tarih: string; saat: string; yer: string; not?: string };
export type Report = {
  id: string;
  email: string;
  slug: string;
  urunAd: string;
  durum: "bekliyor" | "olusturuluyor" | "hazir";
  dogum?: DogumBilgi;
  dogum2?: DogumBilgi; // çift (sinastri) analizlerde 2. kişi
  adminIletti?: boolean; // admin "Rapor Oluştur"dan üretip atadıysa
  indirildi?: boolean;   // müşteri raporu indirdiyse
  dosya?: string; // hazır PDF dosya id
  hata?: string; // üretim başarısız olduysa son hata (kullanıcıya/teşhise gösterilir)
  tarih: string;
};
export function getReports(): Report[] {
  return read<Report[]>("reports.json", []);
}
export function getReportsByEmail(email: string): Report[] {
  return getReports().filter((r) => r.email.toLowerCase() === email.trim().toLowerCase());
}
export function addReport(
  email: string,
  slug: string,
  urunAd: string,
  durum: Report["durum"] = "bekliyor",
  dosya?: string,
  extra?: { dogum?: DogumBilgi; dogum2?: DogumBilgi; adminIletti?: boolean },
): Report {
  const rep: Report = {
    id: "R-" + crypto.randomBytes(4).toString("hex"),
    email: email.trim().toLowerCase(),
    slug,
    urunAd,
    durum,
    dogum: extra?.dogum,
    dogum2: extra?.dogum2,
    adminIletti: extra?.adminIletti,
    dosya,
    tarih: new Date().toISOString(),
  };
  write("reports.json", [rep, ...getReports()]);
  return rep;
}
export function attachReportFile(reportId: string, dosyaId: string): Report | null {
  const list = getReports();
  const i = list.findIndex((r) => r.id === reportId);
  if (i < 0) return null;
  list[i] = { ...list[i], dosya: dosyaId, durum: "hazir", hata: undefined };
  write("reports.json", list);
  return list[i];
}
export function findReport(reportId: string): Report | undefined {
  return getReports().find((r) => r.id === reportId);
}
// Müşteri kendi raporunu indirince işaretle (dosya id + sahip e-posta eşleşmesi)
export function markReportIndirildi(dosyaId: string, email: string): void {
  const list = getReports();
  let degisti = false;
  for (const r of list) {
    if (r.dosya === dosyaId && r.email === email && !r.indirildi) {
      r.indirildi = true;
      degisti = true;
    }
  }
  if (degisti) write("reports.json", list);
}
export function setReportDurum(reportId: string, durum: Report["durum"], hata?: string): Report | null {
  const list = getReports();
  const i = list.findIndex((r) => r.id === reportId);
  if (i < 0) return null;
  list[i] = { ...list[i], durum, hata };
  write("reports.json", list);
  return list[i];
}

// ---- Admin üretim havuzu (panelde üretilen, henüz atanmamış raporlar) ----
// Üye formuyla aynı DogumBilgi (yer = "İl / İlçe" ya da yurtdışı "Şehir, Ülke"); çift için dogum2.
export type GenReport = {
  id: string;
  slug: string;
  urunAd: string;
  dogum: DogumBilgi;
  dogum2?: DogumBilgi;
  durum: "olusturuluyor" | "hazir" | "hata";
  dosya?: string;
  hata?: string;
  atandi?: string; // atandıysa müşteri e-postası
  tarih: string;
};
export function getGenReports(): GenReport[] {
  return read<GenReport[]>("generated.json", []);
}
export function addGenReport(slug: string, urunAd: string, dogum: DogumBilgi, dogum2?: DogumBilgi): GenReport {
  const g: GenReport = { id: "G-" + crypto.randomBytes(4).toString("hex"), slug, urunAd, dogum, dogum2, durum: "olusturuluyor", tarih: new Date().toISOString() };
  write("generated.json", [g, ...getGenReports()]);
  return g;
}
export function updateGenReport(id: string, patch: Partial<GenReport>): GenReport | null {
  const list = getGenReports();
  const i = list.findIndex((g) => g.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  write("generated.json", list);
  return list[i];
}
export function genBusy(): boolean {
  return getGenReports().some((g) => g.durum === "olusturuluyor");
}

// ---- Hediye kodları ----
export type GiftCode = {
  kod: string;
  slug: string;
  urunAd: string;
  sahip: string; // kodu elinde tutan (satın alan ya da admin'in ilettiği müşteri)
  durum: "aktif" | "kullanildi";
  kaynak: "musteri" | "admin"; // müşteri siparişi mi, admin mi oluşturdu
  kullanan?: string; // kodu kullanan üyenin e-postası
  tarih: string;
};
function genGiftCode(): string {
  const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const blk = () => Array.from({ length: 4 }, () => ch[crypto.randomInt(0, ch.length)]).join("");
  return `GOK-${blk()}-${blk()}`;
}
export function getGiftCodes(): GiftCode[] {
  return read<GiftCode[]>("giftcodes.json", []);
}
export function getGiftCodesByOwner(email: string): GiftCode[] {
  return getGiftCodes().filter((g) => g.sahip.toLowerCase() === email.trim().toLowerCase());
}
export function createGiftCode(slug: string, urunAd: string, sahip: string, kaynak: "musteri" | "admin" = "admin"): GiftCode {
  let kod = genGiftCode();
  const all = getGiftCodes();
  while (all.some((g) => g.kod === kod)) kod = genGiftCode();
  const g: GiftCode = { kod, slug, urunAd, sahip: sahip.trim().toLowerCase(), durum: "aktif", kaynak, tarih: new Date().toISOString() };
  write("giftcodes.json", [g, ...all]);
  return g;
}
export function redeemGiftCode(kod: string, byEmail: string): { error?: string; urunAd?: string } {
  const all = getGiftCodes();
  const i = all.findIndex((g) => g.kod.toUpperCase() === kod.trim().toUpperCase());
  if (i < 0) return { error: "Geçersiz kod." };
  if (all[i].durum === "kullanildi") return { error: "Bu kod zaten kullanılmış." };
  all[i] = { ...all[i], durum: "kullanildi", kullanan: byEmail.trim().toLowerCase() };
  write("giftcodes.json", all);
  addReport(byEmail, all[i].slug, all[i].urunAd, "bekliyor");
  return { urunAd: all[i].urunAd };
}
export function setReportBirthInfo(reportId: string, email: string, dogum: DogumBilgi, dogum2?: DogumBilgi): Report | null {
  const list = getReports();
  const i = list.findIndex((r) => r.id === reportId && r.email.toLowerCase() === email.trim().toLowerCase());
  if (i < 0) return null;
  list[i] = { ...list[i], dogum, dogum2, durum: "olusturuluyor", hata: undefined };
  write("reports.json", list);
  return list[i];
}
