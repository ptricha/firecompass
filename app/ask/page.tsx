"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import type { OracleAnswer } from "@/lib/oracle";
import OracleViz from "@/components/OracleViz";

const T = {
  en: {
    eyebrow: "Flame Oracle",
    title: "Ask anything about fire in space",
    lead: "Every answer comes with its evidence: real NASA experiments, the numbers behind them, and a clear mark where no data exists yet.",
    start: "Start with a question",
    cats: { lunar: "Moon base", materials: "Materials", flex: "Suppression", smoke: "Detection", gap: "Data gaps", incidents: "History" } as Record<string, string>,
    suggested: [
      ["lunar", "What happens to fire when ventilation is turned off in a lunar habitat?"],
      ["materials", "Is NASA's standard material flammability test conservative in microgravity?"],
      ["flex", "Which suppressants were tested and how did the flames end?"],
      ["smoke", "How is smoke different in microgravity and does it affect detectors?"],
      ["gap", "What fire data exists for the Moon or Mars?"],
      ["incidents", "Tell me about Apollo 1, Apollo 13 and Mir"],
    ] as [string, string][],
    placeholder: "Ask about oxygen, smoke, materials, the Moon…",
    aria: "Your question",
    ask: "Ask",
    steps: ["Searching 19 investigations", "Checking measured tests", "Writing the answer"],
    err: "Something went wrong. Please try again.",
    modeAi: "AI-composed from verified evidence",
    modeEv: "Answer built from verified evidence",
    conf: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
    facts: "Key numbers",
    evidence: "Evidence",
    measured: "Measured data",
    reported: "Reported result",
    context: "Context",
    deeper: "Go deeper",
    next: "Ask next",
    copy: "Copy with citations",
    copied: "Copied",
    source: "Source",
    you: "You",
  },
  es: {
    eyebrow: "Oráculo de la Llama",
    title: "Pregunta lo que quieras sobre el fuego en el espacio",
    lead: "Cada respuesta llega con su evidencia: experimentos reales de NASA, las cifras que hay detrás y una marca clara donde todavía no hay datos.",
    start: "Empieza con una pregunta",
    cats: { lunar: "Base lunar", materials: "Materiales", flex: "Supresión", smoke: "Detección", gap: "Lagunas", incidents: "Historia" } as Record<string, string>,
    suggested: [
      ["lunar", "¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?"],
      ["materials", "¿Es conservador el test estándar de inflamabilidad de materiales de NASA en microgravedad?"],
      ["flex", "¿Qué supresores se ensayaron y cómo terminaron las llamas?"],
      ["smoke", "¿Cómo es el humo en microgravedad y afecta a los detectores?"],
      ["gap", "¿Qué datos de fuego existen para la Luna o Marte?"],
      ["incidents", "Cuéntame lo de Apollo 1, Apollo 13 y Mir"],
    ] as [string, string][],
    placeholder: "Pregunta sobre oxígeno, humo, materiales, la Luna…",
    aria: "Tu pregunta",
    ask: "Preguntar",
    steps: ["Buscando en 19 investigaciones", "Comprobando ensayos medidos", "Redactando la respuesta"],
    err: "Algo salió mal. Inténtalo de nuevo.",
    modeAi: "Redactado por IA a partir de evidencia verificada",
    modeEv: "Respuesta construida con evidencia verificada",
    conf: { high: "Confianza alta", medium: "Confianza media", low: "Confianza baja" },
    facts: "Cifras clave",
    evidence: "Evidencia",
    measured: "Dato medido",
    reported: "Resultado reportado",
    context: "Contexto",
    deeper: "Profundiza",
    next: "Pregunta a continuación",
    copy: "Copiar con citas",
    copied: "Copiado",
    source: "Fuente",
    you: "Tú",
  },
};

const CAT_COLOR: Record<string, string> = {
  lunar: "var(--accent)",
  materials: "var(--a-prevention)",
  flex: "var(--a-suppression)",
  smoke: "var(--a-detection)",
  gap: "var(--a-fundamental)",
  incidents: "#e66767",
};

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => setR(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return r;
}

function useTyped(text: string, enabled: boolean) {
  const [n, setN] = useState(enabled ? 0 : text.length);
  useEffect(() => {
    if (!enabled) return setN(text.length);
    setN(0);
    const iv = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(iv);
          return x;
        }
        return x + 2;
      });
    }, 18);
    return () => clearInterval(iv);
  }, [text, enabled]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

function Thinking({ steps }: { steps: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 500);
    return () => clearInterval(iv);
  }, [steps.length]);
  return (
    <div className="card flex items-center gap-4 p-4" aria-live="polite">
      <span className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <span key={k} className="h-2 w-2 rounded-full bg-accent" style={{ animation: "think 1.2s ease-in-out infinite", animationDelay: `${k * 0.18}s` }} />
        ))}
      </span>
      <ul className="text-sm">
        {steps.map((s, k) => (
          <li key={s} className={k === i ? "text-ink" : k < i ? "text-muted line-through decoration-line-2" : "hidden"}>
            {k < i ? "✓ " : ""}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Meter({ level, why, label }: { level: "high" | "medium" | "low"; why: string; label: string }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  const color = level === "high" ? "var(--good)" : level === "medium" ? "var(--warn)" : "var(--crit)";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-2" title={why}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((k) => (
          <span key={k} className="h-3 w-1.5 rounded-sm" style={{ background: k <= n ? color : "var(--line-2)" }} />
        ))}
      </span>
      {label}
    </span>
  );
}

function AnswerCard({ a, onAsk }: { a: OracleAnswer; onAsk: (q: string) => void }) {
  const t = useT(T);
  const reduced = useReducedMotion();
  const { shown, done } = useTyped(a.headline, !reduced);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const txt = [a.headline, "", a.body, "", ...a.keyFacts.map((f) => `• ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ""}`), "", ...a.evidence.map((e) => `[${e.cite}] ${e.url ?? ""}`)].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked */
    }
  };
  const kindLabel = { measured: t.measured, reported: t.reported, context: t.context };
  const kindColor = { measured: "var(--a-suppression)", reported: "var(--a-prevention)", context: "var(--muted)" };

  return (
    <article className="space-y-4">
      <div className="card overflow-hidden p-5 sm:p-6" style={{ boxShadow: "0 30px 70px -50px var(--accent)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-2.5 py-1 text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            {a.mode === "ai" ? t.modeAi : t.modeEv}
          </span>
          <Meter level={a.confidence} why={a.confidenceWhy} label={t.conf[a.confidence]} />
        </div>
        <h2 className={`mt-4 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl ${done ? "" : "caret"}`}>{shown}</h2>
        <p className="rise mt-4 text-[15px] leading-relaxed text-ink-2" style={{ "--d": "250ms" } as React.CSSProperties}>{a.body}</p>
      </div>

      {a.keyFacts.length > 0 && (
        <div>
          <p className="eyebrow mb-2">{t.facts}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {a.keyFacts.map((f, i) => (
              <div key={f.label} className="card rise p-4" style={{ "--d": `${350 + i * 120}ms` } as React.CSSProperties}>
                <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--accent)" }}>{f.value}</p>
                <p className="mt-1 text-sm">{f.label}</p>
                {f.note && <p className="mt-0.5 text-xs text-muted">{f.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {a.viz !== "none" && (
        <div className="rise" style={{ "--d": "700ms" } as React.CSSProperties}>
          <OracleViz id={a.viz} />
        </div>
      )}

      {a.gap && (
        <div className="rise flex gap-3 rounded-xl border border-dashed p-4 text-sm" style={{ borderColor: "var(--warn)", "--d": "800ms" } as React.CSSProperties} role="note">
          <span aria-hidden="true" style={{ color: "var(--warn)" }}>◌</span>
          <p className="text-ink-2">{a.gap}</p>
        </div>
      )}

      {a.evidence.length > 0 && (
        <div>
          <p className="eyebrow mb-2">{t.evidence}</p>
          <ul className="grid gap-3 md:grid-cols-2">
            {a.evidence.map((e, i) => (
              <li key={e.cite + i} className="card rise p-4" style={{ "--d": `${850 + i * 100}ms`, borderLeft: `3px solid ${kindColor[e.kind]}` } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold">{e.title}</span>
                  <span style={{ color: kindColor[e.kind] }}>{kindLabel[e.kind]}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-2">{e.text}</p>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noreferrer" className="link mt-2 inline-block text-xs">↗ {t.source}: {e.cite}</a>
                ) : (
                  <p className="mt-2 text-xs text-muted">{e.cite}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rise flex flex-wrap items-center gap-2" style={{ "--d": "1100ms" } as React.CSSProperties}>
        {a.ctas.length > 0 && <span className="eyebrow mr-1">{t.deeper}</span>}
        {a.ctas.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-black hover:brightness-110">{c.label} →</Link>
        ))}
        <button onClick={copy} className="ml-auto rounded-lg border border-line-2 px-3 py-1.5 text-sm text-ink-2 hover:text-ink">{copied ? `✓ ${t.copied}` : t.copy}</button>
      </div>

      {a.followUps.length > 0 && (
        <div className="rise" style={{ "--d": "1250ms" } as React.CSSProperties}>
          <p className="eyebrow mb-2">{t.next}</p>
          <div className="flex flex-wrap gap-2">
            {a.followUps.map((q) => (
              <button key={q} onClick={() => onAsk(q)} className="rounded-full border border-line-2 px-3.5 py-1.5 text-left text-sm text-ink-2 transition-colors hover:border-accent hover:text-ink">{q}</button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

type Turn = { q: string; a?: OracleAnswer; err?: boolean };

export default function Ask() {
  const t = useT(T);
  const { lang } = useLang();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    setTurns((x) => [...x, { q: question }]);
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, lang }) });
      const a = (await res.json()) as OracleAnswer;
      setTurns((x) => x.map((tn, i) => (i === x.length - 1 ? (res.ok ? { ...tn, a } : { ...tn, err: true }) : tn)));
    } catch {
      setTurns((x) => x.map((tn, i) => (i === x.length - 1 ? { ...tn, err: true } : tn)));
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
    }
  }

  // deep link: /ask?q=your+question asks it right away
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) send(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-6 pt-10">
      <header className="flex flex-col items-center text-center">
        <div className="orb" aria-hidden="true" />
        <p className="eyebrow mt-8">{t.eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-ink-2">{t.lead}</p>
      </header>

      {turns.length === 0 && (
        <section className="mt-10" aria-label={t.start}>
          <p className="eyebrow mb-3 text-center">{t.start}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.suggested.map(([cat, text], i) => (
              <button
                key={text}
                onClick={() => send(text)}
                className="card rise group p-4 text-left transition-colors hover:bg-surface-2"
                style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: CAT_COLOR[cat] }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLOR[cat] }} aria-hidden="true" />
                  {t.cats[cat]}
                </span>
                <span className="mt-1.5 block text-[15px]">{text}</span>
                <span className="mt-2 block text-xs text-muted transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 space-y-10" aria-live="polite">
        {turns.map((tn, i) => (
          <section key={i} className="space-y-4">
            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm"><span className="sr-only">{t.you}: </span>{tn.q}</p>
            </div>
            {tn.a ? <AnswerCard a={tn.a} onAsk={send} /> : tn.err ? <p className="card p-4 text-sm text-ink-2">{t.err}</p> : <Thinking steps={t.steps} />}
          </section>
        ))}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
        className="sticky bottom-4 mt-8 flex gap-2 rounded-2xl border border-line-2 bg-bg/85 p-2 backdrop-blur"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          placeholder={t.placeholder}
          aria-label={t.aria}
          className="flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm placeholder:text-muted focus:outline-none"
        />
        <button disabled={busy || !q.trim()} className="rounded-xl bg-accent px-5 text-sm font-medium text-black disabled:opacity-40">
          {t.ask}
        </button>
      </form>
    </div>
  );
}
