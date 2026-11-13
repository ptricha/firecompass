"use client";

import { useMemo, useState } from "react";
import lab from "@/data/lab.json";
import { useLang, useT } from "@/lib/i18n";
import { Pending, SourceTag } from "@/components/ui";
import FlameLab from "@/components/FlameLab";

type FlexRow = (typeof lab.flex.rows)[number];
const ROWS: FlexRow[] = lab.flex.rows;
const OUTCOME = {
  Extinction: { color: "var(--a-detection)", shape: "circle" },
  Completion: { color: "var(--a-prevention)", shape: "diamond" },
  Disruption: { color: "var(--a-fundamental)", shape: "triangle" },
} as const;
type Outcome = keyof typeof OUTCOME;

const T = {
  en: {
    outcome: { Extinction: "Extinction", Completion: "Completion", Disruption: "Disruption" } as Record<Outcome, string>,
    eyebrow: "Data Lab",
    title: "Real flight data, no extrapolation",
    intro: (n: number, b: number) => [`Every point below is a recorded test from NASA's PSI experimental tables (CC0): `, `FLEX, PSI-69, ${n} tests`, ` and `, `BASS-II, PSI-25, ${b} tests`, `. Counts and percentages are computed from those rows; nothing is modeled.`],
    h1: "FLEX tests at lunar-habitat-like pressure (0.6–0.8 atm) and O₂ ≥ 26.5%.",
    h1a: "ended in extinction",
    h1b: "disruption",
    h1c: "completion",
    h1d: (n: number) => `Tests with CO₂ or He added: ${n}. Too few tests to generalize.`,
    h2: (b: number) => `0 of ${b}`,
    h2t: "BASS-II tests started at 26.5% O₂ or more (initial O₂ 13.6–22.2%).",
    h2n: "Solid materials are untested in microgravity at lunar-habitat oxygen.",
    h3t: "tests at partial gravity (Moon 0.166 g, Mars 0.38 g).",
    h3n: "LUCI and FM2 are expected to provide the first data.",
    flexH: "FLEX: when does a burning droplet go out?",
    flexP: "FLEX burned heptane and methanol droplets in oxygen–nitrogen mixtures, sometimes with CO₂ or helium added as suppressant. Each test ended in extinction (flame went out), completion (droplet burned away) or disruption (as labeled by PSI).",
    fuel: "Fuel",
    supp: "Suppressant",
    press: "Pressure",
    all: "All",
    none: "None",
    lunarLike: "Lunar-like",
    above1: "Above 1 atm",
    shown: "tests shown",
    pickHint: "Hover or focus a point to see the recorded test. Points are slightly jittered so overlapping tests stay visible.",
    pickTest: "Test",
    droplet: "droplet",
    outcomeWord: "outcome",
    sAria: "FLEX tests: oxygen fraction versus added suppressant fraction, colored by test outcome",
    sX: "Oxygen in the ambient gas (mole fraction)",
    sY: "Added suppressant: CO₂ + He (mole fraction)",
    sHab: "Lunar habitat O₂ (≥ 26.5%)",
    suppShort: "suppressant",
    binsH: "Share of tests that ended in extinction, by oxygen level",
    binsP: "Respects the filters above. Bars with fewer than 5 tests are dimmed: treat them as anecdotes.",
    binsAria: "Share of tests that ended in extinction, by oxygen range",
    noTests: "no tests",
    lowN: "low n",
    endedIn: "ended in extinction",
    finderH: "Find the closest measured test",
    finderP: "Enter conditions and see which real tests are nearest. If your conditions fall outside the measured range, JaPax refuses to guess. Try the spacesuit preset to see the guard.",
    presets: ["Earth air", "Lunar habitat, no suppressant", "Lunar habitat + 20% CO₂", "Spacesuit (100% O₂, 0.29 atm)"],
    oxygen: "Oxygen",
    pressureL: "Pressure",
    co2Add: "CO₂ added",
    heAdd: "He added",
    outTitle: "Outside the measured range: no prediction, no extrapolation.",
    outBody: (list: string) => `Your input is outside what was actually tested: ${list}. The tests below are the closest measured ones, shown for reference only.`,
    iO2: (v: number, a: string, b: string) => `O₂ ${v}% (measured ${a}–${b})`,
    iP: (v: number, a: string, b: string) => `pressure ${v} atm (measured ${a}–${b})`,
    iC: (v: number, m: string) => `CO₂ ${v}% (measured up to ${m})`,
    iH: (v: number, m: string) => `He ${v}% (measured up to ${m})`,
    nearTxt: (k: number) => `Among the 5 closest measured tests, ${k} ended in extinction. This is a description of nearby measurements, not a prediction.`,
    thTest: "Test",
    thP: "Pressure",
    thOut: "Outcome",
    thDist: "Distance",
    bassH: "BASS-II: what oxygen levels were tested on solids?",
    bassP: (b: number) => `Initial oxygen (% by volume) of the ${b} recorded tests, rounded to whole percent. The dashed line marks the 26.5% planned for lunar habitats.`,
    bAria: "Histogram of BASS-II initial oxygen percentage; no tests above 22 percent",
    bLine1: "Lunar habitat ≥ 26.5%",
    bLine2: "no BASS-II tests at or above this line",
    bX: "Initial oxygen, % by volume",
    byPi: "Tests by principal investigator",
    mats: "Most-tested samples",
    raw: (b: number) => `View the raw BASS-II rows (${b})`,
    thPi: "PI",
    thSample: "Sample",
    thO2i: "Initial O₂ %",
    thO2f: "Final O₂ %",
    thAir: "Air (as recorded)",
    methodH: "Method and limits",
    m1: "Source.",
    m1t: "PSI experimental tables, public domain (CC0), files verified byte-for-byte against NASA's published sizes (24,776 and 16,590 bytes).",
    m2: "Column naming.",
    m3: "Data quality.",
    m3t: "FLEX test 114 records a pressure of 0 (an invalid code) and is excluded from the pressure-based views. Six tests list compositions summing to 0.98, a rounding effect in the source.",
    m4: "What this is not.",
    m4a: "A flammability",
    m4b: "prediction",
    m4c: ". Test outcomes depend on more than the variables shown (droplet size, hardware, procedure), and an outcome label like “disruption” is reported as recorded, not reinterpreted.",
    m5: "Partial gravity.",
    m5t: "All tests are microgravity. Nothing here applies to lunar or Martian gravity without new data.",
    colNote: {
      o2: 'PSI header "O initial ambient composition" (subscript lost in export): oxygen mole fraction.',
      co2: 'PSI header "CO initial ambient composition" (subscript lost in export): treated as CO2, the suppressant named in the FLEX fact sheet.',
    },
    fuels: { Methanol: "Methanol", Heptane: "Heptane" } as Record<string, string>,
    suppOpts: { All: "All", None: "None", CO2: "CO2", He: "He" } as Record<string, string>,
  },
  es: {
    outcome: { Extinction: "Extinción", Completion: "Combustión completa", Disruption: "Disrupción" } as Record<Outcome, string>,
    eyebrow: "Laboratorio de datos",
    title: "Datos reales de vuelo, sin extrapolar",
    intro: (n: number, b: number) => [`Cada punto de abajo es un ensayo registrado en las tablas experimentales de PSI de NASA (CC0): `, `FLEX, PSI-69, ${n} ensayos`, ` y `, `BASS-II, PSI-25, ${b} ensayos`, `. Los recuentos y porcentajes se calculan a partir de esas filas; no se modela nada.`],
    h1: "ensayos de FLEX con presión similar a la de un hábitat lunar (0.6–0.8 atm) y O₂ ≥ 26.5%.",
    h1a: "terminaron en extinción",
    h1b: "disrupción",
    h1c: "combustión completa",
    h1d: (n: number) => `Ensayos con CO₂ o He añadido: ${n}. Son muy pocos ensayos para generalizar.`,
    h2: (b: number) => `0 de ${b}`,
    h2t: "ensayos de BASS-II empezaron con 26.5% de O₂ o más (O₂ inicial 13.6–22.2%).",
    h2n: "Los materiales sólidos no se han ensayado en microgravedad con oxígeno de hábitat lunar.",
    h3t: "ensayos con gravedad parcial (Luna 0.166 g, Marte 0.38 g).",
    h3n: "Se espera que LUCI y FM2 aporten los primeros datos.",
    flexH: "FLEX: ¿cuándo se apaga una gota que arde?",
    flexP: "FLEX quemó gotas de heptano y metanol en mezclas de oxígeno y nitrógeno, a veces con CO₂ o helio añadido como supresor. Cada ensayo terminó en extinción (la llama se apagó), combustión completa (la gota se consumió) o disrupción (según la etiqueta de PSI).",
    fuel: "Combustible",
    supp: "Supresor",
    press: "Presión",
    all: "Todos",
    none: "Ninguno",
    lunarLike: "Tipo lunar",
    above1: "Más de 1 atm",
    shown: "ensayos mostrados",
    pickHint: "Pasa el cursor o enfoca un punto para ver el ensayo registrado. Los puntos tienen un pequeño desplazamiento para que los ensayos superpuestos sigan visibles.",
    pickTest: "Ensayo",
    droplet: "gota",
    outcomeWord: "resultado",
    sAria: "Ensayos de FLEX: fracción de oxígeno frente a fracción de supresor añadido, coloreados por resultado",
    sX: "Oxígeno en el gas ambiente (fracción molar)",
    sY: "Supresor añadido: CO₂ + He (fracción molar)",
    sHab: "O₂ de hábitat lunar (≥ 26.5%)",
    suppShort: "supresor",
    binsH: "Porcentaje de ensayos que terminaron en extinción, por nivel de oxígeno",
    binsP: "Respeta los filtros de arriba. Las barras con menos de 5 ensayos se atenúan: tómalas como anécdotas.",
    binsAria: "Porcentaje de ensayos que terminaron en extinción, por rango de oxígeno",
    noTests: "sin ensayos",
    lowN: "n bajo",
    endedIn: "terminaron en extinción",
    finderH: "Busca el ensayo medido más cercano",
    finderP: "Introduce unas condiciones y mira qué ensayos reales están más cerca. Si tus condiciones quedan fuera del rango medido, JaPax se niega a adivinar. Prueba el preajuste del traje espacial para ver la barrera.",
    presets: ["Aire terrestre", "Hábitat lunar, sin supresor", "Hábitat lunar + 20% CO₂", "Traje espacial (100% O₂, 0.29 atm)"],
    oxygen: "Oxígeno",
    pressureL: "Presión",
    co2Add: "CO₂ añadido",
    heAdd: "He añadido",
    outTitle: "Fuera del rango medido: sin predicción ni extrapolación.",
    outBody: (list: string) => `Tus datos quedan fuera de lo que realmente se ensayó: ${list}. Los ensayos de abajo son los medidos más cercanos, solo como referencia.`,
    iO2: (v: number, a: string, b: string) => `O₂ ${v}% (medido ${a}–${b})`,
    iP: (v: number, a: string, b: string) => `presión ${v} atm (medido ${a}–${b})`,
    iC: (v: number, m: string) => `CO₂ ${v}% (medido hasta ${m})`,
    iH: (v: number, m: string) => `He ${v}% (medido hasta ${m})`,
    nearTxt: (k: number) => `De los 5 ensayos medidos más cercanos, ${k} terminaron en extinción. Es una descripción de mediciones cercanas, no una predicción.`,
    thTest: "Ensayo",
    thP: "Presión",
    thOut: "Resultado",
    thDist: "Distancia",
    bassH: "BASS-II: ¿qué niveles de oxígeno se probaron en sólidos?",
    bassP: (b: number) => `Oxígeno inicial (% en volumen) de los ${b} ensayos registrados, redondeado a porcentaje entero. La línea discontinua marca el 26.5% previsto para hábitats lunares.`,
    bAria: "Histograma del porcentaje de oxígeno inicial de BASS-II; ningún ensayo por encima del 22 por ciento",
    bLine1: "Hábitat lunar ≥ 26.5%",
    bLine2: "ningún ensayo de BASS-II en esta línea o por encima",
    bX: "Oxígeno inicial, % en volumen",
    byPi: "Ensayos por investigador principal",
    mats: "Muestras más ensayadas",
    raw: (b: number) => `Ver las filas originales de BASS-II (${b})`,
    thPi: "IP",
    thSample: "Muestra",
    thO2i: "O₂ inicial %",
    thO2f: "O₂ final %",
    thAir: "Aire (tal como se registró)",
    methodH: "Método y límites",
    m1: "Fuente.",
    m1t: "Tablas experimentales de PSI, dominio público (CC0), archivos verificados byte a byte contra los tamaños publicados por NASA (24 776 y 16 590 bytes).",
    m2: "Nombres de columnas.",
    m3: "Calidad de los datos.",
    m3t: "El ensayo 114 de FLEX registra una presión de 0 (un código no válido) y se excluye de las vistas basadas en presión. Seis ensayos listan composiciones que suman 0.98, un efecto de redondeo de la fuente.",
    m4: "Lo que esto no es.",
    m4a: "Una",
    m4b: "predicción",
    m4c: " de inflamabilidad. Los resultados dependen de más variables que las mostradas (tamaño de gota, equipo, procedimiento), y una etiqueta como «disrupción» se informa tal como se registró, sin reinterpretarla.",
    m5: "Gravedad parcial.",
    m5t: "Todos los ensayos son de microgravedad. Nada de esto se aplica a la gravedad lunar o marciana sin nuevos datos.",
    colNote: {
      o2: 'Encabezado de PSI "O initial ambient composition" (subíndice perdido en la exportación): fracción molar de oxígeno.',
      co2: 'Encabezado de PSI "CO initial ambient composition" (subíndice perdido en la exportación): se trata como CO2, el supresor citado en la ficha de FLEX.',
    },
    fuels: { Methanol: "Metanol", Heptane: "Heptano" } as Record<string, string>,
    suppOpts: { All: "Todos", None: "Ninguno", CO2: "CO2", He: "He" } as Record<string, string>,
  },
};

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
  const t = useT(T);
  const W = 720, H = 400, m = { l: 58, r: 20, t: 20, b: 48 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const X0 = 0.11, X1 = 0.35, Y1 = 0.75;
  const x = (v: number) => m.l + ((v - X0) / (X1 - X0)) * pw;
  const y = (v: number) => m.t + ph - (v / Y1) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t.sAria}>
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
      <text x={x(0.265) + 6} y={m.t + 14} fontSize="11" fill="var(--accent)">{t.sHab}</text>
      <text x={m.l + pw / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.sX}</text>
      <text transform={`translate(14 ${m.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.sY}</text>
      {rows.map((r) => {
        if (r.o2 == null) return null;
        const s = (r.co2 ?? 0) + (r.he ?? 0);
        const cx = x(r.o2) + (hash(r.n ?? 0) - 0.5) * 7;
        const cy = y(s) + (hash((r.n ?? 0) + 7) - 0.5) * 7;
        const act = picked?.n === r.n;
        return (
          <g key={r.n} tabIndex={0} role="button" aria-label={`${t.pickTest} ${r.n}, ${r.fuel}, ${t.outcome[r.end as Outcome]}`} style={{ cursor: "pointer", outline: "none" }}
             onMouseEnter={() => onPick(r)} onFocus={() => onPick(r)} onClick={() => onPick(r)}>
            <Mark cx={cx} cy={cy} o={r.end as Outcome} active={act} />
            <title>{`${t.pickTest} ${r.n} · ${r.fuel} · ${pct(r.o2)} O₂ · ${t.suppShort} ${pct(s)} · ${t.outcome[r.end as Outcome]}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- extinction share by O2 bin ---------- */
const BINS: [number, number][] = [[0.12, 0.15], [0.15, 0.18], [0.18, 0.21], [0.21, 0.24], [0.24, 0.27], [0.27, 0.3], [0.3, 0.35]];
function Bins({ rows }: { rows: FlexRow[] }) {
  const t = useT(T);
  const data = BINS.map(([a, b]) => {
    const r = rows.filter((x) => x.o2 != null && x.o2 >= a - 1e-9 && x.o2 < b - 1e-9);
    return { a, b, n: r.length, ext: r.filter((x) => x.end === "Extinction").length };
  });
  return (
    <ul className="space-y-2" aria-label={t.binsAria}>
      {data.map((d) => (
        <li key={d.a} className="grid grid-cols-[6.5rem_1fr_6rem] items-center gap-3 text-sm">
          <span className="text-ink-2">{Math.round(d.a * 100)}–{Math.round(d.b * 100)}% O₂</span>
          <div className="h-4 rounded bg-surface-2" role="img" aria-label={d.n ? `${d.ext}/${d.n} ${t.endedIn}` : t.noTests}>
            {d.n > 0 && (
              <div className="h-4 rounded" style={{ width: `${(d.ext / d.n) * 100}%`, background: "var(--a-detection)", opacity: d.n < 5 ? 0.45 : 1, minWidth: d.ext ? 3 : 0 }} />
            )}
          </div>
          <span className="tabular-nums text-xs text-muted">{d.n ? `${d.ext}/${d.n}${d.n < 5 ? ` · ${t.lowN}` : ""}` : t.noTests}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- nearest test finder ---------- */
const PRESETS = [
  { fuel: "Methanol", o2: 21, p: 1.0, co2: 0, he: 0 },
  { fuel: "Methanol", o2: 30, p: 0.7, co2: 0, he: 0 },
  { fuel: "Methanol", o2: 30, p: 0.7, co2: 20, he: 0 },
  { fuel: "Heptane", o2: 100, p: 0.29, co2: 0, he: 0 },
];

function Finder() {
  const t = useT(T);
  const [q, setQ] = useState(PRESETS[1]);
  const res = useMemo(() => {
    const set = ROWS.filter((r) => r.fuel === q.fuel && r.o2 != null && r.pAtm);
    const rng = (f: (r: FlexRow) => number) => { const v = set.map(f); return [Math.min(...v), Math.max(...v)] as const; };
    const [o0, o1] = rng((r) => r.o2!);
    const [p0, p1] = rng((r) => r.pAtm!);
    const c1 = Math.max(...set.map((r) => r.co2 ?? 0));
    const h1 = Math.max(...set.map((r) => r.he ?? 0));
    const issues: string[] = [];
    if (q.o2 / 100 < o0 - 1e-9 || q.o2 / 100 > o1 + 1e-9) issues.push(t.iO2(q.o2, pct(o0), pct(o1)));
    if (q.p < p0 * 0.97 || q.p > p1 * 1.03) issues.push(t.iP(q.p, p0.toFixed(2), p1.toFixed(2)));
    if (q.co2 / 100 > c1 + 1e-9) issues.push(t.iC(q.co2, pct(c1)));
    if (q.he / 100 > h1 + 1e-9) issues.push(t.iH(q.he, pct(h1)));
    const dist = (r: FlexRow) =>
      Math.hypot(
        (r.o2! - q.o2 / 100) / (o1 - o0 || 1),
        (r.pAtm! - q.p) / (p1 - p0 || 1),
        ((r.co2 ?? 0) - q.co2 / 100) / (c1 || 1),
        ((r.he ?? 0) - q.he / 100) / (h1 || 1),
      );
    const near = set.map((r) => ({ r, d: dist(r) })).sort((a, b) => a.d - b.d).slice(0, 5);
    return { near, issues };
  }, [q, t]);

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
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => setQ(p)} className="rounded-full border border-line-2 px-3 py-1 text-xs text-ink-2 hover:text-ink">{t.presets[i]}</button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="text-ink-2">{t.fuel}</span>
          <select value={q.fuel} onChange={(e) => setQ({ ...q, fuel: e.target.value })} className="mt-1 block rounded-lg border border-line-2 bg-surface px-2 py-1.5">
            <option value="Methanol">{t.fuels.Methanol}</option><option value="Heptane">{t.fuels.Heptane}</option>
          </select>
        </label>
        {field(t.oxygen, "o2", 1, "%")}
        {field(t.pressureL, "p", 0.05, "atm")}
        {field(t.co2Add, "co2", 5, "%")}
        {field(t.heAdd, "he", 5, "%")}
      </div>

      {res.issues.length > 0 ? (
        <div className="mt-4 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--warn)" }} role="alert">
          <p className="font-medium">{t.outTitle}</p>
          <p className="mt-1 text-ink-2">{t.outBody(res.issues.join("; "))}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-2">{t.nearTxt(extN)}</p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-muted"><tr><th className="py-1 pr-3">{t.thTest}</th><th className="pr-3">O₂</th><th className="pr-3">{t.thP}</th><th className="pr-3">CO₂ / He</th><th className="pr-3">{t.thOut}</th><th>{t.thDist}</th></tr></thead>
          <tbody>
            {res.near.map(({ r, d }) => (
              <tr key={r.n} className="border-t border-line">
                <td className="py-1.5 pr-3">#{r.n} <span className="text-xs text-muted">{r.id}</span></td>
                <td className="pr-3">{pct(r.o2!)}</td>
                <td className="pr-3">{r.pAtm!.toFixed(2)} atm</td>
                <td className="pr-3">{pct(r.co2 ?? 0)} / {pct(r.he ?? 0)}</td>
                <td className="pr-3"><span style={{ color: OUTCOME[r.end as Outcome].color }}>●</span> {t.outcome[r.end as Outcome]}</td>
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
  const t = useT(T);
  const { lang } = useLang();
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

  const sel = (label: string, val: string, set: (v: string) => void, opts: [string, string][]) => (
    <label className="text-sm text-ink-2">
      {label}
      <select value={val} onChange={(e) => set(e.target.value)} className="ml-2 rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-ink">
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  const intro = t.intro(ROWS.length, b.length);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-3xl text-ink-2">
        {intro[0]}<strong className="text-ink">{intro[1]}</strong>{intro[2]}<strong className="text-ink">{intro[3]}</strong>{intro[4]}
      </p>

      <div className="mt-10">
        <FlameLab />
      </div>

      {/* headline facts */}
      <div className="mt-12 grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>{lunar.length}</p>
          <p className="mt-1 text-sm text-ink-2">{t.h1}</p>
          <p className="mt-1 text-xs text-muted">
            {lunar.filter((r) => r.end === "Extinction").length} {t.h1a} · {lunar.filter((r) => r.end === "Disruption").length} {t.h1b} · {lunar.filter((r) => r.end === "Completion").length} {t.h1c}
          </p>
          <p className="mt-1 text-xs text-muted">{t.h1d(lunar.filter((r) => (r.co2 ?? 0) + (r.he ?? 0) > 0).length)}</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>{t.h2(b.length)}</p>
          <p className="mt-1 text-sm text-ink-2">{t.h2t}</p>
          <p className="mt-1 text-xs text-muted">{t.h2n}</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl font-semibold" style={{ color: "var(--accent)" }}>0</p>
          <p className="mt-1 text-sm text-ink-2">{t.h3t}</p>
          <p className="mt-1 text-xs text-muted">{t.h3n}</p>
        </div>
      </div>

      {/* FLEX */}
      <section className="mt-12" aria-labelledby="flex">
        <h2 id="flex" className="text-xl font-semibold">{t.flexH}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.flexP}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {sel(t.fuel, fuel, setFuel, [["All", t.all], ["Methanol", t.fuels.Methanol], ["Heptane", t.fuels.Heptane]])}
          {sel(t.supp, supp, setSupp, [["All", t.suppOpts.All], ["None", t.suppOpts.None], ["CO2", t.suppOpts.CO2], ["He", t.suppOpts.He]])}
          {sel(t.press, press, setPress, [["All", t.all], ["Lunar-like", t.lunarLike], ["1 atm", "1 atm"], ["Above 1 atm", t.above1]])}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-2" aria-live="polite">
          <span className="text-ink">{rows.length} {t.shown}</span>
          {counts.map(({ o, n }) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><Mark cx={6} cy={6} o={o} r={3.5} /></svg>
              {t.outcome[o]} {n}
            </span>
          ))}
        </div>
        <div className="card mt-3 p-3 sm:p-5">
          <Scatter rows={rows} onPick={setPicked} picked={picked} />
          <div className="mt-3 min-h-[3.5rem] rounded-lg border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
            {picked ? (
              <p>
                <strong>{t.pickTest} #{picked.n}</strong> ({picked.id}, {picked.date}) · {picked.fuel} · O₂ {pct(picked.o2!)} · {picked.pAtm!.toFixed(2)} atm · CO₂ {pct(picked.co2 ?? 0)} · He {pct(picked.he ?? 0)} ·{" "}
                {t.droplet} {picked.d0 ?? "n/a"} mm · {t.outcomeWord} <strong>{t.outcome[picked.end as Outcome]}</strong>
              </p>
            ) : (
              <p className="text-ink-2">{t.pickHint}</p>
            )}
          </div>
        </div>

        <h3 className="mt-8 font-semibold">{t.binsH}</h3>
        <p className="mt-1 text-sm text-ink-2">{t.binsP}</p>
        <div className="card mt-3 p-4"><Bins rows={rows} /></div>
      </section>

      {/* Finder */}
      <section className="mt-12" aria-labelledby="find">
        <h2 id="find" className="text-xl font-semibold">{t.finderH}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.finderP}</p>
        <div className="mt-4"><Finder /></div>
      </section>

      {/* BASS-II */}
      <section className="mt-12" aria-labelledby="bass">
        <h2 id="bass" className="text-xl font-semibold">{t.bassH}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-2">{t.bassP(b.length)}</p>
        <div className="card mt-4 p-4 sm:p-5">
          <svg viewBox="0 0 720 280" className="h-auto w-full" role="img" aria-label={t.bAria}>
            {hist.map((h, i) => {
              const x0 = 40 + i * 44;
              const hh = (h.n / maxH) * 190;
              return (
                <g key={h.v}>
                  <rect x={x0} y={230 - hh} width="36" height={hh} rx="4" fill="var(--a-prevention)" />
                  {h.n > 0 && <text x={x0 + 18} y={222 - hh} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{h.n}</text>}
                  <text x={x0 + 18} y={250} textAnchor="middle" fontSize="11" fill="var(--muted)">{h.v}%</text>
                  <title>{`${h.v}% O₂: ${h.n}`}</title>
                </g>
              );
            })}
            {/* 26.5% on the same scale as the bars: bin v is centered at 40 + (v-13)*44 + 18 */}
            <line x1={40 + 13.5 * 44 + 18} x2={40 + 13.5 * 44 + 18} y1="20" y2="232" stroke="var(--accent)" strokeDasharray="5 4" />
            <text x={40 + 13.5 * 44 + 10} y="34" textAnchor="end" fontSize="11" fill="var(--accent)">{t.bLine1}</text>
            <text x={40 + 13.5 * 44 + 10} y="50" textAnchor="end" fontSize="11" fill="var(--ink-2)">{t.bLine2}</text>
            <line x1="36" x2="700" y1="231" y2="231" stroke="var(--line-2)" />
            <text x="368" y="272" textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.bX}</text>
          </svg>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">{t.byPi}</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">{byPi.map(([k, n]) => <li key={k} className="flex justify-between"><span>{k}</span><span className="tabular-nums">{n}</span></li>)}</ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t.mats}</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">{mats.map(([k, n]) => <li key={k} className="flex justify-between gap-3"><span className="truncate">{k}</span><span className="tabular-nums">{n}</span></li>)}</ul>
            </div>
          </div>
        </div>
        <details className="card mt-4 p-4 text-sm">
          <summary className="cursor-pointer font-medium">{t.raw(b.length)}</summary>
          <div className="mt-3 max-h-96 overflow-auto">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="sticky top-0 bg-surface text-muted"><tr><th className="py-1 pr-3">{t.thTest}</th><th className="pr-3">{t.thPi}</th><th className="pr-3">{t.thSample}</th><th className="pr-3">{t.thO2i}</th><th className="pr-3">{t.thO2f}</th><th>{t.thAir}</th></tr></thead>
              <tbody>{b.map((r) => <tr key={r.test} className="border-t border-line"><td className="py-1 pr-3">{r.test}</td><td className="pr-3">{r.pi}</td><td className="pr-3">{r.material}</td><td className="pr-3">{r.o2Initial ?? "—"}</td><td className="pr-3">{r.o2Final ?? "—"}</td><td>{r.air ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </details>
      </section>

      {/* Method */}
      <section className="mt-12" aria-labelledby="method">
        <h2 id="method" className="text-xl font-semibold">{t.methodH}</h2>
        <ul className="card mt-3 space-y-2 p-4 text-sm text-ink-2">
          <li><strong className="text-ink">{t.m1}</strong> {t.m1t} <SourceTag src="PSI-TABLES" /></li>
          <li><strong className="text-ink">{t.m2}</strong> {t.colNote.o2} {t.colNote.co2}</li>
          <li><strong className="text-ink">{t.m3}</strong> {t.m3t}</li>
          <li><strong className="text-ink">{t.m4}</strong> {t.m4a} <Pending>{t.m4b}</Pending>{t.m4c}</li>
          <li><strong className="text-ink">{t.m5}</strong> {t.m5t}</li>
        </ul>
      </section>
      {lang === "es" && <p className="mt-6 text-xs text-muted">Los resultados de los ensayos (Extinction, Completion, Disruption) son las etiquetas de PSI, traducidas.</p>}
    </div>
  );
}
