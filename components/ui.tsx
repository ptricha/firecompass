"use client";

import type { ReactNode } from "react";
import { AREA_COLOR, areaLabel, sourceFor, type Area } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export function AreaBadge({ area }: { area: Area }) {
  const { lang } = useLang();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-2 py-0.5 text-xs text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: AREA_COLOR[area] }} aria-hidden="true" />
      {areaLabel(area, lang)}
    </span>
  );
}

export function Pending({ children }: { children?: ReactNode }) {
  const { lang } = useLang();
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-2 px-1.5 py-0.5 text-xs text-muted">
      <span aria-hidden="true">◌</span>
      {children ?? (lang === "es" ? "No verificado" : "Not verified")}
    </span>
  );
}

const SRC_EN: [string, string][] = [["GUIDE", "NASA Guide 2015"], ["FS-", "Fact sheet "], ["CHALLENGE", "Challenge statement"], ["PSI-TABLES", "PSI data table"]];
const SRC_ES: [string, string][] = [["GUIDE", "Guía NASA 2015"], ["FS-", "Ficha "], ["CHALLENGE", "Enunciado del reto"], ["PSI-TABLES", "Tabla de datos PSI"]];

export function SourceTag({ src }: { src: string }) {
  const { lang } = useLang();
  const s = sourceFor(src);
  let text = src;
  for (const [k, v] of lang === "es" ? SRC_ES : SRC_EN) text = text.replace(k, v);
  if (src === "PSI") text = "PSI";
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
