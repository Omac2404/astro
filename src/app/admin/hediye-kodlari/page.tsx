"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";
import { SearchBox } from "@/components/admin-search";
import { MemberSelect } from "@/components/member-select";
import { PRODUCTS } from "@/lib/products";

type Gift = { kod: string; slug: string; urunAd: string; sahip: string; durum: "aktif" | "kullanildi"; kaynak?: "musteri" | "admin"; kullanan?: string; tarih: string };
type Member = { id: string; email: string };

const inputCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55";

export default function HediyeKodlariPage() {
  const [codes, setCodes] = useState<Gift[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [slug, setSlug] = useState(PRODUCTS[0].slug);
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const [fUrun, setFUrun] = useState("");
  const [fKaynak, setFKaynak] = useState("");
  const [fDurum, setFDurum] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/gift-codes").then((r) => r.json()).then((d) => setCodes(d.codes ?? [])).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    fetch("/api/admin/members").then((r) => r.json()).then((d) => setMembers(d.members ?? [])).catch(() => {});
  }, [load]);

  const olustur = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/gift-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, email: email || undefined }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setMsg(email ? `Kod oluşturuldu (${d.kod}) ve ${email} adresine iletildi.` : `Kod oluşturuldu: ${d.kod}`);
      load();
    } else setMsg(d.error || "Hata.");
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return codes.filter((c) => {
      if (fUrun && c.slug !== fUrun) return false;
      if (fKaynak && (c.kaynak || "admin") !== fKaynak) return false;
      if (fDurum && c.durum !== fDurum) return false;
      if (s && !(c.kod.toLowerCase().includes(s) || c.urunAd.toLowerCase().includes(s) || c.sahip.toLowerCase().includes(s) || (c.kullanan ?? "").toLowerCase().includes(s))) return false;
      return true;
    });
  }, [codes, q, fUrun, fKaynak, fDurum]);

  const aktif = codes.filter((c) => c.durum === "aktif").length;

  return (
    <div>
      <PageHead title="Hediye Kodları" desc={`${aktif} aktif, ${codes.length - aktif} kullanıldı.`} action={<SearchBox value={q} onChange={setQ} placeholder="Kod, ürün, e-posta ara…" />} />

      {/* Oluştur */}
      <Panel className="mb-6 p-5">
        <h2 className="mb-4 font-display text-lg font-semibold text-parchment">Yeni hediye kodu oluştur</h2>
        <form onSubmit={olustur} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Ürün</label>
            <select value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls}>
              {PRODUCTS.map((p) => <option key={p.slug} value={p.slug}>{p.ad}</option>)}
            </select>
          </div>
          <div className="min-w-[260px]">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Müşteriye ilet (isteğe bağlı)</label>
            <MemberSelect members={members} value={email} onChange={setEmail} placeholder="Müşteri ara — boş bırakırsan sadece oluşturulur" />
          </div>
          <button disabled={busy} className="rounded-full bg-gold px-4 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {busy ? "Oluşturuluyor…" : "+ Kod Oluştur"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-emerald-300">{msg}</p>}
      </Panel>

      {/* Filtre çubuğu */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gold/15 bg-night-deep p-4">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Ürün</label>
          <select value={fUrun} onChange={(e) => setFUrun(e.target.value)} className={inputCls} style={{ colorScheme: "dark" }}>
            <option value="">Tümü</option>
            {PRODUCTS.map((p) => <option key={p.slug} value={p.slug}>{p.ad}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Oluşturma tipi</label>
          <select value={fKaynak} onChange={(e) => setFKaynak(e.target.value)} className={inputCls} style={{ colorScheme: "dark" }}>
            <option value="">Tümü</option>
            <option value="musteri">Müşteri siparişi</option>
            <option value="admin">Admin oluşturdu</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Durum</label>
          <select value={fDurum} onChange={(e) => setFDurum(e.target.value)} className={inputCls} style={{ colorScheme: "dark" }}>
            <option value="">Tümü</option>
            <option value="aktif">Kullanılmadı</option>
            <option value="kullanildi">Kullanıldı</option>
          </select>
        </div>
        {(fUrun || fKaynak || fDurum || q) && (
          <button onClick={() => { setFUrun(""); setFKaynak(""); setFDurum(""); setQ(""); }} className="rounded-lg border border-gold/25 px-3 py-2 text-sm text-parchment/65 transition-colors hover:text-gold-bright">Temizle</button>
        )}
      </div>

      <Panel>
        {codes.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Henüz hediye kodu yok.</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Filtreyle eşleşen kod yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Ürün</th>
                  <th className="px-4 py-3 font-medium">Oluşturma</th>
                  <th className="px-4 py-3 font-medium">Sahip</th>
                  <th className="px-4 py-3 font-medium">Kullanan</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.kod} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-parchment/90">{c.kod}</td>
                    <td className="px-4 py-3 text-parchment/65">{c.urunAd}</td>
                    <td className="px-4 py-3">
                      {(c.kaynak || "admin") === "musteri" ? (
                        <Badge tone="blue">Müşteri siparişi</Badge>
                      ) : (
                        <Badge tone="amber">Admin</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-parchment/55">{c.sahip}</td>
                    <td className="px-4 py-3 text-parchment/55">{c.kullanan ?? "—"}</td>
                    <td className="px-4 py-3"><Badge tone={c.durum === "aktif" ? "green" : "gray"}>{c.durum === "aktif" ? "Kullanılmadı" : "Kullanıldı"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
