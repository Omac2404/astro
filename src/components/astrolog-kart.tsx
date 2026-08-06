"use client";

// Astrolog kartı — foto (yoksa baş harf avatarı), isim, kısa hakkında, sosyal/web/e-posta linkleri.
// Tık sayacı: kart içindeki HERHANGİ bir linke ilk tıklama, cihaz başına günde 1 kez sayılır (localStorage).

type Astrolog = {
  id: string; ad: string; hakkinda: string; fotoId?: string | null; profilLink?: string;
  instagram?: string; facebook?: string; x?: string; youtube?: string; tiktok?: string; website?: string; email?: string;
};

function izle(id: string) {
  try {
    const k = `astro-tik-${id}-${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    fetch("/api/astrologlar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  } catch { /* localStorage kapalıysa saymadan geç */ }
}

const IKON: Record<string, React.ReactNode> = {
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" /></>,
  facebook: <path d="M13.5 21v-7h2.6l.4-3h-3V9.1c0-.9.25-1.5 1.55-1.5H16.6V4.9c-.3-.04-1.2-.12-2.3-.12-2.3 0-3.8 1.4-3.8 3.9V11H8v3h2.5v7z" fill="currentColor" stroke="none" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  youtube: <><rect x="2.5" y="6" width="19" height="12" rx="3.5" /><path d="M10.2 9.5v5l4.6-2.5z" fill="currentColor" stroke="none" /></>,
  tiktok: <path d="M14 4v8.5a3.75 3.75 0 1 1-3.2-3.71M14 4c.4 2.4 2 4.2 4.5 4.5" />,
  website: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c-4.7 4.7-4.7 12.3 0 17 4.7-4.7 4.7-12.3 0-17z" /></>,
  email: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></>,
};

function LinkIkon({ tip, href, id, etiket }: { tip: string; href: string; id: string; etiket: string }) {
  return (
    <a href={href} target={tip === "email" ? undefined : "_blank"} rel="noopener noreferrer" aria-label={etiket} title={etiket}
      onClick={() => izle(id)}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/25 text-gold-bright/80 transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold-bright">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {IKON[tip]}
      </svg>
    </a>
  );
}

export function AstrologKart({ a }: { a: Astrolog }) {
  const linkler: [string, string, string][] = [];
  if (a.instagram) linkler.push(["instagram", a.instagram, "Instagram"]);
  if (a.facebook) linkler.push(["facebook", a.facebook, "Facebook"]);
  if (a.x) linkler.push(["x", a.x, "X (Twitter)"]);
  if (a.youtube) linkler.push(["youtube", a.youtube, "YouTube"]);
  if (a.tiktok) linkler.push(["tiktok", a.tiktok, "TikTok"]);
  if (a.website) linkler.push(["website", a.website, "Web sitesi"]);
  if (a.email) linkler.push(["email", `mailto:${a.email}`, "E-posta"]);

  // Ön tanımlı kart linki: foto + isim tıklanabilir olur, astroloğun tercih ettiği adrese gider.
  // (Sosyal ikonlar zaten kendi linkleri; iç içe <a> geçersiz olduğundan tüm kart değil foto/isim sarılır.)
  const foto = a.fotoId ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={`/api/astrolog-foto/${a.fotoId}`} alt={a.ad}
      className="h-28 w-28 rounded-full border-2 border-gold/30 object-cover transition-colors group-hover:border-gold/60" />
  ) : (
    <span className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-gold/30 bg-night-2 font-display text-3xl text-gold-bright transition-colors group-hover:border-gold/60">
      {a.ad.split(" ").map((p) => p[0]).slice(0, 2).join("")}
    </span>
  );
  const baslik = <h3 className="mt-4 font-display text-xl font-semibold text-parchment transition-colors group-hover:text-gold-bright">{a.ad}</h3>;

  return (
    <div className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-gold/15 bg-night p-6 text-center transition-all hover:border-gold/40 hover:-translate-y-1">
      {a.profilLink ? (
        <a href={a.profilLink} target="_blank" rel="noopener noreferrer" onClick={() => izle(a.id)}
          className="flex flex-col items-center" aria-label={`${a.ad} — profil`}>
          {foto}
          {baslik}
        </a>
      ) : (
        <>
          {foto}
          {baslik}
        </>
      )}
      <p className="mt-2 text-sm leading-relaxed text-parchment/60">{a.hakkinda}</p>
      {linkler.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 pt-1">
          {linkler.map(([tip, href, etiket]) => <LinkIkon key={tip} tip={tip} href={href} id={a.id} etiket={etiket} />)}
        </div>
      )}
    </div>
  );
}
