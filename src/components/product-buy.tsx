"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { slug: string; ad: string; fiyat?: number; eskiFiyat?: number; gorsel?: string; objectPos?: string };

// Yıldız/parıltı ikonu — "Analizi Yap" için (sepet/hediye ikonları kaldırıldı; ürün artık ücretsiz)
function SparkIco({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

// "Analizi Yap": üye + günlük limit kontrolüyle analiz hakkı oluşturur, sonra Analizlerim'e yönlendirir.
function useAnalizYap(slug: string) {
  const router = useRouter();
  const [yuk, setYuk] = useState(false);
  const [hata, setHata] = useState("");
  const yap = async () => {
    setHata("");
    setYuk(true);
    let d: { ok?: boolean; error?: string; needLogin?: boolean; needBirth?: boolean; cift?: boolean; reportId?: string } = {};
    try {
      const r = await fetch("/api/analiz/olustur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      d = await r.json();
      if (!r.ok) {
        setYuk(false);
        if (d.needLogin) return router.push(`/giris?next=/analizler/${slug}`);
        if (d.needBirth) return router.push(`/hesabim/dogum?next=${encodeURIComponent(`/analizler/${slug}`)}`);
        return setHata(d.error || "Bir hata oluştu.");
      }
    } catch {
      setYuk(false);
      return setHata("Bağlantı hatası. Tekrar dene.");
    }
    // Çift analiz: 2. kişi bilgisi için analiz sayfasına; tek kişilik: üretim başladı, Analizlerim'e
    if (d.cift && d.reportId) { router.push(`/hesabim/analiz/${d.reportId}`); return; }
    router.push("/hesabim?yeni=1");
    router.refresh();
  };
  return { yap, yuk, hata };
}

export function BuyButtons({ slug }: Props) {
  const { yap, yuk, hata } = useAnalizYap(slug);
  return (
    <div className="mt-5 space-y-3">
      <button
        onClick={yap}
        disabled={yuk}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3 text-center font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60"
      >
        <SparkIco />
        {yuk ? "Hazırlanıyor…" : "Analizi Yap"}
      </button>
      {hata && <p className="text-center text-sm text-rose-300">{hata}</p>}
      <p className="text-center text-xs text-parchment/45">Ücretsiz · günde 1 analiz hakkın var</p>
      <Link href={`/ornekler#${slug}`} className="block w-full py-1 text-center text-sm text-parchment/70 hover:text-gold-bright">
        veya örnekleri incele
      </Link>
    </div>
  );
}

// Mobilde alt sabit bar — ürün adı + "Ücretsiz" + Analizi Yap
export function MobileBuyBar({ slug, ad }: Props) {
  const { yap, yuk, hata } = useAnalizYap(slug);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-night-deep/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-parchment/85">{ad}</div>
          <div className="font-body text-lg font-semibold text-gold-bright">Ücretsiz{hata ? <span className="ml-2 text-xs font-normal text-rose-300">{hata}</span> : null}</div>
        </div>
        <button
          onClick={yap}
          disabled={yuk}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60"
        >
          <SparkIco className="h-4 w-4" />
          {yuk ? "Hazırlanıyor…" : "Analizi Yap"}
        </button>
      </div>
    </div>
  );
}
