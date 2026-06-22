// Admin menü ikonları (çizgisel, stroke-based).
export type AdminIkonAd = "overview" | "orders" | "customers" | "reports" | "create" | "gift" | "products" | "settings";

const PATHS: Record<AdminIkonAd, React.ReactNode> = {
  // genel bakış — grid
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </>
  ),
  // siparişler — alışveriş çantası
  orders: (
    <>
      <path d="M6.2 4 4 7v12a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V7l-2.2-3z" />
      <path d="M4 7h16" />
      <path d="M15.5 10.5a3.5 3.5 0 0 1-7 0" />
    </>
  ),
  // müşteriler — iki kullanıcı
  customers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M21 19a5.2 5.2 0 0 0-3.5-4.6" />
    </>
  ),
  // raporlar — doküman + satırlar
  reports: (
    <>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M8 12h7M8 15.5h7M8 8.5h2" />
    </>
  ),
  // rapor oluştur — kalem
  create: (
    <>
      <path d="M5 19l1-4 9.5-9.5a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3L9.5 18.5z" />
      <path d="M14 6.5 17.5 10" />
    </>
  ),
  // hediye kodları — hediye kutusu
  gift: (
    <>
      <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M3 7.5h18V11H3zM12 7.5V20" />
      <path d="M12 7.5C12 5.6 10.8 4 9.2 4 8 4 7.2 4.9 7.2 5.9 7.2 7 8.4 7.5 12 7.5zM12 7.5C12 5.6 13.2 4 14.8 4 16 4 16.8 4.9 16.8 5.9 16.8 7 15.6 7.5 12 7.5z" />
    </>
  ),
  // ürünler & fiyat — fiyat etiketi
  products: (
    <>
      <path d="M4 4.5h6.5l9 9a1.5 1.5 0 0 1 0 2.1l-4.9 4.9a1.5 1.5 0 0 1-2.1 0l-9-9z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  // yönetim & ayarlar — dişli
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </>
  ),
};

export function AdminIkon({ d, className = "" }: { d: AdminIkonAd; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {PATHS[d]}
    </svg>
  );
}
