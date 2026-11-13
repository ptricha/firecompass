"use client";

import { useState } from "react";
import FlameCanvas from "@/components/FlameCanvas";
import Flame3D from "@/components/Flame3D";
import type { EnvId, LabelText, Layers, SimParams, SimStats } from "@/lib/flameEngine";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    d3: "3D",
    d2: "2D",
    view: "View",
    rotate: "Rotate",
    air: "Air from cursor",
    airHint: "Move the cursor over the scene: air is blown toward the flame from where you point.",
    reset: "Reset view",
    orbit: "Drag to orbit · scroll to zoom",
    noWebgl: "WebGL is not available on this device: showing the 2D view.",
    gravity: "gravity",
  },
  es: {
    d3: "3D",
    d2: "2D",
    view: "Vista",
    rotate: "Rotar",
    air: "Aire desde el cursor",
    airHint: "Mueve el cursor sobre la escena: se sopla aire hacia la llama desde donde apuntes.",
    reset: "Restablecer vista",
    orbit: "Arrastra para orbitar · rueda para acercar",
    noWebgl: "WebGL no está disponible en este dispositivo: se muestra la vista 2D.",
    gravity: "gravedad",
  },
};

interface Props {
  params: SimParams;
  layers: Layers;
  env?: EnvId;
  running?: boolean;
  speed?: number;
  aspect?: number;
  labelText: LabelText;
  ariaLabel: string;
  reigniteKey?: number;
  onStats?: (s: SimStats) => void;
  toolbar?: boolean;
  className?: string;
}

/** 3D (WebGL) flame view with a 2D fallback. */
export default function FlameView({ params, layers, env = "none", running = true, speed = 1, aspect = 0.6, labelText, ariaLabel, reigniteKey = 0, onStats, toolbar = true, className }: Props) {
  const t = useT(T);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [rotate, setRotate] = useState(false);
  const [air, setAir] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [noWebgl, setNoWebgl] = useState(false);

  const btn = (on: boolean) => `rounded-md border px-2.5 py-1 text-xs font-medium backdrop-blur transition-colors ${on ? "border-accent bg-accent/25 text-ink" : "border-line-2 bg-bg/70 text-ink-2 hover:text-ink"}`;
  const g = params.gravityG;

  return (
    <div className={`relative ${className ?? ""}`}>
      {mode === "3d" ? (
        <Flame3D
          params={params}
          layers={layers}
          env={env}
          running={running}
          speed={speed}
          aspect={aspect}
          labelText={labelText}
          ariaLabel={ariaLabel}
          reigniteKey={reigniteKey}
          autoRotate={rotate}
          resetKey={resetKey}
          cursorAir={air}
          onStats={onStats}
          onUnsupported={() => {
            setNoWebgl(true);
            setMode("2d");
          }}
        />
      ) : (
        <FlameCanvas params={params} layers={layers} env={env} running={running} speed={speed} aspect={aspect} labelText={labelText} ariaLabel={ariaLabel} reigniteKey={reigniteKey} onStats={onStats} />
      )}

      {toolbar && (
        <div className="absolute right-2 top-2 z-20 flex flex-wrap items-center justify-end gap-1.5">
          <div className="flex overflow-hidden rounded-md border border-line-2 bg-bg/70 backdrop-blur" role="group" aria-label={t.view}>
            {(["3d", "2d"] as const).map((m) => (
              <button
                key={m}
                onClick={() => !noWebgl && setMode(m)}
                aria-pressed={mode === m}
                disabled={noWebgl && m === "3d"}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors ${mode === m ? "bg-accent/30 text-ink" : "text-ink-2 hover:text-ink"} disabled:opacity-40`}
              >
                {m === "3d" ? t.d3 : t.d2}
              </button>
            ))}
          </div>
          {mode === "3d" && (
            <>
              <button onClick={() => setRotate((r) => !r)} aria-pressed={rotate} className={btn(rotate)}>{t.rotate}</button>
              <button onClick={() => setAir((a) => !a)} aria-pressed={air} title={t.airHint} className={btn(air)}>{t.air}</button>
              <button onClick={() => setResetKey((k) => k + 1)} className={btn(false)}>{t.reset}</button>
            </>
          )}
        </div>
      )}

      {mode === "3d" && (
        <>
          <div className="pointer-events-none absolute bottom-2 left-3 z-20 flex items-end gap-2 text-[11px] font-semibold text-ink-2" aria-hidden="true">
            {g > 0.02 ? (
              <svg width="14" height={14 + 26 * Math.min(1, g)} viewBox={`0 0 14 ${14 + 26 * Math.min(1, g)}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={`M7 2 V${8 + 26 * Math.min(1, g)}`} />
                <path d={`M2 ${3 + 26 * Math.min(1, g)} L7 ${10 + 26 * Math.min(1, g)} L12 ${3 + 26 * Math.min(1, g)}`} />
              </svg>
            ) : null}
            <span>{g > 0.02 ? `g = ${g.toFixed(2)}` : "g ≈ 0"}</span>
          </div>
          <p className="pointer-events-none absolute bottom-2 right-3 z-20 text-[11px] text-muted">{air ? t.airHint : t.orbit}</p>
        </>
      )}
      {noWebgl && <p className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-md border border-line bg-bg/80 px-2 py-1 text-[11px] text-ink-2">{t.noWebgl}</p>}
    </div>
  );
}
