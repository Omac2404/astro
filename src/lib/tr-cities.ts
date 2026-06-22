// Türkiye il merkezleri (yaklaşık koordinat) — doğum yeri il'inden lat/lon çözmek için.
// İlçe hassasiyeti gerekmiyor (il merkezi yükselen için yeterli; sonra ilçe bazlı geocoding eklenebilir).

function norm(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z]/g, "")
    .trim();
}

// key: norm(il) -> [lat, lon]
const RAW: Record<string, [number, number]> = {
  adana: [37.0, 35.32], adiyaman: [37.76, 38.28], afyonkarahisar: [38.76, 30.54], agri: [39.72, 43.05],
  amasya: [40.65, 35.83], ankara: [39.92, 32.85], antalya: [36.9, 30.7], artvin: [41.18, 41.82],
  aydin: [37.85, 27.84], balikesir: [39.65, 27.88], bilecik: [40.15, 29.98], bingol: [38.88, 40.49],
  bitlis: [38.4, 42.11], bolu: [40.74, 31.61], burdur: [37.72, 30.29], bursa: [40.19, 29.06],
  canakkale: [40.15, 26.41], cankiri: [40.6, 33.62], corum: [40.55, 34.95], denizli: [37.78, 29.09],
  diyarbakir: [37.91, 40.24], edirne: [41.68, 26.56], elazig: [38.68, 39.22], erzincan: [39.75, 39.5],
  erzurum: [39.9, 41.27], eskisehir: [39.78, 30.52], gaziantep: [37.07, 37.38], giresun: [40.91, 38.39],
  gumushane: [40.46, 39.48], hakkari: [37.58, 43.74], hatay: [36.2, 36.16], isparta: [37.76, 30.55],
  mersin: [36.81, 34.64], istanbul: [41.01, 28.98], izmir: [38.42, 27.14], kars: [40.6, 43.1],
  kastamonu: [41.39, 33.78], kayseri: [38.73, 35.49], kirklareli: [41.74, 27.22], kirsehir: [39.15, 34.16],
  kocaeli: [40.77, 29.92], konya: [37.87, 32.48], kutahya: [39.42, 29.98], malatya: [38.35, 38.31],
  manisa: [38.61, 27.43], kahramanmaras: [37.58, 36.93], mardin: [37.31, 40.74], mugla: [37.22, 28.36],
  mus: [38.74, 41.49], nevsehir: [38.62, 34.71], nigde: [37.97, 34.68], ordu: [40.98, 37.88],
  rize: [41.02, 40.52], sakarya: [40.76, 30.4], samsun: [41.29, 36.33], siirt: [37.93, 41.94],
  sinop: [42.03, 35.15], sivas: [39.75, 37.02], tekirdag: [40.98, 27.51], tokat: [40.31, 36.55],
  trabzon: [41.0, 39.72], tunceli: [39.11, 39.55], sanliurfa: [37.17, 38.79], usak: [38.67, 29.41],
  van: [38.49, 43.41], yozgat: [39.82, 34.81], zonguldak: [41.45, 31.79], aksaray: [38.37, 34.03],
  bayburt: [40.26, 40.22], karaman: [37.18, 33.22], kirikkale: [39.85, 33.52], batman: [37.88, 41.13],
  sirnak: [37.52, 42.46], bartin: [41.64, 32.34], ardahan: [41.11, 42.7], igdir: [39.92, 44.04],
  yalova: [40.65, 29.27], karabuk: [41.2, 32.63], kilis: [36.72, 37.12], osmaniye: [37.07, 36.25],
  duzce: [40.84, 31.16],
};

export const IL_LISTESI = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas",
  "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];

export function ilKoordinat(il: string): [number, number] | null {
  return RAW[norm(il)] ?? null;
}
