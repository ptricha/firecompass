"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    eyebrow: "First Spark",
    h1: "Fire in space, in five minutes",
    lead: "No background needed. Four ideas explain why a flame behaves so differently away from Earth, and why that matters for the Moon and Mars.",
    steps: [
      { h: "1. On Earth, hot air rises", p: "Gravity makes hot gas lighter than cold gas, so it floats up and pulls fresh air in underneath. That stream shapes a flame into the familiar yellow teardrop." },
      { h: "2. In microgravity, nothing rises", p: "On the ISS there is no up. Without that flow, oxygen reaches the flame only by slowly drifting in (diffusion), so a flame tends to become a small, dim, blue sphere." },
      { h: "3. Weak flames can still be dangerous", p: "A flame that burns slowly and quietly can be hard to see and may behave differently when oxygen or pressure change. This is why spacecraft fire detection and suppression need their own research." },
      { h: "4. The Moon is a gap in the data", p: "Lunar gravity is about one sixth of Earth's. NASA has no experimental flame data at partial gravity yet; missions such as LUCI and FM2 are planned to measure it. JaPax shows what exists and marks what is missing." },
    ],
    pathH: "Where to go next",
    path: [
      { href: "/history", t: "Chronicles", d: "Real fires that shaped the research." },
      { href: "/simulator", t: "Fire Worlds", d: "Watch the same flame in four environments." },
      { href: "/lab", t: "Flame Lab", d: "Change the conditions and compare with real tests." },
    ],
    glossH: "Glossary",
    gloss: [
      ["Microgravity", "The feeling of weightlessness in orbit: objects fall around the Earth together, so nothing presses on anything else."],
      ["Combustion", "Fast burning: a fuel reacts with oxygen and releases heat and light."],
      ["Diffusion flame", "A flame where fuel and oxygen meet by slowly spreading into each other instead of being stirred together."],
      ["Convection", "Movement of gas caused by temperature differences under gravity, e.g. hot air rising."],
      ["Soot", "Tiny carbon particles from incomplete burning. They glow yellow and make smoke."],
      ["Extinction", "When a flame goes out. Experiments record at which conditions that happens."],
      ["Oxygen concentration", "The share of the air that is oxygen. Normal air is about 21%."],
      ["Pressure (atm, psi)", "How densely the gas is packed. 1 atm is sea-level pressure on Earth, about 14.7 psi."],
      ["Suppression", "Putting a fire out or preventing it, for example by diluting oxygen with CO₂ or helium."],
      ["PSI", "NASA's Physical Sciences Informatics repository, where the experiment data come from."],
      ["DOI", "A permanent identifier that points to the published record of a dataset or paper."],
    ],
  },
  es: {
    eyebrow: "Primera Chispa",
    h1: "El fuego en el espacio, en cinco minutos",
    lead: "No hace falta saber nada previo. Cuatro ideas explican por qué una llama se comporta tan distinto lejos de la Tierra y por qué importa para la Luna y Marte.",
    steps: [
      { h: "1. En la Tierra, el aire caliente sube", p: "La gravedad hace que el gas caliente pese menos que el frío, así que flota hacia arriba y atrae aire fresco por debajo. Ese flujo da a la llama su típica forma de gota amarilla." },
      { h: "2. En microgravedad, nada sube", p: "En la ISS no existe el arriba. Sin ese flujo, el oxígeno llega a la llama solo por difusión lenta, y la llama tiende a ser una esfera pequeña, tenue y azul." },
      { h: "3. Una llama débil también es peligrosa", p: "Una llama lenta y silenciosa es difícil de ver y puede comportarse distinto al cambiar el oxígeno o la presión. Por eso detectar y apagar fuegos en una nave requiere investigación propia." },
      { h: "4. La Luna es un hueco en los datos", p: "La gravedad lunar es aproximadamente un sexto de la terrestre. La NASA aún no tiene datos experimentales de llamas en gravedad parcial; misiones como LUCI y FM2 están planeadas para medirlo. JaPax muestra lo que existe y marca lo que falta." },
    ],
    pathH: "Siguiente paso",
    path: [
      { href: "/history", t: "Crónicas", d: "Incendios reales que dieron forma a la investigación." },
      { href: "/simulator", t: "Mundos de Fuego", d: "Mira la misma llama en cuatro entornos." },
      { href: "/lab", t: "Lab de Llama", d: "Cambia las condiciones y compara con ensayos reales." },
    ],
    glossH: "Glosario",
    gloss: [
      ["Microgravedad", "La sensación de ingravidez en órbita: los objetos caen alrededor de la Tierra juntos, así que nada presiona a nada."],
      ["Combustión", "Quema rápida: un combustible reacciona con oxígeno y libera calor y luz."],
      ["Llama de difusión", "Llama en la que combustible y oxígeno se encuentran extendiéndose lentamente, sin que nada los mezcle."],
      ["Convección", "Movimiento del gas causado por diferencias de temperatura bajo gravedad, p. ej. el aire caliente que sube."],
      ["Hollín", "Partículas diminutas de carbono por combustión incompleta. Brillan en amarillo y forman humo."],
      ["Extinción", "Cuando la llama se apaga. Los experimentos registran con qué condiciones ocurre."],
      ["Concentración de oxígeno", "La parte del aire que es oxígeno. El aire normal tiene alrededor del 21 %."],
      ["Presión (atm, psi)", "Cuán compacto está el gas. 1 atm es la presión a nivel del mar, unos 14,7 psi."],
      ["Supresión", "Apagar o prevenir un fuego, por ejemplo diluyendo el oxígeno con CO₂ o helio."],
      ["PSI", "El repositorio Physical Sciences Informatics de la NASA, de donde salen los datos de los experimentos."],
      ["DOI", "Identificador permanente que apunta al registro publicado de un conjunto de datos o artículo."],
    ],
  },
};

export default function LearnPage() {
  const t = useT(T);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.h1}</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{t.lead}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {t.steps.map((s) => (
          <div key={s.h} className="card p-4">
            <h2 className="font-semibold">{s.h}</h2>
            <p className="mt-1.5 text-sm text-ink-2">{s.p}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">{t.pathH}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {t.path.map((p) => (
          <Link key={p.href} href={p.href} className="card block p-4 transition-colors hover:border-accent">
            <p className="font-semibold">{p.t} →</p>
            <p className="mt-1 text-sm text-ink-2">{p.d}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">{t.glossH}</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {t.gloss.map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold">{k}</dt>
            <dd className="text-sm text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
