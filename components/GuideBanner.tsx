"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOUR, useGuide } from "@/lib/guide";
import { useT } from "@/lib/i18n";

type Stop = { name: string; what: string; tryIt: string };
const T = {
  en: {
    title: "Guide mode",
    step: (i: number, n: number) => `Stop ${i} of ${n}`,
    next: "Next stop",
    prev: "Back",
    off: "Turn guide off",
    stops: {
      "/": { name: "Ignition", what: "The big picture: why fire is one of the deadliest risks on a Moon or Mars mission, and what JaPax does about it.", tryIt: "Read the headline numbers, then press Next." },
      "/learn": { name: "First Spark", what: "Never heard of microgravity combustion? Start here: five minutes of plain-language basics and a glossary.", tryIt: "Open each card; every term used later is explained here." },
      "/history": { name: "Chronicles", what: "A timeline of real fires and experiments, from Apollo 1 to today, showing why this research exists.", tryIt: "Scroll the timeline and click any event for its source." },
      "/simulator": { name: "Fire Worlds", what: "The same burning droplet on Earth, the ISS, the Moon and in a spacesuit. Watch how gravity and air change the flame.", tryIt: "Switch environment, tick Compare with Earth, then press Molecules to zoom in." },
      "/lab": { name: "Flame Lab", what: "Set oxygen, pressure, gravity and airflow yourself and see what the real NASA tests say about those conditions.", tryIt: "Drag the oxygen slider up and read the verdict box." },
      "/explorer": { name: "Vault", what: "Every NASA investigation we use, with its objectives, fuels, conditions and DOI.", tryIt: "Filter by domain: prevention, detection or suppression." },
      "/dashboard": { name: "Radar", what: "Which experiments matter most for your own priorities? Move the sliders and the ranking explains itself.", tryIt: "Push one slider to Essential and watch the order change." },
      "/ask": { name: "Oracle", what: "Ask a question in plain words. Numbers always come from the data; the AI only explains them.", tryIt: "Try: Which experiments tested high oxygen?" },
      "/references": { name: "Proof", what: "Every source, dataset, library and licence behind JaPax.", tryIt: "You have finished the tour. Switch the guide off any time." },
    } as Record<string, Stop>,
  },
  es: {
    title: "Modo guía",
    step: (i: number, n: number) => `Parada ${i} de ${n}`,
    next: "Siguiente parada",
    prev: "Atrás",
    off: "Desactivar guía",
    stops: {
      "/": { name: "Ignición", what: "La visión general: por qué el fuego es uno de los mayores riesgos en una misión a la Luna o Marte y qué hace JaPax.", tryIt: "Lee las cifras principales y pulsa Siguiente." },
      "/learn": { name: "Primera Chispa", what: "¿Nunca has oído hablar de combustión en microgravedad? Empieza aquí: lo básico en lenguaje llano y un glosario.", tryIt: "Abre cada tarjeta; todos los términos posteriores se explican aquí." },
      "/history": { name: "Crónicas", what: "Una línea del tiempo de incendios y experimentos reales, del Apolo 1 a hoy, que muestra por qué existe esta investigación.", tryIt: "Recorre la línea y pulsa un evento para ver su fuente." },
      "/simulator": { name: "Mundos de Fuego", what: "La misma gota ardiendo en la Tierra, la ISS, la Luna y dentro de un traje. Mira cómo cambian la gravedad y el aire.", tryIt: "Cambia de entorno, marca Comparar con la Tierra y pulsa Moléculas para acercarte." },
      "/lab": { name: "Lab de Llama", what: "Ajusta tú mismo oxígeno, presión, gravedad y flujo de aire y mira qué dicen los ensayos reales de la NASA.", tryIt: "Sube el oxígeno y lee el cuadro de veredicto." },
      "/explorer": { name: "Bóveda", what: "Todas las investigaciones NASA que usamos, con objetivos, combustibles, condiciones y DOI.", tryIt: "Filtra por dominio: prevención, detección o supresión." },
      "/dashboard": { name: "Radar", what: "¿Qué experimentos importan más según tus prioridades? Mueve los controles y el ranking se explica solo.", tryIt: "Lleva un control a Esencial y observa cómo cambia el orden." },
      "/ask": { name: "Oráculo", what: "Pregunta con tus palabras. Las cifras salen siempre de los datos; la IA solo las explica.", tryIt: "Prueba: ¿Qué experimentos probaron oxígeno alto?" },
      "/references": { name: "Pruebas", what: "Todas las fuentes, datos, librerías y licencias detrás de JaPax.", tryIt: "Has terminado el recorrido. Puedes desactivar la guía cuando quieras." },
    } as Record<string, Stop>,
  },
};

export default function GuideBanner() {
  const { on, setOn } = useGuide();
  const path = usePathname();
  const t = useT(T);
  if (!on) return null;
  const key = TOUR.find((p) => (p === "/" ? path === "/" : path.startsWith(p)));
  if (!key) return null;
  const i = TOUR.indexOf(key);
  const stop = t.stops[key];
  const prev = i > 0 ? TOUR[i - 1] : null;
  const next = i < TOUR.length - 1 ? TOUR[i + 1] : null;
  return (
    <aside aria-label={t.title} className="border-b border-accent/30 bg-accent/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
        <span className="shrink-0 rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-semibold">{t.step(i + 1, TOUR.length)}</span>
        <p className="min-w-0 flex-1 basis-80">
          <strong>{stop.name}.</strong> {stop.what} <span className="text-ink-2">{stop.tryIt}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {prev && <Link href={prev} className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:text-ink">← {t.prev}</Link>}
          {next && <Link href={next} className="rounded-md bg-accent/30 px-2.5 py-1 text-xs font-semibold hover:bg-accent/45">{t.next} →</Link>}
          <button onClick={() => setOn(false)} className="rounded-md border border-line-2 px-2.5 py-1 text-xs text-ink-2 hover:text-ink">{t.off}</button>
        </div>
      </div>
    </aside>
  );
}
