"use client";

import Image from "next/image";
import Link from "next/link";
import { AREA_COLOR, areaLabel, type Area } from "@/lib/data";
import { useData, useLang, useT } from "@/lib/i18n";
import { AreaBadge, Section, SourceTag, Stat } from "@/components/ui";
import CoverageMap from "@/components/CoverageMap";

const AREAS: Area[] = ["prevention", "detection", "suppression", "fundamental"];

const T = {
  en: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "What will burn first in a",
    h1b: "lunar base",
    lead: "JaPax turns decades of NASA combustion experiments into clear answers: what has been measured, under what conditions, which investigations matter most for the Moon and Mars, and where there is still no data.",
    ctaSim: "Open the simulator",
    ctaLab: "Explore the real data",
    ctaExp: "Explore investigations",
    ctaAsk: "Ask the Oracle",
    ctaHist: "Explore the history",
    s1: "investigations analyzed",
    s1n: (n: number) => `${n} with a verified PSI DOI`,
    s2: "public files in PSI",
    s2n: "summed across all investigations",
    s3: "real flame videos",
    s3n: "BASS, BASS-II, CFI, SAME and SPICE",
    s4: "partial-gravity data sets in PSI",
    s4n: "LUCI published first lunar-g results (NTRS), but no downloadable data yet; FM2 flies to the Moon in late 2026",
    fEyebrow: "What the data says",
    fTitle: "Three findings that change how we think about fire in space",
    see: "See",
    f: [
      { kicker: "Habitat atmospheres", title: "Turning off the ventilation may not put the fire out", text: "In ACME BRE, with elevated oxygen the flames kept burning in microgravity with no air flow at all; at 21% O₂ they self-extinguished. Cutting ventilation is today an established step to extinguish spacecraft fires." },
      { kicker: "Material selection", title: "The test NASA uses to pick materials is not conservative", text: "BASS indicates that NASA-STD-6001 Test 1, a 1-g test, does not capture the worst case: materials can burn at lower oxygen levels in microgravity. The minimum appears near 10 cm/s, the typical speed of spacecraft ventilation." },
      { kicker: "Suppression", title: "Earth-based suppressant standards give less margin in space", text: "FLEX found that the flammability limit is lower in reduced gravity, so terrestrial standards for inert-gas suppressants (CO₂, He) do not offer the same margin of safety." },
    ],
    mEyebrow: "Experimental coverage",
    mTitle: "Where has fire been measured… and where not?",
    mText: "Every area or dot is an atmosphere that was actually tested. The orange zone is what a lunar base is expected to have: more oxygen and less pressure than on Earth. Much of that region is barely covered, and no test was run at lunar gravity.",
    aEyebrow: "Three safety areas",
    aTitle: "Prevention, detection and suppression",
    aText: {
      prevention: "Which materials and atmospheres can be allowed. BASS, BASS-II, Saffire, BRE.",
      detection: "What smoke looks like without gravity. SAME, SAME-R, DAFT.",
      suppression: "What puts a fire out, and with what margin. FLEX, FLEX-2.",
      fundamental: "Flame physics that feeds the models. ACME, CFI, SPICE, SLICE.",
    } as Record<Area, string>,
    invs: "investigations",
    hEyebrow: "Why it matters",
    hTitle: "When fire stops being theory",
    lesson: "Lesson",
    source: "Source",
    eEyebrow: "Benefits on Earth",
    eTitle: "Space fire research already protects lives here",
    nEyebrow: "What comes next",
    nTitle: "The data that does not exist yet",
    nNote: "JaPax is built to ingest these data sets as soon as they are published in PSI.",
  },
  es: {
    eyebrow: "NASA Space Apps 2026 · Flame in Freefall",
    h1a: "¿Qué arderá primero en una",
    h1b: "base lunar",
    lead: "JaPax convierte décadas de experimentos de combustión de NASA en respuestas claras: qué se ha medido, en qué condiciones, qué investigaciones importan más para la Luna y Marte, y dónde todavía no hay datos.",
    ctaSim: "Abrir el simulador",
    ctaLab: "Explorar los datos reales",
    ctaExp: "Explorar investigaciones",
    ctaAsk: "Pregunta al Oráculo",
    ctaHist: "Explorar la historia",
    s1: "investigaciones analizadas",
    s1n: (n: number) => `${n} con DOI de PSI verificado`,
    s2: "archivos públicos en PSI",
    s2n: "sumados en todas las investigaciones",
    s3: "vídeos de llamas reales",
    s3n: "BASS, BASS-II, CFI, SAME y SPICE",
    s4: "conjuntos de datos de gravedad parcial en PSI",
    s4n: "LUCI publicó primeros resultados en g lunar (NTRS), pero aún sin datos descargables; FM2 viaja a la Luna a finales de 2026",
    fEyebrow: "Lo que dicen los datos",
    fTitle: "Tres hallazgos que cambian cómo pensamos el fuego en el espacio",
    see: "Ver",
    f: [
      { kicker: "Atmósferas de hábitat", title: "Apagar la ventilación podría no apagar el fuego", text: "En ACME BRE, con oxígeno elevado las llamas siguieron ardiendo en microgravedad sin ningún flujo de aire; a 21% de O₂ se autoextinguían. Cortar la ventilación es hoy un paso establecido para apagar incendios en naves." },
      { kicker: "Selección de materiales", title: "El test con el que NASA elige materiales no es conservador", text: "BASS indica que NASA-STD-6001 Test 1, un ensayo de 1 g, no cubre el peor caso: los materiales pueden arder con menos oxígeno en microgravedad. El mínimo aparece hacia 10 cm/s, la velocidad típica de la ventilación de una nave." },
      { kicker: "Supresión", title: "Los estándares terrestres de supresores dan menos margen en el espacio", text: "FLEX encontró que el límite de inflamabilidad es menor en gravedad reducida, así que los estándares terrestres de supresores de gas inerte (CO₂, He) no ofrecen el mismo margen de seguridad." },
    ],
    mEyebrow: "Cobertura experimental",
    mTitle: "¿Dónde se ha medido fuego… y dónde no?",
    mText: "Cada área o punto es una atmósfera realmente ensayada. La zona naranja es la que previsiblemente tendrá una base lunar: más oxígeno y menos presión que en la Tierra. Gran parte de esa región apenas está cubierta, y ningún ensayo se hizo con gravedad lunar.",
    aEyebrow: "Tres áreas de seguridad",
    aTitle: "Prevención, detección y supresión",
    aText: {
      prevention: "Qué materiales y atmósferas se pueden permitir. BASS, BASS-II, Saffire, BRE.",
      detection: "Cómo se ve el humo sin gravedad. SAME, SAME-R, DAFT.",
      suppression: "Qué apaga el fuego y con qué margen. FLEX, FLEX-2.",
      fundamental: "Física de las llamas que alimenta los modelos. ACME, CFI, SPICE, SLICE.",
    } as Record<Area, string>,
    invs: "investigaciones",
    hEyebrow: "Por qué importa",
    hTitle: "Cuando el fuego deja de ser teoría",
    lesson: "Lección",
    source: "Fuente",
    eEyebrow: "Beneficios en la Tierra",
    eTitle: "La investigación espacial sobre el fuego ya protege vidas aquí",
    nEyebrow: "Lo que viene",
    nTitle: "Los datos que aún no existen",
    nNote: "JaPax está preparado para incorporar estos conjuntos de datos en cuanto se publiquen en PSI.",
  },
};

const FINDING_META = [
  { id: "acme-bre", src: "PSI", psi: "PSI-20" },
  { id: "bass", src: "GUIDE p.31", psi: "PSI-26" },
  { id: "flex", src: "GUIDE p.12", psi: "PSI-69" },
];

export default function Home() {
  const t = useT(T);
  const { lang } = useLang();
  const data = useData();
  const totalFiles = data.investigations.reduce((s, i) => s + i.files.total, 0);
  const totalVideos = data.investigations.reduce((s, i) => s + i.files.videos, 0);
  const withDoi = data.investigations.filter((i) => i.doi).length;
  const loc = lang === "es" ? "es" : "en";

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <Image
          src="/brand/japax-logo.png"
          alt="JaPax — Space fire safety"
          width={1305}
          height={1334}
          priority
          className="mb-8 h-auto w-44 sm:w-56 lg:float-right lg:mb-0 lg:ml-8 lg:w-72"
        />
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {t.h1a} <span style={{ color: "var(--accent)" }}>{t.h1b}</span>?
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">{t.lead}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/simulator" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:brightness-110">
            {t.ctaSim}
          </Link>
          <Link href="/lab" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaLab}
          </Link>
          <Link href="/explorer" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaExp}
          </Link>
          <Link href="/ask" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaAsk}
          </Link>
          <Link href="/history" className="rounded-lg border border-line-2 px-5 py-2.5 text-ink hover:bg-surface-2">
            {t.ctaHist}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={String(data.investigations.length)} label={t.s1} note={t.s1n(withDoi)} />
          <Stat value={totalFiles.toLocaleString(loc)} label={t.s2} note={t.s2n} />
          <Stat value={String(totalVideos)} label={t.s3} note={t.s3n} />
          <Stat value="0" label={t.s4} note={t.s4n} />
        </div>
      </section>

      {/* FINDINGS */}
      <Section eyebrow={t.fEyebrow} title={t.fTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.f.map((f, i) => (
            <article key={FINDING_META[i].id} className="card flex flex-col p-5">
              <p className="eyebrow">{f.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm text-ink-2">{f.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <SourceTag src={FINDING_META[i].src} />
                <Link href={`/explorer/${FINDING_META[i].id}`} className="link text-sm">
                  {t.see} {FINDING_META[i].psi} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* MAP */}
      <Section eyebrow={t.mEyebrow} title={t.mTitle}>
        <p className="mt-3 max-w-3xl text-ink-2">{t.mText}</p>
        <div className="mt-6">
          <CoverageMap />
        </div>
      </Section>

      {/* AREAS */}
      <Section eyebrow={t.aEyebrow} title={t.aTitle}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((a) => {
            const n = data.investigations.filter((i) => i.areas.includes(a)).length;
            return (
              <Link key={a} href="/explorer" className="card p-4 transition-colors hover:bg-surface-2">
                <div className="h-1 w-10 rounded" style={{ background: AREA_COLOR[a] }} />
                <h3 className="mt-3 font-semibold">{areaLabel(a, lang)}</h3>
                <p className="mt-1 text-sm text-ink-2">{t.aText[a]}</p>
                <p className="mt-3 text-xs text-muted">
                  {n} {t.invs}
                </p>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* HISTORY */}
      <Section eyebrow={t.hEyebrow} title={t.hTitle}>
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
                <span className="text-muted">{t.lesson}: </span>
                {inc.lesson}
              </p>
              <a className="link mt-2 inline-block text-xs" href={inc.src} target="_blank" rel="noreferrer">
                {t.source} ↗
              </a>
            </li>
          ))}
        </ol>
      </Section>

      {/* EARTH */}
      <Section eyebrow={t.eEyebrow} title={t.eTitle}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.spinoffs.map((s) => (
            <article key={s.src} className="card p-5">
              <p className="eyebrow">{s.year}</p>
              <h3 className="mt-1 font-semibold">{s.name}</h3>
              <p className="mt-2 text-sm text-ink-2">{s.text}</p>
              <a className="link mt-3 inline-block text-xs" href={s.src} target="_blank" rel="noreferrer">
                {t.source} ↗
              </a>
            </article>
          ))}
        </div>
      </Section>

      {/* FUTURE */}
      <Section eyebrow={t.nEyebrow} title={t.nTitle}>
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
          <AreaBadge area="fundamental" /> {t.nNote}
        </p>
      </Section>
    </>
  );
}
