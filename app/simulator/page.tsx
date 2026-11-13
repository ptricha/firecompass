"use client";

import Link from "next/link";
import { useState } from "react";
import { data } from "@/lib/data";
import { coversEnvironment, scoreInvestigation } from "@/lib/scoring";
import CoverageMap from "@/components/CoverageMap";
import { Pending, SourceTag } from "@/components/ui";

const EARTH = data.environments.find((e) => e.id === "earth")!;
const GRAVITY_VERDICT: Record<string, { tone: string; text: string }> = {
  earth: { tone: "var(--muted)", text: "1 g reference. Not a microgravity test condition; useful as the baseline the experiments are compared against." },
  iss: { tone: "var(--a-suppression)", text: "Microgravity: measured. This is the condition almost every investigation in PSI was run in." },
  "moon-habitat": { tone: "var(--crit)", text: "0.166 g: NO experimental data yet. LUCI and FM2 are expected to provide it; microgravity and 1 g results bound the answer." },
  suit: { tone: "var(--crit)", text: "100% O₂ at 4.3 psi lies outside every verified test range; no data." },
};

const ENV_LABEL: Record<string, string> = { earth: "Earth", iss: "ISS", "moon-habitat": "Lunar base", suit: "Spacesuit" };

function FlammabilityCurve() {
  const W = 680;
  const H = 330;
  const m = { l: 56, r: 20, t: 20, b: 48 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const X = (v: number) => m.l + ((Math.log10(v) - 0) / 2) * pw; // 1..100 cm/s
  // qualitative U-shaped limit, minimum at 10 cm/s (GUIDE p.31)
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const lv = (i / 60) * 2; // log10 velocity 0..2
    const d = lv - 1;
    const yq = 0.18 + 0.5 * d * d * (d < 0 ? 1.15 : 0.9);
    pts.push([m.l + (lv / 2) * pw, m.t + ph * (1 - Math.min(yq, 0.95))]);
  }
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = `${line} L ${m.l + pw} ${m.t} L ${m.l} ${m.t} Z`;
  const minX = X(10);
  const minY = m.t + ph * (1 - 0.18);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Qualitative flammability boundary: oxygen needed to sustain a flame versus airflow speed, with a minimum near 10 centimeters per second">
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
        Minimum ≈ 10 cm/s
      </text>
      <text x={minX + 12} y={minY + 36} fontSize="11" fill="var(--ink-2)">
        typical spacecraft ventilation
      </text>
      <text x={m.l + 10} y={m.t + 18} fontSize="12" fill="var(--accent)">
        Flames can be sustained
      </text>
      <text x={m.l + 10} y={m.t + ph - 10} fontSize="12" fill="var(--muted)">
        No steady flame spread
      </text>
      <text x={m.l + 8} y={m.t + ph * 0.55} fontSize="11" fill="var(--ink-2)">
        low flow: radiative
      </text>
      <text x={m.l + 8} y={m.t + ph * 0.55 + 14} fontSize="11" fill="var(--ink-2)">
        heat loss extinguishes
      </text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        Gas velocity across the material surface (log scale)
      </text>
      <text transform={`translate(14 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
        Oxygen needed to sustain flame (qualitative)
      </text>
    </svg>
  );
}

export default function Simulator() {
  const [envId, setEnvId] = useState("moon-habitat");
  const env = data.environments.find((e) => e.id === envId)!;
  const o2Ratio = (env.o2 / EARTH.o2 - 1) * 100;
  const ppO2Psi = env.o2 * env.pressurePsi;
  const ppO2Earth = EARTH.o2 * EARTH.pressurePsi;

  const covers = data.investigations
    .map((inv) => ({ inv, c: coversEnvironment(inv, env) }))
    .filter((r) => r.c !== "none")
    .sort((a, b) => (a.c === b.c ? scoreInvestigation(b.inv).total - scoreInvestigation(a.inv).total : a.c === "full" ? -1 : 1));
  const full = covers.filter((r) => r.c === "full");
  const verdict = GRAVITY_VERDICT[envId];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <p className="eyebrow">Simulator</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Pick an environment, see what the data can tell you</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        Choose where a fire could start. FireCompass computes how that atmosphere compares with Earth and which
        experiments actually covered it, and it states plainly where there is no data.
      </p>

      <div role="radiogroup" aria-label="Environment" className="mt-6 flex flex-wrap gap-2">
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
            {ENV_LABEL[e.id] ?? e.name}
          </button>
        ))}
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-live="polite">
        <div className="card p-5">
          <p className="eyebrow">Atmosphere</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Oxygen</dt><dd className="font-medium">{Math.round(env.o2 * 100)}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Pressure</dt><dd className="font-medium">{env.pressurePsi} psi ({env.pressureAtm} atm)</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Gravity</dt><dd className="font-medium">{env.gravityG === null ? "n/a" : `${env.gravityG} g`}</dd></div>
          </dl>
          {env.note && <p className="mt-3 text-xs text-muted">{env.note}</p>}
        </div>

        <div className="card p-5">
          <p className="eyebrow">Compared with Earth</p>
          <div className="mt-3 text-3xl font-semibold tabular-nums" style={{ color: o2Ratio > 5 ? "var(--accent)" : "var(--ink)" }}>
            {o2Ratio > 0 ? "+" : ""}
            {o2Ratio.toFixed(0)}%
          </div>
          <p className="text-sm text-ink-2">oxygen concentration</p>
          <p className="mt-3 text-xs text-ink-2">
            O₂ partial pressure: <strong className="text-ink">{ppO2Psi.toFixed(1)} psi</strong> (Earth {ppO2Earth.toFixed(1)} psi).
            {envId === "moon-habitat" && " Almost the same partial pressure, yet 43% more oxygen by concentration; the challenge notes that flammability depends strongly on oxygen concentration."}
          </p>
          <p className="mt-2 text-xs text-muted">Computed from the figures above.</p>
        </div>

        <div className="card p-5" style={{ borderColor: verdict.tone }}>
          <p className="eyebrow">Gravity evidence</p>
          <p className="mt-3 text-sm">{verdict.text}</p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="cov">
        <h2 id="cov" className="text-xl font-semibold">
          Experiments that covered this atmosphere
        </h2>
        {covers.length === 0 ? (
          <p className="card mt-3 p-4 text-sm text-ink-2">
            No investigation with verified ranges covers this atmosphere. That gap is itself a finding.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-2">
              {full.length} fully inside the verified O₂ and pressure ranges; the rest overlap in only one variable or have
              unverified ranges (<Pending />).
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {covers.map(({ inv, c }) => (
                <li key={inv.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/explorer/${inv.id}`} className="font-semibold hover:underline">
                      {inv.acronym}
                    </Link>
                    <span className={`rounded px-2 py-0.5 text-xs ${c === "full" ? "bg-[color:var(--a-suppression)]/25" : "bg-[color:var(--warn)]/20"}`}>
                      {c === "full" ? "Covered" : "Partial"}
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
          Where this environment sits among the tests
        </h2>
        <div className="mt-3">
          <CoverageMap />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="curve">
        <h2 id="curve" className="text-xl font-semibold">
          Why ventilation speed matters as much as oxygen
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          In low gravity, flames over solid materials can survive at lower oxygen than conventional theory predicted, and the
          easiest conditions sit around 10 cm/s, the airflow of a typical spacecraft ventilation system. NASA&apos;s BASS results
          indicate that the 1-g material test (NASA-STD-6001 Test 1) is therefore not conservative.
        </p>
        <div className="card mt-4 p-3 sm:p-5">
          <FlammabilityCurve />
          <p className="mt-2 text-xs text-muted">
            Qualitative schematic of the concept in Fig. 8 of the NASA Researcher&apos;s Guide (2015): oxygen needed to sustain
            flame spread versus gas velocity. Only the position of the minimum (≈10 cm/s) comes from the source; no numeric O₂
            values are implied. <SourceTag src="GUIDE p.31" />
          </p>
        </div>
      </section>
    </div>
  );
}
