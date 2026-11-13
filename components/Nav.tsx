"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/explorer", label: "Explorer" },
  { href: "/simulator", label: "Simulator" },
  { href: "/dashboard", label: "Ranking" },
  { href: "/ask", label: "Ask" },
  { href: "/references", label: "References" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--flame)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4.2" fill="var(--accent)" />
            <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          FireCompass
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 overflow-x-auto text-sm">
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
