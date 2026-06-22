"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { StarField } from "@/components/star-field";
import { BakimEkrani } from "@/components/bakim-ekrani";
import { CartProvider } from "@/lib/cart";

type Bakim = { bakimModu: boolean; bakimMesaj: string; bakimBitis: string };

// Admin rotaları kendi arayüzünü (sidebar) kullanır; pazarlama header/footer/yıldız alanı orada gizlenir.
// footer: server component olarak layout'ta render edilip prop ile gelir (yasal sayfalar için fs okur).
export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const adminYol = pathname?.startsWith("/admin");
  const [bakim, setBakim] = useState<Bakim | null>(null);

  useEffect(() => {
    if (adminYol) return; // admin paneli bakım modundan etkilenmez
    fetch("/api/maintenance").then((r) => r.json()).then((d) => setBakim(d)).catch(() => {});
  }, [adminYol]);

  if (adminYol) return <>{children}</>;

  // Bakım modu açıksa siteyi komple kapat (logo + açıklama + geri sayım)
  if (bakim?.bakimModu) return <BakimEkrani mesaj={bakim.bakimMesaj} bitis={bakim.bakimBitis} />;

  return (
    <CartProvider>
      <SiteHeader />
      <main className="relative flex-1">
        <StarField />
        <div className="relative z-10">{children}</div>
      </main>
      {footer}
    </CartProvider>
  );
}
