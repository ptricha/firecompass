"use client";

import { useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

interface Msg {
  role: "user" | "assistant";
  text: string;
  citations?: { label: string; url: string | null }[];
  gap?: string | null;
  mode?: "ai" | "retrieval";
}

const T = {
  en: {
    eyebrow: "Ask the data",
    title: "Ask NASA's fire research a question",
    intro: "Answers come only from the verified FireCompass data set and always cite the investigation, PSI ID and DOI. If there is no data, it says so.",
    suggested: [
      "What happens to fire when ventilation is turned off in a lunar habitat atmosphere?",
      "Is NASA's standard material flammability test conservative in microgravity?",
      "How is smoke different in microgravity and does it affect detectors?",
      "Which suppressants were tested and how well do they work?",
      "What data exists for fire on the Moon or Mars?",
    ],
    searching: "Searching the data…",
    placeholder: "e.g. What did BASS find about material flammability?",
    aria: "Your question",
    ask: "Ask",
    ai: "AI-assisted answer, grounded in the retrieved passages.",
    ret: "Showing the most relevant verified passages.",
    err: "Something went wrong. Please try again.",
    net: "Network error. Please try again.",
  },
  es: {
    eyebrow: "Pregunta a los datos",
    title: "Hazle una pregunta a la investigación de NASA sobre el fuego",
    intro: "Las respuestas salen solo del conjunto de datos verificado de FireCompass y siempre citan la investigación, el ID de PSI y el DOI. Si no hay datos, lo dice.",
    suggested: [
      "¿Qué le pasa al fuego cuando se apaga la ventilación en la atmósfera de un hábitat lunar?",
      "¿Es conservador el test estándar de inflamabilidad de materiales de NASA en microgravedad?",
      "¿Cómo es el humo en microgravedad y afecta a los detectores?",
      "¿Qué supresores se ensayaron y qué tal funcionan?",
      "¿Qué datos existen sobre fuego en la Luna o en Marte?",
    ],
    searching: "Buscando en los datos…",
    placeholder: "p. ej. ¿Qué encontró BASS sobre la inflamabilidad de materiales?",
    aria: "Tu pregunta",
    ask: "Preguntar",
    ai: "Respuesta asistida por IA, basada en los pasajes recuperados.",
    ret: "Mostrando los pasajes verificados más relevantes.",
    err: "Algo salió mal. Inténtalo de nuevo.",
    net: "Error de red. Inténtalo de nuevo.",
  },
};

export default function Ask() {
  const t = useT(T);
  const { lang } = useLang();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang }),
      });
      const j = await res.json();
      setMsgs((m) => [
        ...m,
        res.ok
          ? { role: "assistant", text: j.answer, citations: j.citations, gap: j.gap, mode: j.mode }
          : { role: "assistant", text: t.err },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: t.net }]);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 text-ink-2">{t.intro}</p>

      {msgs.length === 0 && (
        <div className="mt-6 grid gap-2">
          {t.suggested.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="card p-3 text-left text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-4" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={`max-w-[92%] rounded-2xl p-4 text-sm ${m.role === "user" ? "bg-accent/15" : "card"}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.gap && <p className="mt-3 rounded-lg border border-dashed border-line-2 p-2 text-xs text-ink-2">{m.gap}</p>}
              {m.citations && m.citations.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {m.citations.map((c) => (
                    <li key={c.label}>
                      {c.url ? (
                        <a className="link" href={c.url} target="_blank" rel="noreferrer">
                          {c.label} ↗
                        </a>
                      ) : (
                        <span className="text-muted">{c.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {m.mode && <p className="mt-2 text-[11px] text-muted">{m.mode === "ai" ? t.ai : t.ret}</p>}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted">{t.searching}</p>}
        <div ref={end} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
        className="sticky bottom-4 mt-6 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          placeholder={t.placeholder}
          aria-label={t.aria}
          className="flex-1 rounded-xl border border-line-2 bg-surface px-4 py-3 text-sm placeholder:text-muted"
        />
        <button disabled={busy || !q.trim()} className="rounded-xl bg-accent px-5 font-medium text-black disabled:opacity-40">
          {t.ask}
        </button>
      </form>
    </div>
  );
}
