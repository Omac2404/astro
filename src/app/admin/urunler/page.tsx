"use client";

import { useEffect, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";
import { PRODUCTS } from "@/lib/products";

type Override = { fiyat: number; eskiFiyat: number };
type Draft = Record<string, { fiyat: string; eskiFiyat: string }>;
const inputCls = "rounded-lg border border-gold/20 bg-night px-2 py-1 text-sm text-parchment outline-none focus:border-gold/55";

export default function UrunlerPage() {
  const [prices, setPrices] = useState<Record<string, Override>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [valF, setValF] = useState("");
  const [valE, setValE] = useState("");
  const [yuk, setYuk] = useState(false);

  // toplu mod
  const [toplu, setToplu] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [topluListe, setTopluListe] = useState("");
  const [topluIndirim, setTopluIndirim] = useState("");
  const [kapsam, setKapsam] = useState<"hepsi" | "bireysel" | "sinastri">("hepsi");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/prices").then((r) => r.json()).then((d) => setPrices(d.prices ?? {})).catch(() => {});
  }, []);

  const effFiyat = (slug: string, base: number) => prices[slug]?.fiyat ?? base;
  const effEski = (slug: string, base?: number) => (prices[slug] ? prices[slug].eskiFiyat : base ?? 0);

  // ---- tekli düzenleme ----
  const baslat = (slug: string, fiyat: number, eski?: number) => { setEditing(slug); setValF(String(effFiyat(slug, fiyat))); setValE(String(effEski(slug, eski))); };
  const kaydet = async (slug: string) => {
    const f = Number(valF); const e = Number(valE);
    if (!Number.isFinite(f) || f < 0 || !Number.isFinite(e) || e < 0) return;
    setYuk(true);
    const r = await fetch("/api/admin/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, fiyat: f, eskiFiyat: e }) });
    setYuk(false);
    if (r.ok) { setPrices((cur) => ({ ...cur, [slug]: { fiyat: Math.round(f), eskiFiyat: Math.round(e) } })); setEditing(null); }
  };

  // ---- toplu düzenleme ----
  const topluBaslat = () => {
    const d: Draft = {};
    for (const p of PRODUCTS) d[p.slug] = { fiyat: String(effFiyat(p.slug, p.fiyat)), eskiFiyat: String(effEski(p.slug, p.eskiFiyat)) };
    setDraft(d); setToplu(true); setEditing(null); setMsg("");
  };
  const kapsamda = (slug: string) => kapsam === "hepsi" || (kapsam === "sinastri" ? slug.startsWith("sinastri") : !slug.startsWith("sinastri"));
  const topluUygula = () => {
    setDraft((cur) => {
      const next = { ...cur };
      for (const p of PRODUCTS) {
        if (!kapsamda(p.slug)) continue;
        next[p.slug] = {
          fiyat: topluIndirim !== "" ? topluIndirim : next[p.slug].fiyat,
          eskiFiyat: topluListe !== "" ? topluListe : next[p.slug].eskiFiyat,
        };
      }
      return next;
    });
  };
  const topluKaydet = async () => {
    setYuk(true); setMsg("");
    const yeni: Record<string, Override> = {};
    for (const p of PRODUCTS) {
      const f = Number(draft[p.slug]?.fiyat); const e = Number(draft[p.slug]?.eskiFiyat);
      if (!Number.isFinite(f) || f < 0 || !Number.isFinite(e) || e < 0) continue;
      await fetch("/api/admin/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: p.slug, fiyat: f, eskiFiyat: e }) });
      yeni[p.slug] = { fiyat: Math.round(f), eskiFiyat: Math.round(e) };
    }
    setPrices((cur) => ({ ...cur, ...yeni }));
    setYuk(false); setToplu(false); setMsg("Tüm fiyatlar kaydedildi.");
    setTimeout(() => setMsg(""), 2500);
  };
  const setDr = (slug: string, k: "fiyat" | "eskiFiyat", v: string) => setDraft((cur) => ({ ...cur, [slug]: { ...cur[slug], [k]: v } }));

  return (
    <div>
      <PageHead
        title="Ürünler & Fiyat"
        action={
          toplu ? (
            <div className="flex items-center gap-2">
              <button onClick={topluKaydet} disabled={yuk} className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{yuk ? "Kaydediliyor…" : "Tümünü Kaydet"}</button>
              <button onClick={() => setToplu(false)} className="rounded-full border border-gold/30 px-4 py-2 text-sm text-parchment/70 transition-colors hover:text-gold-bright">İptal</button>
            </div>
          ) : (
            <button onClick={topluBaslat} className="rounded-full border border-gold/40 px-4 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/10">Toplu Düzenle</button>
          )
        }
      />
      {msg && <p className="mb-4 text-sm text-emerald-300">{msg}</p>}

      {/* Toplu uygula çubuğu */}
      {toplu && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gold/15 bg-night-deep p-4">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Kapsam</label>
            <select value={kapsam} onChange={(e) => setKapsam(e.target.value as typeof kapsam)} className={inputCls} style={{ colorScheme: "dark" }}>
              <option value="hepsi">Tüm ürünler</option>
              <option value="bireysel">Bireysel analizler</option>
              <option value="sinastri">Çift (sinastri)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Tüm liste fiyatı</label>
            <input type="number" min={0} value={topluListe} onChange={(e) => setTopluListe(e.target.value)} placeholder="₺ (boş=değişme)" className={`${inputCls} w-36`} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Tüm indirimli fiyat</label>
            <input type="number" min={0} value={topluIndirim} onChange={(e) => setTopluIndirim(e.target.value)} placeholder="₺ (boş=değişme)" className={`${inputCls} w-36`} />
          </div>
          <button onClick={topluUygula} className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/10">Seçili kapsama uygula</button>
        </div>
      )}

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                <th className="px-4 py-3 font-medium">Ürün</th>
                <th className="px-4 py-3 font-medium">Tip</th>
                <th className="px-4 py-3 font-medium">Liste Fiyatı</th>
                <th className="px-4 py-3 font-medium">İndirimli Fiyat</th>
                {!toplu && <th className="px-4 py-3 font-medium text-right">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => {
                const cift = p.slug.startsWith("sinastri");
                const ed = editing === p.slug;
                const eski = effEski(p.slug, p.eskiFiyat);
                return (
                  <tr key={p.slug} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg" style={{ color: p.accent }}>{p.glyph}</span>
                        <div>
                          <div className="font-medium text-parchment/90">{p.ad}</div>
                          <div className="text-xs text-parchment/40">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={cift ? "blue" : "gray"}>{cift ? "Sinastri" : "Bireysel"}</Badge></td>
                    <td className="px-4 py-3">
                      {toplu ? (
                        <input type="number" min={0} value={draft[p.slug]?.eskiFiyat ?? ""} onChange={(e) => setDr(p.slug, "eskiFiyat", e.target.value)} className={`${inputCls} w-24`} />
                      ) : ed ? (
                        <input type="number" min={0} value={valE} onChange={(e) => setValE(e.target.value)} className={`${inputCls} w-24`} />
                      ) : eski > 0 ? (
                        <span className="font-body text-parchment/55 line-through">{eski} ₺</span>
                      ) : (
                        <span className="text-parchment/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {toplu ? (
                        <input type="number" min={0} value={draft[p.slug]?.fiyat ?? ""} onChange={(e) => setDr(p.slug, "fiyat", e.target.value)} className={`${inputCls} w-24`} />
                      ) : ed ? (
                        <input autoFocus type="number" min={0} value={valF} onChange={(e) => setValF(e.target.value)} className={`${inputCls} w-24`} />
                      ) : (
                        <span className="font-body font-medium text-gold-bright">{effFiyat(p.slug, p.fiyat)} ₺</span>
                      )}
                    </td>
                    {!toplu && (
                      <td className="px-4 py-3 text-right">
                        {ed ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => kaydet(p.slug)} disabled={yuk} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">Kaydet</button>
                            <button onClick={() => setEditing(null)} className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-parchment/65 transition-colors hover:text-parchment">İptal</button>
                          </div>
                        ) : (
                          <button onClick={() => baslat(p.slug, p.fiyat, p.eskiFiyat)} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-gold-bright transition-colors hover:bg-gold/10">Düzenle</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
