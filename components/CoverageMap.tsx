"use client";

import { useState } from "react";
import lab from "@/data/lab.json";
import { useT } from "@/lib/i18n";

/**
 * Coverage map: in which atmospheres has fire been measured in microgravity?
 * Uses only verified ranges (PSI tables / NASA fact sheets). Anything unverified is drawn as a
 * margin mark and declared in the text, never as an invented data area.
 */
const W = 720;
const H = 470;
const M = { l: 64, r: 24, t: 34, b: 52 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;
const PMIN = 0.2;
const PMAX = 5;

const x = (o2: number) => M.l + o2 * PW;
const y = (p: number) => M.t + PH - ((Math.log10(p) - Math.log10(PMIN)) / (Math.log10(PMAX) - Math.log10(PMIN))) * PH;

// FLEX (PSI-69): group the measured tests by identical O2 and (rounded) pressure
interface Pt { o2: number; p: number; n: number; ext: number }
const FLEX_PTS: Pt[] = (() => {
  const m = new Map<string, Pt>();
  for (const r of lab.flex.rows) {
    if (r.o2 == null || !r.pAtm) continue; // pressure 0 = invalid code in PSI-69 test 114
    const p = Math.round(r.pAtm * 20) / 20;
    const k = `${r.o2}|${p}`;
    const e = m.get(k) ?? { o2: r.o2, p, n: 0, ext: 0 };
    e.n++;
    if (r.end === "Extinction") e.ext++;
    m.set(k, e);
  }
  return [...m.values()];
})();
const FLEX_N = FLEX_PTS.reduce((s, p) => s + p.n, 0);

const T = {
  en: {
    aria: "Coverage map: oxygen versus pressure, showing the atmospheres tested by each investigation",
    xAxis: "Oxygen concentration (mole fraction)",
    yAxis: "Total pressure (atm, log scale)",
    habitatLabel: "Lunar habitat region",
    earthLabel: "Earth / ISS",
    moonLabel: "Lunar base",
    suitLabel: "Spacesuit",
    cfiMark: "CFI (O₂ n/v)",
    cfigMark: "CFI-G up to 85% (p n/v)",
    bass2Mark: "BASS-II (p n/v)",
    help1: "Hover (or focus with the keyboard) any element of the chart.",
    help2: "Diamonds",
    help2b: "= real environments ·",
    help3: "areas and dots",
    help3b: "= atmospheres actually tested ·",
    help4: "margin marks",
    help4b: "= partial data (n/v = not verified).",
    table: "View as table",
    colEl: "Element",
    colDet: "Detail",
    tests: "tests",
    ended: "ended in extinction",
    items: {
      habitat: ["Lunar habitat region", "O₂ ≥ 26.5% and pressure ≤ 0.69 atm (10.2 psi). This is where materials are more flammable than on Earth and where data matters most."],
      flex: [`FLEX (PSI-69): ${FLEX_N} measured tests`, "Each circle is a group of tests at the same O₂ and pressure (bigger = more tests). Measured O₂ 12–34% and pressures from 0.70 to 3.05 atm, with heptane and methanol droplets and CO₂/He suppressants. The 0.70 atm column sits right at the lunar habitat pressure."],
      bass2: ["BASS-II (PSI-25): initial O₂ 13.6–22.2%", "Measured initial oxygen across its 129 tests. None reached the 26.5% habitat threshold, so solid materials are not yet tested at lunar-habitat oxygen. Pressure is not recorded in the table, so only the O₂ span is marked."],
      bre: ["ACME BRE (PSI-20): habitat atmospheres tested", "Three atmospheres NASA considers for missions: 14.7 psia/21% O₂, 10.2 psia/26.5% O₂ and 8.2 psia/34% O₂. With elevated O₂ the flame kept burning with no air flow; at 21% it self-extinguished."],
      cfi: ["CFI (PSI-39): pressure 0.25–5 atm", "Cool flames in n-dodecane droplets. The O₂ concentration is not verified in the sources, so it is drawn as a margin bar rather than an area."],
      cfig: ["ACME CFI-G (PSI-159): up to 85% O₂", "The microgravity tests with the most oxygen (challenge statement). Pressure is not verified, so only the O₂ maximum is marked."],
      earth: ["Earth / ISS", "21% O₂ at 14.7 psi. The ISS has the same atmosphere but in microgravity."],
      "moon-habitat": ["Planned lunar base", "30% O₂ or more at 10.2 psi or less (challenge statement). +43% oxygen versus Earth: more flammable."],
      suit: ["Spacesuit", "100% O₂ at only 4.3 psi. Outside the range of every verified test."],
    } as Record<string, [string, string]>,
  },
  es: {
    aria: "Mapa de cobertura: oxígeno frente a presión, con las atmósferas ensayadas por cada investigación",
    xAxis: "Concentración de oxígeno (fracción molar)",
    yAxis: "Presión total (atm, escala log.)",
    habitatLabel: "Región de hábitat lunar",
    earthLabel: "Tierra / ISS",
    moonLabel: "Base lunar",
    suitLabel: "Traje",
    cfiMark: "CFI (O₂ n/v)",
    cfigMark: "CFI-G hasta 85% (p n/v)",
    bass2Mark: "BASS-II (p n/v)",
    help1: "Pasa el cursor (o enfoca con el teclado) sobre cualquier elemento del gráfico.",
    help2: "Rombos",
    help2b: "= entornos reales ·",
    help3: "áreas y puntos",
    help3b: "= atmósferas realmente ensayadas ·",
    help4: "marcas del margen",
    help4b: "= datos parciales (n/v = no verificado).",
    table: "Ver como tabla",
    colEl: "Elemento",
    colDet: "Detalle",
    tests: "ensayos",
    ended: "terminaron en extinción",
    items: {
      habitat: ["Región de hábitat lunar", "O₂ ≥ 26.5% y presión ≤ 0.69 atm (10.2 psi). Es donde los materiales son más inflamables que en la Tierra y donde más importan los datos."],
      flex: [`FLEX (PSI-69): ${FLEX_N} ensayos medidos`, "Cada círculo es un grupo de ensayos con el mismo O₂ y la misma presión (más grande = más ensayos). O₂ medido de 12 a 34% y presiones de 0.70 a 3.05 atm, con gotas de heptano y metanol y supresores CO₂/He. La columna de 0.70 atm queda justo en la presión de un hábitat lunar."],
      bass2: ["BASS-II (PSI-25): O₂ inicial 13.6–22.2%", "Oxígeno inicial medido en sus 129 ensayos. Ninguno llegó al umbral de hábitat de 26.5%, así que los materiales sólidos aún no se han ensayado con oxígeno de hábitat lunar. La presión no figura en la tabla, por eso solo se marca el intervalo de O₂."],
      bre: ["ACME BRE (PSI-20): atmósferas de hábitat ensayadas", "Tres atmósferas que NASA considera para misiones: 14.7 psia/21% O₂, 10.2 psia/26.5% O₂ y 8.2 psia/34% O₂. Con O₂ elevado la llama siguió ardiendo sin flujo de aire; a 21% se autoextinguió."],
      cfi: ["CFI (PSI-39): presión 0.25–5 atm", "Llamas frías en gotas de n-dodecano. La concentración de O₂ no está verificada en las fuentes, por eso se dibuja como barra en el margen y no como área."],
      cfig: ["ACME CFI-G (PSI-159): hasta 85% de O₂", "Los ensayos de microgravedad con más oxígeno (enunciado del reto). La presión no está verificada, así que solo se marca el máximo de O₂."],
      earth: ["Tierra / ISS", "21% de O₂ a 14.7 psi. La ISS tiene la misma atmósfera pero en microgravedad."],
      "moon-habitat": ["Base lunar prevista", "30% de O₂ o más a 10.2 psi o menos (enunciado del reto). +43% de oxígeno respecto a la Tierra: más inflamable."],
      suit: ["Traje espacial", "100% de O₂ a solo 4.3 psi. Fuera del rango de todos los ensayos verificados."],
    } as Record<string, [string, string]>,
  },
};

export default function CoverageMap() {
  const t = useT(T);
  const [active, setActive] = useState<string | null>(null);

  // PSI-20 objectives: 14.7 psia/21%, 10.2 psia/26.5%, 8.2 psia/34% (psia -> atm)
  const bre = [
    { o2: 0.21, p: 1.0, t: "14.7 psia · 21% O₂" },
    { o2: 0.265, p: 0.694, t: "10.2 psia · 26.5% O₂" },
    { o2: 0.34, p: 0.558, t: "8.2 psia · 34% O₂" },
  ];
  const envs = [
    { id: "earth", label: t.earthLabel, o2: 0.21, p: 1.0, dx: 10, dy: -10 },
    { id: "moon-habitat", label: t.moonLabel, o2: 0.3, p: 0.694, dx: 12, dy: 18 },
    { id: "suit", label: t.suitLabel, o2: 1.0, p: 0.293, dx: -10, dy: 20, anchor: "end" as const },
  ];

  const act = (id: string) => ({
    tabIndex: 0,
    role: "button" as const,
    "aria-label": t.items[id]?.[0],
    onMouseEnter: () => setActive(id),
    onFocus: () => setActive(id),
    onClick: () => setActive(id),
    style: { cursor: "pointer", outline: "none" },
  });
  const dim = (id: string) => (active && active !== id ? 0.35 : 1);
  const sel = active ? t.items[active] : null;

  const xt = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const yt = [0.25, 0.5, 1, 2, 5];

  return (
    <div className="card p-3 sm:p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t.aria}>
        {/* grid */}
        {yt.map((p) => (
          <g key={p}>
            <line x1={M.l} x2={W - M.r} y1={y(p)} y2={y(p)} stroke="var(--line)" />
            <text x={M.l - 8} y={y(p) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {p}
            </text>
          </g>
        ))}
        {xt.map((o) => (
          <g key={o}>
            <line x1={x(o)} x2={x(o)} y1={M.t} y2={M.t + PH} stroke="var(--line)" />
            <text x={x(o)} y={H - M.b + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
              {Math.round(o * 100)}%
            </text>
          </g>
        ))}
        <text x={M.l + PW / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
          {t.xAxis}
        </text>
        <text transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
          {t.yAxis}
        </text>

        {/* habitat region */}
        <g {...act("habitat")} opacity={dim("habitat")}>
          <rect
            x={x(0.265)}
            y={y(0.694)}
            width={x(1) - x(0.265)}
            height={y(PMIN) - y(0.694)}
            fill="rgba(255,138,76,0.09)"
            stroke="var(--accent)"
            strokeDasharray="5 4"
          />
          <text x={x(1) - 8} y={y(PMIN) - 8} textAnchor="end" fontSize="11" fill="var(--accent)">
            {t.habitatLabel}
          </text>
        </g>

        {/* FLEX: measured tests */}
        <g {...act("flex")} opacity={dim("flex")}>
          {FLEX_PTS.map((p) => (
            <g key={`${p.o2}|${p.p}`}>
              <circle cx={x(p.o2)} cy={y(p.p)} r={4 + Math.sqrt(p.n) * 1.1} fill="var(--a-suppression)" fillOpacity="0.45" stroke="var(--a-suppression)" strokeWidth="1.2" />
              <title>{`FLEX · ${p.n} ${t.tests} · ${Math.round(p.o2 * 100)}% O₂ · ${p.p} atm · ${p.ext} ${t.ended}`}</title>
            </g>
          ))}
          <text x={x(0.36)} y={y(1.0) + 4} fontSize="12" fontWeight="600" fill="var(--ink)">
            FLEX
          </text>
        </g>

        {/* BASS-II: measured O2 span on the top edge (pressure not recorded) */}
        <g {...act("bass2")} opacity={dim("bass2")}>
          <rect x={x(0.136)} y={M.t + 2} width={x(0.222) - x(0.136)} height="7" rx="3.5" fill="var(--a-prevention)" />
          <text x={x(0.222) + 8} y={M.t + 10} fontSize="11" fill="var(--a-prevention)">
            {t.bass2Mark}
          </text>
        </g>

        {/* BRE */}
        <g {...act("bre")} opacity={dim("bre")}>
          {bre.map((b) => (
            <g key={b.t}>
              <circle cx={x(b.o2)} cy={y(b.p)} r="7" fill="var(--a-prevention)" stroke="var(--surface)" strokeWidth="2" />
              <title>{`BRE · ${b.t}`}</title>
            </g>
          ))}
          <text x={x(0.34) + 12} y={y(0.558) + 4} fontSize="12" fontWeight="600" fill="var(--ink)">
            BRE
          </text>
        </g>

        {/* CFI: pressure band in the left margin */}
        <g {...act("cfi")} opacity={dim("cfi")}>
          <rect x={M.l - 3} y={y(5)} width="7" height={y(0.25) - y(5)} fill="var(--a-fundamental)" rx="3.5" />
          <text x={M.l + 12} y={y(4)} fontSize="11" fill="var(--a-fundamental)">
            {t.cfiMark}
          </text>
        </g>

        {/* CFI-G: O2 maximum on the top edge */}
        <g {...act("cfig")} opacity={dim("cfig")}>
          <path d={`M ${x(0.85)} ${M.t + 14} l -8 -14 l 16 0 z`} fill="var(--a-fundamental)" />
          <text x={x(0.85) - 12} y={M.t + 10} textAnchor="end" fontSize="11" fill="var(--a-fundamental)">
            {t.cfigMark}
          </text>
        </g>

        {/* environments */}
        {envs.map((e) => (
          <g key={e.id} {...act(e.id)} opacity={dim(e.id)}>
            <path d={`M ${x(e.o2)} ${y(e.p) - 8} l 8 8 l -8 8 l -8 -8 z`} fill="var(--ink)" stroke="var(--bg)" strokeWidth="1.5" />
            <text x={x(e.o2) + e.dx} y={y(e.p) + e.dy} textAnchor={e.anchor ?? "start"} fontSize="12" fontWeight="600" fill="var(--ink)">
              {e.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-3 min-h-[5.5rem] rounded-lg border border-line bg-surface-2 p-3 text-sm" aria-live="polite">
        {sel ? (
          <>
            <p className="font-medium">{sel[0]}</p>
            <p className="mt-1 text-ink-2">{sel[1]}</p>
          </>
        ) : (
          <p className="text-ink-2">
            {t.help1} <strong className="text-ink">{t.help2}</strong> {t.help2b} <strong className="text-ink">{t.help3}</strong> {t.help3b}{" "}
            <strong className="text-ink">{t.help4}</strong> {t.help4b}
          </p>
        )}
      </div>

      <details className="mt-3 text-sm text-ink-2">
        <summary className="cursor-pointer text-ink">{t.table}</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3">{t.colEl}</th>
              <th className="py-1">{t.colDet}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(t.items).map(([id, [title, detail]]) => (
              <tr key={id} className="border-t border-line align-top">
                <td className="py-1.5 pr-3 font-medium text-ink">{title}</td>
                <td className="py-1.5">{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
