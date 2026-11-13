import { data } from "@/lib/data";
import { Section } from "@/components/ui";

const LIBS = [
  ["Next.js 16 (MIT)", "https://nextjs.org"],
  ["React 19 (MIT)", "https://react.dev"],
  ["Tailwind CSS 4 (MIT)", "https://tailwindcss.com"],
  ["TypeScript (Apache-2.0)", "https://www.typescriptlang.org"],
  ["Anthropic TypeScript SDK (MIT), optional AI answers", "https://github.com/anthropics/anthropic-sdk-typescript"],
  ["Geist and Geist Mono fonts (SIL Open Font License) via Google Fonts", "https://vercel.com/font"],
] as const;

const OTHER = [
  ["NASA PSI experimental tables PSI-69 (FLEX) and PSI-25 (BASS-II), CC0. The unmodified files were obtained from the public copy in another team's repository (github.com/ngu-ming-henn/Nasa-Space-Apps-Sarawak, data/raw/nasa_psi) because the PSI download service was unavailable; their byte sizes (24,776 and 16,590) match NASA's published metadata. FireCompass computes all statistics from the rows itself.", "https://github.com/ngu-ming-henn/Nasa-Space-Apps-Sarawak"],
  ["NASA Space Apps Challenge 2026: Flame in Freefall (challenge statement and resources)", "https://www.spaceappschallenge.org"],
  ["NASA Combustion Science, Glenn Research Center", "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/"],
  ["A Researcher's Guide to Combustion Science (NASA, 2015)", "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf"],
  ["NASA fact sheets: BASS, FLEX / FLEX-2, SAME", "https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/"],
  ["Apollo 1, NASA Safety Center", "https://sma.nasa.gov/sma-disciplines/accllp/apollo-1"],
  ["Apollo 13, NASA Safety Center", "https://sma.nasa.gov/sma-disciplines/accllp/apollo-13"],
  ["25 Years Ago: Fire Aboard Space Station Mir, NASA History", "https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/"],
  ["NASA Spinoff: firefighter air tanks", "https://spinoff.nasa.gov/node/9582"],
  ["NASA Spinoff: firefighter protective clothing (Project FIRES)", "https://spinoff.nasa.gov/node/9918"],
  ["NASA Spinoff: Fire Detector (Brunswick Incipient Fire Detector), NTRS", "http://hdl.handle.net/hdl:2060/20070018916"],
] as const;

export default function References() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-4 pt-10">
      <p className="eyebrow">References and method</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Every source, library and limitation</h1>
      <p className="mt-3 text-ink-2">
        This page lists all external resources used in FireCompass (code, text, data and fonts), as required by the NASA
        Space Apps submission rules. No copyrighted music, images or text were used; all graphics are original SVG.
      </p>

      <Section eyebrow="Data" title="NASA data (core of the project)">
        <ul className="card mt-4 divide-y divide-line">
          <li className="p-3 text-sm">
            <strong>NASA Physical Sciences Informatics (PSI)</strong> investigation metadata, retrieved from the public PSI API
            (no authentication) at build time: objectives, hypotheses, hardware, file inventories, publications and DOIs for{" "}
            {data.investigations.length} investigations.{" "}
            <a className="link" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">psi.nasa.gov ↗</a>
          </li>
          {data.investigations.map((i) => (
            <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
              <span>
                {i.acronym} <span className="text-muted">({i.psiId})</span>
              </span>
              {i.doiUrl && (
                <a className="link text-xs" href={i.doiUrl} target="_blank" rel="noreferrer">
                  doi:{i.doi} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Documents" title="NASA documents and pages">
        <ul className="card mt-4 divide-y divide-line">
          {OTHER.map(([t, u]) => (
            <li key={u + t} className="p-3 text-sm">
              {t}{" "}
              <a className="link" href={u} target="_blank" rel="noreferrer">
                ↗
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Software" title="Libraries, fonts and tools">
        <ul className="card mt-4 divide-y divide-line">
          {LIBS.map(([t, u]) => (
            <li key={t} className="p-3 text-sm">
              {t}{" "}
              <a className="link" href={u} target="_blank" rel="noreferrer">
                ↗
              </a>
            </li>
          ))}
          <li className="p-3 text-sm">
            AI assistance: the code was developed with the help of Claude (Anthropic) via Claude Code, and the optional “Ask”
            answers can use a Claude model. All outputs are grounded in the data above.
          </li>
        </ul>
      </Section>

      <Section eyebrow="Method" title="How to read the numbers">
        <div className="mt-4 space-y-3 text-sm text-ink-2">
          <p>
            <strong className="text-ink">Verified, never invented.</strong> Each value shown comes from a cited NASA source.
            When a condition could not be verified, it appears as <em>not verified</em> and is excluded from claims.
          </p>
          <p>
            <strong className="text-ink">Relevance score.</strong> A FireCompass editorial method (0–100) combining five
            factors with adjustable weights: habitat atmosphere match (default 35), fuel realism (25), fire-safety focus (20),
            data richness (10) and modeling value (10). Unknown inputs count as a neutral 0.5 and are flagged. It is a
            prioritization aid, not a NASA metric.
          </p>
          <p>
            <strong className="text-ink">Partial gravity.</strong> PSI contains no partial-gravity combustion data. Lunar and
            Martian conditions are shown as gaps, not extrapolated. The flammability curve is a qualitative schematic.
          </p>
          <p>
            <strong className="text-ink">Data access.</strong> Investigation metadata and file inventories come from the PSI
            API. The <em>Data Lab</em> uses the experimental tables of FLEX (274 tests) and BASS-II (129 tests); counts and
            percentages are computed from the recorded rows, with no modeling. Other tables and the videos are linked to their
            PSI pages and are the next step of the roadmap.
          </p>
          <p className="text-xs text-muted">
            Data generated {new Date(data.generatedAt).toISOString().slice(0, 10)}. FireCompass is an independent project and
            is not affiliated with or endorsed by NASA.
          </p>
        </div>
      </Section>
    </div>
  );
}
