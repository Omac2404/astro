// Renkli (resmi gradyan) Instagram ikonu — footer, iletişim sayfası vb. ortak kullanım.
// Server bileşenlerinde de çalışır (etkileşim yok, düz link).
export function InstagramRenkli({ href, boyut = 36 }: { href: string; boyut?: number }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram"
      title="Instagram"
      className="inline-flex items-center justify-center rounded-[10px] shadow-md shadow-black/30 transition-transform hover:scale-105"
      style={{ width: boyut, height: boyut, background: "linear-gradient(45deg,#FEDA75 0%,#FA7E1E 30%,#D62976 55%,#962FBF 78%,#4F5BD5 100%)" }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(boyut * 0.55)} height={Math.round(boyut * 0.55)} fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="#fff" stroke="none" />
      </svg>
    </a>
  );
}
