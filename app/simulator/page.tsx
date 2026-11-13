"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useData, useT } from "@/lib/i18n";
import { coversEnvironment, scoreInvestigation } from "@/lib/scoring";
import { ALL_LAYERS, type EnvId, type Fuel, type LabelText, type Layers, type SimParams, type SimStats } from "@/lib/flameEngine";
import { flexVerdict } from "@/lib/flexVerdict";
import CoverageMap from "@/components/CoverageMap";
import FlameCanvas from "@/components/FlameCanvas";
import { Pending, SourceTag } from "@/components/ui";

const T = {
  en: {
    eyebrow: "Simulator",
    title: "Pick an environment and watch the fire behave",
    intro: "Each environment runs the same burning droplet under its own atmosphere and gravity. The readouts below are computed from the data; the animation shows what that atmosphere does to the flame, molecule by molecule.",
    envGroup: "Environment",
    envNames: { earth: "Earth", iss: "ISS", "moon-habitat": "Lunar base", suit: "Spacesuit" } as Record<string, string>,
    stageTitle: "The environment, animated",
    compare: "Compare with Earth",
    molecules: "Show molecules",
    labelsT: "Callouts",
    play: "Play",
    pause: "Pause",
    speed: "Speed",
    fuel: "Fuel",
    methanol: "Methanol",
    heptane: "Heptane",
    openLab: "Open the full flame lab and set your own conditions",
    status: { igniting: "Igniting", burning: "Burning", extinguishing: "Going out", out: "Extinguished" },
    regime: { diffusion: "Diffusion flame", transition: "Illustrative blend (no data)", buoyant: "Buoyant flame" },
    gauges: "Live readouts",
    gOxygen: "Oxygen",
    gPressure: "Pressure",
    gGravity: "Gravity",
    earthMark: "Earth",
    vsEarth: "Compared with Earth",
    oxConc: "oxygen concentration",
    ppO2: "O₂ partial pressure:",
    earthWord: "Earth",
    moonNote: " Almost the same partial pressure, yet 43% more oxygen by concentration; the challenge notes that flammability depends strongly on oxygen concentration.",
    computed: "Computed from the figures above.",
    gravEv: "Gravity evidence",
    verdict: {
      earth: "1 g reference. Not a microgravity test condition; useful as the baseline the experiments are compared against.",
      iss: "Microgravity: measured. This is the condition almost every investigation in PSI was run in.",
      "moon-habitat": "0.166 g: NO experimental data yet. LUCI and FM2 are expected to provide it; microgravity and 1 g results bound the answer.",
      suit: "100% O₂ at 4.3 psi lies outside every verified test range; no data.",
    } as Record<string, string>,
    flexTitle: "What measured FLEX tests say for this atmosphere",
    flexIn: (k: number) => `Of the 5 closest FLEX tests, ${k} ended in extinction. The animation follows that majority. It describes nearby measurements; it is not a prediction.`,
    flexOut: "This atmosphere is outside the measured FLEX range, so there is no verdict and FireCompass does not extrapolate.",
    covTitle: "Experiments that covered this atmosphere",
    covNone: "No investigation with verified ranges covers this atmosphere. That gap is itself a finding.",
    covText: (n: number) => `${n} fully inside the verified O₂ and pressure ranges; the rest overlap in only one variable or have unverified ranges (`,
    covered: "Covered",
    partial: "Partial",
    mapTitle: "Where this environment sits among the tests",
    curveTitle: "Why ventilation speed matters as much as oxygen",
    curveText: "In low gravity, flames over solid materials can survive at lower oxygen than conventional theory predicted, and the easiest conditions sit around 10 cm/s, the airflow of a typical spacecraft ventilation system. NASA's BASS results indicate that the 1-g material test (NASA-STD-6001 Test 1) is therefore not conservative.",
    curveNote: "Qualitative schematic of the concept in Fig. 8 of the NASA Researcher's Guide (2015): oxygen needed to sustain flame spread versus gas velocity. Only the position of the minimum (≈10 cm/s) comes from the source; no numeric O₂ values are implied.",
    cAria: "Qualitative flammability boundary: oxygen needed to sustain a flame versus airflow speed, with a minimum near 10 centimeters per second",
    cMin: "Minimum ≈ 10 cm/s",
    cMin2: "typical spacecraft ventilation",
    cTop: "Flames can be sustained",
    cBot: "No steady flame spread",
    cLow1: "low flow: radiative",
    cLow2: "heat loss extinguishes",
    cX: "Gas velocity across the material surface (log scale)",
    cY: "Oxygen needed to sustain flame (qualitative)",
    stageAria: (n: string) => `Animated simulation of a burning droplet in the ${n} environment`,
    labels: { zone: "Reaction zone", oxygenIn: "O₂ diffuses in", fuelVapor: "Fuel vapor", products: "Hot products", plume: "Buoyant plume", sphere: "No buoyancy: spherical", droplet: "Fuel droplet", down: "gravity" } as LabelText,
    illus: "Flame shape, color and speed are illustrative; molecule counts, density and the fate of the flame come from the data.",
    legend: "Molecule legend",
    fuelVap: "fuel vapor",
    soot: "soot",
  },
  es: {
    eyebrow: "Simulador",
    title: "Elige un entorno y mira cómo se comporta el fuego",
    intro: "Cada entorno ejecuta la misma gota ardiendo con su propia atmósfera y gravedad. Los indicadores de abajo se calculan a partir de los datos; la animación muestra qué hace esa atmósfera con la llama, molécula a molécula.",
    envGroup: "Entorno",
    envNames: { earth: "Tierra", iss: "ISS", "moon-habitat": "Base lunar", suit: "Traje espacial" } as Record<string, string>,
    stageTitle: "El entorno, animado",
    compare: "Comparar con la Tierra",
    molecules: "Mostrar moléculas",
    labelsT: "Etiquetas",
    play: "Reproducir",
    pause: "Pausa",
    speed: "Velocidad",
    fuel: "Combustible",
    methanol: "Metanol",
    heptane: "Heptano",
    openLab: "Abrir el laboratorio de llama completo y fijar tus propias condiciones",
    status: { igniting: "Encendiendo", burning: "Ardiendo", extinguishing: "Apagándose", out: "Apagada" },
    regime: { diffusion: "Llama de difusión", transition: "Mezcla ilustrativa (sin datos)", buoyant: "Llama por flotabilidad" },
    gauges: "Indicadores en vivo",
    gOxygen: "Oxígeno",
    gPressure: "Presión",
    gGravity: "Gravedad",
    earthMark: "Tierra",
    vsEarth: "Comparado con la Tierra",
    oxConc: "concentración de oxígeno",
    ppO2: "Presión parcial de O₂:",
    earthWord: "Tierra",
    moonNote: " Casi la misma presión parcial, pero 43% más oxígeno en concentración; el reto señala que la inflamabilidad depende mucho de la concentración de oxígeno.",
    computed: "Calculado a partir de las cifras anteriores.",
    gravEv: "Evidencia de gravedad",
    verdict: {
      earth: "Referencia de 1 g. No es una condición de ensayo de microgravedad; sirve como base con la que se comparan los experimentos.",
      iss: "Microgravedad: medida. Es la condición en la que se hizo casi toda investigación de PSI.",
      "moon-habitat": "0.166 g: SIN datos experimentales todavía. Se espera que LUCI y FM2 los aporten; los resultados de microgravedad y 1 g acotan la respuesta.",
      suit: "100% de O₂ a 4.3 psi queda fuera de todos los rangos de ensayo verificados; sin datos.",
    } as Record<string, string>,
    flexTitle: "Qué dicen los ensayos medidos de FLEX para esta atmósfera",
    flexIn: (k: number) => `De los 5 ensayos de FLEX más cercanos, ${k} terminaron en extinción. La animación sigue esa mayoría. Describe mediciones cercanas; no es una predicción.`,
    flexOut: "Esta atmósfera queda fuera del rango medido en FLEX, así que no hay veredicto y FireCompass no extrapola.",
    covTitle: "Experimentos que cubrieron esta atmósfera",
    covNone: "Ninguna investigación con rangos verificados cubre esta atmósfera. Esa laguna es en sí un hallazgo.",
    covText: (n: number) => `${n} totalmente dentro de los rangos verificados de O₂ y presión; el resto coincide solo en una variable o tiene rangos sin verificar (`,
    covered: "Cubierto",
    partial: "Parcial",
    mapTitle: "Dónde queda este entorno entre los ensayos",
    curveTitle: "Por qué la velocidad de ventilación importa tanto como el oxígeno",
    curveText: "En baja gravedad, las llamas sobre materiales sólidos pueden sobrevivir con menos oxígeno del que preveía la teoría convencional, y las condiciones más fáciles están en torno a 10 cm/s, el flujo de aire de un sistema de ventilación típico de nave. Los resultados de BASS de NASA indican que el test de materiales de 1 g (NASA-STD-6001 Test 1) no es, por tanto, conservador.",
    curveNote: "Esquema cualitativo del concepto de la Fig. 8 de la Guía del Investigador de NASA (2015): oxígeno necesario para sostener la propagación de la llama frente a la velocidad del gas. Solo la posición del mínimo (≈10 cm/s) viene de la fuente; no se implican valores numéricos de O₂.",
    cAria: "Frontera cualitativa de inflamabilidad: oxígeno necesario para sostener una llama frente a la velocidad del aire, con un mínimo cerca de 10 centímetros por segundo",
    cMin: "Mínimo ≈ 10 cm/s",
    cMin2: "ventilación típica de una nave",
    cTop: "Se pueden sostener llamas",
    cBot: "Sin propagación estable de llama",
    cLow1: "flujo bajo: la pérdida de",
    cLow2: "calor por radiación apaga la llama",
    cX: "Velocidad del gas sobre la superficie del material (escala log.)",
    cY: "Oxígeno necesario para sostener la llama (cualitativo)",
    stageAria: (n: string) => `Simulación animada de una gota ardiendo en el entorno ${n}`,
    labels: { zone: "Zona de reacción", oxygenIn: "El O₂ difunde hacia dentro", fuelVapor: "Vapor de combustible", products: "Productos calientes", plume: "Penacho por flotabilidad", sphere: "Sin flotabilidad: esférica", droplet: "Gota de combustible", down: "gravedad" } as LabelText,
    illus: "La forma, el color y la velocidad de la llama son ilustrativos; el número de moléculas, la densidad y el destino de la llama salen de los datos.",
    legend: "Leyenda de moléculas",
    fuelVap: "vapor de combustible",
    soot: "hollín",
  },
};

const VERDICT_TONE: Record<string, string> = { earth: "var(--muted)", iss: "var(--a-suppression)", "moon-habitat": "var(--crit)", suit: "var(--crit)" };
const ENGINE_ENV: Record<string, EnvId> = { earth: "earth", iss: "iss", "moon-habitat": "moon", suit: "suit" };

type Tx = (typeof T)["en"];

function FlammabilityCurve({ t }: { t: Tx }) {
  const W = 680;
  const H = 330;
  const m = { l: 56, r: 20, t: 20, b: 48 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const X = (v: number) => m.l + (Math.log10(v) / 2) * pw; // 1..100 cm/s
  // qualitative U-shaped limit, minimum at 10 cm/s (GUIDE p.31)
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const lv = (i / 60) * 2;
    const d = lv - 1;
    const yq = 0.18 + 0.5 * d * d * (d < 0 ? 1.15 : 0.9);
    pts.push([m.l + (lv / 2) * pw, m.t + ph * (1 - Math.min(yq, 0.95))]);
  }
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = `${line} L ${m.l + pw} ${m.t} L ${m.l} ${m.t} Z`;
  const minX = X(10);
  const minY = m.t + ph * (1 - 0.18);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t.cAria}>
      {[1, 10, 100].map((v) => (
        <g key={v}>
          <line x1={X(v)} x2={X(v)} y1={m.t} y2={m.t + ph} stroke="var(--line)" />
          <text x={X(v)} y={H - m.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {v} cm/s
          </text>
        </g>
      ))}
      <path d={area} fill="rgba(255,138,76,0.12)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      <circle cx={minX} cy={minY} r="6" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      <text x={minX + 12} y={minY + 20} fontSize="12" fontWeight="600" fill="var(--ink)">{t.cMin}</text>
      <text x={minX + 12} y={minY + 36} fontSize="11" fill="var(--ink-2)">{t.cMin2}</text>
      <text x={m.l + 10} y={m.t + 18} fontSize="12" fill="var(--accent)">{t.cTop}</text>
      <text x={m.l + 10} y={m.t + ph - 10} fontSize="12" fill="var(--muted)">{t.cBot}</text>
      <text x={m.l + 8} y={m.t + ph * 0.55} fontSize="11" fill="var(--ink-2)">{t.cLow1}</text>
      <text x={m.l + 8} y={m.t + ph * 0.55 + 14} fontSize="11" fill="var(--ink-2)">{t.cLow2}</text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.cX}</text>
      <text transform={`translate(14 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.cY}</text>
    </svg>
  );
}

function Gauge({ label, value, display, max, marker, markerLabel }: { label: string; value: number; display: string; max: number; marker?: number; markerLabel?: string }) {
  return (
    <div className="pb-5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{display}</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
        <div className="h-3 rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: "var(--accent)", transition: "width 700ms cubic-bezier(.2,.8,.2,1)" }} />
        {marker !== undefined && (
          <div className="absolute -top-1 h-5 w-0.5 bg-ink-2" style={{ left: `${(marker / max) * 100}%` }} title={markerLabel}>
            <span className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted">{markerLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Simulator() {
  const t = useT(T);
  const data = useData();
  const [envId, setEnvId] = useState("moon-habitat");
  const [compare, setCompare] = useState(true);
  const [showMol, setShowMol] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [fuel, setFuel] = useState<Fuel>("methanol");
  const [stats, setStats] = useState<SimStats | null>(null);

  // respect "reduce motion": start paused (the user can still press Play)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRunning(false);
  }, []);

  const earth = data.environments.find((e) => e.id === "earth")!;
  const env = data.environments.find((e) => e.id === envId)!;
  const o2Ratio = (env.o2 / earth.o2 - 1) * 100;
  const ppO2Psi = env.o2 * env.pressurePsi;
  const ppO2Earth = earth.o2 * earth.pressurePsi;

  const mk = (e: typeof env): { params: SimParams; verdict: ReturnType<typeof flexVerdict> } => {
    const v = flexVerdict({ fuel, o2: e.o2, pressureAtm: e.pressureAtm, co2: 0, he: 0 });
    return { params: { o2: e.o2, pressureAtm: e.pressureAtm, gravityG: e.gravityG ?? 0, flowCmS: 0, co2: 0, he: 0, fuel, fate: v.fate }, verdict: v };
  };
  const sel = useMemo(() => mk(env), [env, fuel]); // eslint-disable-line react-hooks/exhaustive-deps
  const ear = useMemo(() => mk(earth), [earth, fuel]); // eslint-disable-line react-hooks/exhaustive-deps

  const layers: Layers = showMol
    ? { ...ALL_LAYERS, labels: showLabels }
    : { flame: true, o2: false, n2: false, co2: false, he: false, fuel: false, products: false, soot: false, flow: true, labels: showLabels };

  const covers = data.investigations
    .map((inv) => ({ inv, c: coversEnvironment(inv, env) }))
    .filter((r) => r.c !== "none")
    .sort((a, b) => (a.c === b.c ? scoreInvestigation(b.inv).total - scoreInvestigation(a.inv).total : a.c === "full" ? -1 : 1));
  const full = covers.filter((r) => r.c === "full");
  const name = t.envNames[envId] ?? env.name;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-2">{t.intro}</p>

      <div role="radiogroup" aria-label={t.envGroup} className="mt-6 flex flex-wrap gap-2">
        {data.environments.map((e) => (
          <button
            key={e.id}
            role="radio"
            aria-checked={envId === e.id}
            onClick={() => setEnvId(e.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${envId === e.id ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}
          >
            {t.envNames[e.id] ?? e.name}
          </button>
        ))}
      </div>

      {/* ---------- animated stage ---------- */}
      <section className="mt-5" aria-labelledby="stage">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <h2 id="stage" className="mr-auto text-xl font-semibold">{t.stageTitle}</h2>
          <label className="flex cursor-pointer items-center gap-1.5 text-ink-2"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> {t.compare}</label>
          <label className="flex cursor-pointer items-center gap-1.5 text-ink-2"><input type="checkbox" checked={showMol} onChange={(e) => setShowMol(e.target.checked)} /> {t.molecules}</label>
          <label className="flex cursor-pointer items-center gap-1.5 text-ink-2"><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> {t.labelsT}</label>
          <label className="flex items-center gap-1.5 text-ink-2">
            {t.fuel}
            <select value={fuel} onChange={(e) => setFuel(e.target.value as Fuel)} className="rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
              <option value="methanol">{t.methanol}</option><option value="heptane">{t.heptane}</option>
            </select>
          </label>
          <button onClick={() => setRunning((r) => !r)} className="rounded-lg border border-line-2 px-3 py-1 text-ink-2 hover:text-ink">{running ? t.pause : t.play}</button>
          <label className="flex items-center gap-1.5 text-ink-2">
            {t.speed}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-lg border border-line-2 bg-surface px-1.5 py-1 text-ink">
              <option value={0.25}>×0.25</option><option value={0.5}>×0.5</option><option value={1}>×1</option><option value={2}>×2</option>
            </select>
          </label>
        </div>

        <div className={`mt-3 grid gap-3 ${compare && envId !== "earth" ? "md:grid-cols-2" : ""}`}>
          {compare && envId !== "earth" && (
            <figure className="relative">
              <FlameCanvas params={ear.params} layers={layers} env="earth" running={running} speed={speed} aspect={0.68} labelText={t.labels} ariaLabel={t.stageAria(t.envNames.earth)} />
              <figcaption className="pointer-events-none absolute left-3 top-3 rounded-md border border-line bg-bg/75 px-2.5 py-1 text-xs font-semibold backdrop-blur">{t.envNames.earth}</figcaption>
            </figure>
          )}
          <figure className="relative">
            <FlameCanvas params={sel.params} layers={layers} env={ENGINE_ENV[envId]} running={running} speed={speed} aspect={compare && envId !== "earth" ? 0.68 : 0.5} labelText={t.labels} ariaLabel={t.stageAria(name)} onStats={setStats} />
            <figcaption className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-line bg-bg/75 px-2.5 py-1 text-xs backdrop-blur">
              <span className="font-semibold">{name}</span>
              {stats && <span className="text-ink-2">· {t.status[stats.status]} · {t.regime[stats.regime]}</span>}
            </figcaption>
          </figure>
        </div>
        {showMol && (
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-label={t.legend}>
            {[["#e34948", "O₂"], ["#3987e5", "N₂"], ["#9a988f", "CO₂"], ["#f0efec", "H₂O"], ["#eda100", t.fuelVap], ["#6b6a66", t.soot]].map(([c, n]) => (
              <li key={n} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">{t.illus}{" "}
          <Link href="/lab#flame-lab" className="link">{t.openLab} →</Link>
        </p>
      </section>

      {/* ---------- live readouts ---------- */}
      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-live="polite" aria-label={t.gauges}>
        <div className="card p-5">
          <p className="eyebrow">{t.gauges}</p>
          <div className="mt-4 space-y-6 pb-2">
            <Gauge label={t.gOxygen} value={env.o2 * 100} display={`${Math.round(env.o2 * 100)}%`} max={100} marker={earth.o2 * 100} markerLabel={`${t.earthMark} 21%`} />
            <Gauge label={t.gPressure} value={env.pressurePsi} display={`${env.pressurePsi} psi (${env.pressureAtm} atm)`} max={15} marker={earth.pressurePsi} markerLabel={`${t.earthMark} 14.7`} />
            <Gauge label={t.gGravity} value={(env.gravityG ?? 0) * 100} display={env.gravityG === null ? "n/a" : `${env.gravityG} g`} max={100} marker={100} markerLabel={`${t.earthMark} 1 g`} />
          </div>
          {env.note && <p className="mt-3 text-xs text-muted">{env.note}</p>}
        </div>

        <div className="card p-5">
          <p className="eyebrow">{t.vsEarth}</p>
          <div className="mt-3 text-3xl font-semibold tabular-nums" style={{ color: o2Ratio > 5 ? "var(--accent)" : "var(--ink)" }}>
            {o2Ratio > 0 ? "+" : ""}
            {o2Ratio.toFixed(0)}%
          </div>
          <p className="text-sm text-ink-2">{t.oxConc}</p>
          <p className="mt-3 text-xs text-ink-2">
            {t.ppO2} <strong className="text-ink">{ppO2Psi.toFixed(1)} psi</strong> ({t.earthWord} {ppO2Earth.toFixed(1)} psi).
            {envId === "moon-habitat" && t.moonNote}
          </p>
          <p className="mt-2 text-xs text-muted">{t.computed}</p>
        </div>

        <div className="card p-5" style={{ borderColor: VERDICT_TONE[envId] }}>
          <p className="eyebrow">{t.gravEv}</p>
          <p className="mt-3 text-sm">{t.verdict[envId]}</p>
          <p className="eyebrow mt-4">{t.flexTitle}</p>
          <p className="mt-2 text-sm text-ink-2">{sel.verdict.inRange ? t.flexIn(sel.verdict.extinctions) : t.flexOut}</p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="cov">
        <h2 id="cov" className="text-xl font-semibold">{t.covTitle}</h2>
        {covers.length === 0 ? (
          <p className="card mt-3 p-4 text-sm text-ink-2">{t.covNone}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-2">
              {t.covText(full.length)}
              <Pending />).
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {covers.map(({ inv, c }) => (
                <li key={inv.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/explorer/${inv.id}`} className="font-semibold hover:underline">{inv.acronym}</Link>
                    <span className={`rounded px-2 py-0.5 text-xs ${c === "full" ? "bg-[color:var(--a-suppression)]/25" : "bg-[color:var(--warn)]/20"}`}>
                      {c === "full" ? t.covered : t.partial}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{inv.findings[0]?.text}</p>
                  <div className="mt-2"><SourceTag src={inv.findings[0]?.src ?? "PSI"} /></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-12" aria-labelledby="map">
        <h2 id="map" className="text-xl font-semibold">{t.mapTitle}</h2>
        <div className="mt-3"><CoverageMap /></div>
      </section>

      <section className="mt-12" aria-labelledby="curve">
        <h2 id="curve" className="text-xl font-semibold">{t.curveTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.curveText}</p>
        <div className="card mt-4 p-3 sm:p-5">
          <FlammabilityCurve t={t} />
          <p className="mt-2 text-xs text-muted">{t.curveNote} <SourceTag src="GUIDE p.31" /></p>
        </div>
      </section>
    </div>
  );
}
