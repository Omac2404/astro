"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProduct } from "@/lib/products";
import { PersonFields, bosKisi, toDogum, type Kisi } from "@/components/birth-form";

type Dogum = { ad: string; tarih: string; saat?: string; yer: string };

export default function AnalizBilgiPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [hesapDogum, setHesapDogum] = useState<Dogum | null | undefined>(undefined); // undefined=yükleniyor, null=yok
  const [k2, setK2] = useState<Kisi>(bosKisi());
  const [hata, setHata] = useState("");
  const [yuk, setYuk] = useState(false);

  useEffect(() => {
    fetch("/api/account/reports").then((r) => r.json()).then((d) => {
      const rep = (d.reports ?? []).find((x: { id: string }) => x.id === id);
      setSlug(rep ? rep.slug : "");
    }).catch(() => setSlug(""));
    fetch("/api/account/dogum").then((r) => r.json()).then((d) => setHesapDogum(d.dogum ?? null)).catch(() => setHesapDogum(null));
  }, [id]);

  // Hesapta doğum bilgisi yoksa önce onu iste
  useEffect(() => {
    if (hesapDogum === null) router.replace("/hesabim/dogum?next=" + encodeURIComponent(`/hesabim/analiz/${id}`));
  }, [hesapDogum, id, router]);

  const cift = !!slug && slug.startsWith("sinastri");
  const p = slug ? getProduct(slug) : undefined;

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata("");
    setYuk(true);
    const body: Record<string, unknown> = { reportId: id };
    if (cift) body.dogum2 = toDogum(k2);
    const r = await fetch("/api/account/report-info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    setYuk(false);
    if (!r.ok) {
      if (d.needBirth) return router.replace("/hesabim/dogum?next=" + encodeURIComponent(`/hesabim/analiz/${id}`));
      return setHata(d.error || "Gönderilemedi.");
    }
    // Analiz başladı: popup yerine Analizlerim'e git (üretim sırası/durumu orada canlı görünür)
    router.push("/hesabim?yeni=1");
    router.refresh();
  };

  const dogumOzet = hesapDogum ? `${hesapDogum.ad} · ${hesapDogum.tarih}${hesapDogum.saat ? " " + hesapDogum.saat : ""} · ${hesapDogum.yer}` : "";

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <Link href="/hesabim" className="text-sm text-parchment/55 hover:text-gold-bright">← Hesabım</Link>
      <h1 className="mt-3 text-center font-display text-4xl font-semibold">{cift ? "2. Kişinin Doğum Bilgileri" : "Analizi Başlat"}</h1>
      <p className="mt-3 text-center text-[13px] leading-relaxed text-parchment/60">
        {cift
          ? "1. kişi senin hesabın. Uyum analizi için ikinci kişinin doğum bilgilerini gir."
          : "Analizin hesabındaki doğum bilgilerine göre hazırlanır."}
      </p>

      {/* Mini analiz kartı */}
      {p && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-gold/15 bg-night p-4">
          <div className="relative h-20 shrink-0 overflow-hidden rounded-lg border border-gold/15" style={{ width: "3.5rem" }}>
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

      {/* Hesabın doğum bilgisi (kilitli) */}
      {hesapDogum && (
        <div className="mt-4 rounded-xl border border-gold/10 bg-night-deep/50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.15em] text-parchment/45">{cift ? "1. Kişi (sen)" : "Doğum bilgin"}</div>
          <div className="mt-0.5 text-sm text-parchment/85">{dogumOzet}</div>
        </div>
      )}

      <form onSubmit={gonder} className="mt-6 space-y-6 rounded-2xl border border-gold/15 bg-night p-6">
        {cift && <PersonFields k={k2} set={(patch) => setK2((s) => ({ ...s, ...patch }))} baslik="2. Kişi" />}
        {hata && <p className="text-sm text-rose-300">{hata}</p>}
        <button type="submit" disabled={yuk || hesapDogum === undefined} className="w-full rounded-full bg-gold py-3 font-medium text-night-deep transition-colors hover:bg-gold-bright disabled:opacity-60">
          {yuk ? "Gönderiliyor…" : cift ? "Gönder ve Analizi Başlat" : "Analizi Başlat"}
        </button>
      </form>
    </div>
  );
}
