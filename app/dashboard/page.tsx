"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areaLabel, type Area } from "@/lib/data";
import { useData, useLang, useT } from "@/lib/i18n";
import {
  DEFAULT_WEIGHTS,
  FACTORS,
  FACTOR_COLOR,
  coversEnvironment,
  factorInfo,
  levelLabel,
  scoreInvestigation,
  type FactorKey,
  type Weights,
} from "@/lib/scoring";
import ScoreBar from "@/components/ScoreBar";
import { AreaBadge, Pending, Section } from "@/components/ui";

const PROFILES: Record<string, Weights> = {
  balanced: DEFAULT_WEIGHTS,
  lunar: { habitat: 60, realism: 15, safety: 10, data: 5, modeling: 10 },
  realistic: { habitat: 15, realism: 50, safety: 20, data: 5, modeling: 10 },
  data: { habitat: 15, realism: 15, safety: 15, data: 45, modeling: 10 },
};
const AREAS: ("all" | Area)[] = ["all", "prevention", "detection", "suppression", "fundamental"];

const T = {
  en: {
    eyebrow: "Ranking",
    title: "Which investigations matter most for the Moon?",
    intro: "Every investigation earns points on five criteria. You decide how much each criterion matters, and the ranking re-orders itself instantly.",
    steps: [
      ["1", "Each investigation is scored out of 100", "Points come from five criteria, each backed by facts in the Explorer."],
      ["2", "You choose what matters to your mission", "Pick a profile or slide each criterion from Ignore to Essential."],
      ["3", "The ranking updates live", "Colored segments show exactly where each score comes from."],
    ],
    profile: "Start from a profile",
    profiles: { balanced: "Balanced", lunar: "Lunar atmosphere first", realistic: "Realistic fuels first", data: "Most data first", custom: "Custom" } as Record<string, string>,
    profileHint: { balanced: "Default weights", lunar: "Does it test lunar-habitat oxygen and pressure?", realistic: "Does it burn real spacecraft materials?", data: "How many public files does PSI hold?" } as Record<string, string>,
    focus: "Focus area",
    all: "All areas",
    weights: "How much does each criterion matter?",
    ignore: "Ignore",
    essential: "Essential",
    counts: (p: number) => `counts for ${p}% of the score`,
    reset: "Reset",
    legend: "Score legend: each color is one criterion",
    outOf: "/ 100",
    strength: "Biggest source of points",
    pts: "pts",
    pending: "◌ Some conditions are not verified yet and count as neutral",
    shown: (n: number) => `${n} investigations`,
    howRead: "Reading a score: 70+ is High relevance, 50–69 Medium, below 50 Low. It is a prioritization aid built by JaPax from cited facts, not an official NASA metric.",
    mEyebrow: "Coverage matrix",
    mTitle: "Which environments has each investigation actually covered?",
    mText1: "Computed from the verified O₂ and pressure ranges only.",
    mText2: "conditions can never produce a “Covered” cell. Gravity is a separate question: nothing here was tested at lunar or Martian partial gravity.",
    inv: "Investigation",
    covered: "Covered",
    partial: "Partial",
  },
  es: {
    eyebrow: "Ranking",
    title: "¿Qué investigaciones importan más para la Luna?",
    intro: "Cada investigación gana puntos en cinco criterios. Tú decides cuánto importa cada criterio y el ranking se reordena al instante.",
    steps: [
      ["1", "Cada investigación se puntúa sobre 100", "Los puntos salen de cinco criterios, cada uno respaldado por hechos del Explorador."],
      ["2", "Tú eliges qué importa para tu misión", "Escoge un perfil o desliza cada criterio de Ignorar a Esencial."],
      ["3", "El ranking se actualiza en vivo", "Los segmentos de color muestran exactamente de dónde sale cada puntuación."],
    ],
    profile: "Empieza con un perfil",
    profiles: { balanced: "Equilibrado", lunar: "Atmósfera lunar primero", realistic: "Combustibles realistas primero", data: "Más datos primero", custom: "Personalizado" } as Record<string, string>,
    profileHint: { balanced: "Pesos por defecto", lunar: "¿Ensaya el oxígeno y la presión de un hábitat lunar?", realistic: "¿Quema materiales reales de nave?", data: "¿Cuántos archivos públicos tiene PSI?" } as Record<string, string>,
    focus: "Área de enfoque",
    all: "Todas las áreas",
    weights: "¿Cuánto importa cada criterio?",
    ignore: "Ignorar",
    essential: "Esencial",
    counts: (p: number) => `cuenta un ${p}% de la puntuación`,
    reset: "Restablecer",
    legend: "Leyenda de la puntuación: cada color es un criterio",
    outOf: "/ 100",
    strength: "Mayor fuente de puntos",
    pts: "pts",
    pending: "◌ Algunas condiciones aún no están verificadas y cuentan como neutras",
    shown: (n: number) => `${n} investigaciones`,
    howRead: "Cómo leer una puntuación: 70 o más es relevancia Alta, 50–69 Media, menos de 50 Baja. Es una ayuda de priorización creada por JaPax a partir de hechos citados, no una métrica oficial de NASA.",
    mEyebrow: "Matriz de cobertura",
    mTitle: "¿Qué entornos ha cubierto realmente cada investigación?",
    mText1: "Calculada solo con los rangos verificados de O₂ y presión.",
    mText2: "nunca producen una celda «Cubierto». La gravedad es otra cuestión: nada de esto se ensayó con la gravedad parcial de la Luna ni de Marte.",
    inv: "Investigación",
    covered: "Cubierto",
    partial: "Parcial",
  },
};

const COVER_STYLE = {
  full: "bg-[color:var(--a-suppression)]/25 text-ink",
  partial: "bg-[color:var(--warn)]/20 text-ink",
  none: "text-muted",
} as const;

const sameWeights = (a: Weights, b: Weights) => FACTORS.every((k) => a[k] === b[k]);

export default function Dashboard() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const info = factorInfo(lang);
  const [w, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const [area, setArea] = useState<"all" | Area>("all");

  const sum = FACTORS.reduce((s, k) => s + w[k], 0) || 1;
  const profile = Object.keys(PROFILES).find((k) => sameWeights(PROFILES[k], w)) ?? "custom";

  const ranked = useMemo(
    () =>
      data.investigations
        .filter((i) => area === "all" || i.areas.includes(area))
        .map((inv) => ({ inv, score: scoreInvestigation(inv, w) }))
        .sort((a, b) => b.score.total - a.score.total),
    [w, data, area],
  );
  const envs = data.environments.filter((e) => e.id !== "iss");
  const coverLabel = { full: t.covered, partial: t.partial, none: "—" } as const;

  const topFactor = (parts: Record<FactorKey, number>) => FACTORS.reduce((best, k) => (parts[k] > parts[best] ? k : best), FACTORS[0]);

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2">{t.intro}</p>

        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {t.steps.map(([n, h, b]) => (
            <li key={n} className="card flex gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold" style={{ color: "var(--accent)" }}>{n}</span>
              <div>
                <p className="font-medium">{h}</p>
                <p className="mt-0.5 text-sm text-ink-2">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 lg:grid-cols-[21rem_1fr]">
        {/* controls */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit" aria-label={t.weights}>
          <div className="card p-4">
            <h2 className="font-semibold">{t.profile}</h2>
            <div className="mt-3 grid gap-2">
              {(["balanced", "lunar", "realistic", "data"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setW(PROFILES[k])}
                  aria-pressed={profile === k}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${profile === k ? "border-accent bg-accent/15" : "border-line-2 hover:bg-surface-2"}`}
                >
                  <span className="block text-sm font-medium">{t.profiles[k]}</span>
                  <span className="block text-xs text-muted">{t.profileHint[k]}</span>
                </button>
              ))}
              {profile === "custom" && <p className="rounded-lg border border-dashed border-accent px-3 py-2 text-sm">{t.profiles.custom}</p>}
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.weights}</h2>
              <button onClick={() => setW(DEFAULT_WEIGHTS)} disabled={profile === "balanced"} className="text-xs text-flame disabled:text-muted">
                {t.reset}
              </button>
            </div>
            <div className="mt-4 space-y-5">
              {FACTORS.map((k) => {
                const share = Math.round((w[k] / sum) * 100);
                return (
                  <div key={k}>
                    <label htmlFor={`w-${k}`} className="flex items-center gap-2 text-sm font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: FACTOR_COLOR[k] }} aria-hidden="true" />
                      {info[k].label}
                    </label>
                    <input id={`w-${k}`} type="range" min={0} max={100} step={5} value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="mt-1.5 w-full" aria-valuetext={`${t.counts(share)}`} />
                    <div className="flex justify-between text-[11px] text-muted"><span>{t.ignore}</span><span>{t.essential}</span></div>
                    <p className="mt-0.5 text-xs">
                      <span className="font-semibold tabular-nums" style={{ color: FACTOR_COLOR[k] }}>{t.counts(share)}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{info[k].help}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ranking */}
        <div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.focus}>
            <span className="mr-1 text-sm text-muted">{t.focus}:</span>
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => setArea(a)}
                aria-pressed={area === a}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${area === a ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"}`}
              >
                {a === "all" ? t.all : areaLabel(a, lang)}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted" aria-live="polite">{t.shown(ranked.length)}</span>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label={t.legend}>
            {FACTORS.map((k) => (
              <li key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FACTOR_COLOR[k] }} aria-hidden="true" />
                {info[k].label}
              </li>
            ))}
          </ul>

          <ol className="mt-3 space-y-3">
            {ranked.map(({ inv, score }, idx) => {
              const best = topFactor(score.parts);
              return (
                <li key={inv.id} className="card p-4 transition-colors hover:bg-surface-2/50">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums text-ink-2">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Link href={`/explorer/${inv.id}`} className="text-lg font-semibold hover:underline">{inv.acronym}</Link>
                        <span className="tabular-nums">
                          <span className="text-2xl font-semibold">{score.total.toFixed(0)}</span>
                          <span className="text-sm text-muted"> {t.outOf} · {levelLabel(score.total, lang)}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {inv.areas.map((a) => (<AreaBadge key={a} area={a} />))}
                      </div>
                      <div className="mt-3">
                        <ScoreBar score={score} compact />
                      </div>
                      <p className="mt-2 text-xs text-ink-2">
                        {t.strength}: <span className="font-medium" style={{ color: FACTOR_COLOR[best] }}>{info[best].label}</span>{" "}
                        <span className="tabular-nums text-muted">(+{score.parts[best].toFixed(0)} {t.pts})</span>
                        {score.pending.length > 0 && <span className="ml-2 text-muted">{t.pending}</span>}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted">{t.howRead}</p>
        </div>
      </section>

      <Section eyebrow={t.mEyebrow} title={t.mTitle}>
        <p className="mt-3 max-w-3xl text-sm text-ink-2">
          {t.mText1} <Pending /> {t.mText2}
        </p>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="p-3 font-medium">{t.inv}</th>
                {envs.map((e) => (
                  <th key={e.id} className="p-3 font-medium">
                    {e.name}
                    <div className="text-xs font-normal">
                      {Math.round(e.o2 * 100)}% O₂ · {e.pressurePsi} psi
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.investigations.map((inv) => (
                <tr key={inv.id} className="border-t border-line">
                  <th className="p-3 font-medium">
                    <Link href={`/explorer/${inv.id}`} className="hover:underline">{inv.acronym}</Link>
                  </th>
                  {envs.map((e) => {
                    const c = coversEnvironment(inv, e);
                    return (
                      <td key={e.id} className="p-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${COVER_STYLE[c]}`}>{coverLabel[c]}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
