"use client";

// Ödeme güveni: kart şeması (Mastercard/Visa/Troy — sabit) + seçili sağlayıcı logosu (PayTR | iyzico).
import Image from "next/image";
import { useEffect, useState } from "react";

export function PaymentBadges() {
  const [saglayici, setSaglayici] = useState<"paytr" | "iyzico">("paytr");
  useEffect(() => {
    fetch("/api/odeme-saglayici")
      .then((r) => r.json())
      .then((d) => { if (d.saglayici === "iyzico" || d.saglayici === "paytr") setSaglayici(d.saglayici); })
      .catch(() => {});
  }, []);

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
        {/* Mastercard · Visa · Troy (sabit) */}
        <Image src="/gorsel/odeme-kartlar.png" alt="Mastercard, Visa, Troy" width={1152} height={272} unoptimized className="h-10 w-auto" />
        {/* Sağlayıcı logosu */}
        {saglayici === "iyzico" ? (
          <Image src="/gorsel/odeme-iyzico.png" alt="iyzico" width={462} height={123} unoptimized className="h-5 w-auto" />
        ) : (
          <Image src="/gorsel/odeme-paytr.webp" alt="PayTR" width={2000} height={430} unoptimized className="h-[18px] w-auto brightness-0 invert" />
        )}
      </div>
    </div>
  );
}
