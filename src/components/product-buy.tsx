"use client";

import Link from "next/link";
import { useCart, type CartItem } from "@/lib/cart";

type Props = { slug: string; ad: string; fiyat: number; eskiFiyat?: number; gorsel?: string; objectPos?: string };

export function BuyButtons({ slug, ad, fiyat, eskiFiyat, gorsel, objectPos }: Props) {
  const { add, has } = useCart();
  const inCart = has(slug, false);
  const inGift = has(slug, true);
  const base: Omit<CartItem, "qty" | "hediye"> = { slug, ad, fiyat, eskiFiyat, gorsel, objectPos };

  return (
    <div className="mt-5 space-y-3">
      {inCart ? (
        <Link href="/sepet" className="block w-full rounded-full bg-gold py-3 text-center font-medium text-night-deep transition-colors hover:bg-gold-bright">
          Sepete Eklendi ✓ · Sepete Git
        </Link>
      ) : (
        <button
          onClick={() => add(base)}
          className="block w-full rounded-full bg-gold py-3 text-center font-medium text-night-deep transition-colors hover:bg-gold-bright"
        >
          Sepete Ekle
        </button>
      )}
      {inGift ? (
        <Link href="/sepet" className="block w-full rounded-full border border-gold/40 py-3 text-center font-medium text-gold-bright transition-colors hover:bg-gold/10">
          Hediye olarak sepetinize eklendi ✓
        </Link>
      ) : (
        <button
          onClick={() => add({ ...base, hediye: true })}
          className="block w-full rounded-full border border-gold/40 py-3 text-center font-medium text-gold-bright transition-colors hover:bg-gold/10"
        >
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
          <Link href="/sepet" className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-night-deep">
            Sepete Git ✓
          </Link>
        ) : (
          <button
            onClick={() => add({ slug, ad, fiyat, eskiFiyat, gorsel, objectPos })}
            className="shrink-0 rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright"
          >
            Sepete Ekle
          </button>
        )}
      </div>
    </div>
  );
}
