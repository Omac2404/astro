// synthesize-pro.mjs — Astrolog Pro raporu metin sentezi (bölüm bölüm, paralel, prompt cache'li).
// Girdi : $NATAL_IO/chart-pro.json (compute_pro.py)
// Çıktı : $NATAL_IO/rapor-pro.json  { sections:[{key,baslik,metin}], usage, maliyet_usd, model }
// Model : PRO_MODEL (varsayılan claude-opus-5-5) · PRO_EFFORT (varsayılan medium)
// Çalıştır (repo kökünden): node report/natal/synthesize-pro.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const IO = process.env.NATAL_IO || HERE;

// ANTHROPIC_API_KEY: önce ortam değişkeni (prod), yoksa .env.local (yerel geliştirme)
const envLocal = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocal)) {
  for (const line of fs.readFileSync(envLocal, "utf8").split("\n")) {
    if (line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("="); const k = line.slice(0, i).trim(); const v = line.slice(i + 1).trim();
    if (k && !process.env[k]) process.env[k] = v;
  }
}
if (!process.env.ANTHROPIC_API_KEY) { console.error("HATA: ANTHROPIC_API_KEY tanımlı değil."); process.exit(1); }

const MODEL = process.env.PRO_MODEL || "claude-opus-5-5";
const EFFORT = process.env.PRO_EFFORT || "medium";
const ESZAMAN = Math.max(1, Math.min(6, parseInt(process.env.PRO_PARALEL || "4", 10) || 4));
// 1M token başına USD: [girdi, çıktı, cache yazma (5dk), cache okuma]
const FIYAT = {
  "claude-opus-5-5": [4, 20, 5, 0.4],
  "claude-fable-5-1": [10, 50, 12.5, 0.25],
};
const client = new Anthropic({ maxRetries: 0 });

const chart = JSON.parse(fs.readFileSync(path.join(IO, "chart-pro.json"), "utf8"));
const SYSTEM_TALIMAT = fs.readFileSync(path.join(ROOT, "src/prompts/pro-natal.md"), "utf8");
const ad = chart.meta.ad;
const dn = chart.danisan || {};

// ---------------- Harita verisini okunur metne çevir (cache'lenen bağlam) ----------------
const GUVEN = { yuksek: "yüksek (saat kesin)", orta: "orta (saat yaklaşık)", dusuk: "DÜŞÜK (saat bilinmiyor, 12:00 kullanıldı)" };
const yon = (a) => (a.yaklasan ? "yaklaşan" : "ayrılan");
const L = [];
L.push(`# DANIŞAN: ${ad}`);
L.push(`Doğum: ${chart.meta.tarih} ${chart.meta.saat} (yerel, ${chart.meta.tz}) · ${chart.meta.yer} · ${chart.meta.lat}, ${chart.meta.lon} · ${chart.meta.utc}`);
L.push(`Doğum saati güveni: ${GUVEN[chart.meta.zaman_guven] || chart.meta.zaman_guven} · ${chart.meta.gunduz_dogum ? "Gündüz" : "Gece"} doğumu · Şu anki yaş: ${chart.meta.yas}`);
L.push(`Ev sistemi: ${chart.meta.ev_sistemi} · Zodyak: ${chart.meta.zodyak} · Rapor tarihi: ${chart.meta.uretim}`);
const dnSatir = [
  dn.cinsiyet && `Cinsiyet: ${dn.cinsiyet}`, dn.meslek && `Meslek/uğraş: ${dn.meslek}`, dn.iliski && `İlişki durumu: ${dn.iliski}`,
].filter(Boolean);
if (dnSatir.length) L.push(dnSatir.join(" · "));
if (dn.sorular) L.push(`\n## DANIŞANIN ODAK SORULARI\n${dn.sorular}`);
if (dn.not) L.push(`\n## ASTROLOĞUN NOTU\n${dn.not}`);

L.push("\n## GEZEGENLER (burç derece · ev · durum · hız)");
for (const p of chart.planets) {
  L.push(`- ${p.ad}: ${p.sign} ${p.deg} · ${p.house}. ev · ${p.dignity}${p.retro ? " · RETRO" : ""} · ${p.element}/${p.modality} · ${p.hiz}°/gün`);
}
L.push("\n## KÖŞELER VE NOKTALAR");
for (const q of chart.points) L.push(`- ${q.ad}: ${q.sign} ${q.deg} · ${q.house}. ev${q.zamana_bagli ? " (saate bağlı)" : ""}`);
L.push(`- Harita yöneticisi: ${chart.harita_yoneticisi.ad} (${chart.harita_yoneticisi.sign}, ${chart.harita_yoneticisi.house}. ev, ${chart.harita_yoneticisi.dignity})${chart.harita_yoneticisi.modern ? ` · modern eş yönetici: ${chart.harita_yoneticisi.modern}` : ""}`);
L.push(`- MC yöneticisi: ${chart.mc.yonetici} (${chart.mc.yonetici_ev}. evde)`);

L.push("\n## AÇILAR (orb · yaklaşan/ayrılan · uyum) — majör önce, en sıkıdan");
for (const a of chart.aspects) L.push(`- ${a.a_ad} ${a.ad} ${a.b_ad} · orb ${a.orb}° · ${yon(a)} · ${a.uyum}${a.majör ? "" : " · minör"}`);
L.push("\n## HARİTA KALIPLARI");
if (chart.patterns.length) for (const k of chart.patterns) L.push(`- ${k.tip}: ${k.detay}`);
else L.push("- Belirgin büyük kalıp yok.");

L.push("\n## EVLER (Tüm Burç)");
for (const h of chart.houses) {
  L.push(`- ${h.n}. ev ${h.sign} (${h.konu}) · yöneticisi ${h.yonetici} → ${h.yonetici_ev}. ev${h.modern_yonetici ? ` · modern: ${h.modern_yonetici} → ${h.modern_yonetici_ev}. ev` : ""} · içindekiler: ${h.icindekiler.length ? h.icindekiler.join(", ") : "boş"}`);
}
L.push("\n## DİSPOZİTÖR ZİNCİRİ (geleneksel yöneticiler)");
for (const [k, v] of Object.entries(chart.dispozitor.zincir)) L.push(`- ${v}`);
L.push(`- Kendi burcundaki gezegenler: ${chart.dispozitor.kendi_burcunda.join(", ") || "yok"} · Son dispozitör: ${chart.dispozitor.son || "tek bir son dispozitör yok"}`);
if (chart.dispozitor.karsilikli_agirlama.length) L.push(`- Karşılıklı ağırlama: ${chart.dispozitor.karsilikli_agirlama.join("; ")}`);
L.push("\n## GÜÇ SIRALAMASI (basitleştirilmiş: öz-onur + açısallık + retro + açı yoğunluğu)");
L.push(chart.guc.map((g) => `${g.ad} ${g.puan}`).join(" · "));
const D = chart.denge;
L.push("\n## DENGELER (10 gezegen + ASC + MC = 12 nokta)");
L.push(`- Element: ${Object.entries(D.element).map(([k, v]) => `${k} ${v}`).join(", ")} · gezegenler: ${Object.entries(D.element_gezegen).map(([k, v]) => `${k}=[${v.join(", ")}]`).join(" ")}`);
L.push(`- Nitelik: ${Object.entries(D.nitelik).map(([k, v]) => `${k} ${v}`).join(", ")} · gezegenler: ${Object.entries(D.nitelik_gezegen).map(([k, v]) => `${k}=[${v.join(", ")}]`).join(" ")}`);
L.push(`- Kutup: ${Object.entries(D.kutup).map(([k, v]) => `${k} ${v}`).join(", ")}`);
L.push(`- Yarıküre (10 gezegen): ufkun üstü ${D.ust_yari} / altı ${D.alt_yari} · doğu ${D.dogu} / batı ${D.bati} · ${Object.entries(D.ceyrek).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
L.push(`- Doğum Ay fazı: ${chart.ay_fazi.ad} (Güneş–Ay açısı ${chart.ay_fazi.aci}°)`);

const T = chart.transitler;
L.push(`\n## TRANSİTLER (${T.baslangic} – ${T.bitis}; yavaş gezegenler → natal noktalar; pencere orb ≤1,5°)`);
L.push(`- Şu an: ${Object.entries(T.simdi).map(([k, v]) => `${k} ${v.burc} ${v.deg} (${v.ev}. ev)`).join(" · ")}`);
for (const e of T.olaylar) {
  L.push(`- ${e.transit} ${e.ad} natal ${e.natal}: ${e.baslangic_tr} → ${e.bitis_tr} · ${e.tam.length ? "tam: " + e.tam.join(", ") : "tam isabet bu dönemin dışında (öncesinde ya da sonrasında)"} · en sıkı ${e.min_orb}°${e.devam_ediyor ? " · şu an etkin" : ""}${e.suruyor_sonra ? " · dönem sonrasına uzanıyor" : ""}`);
}
if (T.ingresler.length) L.push(`- Burç geçişleri: ${T.ingresler.map((g) => `${g.gezegen} → ${g.burc} (${g.tarih}, ${g.ev}. ev)`).join("; ")}`);

const PR = chart.progresyon;
L.push("\n## İKİNCİL PROGRESYONLAR (bugün)");
for (const k of ["gunes", "ay", "merkur", "venus", "mars"]) L.push(`- Progresif ${PR[k].ad}: ${PR[k].sign} ${PR[k].deg} (natal ${PR[k].natal_ev}. ev)`);
L.push(`- ${PR.sa_mc.ad}: ${PR.sa_mc.sign} ${PR.sa_mc.deg} · ${PR.sa_asc.ad}: ${PR.sa_asc.sign} ${PR.sa_asc.deg} (yay ${PR.yay}°)`);
L.push(`- Progresif Ay fazı: ${PR.ay_fazi.ad}`);
if (PR.aktif_acilar.length) L.push(`- Etkin progresif açılar (orb ≤1°): ${PR.aktif_acilar.map((a) => `${a.prog} ${a.ad} natal ${a.natal} (${a.orb}°)`).join("; ")}`);
L.push(`- Progresif Ay yolculuğu (24 ay): ${PR.ay_yolculugu.map((y) => `${y.tarih}: ${y.burc} (${y.ev}. ev)`).join(" → ")}`);

const SR = chart.solar_return;
if (SR) {
  L.push(`\n## GEÇERLİ SOLAR RETURN (${SR.yil}; an: ${SR.an}; ${SR.not})`);
  L.push(`- SR Yükselen ${SR.asc.sign} ${SR.asc.deg} · SR MC ${SR.mc.sign} ${SR.mc.deg} · açısal gezegenler: ${SR.acisal_gezegenler.join(", ") || "yok"}`);
  L.push(`- ${SR.gezegenler.map((g) => `${g.ad} ${g.sign} ${g.deg} (${g.house}. SR evi)`).join(" · ")}`);
}

if (chart.olaylar.length) {
  L.push("\n## YAŞAM OLAYLARI (danışanın verdiği tarihler; o günkü tetikleyiciler)");
  for (const o of chart.olaylar) {
    if (o.hata) { L.push(`- ${o.tarih}: ${o.aciklama} (hesaplanamadı)`); continue; }
    L.push(`- ${o.tarih_tr} (yaş ${o.yas}): "${o.aciklama}"`);
    L.push(`  · transitler: ${o.tetikleyiciler.length ? o.tetikleyiciler.map((h) => `${h.transit} ${h.ad} natal ${h.natal} (${h.orb}°)`).join("; ") : "belirgin yavaş gezegen tetikleyicisi yok"}`);
    L.push(`  · transit Jüpiter ${o.transit_evler["Jüpiter"].ev}. ev, transit Satürn ${o.transit_evler["Satürn"].ev}. ev · progresif Ay ${o.progresif_ay.burc} ${o.progresif_ay.deg} (${o.progresif_ay.ev}. ev)${o.progresif_ay_acilari.length ? " · " + o.progresif_ay_acilari.join("; ") : ""}`);
  }
}
const BAGLAM = L.join("\n");

// ---------------- Bölüm planı ----------------
// Hedef: toplam ~6.000 kelime yorum → veri sayfalarıyla birlikte ~30 sayfalık PDF.
// Kelime hedefleri bilinçli olarak sıkı: yoğun, tekrarsız, teknik dayanaklı metin.
const BOLUMLER = [
  { key: "ozet", baslik: "Yönetici Özeti", kelime: 300,
    is: `Haritanın kuşbakışı portresi. Önce 1 paragrafta ${ad}'nin haritasının ana hikâyesini anlat. Ardından "### Haritanın Ana Temaları" alt başlığıyla 5-6 maddelik, her biri tek cümlelik ve teknik dayanaklı bir tema listesi ver. Sonda 2 vurucu cümle.` },
  { key: "cekirdek", baslik: "Kişilik Çekirdeği: Güneş, Ay ve Yükselen", kelime: 600,
    is: `Güneş, Ay ve Yükselen'i ayrı alt başlıklarla işle (burç, ev, derece, en önemli açılar, yöneticisinin durumu); her biri 1-2 paragraf. Son alt başlıkta "### Üçlünün Sentezi": üçü birbirini nasıl destekliyor ya da zorluyor, iç dünya ile dış görünüm farkı. Ay fazına bir cümleyle değin.` },
  { key: "yonetici", baslik: "Harita Yöneticisi, Dispozitörler ve Güç Dengesi", kelime: 350,
    is: "Harita yöneticisinin konumu ve hikâyesi; dispozitör zincirinin işaret ettiği merkez(ler); güç sıralamasında en güçlü ve en zorlanan gezegenlerin hayattaki karşılığı; element/nitelik ve yarıküre dengesinin psikolojik anlamı (eksik ya da baskın element)." },
  { key: "gezegenler", baslik: "Gezegenler: Merkür'den Plüton'a", kelime: 900,
    is: "Merkür, Venüs, Mars, Jüpiter ve Satürn için ayrı alt başlıklar (burç, ev, öz-onur, retro ise anlamı, en önemli 1-2 açı; her biri tek yoğun paragraf). Merkür: düşünme ve iletişim; Venüs: sevgi dili, değerler, para; Mars: eylem, öfke, arzu; Jüpiter: büyüme ve inanç; Satürn: sorumluluk, korku, ustalık (yaşa göre Satürn döngüsünde nerede durduğu). Son alt başlık \"### Uranüs, Neptün ve Plüton\": burç anlamları kuşaksaldır; yalnızca ev konumları ve kişisel gezegenlere/köşelere yaptıkları açılar üzerinden kısa kişisel iz." },
  { key: "evler", baslik: "On İki Ev", kelime: 800,
    is: "12 evin her biri için kısa alt başlık (örn. \"### 2. Ev: Koç\"): evin burcu, yöneticisi ve yöneticinin bulunduğu ev (ev zinciri), içindeki gezegenler. Dolu evlere 3-4 cümle, boş evlere yöneticisi üzerinden 1-2 cümle." },
  { key: "acilar", baslik: "Belirleyici Açılar ve Harita Kalıpları", kelime: 550,
    is: "Önce varsa harita kalıplarını (stelyum, T-kare, yod vb.) alt başlıklarla yorumla: apeks gezegen, çözüm noktası, yaşamdaki karşılığı. Sonra en belirleyici 5-6 açıyı (sıkı orb, ışıklar, köşeler, yaklaşan açılar öncelikli) her biri kısa bir alt başlık ve tek paragrafla işle: dinamik, gölge, olgunlaşmış ifade." },
  { key: "karmik", baslik: "Karmik Eksen: Ay Düğümleri, Kiron ve Lilith", kelime: 350,
    is: "Kuzey ve Güney Düğüm ekseni (burç, ev, düğümlere açı yapan gezegenler): konfor alanı ile büyüme yönü. Kiron: yara ve şifacılık kapasitesi. Lilith: bastırılan güç ve otantiklik. Şans Noktası'na (saat güvenilirse) bir cümle." },
  { key: "alanlar", baslik: "Yaşam Alanları", kelime: 650,
    is: `Dört alt başlık, her biri 1-2 yoğun paragraf: "### Aşk ve İlişkiler" (Venüs, Mars, 5. ve 7. ev), "### Kariyer, Para ve Yön" (MC ve yöneticisi, 10., 6. ve 2. ev), "### Sağlık ve Enerji" (6. ev, 1. ev, Mars, element dengesi; tıbbi tanı yok, yalnızca eğilim ve öz bakım farkındalığı), "### Aile ve Kökler" (4. ev, IC, Ay, Satürn). Danışan bilgisi (meslek, ilişki durumu) varsa bağla.` },
  { key: "zaman", baslik: "Önümüzdeki 12 Ay: Transitler, Progresyonlar ve Yıl Haritası", kelime: 700,
    is: "Önce 1 paragraflık genel yıl tonu (Solar Return Yükselen ve açısal gezegenler + en ağır transitler). Sonra \"### Zaman Çizelgesi\" altında kronolojik madde listesi: yalnızca en önemli 8-10 transit penceresi, her biri tarih aralığı + tam isabet + tek cümlelik somut tema (benzerlerini birleştir). Ardından \"### Progresyonlar ve Solar Return\" alt başlığıyla tek-iki paragraf. Kesin olay kehaneti yok; pencere ve tema dili." },
  { key: "olaylar", baslik: "Yaşam Olaylarının Astrolojik Okuması", kelime: 0, kosul: () => chart.olaylar.length > 0,
    is: "Danışanın verdiği her yaşam olayı için ayrı alt başlık (tarih + olay) ve tek yoğun paragraf: o tarihteki tetikleyicileri (transitler, transit Jüpiter/Satürn evleri, progresif Ay) olayla ilişkilendir. Tetikleyici zayıfsa dürüstçe söyle. En sonda \"### Desen\" alt başlığıyla kısa bir ortak tema ve doğum saati doğrulamasına katkısı." },
  { key: "sorular", baslik: "Danışanın Soruları", kelime: 0, kosul: () => !!(dn.sorular && dn.sorular.trim()),
    is: "Danışanın odak sorularının HER BİRİNİ ayrı alt başlık yap (soruyu kısaltarak başlık olarak yaz). Her birine haritadan teknik dayanaklı, dengeli ve uygulanabilir 1-2 paragraflık bir cevap ver; zamanlama varsa transit/progresyon pencerelerine bağla. Kehanet yok, eğilim ve öneri dili." },
  { key: "seans", baslik: "Astrolog İçin Seans Rehberi", kelime: 550,
    is: `Astroloğa pratik seans planı. Alt başlıklar: "### Açılış" (2-3 cümlelik çerçeve), "### Sorulacak Sorular" (8 soru, her birinin yanında parantez içinde hangi yerleşimden geldiği), "### Hassas Noktalar ve Dil Önerisi" (kısa madde listesi), "### Öneriler ve Pratikler" (kısa madde listesi), "### Vurucu Cümleler" (seansta kullanılabilecek 5 adet \`> \` satırı).` },
];
// --sadece key1,key2 : yalnız bu bölümleri üret (test/maliyet ölçümü için)
const _si = process.argv.indexOf("--sadece");
const SADECE = _si > 0 ? (process.argv[_si + 1] || "").split(",") : null;
const aktifBolumler = BOLUMLER.filter((b) => (!b.kosul || b.kosul()) && (!SADECE || SADECE.includes(b.key)));

function kelimeHedefi(b) {
  if (b.key === "olaylar") return Math.min(900, 130 * chart.olaylar.length + 80);
  if (b.key === "sorular") return Math.min(800, 180 * Math.max(1, dn.sorular.split(/\n|\?/).filter((s) => s.trim().length > 4).length));
  return b.kelime;
}

// ---------------- API çağrısı ----------------
const SYSTEM = [
  { type: "text", text: SYSTEM_TALIMAT },
  { type: "text", text: "Aşağıda bu raporun tüm bölümlerinde kullanacağın HESAPLANMIŞ HARİTA VERİSİ var:\n\n" + BAGLAM, cache_control: { type: "ephemeral" } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function gecici(e) {
  const s = e?.status; const t = e?.error?.error?.type || e?.error?.type;
  if (t === "overloaded_error" || t === "api_error") return true;
  if (s === 429 || s === 408 || s === 409 || (s >= 500 && s <= 599)) return true;
  return s === undefined && /overload|timeout|abort|ECONNRESET|ETIMEDOUT|fetch failed|socket/i.test(e?.message || "");
}
function stripEmDash(s) {
  return s.replace(/\s*—\s*(ve|ya da|ki|ama|ancak|fakat|çünkü)\b/g, " $1").replace(/\s*—\s*/g, ", ");
}
function temizle(s, baslik) {
  let t = stripEmDash(s).replace(/\r/g, "").trim();
  // Model ana başlığı yine de yazdıysa at
  t = t.replace(/^#{1,2}\s+.*\n+/, "");
  if (baslik) t = t.replace(new RegExp(`^#{1,3}\\s*${baslik.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`), "");
  return t.trim();
}

const kullanim = { girdi: 0, cikti: 0, dusunme: 0, cache_yazma: 0, cache_okuma: 0, cagri: 0 };
async function tekCagri(b, ekNot = "") {
  const hedef = kelimeHedefi(b);
  const user = `BÖLÜM: ${b.baslik}\n\nGÖREV: ${b.is}\n\nUZUNLUK: yaklaşık ${hedef} kelime.${ekNot}\n\nYalnızca bu bölümün içeriğini yaz.`;
  for (let r = 0; ; r++) {
    try {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 20000,
        output_config: { effort: EFFORT },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        messages: [{ role: "user", content: user }],
      });
      const fin = await stream.finalMessage();
      const u = fin.usage || {};
      kullanim.cagri++;
      kullanim.girdi += u.input_tokens || 0;
      kullanim.cikti += u.output_tokens || 0;
      kullanim.dusunme += u.output_tokens_details?.thinking_tokens || 0;
      kullanim.cache_yazma += u.cache_creation_input_tokens || 0;
      kullanim.cache_okuma += u.cache_read_input_tokens || 0;
      if (fin.stop_reason === "refusal") throw Object.assign(new Error(`Model bölümü reddetti (${fin.stop_details?.category || "?"})`), { kalici: true });
      const metin = fin.content.filter((x) => x.type === "text").map((x) => x.text).join("");
      return { metin, stop: fin.stop_reason, model: fin.model };
    } catch (e) {
      if (e.kalici || r >= 5 || !gecici(e)) throw e;
      const bek = Math.min(2 ** (r + 1) * 1000, 45000) + Math.floor(Math.random() * 1000);
      console.warn(`⏳ [${b.key}] geçici hata (${e?.status || e?.message}) → ${Math.round(bek / 1000)} sn sonra tekrar`);
      await sleep(bek);
    }
  }
}

async function bolumUret(b) {
  const hedef = kelimeHedefi(b);
  let son = null;
  for (let deneme = 1; deneme <= 2; deneme++) {
    const t0 = Date.now();
    const ek = deneme > 1 ? "\n\nNOT: Önceki deneme çok kısa ya da yarım kaldı. Bölümü eksiksiz ve istenen uzunlukta yaz." : "";
    const r = await tekCagri(b, ek);
    const metin = temizle(r.metin, b.baslik);
    const kelime = metin.split(/\s+/).filter(Boolean).length;
    console.error(`  · ${b.key}: ${kelime} kelime (hedef ${hedef}) · ${r.stop} · ${Math.round((Date.now() - t0) / 1000)} sn`);
    son = { key: b.key, baslik: b.baslik, metin, kelime, model: r.model };
    if (r.stop !== "max_tokens" && kelime >= hedef * 0.45) return son;
  }
  if (!son || son.kelime < 60) throw new Error(`Bölüm üretilemedi: ${b.baslik}`);
  return son;
}

async function havuz(list, n, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
    while (i < list.length) { const k = i++; out[k] = await fn(list[k]); }
  }));
  return out;
}

if (process.argv.includes("--baglam")) { console.log(BAGLAM); process.exit(0); }

console.error(`\n${"=".repeat(60)}\n  PRO SENTEZ · MODEL: ${MODEL} · effort: ${EFFORT} · ${aktifBolumler.length} bölüm · paralel ${ESZAMAN}\n${"=".repeat(60)}`);
const t0 = Date.now();
try {
  // 1) İlk bölüm tek başına: sistem + harita bağlamını cache'e yazar; kalanlar cache'ten okur.
  const ilk = await bolumUret(aktifBolumler[0]);
  const kalan = await havuz(aktifBolumler.slice(1), ESZAMAN, bolumUret);
  const sections = [ilk, ...kalan];
  const [pin, pout, pcw, pcr] = FIYAT[MODEL] || FIYAT["claude-opus-5-5"];
  const usd = (kullanim.girdi * pin + kullanim.cikti * pout + kullanim.cache_yazma * pcw + kullanim.cache_okuma * pcr) / 1e6;
  const sure = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(path.join(IO, "rapor-pro.json"), JSON.stringify({
    model: MODEL, effort: EFFORT, sections, usage: kullanim, maliyet_usd: Number(usd.toFixed(4)), sure_sn: sure,
  }, null, 2), "utf8");
  const toplamKelime = sections.reduce((t, s) => t + s.kelime, 0);
  console.error(`\n[✓ rapor-pro.json | ${sections.length} bölüm · ${toplamKelime} kelime · ${sure} sn | token: girdi ${kullanim.girdi}, cache yazma ${kullanim.cache_yazma}, cache okuma ${kullanim.cache_okuma}, çıktı ${kullanim.cikti} (düşünme ${kullanim.dusunme}) | maliyet ~$${usd.toFixed(3)}]`);
  // pipeline bu satırı ayrıştırır
  console.log(`PRO_MALIYET ${JSON.stringify({ usd: Number(usd.toFixed(4)), girdi: kullanim.girdi + kullanim.cache_yazma + kullanim.cache_okuma, cikti: kullanim.cikti, dusunme: kullanim.dusunme, model: MODEL, sure })}`);
} catch (e) {
  const t = e?.error?.error?.type || e?.error?.type;
  console.error("❌", e instanceof Anthropic.APIError ? `API ${e.status} ${t || ""}: ${e.message}` : e.message);
  process.exit(1);
}
