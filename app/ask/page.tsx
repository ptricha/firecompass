"use client";

import { useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  text: string;
  citations?: { label: string; url: string | null }[];
  gap?: string | null;
  mode?: "ai" | "retrieval";
}

const SUGGESTED = [
  "What happens to fire when ventilation is turned off in a lunar habitat atmosphere?",
  "Is NASA's standard material flammability test conservative in microgravity?",
  "How is smoke different in microgravity and does it affect detectors?",
  "Which suppressants were tested and how well do they work?",
  "What data exists for fire on the Moon or Mars?",
];

export default function Ask() {
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
        body: JSON.stringify({ question }),
      });
      const j = await res.json();
      setMsgs((m) => [
        ...m,
        res.ok
          ? { role: "assistant", text: j.answer, citations: j.citations, gap: j.gap, mode: j.mode }
          : { role: "assistant", text: "Something went wrong. Please try again." },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <p className="eyebrow">Ask the data</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Ask NASA&apos;s fire research a question</h1>
      <p className="mt-3 text-ink-2">
        Answers come only from the verified FireCompass data set and always cite the investigation, PSI ID and DOI. If
        there is no data, it says so.
      </p>

      {msgs.length === 0 && (
        <div className="mt-6 grid gap-2">
          {SUGGESTED.map((s) => (
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
              {m.mode && (
                <p className="mt-2 text-[11px] text-muted">
                  {m.mode === "ai" ? "AI-assisted answer, grounded in the retrieved passages." : "Showing the most relevant verified passages."}
                </p>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted">Searching the data…</p>}
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
          placeholder="e.g. What did BASS find about material flammability?"
          aria-label="Your question"
          className="flex-1 rounded-xl border border-line-2 bg-surface px-4 py-3 text-sm placeholder:text-muted"
        />
        <button disabled={busy || !q.trim()} className="rounded-xl bg-accent px-5 font-medium text-black disabled:opacity-40">
          Ask
        </button>
      </form>
    </div>
  );
}
