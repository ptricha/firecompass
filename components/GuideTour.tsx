"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TOUR, useGuide } from "@/lib/guide";
import { useT } from "@/lib/i18n";
import { GUIDE_T } from "@/lib/guideStops";
import PaxFace from "@/components/PaxFace";

type Box = { top: number; left: number; width: number; height: number };
const CARD_W = 360;
const GAP = 14;

/** First visible element matching the selector. */
function findTarget(sel: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Guided tour: a spotlight plus a popover that points at real parts of each page. */
export default function GuideTour() {
  const { on, setOn } = useGuide();
  const t = useT(GUIDE_T);
  const path = usePathname();
  const router = useRouter();
  const key = TOUR.find((p) => (p === "/" ? path === "/" : path.startsWith(p)));
  const steps = key ? t.steps[key] : undefined;
  const pageIdx = key ? TOUR.indexOf(key) : -1;

  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [talking, setTalking] = useState(false);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setI(0), [key, on]);

  const step = steps?.[Math.min(i, (steps?.length ?? 1) - 1)];
  const active = on && !!step;

  // Find the target (pages may render late), scroll it into view and keep its box fresh.
  useEffect(() => {
    if (!active || !step) return;
    let el: HTMLElement | null = null;
    let raf = 0;
    let tries = 0;
    let scrolled = false;
    const measure = () => {
      if (!el || !el.isConnected) el = findTarget(step.sel);
      if (el) {
        const r = el.getBoundingClientRect();
        // Tall targets (e.g. the timeline) are shown from their start; the spotlight covers just the top part.
        const tall = r.height > window.innerHeight * 0.6;
        const h = tall ? Math.min(r.height, 220) : r.height;
        if (!scrolled) {
          scrolled = true;
          const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
          if (tall) window.scrollTo({ top: window.scrollY + r.top - 110, behavior });
          else el.scrollIntoView({ block: "center", behavior });
        }
        setBox((b) => (b && Math.abs(b.top - r.top) < 0.5 && Math.abs(b.left - r.left) < 0.5 && Math.abs(b.width - r.width) < 0.5 && Math.abs(b.height - h) < 0.5 ? b : { top: r.top, left: r.left, width: r.width, height: h }));
      } else if (++tries > 40) setBox(null);
      raf = requestAnimationFrame(measure);
    };
    setBox(null);
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [active, step]);

  // Pax "speaks" for a moment on every new step
  useEffect(() => {
    if (!active) return;
    setTalking(true);
    const id = setTimeout(() => setTalking(false), 1800);
    return () => clearTimeout(id);
  }, [active, i, key]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, key, active, t]);

  useEffect(() => {
    if (active) nextRef.current?.focus({ preventScroll: true });
  }, [active, i, key]);

  const nextPage = pageIdx >= 0 && pageIdx < TOUR.length - 1 ? TOUR[pageIdx + 1] : null;
  const prevPage = pageIdx > 0 ? TOUR[pageIdx - 1] : null;

  const goNext = useCallback(() => {
    if (!steps) return;
    if (i < steps.length - 1) setI(i + 1);
    else if (nextPage) router.push(nextPage);
    else setOn(false);
  }, [i, steps, nextPage, router, setOn]);

  const goBack = useCallback(() => {
    if (i > 0) setI(i - 1);
    else if (prevPage) router.push(prevPage);
  }, [i, prevPage, router]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goNext, goBack, setOn]);

  if (!active || !steps || !step || !key) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const mobile = vw < 640;
  const pad = 6;

  // Card position: below the target if it fits, else above, else docked at the bottom.
  let style: React.CSSProperties;
  let arrow: "up" | "down" | null = null;
  let cardLeft = 0;
  if (mobile || !box) {
    style = mobile ? { left: 8, right: 8, bottom: 88 } : { left: "50%", bottom: 24, transform: "translateX(-50%)", width: CARD_W };
  } else {
    const below = box.top + box.height + pad + GAP;
    const above = box.top - pad - GAP - cardH;
    let top: number;
    if (below + cardH <= vh - 8) { top = below; arrow = "up"; }
    else if (above >= 8) { top = above; arrow = "down"; }
    else top = Math.max(8, vh - cardH - 24);
    cardLeft = Math.min(Math.max(8, box.left + box.width / 2 - CARD_W / 2), vw - CARD_W - 8);
    style = { top, left: cardLeft, width: CARD_W };
  }
  const arrowLeft = box ? Math.min(Math.max(20, box.left + box.width / 2 - cardLeft), CARD_W - 20) : 0;
  const progress = ((pageIdx + (i + 1) / steps.length) / TOUR.length) * 100;
  const last = !nextPage && i === steps.length - 1;
  const nextLabel = i < steps.length - 1 ? t.next : nextPage ? t.nextPage(t.pageNames[nextPage]) : t.finish;

  return (
    <>
      {box && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[60] rounded-xl border-2 border-accent transition-all duration-300"
          style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2, boxShadow: "0 0 0 9999px rgba(5,7,10,0.66)" }} />
      )}
      {!box && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-[#05070a]/60" />}

      <div ref={cardRef} role="dialog" aria-label={step.title} style={style}
        className="fixed z-[70] rounded-2xl border border-line-2 bg-surface p-4 shadow-2xl">
        {arrow && !mobile && (
          <span aria-hidden="true" className="absolute h-3 w-3 rotate-45 border-line-2 bg-surface"
            style={arrow === "up" ? { top: -7, left: arrowLeft - 6, borderTopWidth: 1, borderLeftWidth: 1 } : { bottom: -7, left: arrowLeft - 6, borderBottomWidth: 1, borderRightWidth: 1 }} />
        )}
        <div className="mb-3 flex items-center gap-3">
          <PaxFace talking={talking} size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t.pageNames[key]} · {t.step(i + 1, steps.length)}</p>
            <h2 className="text-base font-semibold leading-tight">{step.title}</h2>
          </div>
          <button onClick={() => setOn(false)} aria-label={t.skip} className="self-start rounded-md px-1.5 py-0.5 text-ink-2 hover:text-ink">✕</button>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{step.body}</p>
        {step.tryIt && (
          <p className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
            <span className="font-semibold text-accent">{t.tryLabel}:</span> {step.tryIt}
          </p>
        )}
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t.page(pageIdx + 1, TOUR.length)} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-muted">{t.page(pageIdx + 1, TOUR.length)}</span>
          <button onClick={() => setOn(false)} className="ml-auto text-xs text-ink-2 underline-offset-2 hover:text-ink hover:underline">{t.skip}</button>
          {(i > 0 || prevPage) && <button onClick={goBack} className="rounded-lg border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:text-ink">{t.back}</button>}
          <button ref={nextRef} onClick={goNext} className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-black hover:brightness-110">{last ? t.finish : nextLabel}</button>
        </div>
      </div>
    </>
  );
}
