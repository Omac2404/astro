"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Doğum bilgisi gönderildikten sonra çıkan "hazırlanıyor" popup'ı.
// NOT: Hesabım > Analizlerim'deki Hazirlaniyor animasyonuyla aynı etaplar; oradaki
// dinamik yapıya DOKUNMAMAK için burada bağımsız bir kopya tutuluyor.
const ETAPLAR = [
  "Doğum anı okunuyor",
  "Gök konumları hesaplanıyor",
  "Yükselen ve evler kuruluyor",
  "Açılar ölçülüyor",
  "İmzalar ve elementler analiz ediliyor",
  "Anlam blokları eşleşiyor",
  "Yapay zekâ yorumluyor",
  "PDF hazırlanıyor",
];

export function AnalizHazirlaniyorModal() {
  const [text, setText] = useState("");
  useEffect(() => {
    let iptal = false;
    let timer: ReturnType<typeof setTimeout>;
    const yaz = (s: number) => {
      const tam = ETAPLAR[s];
      let pos = 0;
      const ekle = () => {
        if (iptal) return;
        pos++;
        setText(tam.slice(0, pos));
        if (pos < tam.length) timer = setTimeout(ekle, 48);
        else if (s === ETAPLAR.length - 1) return; // son etap kalsın
        else timer = setTimeout(sil, 1500);
      };
      const sil = () => {
        if (iptal) return;
        pos--;
        setText(tam.slice(0, pos));
        if (pos > 0) timer = setTimeout(sil, 28);
        else timer = setTimeout(() => yaz(s + 1), 260);
      };
      ekle();
    };
    yaz(0);
    return () => { iptal = true; clearTimeout(timer); };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-night-deep/85 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gold/20 bg-night p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold/25 border-t-gold-bright" />
        <h2 className="font-display text-2xl font-semibold text-parchment">Analizin Hazırlanıyor</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-parchment/60">
          Birkaç dakika sürebilir. Bu ekranı kapatabilirsin; durumu “Analizlerim”den takip edebilir, hazır olunca indirebilirsin.
        </p>
        <div className="mt-4 flex min-h-[1.5rem] items-center justify-center text-sm text-sky-300">
          {text}
          <span className="ml-0.5 animate-pulse">…</span>
        </div>
        <Link href="/hesabim" className="mt-6 block w-full rounded-full bg-gold py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright">
          Analizlerime Git
        </Link>
      </div>
    </div>
  );
}
