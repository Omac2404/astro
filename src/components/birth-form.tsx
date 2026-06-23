// Ortak doğum bilgisi formu — hem üye (/hesabim/analiz/[id]) hem admin (Rapor Oluştur) aynı formu kullanır.
import { IL_LISTESI } from "@/lib/tr-cities";

const inputCls =
  "w-full rounded-xl border border-gold/20 bg-night-deep px-4 py-2.5 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";
const dateCls = inputCls + " date-white";
const labelCls = "mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55";

export type Kisi = { ad: string; tarih: string; saat: string; il: string; ilce: string; yurtdisi: boolean; ulke: string; sehir: string };
export const bosKisi = (): Kisi => ({ ad: "", tarih: "", saat: "", il: "", ilce: "", yurtdisi: false, ulke: "", sehir: "" });

// Forma uygun DogumBilgi (API'ye gönderilen) üretir
export const toDogum = (k: Kisi) => ({
  ad: k.ad,
  tarih: k.tarih,
  saat: k.saat,
  yer: k.yurtdisi ? `${k.sehir.trim()}, ${k.ulke.trim()}` : (k.ilce.trim() ? `${k.il.trim()} / ${k.ilce.trim()}` : k.il.trim()),
});

export function PersonFields({ k, set, baslik }: { k: Kisi; set: (patch: Partial<Kisi>) => void; baslik?: string }) {
  return (
    <div className="space-y-4">
      {baslik && <h3 className="font-display text-lg font-semibold text-gold-bright">{baslik}</h3>}
      <div>
        <label className={labelCls}>İsim (soyadı yazmana gerek yok)</label>
        <input required maxLength={25} value={k.ad} onChange={(e) => set({ ad: e.target.value })} placeholder="İsim (hitaben)" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Doğum Tarihi</label>
          <input required type="date" value={k.tarih} onChange={(e) => set({ tarih: e.target.value })} className={dateCls} style={{ colorScheme: "dark" }} />
        </div>
        <div>
          <label className={labelCls}>Doğum Saati</label>
          <input type="time" value={k.saat} onChange={(e) => set({ saat: e.target.value })} className={dateCls} style={{ colorScheme: "dark" }} />
        </div>
      </div>

      {/* Yurtdışı switch */}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gold/15 bg-night-deep px-4 py-2.5">
        <span className="text-sm text-parchment/80">Yurtdışında doğdu</span>
        <input type="checkbox" checked={k.yurtdisi} onChange={(e) => set({ yurtdisi: e.target.checked })} className="h-4 w-4 accent-[#c2a36b]" />
      </label>

      {k.yurtdisi ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ülke</label>
              <input required value={k.ulke} onChange={(e) => set({ ulke: e.target.value })} placeholder="örn. Almanya" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Şehir</label>
              <input required value={k.sehir} onChange={(e) => set({ sehir: e.target.value })} placeholder="örn. Berlin" className={inputCls} />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-parchment/40">Koordinat ve saat dilimi otomatik bulunur.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Doğum Yeri (İl)</label>
            <select required value={k.il} onChange={(e) => set({ il: e.target.value })} className={inputCls} style={{ colorScheme: "dark" }}>
              <option value="" disabled>İl seç</option>
              {IL_LISTESI.map((il) => (
                <option key={il} value={il}>{il}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>İlçe</label>
            <input value={k.ilce} onChange={(e) => set({ ilce: e.target.value })} className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}
