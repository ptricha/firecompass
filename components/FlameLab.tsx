"use client";

import { useEffect, useMemo, useState } from "react";
import FlameView from "@/components/FlameView";
import EnvironmentStage from "@/components/EnvironmentStage";
import type { ImmersiveEnv } from "@/components/ImmersiveScene";
import { ALL_LAYERS, type EnvId, type Fuel, type LabelText, type Layers, type SimParams, type SimStats } from "@/lib/flameEngine";
import { flexVerdict } from "@/lib/flexVerdict";
import { useData, useLang, useT } from "@/lib/i18n";
import { Pending } from "@/components/ui";

const T = {
  en: {
    eyebrow: "Live flame lab",
    title: "Watch a flame burn at the molecular level",
    intro: "Choose an environment or set your own conditions. The molecules you see are counted from the gas composition and pressure you set; gravity decides whether hot gases rise. Switch layers on and off to look only at the flame, only at the molecules, or at any single species.",
    presets: "Environment",
    env: { earth: "Earth", iss: "ISS", moon: "Lunar base", suit: "Spacesuit", custom: "Custom" } as Record<string, string>,
    play: "Play",
    pause: "Pause",
    reignite: "Re-ignite",
    speed: "Speed",
    controls: "Conditions",
    o2: "Oxygen (O₂)",
    pressure: "Pressure",
    gravity: "Gravity",
    flow: "Forced airflow",
    co2: "CO₂ suppressant",
    he: "He suppressant",
    fuel: "Fuel droplet",
    n2: "Nitrogen (N₂), the remainder",
    methanol: "Methanol",
    heptane: "Heptane",
    outRange: "outside the measured FLEX range",
    layers: "Layers",
    layersHint: "Remove what you do not want to see.",
    all: "All",
    onlyMol: "Only molecules",
    onlyFlame: "Only flame",
    none: "None",
    L: {
      flame: ["Flame glow", "The hot, luminous reaction zone (illustrative)."],
      o2: ["Oxygen, O₂", "The oxidizer. Its count follows your O₂ %."],
      n2: ["Nitrogen, N₂", "Inert diluent that makes up most of the remaining air."],
      co2: ["CO₂ suppressant", "Added to dilute the flame (tested in FLEX)."],
      he: ["Helium suppressant", "Light atoms: about 2.6 times faster than N₂ at the same temperature."],
      fuel: ["Fuel vapor", "Evaporates from the droplet (methanol or heptane, as in FLEX)."],
      products: ["Products: H₂O, CO₂", "Formed where oxygen meets fuel. They rise only if gravity is on."],
      soot: ["Soot", "Carbon particles. Reported hypothesis: more soot in microgravity (PSI-60)."],
      flow: ["Flow arrows", "Your forced airflow and, with gravity, buoyant convection."],
      labels: ["Callouts", "Names the main parts of the flame."],
    } as Record<string, [string, string]>,
    status: { igniting: "Igniting", burning: "Burning", extinguishing: "Going out", out: "Extinguished" },
    regime: {
      diffusion: "Diffusion flame. With no buoyancy, oxygen reaches the flame only by diffusion and the flame is a ghostly blue sphere.",
      buoyant: "Buoyancy-driven flame. Hot gases rise and pull fresh air in; the flame is a flickering teardrop.",
      transition: "Partial gravity: NO experimental data exists. This shape is an illustrative blend of the 0 g and 1 g behaviors.",
    },
    rate: "reactions/s",
    molecules: "Molecules on screen",
    cnt: { o2: "O₂", n2: "N₂", co2: "CO₂", he: "He", fuel: "fuel", products: "products", soot: "soot" } as Record<string, string>,
    verdictTitle: "What the nearest measured tests say",
    verdictIn: (k: number) => `Of the 5 closest FLEX tests, ${k} ended in extinction. The animation follows the majority outcome (${k >= 3 ? "the flame goes out and is re-lit" : "the flame keeps burning"}). This describes nearby measurements; it is not a prediction.`,
    verdictOut: "Outside the measured range: JaPax does not extrapolate, so the flame keeps burning as a neutral illustration with no verdict.",
    issue: { o2: "O₂", p: "pressure", co2: "CO₂", he: "He" } as Record<string, string>,
    measured: "measured",
    thTest: "Test",
    thOut: "Outcome",
    outcome: { Extinction: "Extinction", Completion: "Completion", Disruption: "Disruption" } as Record<string, string>,
    honest: "Data vs. illustration",
    honestBody: [
      ["From your data:", "molecule counts follow the gas composition; density follows pressure, and diffusion slows as pressure rises; light gases move faster; products rise only with gravity; and the fate of the flame comes from the nearest measured FLEX tests."],
      ["Illustrative:", "flame size, color, reaction speed and the amount of soot are qualitative; no experimental data exists between 0 g and 1 g."],
    ],
    aria: "Animated particle simulation of a burning droplet showing individual molecules and the flame, driven by the conditions you set",
    labels: { zone: "Reaction zone", oxygenIn: "O₂ diffuses in", fuelVapor: "Fuel vapor", products: "Hot products", plume: "Buoyant plume", sphere: "No buoyancy: spherical", droplet: "Fuel droplet", down: "gravity" } as LabelText,
    ariaSlider: (n: string) => n,
  },
  es: {
    eyebrow: "Laboratorio de llama en vivo",
    title: "Mira cómo arde una llama a nivel molecular",
    intro: "Elige un entorno o fija tus propias condiciones. Las moléculas que ves se cuentan a partir de la composición del gas y la presión que fijas; la gravedad decide si los gases calientes suben. Activa o desactiva capas para ver solo la llama, solo las moléculas o una especie concreta.",
    presets: "Entorno",
    env: { earth: "Tierra", iss: "ISS", moon: "Base lunar", suit: "Traje espacial", custom: "Personalizado" } as Record<string, string>,
    play: "Reproducir",
    pause: "Pausa",
    reignite: "Reencender",
    speed: "Velocidad",
    controls: "Condiciones",
    o2: "Oxígeno (O₂)",
    pressure: "Presión",
    gravity: "Gravedad",
    flow: "Flujo de aire forzado",
    co2: "Supresor CO₂",
    he: "Supresor He",
    fuel: "Gota de combustible",
    n2: "Nitrógeno (N₂), el resto",
    methanol: "Metanol",
    heptane: "Heptano",
    outRange: "fuera del rango medido en FLEX",
    layers: "Capas",
    layersHint: "Quita lo que no quieras ver.",
    all: "Todas",
    onlyMol: "Solo moléculas",
    onlyFlame: "Solo llama",
    none: "Ninguna",
    L: {
      flame: ["Brillo de la llama", "La zona de reacción caliente y luminosa (ilustrativa)."],
      o2: ["Oxígeno, O₂", "El comburente. Su cantidad sigue tu % de O₂."],
      n2: ["Nitrógeno, N₂", "Diluyente inerte que forma la mayor parte del aire restante."],
      co2: ["Supresor CO₂", "Se añade para diluir la llama (probado en FLEX)."],
      he: ["Supresor helio", "Átomos ligeros: unas 2.6 veces más rápidos que el N₂ a la misma temperatura."],
      fuel: ["Vapor de combustible", "Se evapora de la gota (metanol o heptano, como en FLEX)."],
      products: ["Productos: H₂O, CO₂", "Se forman donde el oxígeno encuentra el combustible. Suben solo si hay gravedad."],
      soot: ["Hollín", "Partículas de carbono. Hipótesis reportada: más hollín en microgravedad (PSI-60)."],
      flow: ["Flechas de flujo", "Tu flujo de aire forzado y, con gravedad, la convección por flotabilidad."],
      labels: ["Etiquetas", "Nombra las partes principales de la llama."],
    } as Record<string, [string, string]>,
    status: { igniting: "Encendiendo", burning: "Ardiendo", extinguishing: "Apagándose", out: "Apagada" },
    regime: {
      diffusion: "Llama de difusión. Sin flotabilidad, el oxígeno llega a la llama solo por difusión y la llama es una esfera azul fantasmal.",
      buoyant: "Llama dominada por la flotabilidad. Los gases calientes suben y atraen aire fresco; la llama es una gota parpadeante.",
      transition: "Gravedad parcial: NO hay datos experimentales. Esta forma es una mezcla ilustrativa de los comportamientos de 0 g y 1 g.",
    },
    rate: "reacciones/s",
    molecules: "Moléculas en pantalla",
    cnt: { o2: "O₂", n2: "N₂", co2: "CO₂", he: "He", fuel: "combustible", products: "productos", soot: "hollín" } as Record<string, string>,
    verdictTitle: "Qué dicen los ensayos medidos más cercanos",
    verdictIn: (k: number) => `De los 5 ensayos de FLEX más cercanos, ${k} terminaron en extinción. La animación sigue el resultado mayoritario (${k >= 3 ? "la llama se apaga y se reenciende" : "la llama sigue ardiendo"}). Describe mediciones cercanas; no es una predicción.`,
    verdictOut: "Fuera del rango medido: JaPax no extrapola, así que la llama sigue ardiendo como ilustración neutra, sin veredicto.",
    issue: { o2: "O₂", p: "presión", co2: "CO₂", he: "He" } as Record<string, string>,
    measured: "medido",
    thTest: "Ensayo",
    thOut: "Resultado",
    outcome: { Extinction: "Extinción", Completion: "Combustión completa", Disruption: "Disrupción" } as Record<string, string>,
    honest: "Datos frente a ilustración",
    honestBody: [
      ["Viene de tus datos:", "el número de moléculas sigue la composición del gas; la densidad sigue la presión y la difusión se frena al subir la presión; los gases ligeros se mueven más rápido; los productos suben solo con gravedad; y el destino de la llama sale de los ensayos medidos de FLEX más cercanos."],
      ["Ilustrativo:", "el tamaño, el color, la velocidad de reacción y la cantidad de hollín son cualitativos; no existen datos experimentales entre 0 g y 1 g."],
    ],
    aria: "Simulación animada de partículas de una gota ardiendo, con las moléculas individuales y la llama, según las condiciones que fijes",
    labels: { zone: "Zona de reacción", oxygenIn: "El O₂ difunde hacia dentro", fuelVapor: "Vapor de combustible", products: "Productos calientes", plume: "Penacho por flotabilidad", sphere: "Sin flotabilidad: esférica", droplet: "Gota de combustible", down: "gravedad" } as LabelText,
    ariaSlider: (n: string) => n,
  },
};

const MOL_COLOR: Record<string, string> = { o2: "#e34948", n2: "#3987e5", co2: "#9a988f", he: "#8ee8e0", fuel: "#eda100", products: "#f0efec", soot: "#6b6a66" };
const LAYER_KEYS: (keyof Layers)[] = ["flame", "o2", "n2", "co2", "he", "fuel", "products", "soot", "flow", "labels"];
const MOL_KEYS: (keyof Layers)[] = ["o2", "n2", "co2", "he", "fuel", "products", "soot"];

const PRESET_ENV: Record<string, EnvId> = { earth: "earth", iss: "iss", moon: "moon", suit: "suit" };
const SCENE_FOR: Record<EnvId, ImmersiveEnv> = { earth: "earth", iss: "iss", moon: "moon", suit: "suit", none: "earth" };

interface State {
  o2: number;
  pressureAtm: number;
  gravityG: number;
  flowCmS: number;
  co2: number;
  he: number;
  fuel: Fuel;
}

export default function FlameLab() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();

  const preset = (id: string): State => {
    const e = data.environments.find((x) => x.id === (id === "moon" ? "moon-habitat" : id))!;
    return { o2: e.o2, pressureAtm: e.pressureAtm, gravityG: e.gravityG ?? 0, flowCmS: 0, co2: 0, he: 0, fuel: "methanol" };
  };

  const [st, setSt] = useState<State>(() => ({ o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0, co2: 0, he: 0, fuel: "methanol" }));
  const [envBg, setEnvBg] = useState<EnvId>("iss");
  const [showEnv, setShowEnv] = useState(true);

  // two WebGL views at once is heavy: start with the 3D environment hidden on small screens
  useEffect(() => {
    if (window.innerWidth < 768) setShowEnv(false);
  }, []);
  const [layers, setLayers] = useState<Layers>({ ...ALL_LAYERS, flow: true });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [rk, setRk] = useState(0);
  const [stats, setStats] = useState<SimStats | null>(null);

  // respect "reduce motion": start paused (the user can still press Play)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false);
  }, []);

  const verdict = useMemo(() => flexVerdict({ fuel: st.fuel, o2: st.o2, pressureAtm: st.pressureAtm, co2: st.co2, he: st.he }), [st]);
  const params: SimParams = useMemo(() => ({ ...st, fate: verdict.fate }), [st, verdict.fate]);

  const activePreset =
    (["earth", "iss", "moon", "suit"] as const).find((id) => {
      const p = preset(id);
      return Math.abs(p.o2 - st.o2) < 0.005 && Math.abs(p.pressureAtm - st.pressureAtm) < 0.01 && Math.abs(p.gravityG - st.gravityG) < 0.005 && st.co2 === 0 && st.he === 0 && st.flowCmS === 0;
    }) ?? "custom";

  const pick = (id: string) => {
    setSt(preset(id));
    setEnvBg(PRESET_ENV[id]);
    setRk((k) => k + 1);
  };
  const upd = (patch: Partial<State>) =>
    setSt((s) => {
      const n = { ...s, ...patch };
      const room = Math.max(0, 1 - n.o2);
      n.co2 = Math.min(n.co2, room);
      n.he = Math.min(n.he, Math.max(0, room - n.co2));
      return n;
    });

  const setOnly = (keys: (keyof Layers)[]) => setLayers(Object.fromEntries(LAYER_KEYS.map((k) => [k, keys.includes(k)])) as unknown as Layers);
  const toggle = (k: keyof Layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const slider = (id: string, label: string, value: number, min: number, max: number, step: number, show: string, onChange: (v: number) => void, flagged?: boolean) => (
    <div key={id}>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-ink-2">{show}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full" />
      {flagged && <p className="text-xs" style={{ color: "var(--warn)" }}>◌ {t.outRange}</p>}
    </div>
  );
  const flag = (k: "o2" | "p" | "co2" | "he") => verdict.issues.some((i) => i.key === k);
  const n2 = Math.max(0, 1 - st.o2 - st.co2 - st.he);
  const f2 = (x: number) => `${Math.round(x * 100)}%`;
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

  return (
    <section id="flame-lab" aria-labelledby="fl-title" className="scroll-mt-20">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 id="fl-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.intro}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* stage */}
        <div>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t.presets}>
            {(["earth", "iss", "moon", "suit"] as const).map((id) => (
              <button key={id} role="radio" aria-checked={activePreset === id} onClick={() => pick(id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${activePreset === id ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}>
                {t.env[id]}
              </button>
            ))}
            <span className={`rounded-full border border-dashed px-3 py-1.5 text-sm ${activePreset === "custom" ? "border-accent text-ink" : "border-line-2 text-muted"}`}>{t.env.custom}</span>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <button onClick={() => setRunning((r) => !r)} className="rounded-lg border border-line-2 px-3 py-1.5 text-ink-2 hover:text-ink">{running ? t.pause : t.play}</button>
              <button onClick={() => setRk((k) => k + 1)} className="rounded-lg border border-line-2 px-3 py-1.5 text-ink-2 hover:text-ink">{t.reignite}</button>
              <label className="flex items-center gap-1.5 text-ink-2">
                {t.speed}
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
                  <option value={0.25}>×0.25</option><option value={0.5}>×0.5</option><option value={1}>×1</option><option value={2}>×2</option>
                </select>
              </label>
            </div>
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm text-ink-2">
            <input type="checkbox" checked={showEnv} onChange={(e) => setShowEnv(e.target.checked)} />
            {lang === "es" ? "Ver el entorno en 3D" : "Show the environment in 3D"}
          </label>
          {showEnv && envBg !== "none" && (
            <div className="mt-2">
              <EnvironmentStage env={SCENE_FOR[envBg]} className="h-[34vh] min-h-[260px]" />
            </div>
          )}

          <div className="mt-3">
            <FlameView
              params={params}
              layers={layers}
              env={envBg}
              running={running}
              speed={speed}
              aspect={0.62}
              labelText={t.labels}
              ariaLabel={t.aria}
              reigniteKey={rk}
              onStats={setStats}
              title={stats ? t.status[stats.status] : undefined}
              footer={stats ? <span className="font-semibold text-ink">{stats.rate.toFixed(0)} {t.rate}</span> : undefined}
            />
          </div>

          <p className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
            {stats ? t.regime[stats.regime] : t.regime.diffusion}
          </p>

          {stats && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2" aria-label={t.molecules}>
              <span className="text-muted">{t.molecules}:</span>
              {(Object.keys(stats.counts) as (keyof SimStats["counts"])[]).map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: MOL_COLOR[k] }} aria-hidden="true" />
                  {t.cnt[k]} <span className="tabular-nums text-ink">{stats.counts[k]}</span>
                </span>
              ))}
            </div>
          )}

          {/* verdict */}
          <div className="card mt-4 p-4" style={{ borderColor: verdict.inRange ? undefined : "var(--warn)" }}>
            <h3 className="font-semibold">{t.verdictTitle}</h3>
            <p className="mt-1 text-sm text-ink-2">
              {verdict.inRange ? t.verdictIn(verdict.extinctions) : t.verdictOut}
            </p>
            {!verdict.inRange && (
              <p className="mt-1 text-xs text-muted">
                {verdict.issues.map((i) => `${t.issue[i.key]} ${i.key === "p" ? i.value.toFixed(2) + " atm" : pct(i.value)} (${t.measured} ${i.key === "p" ? i.lo.toFixed(2) + "–" + i.hi.toFixed(2) + " atm" : pct(i.lo) + "–" + pct(i.hi)})`).join(" · ")}
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-xs">
                <thead className="text-muted"><tr><th className="py-1 pr-3">{t.thTest}</th><th className="pr-3">O₂</th><th className="pr-3">atm</th><th className="pr-3">CO₂/He</th><th>{t.thOut}</th></tr></thead>
                <tbody>
                  {verdict.near.map(({ r }) => (
                    <tr key={r.n} className="border-t border-line">
                      <td className="py-1 pr-3">#{r.n}</td><td className="pr-3">{pct(r.o2!)}</td><td className="pr-3">{r.pAtm!.toFixed(2)}</td>
                      <td className="pr-3">{pct(r.co2 ?? 0)} / {pct(r.he ?? 0)}</td>
                      <td>{t.outcome[r.end as string] ?? r.end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* side panel */}
        <div className="space-y-5">
          <div className="card p-4">
            <h3 className="font-semibold">{t.controls}</h3>
            <div className="mt-3 space-y-4">
              {slider("c-o2", t.o2, st.o2, 0.1, 1, 0.01, f2(st.o2), (v) => upd({ o2: v }), flag("o2"))}
              {slider("c-p", t.pressure, st.pressureAtm, 0.2, 3.2, 0.05, `${st.pressureAtm.toFixed(2)} atm · ${(st.pressureAtm * 14.696).toFixed(1)} psi`, (v) => upd({ pressureAtm: v }), flag("p"))}
              {slider("c-g", t.gravity, st.gravityG, 0, 1, 0.01, `${st.gravityG.toFixed(2)} g`, (v) => upd({ gravityG: v }))}
              {slider("c-f", t.flow, st.flowCmS, 0, 50, 1, `${st.flowCmS} cm/s`, (v) => upd({ flowCmS: v }))}
              {slider("c-c", t.co2, st.co2, 0, 0.7, 0.01, f2(st.co2), (v) => upd({ co2: v }), flag("co2"))}
              {slider("c-h", t.he, st.he, 0, 0.45, 0.01, f2(st.he), (v) => upd({ he: v }), flag("he"))}
              <p className="text-xs text-muted">{t.n2}: <span className="tabular-nums text-ink-2">{f2(n2)}</span></p>
              <label className="block text-sm">
                <span>{t.fuel}</span>
                <select value={st.fuel} onChange={(e) => upd({ fuel: e.target.value as Fuel })} className="mt-1 block w-full rounded-lg border border-line-2 bg-surface px-2 py-1.5">
                  <option value="methanol">{t.methanol}</option><option value="heptane">{t.heptane}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{t.layers}</h3>
              <span className="text-xs text-muted">{t.layersHint}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <button onClick={() => setLayers({ ...ALL_LAYERS })} className="rounded-md border border-line-2 px-2 py-1 text-ink-2 hover:text-ink">{t.all}</button>
              <button onClick={() => setOnly(["o2", "n2", "co2", "he", "fuel", "products", "soot"])} className="rounded-md border border-line-2 px-2 py-1 text-ink-2 hover:text-ink">{t.onlyMol}</button>
              <button onClick={() => setOnly(["flame"])} className="rounded-md border border-line-2 px-2 py-1 text-ink-2 hover:text-ink">{t.onlyFlame}</button>
              <button onClick={() => setOnly([])} className="rounded-md border border-line-2 px-2 py-1 text-ink-2 hover:text-ink">{t.none}</button>
            </div>
            <ul className="mt-3 space-y-2">
              {LAYER_KEYS.map((k) => (
                <li key={k}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} className="mt-1" />
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MOL_KEYS.includes(k) ? MOL_COLOR[k] : k === "flame" ? "var(--flame)" : "var(--ink-2)" }} aria-hidden="true" />
                    <span>
                      <span className="block">{t.L[k][0]}</span>
                      <span className="block text-xs text-muted">{t.L[k][1]}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-4 text-sm">
        <h3 className="font-semibold">{t.honest}</h3>
        <ul className="mt-2 space-y-1.5 text-ink-2">
          {t.honestBody.map(([h, b]) => (
            <li key={h}><strong className="text-ink">{h}</strong> {b}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{lang === "es" ? "Nota: " : "Note: "}<Pending>{lang === "es" ? "ilustración" : "illustration"}</Pending></p>
      </div>
    </section>
  );
}
