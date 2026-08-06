"use client";

import { useEffect, useState } from "react";
import { KartIkon } from "@/components/kart-ikon";

// Günlük analiz hakkı kartı — hak kullanıldıysa bir sonraki hakka (TR gece yarısı) canlı geri sayım.
// Sunucudaki kural: uyeBugunAnalizSayisi Europe/Istanbul gününe bakar → sayaç da TR gece yarısını hedefler.

function kalanMsTR(): number {
  const now = new Date();
  const tr = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const gecen = tr.getHours() * 3600 + tr.getMinutes() * 60 + tr.getSeconds();
  return (24 * 3600 - gecen) * 1000;
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sn = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sn)}`;
}

export function AnalizHakkiKarti({ kullanilan, limit, sinirsiz }: { kullanilan: number; limit: number; sinirsiz: boolean }) {
  const hakVar = sinirsiz || kullanilan < limit;
  const [kalan, setKalan] = useState<number | null>(null);

  useEffect(() => {
    if (hakVar) return;
    setKalan(kalanMsTR());
    const t = setInterval(() => {
      const ms = kalanMsTR();
      setKalan(ms);
      // Gece yarısı geçildi → hak yenilendi; sunucu durumunu almak için sayfayı tazele
      if (ms <= 1000 || ms > 23.9 * 3600 * 1000) window.location.reload();
    }, 1000);
    return () => clearInterval(t);
  }, [hakVar]);

  return (
    <section className="overflow-hidden rounded-2xl border border-gold/15 bg-night p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-parchment">
        <KartIkon d="analiz" />
        Günlük Analiz Hakkı
      </h2>
      {sinirsiz ? (
        <p className="mt-4 text-sm text-parchment/70">Bu hesap sınırsız — günlük limite takılmazsın ✨</p>
      ) : hakVar ? (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Bugünkü analiz hakkın hazır</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-parchment/45">
            Günde {limit} analiz oluşturabilirsin; hak her gece 00.00&apos;da (Türkiye saati) yenilenir.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.15em] text-parchment/50">Yeni analiz hakkına kalan</p>
          {/* Rakamlar için mono font: Cormorant (font-display) sayaçta okunaksızdı */}
          <div className="mt-2 font-mono text-3xl font-semibold tracking-[0.08em] tabular-nums text-gold-bright" suppressHydrationWarning>
            {kalan === null ? "--:--:--" : fmt(kalan)}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-parchment/45">
            Bugünkü hakkını kullandın ({kullanilan}/{limit}). Hak her gece 00.00&apos;da (Türkiye saati) yenilenir.
          </p>
        </div>
      )}
    </section>
  );
}
