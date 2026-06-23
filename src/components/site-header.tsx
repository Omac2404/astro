"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";

const NAV = [
  { href: "/", label: "Anasayfa" },
  { href: "/analizler", label: "Analizler" },
  { href: "/ornekler", label: "Örnek Analizler" },
  { href: "/nasil-calisir", label: "Nasıl Hazırlanır?" },
  { href: "/sss", label: "S.S.S." },
  { href: "/iletisim", label: "İletişim" },
];

// Hesap (güneş) ikonu — giriş / hesabım butonlarında
function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.2v2.2M12 19.6v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.2 12h2.2M19.6 12h2.2M4.4 19.6l1.6-1.6M18 6l1.6-1.6" />
    </svg>
  );
}

function CartIcon() {
  const { count, bump } = useCart();
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (bump === 0) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }, [bump]);

  return (
    <Link
      href="/sepet"
      aria-label="Sepet"
      className="relative inline-flex h-11 w-11 items-center justify-center text-parchment/85 transition-colors duration-300 hover:text-gold-bright"
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={pulse ? "animate-[cartpop_0.5s_ease]" : ""}>
        {/* çanta gövdesi */}
        <path d="M6.2 3.5 3.6 6.8V19a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-2V6.8l-2.6-3.3z" />
        {/* üst kıvrım */}
        <path d="M3.6 6.8h16.8" />
        {/* kulp (gülen kesim) */}
        <path d="M15.8 10a3.8 3.8 0 0 1-7.6 0" />
      </svg>
      {count > 0 && (
        <span className={`absolute -right-0 -top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-night-deep shadow-[0_0_0_2px_#0f0f24] ${pulse ? "animate-[cartpop_0.5s_ease]" : ""}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ type: string } | null>(null);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const cikis = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const uye = me?.type === "member";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gold/15 bg-night-deep/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2.5">
          {/* Sol: logo */}
          <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
            <Image src="/gorsel/logo-dikey.png" alt="gökname" width={588} height={373} priority className="h-14 w-auto sm:h-20 lg:h-24" />
          </Link>

          {/* Masaüstü nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`text-[15.5px] tracking-wide transition-colors hover:text-gold-bright ${
                  isActive(n.href) ? "text-gold-bright" : "text-parchment/75"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Sağ aksiyonlar. Mobil sıra: giriş · sepet · menü. Masaüstü: sepet · giriş (order ile yer değişir) */}
          <div className="flex items-center gap-2 shrink-0 sm:gap-3">
            {/* Giriş / Hesabım */}
            <div className="order-1 flex items-center gap-2 sm:gap-3 lg:order-2">
              {uye ? (
                <>
                  <Link
                    href="/hesabim"
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-gold/10 hover:text-gold-bright sm:px-4 sm:text-[13.5px] lg:rounded-none lg:border-0 lg:px-0 lg:py-0 ${
                      isActive("/hesabim") ? "text-gold-bright" : "text-gold-bright lg:text-parchment/80"
                    }`}
                  >
                    <SunIcon />
                    Hesabım
                  </Link>
                  <button onClick={cikis} className="hidden lg:inline-flex rounded-full border border-gold/40 px-4 py-1.5 text-[13.5px] font-medium text-gold-bright transition-colors hover:bg-gold/10">
                    Çıkış
                  </button>
                </>
              ) : (
                <Link href="/giris" className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gold/50 bg-gold/10 px-3.5 py-1.5 text-[12.5px] font-medium text-gold-bright transition-colors hover:bg-gold/20 sm:px-5 sm:text-[13.5px]">
                  <SunIcon />
                  Giriş Yap<span className="hidden sm:inline"> / Üye Ol</span>
                </Link>
              )}
            </div>

            <div className="order-2 lg:order-1">
              <CartIcon />
            </div>

            {/* Mobil menü — en sağda: hamburger outline daire içinde */}
            <button
              className="order-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-gold-bright transition-colors hover:bg-gold/10 lg:hidden"
              aria-label="Menü"
              onClick={() => setOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobil drawer — SAĞDAN kayar. Header DIŞINDA: header'ın backdrop-blur'u fixed çocuğu hapsetmesin diye.
          overflow-hidden: kapalıyken translate-x-full ile sağ dışına itilen panel sayfa genişliğini
          artırmasın (mobilde yatay kayma/zoom-out önlenir). Açıkken panel viewport içinde olduğu için kırpılmaz. */}
      <div className={`fixed inset-0 z-[60] overflow-hidden lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        {/* karartma */}
        <div
          className={`absolute inset-0 bg-night-deep/70 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        {/* panel */}
        <nav
          className={`absolute right-0 top-0 flex h-full w-72 max-w-[80%] flex-col border-l border-gold/15 bg-night-deep shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gold/15 px-5 py-4">
            <span className="font-display text-lg font-semibold text-gold-bright">Menü</span>
            <button onClick={() => setOpen(false)} aria-label="Kapat" className="text-2xl leading-none text-parchment/70 hover:text-gold-bright">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-lg px-3 py-2.5 text-[15px] transition-colors ${
                  isActive(n.href) ? "bg-gold/10 text-gold-bright" : "text-parchment/80 hover:bg-white/5"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-gold/15 px-4 pt-4 pb-8">
            {uye ? (
              <div className="flex items-center gap-3">
                <Link href="/hesabim" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 py-2 text-center text-sm text-gold-bright">
                  <SunIcon />
                  Hesabım
                </Link>
                <button onClick={cikis} className="rounded-full border border-gold/25 px-4 py-2 text-sm text-parchment/70">
                  Çıkış
                </button>
              </div>
            ) : (
              <Link href="/giris" className="flex items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-center text-sm font-medium text-night-deep">
                <SunIcon />
                Giriş Yap / Üye Ol
              </Link>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
