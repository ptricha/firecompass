import Link from "next/link";
import { data, AREA_COLOR, AREA_LABEL, type Area } from "@/lib/data";
import { AreaBadge, Section, SourceTag, Stat } from "@/components/ui";
import CoverageMap from "@/components/CoverageMap";

const totalFiles = data.investigations.reduce((s, i) => s + i.files.total, 0);
const totalVideos = data.investigations.reduce((s, i) => s + i.files.videos, 0);
const withDoi = data.investigations.filter((i) => i.doi).length;

const FINDINGS = [
  {
    id: "acme-bre",
    kicker: "Habitat atmospheres",
    title: "Turning off the ventilation may not put the fire out",
    text: "In ACME BRE, with elevated oxygen the flames kept burning in microgravity with no air flow at all; at 21% O₂ they self-extinguished. Cutting ventilation is today an established step to extinguish spacecraft fires.",
    src: "PSI",
    psi: "PSI-20",
  },
  {
    id: "bass",
    kicker: "Material selection",
    title: "The test NASA uses to pick materials is not conservative",
    text: "BASS indicates that NASA-STD-6001 Test 1, a 1-g test, does not capture the worst case: materials can burn at lower oxygen levels in microgravity. The minimum appears near 10 cm/s, the typical speed of spacecraft ventilation.",
    src: "GUIDE p.31",
    psi: "PSI-26",
  },
  {
    id: "flex",
    kicker: "Suppression",
    title: "Earth-based suppressant standards give less margin in space",
    text: "FLEX found that the flammability limit is lower in reduced gravity, so terrestrial standards for inert-gas suppressants (CO₂, He) do not offer the same margin of safety.",
    src: "GUIDE p.12",
    psi: "PSI-69",
  },
];

const AREAS: Area[] = ["prevention", "detection", "suppression", "fundamental"];
const AREA_TEXT: Record<Area, string> = {
  prevention: "Which materials and atmospheres can be allowed. BASS, BASS-II, Saffire, BRE.",
  detection: "What smoke looks like without gravity. SAME, SAME-R, DAFT.",
  suppression: "What puts a fire out, and with what margin. FLEX, FLEX-2.",
  fundamental: "Flame physics that feeds the models. ACME, CFI, SPICE, SLICE.",
};

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <p className="eyebrow">NASA Space Apps 2026 · Flame in Freefall</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          What will burn first in a{" "}
          <span style={{ color: "var(--accent)" }}>lunar base</span>?
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">
          FireCompass turns decades of NASA combustion experiments into clear answers: what has been measured, under what
          conditions, which investigations matter most for the Moon and Mars, and where there is still no data.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/simulator" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
            Open the simulator
          </Link>
          <Link href="/lab" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            Explore the real data
          </Link>
          <Link href="/explorer" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            Explore investigations
          </Link>
          <Link href="/ask" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            Ask the data
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(data.investigations.length)} label="investigations analyzed" note={`${withDoi} with a verified PSI DOI`} />
          <Stat value={totalFiles.toLocaleString("en")} label="public files in PSI" note="summed across all investigations" />
          <Stat value={String(totalVideos)} label="real flame videos" note="BASS, BASS-II, CFI, SAME and SPICE" />
          <Stat value="0" label="partial-gravity data sets" note="LUCI and FM2 will measure it on the Moon" />
        </div>
      </section>

      {/* FINDINGS */}
      <Section eyebrow="What the data says" title="Three findings that change how we think about fire in space">
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {FINDINGS.map((f) => (
            <article key={f.id} className="card flex flex-col p-5">
              <p className="eyebrow">{f.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-2">{f.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SourceTag src={f.src} />
                <Link href={`/explorer/${f.id}`} className="link text-sm">
                  See {f.psi} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* MAP */}
      <Section eyebrow="Experimental coverage" title="Where has fire been measured… and where not?">
        <p className="mt-3 max-w-3xl text-ink-2">
          Every area or dot is an atmosphere that was actually tested. The orange zone is what a lunar base is expected to
          have: more oxygen and less pressure than on Earth. Much of that region is barely covered, and no test was run
          at lunar gravity.
        </p>
        <div className="mt-6">
          <CoverageMap />
        </div>
      </Section>

      {/* AREAS */}
      <Section eyebrow="Three safety areas" title="Prevention, detection and suppression">
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((a) => {
            const n = data.investigations.filter((i) => i.areas.includes(a)).length;
            return (
              <Link key={a} href="/explorer" className="card p-4 transition-colors hover:bg-surface-2">
                <div className="h-1 w-10 rounded" style={{ background: AREA_COLOR[a] }} />
                <h3 className="mt-3 font-semibold">{AREA_LABEL[a]}</h3>
                <p className="mt-1 text-sm text-ink-2">{AREA_TEXT[a]}</p>
                <p className="mt-3 text-xs text-muted">{n} investigations</p>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* HISTORY */}
      <Section eyebrow="Why it matters" title="When fire stops being theory">
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {data.incidents.map((inc) => (
            <li key={inc.name} className="card p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>
                  {inc.year}
                </span>
                <h3 className="font-semibold">{inc.name}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-2">{inc.text}</p>
              <p className="mt-2 text-sm">
                <span className="text-muted">Lesson: </span>
                {inc.lesson}
              </p>
              <a className="link mt-2 inline-block text-xs" href={inc.src} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            </li>
          ))}
        </ol>
      </Section>

      {/* EARTH */}
      <Section eyebrow="Benefits on Earth" title="Space fire research already protects lives here">
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.spinoffs.map((s) => (
            <article key={s.name} className="card p-5">
              <p className="eyebrow">{s.year}</p>
              <h3 className="mt-1 font-semibold">{s.name}</h3>
              <p className="mt-2 text-sm text-ink-2">{s.text}</p>
              <a className="link mt-3 inline-block text-xs" href={s.src} target="_blank" rel="noreferrer">
                Source ↗
              </a>
            </article>
          ))}
        </div>
      </Section>

      {/* FUTURE */}
      <Section eyebrow="What comes next" title="The data that does not exist yet">
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {data.upcoming.map((u) => (
            <div key={u.acronym} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{u.acronym}</h3>
                <span className="text-xs text-muted">{u.gravity}</span>
              </div>
              <p className="text-sm text-ink-2">{u.name}</p>
              <p className="mt-2 text-sm text-ink-2">{u.note}</p>
              <div className="mt-2">
                <SourceTag src={u.src} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          <AreaBadge area="fundamental" /> FireCompass is built to ingest these data sets as soon as they are published in PSI.
        </p>
      </Section>
    </>
  );
}
