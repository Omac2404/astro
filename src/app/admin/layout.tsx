"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminIkon, type AdminIkonAd } from "@/components/admin-ikon";

const BASE_NAV: { href: string; label: string; ikon: AdminIkonAd }[] = [
  { href: "/admin", label: "Genel Bakış", ikon: "overview" },
  { href: "/admin/siparisler", label: "Siparişler", ikon: "orders" },
  { href: "/admin/musteriler", label: "Müşteriler", ikon: "customers" },
  { href: "/admin/raporlar", label: "Raporlar", ikon: "reports" },
  { href: "/admin/rapor-olustur", label: "Rapor Oluştur", ikon: "create" },
  { href: "/admin/hediye-kodlari", label: "Hediye Kodları", ikon: "gift" },
  { href: "/admin/urunler", label: "Ürünler & Fiyat", ikon: "products" },
];
const AUTH_ROUTES = ["/admin/giris", "/admin/sifremi-unuttum"];

type Me = { email: string; ad: string; super: boolean };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuth = AUTH_ROUTES.includes(pathname);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const u = d.user && d.user.type === "admin" ? (d.user as Me) : null;
        setMe(u);
        setReady(true);
        if (!u && !isAuth) router.replace("/admin/giris");
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [pathname, isAuth, router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/giris");
    router.refresh();
  };

  if (isAuth) {
    return <div className="flex min-h-screen items-center justify-center bg-night px-5 text-parchment">{children}</div>;
  }
  if (!ready || !me) {
    return <div className="flex min-h-screen items-center justify-center bg-night text-sm text-parchment/45">Yükleniyor…</div>;
  }

  const nav = me.super ? [...BASE_NAV, { href: "/admin/ayarlar", label: "Yönetim & Ayarlar", ikon: "settings" as AdminIkonAd }] : BASE_NAV;
  const active = (h: string) => (h === "/admin" ? pathname === "/admin" : pathname.startsWith(h));

  return (
    <div className="flex min-h-screen bg-night text-parchment">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gold/15 bg-night-deep lg:flex">
        <div className="border-b border-gold/15 px-6 py-5">
          <Link href="/admin" className="font-display text-xl font-semibold tracking-wide text-gold-bright">
            Gökname <span className="text-sm font-normal text-parchment/45">admin</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active(n.href) ? "bg-gold/15 text-gold-bright" : "text-parchment/70 hover:bg-white/5 hover:text-parchment"
              }`}
            >
              <AdminIkon d={n.ikon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gold/15 px-3 py-4">
          <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-parchment/55 transition-colors hover:text-gold-bright">
            ← Siteye dön
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-4 border-b border-gold/15 bg-night-deep/70 px-5 py-3 backdrop-blur">
          <nav className="flex gap-1 overflow-x-auto lg:hidden">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${
                  active(n.href) ? "bg-gold/15 text-gold-bright" : "text-parchment/65"
                }`}
              >
                <AdminIkon d={n.ikon} className="h-[15px] w-[15px]" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-parchment/55 sm:inline">
              {me.ad}
              {me.super && <span className="ml-1.5 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold-bright">süper</span>}
            </span>
            <button onClick={logout} className="rounded-lg border border-gold/25 px-3 py-1.5 text-xs text-parchment/70 transition-colors hover:border-gold/50 hover:text-gold-bright">
              Çıkış
            </button>
          </div>
        </header>
        <main className="flex-1 px-5 py-7 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
