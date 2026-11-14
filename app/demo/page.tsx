"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PaxFace from "@/components/PaxFace";

/** 30-second film starring Pax. English only (judging rules). Numbers come from the verified PSI data used across JaPax. */
const DURATION = 30;
const SCENES = [
  { from: 0, to: 6, line: "In 1967, a cabin fire in pure oxygen took three Apollo 1 astronauts. Fire is the one thing a crew cannot outrun." },
  { from: 6, to: 12, line: "In space, flames change: no gravity, no convection. They turn round, blue and strange, and nobody could predict them." },
  { from: 12, to: 19, line: "So NASA burned things on the space station. I read 20 investigations, up to 274 tests in a single one." },
  { from: 19, to: 25, line: "Moon bases will have more oxygen and lunar gravity. But there is no partial-gravity fire data yet. That gap is the real risk." },
  { from: 25, to: 30, line: "JaPax turns it all into clear answers. Simulate it, explore it, or just ask me!" },
] as const;

function Flame({ round }: { round: boolean }) {
  return round ? (
    <div className="h-24 w-24 rounded-full" style={{ background: "radial-gradient(circle at 40% 35%, #cfe6ff, #5aa3ff 55%, #1d4f9e)", boxShadow: "0 0 60px 20px rgba(90,163,255,.45)" }} />
  ) : (
    <div className="h-32 w-20 pax-flicker" style={{ background: "radial-gradient(ellipse at 50% 85%, #fff2c2, #ff8a4c 45%, #d03b3b 80%, transparent 100%)", borderRadius: "50% 50% 50% 50% / 70% 70% 30% 30%", boxShadow: "0 0 60px 18px rgba(255,138,76,.45)" }} />
  );
}

function Visual({ i, local }: { i: number; local: number }) {
  if (i === 0)
    return (
      <div className="flex flex-col items-center gap-4">
        <Flame round={false} />
        <p className="text-5xl font-bold text-accent">100% O₂</p>
        <p className="text-ink-2">Apollo 1 · 1967</p>
      </div>
    );
  if (i === 1)
    return (
      <div className="flex items-end gap-16">
        <div className="flex flex-col items-center gap-3"><Flame round={false} /><p className="text-sm text-ink-2">Earth · 1 g</p></div>
        <div className="flex flex-col items-center gap-3"><Flame round /><p className="text-sm text-ink-2">Space station · 0 g</p></div>
      </div>
    );
  if (i === 2) {
    const k = Math.min(1, local * 1.6);
    return (
      <div className="flex gap-10 text-center">
        {[["20", "NASA investigations"], ["274", "FLEX extinction tests"], ["129", "BASS-II tests on the ISS"]].map(([n, l]) => (
          <div key={l}><p className="text-6xl font-bold text-accent">{Math.round(Number(n) * k)}</p><p className="mt-1 text-sm text-ink-2">{l}</p></div>
        ))}
      </div>
    );
  }
  if (i === 3)
    return (
      <div className="flex items-center gap-8 text-center">
        {[["Earth", "1 g", true], ["Moon", "0.16 g", false], ["Mars", "0.38 g", false], ["ISS", "0 g", true]].map(([n, g, has]) => (
          <div key={String(n)} className="flex flex-col items-center gap-2">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl ${has ? "border-flame bg-flame/20" : "border-dashed border-crit text-crit"}`}>{has ? "✓" : "?"}</div>
            <p className="text-sm font-semibold">{String(n)}</p>
            <p className="text-xs text-ink-2">{String(g)} · {has ? "data" : "no data"}</p>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-6xl font-bold tracking-tight">Ja<span className="text-accent">Pax</span></p>
      <p className="text-ink-2">Fire in space, explained with NASA data</p>
      <p className="rounded-full bg-accent/25 px-4 py-1 font-mono text-sm">japax.vercel.app</p>
    </div>
  );
}

export default function DemoPage() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setT((v) => {
        const n = v + dt;
        if (n >= DURATION) {
          setPlaying(false);
          return DURATION;
        }
        return n;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const found = SCENES.findIndex((s) => t < s.to);
  const sIdx = found === -1 ? SCENES.length - 1 : found;
  const scene = SCENES[sIdx];
  const local = Math.min(1, Math.max(0, (t - scene.from) / (scene.to - scene.from)));
  const finished = t >= DURATION;
  const talking = playing && local < 0.9;

  const toggle = () => {
    if (finished) {
      setT(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Meet Pax · the 30-second film</h1>
      <p className="mb-4 text-sm text-ink-2">Pax, the JaPax mentor, explains the project. Subtitles are always on.</p>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line-2" style={{ background: "radial-gradient(ellipse at 50% 120%, #1a1f2c, #090b0f 70%)" }}>
        <div key={sIdx} className="pax-scene absolute inset-0 flex items-center justify-center pb-24"><Visual i={sIdx} local={local} /></div>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <PaxFace talking={talking} size={84} />
          <p aria-live="polite" className="mb-2 flex-1 rounded-2xl rounded-bl-sm border border-line-2 bg-surface/90 px-4 py-3 text-sm leading-snug sm:text-base">{playing || t > 0 ? scene.line : "Press play and I'll tell you why fire in space matters."}</p>
        </div>

        {!playing && t === 0 && (
          <button onClick={toggle} className="absolute inset-0 flex items-center justify-center bg-black/40 text-6xl backdrop-blur-[1px]" aria-label="Play the film">▶</button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button onClick={toggle} className="rounded-md bg-accent/30 px-4 py-1.5 text-sm font-semibold hover:bg-accent/45">{playing ? "Pause" : finished ? "Replay" : "Play"}</button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${(t / DURATION) * 100}%` }} /></div>
        <span className="font-mono text-xs text-ink-2">{Math.floor(t)}s / {DURATION}s</span>
      </div>
      <p className="mt-4 text-sm text-ink-2">Ready to try it? <Link href="/simulator" className="text-accent underline">Open the simulator</Link> or <Link href="/ask" className="text-accent underline">ask the AI</Link>.</p>
    </div>
  );
}
