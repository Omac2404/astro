"use client";

import { useRef, type ReactNode } from "react";

// Analiz kartlarına 3D his: kalınlık (cilt/sayfa kenarı), katmanlı altın çerçeve, zemin gölgesi;
// hover'da imleci izleyen yanlama + ışık parlaması + görselde hafif paralaks.
// Değerler CSS değişkenleriyle aktarılır (--mx/--my: -1..1, --gx/--gy: ışık konumu); stil globals.css → .kart3d.
// Dokunmatik ekranda ve "hareketi azalt" ayarında yanlama kapalı (CSS medya sorguları).
export function Kart3D({ children, className = "" }: { children: ReactNode; className?: string }) {
  const kok = useRef<HTMLDivElement>(null);
  const kare = useRef(0);

  const hareket = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = kok.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(kare.current);
    kare.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", ((x - 0.5) * 2).toFixed(3));
      el.style.setProperty("--my", ((y - 0.5) * 2).toFixed(3));
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
  };
  const ayril = () => {
    const el = kok.current;
    if (!el) return;
    cancelAnimationFrame(kare.current);
    el.style.setProperty("--mx", "0");
    el.style.setProperty("--my", "0");
  };

  return (
    <div ref={kok} onPointerMove={hareket} onPointerLeave={ayril} className={`kart3d ${className}`}>
      <div className="kart3d-ic">
        <div className="kart3d-kalinlik" aria-hidden />
        <div className="kart3d-cerceve">
          {children}
          <div className="kart3d-isik" aria-hidden />
        </div>
      </div>
    </div>
  );
}
