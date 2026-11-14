"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";
import AskChat from "@/components/AskChat";
import PaxFace from "@/components/PaxFace";

const EVENT = "pax:ask";

/** Opens Pax's large Ask window from anywhere (optionally with a first question). */
export function openAsk(question?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { q: question } }));
}

const T = {
  en: { title: "Ask Pax", sub: "Answers built from verified NASA data", close: "Close" },
  es: { title: "Pregunta a Pax", sub: "Respuestas construidas con datos verificados de la NASA", close: "Cerrar" },
};

/** Large Ask window. It replaces the old Ask AI page: every in-app link to /ask opens it. */
export default function AskWindow() {
  const t = useT(T);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<string | undefined>();
  const [session, setSession] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      opener.current = document.activeElement as HTMLElement | null;
      setFirst((e as CustomEvent<{ q?: string }>).detail?.q);
      setSession((s) => s + 1);
      setOpen(true);
    };
    // Any plain click on a link to /ask opens the window instead of the page.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/ask") return;
      e.preventDefault();
      e.stopPropagation();
      openAsk(url.searchParams.get("q") ?? undefined);
    };
    window.addEventListener(EVENT, onOpen);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(EVENT, onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // Navigating from an answer link closes the window
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#05070a]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label={t.title} className="flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-line-2 bg-surface shadow-2xl sm:h-[85vh] sm:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-line px-5 py-3">
          <PaxFace talking={false} size={38} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight">{t.title}</h2>
            <p className="truncate text-xs text-muted">{t.sub}</p>
          </div>
          <button ref={closeRef} onClick={() => setOpen(false)} aria-label={t.close} className="rounded-md px-2 py-1 text-ink-2 hover:text-ink">✕</button>
        </header>
        <div className="min-h-0 flex-1">
          <AskChat key={session} embedded initialQuestion={first} />
        </div>
      </section>
    </div>
  );
}
