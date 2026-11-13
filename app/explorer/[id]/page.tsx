import Link from "next/link";
import { notFound } from "next/navigation";
import { data, fmtRange, getInvestigation } from "@/lib/data";
import { level, scoreInvestigation } from "@/lib/scoring";
import { AreaBadge, Pending, SourceTag } from "@/components/ui";
import ScoreBar from "@/components/ScoreBar";

export function generateStaticParams() {
  return data.investigations.map((i) => ({ id: i.id }));
}

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = getInvestigation(id);
  if (!inv) notFound();
  const score = scoreInvestigation(inv);
  const c = inv.conditions;
  const o2 = fmtRange(c.o2, "", 100);

  const rows: [string, React.ReactNode][] = [
    ["Oxygen concentration", o2 ? `${o2.trim()}%` : <Pending />],
    ["Total pressure", fmtRange(c.pressureAtm, "atm") ?? <Pending />],
    ["Airflow speed", fmtRange(c.flowCmS, "cm/s") ?? <Pending />],
    ["Fuels", inv.fuels.length ? inv.fuels.join(" · ") : <Pending />],
    ["Fuel phase", inv.fuelPhase],
    ["Sensors and measurements", inv.sensors.length ? inv.sensors.join(" · ") : <Pending />],
    ["Hardware", inv.hardware ?? <Pending />],
  ];
  if (c.suppressants && c.suppressantMoleFraction)
    rows.push(["Suppressants", `${c.suppressants.join(" and ")}, mole fraction ${c.suppressantMoleFraction[0]} to ${c.suppressantMoleFraction[1]}`]);
  if (c.dropletMm) rows.push(["Droplet diameter", fmtRange(c.dropletMm, "mm")!]);
  if (c.n2SuppressantCcMin) rows.push(["N₂ suppressant flow", fmtRange(c.n2SuppressantCcMin, "cc/min")!]);
  if (c.atmospheres) rows.push(["Atmospheres tested", c.atmospheres.join(" · ")]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10">
      <Link href="/explorer" className="link text-sm">
        ← Back to the explorer
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
            Relevance for a lunar base
          </h2>
          <span className="text-2xl font-semibold tabular-nums">
            {score.total.toFixed(0)}
            <span className="text-sm font-normal text-muted"> / 100 · {level(score.total)}</span>
          </span>
        </div>
        <div className="mt-3">
          <ScoreBar score={score} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Explainable score using the default weights; adjust them on the <Link href="/dashboard" className="link">ranking page</Link>.
          {score.pending.length > 0 && " ◌ = some condition is pending verification and counts as a neutral value."}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="cond">
        <h2 id="cond" className="text-xl font-semibold">
          Test conditions
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
          Findings
        </h2>
        <ul className="mt-3 space-y-3">
          {inv.findings.map((f, i) => (
            <li key={i} className="card p-4">
              <p className="text-sm">{f.text}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <SourceTag src={f.src} />
                <span>{f.kind === "measured" ? "measured data" : "reported result"}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {(inv.spaceApplication || inv.earthApplication) && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {inv.spaceApplication && (
            <div className="card p-4">
              <p className="eyebrow">Space application</p>
              <p className="mt-1 text-sm">{inv.spaceApplication}</p>
            </div>
          )}
          {inv.earthApplication && (
            <div className="card p-4">
              <p className="eyebrow">Application on Earth</p>
              <p className="mt-1 text-sm">{inv.earthApplication}</p>
            </div>
          )}
        </section>
      )}

      <section className="mt-10" aria-labelledby="dat">
        <h2 id="dat" className="text-xl font-semibold">
          Data available in PSI
        </h2>
        <div className="card mt-3 p-4 text-sm">
          <p>
            <strong>{inv.files.total.toLocaleString("en")}</strong> public files
            {inv.files.videos > 0 && (
              <>
                , <strong>{inv.files.videos}</strong> videos
              </>
            )}
            {inv.files.experimentalTable && ", with an experimental table (CSV)"}.
          </p>
          <p className="mt-2 text-xs text-muted">
            {Object.entries(inv.files.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([t, n]) => `${t}: ${n}`)
              .join(" · ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {inv.doiUrl && (
              <a className="link" href={inv.doiUrl} target="_blank" rel="noreferrer">
                DOI {inv.doi} ↗
              </a>
            )}
            <a className="link" href={inv.psiUrl} target="_blank" rel="noreferrer">
              Open in PSI ↗
            </a>
          </div>
        </div>
      </section>

      {inv.publications.length > 0 && (
        <section className="mt-10" aria-labelledby="pub">
          <h2 id="pub" className="text-xl font-semibold">
            Publications
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
