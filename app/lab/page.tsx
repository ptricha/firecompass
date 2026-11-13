"use client";

import { useMemo, useState } from "react";
import lab from "@/data/lab.json";
import { Pending, SourceTag } from "@/components/ui";

type FlexRow = (typeof lab.flex.rows)[number];
const ROWS: FlexRow[] = lab.flex.rows;
const OUTCOME = {
  Extinction: { color: "var(--a-detection)", label: "Extinction", shape: "circle" },
  Completion: { color: "var(--a-prevention)", label: "Completion", shape: "diamond" },
  Disruption: { color: "var(--a-fundamental)", label: "Disruption", shape: "triangle" },
} as const;
type Outcome = keyof typeof OUTCOME;

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const hash = (n: number) => ((n * 2654435761) % 1000) / 1000; // deterministic jitter

function Mark({ cx, cy, o, r = 5, active }: { cx: number; cy: number; o: Outcome; r?: number; active?: boolean }) {
  const c = OUTCOME[o];
  const common = { fill: c.color, fillOpacity: active ? 1 : 0.7, stroke: active ? "var(--ink)" : "var(--surface)", strokeWidth: active ? 2 : 1 };
  if (c.shape === "circle") return <circle cx={cx} cy={cy} r={r} {...common} />;
  if (c.shape === "diamond") return <path d={`M${cx} ${cy - r - 1}l${r + 1} ${r + 1}l-${r + 1} ${r + 1}l-${r + 1} -${r + 1}z`} {...common} />;
  return <path d={`M${cx} ${cy - r - 1}l${r + 1} ${2 * r}h-${2 * r + 2}z`} {...common} />;
}

/* ---------- FLEX scatter: O2 vs suppressant fraction ---------- */
function Scatter({ rows, onPick, picked }: { rows: FlexRow[]; onPick: (r: FlexRow | null) => void; picked: FlexRow | null }) {
  const W = 720, H = 400, m = { l: 58, r: 20, t: 20, b: 48 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const X0 = 0.11, X1 = 0.35, Y1 = 0.75;
  const x = (v: number) => m.l + ((v - X0) / (X1 - X0)) * pw;
  const y = (v: number) => m.t + ph - (v / Y1) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="FLEX tests: oxygen fraction versus added suppressant fraction, colored by test outcome">
      {[0.12, 0.16, 0.2, 0.24, 0.28, 0.32].map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={m.t} y2={m.t + ph} stroke="var(--line)" />
          <text x={x(v)} y={H - m.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">{Math.round(v * 100)}%</text>
        </g>
      ))}
      {[0, 0.2, 0.4, 0.6].map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <rect x={x(0.265)} y={m.t} width={x(X1) - x(0.265)} height={ph} fill="rgba(255,138,76,0.07)" />
      <line x1={x(0.265)} x2={x(0.265)} y1={m.t} y2={m.t + ph} stroke="var(--accent)" strokeDasharray="5 4" />
      <text x={x(0.265) + 6} y={m.t + 14} fontSize="11" fill="var(--accent)">Lunar habitat O₂ (≥ 26.5%)</text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">Oxygen in the ambient gas (mole fraction)</text>
      <text transform={`translate(14 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">Added suppressant: CO₂ + He (mole fraction)</text>
      {rows.map((r) => {
        if (r.o2 == null) return null;
        const s = (r.co2 ?? 0) + (r.he ?? 0);
        const cx = x(r.o2) + (hash(r.n ?? 0) - 0.5) * 7;
        const cy = y(s) + (hash((r.n ?? 0) + 7) - 0.5) * 7;
        const act = picked?.n === r.n;
        return (
          <g key={r.n} tabIndex={0} role="button" aria-label={`Test ${r.n}, ${r.fuel}, ${r.end}`} style={{ cursor: "pointer", outline: "none" }}
             onMouseEnter={() => onPick(r)} onFocus={() => onPick(r)} onClick={() => onPick(r)}>
            <Mark cx={cx} cy={cy} o={r.end as Outcome} active={act} />
            <title>{`Test ${r.n} · ${r.fuel} · ${pct(r.o2)} O₂ · suppressant ${pct(s)} · ${r.end}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- extinction share by O2 bin ---------- */
const BINS: [number, number][] = [[0.12, 0.15], [0.15, 0.18], [0.18, 0.21], [0.21, 0.24], [0.24, 0.27], [0.27, 0.3], [0.3, 0.35]];
function Bins({ rows }: { rows: FlexRow[] }) {
  const data = BINS.map(([a, b]) => {
    const r = rows.filter((x) => x.o2 != null && x.o2 >= a - 1e-9 && x.o2 < b - 1e-9);
    return { a, b, n: r.length, ext: r.filter((x) => x.end === "Extinction").length };
  });
  return (
    <ul className="space-y-2" aria-label="Share of tests that ended in extinction, by oxygen range">
      {data.map((d) => (
        <li key={d.a} className="grid grid-cols-[6.5rem_1fr_6rem] items-center gap-3 text-sm">
          <span className="text-ink-2">{Math.round(d.a * 100)}–{Math.round(d.b * 100)}% O₂</span>
          <div className="h-4 rounded bg-surface-2" role="img" aria-label={d.n ? `${d.ext} of ${d.n} ended in extinction` : "no tests"}>
            {d.n > 0 && (
              <div className="h-4 rounded" style={{ width: `${(d.ext / d.n) * 100}%`, background: "var(--a-detection)", opacity: d.n < 5 ? 0.45 : 1, minWidth: d.ext ? 3 : 0 }} />
            )}
          </div>
          <span className="tabular-nums text-xs text-muted">{d.n ? `${d.ext}/${d.n}${d.n < 5 ? " · low n" : ""}` : "no tests"}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- nearest test finder ---------- */
const PRESETS = [
  { label: "Earth air", fuel: "Methanol", o2: 21, p: 1.0, co2: 0, he: 0 },
  { label: "Lunar habitat, no suppressant", fuel: "Methanol", o2: 30, p: 0.7, co2: 0, he: 0 },
  { label: "Lunar habitat + 20% CO₂", fuel: "Methanol", o2: 30, p: 0.7, co2: 20, he: 0 },
  { label: "Spacesuit (100% O₂, 0.29 atm)", fuel: "Heptane", o2: 100, p: 0.29, co2: 0, he: 0 },
];

function Finder() {
  const [q, setQ] = useState(PRESETS[1]);
  const res = useMemo(() => {
    const set = ROWS.filter((r) => r.fuel === q.fuel && r.o2 != null && r.pAtm);
    const rng = (f: (r: FlexRow) => number) => { const v = set.map(f); return [Math.min(...v), Math.max(...v)] as const; };
    const [o0, o1] = rng((r) => r.o2!);
    const [p0, p1] = rng((r) => r.pAtm!);
    const c1 = Math.max(...set.map((r) => r.co2 ?? 0));
    const h1 = Math.max(...set.map((r) => r.he ?? 0));
    const issues: string[] = [];
    if (q.o2 / 100 < o0 - 1e-9 || q.o2 / 100 > o1 + 1e-9) issues.push(`O₂ ${q.o2}% (measured ${pct(o0)}–${pct(o1)})`);
    if (q.p < p0 * 0.97 || q.p > p1 * 1.03) issues.push(`pressure ${q.p} atm (measured ${p0.toFixed(2)}–${p1.toFixed(2)})`);
    if (q.co2 / 100 > c1 + 1e-9) issues.push(`CO₂ ${q.co2}% (measured up to ${pct(c1)})`);
    if (q.he / 100 > h1 + 1e-9) issues.push(`He ${q.he}% (measured up to ${pct(h1)})`);
    const dist = (r: FlexRow) =>
      Math.hypot(
        (r.o2! - q.o2 / 100) / (o1 - o0 || 1),
        (r.pAtm! - q.p) / (p1 - p0 || 1),
        ((r.co2 ?? 0) - q.co2 / 100) / (c1 || 1),
        ((r.he ?? 0) - q.he / 100) / (h1 || 1),
      );
    const near = set.map((r) => ({ r, d: dist(r) })).sort((a, b) => a.d - b.d).slice(0, 5);
    return { near, issues, n: set.length };
  }, [q]);

  const field = (label: string, key: "o2" | "p" | "co2" | "he", step: number, unit: string) => (
    <label className="text-sm">
      <span className="text-ink-2">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        <input type="number" step={step} min={0} value={q[key]}
          onChange={(e) => setQ({ ...q, [key]: Number(e.target.value) })}
          className="w-24 rounded-lg border border-line-2 bg-surface px-2 py-1.5" />
        <span className="text-xs text-muted">{unit}</span>
      </div>
    </label>
  );

  const extN = res.near.filter((x) => x.r.end === "Extinction").length;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => setQ(p)} className="rounded-full border border-line-2 px-3 py-1 text-xs text-ink-2 hover:text-ink">{p.label}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="text-ink-2">Fuel</span>
          <select value={q.fuel} onChange={(e) => setQ({ ...q, fuel: e.target.value })} className="mt-1 block rounded-lg border border-line-2 bg-surface px-2 py-1.5">
            <option>Methanol</option><option>Heptane</option>
          </select>
        </label>
        {field("Oxygen", "o2", 1, "%")}
        {field("Pressure", "p", 0.05, "atm")}
        {field("CO₂ added", "co2", 5, "%")}
        {field("He added", "he", 5, "%")}
      </div>

      {res.issues.length > 0 ? (
        <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--warn)" }} role="alert">
          <p className="font-medium">Outside the measured range: no prediction, no extrapolation.</p>
          <p className="mt-1 text-ink-2">Your input is outside what was actually tested: {res.issues.join("; ")}. The tests below are the closest measured ones, shown for reference only.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-2">
          Among the 5 closest measured tests, <strong className="text-ink">{extN}</strong> ended in extinction. This is a description of
          nearby measurements, not a prediction.
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-muted"><tr><th className="py-1 pr-3">Test</th><th className="pr-3">O₂</th><th className="pr-3">Pressure</th><th className="pr-3">CO₂ / He</th><th className="pr-3">Outcome</th><th>Distance</th></tr></thead>
          <tbody>
            {res.near.map(({ r, d }) => (
              <tr key={r.n} className="border-t border-line">
                <td className="py-1.5 pr-3">#{r.n} <span className="text-xs text-muted">{r.id}</span></td>
                <td className="pr-3">{pct(r.o2!)}</td>
                <td className="pr-3">{r.pAtm!.toFixed(2)} atm</td>
                <td className="pr-3">{pct(r.co2 ?? 0)} / {pct(r.he ?? 0)}</td>
                <td className="pr-3"><span style={{ color: OUTCOME[r.end as Outcome].color }}>●</span> {r.end}</td>
                <td className="tabular-nums text-muted">{d.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function Lab() {
  const [fuel, setFuel] = useState("All");
  const [supp, setSupp] = useState("All");
  const [press, setPress] = useState("All");
  const [picked, setPicked] = useState<FlexRow | null>(null);

  const rows = useMemo(
    () =>
      ROWS.filter((r) => r.o2 != null && r.pAtm).filter((r) => {
        if (fuel !== "All" && r.fuel !== fuel) return false;
        const s = (r.co2 ?? 0) + (r.he ?? 0);
        if (supp === "None" && s > 0) return false;
        if (supp === "CO2" && !(r.co2 && r.co2 > 0)) return false;
        if (supp === "He" && !(r.he && r.he > 0)) return false;
        if (press === "Lunar-like" && !(r.pAtm! >= 0.6 && r.pAtm! <= 0.8)) return false;
        if (press === "1 atm" && !(r.pAtm! >= 0.9 && r.pAtm! <= 1.1)) return false;
        if (press === "Above 1 atm" && !(r.pAtm! > 1.2)) return false;
        return true;
      }),
    [fuel, supp, press],
  );
  const counts = (["Extinction", "Completion", "Disruption"] as Outcome[]).map((o) => ({ o, n: rows.filter((r) => r.end === o).length }));
  const lunar = ROWS.filter((r) => r.pAtm && r.pAtm >= 0.6 && r.pAtm <= 0.8 && r.o2 != null && r.o2 >= 0.265);

  // BASS-II
  const b = lab.bass2.rows;
  const hist = Array.from({ length: 15 }, (_, i) => 13 + i).map((v) => ({ v, n: b.filter((r) => r.o2Initial != null && Math.round(r.o2Initial) === v).length }));
  const maxH = Math.max(...hist.map((h) => h.n));
  const byPi = Object.entries(b.reduce<Record<string, number>>((a, r) => ((a[r.pi ?? "?"] = (a[r.pi ?? "?"] ?? 0) + 1), a), {})).sort((a, c) => c[1] - a[1]);
  const mats = Object.entries(b.reduce<Record<string, number>>((a, r) => ((a[r.material || "unspecified"] = (a[r.material || "unspecified"] ?? 0) + 1), a), {})).sort((a, c) => c[1] - a[1]).slice(0, 8);

  const sel = (label: string, val: string, set: (v: string) => void, opts: string[]) => (
    <label className="text-sm text-ink-2">
      {label}
      <select value={val} onChange={(e) => set(e.target.value)} className="ml-2 rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-ink">
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-10">
      <p className="eyebrow">Data Lab</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Real flight data, no extrapolation</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        Every point below is a recorded test from NASA&apos;s PSI experimental tables (CC0): <strong className="text-ink">FLEX, PSI-69, {ROWS.length} tests</strong> and{" "}
        <strong className="text-ink">BASS-II, PSI-25, {b.length} tests</strong>. Counts and percentages are computed from those rows; nothing is modeled.
      </p>

      {/* headline facts */}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>{lunar.length}</p>
          <p className="mt-1 text-sm text-ink-2">FLEX tests at lunar-habitat-like pressure (0.6–0.8 atm) and O₂ ≥ 26.5%.</p>
          <p className="mt-1 text-xs text-muted">
            {lunar.filter((r) => r.end === "Extinction").length} ended in extinction · {lunar.filter((r) => r.end === "Disruption").length} disruption · {lunar.filter((r) => r.end === "Completion").length} completion
          </p>
          <p className="mt-1 text-xs text-muted">
            Tests with CO₂ or He added: {lunar.filter((r) => (r.co2 ?? 0) + (r.he ?? 0) > 0).length}. Too few tests to generalize.
          </p>
        </div>
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>0 of {b.length}</p>
          <p className="mt-1 text-sm text-ink-2">BASS-II tests started at 26.5% O₂ or more (initial O₂ 13.6–22.2%).</p>
          <p className="mt-1 text-xs text-muted">Solid materials are untested in microgravity at lunar-habitat oxygen.</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>0</p>
          <p className="mt-1 text-sm text-ink-2">tests at partial gravity (Moon 0.166 g, Mars 0.38 g).</p>
          <p className="mt-1 text-xs text-muted">LUCI and FM2 are expected to provide the first data.</p>
        </div>
      </div>

      {/* FLEX */}
      <section className="mt-12" aria-labelledby="flex">
        <h2 id="flex" className="text-xl font-semibold">FLEX: when does a burning droplet go out?</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          FLEX burned heptane and methanol droplets in oxygen–nitrogen mixtures, sometimes with CO₂ or helium added as suppressant.
          Each test ended in extinction (flame went out), completion (droplet burned away) or disruption (as labeled by PSI).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {sel("Fuel", fuel, setFuel, ["All", "Methanol", "Heptane"])}
          {sel("Suppressant", supp, setSupp, ["All", "None", "CO2", "He"])}
          {sel("Pressure", press, setPress, ["All", "Lunar-like", "1 atm", "Above 1 atm"])}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-2" aria-live="polite">
          <span className="text-ink">{rows.length} tests shown</span>
          {counts.map(({ o, n }) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><Mark cx={6} cy={6} o={o} r={3.5} /></svg>
              {OUTCOME[o].label} {n}
            </span>
          ))}
        </div>
        <div className="card mt-3 p-3 sm:p-5">
          <Scatter rows={rows} onPick={setPicked} picked={picked} />
          <div className="mt-3 min-h-[3.5rem] rounded-lg border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
            {picked ? (
              <p>
                <strong>Test #{picked.n}</strong> ({picked.id}, {picked.date}) · {picked.fuel} · O₂ {pct(picked.o2!)} · {picked.pAtm!.toFixed(2)} atm · CO₂ {pct(picked.co2 ?? 0)} · He {pct(picked.he ?? 0)} ·
                droplet {picked.d0 ?? "n/a"} mm · outcome <strong>{picked.end}</strong>
              </p>
            ) : (
              <p className="text-ink-2">Hover or focus a point to see the recorded test. Points are slightly jittered so overlapping tests stay visible.</p>
            )}
          </div>
        </div>

        <h3 className="mt-8 font-semibold">Share of tests that ended in extinction, by oxygen level</h3>
        <p className="mt-1 text-sm text-ink-2">Respects the filters above. Bars with fewer than 5 tests are dimmed: treat them as anecdotes.</p>
        <div className="card mt-3 p-4"><Bins rows={rows} /></div>
      </section>

      {/* Finder */}
      <section className="mt-12" aria-labelledby="find">
        <h2 id="find" className="text-xl font-semibold">Find the closest measured test</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          Enter conditions and see which real tests are nearest. If your conditions fall outside the measured range, FireCompass refuses to guess.
          Try the spacesuit preset to see the guard.
        </p>
        <div className="mt-4"><Finder /></div>
      </section>

      {/* BASS-II */}
      <section className="mt-12" aria-labelledby="bass">
        <h2 id="bass" className="text-xl font-semibold">BASS-II: what oxygen levels were tested on solids?</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">
          Initial oxygen (% by volume) of the {b.length} recorded tests, rounded to whole percent. The dashed line marks the 26.5% planned for lunar habitats.
        </p>
        <div className="card mt-4 p-4 sm:p-5">
          <svg viewBox="0 0 720 280" className="h-auto w-full" role="img" aria-label="Histogram of BASS-II initial oxygen percentage; no tests above 22 percent">
            {hist.map((h, i) => {
              const x0 = 40 + i * 44;
              const hh = (h.n / maxH) * 190;
              return (
                <g key={h.v}>
                  <rect x={x0} y={230 - hh} width="36" height={hh} rx="4" fill="var(--a-prevention)" />
                  {h.n > 0 && <text x={x0 + 18} y={222 - hh} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{h.n}</text>}
                  <text x={x0 + 18} y={250} textAnchor="middle" fontSize="11" fill="var(--muted)">{h.v}%</text>
                  <title>{`${h.v}% initial O₂: ${h.n} tests`}</title>
                </g>
              );
            })}
            {/* 26.5% on the same scale as the bars: bin v is centered at 40 + (v-13)*44 + 18 */}
            <line x1={40 + 13.5 * 44 + 18} x2={40 + 13.5 * 44 + 18} y1="20" y2="232" stroke="var(--accent)" strokeDasharray="5 4" />
            <text x={40 + 13.5 * 44 + 10} y="34" textAnchor="end" fontSize="11" fill="var(--accent)">Lunar habitat ≥ 26.5%</text>
            <text x={40 + 13.5 * 44 + 10} y="50" textAnchor="end" fontSize="11" fill="var(--ink-2)">no BASS-II tests at or above this line</text>
            <line x1="36" x2="700" y1="231" y2="231" stroke="var(--line-2)" />
            <text x="368" y="272" textAnchor="middle" fontSize="12" fill="var(--ink-2)">Initial oxygen, % by volume</text>
          </svg>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Tests by principal investigator</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">{byPi.map(([k, n]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{n}</span></li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Most-tested samples</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">{mats.map(([k, n]) => <li key={k} className="flex justify-between gap-3"><span className="truncate">{k}</span><span className="tabular-nums">{n}</span></li>)}</ul>
            </div>
          </div>
        </div>
        <details className="card mt-4 p-4 text-sm">
          <summary className="cursor-pointer font-medium">View the raw BASS-II rows ({b.length})</summary>
          <div className="mt-3 max-h-96 overflow-auto">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="sticky top-0 bg-surface text-muted"><tr><th className="py-1 pr-3">Test</th><th className="pr-3">PI</th><th className="pr-3">Sample</th><th className="pr-3">Initial O₂ %</th><th className="pr-3">Final O₂ %</th><th>Air (as recorded)</th></tr></thead>
              <tbody>{b.map((r) => <tr key={r.test} className="border-t border-line"><td className="py-1 pr-3">{r.test}</td><td className="pr-3">{r.pi}</td><td className="pr-3">{r.material}</td><td className="pr-3">{r.o2Initial ?? "—"}</td><td className="pr-3">{r.o2Final ?? "—"}</td><td>{r.air ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </section>

      {/* Method */}
      <section className="mt-12" aria-labelledby="method">
        <h2 id="method" className="text-xl font-semibold">Method and limits</h2>
        <ul className="card mt-3 space-y-2 p-4 text-sm text-ink-2">
          <li><strong className="text-ink">Source.</strong> PSI experimental tables, public domain (CC0), files verified byte-for-byte against NASA&apos;s published sizes (24,776 and 16,590 bytes). <SourceTag src="PSI-TABLES" /></li>
          <li><strong className="text-ink">Column naming.</strong> {lab.flex.columnNotes.o2} {lab.flex.columnNotes.co2}</li>
          <li><strong className="text-ink">Data quality.</strong> FLEX test 114 records a pressure of 0 (an invalid code) and is excluded from the pressure-based views. Six tests list compositions summing to 0.98, a rounding effect in the source.</li>
          <li><strong className="text-ink">What this is not.</strong> A flammability <Pending>prediction</Pending>. Test outcomes depend on more than the variables shown (droplet size, hardware, procedure), and an outcome label like &quot;disruption&quot; is reported as recorded, not reinterpreted.</li>
          <li><strong className="text-ink">Partial gravity.</strong> All tests are microgravity. Nothing here applies to lunar or Martian gravity without new data.</li>
        </ul>
      </section>
    </div>
  );
}
