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
    L.push(`  · transit Jüpiter ${o.transit_evler["Jüpiter"].ev}. ev, transit Satürn ${o.transit_evler["Satürn"].ev}. ev${o.progresif_ay ? ` · progresif Ay ${o.progresif_ay.burc} ${o.progresif_ay.deg} (${o.progresif_ay.ev}. ev)` : ""}${o.progresif_ay_acilari?.length ? " · " + o.progresif_ay_acilari.join("; ") : ""}`);
  }
}
// ---------------- Ürün (rapor türü) ----------------
const URUN = chart.urun || "natal";
const URUN_BILGI = {
  natal:   { ad: "Natal Pro Rapor", tarif: "doğum haritasının bütünlüklü, her alanı kapsayan profesyonel analizi",
             temalar: "Kimlik, İlişkiler, Kariyer ve Para, Önümüzdeki Dönem" },
  ask:     { ad: "Aşk & İlişki Pro Rapor", tarif: "doğum haritasının aşk, ilişki, bağlanma ve partnerlik odaklı profesyonel analizi. Odak: Venüs, Mars, Ay, Güneş, 5. ev (flört, romantizm), 7. ev (evlilik, ortaklık), 8. ev (yakınlık, cinsellik, bağ), bu evlerin yöneticileri ve Alçalan",
             temalar: "Sevgi Dili, Çekim ve Arzu, Bağlanma ve Güven, İlişki Zamanlaması" },
  kariyer: { ad: "Kariyer & Para Pro Rapor", tarif: "doğum haritasının kariyer, meslek, para ve toplumsal yön odaklı profesyonel analizi. Odak: MC ve yöneticisi, 10. ev (kariyer, itibar), 6. ev (iş, çalışma düzeni), 2. ev (para, değerler), Güneş, Satürn, Jüpiter, Merkür",
             temalar: "Mesleki Kimlik, Çalışma Tarzı, Para ve Değer, Kariyer Zamanlaması" },
  saglik:  { ad: "Enerji & Mizaç Pro Rapor", tarif: "doğum haritasının enerji, canlılık, mizaç (klasik dört mizaç), beden-zihin dengesi ve yaşam ritmi odaklı profesyonel analizi. Odak: Yükselen ve yöneticisi, 1. ev (beden, canlılık), 6. ev (günlük düzen, dayanıklılık), 8. ev (yenilenme), Güneş, Ay, Mars, Satürn, element dengesi. Tıbbi tanı, tedavi ya da ilaç önerisi YOK; yalnızca astrolojik eğilim ve öz bakım farkındalığı",
             temalar: "Enerji ve Canlılık, Duygusal Ritim, Stres ve Denge, Yaşam Ritmi" },
  lilith:  { ad: "Lilith & Karmik Pro Rapor", tarif: "doğum haritasının karmik, ruhsal ve gölge odaklı profesyonel analizi. Odak: Ay Düğümleri ekseni (Kuzey/Güney Düğüm), Kiron, Lilith (Kara Ay), Satürn, Plüton, 12. ev (bilinçaltı), 8. ev (dönüşüm), 4. ev (kökler, aile mirası) ve bu noktalarla temas eden gezegenler. Reenkarnasyon iddiası kurmadan, sembolik ve psikolojik dille",
             temalar: "Karmik Geçmiş, Gölge ve Güç, Yara ve Şifa, Ruhsal Yön" },
  solar:   { ad: "Solar Return Pro Rapor", tarif: "Solar Return (yıl dönümü) haritasının, doğum gününden bir sonrakine kadar olan yılın temaları ve zamanlaması odaklı profesyonel analizi. Odak: SR Yükselen ve yöneticisi, açısal SR gezegenleri, SR Güneş ve Ay, SR evleri, SR gezegenlerinin natal evlere düşüşü, SR → natal çapraz açılar, yıllık profeksiyon ve yılın lordu, Güneş takvimi ve SR yılı transitleri",
             temalar: "Yılın Tonu, İlişkiler, Kariyer ve Para, Yılın Zamanlaması" },
  aylik:   { ad: "Aylık Dönem Pro Rapor", tarif: "önümüzdeki 30 günün kişiye özel transit analizi. Odak: hızlı gezegen transitleri (Güneş, Merkür, Venüs, Mars), arka plandaki yavaş gezegen transitleri, Yeni Ay ve Dolunay, retro istasyonları, burç geçişleri ve Ay'ın natal evlerden geçişi; gün ve hafta düzeyinde somut zamanlama",
             temalar: "Ayın Teması, İlişkiler, İş ve Para, Uygun ve Dikkat Günleri" },
  sinastri: { ad: "Sinastri Pro Rapor", tarif: `iki kişinin (${chart.sinastri?.adA || ""} ve ${chart.sinastri?.adB || ""}) ilişki uyumu odaklı profesyonel sinastri analizi. İlişki türü: ${chart.sinastri?.iliski_ad || ""}. Odak: iki doğum haritası, çapraz açılar, iki yönlü ev bindirmeleri, kompozit harita ve ilişkinin zamanlaması. İki kişiye de adıyla değin; birini suçlayan ya da 'uyumsuz' diye hüküm veren dil yok`,
             temalar: "Çekim ve Yakınlık, İletişim, Gerilim ve Denge, Ortak Gelecek" },
};
const UB = URUN_BILGI[URUN] || URUN_BILGI.natal;

// Ürün odağı bağlamı (compute_pro: chart.odak)
const O = chart.odak || {};
if (URUN !== "natal" && O.noktalar) {
  L.push(`\n## RAPOR ODAĞI: ${UB.ad}`);
  L.push(`- Odak noktaları: ${O.noktalar_ad.join(", ")}`);
  for (const h of O.evler) L.push(`- Odak ev: ${h.n}. ev ${h.sign} (${h.konu}) · yöneticisi ${h.yonetici} → ${h.yonetici_ev}. ev (${h.yonetici_burc}) · içindekiler: ${h.icindekiler.length ? h.icindekiler.join(", ") : "boş"}`);
  if (O.acilar?.length) L.push(`- Odak açıları: ${O.acilar.map((a) => `${a.a_ad} ${a.ad} ${a.b_ad} (${a.orb}°)`).join("; ")}`);
  for (const k of O.karmik || []) {
    L.push(`- ${k.ad}: ${k.sign} ${k.deg}, ${k.house}. ev · burç yöneticisi ${k.yonetici} (${k.yonetici_burc}, ${k.yonetici_ev}. ev) · temaslar: ${k.temaslar.length ? k.temaslar.map((t) => `${t.ad} ${t.aci} (${t.orb}°)`).join("; ") : "yok"}`);
  }
  L.push("- Transit listesi bu raporun odak noktalarına göre filtrelenmiştir.");
}
if (chart.mizac) L.push(`- Klasik mizaç (7 gezegen + Yükselen): ${chart.mizac.ad} (${chart.mizac.tabiat}) · element sayımı: ${Object.entries(chart.mizac.element8).map(([k, v]) => `${k} ${v}`).join(", ")}`);
// --- Solar Return Pro bağlamı ---
const SRP = chart.sr_pro;
if (SRP) {
  const H = SRP.harita;
  L.push(`\n## SOLAR RETURN (YIL) HARİTASI · ${SRP.yil} · an: ${SRP.an} · yer: ${SRP.yer}${SRP.relocated ? " (yer değiştirmeli SR: doğum gününde bulunulacak yere göre)" : " (doğum yerine göre)"} · geçerlilik: bir sonraki doğum gününe (${SRP.bitis}) kadar`);
  L.push(`- SR Yükselen ${H.asc.sign} ${H.asc.deg} (natal ${SRP.natal_ev_kose.asc}. eve düşüyor) · SR MC ${H.mc.sign} ${H.mc.deg} (natal ${SRP.natal_ev_kose.mc}. eve düşüyor) · SR harita yöneticisi ${H.harita_yoneticisi.ad} (${H.harita_yoneticisi.sign}, SR ${H.harita_yoneticisi.house}. ev)`);
  L.push(`- Açısal SR gezegenleri (1/4/7/10. SR evleri): ${SRP.acisal.join(", ") || "yok"} · SR Ay fazı: ${H.ay_fazi.ad}`);
  L.push("- SR gezegenleri (burç derece · SR evi · natal evi):");
  for (const p of H.planets) L.push(`  · ${p.ad}: ${p.sign} ${p.deg} · SR ${p.house}. ev · natal ${p.natal_ev}. ev${p.retro ? " · RETRO" : ""}`);
  L.push("- SR evleri: " + H.houses.map((h) => `${h.n}. ${h.sign} (yön. ${h.yonetici} → ${h.yonetici_ev}. ev${h.icindekiler.length ? "; " + h.icindekiler.join(", ") : ""})`).join(" · "));
  L.push("- SR açıları: " + H.aspects.filter((a) => a["majör"]).slice(0, 16).map((a) => `${a.a_ad} ${a.ad} ${a.b_ad} (${a.orb}°)`).join("; "));
  L.push("- SR → natal çapraz açılar (orb ≤3°): " + SRP.capraz.slice(0, 16).map((c) => `SR ${c.a_ad} ${c.ad} natal ${c.b_ad} (${c.orb}°)`).join("; "));
  const PF = SRP.profeksiyon;
  L.push(`- Profeksiyon: ${PF.yas} yaş yılı → natal ${PF.ev}. ev (${PF.burc}) · yılın lordu ${PF.lord} · natalde ${PF.lord_natal} · SR'de ${PF.lord_sr}`);
  L.push("- Güneş takvimi (Güneş'in SR yılı boyunca burç geçişleri; ay ay ritim): " + SRP.gunes_takvim.map((t) => `${t.tarih}: ${t.burc} (SR ${t.sr_ev}. ev, natal ${t.natal_ev}. ev)`).join(" → "));
  L.push(`- SR element dengesi: ${Object.entries(H.denge.element).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  L.push("- NOT: Yukarıdaki TRANSİTLER bölümü SR yılını (SR anından itibaren 12 ay) kapsar.");
}
// --- Sinastri Pro bağlamı ---
const SN = chart.sinastri;
if (SN) {
  const B = chart.kisi_b;
  L.push(`\n## İKİNCİ KİŞİ: ${SN.adB} · doğum ${B.meta.tarih} ${B.meta.saat} · ${B.meta.yer} · saat güveni ${GUVEN[B.meta.zaman_guven] || B.meta.zaman_guven}`);
  L.push(`- İlişki türü: ${SN.iliski_ad} · Birinci kişi (danışan): ${SN.adA}`);
  L.push(`- ${SN.adB} Yükselen ${B.asc.sign} ${B.asc.deg} · MC ${B.mc.sign} ${B.mc.deg} · harita yöneticisi ${B.harita_yoneticisi.ad}`);
  for (const p of B.planets) L.push(`  · ${SN.adB} ${p.ad}: ${p.sign} ${p.deg} · ${p.house}. ev · ${p.dignity}${p.retro ? " · RETRO" : ""}`);
  for (const q of B.points.filter((x) => ["kuzey", "lilith", "chiron"].includes(x.id))) L.push(`  · ${SN.adB} ${q.ad}: ${q.sign} ${q.deg} · ${q.house}. ev`);
  L.push(`- ${SN.adB} kendi açıları (en belirleyici): ` + B.aspects.filter((a) => a["majör"]).slice(0, 12).map((a) => `${a.a_ad} ${a.ad} ${a.b_ad} (${a.orb}°)`).join("; "));
  L.push(`- Element: ${SN.adA} ${Object.entries(chart.denge.element).map(([k, v]) => `${k} ${v}`).join("/")} · ${SN.adB} ${Object.entries(B.denge.element).map(([k, v]) => `${k} ${v}`).join("/")}`);
  L.push(`- Nitelik: ${SN.adA} ${Object.entries(chart.denge.nitelik).map(([k, v]) => `${k} ${v}`).join("/")} · ${SN.adB} ${Object.entries(B.denge.nitelik).map(([k, v]) => `${k} ${v}`).join("/")}`);
  L.push(`\n## SİNASTRİ: ÇAPRAZ AÇILAR (${SN.adA} gezegeni → ${SN.adB} gezegeni; en belirleyiciden) · toplam ${SN.sayim.toplam}: uyumlu ${SN.sayim.uyumlu}, gergin ${SN.sayim.gergin}, kavuşum ${SN.sayim.kavusum}`);
  for (const c of SN.capraz.slice(0, 32)) L.push(`- ${SN.adA} ${c.a_ad} ${c.ad} ${SN.adB} ${c.b_ad} · orb ${c.orb}° · ${c.uyum}`);
  L.push(`- Çekim göstergeleri: ${SN.cekim.map((c) => `${SN.adA} ${c.a_ad} ${c.ad} ${SN.adB} ${c.b_ad} (${c.orb}°)`).join("; ") || "belirgin yok"}`);
  L.push(`- Zorlayıcı temaslar (Satürn/Plüton ↔ kişisel): ${SN.zorlayici.map((c) => `${SN.adA} ${c.a_ad} ${c.ad} ${SN.adB} ${c.b_ad} (${c.orb}°)`).join("; ") || "belirgin yok"}`);
  L.push(`\n## EV BİNDİRMELERİ`);
  L.push(`- ${SN.adA}'nin gezegenleri ${SN.adB}'nin evlerinde: ` + SN.bindirme_ab.map((x) => `${x.ad} → ${x.house}. ev`).join(", "));
  L.push(`- ${SN.adB}'nin gezegenleri ${SN.adA}'nin evlerinde: ` + SN.bindirme_ba.map((x) => `${x.ad} → ${x.house}. ev`).join(", "));
  const K = SN.kompozit;
  L.push(`\n## KOMPOZİT HARİTA (orta nokta; ilişkinin kendisi) · Yükselen ${K.asc.sign} ${K.asc.deg} · MC ${K.mc.sign} ${K.mc.deg}`);
  for (const p of K.planets) L.push(`- Kompozit ${p.ad}: ${p.sign} ${p.deg} · ${p.house}. ev`);
  L.push("- Kompozit açılar: " + K.aspects.slice(0, 16).map((a) => `${a.a_ad} ${a.ad} ${a.b_ad} (${a.orb}°)`).join("; "));
  L.push("- NOT: Yukarıdaki TRANSİTLER bölümü KOMPOZİT haritanın noktalarına göredir (ilişkinin zamanlaması); YAŞAM OLAYLARI da kompozit haritaya göre hesaplandı (ilişkinin olayları).");
}
// --- Aylık Dönem Pro bağlamı ---
const AYP = chart.aylik_pro;
if (AYP) {
  L.push(`\n## DÖNEM: ${AYP.baslangic} – ${AYP.bitis} (${AYP.gun} gün)`);
  L.push("- NOT: Yukarıdaki TRANSİTLER bölümü bu 30 günü kapsar ve hızlı gezegenleri (Güneş, Merkür, Venüs, Mars; orb ≤1°) de içerir.");
  L.push("- Dönem başında gökyüzü (natal evlere göre): " + AYP.gokyuzu.planets.map((p) => `${p.ad} ${p.sign} ${p.deg} (${p.house}. ev${p.retro ? ", retro" : ""})`).join(" · "));
  L.push("- Dönem başında transit → natal açılar (orb ≤3°): " + AYP.capraz.slice(0, 14).map((c) => `transit ${c.b_ad} ${c.ad} natal ${c.a_ad} (${c.orb}°)`).join("; "));
  for (const l of AYP.lunasyon) L.push(`- ${l.ad}: ${l.tarih} ${l.saat} · ${l.burc} ${l.deg} · natal ${l.ev}. ev${l.tutulma ? " · Ay düğümüne yakın (tutulma sezonu)" : ""} · natal temaslar: ${l.temaslar.length ? l.temaslar.map((t) => `${t.ad} ${t.natal} (${t.orb}°)`).join("; ") : "yok"}`);
  if (AYP.istasyon.length) L.push("- İstasyonlar: " + AYP.istasyon.map((x) => `${x.gezegen} ${x.tip} (${x.tarih}, ${x.burc} ${x.deg}, natal ${x.ev}. ev)`).join("; "));
  L.push("- Ay'ın natal evlerden geçişi: " + AYP.ay_gecis.map((x) => `${x.tarih}${x.saat ? " " + x.saat : ""}: ${x.burc} (${x.ev}. ev)`).join(" → "));
}
const BAGLAM = L.join("\n");

// ---------------- Bölüm planı ----------------
// Hedef: toplam ~6.000-6.500 kelime yorum → veri sayfalarıyla birlikte ~30-34 sayfalık PDF.
// Ortak bölümler (özet, sorular, olaylar, zamanlama, seans rehberi, grafik yorumları) her üründe var;
// derin yorum bölümleri ürüne özgü.
const ORTAK_BAS = [
  { key: "ozet", baslik: "Yönetici Özeti", kelime: 300,
    is: `Bu ${UB.ad} için kuşbakışı portre. Önce 1 paragrafta ${ad}'nin haritasının bu konudaki ana hikâyesini anlat. Ardından "### Ana Temalar" alt başlığıyla 5-6 maddelik, her biri tek cümlelik ve teknik dayanaklı bir tema listesi ver. Sonda 2 Astrolog Önerisi (\`> \` satırı).` },
];
const DERIN = {
  natal: [
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
  ],
  ask: [
    { key: "a_benlik", baslik: "İlişkide Benlik: Güneş, Ay, Yükselen ve Alçalan", kelime: 550,
      is: "Alt başlıklarla: Güneş (ilişkide neyle parlıyor, neyi talep ediyor), Ay (duygusal güvenlik ihtiyacı, bağlanma biçimi), Yükselen–Alçalan ekseni (kendini nasıl sunuyor, karşısında neyi arıyor, yansıtma). Son alt başlık \"### İlişkideki Çekirdek İhtiyaç\"." },
    { key: "a_venusmars", baslik: "Venüs ve Mars: Sevgi Dili ve Arzu", kelime: 800,
      is: "\"### Venüs\" (burç, ev, öz-onur, açılar: nasıl sever, neye değer verir, nasıl sevilmek ister, estetik ve zevk), \"### Mars\" (burç, ev, açılar: arzu, çekim, cinsel enerji, çatışma ve öfke tarzı), \"### Venüs–Mars Dinamiği\" (aralarındaki açı ya da açı yoksa element/nitelik ilişkisi; çekim ile sevgi arasındaki uyum)." },
    { key: "a_evler", baslik: "İlişki Evleri: 5., 7. ve 8. Ev", kelime: 700,
      is: "Her ev için alt başlık: burç, yönetici ve yöneticinin bulunduğu ev (ev zinciri hikâyesi), içindeki gezegenler. 5. ev: flört, romantizm, keyif; 7. ev: evlilik ve bağlayıcı ortaklık, partnerde aranan nitelikler; 8. ev: derin bağ, mahremiyet, ortak kaynaklar, krizle dönüşüm." },
    { key: "a_acilar", baslik: "İlişki Açıları ve Bağlanma Kalıpları", kelime: 600,
      is: "Odak açılarından en belirleyici 5-6 tanesini alt başlıklarla işle (Venüs/Mars/Ay'ın Satürn, Plüton, Uranüs, Neptün ile temasları öncelikli): her birinin ilişkide yarattığı kalıp, tekrarlayan senaryo, gölge ve olgun ifadesi. Sonda \"### Tekrarlayan Senaryo\" alt başlığıyla ana bağlanma kalıbı." },
    { key: "a_karmik", baslik: "Bağlanma Yaraları ve İlişki Dersleri", kelime: 400,
      is: "Kiron, Lilith ve Ay Düğümleri ekseninin ilişkilere yansıması; Satürn'ün ilişkide yarattığı korku ya da sorumluluk; ilişki üzerinden öğrenilecek ana ders. Sembolik ve psikolojik dil." },
    { key: "a_partner", baslik: "Uyumlu Partner Profili ve İlişki Önerileri", kelime: 450,
      is: "7. ev burcu ve yöneticisi, Alçalan, Venüs ve Mars elementlerinden yola çıkarak: ona iyi gelen partner nitelikleri (burç ve element eğilimleri dahil, kesin hüküm olmadan), zorlanabileceği dinamikler ve ilişkiyi besleyen somut öneriler (madde listesi)." },
  ],
  kariyer: [
    { key: "k_kimlik", baslik: "Mesleki Kimlik: Güneş, Satürn ve Harita Yöneticisi", kelime: 550,
      is: "Güneş (yaratıcı amaç, görünürlük), Satürn (ustalık alanı, sorumluluk, korku ve disiplin), harita yöneticisi ve güç sıralaması (hangi gezegen iş hayatında öne çıkıyor) için alt başlıklar. Son alt başlık \"### Çekirdek Mesleki Motivasyon\"." },
    { key: "k_mc", baslik: "Kariyer Yönü: MC, 10. Ev ve Yöneticisi", kelime: 700,
      is: "MC burcu ve derecesi, MC yöneticisinin konumu (burç, ev, açılar), 10. evin içindekileri ve MC'ye açılar. Toplumsal rol, itibar, kariyer yolu ve hedef. Sonda MC zincirinin tek cümlelik özeti." },
    { key: "k_tarz", baslik: "Çalışma Tarzı ve Günlük İş: 6. Ev, Merkür ve Mars", kelime: 550,
      is: "6. ev (burç, yönetici, içindekiler: ideal çalışma düzeni, iş ortamı, hizmet biçimi), Merkür (düşünme, iletişim, karar verme), Mars (girişim, rekabet, enerji yönetimi). Ekiple mi tek başına mı, liderlik mi uzmanlık mı." },
    { key: "k_para", baslik: "Para ve Değerler: 2. ve 8. Ev, Venüs ve Jüpiter", kelime: 600,
      is: "2. ev (kendi kazancı, para ile ilişkisi, öz-değer), 8. ev (ortak kaynaklar, yatırım, borç, başkalarının parası), Venüs (değer ve kazanç), Jüpiter (büyüme ve fırsat). Para kalıpları, risk iştahı ve sürdürülebilir kazanç önerileri (yatırım tavsiyesi değil)." },
    { key: "k_yetenek", baslik: "Yetenekler, Uygun Meslek Alanları ve Engeller", kelime: 650,
      is: "Element/nitelik dengesi, güçlü gezegenler ve odak açılardan yola çıkarak: \"### Doğal Yetenekler\", \"### Uygun Meslek ve Sektör Alanları\" (8-12 somut alan, her birinin yanında parantez içinde hangi yerleşimden geldiği; danışanın mevcut mesleği verildiyse onunla bağla), \"### Engeller ve Gelişim Alanları\"." },
  ],
  saglik: [
    { key: "s_mizac", baslik: "Mizaç ve Element Dengesi", kelime: 600,
      is: "Klasik mizaç (safravi, demevi, balgami, sevdavi ya da karma) ve tabiatı (sıcak-kuru vb.), baskın ve eksik element, nitelik dengesi: bedenin ve zihnin doğal temposu. \"### Mizacın Güçlü Yanları\" ve \"### Dengeleme Gereken Yanlar\" alt başlıkları." },
    { key: "s_canlilik", baslik: "Canlılık ve Enerji: Güneş, Mars ve Yükselen", kelime: 600,
      is: "Güneş (yaşam gücü), Mars (fiziksel enerji, dayanıklılık, öfke ve hareket ihtiyacı), Yükselen ve yöneticisi (beden yapısı, ilk tepki) için alt başlıklar; açılarıyla enerjinin nasıl aktığı ya da tıkandığı." },
    { key: "s_ritim", baslik: "Duygusal Ritim ve Beden: Ay ve Satürn", kelime: 500,
      is: "Ay (duygusal ritim, beslenme ve uyku ilişkisi, güvenlik ihtiyacı), Satürn (yorgunluk, kısıtlanma hissi, dayanıklılık ve disiplin), 4. ve 12. evin dinlenme ve geri çekilme ihtiyacına etkisi." },
    { key: "s_rutin", baslik: "Günlük Düzen ve Dayanıklılık: 6. ve 8. Ev", kelime: 550,
      is: "6. ev (burç, yönetici, içindekiler: günlük rutin, iş yükü, beden bakımı alışkanlıkları), 8. ev (kriz sonrası toparlanma, yenilenme kapasitesi). Tıbbi tanı yok." },
    { key: "s_stres", baslik: "Stres Kalıpları ve Hassas Alanlar", kelime: 500,
      is: "Gergin odak açılarından yola çıkarak stresin nasıl biriktiği ve nerede kendini gösterdiği; geleneksel astrolojide burç ve gezegenlerin ilişkilendirildiği beden bölgeleri (yalnızca sembolik farkındalık olarak, tanı ve kesin hüküm OLMADAN; gerekirse uzmana danışma önerisi)." },
    { key: "s_yasam", baslik: "Sana Uygun Yaşam Ritmi ve Pratikler", kelime: 450,
      is: "Mizaca ve element dengesine uygun somut öneriler: hareket türü, dinlenme biçimi, beslenme ritmi (genel, diyet önerisi değil), doğa/sosyal/yaratıcı denge pratikleri. Madde listesi ağırlıklı." },
  ],
  lilith: [
    { key: "l_dugum", baslik: "Ay Düğümleri: Karmik Geçmiş ve Gelişim Yönü", kelime: 750,
      is: "\"### Güney Düğüm\" (burç, ev, yöneticisi: konfor alanı, geçmişten gelen ustalık ve tuzak), \"### Kuzey Düğüm\" (burç, ev, yöneticisi: büyüme yönü, bu hayatın davet ettiği beceri), \"### Düğümlere Temas Eden Gezegenler\" (temaslar listesinden), \"### Eksen Üzerinde Yürümek\"." },
    { key: "l_lilith", baslik: "Lilith: Gölge, Bastırılmış Güç ve Otantiklik", kelime: 550,
      is: "Lilith'in burcu, evi, yöneticisi ve temasları: bastırılan ya da reddedilen yan, utanç ve öfke noktaları, sınır koyma, otantik güce dönüşme yolu." },
    { key: "l_kiron", baslik: "Kiron: Yara ve Şifacılık", kelime: 550,
      is: "Kiron'un burcu, evi ve temasları: çekirdek yara, telafi davranışları, yaranın başkalarına şifa kapasitesine dönüşmesi. Kiron dönüşü ya da karesi yaşa göre veriden çıkarılabiliyorsa belirt." },
    { key: "l_sinav", baslik: "Satürn ve Plüton: Karmik Sınavlar ve Dönüşüm", kelime: 500,
      is: "Satürn (sınav, sorumluluk, korku, olgunlaşma) ve Plüton (güç, kontrol, ölüm-yeniden doğuş temaları) için alt başlıklar; kişisel gezegenlerle temasları ve ev konumlarıyla tekrar eden dersler." },
    { key: "l_bilincalti", baslik: "Bilinçaltı ve Aile Mirası: 12., 8. ve 4. Ev", kelime: 450,
      is: "12. ev (bilinçaltı, gizli örüntüler, ruhsal geri çekilme), 8. ev (dönüşüm, miras, tabular), 4. ev (aile mirası, atalardan gelen kalıplar) için kısa alt başlıklar; yöneticileri ve içindekiler." },
    { key: "l_oruntu", baslik: "Tekrar Eden Örüntüler ve Ruhsal Bütünleşme", kelime: 450,
      is: "Önceki bölümlerdeki temaları birleştir: tekrar eden 3-4 karmik örüntü (madde listesi, her biri teknik dayanaklı) ve \"### Bütünleşme Yolu\" alt başlığıyla somut ruhsal pratikler." },
  ],
  solar: [
    { key: "sr_ton", baslik: "Yılın Tonu: SR Yükselen, Yöneticisi ve Açısal Gezegenler", kelime: 600,
      is: "SR Yükselen burcu ve derecesi, natal haritada hangi eve düştüğü, SR harita yöneticisinin konumu ve açısal (1/4/7/10. ev) SR gezegenleri için alt başlıklar. Yılın genel karakteri ve kişinin bu yıl nasıl bir 'kostüm' giydiği. Yer değiştirmeli SR ise bunun anlamına bir cümle." },
    { key: "sr_isiklar", baslik: "SR Güneş ve Ay: Yılın Odağı ve Duygusal İklimi", kelime: 600,
      is: "\"### SR Güneşi\" (SR evi ve natal evi: yılın ana sahnesi, enerjinin toplandığı alan), \"### SR Ayı\" (burç, SR evi, natal evi, açıları: duygusal iklim, ihtiyaçlar, değişkenlik), \"### Işıkların Diyaloğu\" (SR Ay fazı ve Güneş–Ay ilişkisi)." },
    { key: "sr_evler", baslik: "Yılın Sahneleri: SR Evleri", kelime: 750,
      is: "SR evlerini öne çıkanlardan başlayarak işle: dolu SR evleri (içindeki gezegenler ve yöneticiler) için alt başlıklar ve 2-4 cümle; boş evleri tek paragrafta topla. Her evde: bu yıl o yaşam alanında ne hareketleniyor." },
    { key: "sr_natal", baslik: "Yıl Haritası ile Doğum Haritasının Buluşması", kelime: 600,
      is: "SR gezegenlerinin natal evlere düşüşü (özellikle Güneş, Ay, Venüs, Mars, Jüpiter, Satürn), SR Yükselen ve MC'nin natal evleri ve en sıkı SR → natal çapraz açılar: yılın doğum haritasındaki hangi temaları tetiklediği. Alt başlıklarla." },
    { key: "sr_lord", baslik: "Yılın Lordu: Profeksiyon", kelime: 400,
      is: "Yıllık profeksiyon: kaç yaş yılında olunduğu, aktive olan natal ev ve burç, yılın lordu gezegen; lordun natal ve SR konumu, yıl boyunca bu gezegenin transitlerinin neden önemli olduğu." },
    { key: "sr_alanlar", baslik: "Yılın Yaşam Alanları", kelime: 600,
      is: `Dört alt başlık, her biri 1-2 paragraf: "### Aşk ve İlişkiler" (SR Venüs, Mars, 5. ve 7. SR evleri), "### Kariyer ve Para" (SR MC, 10., 2. ve 6. SR evleri, Satürn/Jüpiter), "### Sağlık ve Enerji" (SR 1. ve 6. ev, Mars; tıbbi tanı yok), "### Aile ve Yuva" (SR 4. ev, Ay). Danışan bilgisi varsa bağla.` },
  ],
  aylik: [
    { key: "y_ton", baslik: "Ayın Tonu ve Ana Temaları", kelime: 550,
      is: "Dönemin genel atmosferi: dönem başındaki gökyüzünün natal evlere dağılımı, en ağır transitler ve istasyonlar. \"### Ana Temalar\" alt başlığıyla 4-5 maddelik, teknik dayanaklı tema listesi." },
    { key: "y_lunasyon", baslik: "Yeni Ay ve Dolunay: Ayın Dönüm Noktaları", kelime: 500,
      is: "Dönemdeki her Yeni Ay ve Dolunay için alt başlık (tarih + burç): natal evi, natal temasları, ne başlatmak ya da neyi tamamlamak için uygun olduğu. Tutulma sezonu notu varsa belirt." },
    { key: "y_hizli", baslik: "Hızlı Gezegenler: Güneş, Merkür, Venüs ve Mars", kelime: 650,
      is: "Bu 30 günde Güneş, Merkür, Venüs ve Mars'ın natal noktalara yaptığı transitler ve burç/ev geçişleri; varsa retro istasyonları (Merkür/Venüs/Mars retrosu ise pratik öneriler). Her gezegen için alt başlık; tarihleriyle." },
    { key: "y_yavas", baslik: "Arka Plandaki Büyük Döngüler", kelime: 450,
      is: "Dönem boyunca etkin olan yavaş gezegen transitleri (Jüpiter, Satürn, Uranüs, Neptün, Plüton, Kuzey Düğüm) ve istasyonları: bu ayın daha uzun bir sürecin hangi aşamasına denk geldiği." },
    { key: "y_alanlar", baslik: "Ayın Yaşam Alanları", kelime: 550,
      is: `Dört alt başlık, her biri 1 yoğun paragraf ve tarih vurgusu: "### Aşk ve İlişkiler", "### İş, Para ve Sorumluluk", "### Enerji ve Beden" (tıbbi tanı yok), "### Ev, Aile ve İç Dünya". Danışan bilgisi varsa bağla.` },
  ],
  sinastri: [
    { key: "sn_kisiler", baslik: "İki Kişi: Temel Doğalar ve İhtiyaçlar", kelime: 600,
      is: "Her iki kişi için ayrı alt başlık (adlarıyla): Güneş, Ay, Yükselen, Venüs ve Mars üzerinden ilişkiye getirdikleri temel doğa ve ihtiyaçlar (kısa, yoğun). Son alt başlık \"### İki Doğanın Buluşması\": element ve nitelik karşılaştırması, birbirini tamamlayan ve zorlayan yanlar." },
    { key: "sn_cekim", baslik: "Çekim, Kimya ve Yakınlık", kelime: 650,
      is: "Çekim göstergelerini (Güneş–Ay, Venüs–Mars, Venüs–Venüs, Yükselen temasları) alt başlıklarla işle: bu ilişkide çekimin, sıcaklığın ve yakınlığın nereden geldiği. İlişki türüne uygun dil kullan (sevgili/eş ise romantik ve cinsel çekim; arkadaş/aile/iş ise yakınlık, güven ve iş birliği kimyası)." },
    { key: "sn_duygu", baslik: "Duygusal Bağ ve İletişim", kelime: 550,
      is: "Ay temasları (duygusal güvenlik, birbirini anlama) ve Merkür temasları (konuşma, tartışma, karar alma) için alt başlıklar; çapraz açılardan teknik dayanakla. Somut iletişim dinamikleri ve tıkanma noktaları." },
    { key: "sn_bindirme", baslik: "Ev Bindirmeleri: Birbirinizin Hayatındaki Yeri", kelime: 550,
      is: "İki yönlü ev bindirmeleri: her kişinin kişisel gezegenleri ve Yükselen'i diğerinin hangi evine düşüyor; birbirinin hangi yaşam alanını aktive ettiği. İki alt başlık (her yön için) ve bir özet paragraf." },
    { key: "sn_gerilim", baslik: "Gerilim Noktaları ve Satürn–Plüton Temasları", kelime: 550,
      is: "Gergin çapraz açılar ve zorlayıcı temaslar (Satürn/Plüton ↔ kişisel gezegenler): tekrarlayan çatışma senaryoları, güç ve kontrol dinamikleri, sorumluluk ve sınır meseleleri. Her biri için olgun ve yapıcı ifade yolu. Yargılamadan." },
    { key: "sn_kompozit", baslik: "Kompozit Harita: İlişkinin Kendisi", kelime: 600,
      is: "Kompozit Yükselen, Güneş, Ay, Venüs ve MC; kompozit açılar ve dolu kompozit evler: ilişkinin kendine ait karakteri, amacı ve dünyaya nasıl göründüğü. Alt başlıklarla." },
    { key: "sn_rehber", baslik: "İlişkiyi Besleyen Öneriler", kelime: 400,
      is: "Tüm analizi birleştirerek ilişki türüne uygun somut öneriler: güçlü yanları büyütmek, gerilim noktalarını yönetmek, ortak ritim ve iletişim pratikleri (madde listesi ağırlıklı). Kesin hüküm ya da 'uyumsuz' etiketi yok." },
  ],
};
const ZAMAN_BASLIK = {
  natal: "Önümüzdeki 12 Ay: Transitler, Progresyonlar ve Yıl Haritası",
  ask: "Önümüzdeki 12 Ay: Aşk ve İlişki Zamanlaması",
  kariyer: "Önümüzdeki 12 Ay: Kariyer ve Para Zamanlaması",
  saglik: "Önümüzdeki 12 Ay: Enerji Döngüleri ve Denge Zamanlaması",
  lilith: "Önümüzdeki 12 Ay: Karmik Tetikleyiciler ve Dönüşüm Pencereleri",
  solar: "Yılın Takvimi: Ay Ay Akış ve Transitler",
  aylik: "Hafta Hafta Takvim",
  sinastri: "İlişkinin Önümüzdeki 12 Ayı",
};
const ZAMAN_IS = {
  aylik: `Dönemin hafta hafta takvimi. Dönemi 4-5 haftaya böl; her hafta için "### [tarih aralığı]" alt başlığı ve altında o haftanın öne çıkan transitleri, lunasyon ve istasyonları (tarihleriyle) ile 2-3 cümlelik somut yönlendirme. Sonda "### Uygun Günler ve Dikkat Günleri" alt başlığıyla iki kısa madde listesi (tarih + gerekçe: ör. yeni başlangıç, görüşme, imza, dinlenme). Kesin olay kehaneti yok.`,
  solar: `SR yılının takvimi. Önce 1 paragraf yılın genel akışı. Sonra "### Ay Ay Akış" altında Güneş takvimindeki her güneş ayı için (tarih aralığı + burç + SR evi + natal evi) 1-2 cümlelik somut tema; madde listesi. Ardından "### Önemli Transit Pencereleri" altında SR yılındaki en ağır 6-8 transit penceresi (tarih aralığı + tam isabet + tema). Yılın lordunun transitlerine özellikle değin. Kesin olay kehaneti yok; pencere ve tema dili.`,
  sinastri: `İlişkinin önümüzdeki 12 ayı: kompozit haritaya yapılan transitler. Önce 1 paragraf genel ilişki iklimi. Sonra "### Zaman Çizelgesi" altında kronolojik madde listesi: en önemli 8-10 transit penceresi (tarih aralığı + tam isabet + ilişkiye yansıyan tek cümlelik tema). Sonda "### İlişki İçin Uygun Zamanlar" kısa paragrafı (birlikte karar, yeni başlangıç, yüzleşme için uygun ve zorlayıcı dönemler). Kesin olay kehaneti yok.`,
};
const ORTAK_SON = [
  { key: "zaman", baslik: ZAMAN_BASLIK[URUN] || ZAMAN_BASLIK.natal, kelime: URUN === "aylik" ? 1000 : URUN === "solar" ? 900 : 700,
    is: ZAMAN_IS[URUN] || `Bu raporun konusu (${UB.tarif.split(".")[0]}) açısından önümüzdeki 12 ay. Önce 1 paragraflık genel yıl tonu (Solar Return ve en ağır transitler). Sonra "### Zaman Çizelgesi" altında kronolojik madde listesi: yalnızca konuyla en ilgili 8-10 transit penceresi, her biri tarih aralığı + tam isabet + tek cümlelik somut tema (benzerlerini birleştir). Ardından "### Progresyonlar ve Solar Return" alt başlığıyla tek-iki paragraf. Kesin olay kehaneti yok; pencere ve tema dili.` },
  { key: "olaylar", baslik: URUN === "sinastri" ? "İlişkinin Olaylarının Astrolojik Okuması" : "Yaşam Olaylarının Astrolojik Okuması", kelime: 0, kosul: () => chart.olaylar.length > 0,
    is: URUN === "sinastri" ? "Verilen her ilişki olayı için ayrı alt başlık (tarih + olay) ve tek yoğun paragraf: o tarihte kompozit haritaya yapılan transitleri olayla ilişkilendir. Tetikleyici zayıfsa dürüstçe söyle. En sonda \"### Desen\" alt başlığıyla ilişkinin dönüm noktalarındaki ortak tema." : "Danışanın verdiği her yaşam olayı için ayrı alt başlık (tarih + olay) ve tek yoğun paragraf: o tarihteki tetikleyicileri (transitler, transit Jüpiter/Satürn evleri, progresif Ay) olayla ilişkilendir. Tetikleyici zayıfsa dürüstçe söyle. En sonda \"### Desen\" alt başlığıyla kısa bir ortak tema ve doğum saati doğrulamasına katkısı." },
  { key: "sorular", baslik: "Danışanın Soruları", kelime: 0, kosul: () => !!(dn.sorular && dn.sorular.trim()),
    is: "Danışanın odak sorularının HER BİRİNİ ayrı alt başlık yap (soruyu kısaltarak başlık olarak yaz). Her birine haritadan teknik dayanaklı, dengeli ve uygulanabilir 1-2 paragraflık bir cevap ver; zamanlama varsa transit/progresyon pencerelerine bağla. Kehanet yok, eğilim ve öneri dili." },
  { key: "seans", baslik: "Astrolog İçin Seans Rehberi", kelime: 1000,
    is: `Astroloğa bu danışana ve bu rapor konusuna (${UB.ad}) özel, uygulamaya hazır seans planı. Alt başlıklar (bu sırayla): "### Seans Akışı" (60 dakikalık seans için dakika aralıklı 5-6 maddelik akış; her adımda hangi konu ve haritanın hangi yerleşimi), "### Açılış" (astroloğun seansı açabileceği 2-3 cümle, \`> \` satırı olarak), "### Sorulacak Sorular" (konuyla ilgili temaları doğrulamak ve derinleştirmek için 8-10 soru; her birinin yanında parantez içinde hangi yerleşimden geldiği), "### Temalara Göre Söylenebilecek Cümleler" (${UB.temalar} için kısa birer giriş cümlesi ve her birinde 1-2 \`> \` satırı), "### Hassas Noktalar ve Dil Önerisi" (dikkatle ele alınacak konular ve nasıl dile getirilmeli; madde listesi), "### Danışana Öneriler ve Pratikler" (somut, uygulanabilir farkındalık çalışmaları; madde listesi), "### Takip Seansı Zamanlaması" (transit ve progresyon pencerelerine göre bir sonraki seans için 2-3 tarih önerisi ve gerekçesi), "### Kapanış" (seansı kapatmak için 1 \`> \` satırı). Danışanın soruları ve astroloğun notu varsa planı onlara göre kur.${URUN === "sinastri" ? " Seansa iki kişi birlikte de gelebilir, yalnız danışan da: akışta ve dil önerisinde ikisine göre ayrı ipuçları ver; iki kişiyi de adıyla an." : ""}` },
];
// Grafik/tablo yorum anahtarları (render_pro bu anahtarları ilgili figürün altına basar)
const VERI_ANAHTAR = URUN === "aylik"
  ? `"### cark" (doğum haritası ile dönem başındaki gökyüzünün çift çarkında ilk göze çarpan), "### gokyuzu" (dönemin gökyüzü tablosu: gezegenlerin hangi natal evlerden geçtiği), "### lunasyon" (Yeni Ay ve Dolunay tablosunun mesajı), "### takvim" (istasyonlar ve burç geçişleri), "### ay" (Ay'ın ev geçiş takviminin pratik kullanımı), "### transit" (30 günlük transit çizelgesindeki ana hareket)`
  : URUN === "solar"
  ? `"### cark" (yıl haritası çarkında ilk göze çarpan), "### natal" (doğum haritası çarkıyla yıl haritası arasındaki temel fark), "### konumlar" (SR gezegenleri ve natal evleri tablosunun ana mesajı), "### evler" (SR ev tablosunda yılın öne çıkan sahneleri), "### yil" (yıl göstergeleri: profeksiyon, yılın lordu, SR → natal çapraz açılar), "### takvim" (Güneş takviminde yılın ritmi), "### acilar" (SR açılarının baskın deseni), "### transit" (SR yılı transit çizelgesindeki ana hareket)`
  : URUN === "sinastri"
  ? `"### cark" (iki haritanın üst üste bindirildiği çift çarkta ilk göze çarpan), "### konumlar" (iki kişinin konum tablolarının karşılaştırması), "### capraz" (çapraz açı ızgarasının baskın deseni: uyum ve gerilim dengesi), "### bindirme" (ev bindirmelerinin ana mesajı), "### kompozit" (kompozit harita: ilişkinin kendi karakteri), "### denge" (iki kişinin element ve nitelik dengesinin karşılaştırması), "### transit" (ilişkinin 12 aylık transit çizelgesindeki ana hareket)`
  : URUN === "natal"
  ? `"### cark" (natal çarkın genel görünümü ve ilk göze çarpan), "### konumlar" (gezegen tablosundaki en belirleyici 2-3 yerleşim), "### evler" (dolu ve boş evlerin dağılımı), "### acilar" (açı ağının baskın deseni, uyumlu mu gergin mi), "### denge" (element, nitelik ve kutup dengesi), "### yarikure" (yarıküre ve çeyrek dağılımı), "### guc" (en güçlü ve en zorlanan gezegen), "### dispozitor" (dispozitör zincirinin merkezi), "### transit" (önümüzdeki 12 ayın transit çizelgesindeki ana hareket)`
  : `"### cark" (çarkta bu konu açısından ilk göze çarpan), "### konumlar" (gezegen tablosunda bu konu için en belirleyici 2-3 yerleşim), "### evler" (ev tablosunda bu konunun evleri), "### odak" (${UB.ad} odak tablosunun ana mesajı: odak noktaları ve evler${URUN === "lilith" ? ", karmik noktalar ve temasları" : ""}${URUN === "saglik" ? ", mizaç" : ""}), "### acilar" (bu konuya dokunan açıların baskın deseni), ${URUN === "saglik" ? `"### denge" (element, nitelik ve mizaç dengesi), "### yarikure" (yarıküre dağılımı ve enerji yönü), ` : ""}"### transit" (önümüzdeki 12 ayın bu konuya ilişkin transit çizelgesindeki ana hareket)`;
const VERI = { key: "veri", baslik: "Grafik ve Tablo Yorumları", kelime: URUN === "natal" ? 450 : 380,
  is: `Raporun veri sayfalarındaki her grafik ve tablonun altına "Astrolog Önerisi" kutusu olarak basılacak kısa yorumlar yaz. Aşağıdaki anahtarların HER BİRİNİ tam bu yazımla "### anahtar" satırıyla aç (küçük harf, Türkçe karaktersiz) ve altına 2-3 cümle yaz: astroloğun o grafiği/tabloyu danışana gösterirken söyleyebileceği cümleler, astroloğun ağzından, danışana ikinci tekil şahısla, teknik terimleri sadeleştirerek, bu haritaya ve bu rapor konusuna özgü. Başka başlık, giriş ya da \`> \` satırı yazma. Anahtarlar: ${VERI_ANAHTAR}.` };
const BOLUMLER = [...ORTAK_BAS, ...(DERIN[URUN] || DERIN.natal), ...ORTAK_SON, VERI];
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
  { type: "text", text: SYSTEM_TALIMAT + `\n\n## Bu rapor\nBu bir **${UB.ad}**: ${UB.tarif}. Tüm bölümleri bu odakla yaz; konu dışı genel natal yorumuna kayma (gerekli bağlamı kısa tut).` },
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

console.error(`\n${"=".repeat(60)}\n  PRO SENTEZ · ${UB.ad} · MODEL: ${MODEL} · effort: ${EFFORT} · ${aktifBolumler.length} bölüm · paralel ${ESZAMAN}\n${"=".repeat(60)}`);
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
