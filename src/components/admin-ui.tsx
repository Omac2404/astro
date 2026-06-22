import type { ReactNode } from "react";

type Tone = "green" | "amber" | "rose" | "blue" | "gray";

const TONE: Record<Tone, string> = {
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  rose: "border-rose-400/30 bg-rose-500/10 text-rose-300",
  blue: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  gray: "border-parchment/20 bg-parchment/10 text-parchment/60",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function PageHead({ title, action }: { title: string; desc?: string; action?: ReactNode }) {
  // Not: alt açıklama metinleri kaldırıldı (Deniz kararı) — desc prop'u sessizce yok sayılır.
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-3xl font-semibold text-parchment">{title}</h1>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-gold/15 bg-night-deep/60 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "gray" }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.15em] text-parchment/50">{label}</span>
        <span className={`h-2 w-2 rounded-full ${TONE[tone].split(" ")[1]}`} />
      </div>
      <div className="mt-3 font-body text-3xl font-semibold text-parchment">{value}</div>
      {hint && <div className="mt-1 text-xs text-parchment/45">{hint}</div>}
    </Panel>
  );
}
