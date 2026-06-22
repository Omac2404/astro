import type { CSSProperties } from "react";

// Üst bölge yıldızları — deterministik (server/client tutarlı), her yıldız kendi konum/gecikme/süresiyle bağımsız parıldar.
const STARS = Array.from({ length: 52 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const colors = ["#ffffff", "#f4ead1", "#dcc188", "#c3a6e8"];
  return {
    top: +(r(1) * 100).toFixed(2),
    left: +(r(2) * 100).toFixed(2),
    size: +(1.6 + r(3) * 2.4).toFixed(2),
    delay: +(r(4) * 6).toFixed(2),
    dur: +(2.4 + r(5) * 3.6).toFixed(2),
    color: colors[Math.floor(r(6) * colors.length)],
  };
});

// Sayfa girişinin üstünü kaplayan, aşağı doğru solan yıldız alanı + ara ara kayan yıldız.
// Konumlanması için relative bir ata bekler (layout'ta <main relative>).
export function StarField() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[1100px] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_42%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_0%,#000_42%,transparent_100%)]">
      <div className="absolute inset-0 starfield opacity-60" />
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star-dot"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            color: s.color,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
      <span
        className="shooting-star"
        style={{ top: "8%", left: "4%", animationDuration: "16s", animationDelay: "2s", "--ang": "19deg" } as CSSProperties}
      />
      <span
        className="shooting-star"
        style={{ top: "22%", left: "-4%", width: "120px", animationDuration: "16s", animationDelay: "10s", "--ang": "26deg" } as CSSProperties}
      />
    </div>
  );
}
