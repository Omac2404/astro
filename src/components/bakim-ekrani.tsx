"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function kalan(bitisISO: string) {
  if (!bitisISO) return null;
  const hedef = new Date(bitisISO).getTime();
  if (isNaN(hedef)) return null;
  const diff = hedef - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return { gun: Math.floor(s / 86400), saat: Math.floor((s % 86400) / 3600), dakika: Math.floor((s % 3600) / 60), saniye: s % 60 };
}

function Birim({ deger, etiket }: { deger: number; etiket: string }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl border border-gold/20 bg-night-deep/60 px-3 py-3 sm:min-w-[80px] sm:px-4 sm:py-4">
      <span className="font-body text-3xl font-semibold tabular-nums text-gold-bright sm:text-4xl">{String(deger).padStart(2, "0")}</span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-parchment/50 sm:text-xs">{etiket}</span>
    </div>
  );
}

export function BakimEkrani({ mesaj, bitis }: { mesaj: string; bitis: string }) {
  const [k, setK] = useState(() => kalan(bitis));

  useEffect(() => {
    setK(kalan(bitis));
    const t = setInterval(() => setK(kalan(bitis)), 1000);
    return () => clearInterval(t);
  }, [bitis]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-night-deep px-6 text-center">
      {/* hafif yıldız/parıltı dokusu */}
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 50% 30%, rgba(194,163,107,0.12), transparent 60%)" }} />
      <div className="relative z-10 flex flex-col items-center">
        <Image src="/gorsel/logo-dikey.png" alt="Gökname" width={588} height={373} priority className="h-28 w-auto sm:h-36" />

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-parchment/80 sm:text-xl">
          {mesaj || "Kısa bir bakımdayız, çok yakında yeniden sizlerleyiz."}
        </p>

        {k && (
          <div className="mt-9 flex items-center gap-2.5 sm:gap-3.5">
            <Birim deger={k.gun} etiket="Gün" />
            <Birim deger={k.saat} etiket="Saat" />
            <Birim deger={k.dakika} etiket="Dakika" />
            <Birim deger={k.saniye} etiket="Saniye" />
          </div>
        )}
      </div>
    </div>
  );
}
