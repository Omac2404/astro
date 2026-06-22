"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartItem = {
  slug: string;
  ad: string;
  fiyat: number;
  eskiFiyat?: number;
  gorsel?: string;
  objectPos?: string;
  hediye?: boolean;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number; // toplam adet
  total: number;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (slug: string, hediye: boolean | undefined, qty: number) => void;
  remove: (slug: string, hediye?: boolean) => void;
  clear: () => void;
  has: (slug: string, hediye?: boolean) => boolean;
  bump: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "gn_cart";
const key = (s: string, h?: boolean) => `${s}${h ? ":h" : ""}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [bump, setBump] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Sipariş kaynağını ilk gelişte yakala ve sakla (utm_source ya da referrer)
    try {
      if (!localStorage.getItem("gn_source")) {
        const utm = new URLSearchParams(window.location.search).get("utm_source");
        let src = (utm || "").toLowerCase();
        if (!src) {
          const ref = (document.referrer || "").toLowerCase();
          if (!ref) src = "direkt";
          else if (ref.includes("instagram")) src = "instagram";
          else if (ref.includes("google")) src = "google";
          else if (ref.includes("facebook") || ref.includes("fb.")) src = "facebook";
          else if (ref.includes("tiktok")) src = "tiktok";
          else if (ref.includes("youtube") || ref.includes("youtu.be")) src = "youtube";
          else if (ref.includes("t.co") || ref.includes("twitter") || ref.includes("x.com")) src = "x";
          else if (window.location.host && ref.includes(window.location.host)) src = "direkt";
          else { try { src = new URL(document.referrer).hostname.replace(/^www\./, ""); } catch { src = "diğer"; } }
        }
        localStorage.setItem("gn_source", src || "direkt");
      }
    } catch {}
    try {
      const v = localStorage.getItem(KEY);
      if (v) {
        const parsed = JSON.parse(v) as CartItem[];
        // geriye dönük: qty yoksa 1 ata
        setItems(parsed.map((i) => ({ ...i, qty: i.qty ?? 1 })));
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((cur) => {
      const i = cur.findIndex((x) => key(x.slug, x.hediye) === key(item.slug, item.hediye));
      if (i >= 0) {
        const next = [...cur];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...cur, { ...item, qty: 1 }];
    });
    setBump((b) => b + 1);
  }, []);

  const setQty = useCallback((slug: string, hediye: boolean | undefined, qty: number) => {
    setItems((cur) => {
      if (qty <= 0) return cur.filter((i) => key(i.slug, i.hediye) !== key(slug, hediye));
      return cur.map((i) => (key(i.slug, i.hediye) === key(slug, hediye) ? { ...i, qty } : i));
    });
  }, []);

  const remove = useCallback((slug: string, hediye?: boolean) => {
    setItems((cur) => cur.filter((i) => key(i.slug, i.hediye) !== key(slug, hediye)));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((slug: string, hediye?: boolean) => items.some((i) => key(i.slug, i.hediye) === key(slug, hediye)), [items]);

  const count = items.reduce((t, i) => t + i.qty, 0);
  const total = items.reduce((t, i) => t + i.fiyat * i.qty, 0);

  return (
    <Ctx.Provider value={{ items, count, total, add, setQty, remove, clear, has, bump }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
