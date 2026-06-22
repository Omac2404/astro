"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Panel, PageHead } from "@/components/admin-ui";
import { SearchBox } from "@/components/admin-search";

type Fatura = { ad?: string; email?: string; tel?: string; adres?: string } | null;
type Oge = { urunAd: string; durum?: string; kod?: string };
type Member = { id: string; email: string; kayit: string; fatura: Fatura; analizler: Oge[]; hediyeKodlari: Oge[]; hediyeEdilen: Oge[] };

const DURUM_KISA: Record<string, string> = { bekliyor: "bilgi bekleniyor", olusturuluyor: "oluşturuluyor", hazir: "hazır", aktif: "kullanılmadı", kullanildi: "kullanıldı" };
const selCls = "rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment outline-none focus:border-gold/55";

// Sayı rozeti + hover popup (portal → kart kesmez)
function SayiPopup({ items, baslik, renk = "gold" }: { items: Oge[]; baslik: string; renk?: "gold" | "rose" | "violet" }) {
  const n = items.length;
  const ref = useRef<HTMLSpanElement>(null);
  const [pop, setPop] = useState<{ left: number; bottom: number } | null>(null);
  const tones: Record<string, string> = { gold: "bg-gold/15 text-gold-bright", rose: "bg-[#ec4d8f]/15 text-[#ec4d8f]", violet: "bg-[#9b72d0]/15 text-[#c3a6e8]" };
  const ac = () => { const el = ref.current; if (el && n > 0) { const r = el.getBoundingClientRect(); setPop({ left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 8 }); } };
  return (
    <span
      ref={ref}
      onMouseEnter={ac}
      onMouseLeave={() => setPop(null)}
      className={`inline-flex h-7 min-w-7 cursor-default items-center justify-center rounded-full px-2 font-body text-sm font-semibold ${n > 0 ? tones[renk] : "border border-gold/15 text-parchment/35"}`}
    >
      {n}
      {pop && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", left: pop.left, bottom: pop.bottom, transform: "translateX(-50%)" }} className="pointer-events-none z-[200] w-60 rounded-lg border border-gold/20 bg-night-deep p-3 text-left shadow-xl shadow-black/50">
          <div className="mb-1 text-[11px] uppercase tracking-wider text-parchment/45">{baslik}</div>
          <ul className="space-y-1">
            {items.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-parchment/85">{a.urunAd}</span>
                {a.durum && <span className="shrink-0 text-parchment/45">{DURUM_KISA[a.durum] ?? a.durum}</span>}
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </span>
  );
}

type Sira = "" | "analiz" | "hediye" | "edilen";

export default function MusterilerPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [sira, setSira] = useState<Sira>("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetch("/api/admin/members").then((r) => r.json()).then((d) => setMembers(d.members ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = !s ? members : members.filter((m) => m.email.toLowerCase().includes(s) || (m.fatura?.ad ?? "").toLowerCase().includes(s) || (m.fatura?.tel ?? "").includes(s));
    if (sira) {
      const key = (m: Member) => (sira === "analiz" ? m.analizler.length : sira === "hediye" ? m.hediyeKodlari.length : m.hediyeEdilen.length);
      list = [...list].sort((a, b) => key(b) - key(a));
    }
    return list;
  }, [members, q, sira]);

  const toplam = useMemo(() => ({
    musteri: filtered.length,
    analiz: filtered.reduce((t, m) => t + m.analizler.length, 0),
    hediye: filtered.reduce((t, m) => t + m.hediyeKodlari.length, 0),
  }), [filtered]);

  const sil = async (email: string) => {
    if (!confirm(`${email} hesabını ve tüm verilerini (analizler, siparişler) kalıcı olarak silmek istediğine emin misin?`)) return;
    setBusy(email);
    const r = await fetch("/api/admin/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setBusy(null);
    if (r.ok) load();
  };

  return (
    <div>
      <PageHead title="Müşteriler" action={<SearchBox value={q} onChange={setQ} placeholder="E-posta, ad, telefon ara…" />} />

      {/* Sıralama */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-gold/15 bg-night-deep p-4">
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-parchment/45">Sırala</label>
          <select value={sira} onChange={(e) => setSira(e.target.value as Sira)} className={selCls} style={{ colorScheme: "dark" }}>
            <option value="">Kayıt (varsayılan)</option>
            <option value="analiz">Analiz: çoktan aza</option>
            <option value="hediye">Hediye kodu: çoktan aza</option>
            <option value="edilen">Hediye edilen: çoktan aza</option>
          </select>
        </div>

        {/* Özet — sağda kart */}
        <div className="ml-auto flex items-center divide-x divide-gold/15 rounded-xl border border-gold/20 bg-night/60 px-1">
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Toplam Müşteri</div>
            <div className="font-body text-xl font-semibold text-parchment">{toplam.musteri}</div>
          </div>
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Toplam Analiz</div>
            <div className="font-body text-xl font-semibold text-parchment">{toplam.analiz}</div>
          </div>
          <div className="px-4 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-parchment/45">Toplam Hediye</div>
            <div className="font-body text-xl font-semibold text-[#ec4d8f]">{toplam.hediye}</div>
          </div>
        </div>
      </div>

      <Panel>
        {members.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Henüz üye yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                  <th className="px-4 py-3 font-medium">E-posta</th>
                  <th className="px-4 py-3 font-medium">Fatura Bilgileri</th>
                  <th className="px-4 py-3 font-medium text-center">Analiz</th>
                  <th className="px-4 py-3 font-medium text-center">Hediye Kodu</th>
                  <th className="px-4 py-3 font-medium text-center">Hediye Edilen</th>
                  <th className="px-4 py-3 font-medium">Kayıt</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const f = m.fatura;
                  return (
                    <tr key={m.id} className="border-b border-white/5 last:border-0 align-top hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-parchment/90">{f?.ad || m.email}</div>
                        <div className="text-xs text-parchment/45">{m.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {f && (f.email || f.tel || f.adres) ? (
                          <div className="space-y-0.5 text-xs text-parchment/65">
                            <div>✉ {f.email || m.email}</div>
                            <div>☎ {f.tel || "—"}</div>
                            <div>⌖ {f.adres || "—"}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-parchment/35">Sipariş verince oluşur</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center"><SayiPopup items={m.analizler} baslik="Analizler" renk="gold" /></td>
                      <td className="px-4 py-3 text-center"><SayiPopup items={m.hediyeKodlari} baslik="Hediye kodları" renk="rose" /></td>
                      <td className="px-4 py-3 text-center"><SayiPopup items={m.hediyeEdilen} baslik="Hediye edilenler" renk="violet" /></td>
                      <td className="px-4 py-3 text-parchment/55">{m.kayit.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => sil(m.email)} disabled={busy === m.email} className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-50">
                          {busy === m.email ? "Siliniyor…" : "Hesabı Sil"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
