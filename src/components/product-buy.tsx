"use client";

import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart";

type Props = { slug: string; ad: string; fiyat: number; eskiFiyat?: number; gorsel?: string; objectPos?: string };

// Site tarzına uygun ikonlar (header'daki çanta diliyle aynı dil)
function CartIco({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d="M6.2 3.5 3.6 6.8V19a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-2V6.8l-2.6-3.3z" />
      <path d="M3.6 6.8h16.8" />
      <path d="M15.8 10a3.8 3.8 0 0 1-7.6 0" />
    </svg>
  );
}
function GiftIco({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden>
      <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
      <rect x="2.5" y="7.5" width="19" height="4.5" rx="1" />
      <path d="M12 7.5V21" />
      <path d="M12 7.5S10.7 3.5 8.2 4a2 2 0 0 0-.2 3.5zM12 7.5s1.3-4 3.8-3.5a2 2 0 0 1 .2 3.5z" />
    </svg>
  );
}

export function BuyButtons({ slug, ad, fiyat, eskiFiyat, gorsel, objectPos }: Props) {
  const { add, has } = useCart();
  const inCart = has(slug, false);
  const inGift = has(slug, true);
  const base: Omit<CartItem, "qty" | "hediye"> = { slug, ad, fiyat, eskiFiyat, gorsel, objectPos };

  return (
    <div className="mt-5 space-y-3">
      {inCart ? (
        <Link href="/sepet" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#9b72d0] py-3 text-center font-medium text-white transition-colors hover:bg-[#ab86db]">
          <CartIco />
          Sepete Eklendi ✓ · Sepete Git
        </Link>
      ) : (
        <button
          onClick={() => add(base)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3 text-center font-medium text-night-deep transition-colors hover:bg-gold-bright"
        >
          <CartIco />
          Sepete Ekle
        </button>
      )}
      {inGift ? (
        <Link href="/sepet" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 py-3 text-center font-medium text-gold-bright transition-colors hover:bg-gold/10">
          <GiftIco />
          Hediye olarak sepetinize eklendi ✓
        </Link>
      ) : (
        <button
          onClick={() => add({ ...base, hediye: true })}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 py-3 text-center font-medium text-gold-bright transition-colors hover:bg-gold/10"
        >
          <GiftIco />
          Hediye Olarak Al
        </button>
      )}
      <Link href={`/ornekler#${slug}`} className="block w-full py-1 text-center text-sm text-parchment/70 hover:text-gold-bright">
        veya örnekleri incele
      </Link>
    </div>
  );
}

// Mobilde alt sabit bar — ürün adı + fiyat + sepete ekle
export function MobileBuyBar({ slug, ad, fiyat, eskiFiyat, gorsel, objectPos }: Props) {
  const { add, has } = useCart();
  const inCart = has(slug, false);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-night-deep/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-parchment/85">{ad}</div>
          <div className="flex items-baseline gap-1.5">
            {eskiFiyat ? <span className="text-xs text-[#a98fd6] line-through">{eskiFiyat} ₺</span> : null}
            <span className="font-body text-lg font-semibold text-gold-bright">{fiyat} ₺</span>
          </div>
        </div>
        {inCart ? (
          <Link href="/sepet" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#9b72d0] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ab86db]">
            <CartIco className="h-4 w-4" />
            Sepete Git ✓
          </Link>
        ) : (
          <button
            onClick={() => add({ slug, ad, fiyat, eskiFiyat, gorsel, objectPos })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright"
          >
            <CartIco className="h-4 w-4" />
            Sepete Ekle
          </button>
        )}
      </div>
    </div>
  );
}
