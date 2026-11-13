"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLang, useT } from "@/lib/i18n";
import { CAT_COLOR, CAT_LABEL, ERAS, TIMELINE, type Cat, type TimelineEvent } from "@/lib/timeline";

const T = {
  en: {
    eyebrow: "History",
    title: "Six decades of fire in space",
    lead: "From a launch-pad tragedy to an open archive of flame experiments: the moments that taught us how fire behaves without gravity, and why the Moon needs new answers.",
    all: "All",
    filter: "Filter by type",
    decades: "Milestones by decade",
    source: "Source",
    shown: "milestones",
    scroll: "Scroll to travel through time",
    end: "The next chapter is still unwritten: the first fire data from lunar gravity.",
    endCta: "See what we know and what we don't",
    empty: "No milestones match this filter.",
    onlyOne: "Showing only",
  },
  es: {
    eyebrow: "Historia",
    title: "Seis décadas de fuego en el espacio",
    lead: "De una tragedia en la plataforma de lanzamiento a un archivo abierto de experimentos de llama: los momentos que nos enseñaron cómo se comporta el fuego sin gravedad y por qué la Luna necesita respuestas nuevas.",
    all: "Todo",
    filter: "Filtrar por tipo",
    decades: "Hitos por década",
    source: "Fuente",
    shown: "hitos",
    scroll: "Desplázate para viajar en el tiempo",
    end: "El siguiente capítulo aún no está escrito: los primeros datos de fuego en gravedad lunar.",
    endCta: "Mira qué sabemos y qué no",
    empty: "Ningún hito coincide con este filtro.",
    onlyOne: "Mostrando solo",
  },
};

const ALL_CATS = Object.keys(CAT_COLOR) as Cat[];

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${on ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function Card({ ev, lang, left }: { ev: TimelineEvent; lang: "en" | "es"; left: boolean }) {
  const t = useT(T);
  const c = CAT_COLOR[ev.cat];
  const tx = ev[lang];
  return (
    <article
      className={`card relative overflow-hidden p-5 ${ev.cat === "next" ? "border-dashed" : ""}`}
      style={{ borderLeft: `3px solid ${c}`, boxShadow: `0 0 0 1px ${c}14, 0 18px 40px -26px ${c}66` }}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium" style={{ background: `${c}22`, color: c }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} aria-hidden="true" />
          {CAT_LABEL[ev.cat][lang]}
        </span>
        <span className="text-muted md:hidden">{ev.when[lang]}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug">{tx.title}</h3>
      <p className="mt-2 text-sm text-ink-2">{tx.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a href={ev.src.url} target="_blank" rel="noreferrer" title={ev.src.label} className="text-muted hover:text-ink">
          ↗ {t.source}: {ev.src.label}
        </a>
        {ev.link && (
          <Link href={ev.link.href} className="link font-medium">
            {ev.link[lang]} →
          </Link>
        )}
      </div>
      <span className={`pointer-events-none absolute -bottom-6 ${left ? "-right-4" : "-left-4"} h-20 w-20 rounded-full opacity-20 blur-2xl`} style={{ background: c }} aria-hidden="true" />
    </article>
  );
}

export default function History() {
  const t = useT(T);
  const { lang } = useLang();
  const [active, setActive] = useState<Set<Cat>>(new Set(ALL_CATS));
  const wrap = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);

  const events = useMemo(
    () =>
      TIMELINE.filter((e) => active.has(e.cat)).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)),
    [active],
  );

  // scroll progress along the timeline spine
  useEffect(() => {
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = (window.innerHeight * 0.6 - r.top) / r.height;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [events]);

  const decades = useMemo(() => {
    const d: Record<number, Partial<Record<Cat, number>>> = {};
    for (const e of TIMELINE) {
      if (e.year == null) continue;
      const k = Math.floor(e.year / 10) * 10;
      d[k] = d[k] ?? {};
      d[k][e.cat] = (d[k][e.cat] ?? 0) + 1;
    }
    return d;
  }, []);
  const maxDec = Math.max(...Object.values(decades).map((o) => Object.values(o).reduce((s, n) => s + (n ?? 0), 0)));

  const toggle = (c: Cat) =>
    setActive((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n.size === 0 ? new Set(ALL_CATS) : n;
    });

  // era of each event
  const eraOf = (e: TimelineEvent) => ERAS.find((er) => (e.year ?? 9999) >= er.from && (e.year ?? 9999) <= er.to)!;
  let lastEra = "";
  let side = 0;

  return (
    <div className="pb-6">
      {/* hero */}
      <section className="mx-auto max-w-6xl px-4 pt-14">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {t.title.split(" ").slice(0, -4).join(" ")} <span style={{ color: "var(--accent)" }}>{t.title.split(" ").slice(-4).join(" ")}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">{t.lead}</p>

        {/* decades */}
        <div className="mt-10">
          <p className="eyebrow">{t.decades}</p>
          <div className="mt-3 flex items-end gap-2 sm:gap-4" role="img" aria-label={t.decades}>
            {Object.keys(decades)
              .map(Number)
              .sort((a, b) => a - b)
              .map((d) => {
                const cats = decades[d];
                const total = Object.values(cats).reduce((s, n) => s + (n ?? 0), 0);
                return (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full max-w-[3.5rem] flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(total / maxDec) * 96}px` }} title={`${d}s: ${total}`}>
                      {ALL_CATS.filter((c) => cats[c]).map((c) => (
                        <div key={c} style={{ flex: cats[c], background: CAT_COLOR[c], opacity: active.has(c) ? 1 : 0.18, marginTop: 1 }} />
                      ))}
                    </div>
                    <span className="text-xs tabular-nums text-muted">{d}s</span>
                    <span className="text-xs font-medium tabular-nums">{total}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* filters */}
        <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label={t.filter}>
          <button
            onClick={() => setActive(new Set(ALL_CATS))}
            aria-pressed={active.size === ALL_CATS.length}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active.size === ALL_CATS.length ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}
          >
            {t.all}
          </button>
          {ALL_CATS.map((c) => (
            <button
              key={c}
              onClick={() => toggle(c)}
              aria-pressed={active.has(c)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active.has(c) ? "text-ink" : "text-muted opacity-60"}`}
              style={{ borderColor: active.has(c) ? CAT_COLOR[c] : "var(--line-2)", background: active.has(c) ? `${CAT_COLOR[c]}1f` : "transparent" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[c] }} aria-hidden="true" />
              {CAT_LABEL[c][lang]}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted" aria-live="polite">
            {events.length} {t.shown}
          </span>
        </div>
        <p className="mt-10 flex items-center gap-2 text-sm text-muted">
          <span className="inline-block animate-bounce" aria-hidden="true">↓</span> {t.scroll}
        </p>
      </section>

      {/* timeline */}
      <section className="mx-auto mt-8 max-w-6xl px-4">
        {events.length === 0 ? (
          <p className="card p-6 text-ink-2">{t.empty}</p>
        ) : (
          <ol ref={wrap} className="relative">
            {/* spine */}
            <div className="absolute bottom-0 left-5 top-0 w-px bg-line-2 md:left-1/2" aria-hidden="true">
              <div className="w-px" style={{ height: `${progress * 100}%`, background: "linear-gradient(to bottom, var(--flame), var(--accent))", boxShadow: "0 0 12px var(--accent)" }} />
              <div className="absolute -left-[5px] h-[11px] w-[11px] rounded-full" style={{ top: `${progress * 100}%`, background: "var(--accent)", boxShadow: "0 0 14px 3px var(--accent)" }} />
            </div>

            {events.map((ev) => {
              const era = eraOf(ev);
              const newEra = era.id !== lastEra;
              lastEra = era.id;
              const left = side++ % 2 === 0;
              const c = CAT_COLOR[ev.cat];
              const yearLabel = ev.year == null ? (lang === "es" ? "Próximamente" : "Next") : ev.year === 2026 && ev.cat === "incident" ? (lang === "es" ? "Reciente" : "Recent") : String(ev.year);
              return (
                <li key={ev.id} id={ev.id} className="relative scroll-mt-20">
                  {newEra && (
                    <Reveal className="relative z-10 py-8 text-center md:py-12">
                      <div className="mx-auto max-w-2xl rounded-2xl border border-line-2 bg-surface px-6 py-5 pl-14 text-left md:pl-6 md:text-center" style={{ boxShadow: "0 24px 60px -40px var(--accent)" }}>
                        <p className="eyebrow">{era.to === 9999 ? `${era.from} →` : `${era.from}–${era.to}`}</p>
                        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{era[lang].title}</h2>
                        <p className="mt-1 text-sm text-ink-2">{era[lang].text}</p>
                      </div>
                    </Reveal>
                  )}

                  <div className="relative py-3 md:py-4">
                    {/* node */}
                    <span
                      className="absolute left-5 top-8 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-bg md:left-1/2"
                      style={{ background: c, boxShadow: `0 0 0 4px ${c}33, 0 0 18px ${c}` }}
                      aria-hidden="true"
                    />
                    {/* big year on the empty side (desktop) */}
                    <div className={`pointer-events-none absolute top-4 hidden w-[calc(50%-2.5rem)] md:block ${left ? "left-[calc(50%+2.5rem)] text-left" : "right-[calc(50%+2.5rem)] text-right"}`}>
                      <p className="text-5xl font-semibold tabular-nums tracking-tight" style={{ color: c, opacity: 0.9 }}>{yearLabel}</p>
                      <p className="mt-1 text-sm text-muted">{ev.when[lang]}</p>
                    </div>
                    <Reveal className={`ml-12 md:ml-0 md:w-[calc(50%-2.5rem)] ${left ? "md:mr-auto" : "md:ml-auto"}`}>
                      <Card ev={ev} lang={lang} left={left} />
                    </Reveal>
                  </div>
                </li>
              );
            })}

            {/* end */}
            <li className="relative pb-6 pt-10 text-center">
              <Reveal>
                <p className="mx-auto max-w-xl pl-10 text-lg text-ink-2 md:pl-0">{t.end}</p>
                <Link href="/simulator" className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
                  {t.endCta}
                </Link>
              </Reveal>
            </li>
          </ol>
        )}
      </section>
    </div>
  );
}
