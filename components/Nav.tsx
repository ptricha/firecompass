"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, useT } from "@/lib/i18n";
import { useGuide } from "@/lib/guide";
import type { Lang } from "@/lib/data";

const T = {
  en: {
    ignition: "Home", spark: "Basics", chronicles: "History", worlds: "Simulator", lab: "Data Lab", vault: "Experiments", radar: "Ranking", oracle: "Ask AI", proof: "Sources",
    main: "Main", language: "Language", guide: "Guide mode", guideOn: "Guide on", menu: "Menu",
    hints: ["Start here", "New to this? Basics", "Real fires & history", "Simulate fire anywhere", "Play with the conditions", "Every NASA experiment", "Rank what matters", "Ask anything", "Sources & licences"],
  },
  es: {
    ignition: "Inicio", spark: "Lo básico", chronicles: "Historia", worlds: "Simulador", lab: "Laboratorio", vault: "Experimentos", radar: "Ranking", oracle: "Preguntar IA", proof: "Fuentes",
    main: "Principal", language: "Idioma", guide: "Modo guía", guideOn: "Guía activa", menu: "Menú",
    hints: ["Empieza aquí", "¿Nuevo? Lo básico", "Incendios reales e historia", "Simula fuego en cualquier lugar", "Juega con las condiciones", "Cada experimento NASA", "Prioriza lo importante", "Pregunta lo que quieras", "Fuentes y licencias"],
  },
};

export default function Nav() {
  const path = usePathname();
  const { lang, setLang } = useLang();
  const { on, setOn } = useGuide();
  const t = useT(T);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  // logical learning order: understand -> see -> play -> explore -> decide -> ask -> verify
  const LINKS = [
    { href: "/", label: t.ignition },
    { href: "/learn", label: t.spark },
    { href: "/history", label: t.chronicles },
    { href: "/simulator", label: t.worlds },
    { href: "/lab", label: t.lab },
    { href: "/explorer", label: t.vault },
    { href: "/dashboard", label: t.radar },
    { href: "/ask", label: t.oracle },
    { href: "/references", label: t.proof },
  ];
  const isActive = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  const guideBtn = (
    <button
      onClick={() => setOn(!on)}
      aria-pressed={on}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? "border-accent bg-accent/25 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </svg>
      {on ? t.guideOn : t.guide}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="relative h-9 w-9 shrink-0" title="English · Español">
          <svg className="pointer-events-none absolute inset-0 m-auto text-ink-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
          </svg>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={t.language}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border border-line-2 bg-transparent text-transparent transition-colors hover:border-ink-2"
          >
            <option value="en" className="bg-surface text-ink">English</option>
            <option value="es" className="bg-surface text-ink">Español</option>
          </select>
        </div>
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">JaPax</Link>

        <nav aria-label={t.main} className="ml-auto hidden items-center gap-0.5 text-sm xl:flex">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              title={t.hints[i]}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors ${isActive(l.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 xl:ml-2">
          {guideBtn}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t.menu}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line-2 text-ink-2 hover:text-ink xl:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label={t.main} className="border-t border-line bg-bg xl:hidden">
          <ul className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:grid-cols-2">
            {LINKS.map((l, i) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={`flex items-baseline justify-between gap-3 rounded-md px-3 py-2 ${isActive(l.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`}>
                  <span className="font-medium">{i + 1}. {l.label}</span>
                  <span className="text-xs text-muted">{t.hints[i]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
