"use client";

import { useState } from "react";
import ImmersiveScene, { type ImmersiveEnv } from "@/components/ImmersiveScene";

const ENVS: { id: ImmersiveEnv; name: string; gravity: string; air: string; note: string; model: string }[] = [
  {
    id: "earth", name: "Earth", gravity: "1 g", air: "21% O₂ · 14.7 psi",
    note: "The reference case. Buoyancy lifts hot gas, so flames take the familiar yellow teardrop shape and convection keeps feeding them fresh air.",
    model: "Globe: NASA-derived Earth textures (three.js examples)",
  },
  {
    id: "iss", name: "ISS", gravity: "≈0 g", air: "21% O₂ · 14.7 psi",
    note: "No buoyancy, no convection: flames become spherical and blue, and burn by pure diffusion. Smoke does not rise, which changes how detectors must work.",
    model: "Model: International Space Station (ISS) (D) (IGOAL), NASA 3D Resources (mesh simplified and textures reduced for the web)",
  },
  {
    id: "moon", name: "Moon", gravity: "0.16 g", air: "≈30% O₂ · ≈10.2 psi (habitat)",
    note: "Partial gravity. No experimental combustion data exists for it yet; LUCI and FM2 are the missions meant to measure it. The terrain here is procedural, not a survey.",
    model: "Model: Apollo Lunar Module, NASA 3D Resources",
  },
  {
    id: "mars", name: "Mars", gravity: "0.38 g", air: "Thin CO₂ outside; ≈0.13% O₂ ambient",
    note: "Also partial gravity, with the same data gap as the Moon. Crews would live in pressurized habitats and rovers. The terrain here is procedural, not a survey.",
    model: "Model: Mars 2020 Perseverance Rover, NASA 3D Resources",
  },
  {
    id: "suit", name: "Spacesuit", gravity: "n/a", air: "EVA suits: 100% O₂ · 4.3 psi",
    note: "A suit is the last layer of protection, and what it is made of matters. In a pure-oxygen atmosphere materials become far more flammable, the lesson of Apollo 1 (1967). The air figure is the project's reference value for EVA suits like the EMU.",
    model: "Model: Extravehicular Mobility Unit (EMU) spacesuit, NASA 3D Resources",
  },
];

export default function ImmersivePage() {
  const [env, setEnv] = useState<ImmersiveEnv>("earth");
  const cur = ENVS.find((e) => e.id === env)!;
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
      <p className="eyebrow">Immersive</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Five places where fire behaves differently</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">
        Explore the environments the combustion data was collected for, or is meant to inform. Atmosphere and gravity values are reference figures; the 3D scenes are visualizations, not measurements.
      </p>

      <div role="tablist" aria-label="Environment" className="mt-6 flex flex-wrap gap-2">
        {ENVS.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === env}
            onClick={() => setEnv(e.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${e.id === env ? "border-line-2 bg-surface-2 text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <ImmersiveScene env={env} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4"><div className="text-xs text-muted">Gravity</div><div className="mt-1 text-xl font-semibold">{cur.gravity}</div></div>
        <div className="card p-4"><div className="text-xs text-muted">Atmosphere</div><div className="mt-1 text-xl font-semibold">{cur.air}</div></div>
        <div className="card p-4 sm:col-span-2"><div className="text-xs text-muted">Why it matters for fire safety</div><p className="mt-1 text-sm text-ink-2">{cur.note}</p></div>
      </div>
      <p className="mt-3 text-xs text-muted">{cur.model} · <a className="underline" href="/references">All references</a></p>
    </main>
  );
}
