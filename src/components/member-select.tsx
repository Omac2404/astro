"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Member = { id: string; email: string };

// Aranabilir müşteri seçici (binlerce kayıt için). Dropdown portal ile body'ye render → kart overflow'u kesmez.
export function MemberSelect({
  members,
  value,
  onChange,
  placeholder = "Müşteri ara (e-posta)…",
}: {
  members: Member[];
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? members.filter((m) => m.email.toLowerCase().includes(s)) : members;
    return list.slice(0, 30);
  }, [members, q]);

  const konumla = () => {
    const el = inputRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  };
  const ac = () => { konumla(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const f = () => konumla();
    window.addEventListener("scroll", f, true);
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f, true); window.removeEventListener("resize", f); };
  }, [open]);

  const goster = value && !open ? value : q;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={goster}
        onChange={(e) => { setQ(e.target.value); ac(); if (value) onChange(""); }}
        onFocus={() => { if (value) setQ(value); ac(); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gold/20 bg-night px-3 py-2 text-sm text-parchment placeholder:text-parchment/35 outline-none focus:border-gold/55"
      />
      {value && !open && (
        <button type="button" onClick={() => { onChange(""); setQ(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-parchment/40 hover:text-parchment" aria-label="Temizle">✕</button>
      )}
      {open && rect && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
          className="z-[200] max-h-60 overflow-y-auto rounded-lg border border-gold/20 bg-night-deep shadow-xl shadow-black/50"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-parchment/45">{members.length === 0 ? "Henüz üye yok." : "Eşleşme yok."}</div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(m.email); setQ(m.email); setOpen(false); }}
                className={`block w-full truncate px-3 py-2 text-left text-sm transition-colors hover:bg-gold/10 ${m.email === value ? "text-gold-bright" : "text-parchment/80"}`}
              >
                {m.email}
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
