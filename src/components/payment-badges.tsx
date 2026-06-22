// Ödeme güveni: kart şeması + PayTR logoları (kullanıcı görselleri) ve "güvenli ödeme" satırı.
import Image from "next/image";

export function PaymentBadges() {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-center gap-1.5 text-parchment/55">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <span className="text-xs">256-bit SSL ile güvenli ödeme</span>
      </div>

      <div className="mt-3 flex flex-col items-center gap-3">
        {/* Mastercard · Visa · Troy (tek görsel, yan yana) */}
        <Image src="/gorsel/odeme-kartlar.png" alt="Mastercard, Visa, Troy" width={1152} height={272} unoptimized className="h-10 w-auto" />
        {/* PayTR — ortada, altta (beyaza çevrildi) */}
        <Image src="/gorsel/odeme-paytr.webp" alt="PayTR" width={2000} height={430} unoptimized className="h-[18px] w-auto brightness-0 invert" />
      </div>
    </div>
  );
}
