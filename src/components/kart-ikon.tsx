// Üye paneli kart başlıkları için çizgisel ikonlar (stroke-based, gold-bright).
type IkonAd = "account" | "giftIn" | "gift" | "analiz" | "siparis";

const PATHS: Record<IkonAd, React.ReactNode> = {
  // kullanıcı
  account: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // hediye kutusu (kod gir)
  giftIn: (
    <>
      <path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M3 7.5h18V11H3zM12 7.5V20" />
      <path d="M12 7.5C12 5.6 10.8 4 9.2 4 8 4 7.2 4.9 7.2 5.9 7.2 7 8.4 7.5 12 7.5zM12 7.5C12 5.6 13.2 4 14.8 4 16 4 16.8 4.9 16.8 5.9 16.8 7 15.6 7.5 12 7.5z" />
    </>
  ),
  // bilet / etiket (sahip olunan kodlar)
  gift: (
    <>
      <path d="M3 8.5a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 8.5v2a2 2 0 0 0 0 3v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5v-2a2 2 0 0 0 0-3z" />
      <path d="M14 7v10" strokeDasharray="2 2.5" />
    </>
  ),
  // analiz / rapor (yıldız + sayfa)
  analiz: (
    <>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M13.5 3.5V8h4.5" />
      <path d="M10 16.2l.9 1.9 2 .2-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L7.1 18.3l2-.2z" />
    </>
  ),
  // sipariş (alışveriş çantası)
  siparis: (
    <>
      <path d="M6.2 4 4 7v12a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V7l-2.2-3z" />
      <path d="M4 7h16" />
      <path d="M15.5 10.5a3.5 3.5 0 0 1-7 0" />
    </>
  ),
};

export function KartIkon({ d, className = "" }: { d: IkonAd; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-gold-bright ${className}`}
      aria-hidden
    >
      {PATHS[d]}
    </svg>
  );
}
