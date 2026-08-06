"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";

const inputCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55";

type Astrolog = {
  id: string; ad: string; hakkinda: string; fotoId?: string | null;
  instagram?: string; x?: string; youtube?: string; tiktok?: string; website?: string; email?: string;
};
type Ayar = { acik: boolean; konum: "hero" | "sss"; grid: 3 | 4; anasayfa: string[]; baslik: string; altBaslik: string };
type Tik = Record<string, { toplam: number; bugun: number; son30: number }>;

const BOS_FORM = { ad: "", hakkinda: "", instagram: "", x: "", youtube: "", tiktok: "", website: "", email: "" };

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-night-deep transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function AstrologlarPage() {
  const [list, setList] = useState<Astrolog[]>([]);
  const [ayar, setAyar] = useState<Ayar | null>(null);
  const [tik, setTik] = useState<Tik>({});
  const [form, setForm] = useState<typeof BOS_FORM>(BOS_FORM);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // id → düzenleme modu
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fotoInput = useRef<HTMLInputElement>(null);
  const fotoHedef = useRef<string>("");

  const load = useCallback(() => {
    fetch("/api/admin/astrologlar").then((r) => r.json()).then((d) => {
      setList(d.astrologlar ?? []); setAyar(d.ayar ?? null); setTik(d.tik ?? {});
    }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await fetch("/api/admin/astrologlar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Hata."); return null; }
    setMsg("");
    return d;
  };

  const ayarKaydet = async (patch: Partial<Ayar>) => {
    const d = await post({ action: "ayar", patch });
    if (d?.ayar) setAyar(d.ayar);
  };

  const kaydet = async () => {
    if (!form.ad.trim()) { setMsg("İsim soyisim gerekli."); return; }
    const d = duzenlenen
      ? await post({ action: "guncelle", id: duzenlenen, ...form })
      : await post({ action: "ekle", ...form });
    if (d) { setForm(BOS_FORM); setDuzenlenen(null); load(); }
  };

  const sil = async (a: Astrolog) => {
    if (!confirm(`"${a.ad}" silinsin mi? Tık istatistikleri de silinir.`)) return;
    if (await post({ action: "sil", id: a.id })) { if (duzenlenen === a.id) { setForm(BOS_FORM); setDuzenlenen(null); } load(); }
  };

  const duzenle = (a: Astrolog) => {
    setDuzenlenen(a.id);
    setForm({ ad: a.ad, hakkinda: a.hakkinda, instagram: a.instagram ?? "", x: a.x ?? "", youtube: a.youtube ?? "", tiktok: a.tiktok ?? "", website: a.website ?? "", email: a.email ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fotoSec = (id: string) => { fotoHedef.current = id; fotoInput.current?.click(); };
  const fotoYukle = async (file: File | undefined) => {
    if (!file || !fotoHedef.current) return;
    const fd = new FormData();
    fd.append("id", fotoHedef.current);
    fd.append("file", file);
    setBusy(true);
    const r = await fetch("/api/admin/astrologlar/foto", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(d.error || "Foto yüklenemedi."); return; }
    setMsg(""); load();
  };

  // Anasayfa seçimi: sıralı id listesi üzerinde ekle/çıkar/taşı
  const asMax = ayar ? ayar.grid * 2 : 8;
  const asToggle = (id: string) => {
    if (!ayar) return;
    const yeni = ayar.anasayfa.includes(id) ? ayar.anasayfa.filter((x) => x !== id) : [...ayar.anasayfa, id].slice(0, asMax);
    ayarKaydet({ anasayfa: yeni });
  };
  const asTasi = (id: string, yon: -1 | 1) => {
    if (!ayar) return;
    const arr = [...ayar.anasayfa];
    const i = arr.indexOf(id);
    if (i < 0 || i + yon < 0 || i + yon >= arr.length) return;
    [arr[i], arr[i + yon]] = [arr[i + yon], arr[i]];
    ayarKaydet({ anasayfa: arr });
  };

  if (!ayar) return <div className="py-16 text-center text-parchment/45">Yükleniyor…</div>;

  return (
    <div>
      <PageHead title="Astrologlar" desc="Uzman kartlarını yönet; switch ile sitede göster/gizle, anasayfa dizilimini seç." />
      <input ref={fotoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => { fotoYukle(e.target.files?.[0]); e.target.value = ""; }} />

      {/* Görünürlük & yerleşim */}
      <Panel className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Switch on={ayar.acik} onToggle={() => ayarKaydet({ acik: !ayar.acik })} />
          <div>
            <div className="text-sm font-medium text-parchment">Astrologları sitede göster</div>
            <div className="text-xs text-parchment/50">Açıkken: anasayfa bloğu + header&apos;da &quot;Astrologlar&quot; linki + /astrologlar sayfası.</div>
          </div>
          <span className="ml-auto"><Badge tone={ayar.acik ? "green" : "gray"}>{ayar.acik ? "Yayında" : "Gizli"}</Badge></span>
        </div>

        <div className={`mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${ayar.acik ? "" : "opacity-50"}`}>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Anasayfa Konumu</span>
            <select value={ayar.konum} onChange={(e) => ayarKaydet({ konum: e.target.value as Ayar["konum"] })}
              className={`w-full ${inputCls}`} style={{ colorScheme: "dark" }}>
              <option value="hero">Hero&apos;nun altı (analizlerden önce)</option>
              <option value="sss">SSS&apos;in hemen üstü</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Dizilim</span>
            <select value={ayar.grid} onChange={(e) => ayarKaydet({ grid: Number(e.target.value) as Ayar["grid"] })}
              className={`w-full ${inputCls}`} style={{ colorScheme: "dark" }}>
              <option value={3}>3&apos;lü sıra (en fazla 6 kart)</option>
              <option value={4}>4&apos;lü sıra (en fazla 8 kart)</option>
            </select>
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Bölüm Başlığı</span>
            <input value={ayar.baslik} onChange={(e) => setAyar({ ...ayar, baslik: e.target.value })}
              onBlur={() => ayarKaydet({ baslik: ayar.baslik })} className={`w-full ${inputCls}`} />
          </label>
          <label className="block sm:col-span-2 lg:col-span-4">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Alt Başlık</span>
            <input value={ayar.altBaslik} onChange={(e) => setAyar({ ...ayar, altBaslik: e.target.value })}
              onBlur={() => ayarKaydet({ altBaslik: ayar.altBaslik })} className={`w-full ${inputCls}`} />
          </label>
        </div>
        <p className="mt-3 text-xs text-parchment/45">
          Anasayfada {asMax} karta kadar gösterilir ({ayar.grid}&apos;lü × 2 sıra) — seçim ve sıralama aşağıdaki listeden. Seçili: {ayar.anasayfa.length}/{asMax}. /astrologlar sayfasında ise tüm kartlar listelenir.
        </p>
      </Panel>

      {/* Ekle / düzenle formu */}
      <Panel className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-gold-bright">
            {duzenlenen ? "Astroloğu Düzenle" : "Yeni Astrolog Ekle"}
          </h3>
          {duzenlenen && (
            <button onClick={() => { setForm(BOS_FORM); setDuzenlenen(null); }} className="text-xs text-parchment/55 hover:text-parchment">
              Vazgeç (yeni ekleme moduna dön)
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input placeholder="İsim Soyisim *" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} className={inputCls} />
          <input placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          <input placeholder="Web sitesi" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={`${inputCls} lg:col-span-2`} />
          <textarea placeholder="Hakkında (1-2 cümle)" value={form.hakkinda} onChange={(e) => setForm({ ...form, hakkinda: e.target.value })}
            rows={2} maxLength={300} className={`${inputCls} sm:col-span-2 lg:col-span-4 resize-none`} />
          <input placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputCls} />
          <input placeholder="X (Twitter)" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} className={inputCls} />
          <input placeholder="YouTube" value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} className={inputCls} />
          <input placeholder="TikTok" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className={inputCls} />
        </div>
        {msg && <p className="mt-3 rounded-lg border border-gold/15 bg-night/40 px-3 py-2 text-sm text-parchment/75">{msg}</p>}
        <button onClick={kaydet} disabled={busy}
          className="mt-4 rounded-full bg-gold px-5 py-2 text-sm font-medium text-night-deep hover:bg-gold-bright disabled:opacity-60">
          {duzenlenen ? "Değişiklikleri Kaydet" : "Astrolog Ekle"}
        </button>
        <span className="ml-3 text-xs text-parchment/45">Fotoğrafı ekledikten sonra listedeki &quot;Foto&quot; butonuyla yükleyebilirsin (JPG/PNG/WebP, max 4MB).</span>
      </Panel>

      {/* Liste */}
      <Panel>
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-gold/10 text-left text-xs uppercase tracking-[0.12em] text-parchment/45">
              <th className="px-4 py-3">Astrolog</th>
              <th className="px-3 py-3">Bağlantılar</th>
              <th className="px-3 py-3">Tıklama (bugün / 30g / toplam)</th>
              <th className="px-3 py-3">Anasayfa</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const t = tik[a.id];
              const secili = ayar.anasayfa.includes(a.id);
              const sira = ayar.anasayfa.indexOf(a.id);
              return (
                <tr key={a.id} className="border-b border-gold/5 align-middle">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.fotoId
                        ? /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={`/api/astrolog-foto/${a.fotoId}`} alt="" className="h-11 w-11 rounded-full border border-gold/25 object-cover" />
                        : <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/25 bg-night-2 font-display text-base text-gold-bright">
                            {a.ad.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </span>}
                      <div>
                        <div className="font-medium text-parchment">{a.ad}</div>
                        <div className="max-w-[300px] truncate text-xs text-parchment/50" title={a.hakkinda}>{a.hakkinda}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-parchment/60">
                    {[a.instagram && "IG", a.x && "X", a.youtube && "YT", a.tiktok && "TT", a.website && "Web", a.email && "@"].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-parchment/75">
                    {t ? `${t.bugun} / ${t.son30} / ${t.toplam}` : "0 / 0 / 0"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <input type="checkbox" checked={secili} onChange={() => asToggle(a.id)}
                        disabled={!secili && ayar.anasayfa.length >= asMax} className="h-4 w-4 accent-[#c2a36b]" />
                      {secili && (
                        <>
                          <span className="w-5 text-center text-xs text-gold-bright">{sira + 1}.</span>
                          <button onClick={() => asTasi(a.id, -1)} disabled={sira === 0} className="rounded border border-gold/20 px-1.5 text-xs text-parchment/70 hover:bg-gold/10 disabled:opacity-30">↑</button>
                          <button onClick={() => asTasi(a.id, 1)} disabled={sira === ayar.anasayfa.length - 1} className="rounded border border-gold/20 px-1.5 text-xs text-parchment/70 hover:bg-gold/10 disabled:opacity-30">↓</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => fotoSec(a.id)} className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-gold-bright hover:bg-gold/10">Foto</button>
                      <button onClick={() => duzenle(a)} className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-gold-bright hover:bg-gold/10">Düzenle</button>
                      <button onClick={() => sil(a)} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10">Sil</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-16 text-center text-parchment/45">Henüz astrolog eklenmemiş.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
