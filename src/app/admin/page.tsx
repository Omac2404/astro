"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/admin-ui";
import { PRODUCTS } from "@/lib/products";

type OItem = { slug: string; ad: string; fiyat: number; hediye: boolean };
type Member = { email: string; ad: string | null; tel: string | null; adres: string | null; kayit: string };
type Order = { id: string; email: string; ad: string; urunler: string[]; items: OItem[]; adet: number; total: number; tarih: string };

const GORUNUR = PRODUCTS.filter((p) => !p.gizli); // 7 ürün

const try0 = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const gunu = (iso: string) => fmt(new Date(iso));
const tarihSaat = (iso: string) => { try { return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso.slice(0, 16); } };

const selCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55 date-white";

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [apiMaliyetUSD, setApiMaliyetUSD] = useState(0.225);
  const [posOrani, setPosOrani] = useState(0);
  const [kur, setKur] = useState(0);
  const [bas, setBas] = useState("");
  const [bit, setBit] = useState("");
  const [hizli, setHizli] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then((d) => {
      setMembers(d.members ?? []); setOrders(d.orders ?? []);
      if (d.ayar) { setApiMaliyetUSD(d.ayar.apiMaliyetUSD ?? 0.225); setPosOrani(d.ayar.posOrani ?? 0); }
      setKur(d.kur ?? 0);
    }).catch(() => {});
  }, []);

  const arada = (iso: string) => { const g = gunu(iso); return (!bas || g >= bas) && (!bit || g <= bit); };

  const fMembers = useMemo(() => members.filter((m) => arada(m.kayit)).sort((a, b) => b.kayit.localeCompare(a.kayit)), [members, bas, bit]);
  const fOrders = useMemo(() => orders.filter((o) => arada(o.tarih)).sort((a, b) => b.tarih.localeCompare(a.tarih)), [orders, bas, bit]);

  const stats = useMemo(() => {
    const urun = fOrders.reduce((t, o) => t + o.adet, 0);    // satılan ürün (analiz + hediye)
    const satis = fOrders.reduce((t, o) => t + o.total, 0);
    const apiUsd = urun * apiMaliyetUSD;          // satılan her ürün bir üretim tüketir (henüz üretilmemiş/hediye olsa da)
    const apiTl = apiUsd * kur;                   // API maliyeti ₺ (güncel kur)
    const posTl = satis * (posOrani / 100);       // toplam sanal pos kesintisi ₺
    const birim = urun > 0 ? (apiTl + posTl) / urun : 0; // ürün başına ortalama maliyet ₺
    return { uye: fMembers.length, siparis: fOrders.length, urun, satis, apiUsd, apiTl, posTl, birim };
  }, [fMembers, fOrders, apiMaliyetUSD, posOrani, kur]);

  // Ürün başına kırılım (filtreye göre): analiz adedi, hediye adedi, toplam tutar
  const urunKirilim = useMemo(() => {
    const map: Record<string, { analiz: number; hediye: number; tutar: number }> = {};
    for (const p of GORUNUR) map[p.slug] = { analiz: 0, hediye: 0, tutar: 0 };
    for (const o of fOrders) {
      for (const it of o.items) {
        if (!map[it.slug]) map[it.slug] = { analiz: 0, hediye: 0, tutar: 0 };
        if (it.hediye) map[it.slug].hediye++;
        else map[it.slug].analiz++;
        map[it.slug].tutar += it.fiyat;
      }
    }
    return map;
  }, [fOrders]);

  const hizliFiltre = (tip: "bugun" | "hafta" | "ay" | "sene") => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (tip === "hafta") { const off = (now.getDay() + 6) % 7; start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - off); }
    else if (tip === "ay") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (tip === "sene") start = new Date(now.getFullYear(), 0, 1);
    setBas(fmt(start)); setBit(fmt(now)); setHizli(tip);
  };
  const temizle = () => { setBas(""); setBit(""); setHizli(""); };

  const kart = (etiket: string, deger: React.ReactNode, alt?: string) => (
    <div className="rounded-2xl border border-gold/15 bg-night-deep p-5">
      <div className="text-[11px] uppercase tracking-[0.15em] text-parchment/50">{etiket}</div>
      <div className="mt-2 font-body text-2xl font-semibold text-parchment">{deger}</div>
      {alt && <div className="mt-0.5 text-[11px] text-parchment/40">{alt}</div>}
    </div>
  );

  return (
    <div>
      <div className="mb-7"><h1 className="font-display text-3xl font-semibold text-parchment">Genel Bakış</h1></div>

      {/* Filtre barı */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gold/15 bg-night-deep p-4">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Başlangıç</label>
          <input type="date" value={bas} onChange={(e) => { setBas(e.target.value); setHizli(""); }} className={selCls} style={{ colorScheme: "dark" }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Bitiş</label>
          <input type="date" value={bit} onChange={(e) => { setBit(e.target.value); setHizli(""); }} className={selCls} style={{ colorScheme: "dark" }} />
        </div>
        <div className="flex gap-1.5">
          {([["bugun", "Bugün"], ["hafta", "Bu Hafta"], ["ay", "Bu Ay"], ["sene", "Bu Sene"]] as const).map(([t, l]) => (
            <button key={t} onClick={() => hizliFiltre(t)} className={`rounded-lg border px-3 py-2 text-sm transition-colors ${hizli === t ? "border-gold/60 bg-gold/15 text-gold-bright" : "border-gold/25 text-parchment/70 hover:text-gold-bright"}`}>{l}</button>
          ))}
        </div>
        {(bas || bit) && <button onClick={temizle} className="rounded-lg border border-gold/25 px-3 py-2 text-sm text-parchment/65 transition-colors hover:text-gold-bright">Temizle</button>}
        <span className="ml-auto text-xs text-parchment/40">{bas || bit ? "filtreli aralık" : "tüm zamanlar"}</span>
      </div>

      {/* 7 kart */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {kart("Toplam Üye", stats.uye)}
        {kart("Toplam Sipariş", stats.siparis)}
        {kart("Satılan Ürün", stats.urun, "analiz + hediye")}
        {kart("Toplam Satış", <span className="text-gold-bright">{try0(stats.satis)} ₺</span>)}
        {kart("API Maliyeti", <span className="text-rose-300">{try0(stats.apiTl)} ₺</span>, `$${stats.apiUsd.toFixed(2)} · ${stats.urun} ürün${kur ? ` · kur ${kur.toFixed(2)}` : ""}`)}
        {kart("Sanal POS Kesintisi", <span className="text-rose-300">{try0(stats.posTl)} ₺</span>, `%${posOrani} oran`)}
        {kart("Birim Maliyet", <span className="text-amber-300">{try0(stats.birim)} ₺</span>, "ürün başına ortalama")}
      </div>

      {/* Ürün başına kırılım (7 kart) */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        {GORUNUR.map((p) => {
          const k = urunKirilim[p.slug] ?? { analiz: 0, hediye: 0, tutar: 0 };
          return (
            <div key={p.slug} className="rounded-xl border border-gold/15 bg-night-deep p-4">
              <div className="flex items-center gap-1.5">
                <span className="text-base" style={{ color: p.accent }}>{p.glyph}</span>
                <span className="truncate text-[13px] font-medium text-parchment/85">{p.ad}</span>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-parchment/50">Analiz</span><span className="font-body font-semibold text-parchment">{k.analiz}</span></div>
                <div className="flex justify-between"><span className="text-parchment/50">Hediye</span><span className="font-body font-semibold text-[#ec4d8f]">{k.hediye}</span></div>
                <div className="mt-1 flex justify-between border-t border-gold/10 pt-1.5"><span className="text-parchment/50">Tutar</span><span className="font-body font-semibold text-gold-bright">{k.tutar.toLocaleString("tr-TR")} ₺</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2 tablo yanyana */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Son Üyeler</div>
          {fMembers.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-parchment/45">Üye yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm">
                <thead>
                  <tr className="border-b border-gold/10 text-left text-[11px] uppercase tracking-wider text-parchment/45">
                    <th className="px-5 py-2.5 font-medium">Üye</th>
                    <th className="px-5 py-2.5 font-medium">Fatura Bilgisi</th>
                    <th className="px-5 py-2.5 font-medium text-right">Kayıt</th>
                  </tr>
                </thead>
                <tbody>
                  {fMembers.slice(0, 10).map((m) => (
                    <tr key={m.email} className="border-b border-white/5 last:border-0 align-top">
                      <td className="px-5 py-3">
                        <div className="text-parchment/85">{m.ad || m.email}</div>
                        {m.ad && <div className="text-xs text-parchment/45">{m.email}</div>}
                      </td>
                      <td className="px-5 py-3 text-xs text-parchment/60">
                        {m.tel || m.adres ? (
                          <div className="space-y-0.5">
                            {m.tel && <div>☎ {m.tel}</div>}
                            {m.adres && <div className="line-clamp-1">⌖ {m.adres}</div>}
                          </div>
                        ) : (
                          <span className="text-parchment/30">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-parchment/45">{m.kayit.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="border-b border-gold/15 px-5 py-3 text-sm font-medium text-parchment/70">Son Siparişler</div>
          {fOrders.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-parchment/45">Sipariş yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-gold/10 text-left text-[11px] uppercase tracking-wider text-parchment/45">
                    <th className="px-5 py-2.5 font-medium">Üye</th>
                    <th className="px-5 py-2.5 font-medium">Ürünler</th>
                    <th className="px-5 py-2.5 font-medium text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {fOrders.slice(0, 10).map((o) => (
                    <tr key={o.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-parchment/85">{o.ad}</td>
                      <td className="px-5 py-3 text-xs text-parchment/60">{o.urunler.join(", ")}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-body font-semibold text-gold-bright">{o.total} ₺</div>
                        <div className="text-[11px] text-parchment/45">{tarihSaat(o.tarih)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
