"use client";

import { useEffect, useRef } from "react";
import { FlameEngine, type EnvId, type LabelText, type Layers, type SimParams, type SimStats } from "@/lib/flameEngine";

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
  className?: string;
}

/** Canvas wrapper around FlameEngine: sizing, animation loop, pause when hidden. */
export default function FlameCanvas({ params, layers, env = "none", running = true, speed = 1, aspect = 0.6, labelText, ariaLabel, reigniteKey = 0, onStats, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const eng = useRef<FlameEngine | null>(null);
  const live = useRef({ running, speed, onStats });
  const dirty = useRef(true);
  const visible = useRef(true);

  live.current = { running, speed, onStats };

  // create engine + loop once
  useEffect(() => {
    const canvas = cv.current!;
    const box = wrap.current!;
    const ctx = canvas.getContext("2d")!;
    const e = new FlameEngine();
    eng.current = e;
    e.setParams(params);
    e.setLayers(layers);
    e.setEnv(env);
    e.labelText = labelText;

    const fit = () => {
      const w = Math.max(280, Math.floor(box.clientWidth));
      const h = Math.floor(w * aspect);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      e.resize(w, h);
      dirty.current = true;
    };
    fit();
    e.warmup(2.5);

    const ro = new ResizeObserver(fit);
    ro.observe(box);
    const io = new IntersectionObserver(([en]) => { visible.current = en.isIntersecting; }, { threshold: 0.02 });
    io.observe(box);

    let raf = 0;
    let last = performance.now();
    let statAcc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible.current || document.hidden) return;
      const L = live.current;
      if (L.running) {
        e.step(dt * L.speed);
        dirty.current = true;
      }
      if (dirty.current) {
        e.draw(ctx);
        dirty.current = false;
      }
      statAcc += dt;
      if (statAcc > 0.25 && L.onStats) {
        statAcc = 0;
        L.onStats(e.stats());
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      eng.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  useEffect(() => {
    eng.current?.setParams(params);
    dirty.current = true;
  }, [params]);
  useEffect(() => {
    eng.current?.setLayers(layers);
    dirty.current = true;
  }, [layers]);
  useEffect(() => {
    eng.current?.setEnv(env);
    dirty.current = true;
  }, [env]);
  useEffect(() => {
    if (eng.current) eng.current.labelText = labelText;
    dirty.current = true;
  }, [labelText]);
  useEffect(() => {
    if (reigniteKey) eng.current?.reignite();
  }, [reigniteKey]);

  return (
    <div ref={wrap} className={className}>
      <canvas ref={cv} role="img" aria-label={ariaLabel} className="block w-full rounded-xl border border-line" />
    </div>
  );
}
