"use client";

import { useEffect, useState } from "react";
import { useGuide } from "@/lib/guide";
import { useT } from "@/lib/i18n";
import PaxFace from "@/components/PaxFace";
import { openAsk } from "@/components/AskWindow";

const NAME = "Pax";
const IDLE_MS = 60_000;

const T = {
  en: {
    hello: `Hi, I am ${NAME}. I can explain anything on this site, or guide you through it step by step.`,
    open: `Open ${NAME}, the JaPax mentor`,
    close: "Close",
    ask: "Ask Pax a question",
    askSub: "Plain-language answers from verified NASA data",
    tour: "Start the guided tour",
    tourSub: "New to the topic? I will point at each part of the page",
    stop: "Stop the tour",
    sleeping: "Pax is asleep. Click to wake Pax up",
    bubbleAria: "What Pax can do",
    bubbleHi: "Hi, I'm Pax, your guide!",
    bubbleLead: "I can help you:",
    svcAsk: "Ask me anything",
    svcTour: "Take a guided tour",
  },
  es: {
    hello: `Hola, soy ${NAME}. Puedo explicarte cualquier cosa de esta web o guiarte paso a paso.`,
    open: `Abrir a ${NAME}, el mentor de JaPax`,
    close: "Cerrar",
    ask: "Hacer una pregunta a Pax",
    askSub: "Respuestas claras con datos verificados de la NASA",
    tour: "Empezar el recorrido guiado",
    tourSub: "¿Nuevo en el tema? Te señalo cada parte de la página",
    stop: "Terminar el recorrido",
    sleeping: "Pax está dormido. Pulsa para despertarlo",
    bubbleAria: "Lo que Pax puede hacer",
    bubbleHi: "¡Hola, soy Pax, tu guía!",
    bubbleLead: "Puedo ayudarte a:",
    svcAsk: "Preguntarme lo que sea",
    svcTour: "Hacer un recorrido guiado",
  },
};

/** Reveals `text` gradually; the mouth moves while it runs. */
function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!text) {
      setN(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v + 2 >= text.length) clearInterval(id);
        return Math.min(v + 2, text.length);
      });
    }, 22);
    return () => clearInterval(id);
  }, [text]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export default function Mentor() {
  const t = useT(T);
  const { on, setOn } = useGuide();
  const [open, setOpen] = useState(false);
  const [asleep, setAsleep] = useState(false);
  const [tick, setTick] = useState(0);

  // No interaction with Pax for 1 minute (menu closed, tour off): Pax falls asleep.
  useEffect(() => {
    if (asleep || open || on) return;
    const id = setTimeout(() => setAsleep(true), IDLE_MS);
    return () => clearTimeout(id);
  }, [asleep, open, on, tick]);
  const wake = () => {
    setAsleep(false);
    setTick((x) => x + 1);
  };

  const speech = open ? t.hello : "";
  const { shown, done } = useTyped(speech);
  const talking = !!speech && !done;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const svc = "block w-full rounded-lg border border-line-2 px-2.5 py-1 text-left text-xs transition-colors hover:bg-surface-2";
  const item = "block w-full rounded-xl border border-line-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2";

  const size = open ? 80 : asleep ? 88 : 112;
  const tailH = Math.round(size * 0.18 + 9);
  const bubble = "pax-pop relative max-w-[calc(100vw-2rem)] rounded-2xl border border-accent/40 bg-surface shadow-2xl";
  // tail: the speech bubble hangs from Pax's head
  const tail = (
    <svg aria-hidden="true" className="pointer-events-none absolute" style={{ right: size / 2 + 4 - 11, top: "calc(100% - 1px)", width: 22, height: tailH }} viewBox={`0 0 22 ${tailH}`}>
      <path d={`M0 0 L11 ${tailH} L22 0`} style={{ fill: "var(--surface)" }} stroke="rgba(255,138,76,0.4)" strokeWidth="1" />
    </svg>
  );

  return (
    <div onPointerEnter={wake} onPointerDown={wake} onFocus={wake} className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div>
        {open && (
          <section role="dialog" aria-label={NAME} className={`${bubble} w-[18rem] p-3`}>
            {tail}
            <div className="flex items-start gap-2">
              <p className="min-h-[2.5rem] flex-1 text-sm leading-relaxed" aria-live="polite">{shown}</p>
              <button onClick={() => setOpen(false)} aria-label={t.close} className="rounded-md px-1.5 py-0.5 text-ink-2 hover:text-ink">✕</button>
            </div>
            <div className="mt-2 space-y-2">
              <button onClick={() => { setOpen(false); openAsk(); }} className={`${item} border-accent/40 bg-accent/10`}>
                <span className="block text-sm font-semibold">{t.ask}</span>
                <span className="block text-xs text-ink-2">{t.askSub}</span>
              </button>
              <button onClick={() => { setOpen(false); setOn(!on); }} className={item}>
                <span className="block text-sm font-semibold">{on ? t.stop : t.tour}</span>
                {!on && <span className="block text-xs text-ink-2">{t.tourSub}</span>}
              </button>
            </div>
          </section>
        )}

        {!open && asleep && (
          <button onClick={wake} aria-label={t.sleeping} className={`${bubble} flex items-end gap-0.5 px-4 py-2 font-semibold text-accent`}>
            {tail}
            <span className="pax-z text-base" style={{ animationDelay: "0s" }}>z</span>
            <span className="pax-z text-xl" style={{ animationDelay: "0.4s" }}>z</span>
            <span className="pax-z text-2xl" style={{ animationDelay: "0.8s" }}>Z</span>
          </button>
        )}

        {!open && !asleep && (
          <section aria-label={t.bubbleAria} className={`${bubble} w-[13.5rem] p-3`}>
            {tail}
            <p className="text-sm font-semibold leading-snug">{t.bubbleHi}</p>
            <p className="mt-0.5 text-xs text-ink-2">{t.bubbleLead}</p>
            <div className="mt-2 space-y-1.5">
              <button onClick={() => openAsk()} className={`${svc} border-accent/50 bg-accent/15`}>{t.svcAsk}</button>
              <button onClick={() => setOn(!on)} className={svc}>{on ? t.stop : t.svcTour}</button>
            </div>
          </section>
        )}
      </div>

      <div className="relative">
        <button data-pax onClick={() => setOpen((v) => !v)} aria-label={t.open} aria-expanded={open} className="block rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent">
          <PaxFace talking={talking} sleeping={asleep && !open} size={size} />
        </button>
      </div>
    </div>
  );
}
