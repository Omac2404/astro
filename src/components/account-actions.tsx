"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const cik = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return (
    <button
      onClick={cik}
      className="rounded-full border border-gold/30 px-5 py-2 text-sm font-medium text-parchment/80 transition-colors hover:border-gold/55 hover:text-gold-bright"
    >
      Çıkış Yap
    </button>
  );
}

export function FaturaButton() {
  return (
    <Link href="/hesabim/fatura" className="inline-flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-1.5 text-xs font-medium text-gold-bright transition-colors hover:bg-gold/10">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/></svg>
      Fatura bilgilerini düzenle
    </Link>
  );
}

export function GiftRedeem() {
  const router = useRouter();
  const [kod, setKod] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const kullan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kod.trim()) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/account/redeem-gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kod }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setOk(true);
      setMsg(`"${d.urunAd}" hesabına tanımlandı. Analizlerim'den doğum bilgilerini girebilirsin.`);
      setKod("");
      router.refresh();
    } else {
      setOk(false);
      setMsg(d.error || "Kod kullanılamadı.");
    }
  };

  return (
    <form onSubmit={kullan} className="space-y-3">
      <div className="flex gap-2">
        <input
          value={kod}
          onChange={(e) => setKod(e.target.value.toUpperCase())}
          placeholder="GOK-XXXX-XXXX"
          className="flex-1 rounded-xl border border-gold/20 bg-night/50 px-4 py-2.5 font-mono text-sm tracking-wider text-parchment placeholder:text-parchment/30 outline-none transition-colors focus:border-gold/55"
        />
        <button disabled={busy} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
          {busy ? "…" : "Kullan"}
        </button>
      </div>
      {msg && <p className={`text-sm ${ok ? "text-emerald-300" : "text-rose-300"}`}>{msg}</p>}
    </form>
  );
}
