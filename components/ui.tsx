import type { ReactNode } from "react";
import { AREA_COLOR, AREA_LABEL, sourceFor, type Area } from "@/lib/data";

export function AreaBadge({ area }: { area: Area }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-2 py-0.5 text-xs text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: AREA_COLOR[area] }} aria-hidden="true" />
      {AREA_LABEL[area]}
    </span>
  );
}

export function Pending({ children = "Not verified" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 px-1.5 py-0.5 text-xs text-muted">
      <span aria-hidden="true">◌</span>
      {children}
    </span>
  );
}

export function SourceTag({ src }: { src: string }) {
  const s = sourceFor(src);
  const label = src.replace("GUIDE", "NASA Guide 2015").replace("FS-", "Fact sheet ").replace("CHALLENGE", "Challenge statement");
  const text = src === "PSI" ? "PSI" : label;
  if (!s) return <span className="text-xs text-muted">{text}</span>;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={s.label}
      className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2 hover:text-ink"
    >
      <span aria-hidden="true">↗</span>
      {text}
    </a>
  );
}

export function Section({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 pt-16">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}
