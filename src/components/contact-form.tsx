"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls = "w-full rounded-lg border border-gold/20 bg-night-deep px-4 py-2.5 text-parchment placeholder:text-parchment/35 outline-none focus:border-gold/50";

export function ContactForm() {
  const [ad, setAd] = useState("");
  const [eposta, setEposta] = useState("");
  const [konu, setKonu] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [onay, setOnay] = useState(false);
  const [yuk, setYuk] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; t: string } | null>(null);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onay) { setSonuc({ ok: false, t: "Devam etmek için aydınlatma metnini onaylamalısın." }); return; }
    setYuk(true); setSonuc(null);
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ad, eposta, konu, mesaj }) });
    const d = await r.json().catch(() => ({}));
    setYuk(false);
    if (r.ok) { setSonuc({ ok: true, t: "Mesajın bize ulaştı, 24 saat içinde döneceğiz." }); setAd(""); setEposta(""); setKonu(""); setMesaj(""); setOnay(false); }
    else setSonuc({ ok: false, t: d.error || "Gönderilemedi, lütfen tekrar dene." });
  };

  return (
    <form onSubmit={gonder} className="rounded-2xl border border-gold/15 bg-night p-6 space-y-4">
      <h2 className="font-display text-2xl font-semibold text-parchment">Destek &amp; İletişim</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-parchment/70">Ad Soyad</label>
          <input value={ad} onChange={(e) => setAd(e.target.value)} required placeholder="Adın" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-parchment/70">E-posta</label>
          <input type="email" value={eposta} onChange={(e) => setEposta(e.target.value)} required placeholder="ornek@eposta.com" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-parchment/70">Konu</label>
        <input value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="Mesajının konusu" className={inputCls} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-parchment/70">Mesajın</label>
        <textarea rows={5} value={mesaj} onChange={(e) => setMesaj(e.target.value)} required placeholder="Bize iletmek istediğin her şey..." className={`${inputCls} resize-none`} />
      </div>
      {/* KVKK / aydınlatma onayı */}
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gold/10 bg-night-deep/60 px-3 py-3 text-sm text-parchment/70">
        <input type="checkbox" checked={onay} onChange={(e) => setOnay(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#c2a36b]" />
        <span>
          <Link href="/yasal/gizlilik" target="_blank" className="text-gold-bright hover:underline">Gizlilik ve KVKK Aydınlatma Metni</Link>’ni okudum; mesajıma dönüş yapılması amacıyla paylaştığım bilgilerin işlenmesini kabul ediyorum.
        </span>
      </label>
      <button type="submit" disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
        {yuk ? "Gönderiliyor…" : "Gönder"}
      </button>
      {sonuc && <p className={`text-center text-sm ${sonuc.ok ? "text-emerald-300" : "text-rose-300"}`}>{sonuc.t}</p>}
    </form>
  );
}
