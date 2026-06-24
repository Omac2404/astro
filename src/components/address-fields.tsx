"use client";

import { IL_LISTESI } from "@/lib/tr-cities";

// Fatura adresi — Türkiye: il (dropdown) + ilçe + açık adres; "Yurtdışında yaşıyorum" tikiyle
// il dropdown gizlenir, ülke + şehir (serbest metin) gelir. Ödeme + fatura-düzenleme formlarında ortak.
export type Adres = { yurtdisi: boolean; il: string; ilce: string; ulke: string; sehir: string; acikAdres: string };
export const bosAdres = (): Adres => ({ yurtdisi: false, il: "", ilce: "", ulke: "", sehir: "", acikAdres: "" });

export function AddressFields({
  a,
  set,
  inputCls,
  labelCls,
}: {
  a: Adres;
  set: (patch: Partial<Adres>) => void;
  inputCls: string;
  labelCls: string;
}) {
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-parchment/75">
        <input type="checkbox" checked={a.yurtdisi} onChange={(e) => set({ yurtdisi: e.target.checked })} className="h-4 w-4 accent-[#c2a36b]" />
        Yurtdışında yaşıyorum
      </label>

      {a.yurtdisi ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Ülke</label>
            <input value={a.ulke} onChange={(e) => set({ ulke: e.target.value })} placeholder="örn. Almanya" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Şehir</label>
            <input value={a.sehir} onChange={(e) => set({ sehir: e.target.value })} placeholder="örn. Berlin" className={inputCls} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Şehir (İl)</label>
            <select value={a.il} onChange={(e) => set({ il: e.target.value })} className={inputCls} style={{ colorScheme: "dark" }}>
              <option value="">İl seç</option>
              {IL_LISTESI.map((il) => (
                <option key={il} value={il}>{il}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>İlçe</label>
            <input value={a.ilce} onChange={(e) => set({ ilce: e.target.value })} placeholder="İlçe" className={inputCls} />
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>Açık Adres</label>
        <textarea value={a.acikAdres} onChange={(e) => set({ acikAdres: e.target.value })} rows={2} placeholder="Mahalle, cadde, no, daire" className={inputCls} />
      </div>
    </div>
  );
}
