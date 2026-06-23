"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Doğum bilgisi gönderildikten sonra çıkan "hazırlanıyor" popup'ı.
// NOT: Hesabım > Analizlerim'deki Hazirlaniyor animasyonuyla aynı etaplar; oradaki
// dinamik yapıya DOKUNMAMAK için burada bağımsız bir kopya tutuluyor.
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

// Site-uyumlu dekoratif yıldızlar (marka renkleri; her biri kendi gecikme/süresiyle parıldar).
const STARS = [
  { top: 10, left: 12, size: 2.6, delay: 0.2, dur: 3.4, color: "#dcc188" },
  { top: 18, left: 82, size: 1.8, delay: 1.1, dur: 4.2, color: "#ffffff" },
  { top: 30, left: 46, size: 1.6, delay: 2.0, dur: 3.0, color: "#c3a6e8" },
  { top: 8, left: 60, size: 2.0, delay: 0.7, dur: 4.8, color: "#f4ead1" },
  { top: 44, left: 8, size: 2.3, delay: 1.6, dur: 3.6, color: "#dcc188" },
  { top: 58, left: 90, size: 1.7, delay: 0.4, dur: 4.0, color: "#ffffff" },
  { top: 72, left: 20, size: 2.1, delay: 2.4, dur: 3.2, color: "#c3a6e8" },
  { top: 80, left: 68, size: 1.6, delay: 1.3, dur: 4.6, color: "#f4ead1" },
  { top: 90, left: 40, size: 2.4, delay: 0.9, dur: 3.8, color: "#dcc188" },
  { top: 24, left: 30, size: 1.5, delay: 3.0, dur: 3.4, color: "#ffffff" },
  { top: 64, left: 52, size: 1.8, delay: 2.7, dur: 4.4, color: "#c3a6e8" },
  { top: 50, left: 74, size: 2.0, delay: 0.5, dur: 3.0, color: "#dcc188" },
  { top: 86, left: 88, size: 1.6, delay: 1.9, dur: 4.2, color: "#f4ead1" },
  { top: 14, left: 95, size: 1.7, delay: 2.2, dur: 3.6, color: "#ffffff" },
];

type Durum = { durum: string; dosya?: string } | null;

export function AnalizHazirlaniyorModal({ reportId }: { reportId: string }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<Durum>(null);

  // Etap yazımı (jenerasyon görseli) — son etapta kalır.
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
        else if (s === ETAPLAR.length - 1) return;
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

  // Gerçek rapor durumunu izle (3 sn'de bir) — PDF gerçekten hazır olunca geri bildirim ver.
  useEffect(() => {
    let aktif = true;
    const yukle = () =>
      fetch("/api/account/reports")
        .then((r) => r.json())
        .then((d) => {
          if (!aktif) return;
          const rep = (d.reports ?? []).find((x: { id: string }) => x.id === reportId);
          if (rep) setReport(rep);
        })
        .catch(() => {});
    yukle();
    const iv = setInterval(yukle, 3000);
    return () => { aktif = false; clearInterval(iv); };
  }, [reportId]);

  const hazir = report?.durum === "hazir" && !!report?.dosya;
  const hata = report?.durum === "bekliyor"; // 3 denemeye rağmen üretilemedi -> "bekliyor"

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-night-deep/85 px-5 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gold/20 bg-night p-7 text-center shadow-2xl">
        {/* Dekoratif animasyonlu yıldızlar */}
        <div className="pointer-events-none absolute inset-0 z-0">
          {STARS.map((s, i) => (
            <span
              key={i}
              className="star-dot"
              style={{
                top: `${s.top}%`,
                left: `${s.left}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                color: s.color,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          {hazir ? (
            <>
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-2xl text-emerald-300">✓</div>
              <h2 className="font-display text-2xl font-semibold text-parchment">Raporun Hazır</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-parchment/60">
                Analizin tamamlandı. PDF olarak indirebilir ya da “Analizlerim”den her zaman ulaşabilirsin.
              </p>
              <a
                href={`/api/files/${report!.dosya}`}
                target="_blank"
                rel="noopener"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright"
              >
                Raporu İndir
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14" /></svg>
              </a>
              <Link href="/hesabim" className="mt-2 block text-sm text-parchment/55 hover:text-gold-bright">Analizlerime git</Link>
            </>
          ) : hata ? (
            <>
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15 text-2xl text-rose-300">!</div>
              <h2 className="font-display text-2xl font-semibold text-parchment">Bir sorun oldu</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-parchment/60">
                Raporun şu an oluşturulamadı. “Analizlerim”den tekrar deneyebilirsin; sorun sürerse kısa sürede biz hallederiz.
              </p>
              <Link href="/hesabim" className="mt-5 block w-full rounded-full bg-gold py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright">
                Analizlerime Git
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold/25 border-t-gold-bright" />
              <h2 className="font-display text-2xl font-semibold text-parchment">Analizin Hazırlanıyor</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-parchment/60">
                Birkaç dakika sürebilir. Bu ekranı kapatabilirsin; hazır olunca burada ve “Analizlerim”de görünür.
              </p>
              <div className="mt-4 flex min-h-[1.5rem] items-center justify-center text-sm text-sky-300">
                {text}
                <span className="ml-0.5 animate-pulse">…</span>
              </div>
              <Link href="/hesabim" className="mt-6 block w-full rounded-full bg-gold py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright">
                Analizlerime Git
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
