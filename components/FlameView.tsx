"use client";

import { useState } from "react";
import FlameCanvas from "@/components/FlameCanvas";
import dynamic from "next/dynamic";
import type { ZoomPreset } from "@/components/Flame3D";

// the 3D view (and three.js behind it) is a separate chunk, loaded only when a flame is shown
const Flame3D = dynamic(() => import("@/components/Flame3D"), { ssr: false });
import type { EnvId, LabelText, Layers, SimParams, SimStats } from "@/lib/flameEngine";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    d3: "3D",
    d2: "2D",
    view: "View mode",
    rotate: "Auto-spin",
    air: "Blow air",
    airHint: "Move the cursor over the scene: air is blown toward the flame from where you point.",
    reset: "Reset view",
    zoomLabel: "Zoom to",
    chamber: "Chamber",
    flame: "Flame",
    molecules: "Molecules",
    orbit: "Drag to orbit · scroll to zoom into any point",
    noWebgl: "WebGL is not available on this device: showing the 2D view.",
    scale: "Molecules enlarged millions of times, not to scale.",
    zoom: "zoom",
  },
  es: {
    d3: "3D",
    d2: "2D",
    view: "Modo de vista",
    rotate: "Giro automático",
    air: "Soplar aire",
    airHint: "Mueve el cursor sobre la escena: se sopla aire hacia la llama desde donde apuntes.",
    reset: "Restablecer vista",
    zoomLabel: "Ir a",
    chamber: "Cámara",
    flame: "Llama",
    molecules: "Moléculas",
    orbit: "Arrastra para orbitar · rueda para acercar a cualquier punto",
    noWebgl: "WebGL no está disponible en este dispositivo: se muestra la vista 2D.",
    scale: "Moléculas ampliadas millones de veces, fuera de escala.",
    zoom: "zoom",
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
  /** Title shown in the bar above the canvas (never over it). */
  title?: string;
  /** Extra content for the footer bar (e.g. live stats). */
  footer?: React.ReactNode;
  className?: string;
}

/** 3D (WebGL) flame view with a 2D fallback. Controls live in bars above and below the canvas, never over it. */
export default function FlameView({ params, layers, env = "none", running = true, speed = 1, aspect = 0.6, labelText, ariaLabel, reigniteKey = 0, onStats, toolbar = true, title, footer, className }: Props) {
  const t = useT(T);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [rotate, setRotate] = useState(false);
  const [air, setAir] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [noWebgl, setNoWebgl] = useState(false);
  const [zoomReq, setZoomReq] = useState<{ preset: ZoomPreset; n: number }>({ preset: "chamber", n: 0 });
  const [zoomX, setZoomX] = useState(1);

  const btn = (on: boolean) => `shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${on ? "border-accent bg-accent/25 text-ink" : "border-line-2 bg-bg/70 text-ink-2 hover:text-ink"}`;
  const g = params.gravityG;
  const gh = 14 + 26 * Math.min(1, g);

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {(title || toolbar) && (
        <div className="flex flex-col gap-2">
          {title && <h3 className="truncate text-sm font-semibold text-ink" title={title}>{title}</h3>}
          {toolbar && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex shrink-0 overflow-hidden rounded-md border border-line-2 bg-bg/70" role="group" aria-label={t.view}>
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
                  <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-line-2 bg-bg/70" role="group" aria-label={t.zoomLabel}>
                    <span className="px-2 text-[11px] text-muted">{t.zoomLabel}</span>
                    {(["chamber", "flame", "molecules"] as const).map((p) => (
                      <button key={p} onClick={() => setZoomReq((z) => ({ preset: p, n: z.n + 1 }))} className="px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-accent/20 hover:text-ink">
                        {t[p]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRotate((r) => !r)} aria-pressed={rotate} className={btn(rotate)}>{t.rotate}</button>
                  <button onClick={() => setAir((a) => !a)} aria-pressed={air} title={t.airHint} className={btn(air)}>{t.air}</button>
                  <button
                    onClick={() => {
                      setResetKey((k) => k + 1);
                      setRotate(false);
                      setAir(false);
                    }}
                    className={btn(false)}
                  >
                    {t.reset}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="relative">
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
            zoomReq={zoomReq}
            onZoom={(x) => setZoomX((p) => (Math.abs(p - x) > 0.04 * p ? x : p))}
            onStats={onStats}
            onUnsupported={() => {
              setNoWebgl(true);
              setMode("2d");
            }}
          />
        ) : (
          <FlameCanvas params={params} layers={layers} env={env} running={running} speed={speed} aspect={aspect} labelText={labelText} ariaLabel={ariaLabel} reigniteKey={reigniteKey} onStats={onStats} />
        )}
      </div>

      {(mode === "3d" || footer || noWebgl) && (
        <div className="flex min-h-11 flex-wrap items-start justify-between gap-x-4 gap-y-1 text-[11px] text-ink-2">
          {mode === "3d" ? (
            <div className="flex items-center gap-2 font-semibold" aria-hidden="true">
              {g > 0.02 && (
                <svg width="14" height={gh} viewBox={`0 0 14 ${gh}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d={`M7 2 V${gh - 6}`} />
                  <path d={`M2 ${gh - 13} L7 ${gh - 6} L12 ${gh - 13}`} />
                </svg>
              )}
              <span>{g > 0.02 ? `g = ${g.toFixed(2)}` : "g ≈ 0"}</span>
              <span className="font-normal text-muted">· {t.zoom} ×{zoomX >= 10 ? Math.round(zoomX) : zoomX.toFixed(1)}</span>
            </div>
          ) : (
            <span />
          )}
          {footer}
          {mode === "3d" && <p className="text-muted">{air ? t.airHint : t.orbit}{zoomX > 4 ? ` · ${t.scale}` : ""}</p>}
          {noWebgl && <p className="rounded-md border border-line bg-bg/80 px-2 py-1">{t.noWebgl}</p>}
        </div>
      )}
    </div>
  );
}
