"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, useT } from "@/lib/i18n";
import type { Lang } from "@/lib/data";

const T = {
  en: { home: "Home", explorer: "Explorer", simulator: "Simulator", lab: "Data Lab", ranking: "Ranking", ask: "Ask", refs: "References", main: "Main", language: "Language" },
  es: { home: "Inicio", explorer: "Explorador", simulator: "Simulador", lab: "Laboratorio", ranking: "Ranking", ask: "Preguntar", refs: "Referencias", main: "Principal", language: "Idioma" },
};

export default function Nav() {
  const path = usePathname();
  const { lang, setLang } = useLang();
  const t = useT(T);
  const LINKS = [
    { href: "/", label: t.home },
    { href: "/explorer", label: t.explorer },
    { href: "/simulator", label: t.simulator },
    { href: "/lab", label: t.lab },
    { href: "/dashboard", label: t.ranking },
    { href: "/ask", label: t.ask },
    { href: "/references", label: t.refs },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <label className="flex shrink-0 items-center gap-1.5 text-sm text-ink-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
          </svg>
          <span className="sr-only">{t.language}</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            aria-label={t.language}
            className="rounded-md border border-line-2 bg-surface px-2 py-1 text-ink"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--flame)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4.2" fill="var(--accent)" />
            <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">FireCompass</span>
        </Link>
        <nav aria-label={t.main} className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 transition-colors ${
                  active ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
