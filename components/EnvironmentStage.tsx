"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ImmersiveEnv } from "./ImmersiveScene";
import { useLang } from "@/lib/i18n";

// three.js and the NASA models are only fetched when a stage is actually shown.
const ImmersiveScene = dynamic(() => import("./ImmersiveScene"), {
  ssr: false,
  loading: () => <div className="h-[44vh] min-h-[300px] w-full rounded-xl border border-white/10 bg-black" aria-hidden="true" />,
});

const CREDIT: Record<ImmersiveEnv, string> = {
  earth: "Earth textures derived from NASA imagery (three.js examples)",
  iss: "ISS (D) (IGOAL), NASA 3D Resources, simplified for the web",
  moon: "Apollo Lunar Module, NASA 3D Resources; procedural terrain",
  mars: "Mars 2020 Perseverance Rover, NASA 3D Resources; procedural terrain",
  suit: "Extravehicular Mobility Unit (EMU), NASA 3D Resources",
};

/** Real 3D place for an environment: orbit with the mouse, zoom with the wheel. */
export default function EnvironmentStage({ env, className = "h-[44vh] min-h-[300px]" }: { env: ImmersiveEnv; className?: string }) {
  const { lang } = useLang();
  return (
    <figure>
      <ImmersiveScene env={env} className={className} />
      <figcaption className="mt-1.5 text-xs text-muted">
        {lang === "es" ? "Escena 3D: una visualización, no una medición." : "3D scene: a visualization, not a measurement."} {CREDIT[env]}.{" "}
        <Link href="/references" className="link">{lang === "es" ? "Fuentes" : "References"}</Link>
      </figcaption>
    </figure>
  );
}
