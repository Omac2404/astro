"use client";

import Link from "next/link";
import { useState } from "react";

export type FaqEntry = { q: string; a: string; btnText?: string; btnHref?: string };

// Cevap metnindeki **...** parçalarını altın vurgu olarak render eder.
function renderVurgu(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-gold-bright">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function FaqItem({ it, open, onToggle }: { it: FaqEntry; open: boolean; onToggle: () => void }) {
  const buton = it.btnText && it.btnHref;
  return (
    <div className="rounded-xl border border-gold/15 bg-night px-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left font-display text-xl transition-colors duration-300 ${
          open ? "text-[#ffcf67]" : "text-parchment"
        }`}
      >
        {it.q}
        <span className={`shrink-0 transition-all duration-300 ease-out ${open ? "rotate-45 text-[#ffcf67]" : "text-gold-bright"}`}>
          +
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="leading-relaxed text-parchment/70">{renderVurgu(it.a)}</p>
          {buton && (
            <Link
              href={it.btnHref!}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-5 py-2 text-sm font-medium text-gold-bright transition-colors hover:bg-gold/20"
            >
              {it.btnText}
              <span aria-hidden>→</span>
            </Link>
          )}
          <div className="pb-4" />
        </div>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: FaqEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <FaqItem
          key={i}
          it={it}
          open={openIndex === i}
          onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
        />
      ))}
    </div>
  );
}
