"use client";

import lab from "@/data/lab.json";
import { useT } from "@/lib/i18n";
import type { VizId } from "@/lib/oracleGuard";
import CoverageMap from "@/components/CoverageMap";

const T = {
  en: {
    flexTitle: "How the 274 FLEX droplet tests ended",
    flexAll: "All FLEX tests",
    flexLunar: "Lunar-like conditions (0.6–0.8 atm, O₂ ≥ 26.5%)",
    ext: "Extinction",
    comp: "Completion",
    disr: "Disruption",
    flexNote: "Counts computed from the recorded rows of PSI-69. Outcome labels are PSI's.",
    bassTitle: "Initial oxygen of the 129 BASS-II tests",
    bassLine: "Lunar habitat ≥ 26.5%",
    bassNone: "no BASS-II tests at or above this line",
    bassX: "Initial oxygen, % by volume",
    gravTitle: "Where fire has been measured along the gravity scale",
    g0: "0 g",
    g0n: "ISS: measured",
    moon: "Moon 0.166 g",
    mars: "Mars 0.38 g",
    nodata: "no data",
    g1: "1 g",
    g1n: "Earth: reference",
    gravNote: "Between 0 g and 1 g there are no experimental data; FM2 and LUCI are expected to provide the first.",
  },
  es: {
    flexTitle: "Cómo terminaron los 274 ensayos de FLEX con gotas",
    flexAll: "Todos los ensayos de FLEX",
    flexLunar: "Condiciones lunares (0.6–0.8 atm, O₂ ≥ 26.5%)",
    ext: "Extinción",
    comp: "Combustión completa",
    disr: "Disrupción",
    flexNote: "Recuentos calculados de las filas registradas de PSI-69. Las etiquetas de resultado son las de PSI.",
    bassTitle: "Oxígeno inicial de los 129 ensayos de BASS-II",
    bassLine: "Hábitat lunar ≥ 26.5%",
    bassNone: "ningún ensayo de BASS-II en esta línea o por encima",
    bassX: "Oxígeno inicial, % en volumen",
    gravTitle: "Dónde se ha medido fuego a lo largo de la escala de gravedad",
    g0: "0 g",
    g0n: "ISS: medido",
    moon: "Luna 0.166 g",
    mars: "Marte 0.38 g",
    nodata: "sin datos",
    g1: "1 g",
    g1n: "Tierra: referencia",
    gravNote: "Entre 0 g y 1 g no hay datos experimentales; se espera que FM2 y LUCI aporten los primeros.",
  },
};

const OUT = { Extinction: "var(--a-detection)", Completion: "var(--a-prevention)", Disruption: "var(--a-fundamental)" } as const;

function Stacked({ label, rows }: { label: string; rows: { end: string | null }[] }) {
  const t = useT(T);
  const n = rows.length || 1;
  const parts = (["Extinction", "Completion", "Disruption"] as const).map((k) => ({ k, c: rows.filter((r) => r.end === k).length }));
  const name = { Extinction: t.ext, Completion: t.comp, Disruption: t.disr };
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{rows.length}</span>
      </div>
      <div className="mt-1.5 flex h-6 overflow-hidden rounded-md" role="img" aria-label={`${label}: ${parts.map((p) => `${name[p.k]} ${p.c}`).join(", ")}`}>
        {parts.map((p) =>
          p.c > 0 ? (
            <div key={p.k} className="flex items-center justify-center text-[11px] font-medium text-black" style={{ width: `${(p.c / n) * 100}%`, background: OUT[p.k], marginRight: 2 }} title={`${name[p.k]}: ${p.c}`}>
              {(p.c / n) * 100 > 8 ? p.c : ""}
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

export default function OracleViz({ id }: { id: VizId }) {
  const t = useT(T);
  if (id === "none") return null;
  if (id === "coverage") return <CoverageMap />;

  if (id === "flexOutcomes") {
    const all = lab.flex.rows;
    const lunar = all.filter((r) => r.pAtm && r.pAtm >= 0.6 && r.pAtm <= 0.8 && r.o2 != null && r.o2 >= 0.265);
    return (
      <div className="card p-4 sm:p-5">
        <h4 className="font-semibold">{t.flexTitle}</h4>
        <div className="mt-4 space-y-4">
          <Stacked label={t.flexAll} rows={all} />
          <Stacked label={t.flexLunar} rows={lunar} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {(["Extinction", "Completion", "Disruption"] as const).map((k) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: OUT[k] }} aria-hidden="true" />
              {k === "Extinction" ? t.ext : k === "Completion" ? t.comp : t.disr}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{t.flexNote}</p>
      </div>
    );
  }

  if (id === "bassOxygen") {
    const b = lab.bass2.rows;
    const hist = Array.from({ length: 15 }, (_, i) => 13 + i).map((v) => ({ v, n: b.filter((r) => r.o2Initial != null && Math.round(r.o2Initial) === v).length }));
    const max = Math.max(...hist.map((h) => h.n));
    return (
      <div className="card p-4 sm:p-5">
        <h4 className="font-semibold">{t.bassTitle}</h4>
        <svg viewBox="0 0 720 270" className="mt-2 h-auto w-full" role="img" aria-label={t.bassTitle}>
          {hist.map((h, i) => {
            const x0 = 40 + i * 44;
            const hh = (h.n / max) * 170;
            return (
              <g key={h.v}>
                <rect x={x0} y={215 - hh} width="36" height={hh} rx="4" fill="var(--a-prevention)" />
                {h.n > 0 && <text x={x0 + 18} y={207 - hh} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{h.n}</text>}
                <text x={x0 + 18} y={234} textAnchor="middle" fontSize="11" fill="var(--muted)">{h.v}%</text>
              </g>
            );
          })}
          <line x1={40 + 13.5 * 44 + 18} x2={40 + 13.5 * 44 + 18} y1="14" y2="217" stroke="var(--accent)" strokeDasharray="5 4" />
          <text x={40 + 13.5 * 44 + 10} y="30" textAnchor="end" fontSize="11" fill="var(--accent)">{t.bassLine}</text>
          <text x={40 + 13.5 * 44 + 10} y="46" textAnchor="end" fontSize="11" fill="var(--ink-2)">{t.bassNone}</text>
          <line x1="36" x2="700" y1="216" y2="216" stroke="var(--line-2)" />
          <text x="368" y="260" textAnchor="middle" fontSize="12" fill="var(--ink-2)">{t.bassX}</text>
        </svg>
      </div>
    );
  }

  // gravityGap
  const X = (g: number) => 60 + g * 600;
  return (
    <div className="card p-4 sm:p-5">
      <h4 className="font-semibold">{t.gravTitle}</h4>
      <svg viewBox="0 0 720 170" className="mt-2 h-auto w-full" role="img" aria-label={t.gravTitle}>
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--line-2)" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={X(0)} y="70" width={X(1) - X(0)} height="14" rx="7" fill="url(#hatch)" stroke="var(--line-2)" />
        <circle cx={X(0)} cy="77" r="11" fill="var(--a-suppression)" />
        <circle cx={X(1)} cy="77" r="11" fill="var(--muted)" />
        {[{ g: 0.166, label: t.moon }, { g: 0.38, label: t.mars }].map((m) => (
          <g key={m.label}>
            <circle cx={X(m.g)} cy="77" r="9" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 3">
              <animate attributeName="r" values="9;15;9" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <text x={X(m.g)} y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{m.label}</text>
            <text x={X(m.g)} y="116" textAnchor="middle" fontSize="11" fill="var(--accent)">{t.nodata}</text>
          </g>
        ))}
        <text x={X(0)} y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{t.g0}</text>
        <text x={X(0)} y="116" textAnchor="middle" fontSize="11" fill="var(--a-suppression)">{t.g0n}</text>
        <text x={X(1)} y="48" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{t.g1}</text>
        <text x={X(1)} y="116" textAnchor="middle" fontSize="11" fill="var(--ink-2)">{t.g1n}</text>
      </svg>
      <p className="text-xs text-muted">{t.gravNote}</p>
    </div>
  );
}
