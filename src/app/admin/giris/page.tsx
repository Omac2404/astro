"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-xl border border-gold/20 bg-night/50 px-4 py-3 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";

export default function AdminGirisPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYuk(true);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, sifre }),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) return setHata(d.error || "Giriş başarısız.");
    router.replace("/admin");
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-gold/20 bg-night-deep/70 p-7 backdrop-blur-sm sm:p-9">
        <div className="text-center">
          <div className="font-display text-2xl font-semibold tracking-wide text-gold-bright">Gökname</div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-parchment">Admin Girişi</h1>
        </div>
        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">E-posta</label>
            <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="sifre" className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Şifre</label>
            <input id="sifre" type="password" required autoComplete="current-password" value={sifre} onChange={(e) => setSifre(e.target.value)} className={inputCls} />
          </div>
          {hata && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{hata}</p>}
          <button type="submit" disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {yuk ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/admin/sifremi-unuttum" className="text-parchment/55 hover:text-gold-bright">Şifremi unuttum</Link>
        </p>
      </div>
    </div>
  );
}
