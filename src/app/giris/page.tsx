"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "giris" | "kayit";

const inputCls =
  "w-full rounded-xl border border-gold/20 bg-night/50 px-4 py-3 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";

function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/hesabim";
  const [mode, setMode] = useState<Mode>("giris");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  const kayit = mode === "kayit";
  const switchMode = (m: Mode) => {
    setMode(m);
    setHata("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    if (kayit && sifre !== sifre2) return setHata("Şifreler eşleşmiyor.");
    setYuk(true);
    const url = kayit ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, sifre }),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) return setHata(d.error || "Bir hata oluştu.");
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <div className="rounded-3xl border border-gold/20 bg-night-deep/70 p-7 backdrop-blur-sm sm:p-9">
        <h1 className="text-center font-display text-3xl font-semibold text-parchment">{kayit ? "Üye Ol" : "Giriş Yap"}</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-parchment/60">
          {kayit ? "E-posta ve bir şifre belirle, hesabını oluştur." : "Hesabına giriş yap, analizlerini görüntüle."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-gold/20 bg-night/60 p-1 text-sm">
          {(["giris", "kayit"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-full py-2 font-medium transition-colors ${
                mode === m ? "bg-gold text-night-deep" : "text-parchment/70 hover:text-gold-bright"
              }`}
            >
              {m === "giris" ? "Giriş Yap" : "Üye Ol"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">E-posta</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className={inputCls} />
          </div>
          <div>
            <label htmlFor="sifre" className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Şifre</label>
            <input id="sifre" type="password" required minLength={6} autoComplete={kayit ? "new-password" : "current-password"} value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder={kayit ? "En az 6 karakter belirle" : "Şifren"} className={inputCls} />
          </div>

          {kayit && (
            <div>
              <label htmlFor="sifre2" className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-parchment/55">Şifre (tekrar)</label>
              <input id="sifre2" type="password" required minLength={6} autoComplete="new-password" value={sifre2} onChange={(e) => setSifre2(e.target.value)} placeholder="Şifreni tekrar gir" className={inputCls} />
            </div>
          )}

          {hata && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{hata}</p>}

          <button type="submit" disabled={yuk} className="mt-2 w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {yuk ? "Lütfen bekle…" : kayit ? "Hesap Oluştur" : "Giriş Yap"}
          </button>
        </form>

        {!kayit && (
          <p className="mt-4 text-center text-sm">
            <Link href="/sifremi-unuttum" className="text-parchment/55 hover:text-gold-bright">Şifremi unuttum</Link>
          </p>
        )}

        <p className="mt-5 border-t border-gold/10 pt-5 text-center text-sm text-parchment/60">
          {kayit ? "Zaten üye misin? " : "Hesabın yok mu? "}
          <button type="button" onClick={() => switchMode(kayit ? "giris" : "kayit")} className="font-medium text-gold-bright hover:underline">
            {kayit ? "Giriş yap" : "Üye ol"}
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-parchment/40">
        Devam ederek <Link href="/yasal/gizlilik" className="underline hover:text-parchment/70">Gizlilik ve KVKK</Link> koşullarını kabul etmiş olursun.
      </p>
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <GirisForm />
    </Suspense>
  );
}
