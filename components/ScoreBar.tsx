"use client";

import { FACTORS, FACTOR_COLOR, factorInfo, type ScoreResult } from "@/lib/scoring";
import { useLang } from "@/lib/i18n";

/** Stacked bar: each segment is what one factor contributes to the total. Accessible with text. */
const COLORS: Record<string, string> = FACTOR_COLOR;

export default function ScoreBar({ score, compact = false }: { score: ScoreResult; compact?: boolean }) {
  const { lang } = useLang();
  const info = factorInfo(lang);
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`${lang === "es" ? "Puntuación" : "Score"} ${score.total.toFixed(0)} ${lang === "es" ? "de 100" : "out of 100"}: ${FACTORS.map(
          (k) => `${info[k].label} ${score.parts[k].toFixed(0)}`,
        ).join(", ")}`}
      >
        {FACTORS.map((k) => (
          <div
            key={k}
            title={`${info[k].label}: ${score.parts[k].toFixed(1)} pts`}
            style={{ width: `${score.parts[k]}%`, background: COLORS[k], marginRight: 2 }}
          />
        ))}
      </div>
      {!compact && (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-ink-2 sm:grid-cols-2">
          {FACTORS.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[k] }} aria-hidden="true" />
              <span className="flex-1">{info[k].label}</span>
              <span className="tabular-nums text-ink">{score.parts[k].toFixed(1)}</span>
              {k === "habitat" && score.pending.includes("habitat") && (
                <span
                  className="text-muted"
                  title={lang === "es" ? "Alguna condición no está verificada; cuenta como 0.5" : "Some condition is not verified; it counts as 0.5"}
                >
                  ◌
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
