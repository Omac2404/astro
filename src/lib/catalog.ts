// Sunucu tarafı katalog: ürünleri admin fiyat override'larıyla birleştirir (fronta yansıma).
import { PRODUCTS, type Product } from "@/lib/products";
import { getPrices } from "@/lib/db";

export function getCatalog(): Product[] {
  const ov = getPrices();
  return PRODUCTS.map((p) => {
    const o = ov[p.slug];
    if (!o) return p;
    return { ...p, fiyat: o.fiyat, eskiFiyat: o.eskiFiyat > 0 ? o.eskiFiyat : undefined };
  });
}

export function getProductPriced(slug: string): Product | undefined {
  return getCatalog().find((p) => p.slug === slug);
}

export function bireysel(): Product[] {
  return getCatalog().filter((p) => !p.slug.startsWith("sinastri") && !p.gizli);
}

export function cift(): Product[] {
  return getCatalog().filter((p) => p.slug.startsWith("sinastri") && !p.gizli);
}
