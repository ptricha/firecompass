"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { data, AREA_LABEL, fmtRange, type Area, type Investigation } from "@/lib/data";
import { DEFAULT_WEIGHTS, level, scoreInvestigation } from "@/lib/scoring";
import { AreaBadge, Pending } from "@/components/ui";
import ScoreBar from "@/components/ScoreBar";

const AREAS: ("all" | Area)[] = ["all", "prevention", "detection", "suppression", "fundamental"];
type Sort = "score" | "name" | "files";

const o2Text = (c: Investigation) => {
  const r = fmtRange(c.conditions.o2, "", 100);
  return r ? `${r.trim()}%` : null;
};

function Cell({ inv }: { inv: Investigation }) {
  const o2 = o2Text(inv);
  const p = fmtRange(inv.conditions.pressureAtm, "atm");
  const f = fmtRange(inv.conditions.flowCmS, "cm/s");
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted">O₂</dt>
      <dd>{o2 ?? <Pending />}</dd>
      <dt className="text-muted">Pressure</dt>
      <dd>{p ?? <Pending />}</dd>
      <dt className="text-muted">Airflow</dt>
      <dd>{f ?? <Pending />}</dd>
    </dl>
  );
}

export default function Explorer() {
  const [area, setArea] = useState<"all" | Area>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("score");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.investigations
      .filter((i) => area === "all" || i.areas.includes(area))
      .filter(
        (i) =>
          !t ||
          [i.acronym, i.title, i.psiId, i.summary, ...i.fuels, ...i.sensors].join(" ").toLowerCase().includes(t),
      )
      .map((i) => ({ inv: i, score: scoreInvestigation(i, DEFAULT_WEIGHTS) }))
      .sort((a, b) =>
        sort === "score"
          ? b.score.total - a.score.total
          : sort === "files"
            ? b.inv.files.total - a.inv.files.total
            : a.inv.acronym.localeCompare(b.inv.acronym),
      );
  }, [area, q, sort]);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const compare = data.investigations.filter((i) => picked.includes(i.id));

  const compareRows: [string, (c: Investigation) => string][] = [
    ["Fuel phase", (c) => c.fuelPhase],
    ["Fuels", (c) => (c.fuels.length ? c.fuels.join(", ") : "Not verified")],
    ["O₂", (c) => o2Text(c) ?? "Not verified"],
    ["Pressure", (c) => fmtRange(c.conditions.pressureAtm, "atm") ?? "Not verified"],
    ["Airflow speed", (c) => fmtRange(c.conditions.flowCmS, "cm/s") ?? "Not verified"],
    ["Sensors", (c) => (c.sensors.length ? c.sensors.join(", ") : "Not verified")],
    ["Hardware", (c) => c.hardware ?? "—"],
    ["Files in PSI", (c) => `${c.files.total.toLocaleString("en")} (${c.files.videos} videos)`],
    ["Lunar relevance", (c) => `${scoreInvestigation(c).total.toFixed(0)} / 100`],
    ["DOI", (c) => c.doi ?? "—"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <p className="eyebrow">Explorer</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">NASA combustion investigations</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        {data.investigations.length} investigations from the PSI repository, with their test conditions, findings and
        sources. Tick up to three to compare them side by side. <Pending /> marks data that is not yet verified.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter by area" className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              aria-pressed={area === a}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                area === a ? "border-accent bg-accent/15 text-ink" : "border-line-2 text-ink-2 hover:text-ink"
              }`}
            >
              {a === "all" ? "All" : AREA_LABEL[a]}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: PMMA, smoke, heptane…"
          aria-label="Search investigations"
          className="min-w-[14rem] flex-1 rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm placeholder:text-muted"
        />
        <label className="flex items-center gap-2 text-sm text-ink-2">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-line-2 bg-surface px-2 py-2 text-ink"
          >
            <option value="score">Lunar relevance</option>
            <option value="files">Data available</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        {rows.length} results
      </p>

      <ul className="mt-3 grid gap-4 md:grid-cols-2">
        {rows.map(({ inv, score }) => {
          const on = picked.includes(inv.id);
          return (
            <li key={inv.id} className={`card flex flex-col p-5 ${on ? "ring-1 ring-accent" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/explorer/${inv.id}`} className="text-lg font-semibold hover:underline">
                    {inv.acronym}
                  </Link>
                  <p className="text-xs text-muted">
                    {inv.psiId} · {inv.fuelPhase}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold tabular-nums">{score.total.toFixed(0)}</div>
                  <div className="text-xs text-muted">{level(score.total)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {inv.areas.map((a) => (
                  <AreaBadge key={a} area={a} />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm text-ink-2">{inv.summary}</p>
              <div className="mt-3">
                <ScoreBar score={score} compact />
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <Cell inv={inv} />
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
                  <input type="checkbox" checked={on} onChange={() => toggle(inv.id)} disabled={!on && picked.length >= 3} />
                  Compare
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      {compare.length >= 2 && (
        <section className="card mt-10 overflow-x-auto p-4" aria-label="Investigation comparison">
          <h2 className="text-lg font-semibold">Comparison</h2>
          <table className="mt-3 w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="w-40 py-2 pr-3 font-medium">Attribute</th>
                {compare.map((c) => (
                  <th key={c.id} className="py-2 pr-3 font-semibold text-ink">
                    {c.acronym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="align-top text-ink-2">
              {compareRows.map(([label, fn]) => (
                <tr key={label} className="border-t border-line">
                  <th className="py-2 pr-3 font-medium text-muted">{label}</th>
                  {compare.map((c) => (
                    <td key={c.id} className="py-2 pr-3">
                      {fn(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
