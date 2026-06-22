"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
  "w-full rounded-xl border border-gold/20 bg-night/50 px-4 py-3 text-parchment placeholder:text-parchment/35 outline-none transition-colors focus:border-gold/55";

export function ForgotPassword({ scope, title, backHref }: { scope: "member" | "admin"; title: string; backHref: string }) {
  const [step, setStep] = useState<"email" | "kod" | "yeni" | "ok">("email");
  const [email, setEmail] = useState("");
  const [demo, setDemo] = useState("");
  const [kod, setKod] = useState("");
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  const iste = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYuk(true);
    const r = await fetch("/api/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, email }),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) return setHata(d.error || "Bir hata oluştu.");
    setDemo(d.demoCode || "");
    setStep("kod");
  };

  const koddanDevam = (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    if (!kod.trim()) return setHata("Kodu gir.");
    setStep("yeni");
  };

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    if (s1.length < 6) return setHata("Şifre en az 6 karakter olmalı.");
    if (s1 !== s2) return setHata("Şifreler eşleşmiyor.");
    setYuk(true);
    const r = await fetch("/api/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, email, code: kod, sifre: s1 }),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) {
      setHata(d.error || "Bir hata oluştu.");
      if (/[Kk]od/.test(d.error || "")) setStep("kod");
      return;
    }
    setStep("ok");
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl border border-gold/20 bg-night-deep/70 p-7 backdrop-blur-sm sm:p-9">
        <h1 className="text-center font-display text-3xl font-semibold text-parchment">{title}</h1>

        {step === "email" && (
          <form onSubmit={iste} className="mt-7 space-y-4">
            <p className="text-center text-sm text-parchment/60">E-postanı gir, sana bir doğrulama kodu gönderelim.</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className={inputCls} />
            {hata && <p className="text-sm text-rose-300">{hata}</p>}
            <button disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
              {yuk ? "Gönderiliyor…" : "Kod gönder"}
            </button>
          </form>
        )}

        {step === "kod" && (
          <form onSubmit={koddanDevam} className="mt-7 space-y-4">
            <p className="text-center text-sm text-parchment/60">{email} adresine gönderilen 6 haneli kodu gir.</p>
            {demo && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-300">
                Demo modu (e-posta gönderimi yok) · kodun: <b className="tracking-widest">{demo}</b>
              </p>
            )}
            <input inputMode="numeric" required value={kod} onChange={(e) => setKod(e.target.value)} placeholder="6 haneli kod" className={`${inputCls} text-center tracking-[0.4em]`} />
            {hata && <p className="text-sm text-rose-300">{hata}</p>}
            <button className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright">Devam</button>
          </form>
        )}

        {step === "yeni" && (
          <form onSubmit={kaydet} className="mt-7 space-y-4">
            <p className="text-center text-sm text-parchment/60">Yeni şifreni belirle.</p>
            <input type="password" required minLength={6} value={s1} onChange={(e) => setS1(e.target.value)} placeholder="Yeni şifre (en az 6 karakter)" className={inputCls} />
            <input type="password" required minLength={6} value={s2} onChange={(e) => setS2(e.target.value)} placeholder="Yeni şifre (tekrar)" className={inputCls} />
            {hata && <p className="text-sm text-rose-300">{hata}</p>}
            <button disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
              {yuk ? "Kaydediliyor…" : "Şifreyi güncelle"}
            </button>
          </form>
        )}

        {step === "ok" && (
          <div className="mt-7 text-center">
            <p className="text-parchment/75">Şifren güncellendi. Artık yeni şifrenle giriş yapabilirsin.</p>
            <Link href={backHref} className="mt-5 inline-block rounded-full bg-gold px-6 py-2.5 font-medium text-night-deep transition-colors hover:bg-gold-bright">
              Giriş ekranına dön
            </Link>
          </div>
        )}

        {step !== "ok" && (
          <p className="mt-6 text-center text-sm text-parchment/55">
            <Link href={backHref} className="hover:text-gold-bright">← Giriş ekranına dön</Link>
          </p>
        )}
      </div>
    </div>
  );
}
