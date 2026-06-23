"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getProduct } from "@/lib/products";
import { KartIkon } from "@/components/kart-ikon";

type Report = { id: string; slug: string; urunAd: string; durum: "bekliyor" | "olusturuluyor" | "hazir"; dosya?: string; dogum?: { ad: string }; dogum2?: { ad: string }; adminIletti?: boolean; tarih: string };
type Order = { id: string; items: { slug: string; ad: string; fiyat: number; hediye?: boolean }[]; total: number; durum: string; hediye: boolean; faturaDosya?: string; tarih: string };
type Gift = { kod: string; urunAd: string; durum: "aktif" | "kullanildi"; kullanan?: string; tarih: string };

// ISO tarihi "12 Haziran 2026" gibi TR formatına çevir
const olusmaTarihi = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso.slice(0, 10); }
};

// Üretim sırasında dönen 8 etap (sırayla yazılıp silinir, son etapta kalır)
const ETAPLAR = [
  "Doğum anı okunuyor",
  "Gök konumları hesaplanıyor",
  "Yükselen ve evler kuruluyor",
  "Açılar ölçülüyor",
  "İmzalar ve elementler analiz ediliyor",
  "Anlam blokları eşleşiyor",
  "Yapay zekâ yorumluyor",
  "PDF hazırlanıyor",
];

function Hazirlaniyor() {
  const [text, setText] = useState("");
  useEffect(() => {
    let iptal = false;
    let timer: ReturnType<typeof setTimeout>;
    const yaz = (s: number) => {
      const tam = ETAPLAR[s];
      let pos = 0;
      const ekle = () => {
        if (iptal) return;
        pos++;
        setText(tam.slice(0, pos));
        if (pos < tam.length) timer = setTimeout(ekle, 48);
        else if (s === ETAPLAR.length - 1) return; // son etap: kalsın
        else timer = setTimeout(sil, 1500);
      };
      const sil = () => {
        if (iptal) return;
        pos--;
        setText(tam.slice(0, pos));
        if (pos > 0) timer = setTimeout(sil, 28);
        else timer = setTimeout(() => yaz(s + 1), 260);
      };
      ekle();
    };
    yaz(0);
    return () => { iptal = true; clearTimeout(timer); };
  }, []);
  return (
    <span className="mt-1 inline-flex items-center text-xs text-sky-300">
      {text}
      <span className="ml-0.5 animate-pulse">…</span>
    </span>
  );
}

const MIN_SURE = 30000; // rapor erken çıksa bile en az 30 sn animasyon

export function Analizlerim() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const baslangic = useRef<Record<string, number>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    let aktif = true;
    const yukle = () =>
      fetch("/api/account/reports").then((r) => r.json()).then((d) => { if (aktif) setReports(d.reports ?? []); }).catch(() => { if (aktif) setReports([]); });
    yukle();
    let n = 0;
    const iv = setInterval(() => {
      n++;
      setTick((t) => t + 1); // geçen süreyi yeniden hesapla (1 sn)
      if (n % 3 === 0) yukle(); // 3 sn'de bir durumu çek
    }, 1000);
    return () => { aktif = false; clearInterval(iv); };
  }, []);

  // "olusturuluyor"a geçen raporun başlangıç zamanını işaretle
  useEffect(() => {
    if (!reports) return;
    const now = Date.now();
    for (const r of reports) {
      if (r.durum === "olusturuluyor" && !baslangic.current[r.id]) baslangic.current[r.id] = now;
    }
  }, [reports]);

  return (
    <section className="rounded-2xl border border-gold/15 bg-night p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-parchment"><KartIkon d="analiz" className="!h-[22px] !w-[22px]" />Analizlerim</h2>
      {reports && reports.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gold/20 px-5 py-10 text-center">
          <div className="text-2xl text-gold-bright/50">✶</div>
          <p className="mt-2 text-sm text-parchment/70">Henüz bir analizin yok.</p>
          <Link href="/analizler" className="mt-4 inline-block rounded-full bg-gold px-5 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright">
            Analizleri Keşfet
          </Link>
        </div>
      ) : (
        <div className="scroll-soft mt-4 max-h-[21rem] space-y-3 overflow-y-auto pr-2">
          {(reports ?? []).map((r) => {
            const p = getProduct(r.slug);
            const bas = baslangic.current[r.id];
            const gecen = bas ? Date.now() - bas : Infinity;
            // olusturuluyor ise ya da hazır olsa bile 30 sn dolmadıysa animasyon göster
            const animasyon = r.durum === "olusturuluyor" || (r.durum === "hazir" && bas !== undefined && gecen < MIN_SURE);
            const isim = r.dogum?.ad ? ` - ${r.dogum.ad}${r.dogum2?.ad ? " & " + r.dogum2.ad : ""}` : "";
            return (
              <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-gold/10 bg-night-2 p-2.5">
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md border border-gold/15">
                  {p?.gorsel ? (
                    <Image src={p.gorsel} alt="" fill sizes="48px" style={{ objectPosition: p.objectPos ?? "center 22%" }} className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-night-deep text-gold-bright/40">✶</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-parchment/90">{r.urunAd}</div>
                  {animasyon ? (
                    <Hazirlaniyor />
                  ) : r.durum === "hazir" ? (
                    <>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">Hazır{isim}</span>
                        {r.adminIletti && (
                          <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-bright/80">admin tarafından iletildi</span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-parchment/45">{olusmaTarihi(r.tarih)} tarihinde oluşturuldu</div>
                    </>
                  ) : r.dogum ? (
                    <>
                      <span className="mt-1 inline-flex items-center rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">Oluşturulamadı</span>
                      <div className="mt-1 text-[11px] leading-relaxed text-parchment/45">Geçici bir sorun oldu, raporun oluşturulamadı. Tekrar deneyebilirsin; sorun sürerse kısa sürede biz hallederiz.</div>
                    </>
                  ) : (
                    <span className="mt-1 inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">Bilgi bekleniyor</span>
                  )}
                </div>
                {!animasyon && r.durum === "hazir" && r.dosya ? (
                  <a href={`/api/files/${r.dosya}`} target="_blank" rel="noopener" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-[11px] font-medium text-night-deep transition-colors hover:bg-gold-bright">
                    İndir
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>
                  </a>
                ) : !animasyon && r.durum === "bekliyor" ? (
                  <Link href={`/hesabim/analiz/${r.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 px-3 py-1.5 text-[11px] font-medium text-gold-bright transition-colors hover:bg-gold/10">
                    {r.dogum ? "Tekrar dene" : "Analiz"}
                    <span aria-hidden>→</span>
                  </Link>
                ) : animasyon ? (
                  <span className="shrink-0 text-right text-[11px] leading-tight text-parchment/50">
                    birkaç dakikada
                    <br />
                    raporun hazır
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function Siparislerim() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  useEffect(() => {
    fetch("/api/account/orders").then((r) => r.json()).then((d) => setOrders(d.orders ?? [])).catch(() => setOrders([]));
  }, []);

  return (
    <section className="rounded-2xl border border-gold/15 bg-night p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-parchment"><KartIkon d="siparis" className="!h-[22px] !w-[22px]" />Siparişlerim</h2>
      {orders && orders.length === 0 ? (
        <p className="mt-4 text-sm text-parchment/55">Henüz siparişin yok.</p>
      ) : (
        <div className="scroll-soft mt-4 max-h-[21rem] space-y-3 overflow-y-auto pr-2">
          {(orders ?? []).map((o) => (
            <div key={o.id} className="rounded-xl border border-gold/10 bg-night-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[13px] text-parchment/80">{o.id}</span>
                <span className="font-body font-semibold text-gold-bright">{o.total} ₺</span>
              </div>
              <div className="mt-1 text-xs text-parchment/55">{o.items.map((i) => i.ad + (i.hediye ? " (hediye)" : "")).join(", ")}</div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-parchment/45">{o.tarih.slice(0, 10)}</span>
                {o.faturaDosya ? (
                  <a href={`/api/files/${o.faturaDosya}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-gold-bright hover:underline">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
                    Faturayı indir
                  </a>
                ) : (
                  <span className="text-parchment/35">Fatura hazırlanıyor</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function HediyeKodlarim() {
  const [codes, setCodes] = useState<Gift[] | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/account/gift-codes").then((r) => r.json()).then((d) => setCodes(d.codes ?? [])).catch(() => setCodes([]));
  }, []);

  const kopyala = async (kod: string) => {
    try {
      await navigator.clipboard.writeText(kod);
    } catch {
      // pano erişimi yoksa sessizce geç
    }
    setKopyalanan(kod);
    setTimeout(() => setKopyalanan((c) => (c === kod ? null : c)), 1500);
  };

  return (
    <>
      {codes && codes.length === 0 ? null : (
        <div className="scroll-soft mt-1 max-h-[8.5rem] space-y-2 overflow-y-auto pr-2">
          {(codes ?? []).map((g) => {
            const aktif = g.durum === "aktif";
            return (
              <button
                key={g.kod}
                type="button"
                onClick={() => kopyala(g.kod)}
                title="Kopyalamak için tıkla"
                className="block w-full rounded-lg border border-gold/10 bg-night-2 p-2.5 text-left transition-colors hover:border-gold/35"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm tracking-wide text-gold-bright">
                    {g.kod}
                    {kopyalanan === g.kod ? (
                      <span className="text-[10px] text-emerald-300">Kopyalandı ✓</span>
                    ) : (
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-parchment/40"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                    )}
                  </span>
                  {aktif ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">Henüz kullanılmadı</span>
                  ) : (
                    <span className="rounded-full border border-parchment/20 bg-parchment/10 px-2 py-0.5 text-[10px] text-parchment/60">Kullanıldı</span>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-parchment/50">{g.urunAd}</div>
                {!aktif && g.kullanan && (
                  <div className="mt-0.5 text-[11px] text-parchment/40">Kullanan: <span className="font-medium text-[#e8975a]">{g.kullanan}</span></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
