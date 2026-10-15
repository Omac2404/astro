"use client";

import { useEffect, useRef, useState } from "react";

// Örnek rapor flipbook'u: PDF sayfalarının görselleri page-flip (StPageFlip, MIT) ile çevrilir.
// Görünür alana yaklaşınca yüklenir (sayfanın ilk açılışını ağırlaştırmaz). Masaüstü çift sayfa, mobil tek sayfa.
type PF = import("page-flip/dist/js/page-flip.module.js").PageFlip;

export function Flipbook({ sayfalar, pdf, ad, kilavuz }: { sayfalar: string[]; pdf: string; ad: string; kilavuz?: string }) {
  const kutu = useRef<HTMLDivElement>(null);
  const kitap = useRef<HTMLDivElement>(null);
  const pf = useRef<PF | null>(null);
  const [gorunur, setGorunur] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [sayfa, setSayfa] = useState(0);
  const toplam = sayfalar.length;

  // görünür alana yaklaşınca başlat
  useEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) { setGorunur(true); io.disconnect(); }
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!gorunur || !kitap.current) return;
    let iptal = false;
    (async () => {
      const { PageFlip } = await import("page-flip/dist/js/page-flip.module.js");
      if (iptal || !kitap.current) return;
      const f = new PageFlip(kitap.current, {
        width: 520, height: 735, size: "stretch",
        minWidth: 260, maxWidth: 620, minHeight: 368, maxHeight: 877,
        showCover: true, usePortrait: true, mobileScrollSupport: false,
        maxShadowOpacity: 0.45, flippingTime: 750, drawShadow: true,
      });
      f.loadFromHTML(kitap.current.querySelectorAll<HTMLElement>(".fb-sayfa"));
      f.on("flip", (e) => setSayfa(Number(e.data) || 0));
      pf.current = f;
      setHazir(true);
    })();
    return () => {
      iptal = true;
      try { pf.current?.destroy(); } catch {}
      pf.current = null;
    };
  }, [gorunur]);

  // Kapak otomatik açılsın: kitap gerçekten ekrana girince (yarısı görünür) bir kez ilk sayfayı çevir
  const acildi = useRef(false);
  useEffect(() => {
    if (!hazir || !kutu.current) return;
    const io = new IntersectionObserver((e) => {
      if (acildi.current || !e.some((x) => x.isIntersecting)) return;
      acildi.current = true;
      io.disconnect();
      setTimeout(() => {
        if (pf.current && pf.current.getCurrentPageIndex() === 0) pf.current.flipNext("bottom");
      }, 650);
    }, { threshold: 0.45 });
    io.observe(kutu.current);
    return () => io.disconnect();
  }, [hazir]);

  // klavye okları (kitap görünürken)
  useEffect(() => {
    if (!hazir) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") pf.current?.flipNext();
      if (e.key === "ArrowLeft") pf.current?.flipPrev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [hazir]);

  const tamEkran = () => {
    const el = kutu.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const btn = "flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-night-deep/80 text-gold-bright transition-colors hover:bg-gold/15 disabled:opacity-30";

  return (
    <div ref={kutu} className="relative rounded-3xl border border-gold/25 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(155,114,208,0.22),rgba(15,15,36,0.9)_60%)] px-3 py-8 sm:px-8 [&:fullscreen]:flex [&:fullscreen]:flex-col [&:fullscreen]:justify-center [&:fullscreen]:bg-night-deep">
      <div className="relative mx-auto w-full max-w-[1240px]">
        {!hazir && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-parchment/60">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold-bright" /> Örnek rapor yükleniyor…
            </div>
          </div>
        )}
        <div ref={kitap} className={`mx-auto transition-opacity duration-500 ${hazir ? "opacity-100" : "min-h-[420px] opacity-0"}`}>
          {gorunur && sayfalar.map((src, i) => (
            <div key={src} className="fb-sayfa bg-white" data-density={i === 0 || i === toplam - 1 ? "hard" : "soft"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${ad} · sayfa ${i + 1}`} className="h-full w-full select-none object-contain" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => pf.current?.flipPrev()} disabled={!hazir || sayfa === 0} className={btn} aria-label="Önceki sayfa">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <span className="rakam min-w-[5.5rem] text-center text-sm text-parchment/70">{sayfa + 1} / {toplam}</span>
        <button type="button" onClick={() => pf.current?.flipNext()} disabled={!hazir || sayfa >= toplam - 1} className={btn} aria-label="Sonraki sayfa">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <button type="button" onClick={tamEkran} className={btn} aria-label="Tam ekran" title="Tam ekran">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </button>
        <a href={pdf} download className="ml-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-bright px-6 py-2.5 text-sm font-medium text-night-deep shadow-[0_10px_30px_-12px_rgba(220,193,136,0.8)] transition-transform hover:-translate-y-0.5">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
          Örnek raporu PDF olarak indir
        </a>
        {kilavuz && (
          <a href={kilavuz} download className="inline-flex items-center gap-2 rounded-full border border-[#c3a6e8]/60 bg-[#9b72d0]/15 px-6 py-2.5 text-sm font-medium text-[#e2d3f6] transition-colors hover:bg-[#9b72d0]/30">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            Seans kılavuzu örneği (4 sayfa)
          </a>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-parchment/40">Sayfayı sürükleyerek, köşesine tıklayarak ya da ok tuşlarıyla çevirebilirsin.</p>
    </div>
  );
}
