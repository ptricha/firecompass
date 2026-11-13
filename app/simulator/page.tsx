"use client";

import Link from "next/link";
import { useState } from "react";
import { useData, useLang, useT } from "@/lib/i18n";
import { coversEnvironment, scoreInvestigation } from "@/lib/scoring";
import CoverageMap from "@/components/CoverageMap";
import { Pending, SourceTag } from "@/components/ui";

const T = {
  en: {
    eyebrow: "Simulator",
    title: "Pick an environment, see what the data can tell you",
    intro: "Choose where a fire could start. FireCompass computes how that atmosphere compares with Earth and which experiments actually covered it, and it states plainly where there is no data.",
    envGroup: "Environment",
    envNames: { earth: "Earth", iss: "ISS", "moon-habitat": "Lunar base", suit: "Spacesuit" } as Record<string, string>,
    atmos: "Atmosphere",
    oxygen: "Oxygen",
    pressure: "Pressure",
    gravity: "Gravity",
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
  },
  es: {
    eyebrow: "Simulador",
    title: "Elige un entorno y mira qué te dicen los datos",
    intro: "Elige dónde podría empezar un incendio. FireCompass calcula cómo se compara esa atmósfera con la de la Tierra y qué experimentos la cubrieron realmente, y dice con claridad dónde no hay datos.",
    envGroup: "Entorno",
    envNames: { earth: "Tierra", iss: "ISS", "moon-habitat": "Base lunar", suit: "Traje espacial" } as Record<string, string>,
    atmos: "Atmósfera",
    oxygen: "Oxígeno",
    pressure: "Presión",
    gravity: "Gravedad",
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
  },
};

const VERDICT_TONE: Record<string, string> = {
  earth: "var(--muted)",
  iss: "var(--a-suppression)",
  "moon-habitat": "var(--crit)",
  suit: "var(--crit)",
};

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
      <text x={minX + 12} y={minY + 20} fontSize="12" fontWeight="600" fill="var(--ink)">
        {t.cMin}
      </text>
      <text x={minX + 12} y={minY + 36} fontSize="11" fill="var(--ink-2)">
        {t.cMin2}
      </text>
      <text x={m.l + 10} y={m.t + 18} fontSize="12" fill="var(--accent)">
        {t.cTop}
      </text>
      <text x={m.l + 10} y={m.t + ph - 10} fontSize="12" fill="var(--muted)">
        {t.cBot}
      </text>
      <text x={m.l + 8} y={m.t + ph * 0.55} fontSize="11" fill="var(--ink-2)">
        {t.cLow1}
      </text>
      <text x={m.l + 8} y={m.t + ph * 0.55 + 14} fontSize="11" fill="var(--ink-2)">
        {t.cLow2}
      </text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        {t.cX}
      </text>
      <text transform={`translate(14 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        {t.cY}
      </text>
    </svg>
  );
}

export default function Simulator() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const [envId, setEnvId] = useState("moon-habitat");
  const earth = data.environments.find((e) => e.id === "earth")!;
  const env = data.environments.find((e) => e.id === envId)!;
  const o2Ratio = (env.o2 / earth.o2 - 1) * 100;
  const ppO2Psi = env.o2 * env.pressurePsi;
  const ppO2Earth = earth.o2 * earth.pressurePsi;

  const covers = data.investigations
    .map((inv) => ({ inv, c: coversEnvironment(inv, env) }))
    .filter((r) => r.c !== "none")
    .sort((a, b) => (a.c === b.c ? scoreInvestigation(b.inv).total - scoreInvestigation(a.inv).total : a.c === "full" ? -1 : 1));
  const full = covers.filter((r) => r.c === "full");

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
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              envId === e.id ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"
            }`}
          >
            {t.envNames[e.id] ?? e.name}
          </button>
        ))}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-live="polite">
        <div className="card p-5">
          <p className="eyebrow">{t.atmos}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t.oxygen}</dt><dd className="font-medium">{Math.round(env.o2 * 100)}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t.pressure}</dt><dd className="font-medium">{env.pressurePsi} psi ({env.pressureAtm} atm)</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{t.gravity}</dt><dd className="font-medium">{env.gravityG === null ? "n/a" : `${env.gravityG} g`}</dd></div>
          </dl>
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
        </div>
      </section>

      <section className="mt-8" aria-labelledby="cov">
        <h2 id="cov" className="text-xl font-semibold">
          {t.covTitle}
        </h2>
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
                    <Link href={`/explorer/${inv.id}`} className="font-semibold hover:underline">
                      {inv.acronym}
                    </Link>
                    <span className={`rounded px-2 py-0.5 text-xs ${c === "full" ? "bg-[color:var(--a-suppression)]/25" : "bg-[color:var(--warn)]/20"}`}>
                      {c === "full" ? t.covered : t.partial}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{inv.findings[0]?.text}</p>
                  <div className="mt-2">
                    <SourceTag src={inv.findings[0]?.src ?? "PSI"} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-12" aria-labelledby="map">
        <h2 id="map" className="text-xl font-semibold">
          {t.mapTitle}
        </h2>
        <div className="mt-3">
          <CoverageMap />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="curve">
        <h2 id="curve" className="text-xl font-semibold">
          {t.curveTitle}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.curveText}</p>
        <div className="card mt-4 p-3 sm:p-5">
          <FlammabilityCurve t={t} />
          <p className="mt-2 text-xs text-muted">
            {t.curveNote} <SourceTag src="GUIDE p.31" />
          </p>
        </div>
      </section>
    </div>
  );
}
