import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { getGenelAyar } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sayfa = getGenelAyar().yasal.find((y) => y.slug === slug);
  return { title: sayfa ? `${sayfa.baslik} — Gökname` : "Gökname" };
}

// Satırları paragraf olarak render et (tek bloktaki \n kırılımlarını koru)
function paragraf(metin: string, key: number) {
  const satirlar = metin.split("\n");
  return (
    <p key={key} className="mt-4 leading-relaxed text-parchment/75">
      {satirlar.map((s, j) => (
        <span key={j}>
          {s}
          {j < satirlar.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

// İçerik: "## " ile başlayan satır = alt başlık; boş satırla ayrılan bloklar = paragraf.
function renderIcerik(icerik: string) {
  const bloklar = icerik.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return bloklar.map((blok, i) => {
    if (blok.startsWith("## ")) {
      const satirlar = blok.split("\n");
      const baslik = satirlar[0].slice(3).trim();
      const kalan = satirlar.slice(1).join("\n").trim();
      return (
        <Fragment key={i}>
          <h2 className="mt-8 font-display text-2xl font-semibold text-gold-bright first:mt-0">{baslik}</h2>
          {kalan && paragraf(kalan, i)}
        </Fragment>
      );
    }
    return paragraf(blok, i);
  });
}

export default async function YasalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sayfa = getGenelAyar().yasal.find((y) => y.slug === slug);
  if (!sayfa) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-display text-4xl font-semibold sm:text-5xl">{sayfa.baslik}</h1>
      <div className="mt-8">
        {sayfa.icerik.trim() ? renderIcerik(sayfa.icerik) : <p className="leading-relaxed text-parchment/50">Bu sayfanın içeriği yakında eklenecek.</p>}
      </div>
    </div>
  );
}
