"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PersonFields, bosKisi, toDogum, type Kisi } from "@/components/birth-form";

function DogumForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/hesabim";
  const [k, setK] = useState<Kisi>(bosKisi());
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);
  const [kilitli, setKilitli] = useState<null | { yer: string }>(null);

  // Zaten kayıtlıysa (kilitli) formu gösterme
  useEffect(() => {
    fetch("/api/account/dogum").then((r) => r.json()).then((d) => { if (d.dogum) setKilitli(d.dogum); }).catch(() => {});
  }, []);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYuk(true);
    const r = await fetch("/api/account/dogum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dogum: toDogum(k) }) });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) return setHata(d.error || "Kaydedilemedi.");
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <Link href="/hesabim" className="text-sm text-parchment/55 hover:text-gold-bright">← Hesabım</Link>
      <h1 className="mt-3 text-center font-display text-4xl font-semibold">Doğum Bilgilerin</h1>
      <p className="mt-3 text-center text-[13px] leading-relaxed text-parchment/60">
        Tüm analizlerin bu bilgilere göre hazırlanır. <span className="font-medium text-[#c3a6e8]">Bir kez girilir ve sonradan değiştirilemez</span>, bu yüzden dikkatli gir.
        <br />
        Doğum saati ne kadar net olursa rapor o kadar isabetli olur.
      </p>

      {kilitli ? (
        <div className="mt-6 rounded-2xl border border-gold/15 bg-night p-6 text-center">
          <p className="text-sm text-parchment/70">Doğum bilgin zaten kayıtlı ve <b className="text-parchment/90">değiştirilemez</b>.</p>
          <Link href="/hesabim" className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-medium text-night-deep transition-colors hover:bg-gold-bright">Hesabıma dön</Link>
        </div>
      ) : (
        <form onSubmit={gonder} className="mt-6 space-y-6 rounded-2xl border border-gold/15 bg-night p-6">
          <PersonFields k={k} set={(patch) => setK((s) => ({ ...s, ...patch }))} />
          {hata && <p className="text-sm text-rose-300">{hata}</p>}
          <button type="submit" disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
            {yuk ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function DogumBilgiPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <DogumForm />
    </Suspense>
  );
}
