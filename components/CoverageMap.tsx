"use client";

import { useState } from "react";
import { data, fmtPct } from "@/lib/data";

/**
 * Coverage map: in which atmospheres has fire been measured in microgravity?
 * Uses only verified ranges (PSI / NASA fact sheets). Anything unverified is drawn as a
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

interface Item {
  id: string;
  title: string;
  detail: string;
}

export default function CoverageMap() {
  const flex = data.investigations.find((i) => i.id === "flex")!;
  const [fo, fo2] = flex.conditions.o2 as [number, number];
  const [fp0, fp1] = flex.conditions.pressureAtm as [number, number];
  const [active, setActive] = useState<string | null>(null);

  // PSI-20 objectives: 14.7 psia/21%, 10.2 psia/26.5%, 8.2 psia/34% (psia -> atm)
  const bre = [
    { o2: 0.21, p: 1.0, t: "14.7 psia · 21% O₂" },
    { o2: 0.265, p: 0.694, t: "10.2 psia · 26.5% O₂" },
    { o2: 0.34, p: 0.558, t: "8.2 psia · 34% O₂" },
  ];
  const envs = [
    { id: "earth", label: "Earth / ISS", o2: 0.21, p: 1.0, dx: 10, dy: -10 },
    { id: "moon-habitat", label: "Lunar base", o2: 0.3, p: 0.694, dx: 12, dy: 18 },
    { id: "suit", label: "Spacesuit", o2: 1.0, p: 0.293, dx: -10, dy: 20, anchor: "end" as const },
  ];

  const items: Record<string, Item> = {
    habitat: {
      id: "habitat",
      title: "Lunar habitat region",
      detail:
        "O₂ ≥ 26.5% and pressure ≤ 0.69 atm (10.2 psi). This is where materials are more flammable than on Earth and where data matters most.",
    },
    flex: {
      id: "flex",
      title: "FLEX (PSI-69): planned range",
      detail: `O₂ ${fmtPct(fo)}–${fmtPct(fo2)} and pressure ${fp0}–${fp1} atm. Heptane and methanol droplets with CO₂ and He suppressants. Covers part of the lunar habitat region.`,
    },
    bre: {
      id: "bre",
      title: "ACME BRE (PSI-20): habitat atmospheres tested",
      detail:
        "Three atmospheres NASA considers for missions: 14.7 psia/21% O₂, 10.2 psia/26.5% O₂ and 8.2 psia/34% O₂. With elevated O₂ the flame kept burning with no air flow; at 21% it self-extinguished.",
    },
    cfi: {
      id: "cfi",
      title: "CFI (PSI-39): pressure 0.25–5 atm",
      detail: "Cool flames in n-dodecane droplets. The O₂ concentration is not verified in the sources, so it is drawn as a margin bar rather than an area.",
    },
    cfig: {
      id: "cfig",
      title: "ACME CFI-G (PSI-159): up to 85% O₂",
      detail: "The microgravity tests with the most oxygen (challenge statement). Pressure is not verified, so only the O₂ maximum is marked.",
    },
    earth: { id: "earth", title: "Earth / ISS", detail: "21% O₂ at 14.7 psi. The ISS has the same atmosphere but in microgravity." },
    "moon-habitat": {
      id: "moon-habitat",
      title: "Planned lunar base",
      detail: "30% O₂ or more at 10.2 psi or less (challenge statement). +43% oxygen versus Earth: more flammable.",
    },
    suit: { id: "suit", title: "Spacesuit", detail: "100% O₂ at only 4.3 psi. Outside the range of every verified test." },
  };

  const act = (id: string) => ({
    tabIndex: 0,
    role: "button" as const,
    "aria-label": items[id]?.title,
    onMouseEnter: () => setActive(id),
    onFocus: () => setActive(id),
    onClick: () => setActive(id),
    style: { cursor: "pointer", outline: "none" },
  });
  const dim = (id: string) => (active && active !== id ? 0.35 : 1);
  const sel = active ? items[active] : null;

  const xt = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  const yt = [0.25, 0.5, 1, 2, 5];

  return (
    <div className="card p-3 sm:p-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Coverage map: oxygen versus pressure, showing the atmospheres tested by each investigation">
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
          Oxygen concentration (mole fraction)
        </text>
        <text transform={`translate(16 ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
          Total pressure (atm, log scale)
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
            Lunar habitat region
          </text>
        </g>

        {/* FLEX */}
        <g {...act("flex")} opacity={dim("flex")}>
          <rect x={x(fo)} y={y(fp1)} width={x(fo2) - x(fo)} height={y(fp0) - y(fp1)} fill="var(--a-suppression)" fillOpacity="0.28" stroke="var(--a-suppression)" strokeWidth="1.5" rx="3" />
          <text x={x(fo) + 8} y={y(fp1) + 16} fontSize="12" fontWeight="600" fill="var(--ink)">
            FLEX
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
            CFI (O₂ n/v)
          </text>
        </g>

        {/* CFI-G: O2 maximum on the top edge */}
        <g {...act("cfig")} opacity={dim("cfig")}>
          <path d={`M ${x(0.85)} ${M.t + 14} l -8 -14 l 16 0 z`} fill="var(--a-fundamental)" />
          <text x={x(0.85) - 12} y={M.t + 10} textAnchor="end" fontSize="11" fill="var(--a-fundamental)">
            CFI-G up to 85% (p n/v)
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
            <p className="font-medium">{sel.title}</p>
            <p className="mt-1 text-ink-2">{sel.detail}</p>
          </>
        ) : (
          <p className="text-ink-2">
            Hover (or focus with the keyboard) any element of the chart. <strong className="text-ink">Diamonds</strong> = real environments ·
            <strong className="text-ink"> areas and dots</strong> = atmospheres actually tested ·
            <strong className="text-ink"> margin marks</strong> = partial data (n/v = not verified).
          </p>
        )}
      </div>

      <details className="mt-3 text-sm text-ink-2">
        <summary className="cursor-pointer text-ink">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3">Element</th>
              <th className="py-1">Detail</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(items).map((i) => (
              <tr key={i.id} className="border-t border-line align-top">
                <td className="py-1.5 pr-3 font-medium text-ink">{i.title}</td>
                <td className="py-1.5">{i.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
