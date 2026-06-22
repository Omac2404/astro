"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

export default function SepetPage() {
  const { items, total, remove, setQty, count } = useCart();
  const router = useRouter();
  const [uye, setUye] = useState<boolean | null>(null);
  const [uyari, setUyari] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUye(d.user?.type === "member"))
      .catch(() => setUye(false));
  }, []);

  const odeme = () => {
    if (uye) router.push("/odeme");
    else setUyari(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-4xl font-semibold">Sepetin</h1>

      {count === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gold/20 px-6 py-16 text-center">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gold-bright/45">
            {/* çanta gövdesi */}
            <path d="M6.2 3.5 3.6 6.8V19a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-2V6.8l-2.6-3.3z" />
            {/* üst kıvrım */}
            <path d="M3.6 6.8h16.8" />
            {/* kulp (gülen kesim) */}
            <path d="M15.8 10a3.8 3.8 0 0 1-7.6 0" />
          </svg>
          <p className="mt-4 text-parchment/70">Sepetin boş.</p>
          <Link href="/analizler" className="mt-5 inline-block rounded-full bg-gold px-6 py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright">
            Analizleri Keşfet
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
          {/* Ürünler */}
          <div className="space-y-3">
            {items.map((it) => (
              <div key={`${it.slug}${it.hediye ? ":h" : ""}`} className="flex items-center gap-4 rounded-xl border border-gold/15 bg-night-deep/50 p-3 sm:p-4">
                {/* Mini görsel */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gold/15 sm:h-20 sm:w-20">
                  {it.gorsel ? (
                    <Image src={it.gorsel} alt={it.ad} fill sizes="80px" style={{ objectPosition: it.objectPos ?? "center 22%" }} className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-night text-gold-bright/40">✶</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium text-parchment/90">
                    {it.ad}
                    {it.hediye && <span className="ml-2 rounded bg-[#5a4a85]/40 px-1.5 py-0.5 text-[11px] text-[#c3a6e8]">hediye</span>}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    {it.eskiFiyat ? <span className="text-sm text-[#a98fd6] line-through">{it.eskiFiyat} ₺</span> : null}
                    <span className="font-body text-2xl font-semibold text-gold-bright">{it.fiyat * it.qty} ₺</span>
                    {it.qty > 1 && <span className="text-xs text-parchment/45">({it.fiyat} ₺ × {it.qty})</span>}
                  </div>

                  {/* Adet counter */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-gold/25">
                      <button
                        onClick={() => setQty(it.slug, it.hediye, it.qty - 1)}
                        aria-label="Azalt"
                        className="flex h-8 w-8 items-center justify-center text-lg text-parchment/75 transition-colors hover:text-gold-bright"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-parchment/90">{it.qty}</span>
                      <button
                        onClick={() => setQty(it.slug, it.hediye, it.qty + 1)}
                        aria-label="Artır"
                        className="flex h-8 w-8 items-center justify-center text-lg text-parchment/75 transition-colors hover:text-gold-bright"
                      >
                        +
                      </button>
                    </div>
                    <button onClick={() => remove(it.slug, it.hediye)} className="text-sm text-parchment/45 transition-colors hover:text-rose-300">
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Özet */}
          <aside className="rounded-2xl border border-gold/20 bg-night-deep/60 p-5 lg:sticky lg:top-32">
            <div className="flex items-center justify-between border-b border-gold/10 pb-3">
              <span className="text-parchment/75">{count} ürün</span>
              <span className="font-body text-3xl font-semibold text-gold-bright">{total} ₺</span>
            </div>
            <button onClick={odeme} className="mt-4 block w-full rounded-full bg-gold py-3 text-center font-medium text-night-deep transition-colors hover:bg-gold-bright">
              Ödemeye Geç
            </button>

            {uyari && !uye && (
              <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
                <p className="text-sm text-amber-200">Ödemeye geçmek için üye olmalı ya da giriş yapmalısın.</p>
                <Link href="/giris?next=/odeme" className="mt-3 inline-block rounded-full bg-gold px-5 py-2 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright">
                  Üye Ol / Giriş Yap
                </Link>
              </div>
            )}

            <Link href="/analizler" className="mt-3 block text-center text-sm text-parchment/55 hover:text-gold-bright">
              Alışverişe devam et
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
