import { FACTORS, FACTOR_INFO, type ScoreResult } from "@/lib/scoring";

/** Barra apilada: cada tramo es lo que aporta un factor al total. Accesible con texto. */
const COLORS: Record<string, string> = {
  habitat: "var(--accent)",
  realism: "var(--a-prevention)",
  safety: "var(--a-suppression)",
  data: "var(--a-fundamental)",
  modeling: "#8f8d86",
};

export default function ScoreBar({ score, compact = false }: { score: ScoreResult; compact?: boolean }) {
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
        role="img"
        aria-label={`Score ${score.total.toFixed(0)} out of 100: ${FACTORS.map(
          (k) => `${FACTOR_INFO[k].label} ${score.parts[k].toFixed(0)}`,
        ).join(", ")}`}
      >
        {FACTORS.map((k) => (
          <div
            key={k}
            title={`${FACTOR_INFO[k].label}: ${score.parts[k].toFixed(1)} pts`}
            style={{ width: `${score.parts[k]}%`, background: COLORS[k], marginRight: 2 }}
          />
        ))}
      </div>
      {!compact && (
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-ink-2 sm:grid-cols-2">
          {FACTORS.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[k] }} aria-hidden="true" />
              <span className="flex-1">{FACTOR_INFO[k].label}</span>
              <span className="tabular-nums text-ink">{score.parts[k].toFixed(1)}</span>
              {k === "habitat" && score.pending.includes("habitat") && (
                <span className="text-muted" title="Some condition is not verified; it counts as 0.5">
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
