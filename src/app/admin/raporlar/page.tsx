"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, PageHead, Badge } from "@/components/admin-ui";
import { SearchBox } from "@/components/admin-search";

type Dogum = { ad: string; tarih: string; saat: string; yer: string; not?: string };
type Report = { id: string; email: string; urunAd: string; durum: "bekliyor" | "olusturuluyor" | "hazir"; dogum?: Dogum; dosya?: string; indirildi?: boolean; tarih: string };

const TONE = { bekliyor: "amber", olusturuluyor: "blue", hazir: "green" } as const;
const ETIKET = { bekliyor: "Bilgi bekleniyor", olusturuluyor: "Oluşturuluyor", hazir: "Hazır" } as const;
const tarihSaat = (iso: string) => { try { return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso.slice(0, 16); } };

export default function RaporlarPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [q, setQ] = useState("");
  const [iletilen, setIletilen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports").then((r) => r.json()).then((d) => setReports(d.reports ?? [])).catch(() => {});
  }, []);

  const ilet = async (reportId: string) => {
    setBusy(reportId);
    const r = await fetch("/api/admin/reports/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId }) });
    setBusy(null);
    if (r.ok) { setIletilen(reportId); setTimeout(() => setIletilen((c) => (c === reportId ? null : c)), 2000); }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return reports;
    return reports.filter((r) => r.email.toLowerCase().includes(s) || r.urunAd.toLowerCase().includes(s) || (r.dogum?.ad ?? "").toLowerCase().includes(s));
  }, [reports, q]);

  return (
    <div>
      <PageHead title="Raporlar" desc={`${reports.length} analiz kaydı. Üretim ve atama için “Rapor Oluştur” sekmesini kullan.`} action={<SearchBox value={q} onChange={setQ} placeholder="E-posta, ürün, isim ara…" />} />
      <Panel>
        {reports.length === 0 ? (
          <div className="px-6 py-16 text-center text-parchment/45">Henüz analiz kaydı yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gold/15 text-left text-xs uppercase tracking-wider text-parchment/45">
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Ürün</th>
                  <th className="px-4 py-3 font-medium">Doğum Bilgisi</th>
                  <th className="px-4 py-3 font-medium">Oluşturma Tarihi</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 align-top hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-parchment/70">{r.email}</td>
                    <td className="px-4 py-3 text-parchment/85">{r.urunAd}</td>
                    <td className="px-4 py-3 text-parchment/60">
                      {r.dogum ? (
                        <div className="text-xs leading-relaxed">
                          <div className="text-parchment/85">{r.dogum.ad}</div>
                          <div>{r.dogum.tarih} {r.dogum.saat}</div>
                          <div>{r.dogum.yer}</div>
                          {r.dogum.not && <div className="text-parchment/40">“{r.dogum.not}”</div>}
                        </div>
                      ) : (
                        <span className="text-parchment/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-parchment/60">{tarihSaat(r.tarih)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={TONE[r.durum]}>{ETIKET[r.durum]}</Badge>
                        {r.durum === "hazir" && r.indirildi && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300" title="Müşteri raporu indirdi">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12.5 4.5 4.5L19 6.5"/></svg>
                            İndirildi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.dosya ? (
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/api/files/${r.dosya}`} target="_blank" rel="noopener" className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-parchment/70 hover:text-gold-bright">İndir</a>
                          <button
                            onClick={() => ilet(r.id)}
                            disabled={busy === r.id}
                            title="Müşteriye e-posta ile ilet"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-1.5 text-xs text-gold-bright transition-colors hover:bg-gold/10 disabled:opacity-50"
                          >
                            {iletilen === r.id ? (
                              "İletildi ✓"
                            ) : (
                              <>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 5.5L20.5 7"/></svg>
                                {busy === r.id ? "İletiliyor…" : "E-posta ile ilet"}
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-parchment/30">—</span>
                      )}
                    </td>
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
