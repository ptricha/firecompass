"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, useT } from "@/lib/i18n";
import type { Lang } from "@/lib/data";

const T = {
  en: { home: "Home", history: "History", explorer: "Explorer", simulator: "Simulator", lab: "Data Lab", ranking: "Ranking", ask: "Oracle", refs: "References", main: "Main", language: "Language" },
  es: { home: "Inicio", history: "Historia", explorer: "Explorador", simulator: "Simulador", lab: "Laboratorio", ranking: "Ranking", ask: "Oráculo", refs: "Referencias", main: "Principal", language: "Idioma" },
};

export default function Nav() {
  const path = usePathname();
  const { lang, setLang } = useLang();
  const t = useT(T);
  const LINKS = [
    { href: "/", label: t.home },
    { href: "/history", label: t.history },
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
        {/* language: only the globe symbol is visible; the native select sits invisibly on top of it */}
        <div className="relative h-9 w-9 shrink-0" title="English · Español">
          <svg
            className="pointer-events-none absolute inset-0 m-auto text-ink-2"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
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
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          JaPax
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
