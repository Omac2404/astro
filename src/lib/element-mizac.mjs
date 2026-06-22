// element-mizac.mjs
// Doğum haritasından element dağılımı ve mizaç (klasik 4 tabiat) hesabı.
//
// YÖNTEM (dokümante, keyfi değil):
//  - Mizaç KLASİK bir kavramdır (4 hılt/tabiat). Bu yüzden hesap, klasik
//    7 gezegen + Yükselen üzerinden yapılır.
//  - Modern dış gezegenler (Uranüs/Neptün/Plüton) KUŞAKSAL sayıldığından,
//    kişisel mizaç hesabına KATILMAZ. (Tabiat öğretisi onların keşfinden
//    yüzyıllar önce vardır.)
//  - Her nokta EŞİT ağırlıkta sayılır (tam şeffaflık; gizli ağırlık yok).
//  - Bir noktanın elementi, bulunduğu BURCUN elementidir.

import { pathToFileURL } from "node:url";

const BURC_ELEMENT = {
  "Koç": "ates", "Aslan": "ates", "Yay": "ates",
  "Boğa": "toprak", "Başak": "toprak", "Oğlak": "toprak",
  "İkizler": "hava", "Terazi": "hava", "Kova": "hava",
  "Yengeç": "su", "Akrep": "su", "Balık": "su",
};

const ELEMENT_AD = { ates: "Ateş", toprak: "Toprak", hava: "Hava", su: "Su" };

// Baskın element -> mizaç (klasik tabiat karşılığı)
const ELEMENT_MIZAC = {
  ates:   { ad: "Safravi", lat: "Choleric",    tabiat: "sıcak-kuru" },
  hava:   { ad: "Demevi",  lat: "Sanguine",    tabiat: "sıcak-nemli" },
  toprak: { ad: "Sevdavi", lat: "Melancholic", tabiat: "soğuk-kuru" },
  su:     { ad: "Balgami", lat: "Phlegmatic",  tabiat: "soğuk-nemli" },
};

const ELEMENT_ANLAM = {
  ates:   "irade, coşku, eylem ve ilham",
  toprak: "pratiklik, istikrar, somutluk ve güven",
  hava:   "düşünce, iletişim, sosyallik ve esneklik",
  su:     "duygu, sezgi, şefkat ve derinlik",
};

// Mizaç hesabına giren klasik noktalar (harita_ozeti'ndeki anahtarlarla birebir)
const MIZAC_NOKTALARI = ["Güneş", "Ay", "Merkür", "Venüs", "Mars", "Jüpiter", "Satürn", "Yükselen"];

function burcAyikla(konum) {
  // "Aslan, 09°44', 11. ev" -> "Aslan"
  return String(konum).split(",")[0].trim();
}

export function elementMizacHesapla(haritaOzeti) {
  const sayim = { ates: 0, toprak: 0, hava: 0, su: 0 };
  const katki = {}; // hangi nokta hangi elemente katkı yaptı (şeffaflık)
  let toplam = 0;

  for (const nokta of MIZAC_NOKTALARI) {
    const konum = haritaOzeti[nokta];
    if (!konum) continue;
    const burc = burcAyikla(konum);
    const el = BURC_ELEMENT[burc];
    if (!el) continue;
    sayim[el] += 1;
    toplam += 1;
    (katki[el] ||= []).push(`${nokta} (${burc})`);
  }

  const yuzde = {};
  for (const el of Object.keys(sayim)) {
    yuzde[el] = toplam ? Math.round((sayim[el] / toplam) * 1000) / 10 : 0;
  }

  const sirali = Object.keys(sayim).sort((a, b) => sayim[b] - sayim[a]);
  const baskin = sirali[0];
  const eksik = Object.keys(sayim).filter((el) => sayim[el] === 0);

  return {
    sayim,
    yuzde,
    toplam,
    katki,
    baskin,
    baskin_ad: ELEMENT_AD[baskin],
    eksik_ad: eksik.map((el) => ELEMENT_AD[el]),
    mizac: ELEMENT_MIZAC[baskin],
    element_anlam: ELEMENT_ANLAM,
  };
}

// --- Doğrudan çalıştırılırsa: Ayşe örnek haritasıyla test et ---
const AYSE = {
  "Güneş": "Aslan, 09°44', 11. ev",
  "Ay": "Yengeç, 14°20', 10. ev",
  "Yükselen": "Terazi, 18°03'",
  "Merkür": "Başak, 02°15', 12. ev",
  "Venüs": "Koç, 24°50', 7. ev",
  "Mars": "Koç, 21°10', 7. ev",
  "Jüpiter": "Yay, 06°41', 3. ev",
  "Satürn": "Oğlak, 11°55', 4. ev",
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = elementMizacHesapla(AYSE);
  console.log("=== ELEMENT & MİZAÇ HESABI (Ayşe) ===\n");
  console.log("Sayım:", r.sayim, "| Toplam nokta:", r.toplam);
  console.log("Yüzde:", r.yuzde);
  console.log("Katkı (şeffaflık):");
  for (const [el, liste] of Object.entries(r.katki)) console.log(`  ${ELEMENT_AD[el]}: ${liste.join(", ")}`);
  console.log("\nBaskın element:", r.baskin_ad, `(%${r.yuzde[r.baskin]})`);
  console.log("Eksik element:", r.eksik_ad.length ? r.eksik_ad.join(", ") : "yok");
  console.log("MİZAÇ:", r.mizac.ad, `(${r.mizac.lat}, ${r.mizac.tabiat})`);
}
