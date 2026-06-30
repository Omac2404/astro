"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";
import { SearchBox } from "@/components/admin-search";
import { PRODUCTS } from "@/lib/products";

type Fatura = { ad?: string; email?: string; tel?: string; adres?: string };
type Order = {
  id: string;
  email: string;
  items: { slug: string; ad: string; hediye?: boolean; fiyat?: number }[];
  total: number;
  durum: "odendi" | "bekliyor" | "iade";
  hediye: boolean;
  fatura?: Fatura;
  faturaDosya?: string;
  kaynak?: string;
  tarih: string;
};
const TONE = { odendi: "green", bekliyor: "amber", iade: "rose" } as const;
const ETIKET = { odendi: "Ödendi", bekliyor: "Bekliyor", iade: "İade" } as const;
const selCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55";
const dateCls = selCls + " date-white";

function tarihSaat(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}
// Yerel tarih (YYYY-MM-DD) — filtreleme görünen saatle tutarlı olsun diye
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function FaturaKopyala({ o }: { o: Order }) {
  const [kopya, setKopya] = useState(false);
  const f = o.fatura;
  if (!f || !(f.ad || f.email || f.tel || f.adres)) return <span className="text-xs text-parchment/30">—</span>;
  const metin = [
    `Sipariş: ${o.id}`,
    f.ad ? `Ad Soyad: ${f.ad}` : "",
    f.email ? `E-posta: ${f.email}` : "",
    f.tel ? `Telefon: ${f.tel}` : "",
    f.adres ? `Adres: ${f.adres}` : "",
    `Ürün: ${o.items.map((i) => i.ad).join(", ")}`,
    `Tutar: ${o.total} ₺`,
  ].filter(Boolean).join("\n");
  const kopyala = async () => { try { await navigator.clipboard.writeText(metin); } catch {} setKopya(true); setTimeout(() => setKopya(false), 1500); };
  return (
    <button onClick={kopyala} title={metin} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-gold-bright transition-colors hover:bg-gold/10">
      {kopya ? <>Kopyalandı ✓</> : (<><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Fatura bilgilerini kopyala</>)}
    </button>
  );
}

export default function SiparislerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [urun, setUrun] = useState("");
  const [kaynak, setKaynak] = useState("");
  const [bas, setBas] = useState("");
  const [bit, setBit] = useState("");
  const [hizli, setHizli] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<Record<string, number>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = () => fetch("/api/admin/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const kaynaklar = useMemo(() => Array.from(new Set(orders.map((o) => o.kaynak || "direkt"))).sort(), [orders]);

  const filtered = useMemo(() => {
    const sirali = [...orders].sort((a, b) => b.tarih.localeCompare(a.tarih));
    const s = q.trim().toLowerCase();
    return sirali.filter((o) => {
      if (urun && !o.items.some((i) => i.slug === urun)) return false;
      if (kaynak && (o.kaynak || "direkt") !== kaynak) return false;
      const gun = fmt(new Date(o.tarih));
      if (bas && gun < bas) return false;
      if (bit && gun > bit) return false;
      if (s && !(o.id.toLowerCase().includes(s) || o.email.toLowerCase().includes(s) || o.items.some((i) => i.ad.toLowerCase().includes(s)) || (o.fatura?.ad ?? "").toLowerCase().includes(s) || (o.fatura?.tel ?? "").includes(s))) return false;
      return true;
    });
  }, [orders, q, urun, kaynak, bas, bit]);

  const ozet = useMemo(() => ({
    siparis: filtered.length,
    urun: filtered.reduce((t, o) => t + o.items.length, 0),
    tutar: filtered.reduce((t, o) => t + o.total, 0),
  }), [filtered]);

  const hizliFiltre = (tip: "bugun" | "hafta" | "ay") => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (tip === "hafta") { const off = (now.getDay() + 6) % 7; start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - off); }
    else if (tip === "ay") start = new Date(now.getFullYear(), now.getMonth(), 1);
    setBas(fmt(start)); setBit(fmt(now)); setHizli(tip);
  };

  const setBasManuel = (v: string) => { setBas(v); setHizli(""); };
  const setBitManuel = (v: string) => { setBit(v); setHizli(""); };
  const temizle = () => { setQ(""); setUrun(""); setKaynak(""); setBas(""); setBit(""); setHizli(""); };

  const faturaYukle = async (orderId: string, file: File) => {
    setBusy(orderId);
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("file", file);
    const r = await fetch("/api/admin/orders/invoice", { method: "POST", body: fd });
    setBusy(null);
    if (r.ok) load();
  };

  // "Ödendi" (WhatsApp/havale): bekleyen siparişi tamamla, ürünler hesaba tanımlansın
  const odendiYap = async (orderId: string) => {
    if (!confirm("Bu siparişi ÖDENDİ olarak işaretle? Sepetteki ürünler müşterinin hesabına tanımlanacak ve onay e-postası gönderilecek.")) return;
    setBusy(orderId);
    const r = await fetch("/api/admin/orders/paid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
    setBusy(null);
    if (r.ok) load();
    else { const d = await r.json().catch(() => ({})); alert(d.error || "İşlem başarısız."); }
  };

  // Sepeti düzenle (yalnız bekleyen sipariş) — normal kalemler; hediye kalemleri korunur
  const openEdit = (o: Order) => {
    const grup: Record<string, number> = {};
    for (const it of o.items) if (!it.hediye) grup[it.slug] = (grup[it.slug] || 0) + 1;
    setEditItems(grup);
    setEditing(o);
  };
  const closeEdit = () => { setEditing(null); setEditItems({}); };
  const setQty = (slug: string, q: number) => setEditItems((s) => { const n = { ...s }; if (q <= 0) delete n[slug]; else n[slug] = Math.min(50, q); return n; });
  const kaydetSepet = async () => {
    if (!editing) return;
    const items = Object.entries(editItems).filter(([, q]) => q > 0).map(([slug, adet]) => ({ slug, adet }));
    setBusy(editing.id);
    const r = await fetch("/api/admin/orders/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: editing.id, items }) });
    setBusy(null);
    if (r.ok) { closeEdit(); load(); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || "Kaydedilemedi."); }
  };

  return (
    <div>
      <PageHead title="Siparişler" desc={`${filtered.length} / ${orders.length} sipariş — en güncel üstte.`} action={<SearchBox value={q} onChange={setQ} placeholder="ID, e-posta, ad, telefon…" />} />

      {/* Filtre çubuğu */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gold/15 bg-night-deep p-4">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Başlangıç</label>
          <input type="date" value={bas} onChange={(e) => setBasManuel(e.target.value)} className={dateCls} style={{ colorScheme: "dark" }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Bitiş</label>
          <input type="date" value={bit} onChange={(e) => setBitManuel(e.target.value)} className={dateCls} style={{ colorScheme: "dark" }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Ürün</label>
          <select value={urun} onChange={(e) => setUrun(e.target.value)} className={selCls} style={{ colorScheme: "dark" }}>
            <option value="">Tümü</option>
            {PRODUCTS.map((p) => <option key={p.slug} value={p.slug}>{p.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Kaynak</label>
          <select value={kaynak} onChange={(e) => setKaynak(e.target.value)} className={selCls} style={{ colorScheme: "dark" }}>
            <option value="">Tümü</option>
            {kaynaklar.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {/* Hızlı tarih filtreleri */}
        <div className="flex gap-1.5">
          {([["bugun", "Bugün"], ["hafta", "Bu Hafta"], ["ay", "Bu Ay"]] as const).map(([t, l]) => (
            <button
              key={t}
              onClick={() => hizliFiltre(t)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${hizli === t ? "border-gold/60 bg-gold/15 text-gold-bright" : "border-gold/25 text-parchment/70 hover:text-gold-bright"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {(q || urun || kaynak || bas || bit) && (
          <button onClick={temizle} className="rounded-lg border border-gold/25 px-3 py-2 text-sm text-parchment/65 transition-colors hover:text-gold-bright">Temizle</button>
        )}

        {/* Özet — filtre satırının sağında, kart içinde */}
        <div className="ml-auto flex items-center divide-x divide-gold/15 rounded-xl border border-gold/20 bg-night/60 px-1">
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Sipariş</div>
            <div className="font-body text-xl font-semibold text-parchment">{ozet.siparis}</div>
          </div>
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Satılan Ürün</div>
            <div className="font-body text-xl font-semibold text-parchment">{ozet.urun}</div>
          </div>
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Toplam Tutar</div>
            <div className="font-body text-xl font-semibold text-gold-bright">{ozet.tutar.toLocaleString("tr-TR")} ₺</div>
          </div>
        </div>
      </div>

      <Panel>
        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Henüz sipariş yok.</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Filtreyle eşleşen sipariş yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1140px] text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                  <th className="px-4 py-3 font-medium">Sipariş</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Ürün(ler)</th>
                  <th className="px-4 py-3 font-medium">Tutar</th>
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Tarih / Saat</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Fatura Bilgisi</th>
                  <th className="px-4 py-3 font-medium text-right">Fatura PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-parchment/85">{o.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-parchment/80">{o.fatura?.ad || o.email}</div>
                      <div className="text-xs text-parchment/45">{o.email}</div>
                    </td>
                    <td className="px-4 py-3 text-parchment/65">{o.items.map((i) => i.ad).join(", ")}</td>
                    <td className="px-4 py-3 text-parchment/85">{o.total} ₺</td>
                    <td className="px-4 py-3"><span className="rounded-full border border-gold/20 bg-night px-2 py-0.5 text-xs capitalize text-parchment/70">{o.kaynak || "direkt"}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-parchment/60">{tarihSaat(o.tarih)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={TONE[o.durum]}>{ETIKET[o.durum]}</Badge>
                        {o.durum === "bekliyor" && (
                          <>
                            <button onClick={() => openEdit(o)} disabled={busy === o.id} title="Sepeti düzenle" className="rounded-lg border border-gold/30 p-1.5 text-gold-bright transition-colors hover:bg-gold/10 disabled:opacity-50">
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <button onClick={() => odendiYap(o.id)} disabled={busy === o.id} className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
                              {busy === o.id ? "…" : "Ödendi ✓"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><FaturaKopyala o={o} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {o.faturaDosya && (
                          <a href={`/api/files/${o.faturaDosya}`} target="_blank" rel="noopener" title="Faturayı gör" className="text-emerald-300 hover:text-emerald-200">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
                          </a>
                        )}
                        <input ref={(el) => { fileRefs.current[o.id] = el; }} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) faturaYukle(o.id, f); }} />
                        <button onClick={() => fileRefs.current[o.id]?.click()} disabled={busy === o.id} className="rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-gold-bright transition-colors hover:bg-gold/10 disabled:opacity-50">
                          {busy === o.id ? "Yükleniyor…" : o.faturaDosya ? "Değiştir" : "Fatura Ekle"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Sepeti Düzenle popup (yalnız bekleyen sipariş) */}
      {editing && (() => {
        const satirlar = Object.entries(editItems);
        const total = satirlar.reduce((t, [slug, q]) => { const p = PRODUCTS.find((x) => x.slug === slug); return t + (p ? p.fiyat * q : 0); }, 0);
        const eklenebilir = PRODUCTS.filter((p) => !(p.slug in editItems));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeEdit}>
            <div className="w-full max-w-lg rounded-2xl border border-gold/20 bg-night-deep p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-parchment">Sepeti Düzenle</h3>
                <span className="font-mono text-xs text-parchment/50">{editing.id}</span>
              </div>
              <p className="mt-1 text-xs text-parchment/45">Yalnızca bekleyen siparişte. Hediye kalemleri korunur; fiyatlar sunucudan kesinleşir.</p>

              <div className="mt-4 space-y-2">
                {satirlar.length === 0 ? (
                  <p className="rounded-lg border border-gold/10 bg-night/40 px-3 py-4 text-center text-sm text-parchment/45">Sepette ürün yok. Aşağıdan ekle.</p>
                ) : satirlar.map(([slug, q]) => {
                  const p = PRODUCTS.find((x) => x.slug === slug);
                  return (
                    <div key={slug} className="flex items-center gap-3 rounded-lg border border-gold/15 bg-night/50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-parchment/85">{p?.ad ?? slug}</div>
                        <div className="text-xs text-parchment/45">{p ? `${p.fiyat} ₺ × ${q} = ${p.fiyat * q} ₺` : slug}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setQty(slug, q - 1)} className="h-7 w-7 rounded-lg border border-gold/25 text-parchment/80 transition-colors hover:bg-gold/10">−</button>
                        <span className="w-6 text-center text-sm text-parchment">{q}</span>
                        <button type="button" onClick={() => setQty(slug, q + 1)} className="h-7 w-7 rounded-lg border border-gold/25 text-parchment/80 transition-colors hover:bg-gold/10">+</button>
                        <button type="button" onClick={() => setQty(slug, 0)} title="Çıkar" className="ml-1 h-7 w-7 rounded-lg border border-rose-400/30 text-rose-300 transition-colors hover:bg-rose-500/10">×</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {eklenebilir.length > 0 && (
                <select value="" onChange={(e) => { if (e.target.value) setQty(e.target.value, (editItems[e.target.value] || 0) + 1); }} className="mt-3 w-full rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55" style={{ colorScheme: "dark" }}>
                  <option value="">+ Ürün ekle…</option>
                  {eklenebilir.map((p) => <option key={p.slug} value={p.slug}>{p.ad} — {p.fiyat} ₺</option>)}
                </select>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-gold/10 pt-3">
                <span className="text-sm text-parchment/60">Toplam</span>
                <span className="font-body text-xl font-semibold text-gold-bright">{total} ₺</span>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={closeEdit} className="rounded-full border border-gold/25 px-4 py-2 text-sm text-parchment/70 transition-colors hover:text-gold-bright">İptal</button>
                <button type="button" onClick={kaydetSepet} disabled={busy === editing.id} className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">{busy === editing.id ? "Kaydediliyor…" : "Kaydet"}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
