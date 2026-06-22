"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProduct } from "@/lib/products";
import { PersonFields, bosKisi, toDogum, type Kisi } from "@/components/birth-form";

export default function AnalizBilgiPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [slug, setSlug] = useState<string | null>(null);
  const [k1, setK1] = useState<Kisi>(bosKisi());
  const [k2, setK2] = useState<Kisi>(bosKisi());
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  useEffect(() => {
    fetch("/api/account/reports")
      .then((r) => r.json())
      .then((d) => {
        const rep = (d.reports ?? []).find((x: { id: string }) => x.id === id);
        setSlug(rep ? rep.slug : "");
      })
      .catch(() => setSlug(""));
  }, [id]);

  const cift = !!slug && slug.startsWith("sinastri");
  const p = slug ? getProduct(slug) : undefined;

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYuk(true);
    const body: Record<string, unknown> = { reportId: id, dogum: toDogum(k1) };
    if (cift) body.dogum2 = toDogum(k2);
    const r = await fetch("/api/account/report-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) return setHata(d.error || "Gönderilemedi.");
    router.push("/hesabim");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <Link href="/hesabim" className="text-sm text-parchment/55 hover:text-gold-bright">← Hesabım</Link>
      <h1 className="mt-3 text-center font-display text-4xl font-semibold">Doğum Bilgileri</h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-parchment/60">
        Analizin bu bilgilere göre hazırlanır.
        <br />
        <span className="font-medium text-[#c3a6e8]">Doğum saati ne kadar net olursa rapor o kadar isabetli olur.</span>
      </p>

      {/* Mini analiz kartı */}
      {p && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold/15 bg-night-deep p-4">
          <div className="relative h-20 w-15 shrink-0 overflow-hidden rounded-lg border border-gold/15" style={{ width: "3.5rem" }}>
            {p.gorsel ? (
              <Image src={p.gorsel} alt={p.ad} fill sizes="56px" style={{ objectPosition: p.objectPos ?? "center 22%" }} className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-night text-gold-bright/40">✶</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-semibold leading-tight text-parchment">{p.ad}</div>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-parchment/60">{p.kartKisa ?? p.kisa}</p>
          </div>
        </div>
      )}

      <form onSubmit={gonder} className="mt-6 space-y-6 rounded-2xl border border-gold/15 bg-night-deep p-6">
        {cift ? (
          <>
            <PersonFields k={k1} set={(patch) => setK1((s) => ({ ...s, ...patch }))} baslik="1. Kişi" />
            <div className="border-t border-gold/10" />
            <PersonFields k={k2} set={(patch) => setK2((s) => ({ ...s, ...patch }))} baslik="2. Kişi" />
          </>
        ) : (
          <PersonFields k={k1} set={(patch) => setK1((s) => ({ ...s, ...patch }))} />
        )}
        {hata && <p className="text-sm text-rose-300">{hata}</p>}
        <button type="submit" disabled={yuk} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
          {yuk ? "Gönderiliyor…" : "Gönder ve Analizi Başlat"}
        </button>
      </form>
    </div>
  );
}
