"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData, useLang, useT } from "@/lib/i18n";
import {
  DEFAULT_WEIGHTS,
  FACTORS,
  coversEnvironment,
  factorInfo,
  levelLabel,
  scoreInvestigation,
  type Weights,
} from "@/lib/scoring";
import ScoreBar from "@/components/ScoreBar";
import { Pending, Section } from "@/components/ui";

const T = {
  en: {
    eyebrow: "Ranking",
    title: "Which investigations matter most for the Moon?",
    intro: "An explainable score, not a black box: every bar shows how much each factor contributes. Change the weights to match your mission (a materials engineer and a detector designer will not rank the same way).",
    weights: "Weights",
    reset: "Reset",
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
    intro: "Una puntuación explicable, no una caja negra: cada barra muestra cuánto aporta cada factor. Cambia los pesos para adaptarlos a tu misión (un ingeniero de materiales y un diseñador de detectores no ordenarán igual).",
    weights: "Pesos",
    reset: "Restablecer",
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

export default function Dashboard() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const info = factorInfo(lang);
  const [w, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const ranked = useMemo(
    () =>
      data.investigations
        .map((inv) => ({ inv, score: scoreInvestigation(inv, w) }))
        .sort((a, b) => b.score.total - a.score.total),
    [w, data],
  );
  const max = ranked[0]?.score.total ?? 100;
  const envs = data.environments.filter((e) => e.id !== "iss");
  const changed = FACTORS.some((k) => w[k] !== DEFAULT_WEIGHTS[k]);
  const coverLabel = { full: t.covered, partial: t.partial, none: "—" } as const;

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-3xl text-ink-2">{t.intro}</p>
      </div>

      <section className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 lg:grid-cols-[18rem_1fr]">
        <aside className="card h-fit p-4 lg:sticky lg:top-20" aria-label={t.weights}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t.weights}</h2>
            <button onClick={() => setW(DEFAULT_WEIGHTS)} disabled={!changed} className="text-xs text-flame disabled:text-muted">
              {t.reset}
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {FACTORS.map((k) => (
              <div key={k}>
                <label className="flex items-baseline justify-between text-sm" htmlFor={`w-${k}`}>
                  <span>{info[k].label}</span>
                  <span className="tabular-nums text-ink-2">{w[k]}</span>
                </label>
                <input
                  id={`w-${k}`}
                  type="range"
                  min={0}
                  max={60}
                  value={w[k]}
                  onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
                  className="mt-1 w-full"
                />
                <p className="mt-0.5 text-xs text-muted">{info[k].help}</p>
              </div>
            ))}
          </div>
        </aside>

        <ol className="space-y-3">
          {ranked.map(({ inv, score }, idx) => (
            <li key={inv.id} className="card p-4">
              <div className="flex items-center gap-4">
                <span className="w-6 text-right text-sm tabular-nums text-muted">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/explorer/${inv.id}`} className="truncate font-semibold hover:underline">
                      {inv.acronym}
                    </Link>
                    <span className="shrink-0 tabular-nums">
                      <span className="text-xl font-semibold">{score.total.toFixed(0)}</span>
                      <span className="ml-1 text-xs text-muted">{levelLabel(score.total, lang)}</span>
                    </span>
                  </div>
                  <div className="mt-2" style={{ width: `${Math.max(8, (score.total / max) * 100)}%` }}>
                    <ScoreBar score={score} compact />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
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
                    <Link href={`/explorer/${inv.id}`} className="hover:underline">
                      {inv.acronym}
                    </Link>
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
