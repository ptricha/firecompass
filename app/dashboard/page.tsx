"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { data } from "@/lib/data";
import {
  DEFAULT_WEIGHTS,
  FACTORS,
  FACTOR_INFO,
  coversEnvironment,
  level,
  scoreInvestigation,
  type Weights,
} from "@/lib/scoring";
import ScoreBar from "@/components/ScoreBar";
import { Pending, Section } from "@/components/ui";

const COVER_LABEL = { full: "Covered", partial: "Partial", none: "—" } as const;
const COVER_STYLE = {
  full: "bg-[color:var(--a-suppression)]/25 text-ink",
  partial: "bg-[color:var(--warn)]/20 text-ink",
  none: "text-muted",
} as const;

export default function Dashboard() {
  const [w, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const ranked = useMemo(
    () =>
      data.investigations
        .map((inv) => ({ inv, score: scoreInvestigation(inv, w) }))
        .sort((a, b) => b.score.total - a.score.total),
    [w],
  );
  const max = ranked[0]?.score.total ?? 100;
  const envs = data.environments.filter((e) => e.id !== "iss");
  const changed = FACTORS.some((k) => w[k] !== DEFAULT_WEIGHTS[k]);

  return (
    <div className="pb-4">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <p className="eyebrow">Ranking</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Which investigations matter most for the Moon?</h1>
        <p className="mt-3 max-w-3xl text-ink-2">
          An explainable score, not a black box: every bar shows how much each factor contributes. Change the weights to
          match your mission (a materials engineer and a detector designer will not rank the same way).
        </p>
      </div>

      <section className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 lg:grid-cols-[18rem_1fr]">
        <aside className="card h-fit p-4 lg:sticky lg:top-20" aria-label="Score weights">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Weights</h2>
            <button
              onClick={() => setW(DEFAULT_WEIGHTS)}
              disabled={!changed}
              className="text-xs text-flame disabled:text-muted"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {FACTORS.map((k) => (
              <div key={k}>
                <label className="flex items-baseline justify-between text-sm" htmlFor={`w-${k}`}>
                  <span>{FACTOR_INFO[k].label}</span>
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
                <p className="mt-0.5 text-xs text-muted">{FACTOR_INFO[k].help}</p>
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
                      <span className="ml-1 text-xs text-muted">{level(score.total)}</span>
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

      <Section eyebrow="Coverage matrix" title="Which environments has each investigation actually covered?">
        <p className="mt-3 max-w-3xl text-sm text-ink-2">
          Computed from the verified O₂ and pressure ranges only. <Pending /> conditions can never produce a “Covered”
          cell. Gravity is a separate question: nothing here was tested at lunar or Martian partial gravity.
        </p>
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="p-3 font-medium">Investigation</th>
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
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${COVER_STYLE[c]}`}>{COVER_LABEL[c]}</span>
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
