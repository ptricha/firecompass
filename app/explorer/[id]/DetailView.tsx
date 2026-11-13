"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtRange } from "@/lib/data";
import { useData, useLang, useT } from "@/lib/i18n";
import { levelLabel, scoreInvestigation } from "@/lib/scoring";
import { AreaBadge, Pending, SourceTag } from "@/components/ui";
import ScoreBar from "@/components/ScoreBar";

const T = {
  en: {
    back: "← Back to the explorer",
    relTitle: "Relevance for a lunar base",
    relNote1: "Explainable score using the default weights; adjust them on the",
    relNote2: "ranking page",
    relNote3: "◌ = some condition is pending verification and counts as a neutral value.",
    cond: "Test conditions",
    o2: "Oxygen concentration",
    press: "Total pressure",
    flow: "Airflow speed",
    fuels: "Fuels",
    phase: "Fuel phase",
    sensors: "Sensors and measurements",
    hw: "Hardware",
    supp: "Suppressants",
    suppMF: "mole fraction",
    to: "to",
    and: "and",
    drop: "Droplet diameter",
    n2: "N₂ suppressant flow",
    atm: "Atmospheres tested",
    find: "Findings",
    measured: "measured data",
    reported: "reported result",
    space: "Space application",
    earth: "Application on Earth",
    dataTitle: "Data available in PSI",
    pubFiles: "public files",
    videos: "videos",
    table: "with an experimental table (CSV)",
    openPsi: "Open in PSI ↗",
    pubs: "Publications",
  },
  es: {
    back: "← Volver al explorador",
    relTitle: "Relevancia para una base lunar",
    relNote1: "Puntuación explicable con los pesos por defecto; ajústalos en la",
    relNote2: "página de ranking",
    relNote3: "◌ = alguna condición está pendiente de verificar y cuenta como valor neutro.",
    cond: "Condiciones de ensayo",
    o2: "Concentración de oxígeno",
    press: "Presión total",
    flow: "Velocidad del flujo de aire",
    fuels: "Combustibles",
    phase: "Fase del combustible",
    sensors: "Sensores y medidas",
    hw: "Hardware",
    supp: "Supresores",
    suppMF: "fracción molar",
    to: "a",
    and: "y",
    drop: "Diámetro de la gota",
    n2: "Caudal de supresor N₂",
    atm: "Atmósferas ensayadas",
    find: "Hallazgos",
    measured: "dato medido",
    reported: "resultado reportado",
    space: "Aplicación espacial",
    earth: "Aplicación en la Tierra",
    dataTitle: "Datos disponibles en PSI",
    pubFiles: "archivos públicos",
    videos: "vídeos",
    table: "con tabla experimental (CSV)",
    openPsi: "Abrir en PSI ↗",
    pubs: "Publicaciones",
  },
};

export default function DetailView({ id }: { id: string }) {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const inv = data.investigations.find((i) => i.id === id);
  if (!inv) notFound();
  const score = scoreInvestigation(inv);
  const c = inv.conditions;
  const fr = (r: [number | null, number | null] | null, u: string, s = 1) => fmtRange(r, u, s, lang);
  const o2 = fr(c.o2, "", 100);
  const loc = lang === "es" ? "es" : "en";

  const rows: [string, React.ReactNode][] = [
    [t.o2, o2 ? `${o2.trim()}%` : <Pending />],
    [t.press, fr(c.pressureAtm, "atm") ?? <Pending />],
    [t.flow, fr(c.flowCmS, "cm/s") ?? <Pending />],
    [t.fuels, inv.fuels.length ? inv.fuels.join(" · ") : <Pending />],
    [t.phase, inv.fuelPhase],
    [t.sensors, inv.sensors.length ? inv.sensors.join(" · ") : <Pending />],
    [t.hw, inv.hardware ?? <Pending />],
  ];
  if (c.suppressants && c.suppressantMoleFraction)
    rows.push([t.supp, `${c.suppressants.join(` ${t.and} `)}, ${t.suppMF} ${c.suppressantMoleFraction[0]} ${t.to} ${c.suppressantMoleFraction[1]}`]);
  if (c.dropletMm) rows.push([t.drop, fmtRange(c.dropletMm, "mm")!]);
  if (c.n2SuppressantCcMin) rows.push([t.n2, fmtRange(c.n2SuppressantCcMin, "cc/min")!]);
  if (c.atmospheres) rows.push([t.atm, c.atmospheres.join(" · ")]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10">
      <Link href="/explorer" className="link text-sm">
        {t.back}
      </Link>
      <p className="eyebrow mt-4">{inv.psiId}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{inv.acronym}</h1>
      <p className="mt-1 text-ink-2">{inv.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {inv.areas.map((a) => (
          <AreaBadge key={a} area={a} />
        ))}
        <span className="text-xs text-muted">· {inv.status}</span>
      </div>

      <p className="mt-6 text-lg">{inv.summary}</p>

      <section className="card mt-6 p-5" aria-labelledby="rel">
        <div className="flex items-baseline justify-between">
          <h2 id="rel" className="font-semibold">
            {t.relTitle}
          </h2>
          <span className="text-2xl font-semibold tabular-nums">
            {score.total.toFixed(0)}
            <span className="text-sm font-normal text-muted"> / 100 · {levelLabel(score.total, lang)}</span>
          </span>
        </div>
        <div className="mt-3">
          <ScoreBar score={score} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {t.relNote1}{" "}
          <Link href="/dashboard" className="link">
            {t.relNote2}
          </Link>
          . {score.pending.length > 0 && t.relNote3}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="cond">
        <h2 id="cond" className="text-xl font-semibold">
          {t.cond}
        </h2>
        <dl className="card mt-3 divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-3 sm:grid-cols-[14rem_1fr]">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        {c.note && <p className="mt-2 text-xs text-muted">{c.note}</p>}
      </section>

      <section className="mt-10" aria-labelledby="find">
        <h2 id="find" className="text-xl font-semibold">
          {t.find}
        </h2>
        <ul className="mt-3 space-y-3">
          {inv.findings.map((f, i) => (
            <li key={i} className="card p-4">
              <p className="text-sm">{f.text}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <SourceTag src={f.src} />
                <span>{f.kind === "measured" ? t.measured : t.reported}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(inv.spaceApplication || inv.earthApplication) && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {inv.spaceApplication && (
            <div className="card p-4">
              <p className="eyebrow">{t.space}</p>
              <p className="mt-1 text-sm">{inv.spaceApplication}</p>
            </div>
          )}
          {inv.earthApplication && (
            <div className="card p-4">
              <p className="eyebrow">{t.earth}</p>
              <p className="mt-1 text-sm">{inv.earthApplication}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-10" aria-labelledby="dat">
        <h2 id="dat" className="text-xl font-semibold">
          {t.dataTitle}
        </h2>
        <div className="card mt-3 p-4 text-sm">
          <p>
            <strong>{inv.files.total.toLocaleString(loc)}</strong> {t.pubFiles}
            {inv.files.videos > 0 && (
              <>
                , <strong>{inv.files.videos}</strong> {t.videos}
              </>
            )}
            {inv.files.experimentalTable && `, ${t.table}`}.
          </p>
          <p className="mt-2 text-xs text-muted">
            {Object.entries(inv.files.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([ty, n]) => `${ty}: ${n}`)
              .join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {inv.doiUrl && (
              <a className="link" href={inv.doiUrl} target="_blank" rel="noreferrer">
                DOI {inv.doi} ↗
              </a>
            )}
            <a className="link" href={inv.psiUrl} target="_blank" rel="noreferrer">
              {t.openPsi}
            </a>
          </div>
        </div>
      </section>

      {inv.publications.length > 0 && (
        <section className="mt-10" aria-labelledby="pub">
          <h2 id="pub" className="text-xl font-semibold">
            {t.pubs}
          </h2>
          <ul className="card mt-3 divide-y divide-line">
            {inv.publications.map((p, i) => (
              <li key={i} className="p-3 text-sm">
                <p>{p.title}</p>
                <p className="text-xs text-muted">{p.authors}</p>
                {p.doi && (
                  <a className="link text-xs" href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">
                    doi:{p.doi} ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
