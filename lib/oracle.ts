import lab from '@/data/lab.json'
import { type Lang } from './data'
import { gapNote, mentionsPartialGravity, retrieve, type Chunk } from './retrieval'
import { VIZ_IDS, type VizId } from './oracleGuard'

export type { VizId } from './oracleGuard'
export { VIZ_IDS }

export interface KeyFact { label: string; value: string; note?: string }
export interface Evidence { title: string; text: string; cite: string; url: string | null; kind: 'measured' | 'reported' | 'context' }
export interface Cta { href: string; label: string }
export interface OracleAnswer {
  mode: 'ai' | 'evidence'
  topic: Topic
  headline: string
  body: string
  keyFacts: KeyFact[]
  evidence: Evidence[]
  gap: string | null
  confidence: 'high' | 'medium' | 'low'
  confidenceWhy: string
  followUps: string[]
  viz: VizId
  ctas: Cta[]
}

export type Topic = 'gap' | 'incidents' | 'smoke' | 'flex' | 'materials' | 'lunar' | 'earth' | 'general'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const RULES: [Topic, RegExp][] = [
  ['gap', /\b(mars|marte|marciana|martian|partial|parcial|luci|fm2|gravity data|datos de gravedad)\b/],
  ['incidents', /\b(apollo|mir|artemis|history|historia|incident\w*|accident\w*|tragedia|tragedy)\b/],
  ['smoke', /\b(smoke|humo|detector\w*|deteccion|detect\w*|aerosol\w*|dust|polvo|alarm\w*)\b/],
  ['flex', /\b(flex|suppress\w*|supresor\w*|extinguish\w*|extingu\w*|droplet\w*|gota\w*|co2|helium|helio|heptane|heptano|methanol|metanol)\b/],
  ['materials', /\b(material\w*|solid\w*|solido\w*|flammab\w*|inflamab\w*|conservat\w*|test 1|std-6001|bass|sibal|pmma)\b/],
  ['lunar', /\b(moon|lunar|luna|habitat\w*|ventilat\w*|ventilacion|oxygen|oxigeno|base)\b/],
  ['earth', /\b(earth|tierra|spinoff\w*|derivad\w*|firefighter\w*|bombero\w*)\b/],
]

export function detectTopic(q: string): Topic {
  const n = norm(q)
  for (const [t, re] of RULES) if (re.test(n)) return t
  return 'general'
}

/* ---------- facts computed from the recorded rows (never typed by hand) ---------- */
function computed() {
  const rows = lab.flex.rows.filter((r) => r.o2 != null && r.pAtm)
  const all = lab.flex.rows
  const count = (k: string) => all.filter((r) => r.end === k).length
  const lunar = rows.filter((r) => r.pAtm! >= 0.6 && r.pAtm! <= 0.8 && r.o2! >= 0.265)
  const bass = lab.bass2.rows
  const maxCo2 = Math.max(...all.map((r) => r.co2 ?? 0))
  const maxHe = Math.max(...all.map((r) => r.he ?? 0))
  return {
    flexN: all.length,
    ext: count('Extinction'),
    comp: count('Completion'),
    disr: count('Disruption'),
    lunarN: lunar.length,
    lunarExt: lunar.filter((r) => r.end === 'Extinction').length,
    bassN: bass.length,
    bassHigh: bass.filter((r) => r.o2Initial != null && r.o2Initial >= 26.5).length,
    bassMax: Math.max(...bass.map((r) => r.o2Initial ?? 0)),
    maxCo2: Math.round(maxCo2 * 100),
    maxHe: Math.round(maxHe * 100),
  }
}

const L = (lang: Lang, en: string, es: string) => (lang === 'es' ? es : en)

function facts(topic: Topic, lang: Lang): KeyFact[] {
  const c = computed()
  switch (topic) {
    case 'lunar':
      return [
        { label: L(lang, 'Oxygen vs. Earth', 'Oxígeno frente a la Tierra'), value: '+43%', note: L(lang, '30% vs. 21% O₂ in a lunar habitat', '30% frente a 21% de O₂ en un hábitat lunar') },
        { label: L(lang, 'FLEX tests at lunar-like conditions', 'Ensayos de FLEX en condiciones lunares'), value: String(c.lunarN), note: L(lang, `${c.lunarExt} ended in extinction`, `${c.lunarExt} terminaron en extinción`) },
        { label: L(lang, 'BASS-II tests at ≥26.5% O₂', 'Ensayos de BASS-II con ≥26.5% de O₂'), value: `${c.bassHigh} / ${c.bassN}`, note: L(lang, 'solid materials, microgravity', 'materiales sólidos, microgravedad') },
      ]
    case 'flex':
      return [
        { label: L(lang, 'Droplet tests recorded', 'Ensayos con gotas registrados'), value: String(c.flexN), note: 'FLEX, PSI-69' },
        { label: L(lang, 'Ended in extinction', 'Terminaron en extinción'), value: `${c.ext} (${Math.round((c.ext / c.flexN) * 100)}%)`, note: L(lang, `${c.disr} disruption, ${c.comp} completion`, `${c.disr} disrupción, ${c.comp} combustión completa`) },
        { label: L(lang, 'Suppressant tested, up to', 'Supresor probado, hasta'), value: `${c.maxCo2}% CO₂ · ${c.maxHe}% He`, note: L(lang, 'mole fraction', 'fracción molar') },
      ]
    case 'materials':
      return [
        { label: L(lang, 'NASA-STD-6001 Test 1', 'NASA-STD-6001 Test 1'), value: L(lang, 'Not conservative', 'No conservador'), note: L(lang, 'materials can burn at lower O₂ in microgravity', 'los materiales pueden arder con menos O₂ en microgravedad') },
        { label: L(lang, 'Flammability minimum near', 'Mínimo de inflamabilidad cerca de'), value: '10 cm/s', note: L(lang, 'typical spacecraft ventilation', 'ventilación típica de nave') },
        { label: L(lang, 'BASS-II tests recorded', 'Ensayos de BASS-II registrados'), value: String(c.bassN), note: L(lang, `initial O₂ up to ${c.bassMax}%`, `O₂ inicial hasta ${c.bassMax}%`) },
      ]
    case 'smoke':
      return [
        { label: L(lang, 'Mean particle diameter', 'Diámetro medio de partícula'), value: '100–200 nm', note: L(lang, 'smoke in microgravity (SAME)', 'humo en microgravedad (SAME)') },
        { label: L(lang, 'Silicone smoke', 'Humo de silicona'), value: '227 nm', note: L(lang, 'almost half its mass is >1000 nm', 'casi la mitad de su masa es >1000 nm') },
        { label: L(lang, 'Samples burned in SAME', 'Muestras quemadas en SAME'), value: '30', note: L(lang, '5 materials × 6 samples', '5 materiales × 6 muestras') },
      ]
    case 'gap':
      return [
        { label: L(lang, 'Partial-gravity data sets', 'Conjuntos de datos de gravedad parcial'), value: '0', note: L(lang, 'in PSI today', 'hoy en PSI') },
        { label: L(lang, 'Lunar gravity', 'Gravedad lunar'), value: '1/6 g', note: L(lang, 'LUCI: first results 2025 (NTRS); FM2 on the Moon', 'LUCI: primeros resultados 2025 (NTRS); FM2 en la Luna') },
        { label: L(lang, 'Experiments on the way', 'Experimentos en camino'), value: '4', note: 'FM2 · LUCI · SoFIE · FLARE' },
      ]
    case 'incidents':
      return [
        { label: 'Apollo 1', value: '1967', note: L(lang, 'fire in a 100% oxygen cabin', 'incendio en una cabina con 100% de oxígeno') },
        { label: 'Apollo 13', value: '1970', note: L(lang, 'oxygen tank explosion', 'explosión de un tanque de oxígeno') },
        { label: 'Mir', value: '1997', note: L(lang, 'oxygen generator fire', 'incendio de un generador de oxígeno') },
      ]
    case 'earth':
      return [
        { label: L(lang, 'Firefighter air tank', 'Depósito de aire para bomberos'), value: '−13 lb', note: L(lang, '20 lb, 30 min of air', '20 lb, 30 min de aire') },
        { label: L(lang, 'Project FIRES field test', 'Prueba de campo de FIRES'), value: L(lang, '14 departments', '14 cuerpos'), note: L(lang, 'protective clothing', 'ropa de protección') },
        { label: L(lang, 'Shuttle smoke detector', 'Detector de humo del transbordador'), value: '1978', note: L(lang, 'tells smoke from dust', 'distingue humo de polvo') },
      ]
    default:
      return []
  }
}

/* ---------- narratives written by hand around computed numbers ---------- */
function narrative(topic: Topic, lang: Lang): { headline: string; body: string } | null {
  const c = computed()
  switch (topic) {
    case 'lunar':
      return {
        headline: L(lang, 'A lunar habitat is more flammable, and turning off the fans may not be enough', 'Un hábitat lunar es más inflamable, y apagar los ventiladores podría no bastar'),
        body: L(
          lang,
          `A lunar habitat is expected to run at about 30% oxygen and 10.2 psi, which is 43% more oxygen than Earth air. In NASA's BRE tests, flames in oxygen-enriched atmospheres kept burning in microgravity with no airflow at all, while at 21% they self-extinguished; cutting ventilation is today a standard step to put out a spacecraft fire. The gaps matter as much as the results: of the ${c.lunarN} FLEX tests at lunar-like conditions, ${c.lunarExt} ended in extinction; none of the ${c.bassN} BASS-II solid-material tests started at 26.5% oxygen or more; and nothing has been tested at lunar gravity.`,
          `Se espera que un hábitat lunar funcione con un 30% de oxígeno y 10.2 psi, es decir, 43% más oxígeno que el aire de la Tierra. En los ensayos BRE de NASA, las llamas en atmósferas enriquecidas en oxígeno siguieron ardiendo en microgravedad sin ningún flujo de aire, mientras que a 21% se autoextinguían; cortar la ventilación es hoy un paso estándar para apagar un incendio en una nave. Las lagunas importan tanto como los resultados: de los ${c.lunarN} ensayos de FLEX en condiciones lunares, ${c.lunarExt} terminaron en extinción; ninguno de los ${c.bassN} ensayos de materiales sólidos de BASS-II empezó con 26.5% de oxígeno o más; y nada se ha ensayado con gravedad lunar.`,
        ),
      }
    case 'flex':
      return {
        headline: L(lang, `${c.ext} of ${c.flexN} droplet tests ended with the flame going out`, `${c.ext} de ${c.flexN} ensayos con gotas terminaron con la llama apagada`),
        body: L(
          lang,
          `FLEX burned heptane and methanol droplets in oxygen–nitrogen mixtures, sometimes adding CO₂ (up to ${c.maxCo2}%) or helium (up to ${c.maxHe}%) as suppressant. ${c.ext} tests ended in extinction, ${c.disr} in disruption and ${c.comp} in completion. NASA's guide reports that the flammability limit is lower in reduced gravity, so terrestrial standards for inert-gas suppressants do not give the same margin of safety in space.`,
          `FLEX quemó gotas de heptano y metanol en mezclas de oxígeno y nitrógeno, a veces añadiendo CO₂ (hasta ${c.maxCo2}%) o helio (hasta ${c.maxHe}%) como supresor. ${c.ext} ensayos terminaron en extinción, ${c.disr} en disrupción y ${c.comp} en combustión completa. La guía de NASA indica que el límite de inflamabilidad es menor en gravedad reducida, así que los estándares terrestres de supresores de gas inerte no dan el mismo margen de seguridad en el espacio.`,
        ),
      }
    case 'materials':
      return {
        headline: L(lang, "NASA's standard material test is not conservative in microgravity", 'El test estándar de materiales de NASA no es conservador en microgravedad'),
        body: L(
          lang,
          `Recent BASS results indicate that NASA-STD-6001 Test 1, a 1-g test used to choose spacecraft materials, is not conservative: materials can burn at lower oxygen levels in microgravity than on Earth. The easiest conditions sit around 10 cm/s, the airflow of a typical spacecraft ventilation system. BASS-II then ran ${c.bassN} tests on thicker, more realistic fuels, but with initial oxygen only up to ${c.bassMax}%.`,
          `Los resultados recientes de BASS indican que NASA-STD-6001 Test 1, un ensayo de 1 g usado para elegir materiales de nave, no es conservador: los materiales pueden arder con menos oxígeno en microgravedad que en la Tierra. Las condiciones más fáciles están en torno a 10 cm/s, el flujo de aire de un sistema de ventilación típico de nave. BASS-II realizó después ${c.bassN} ensayos con combustibles más gruesos y realistas, pero con oxígeno inicial de solo hasta ${c.bassMax}%.`,
        ),
      }
    case 'smoke':
      return {
        headline: L(lang, 'Smoke in microgravity is made of tiny particles that detectors must learn to see', 'El humo en microgravedad son partículas diminutas que los detectores deben aprender a ver'),
        body: L(
          lang,
          'SAME burned 30 samples of five spacecraft materials and found mean particle diameters of 100 to 200 nm; for silicone, almost half the mass was in particles larger than 1000 nm. Ionization detectors see the sub-micron particles best, but a light-scattering detector would perform very well in most cases. The detection target is the early, pre-fire phase, and detectors that measure a wider range of sizes may be more reliable.',
          'SAME quemó 30 muestras de cinco materiales de nave y halló diámetros medios de partícula de 100 a 200 nm; en la silicona, casi la mitad de la masa estaba en partículas de más de 1000 nm. Los detectores de ionización ven mejor las partículas submicrónicas, pero un detector de dispersión de luz funcionaría muy bien en la mayoría de los casos. El objetivo de detección es la fase temprana, previa al incendio, y los detectores que miden un rango de tamaños más amplio pueden ser más fiables.',
        ),
      }
    case 'gap':
      return {
        headline: L(lang, 'PSI has no partial-gravity fire data', 'PSI no tiene datos de fuego en gravedad parcial'),
        body: L(
          lang,
          'NASA’s PSI archive holds combustion data from microgravity and from 1 g, but none from the Moon’s 1/6 g or Mars’s gravity. LUCI, a spinning New Shepard sounding rocket, reported the first extended (>25 s) burns in simulated lunar gravity in 2025 (NASA NTRS 20250010653); FM2 will burn materials on the Moon (planned late 2026), SoFIE will test whether the 1-g flame test is conservative, and FLARE will relate ground limits to microgravity. Until then, microgravity and 1-g results bound what can happen in between, and an electric field in the ACME E-FIELD experiment is used to mimic partial gravity.',
          'El archivo PSI de NASA contiene datos de combustión en microgravedad y a 1 g, pero ninguno con el 1/6 g de la Luna ni con la gravedad de Marte. LUCI, un cohete suborbital New Shepard giratorio, comunicó en 2025 las primeras combustiones prolongadas (>25 s) en gravedad lunar simulada (NASA NTRS 20250010653); FM2 quemará materiales en la Luna (previsto a finales de 2026), SoFIE comprobará si el test de llama de 1 g es conservador y FLARE relacionará los límites de tierra con la microgravedad. Hasta entonces, los resultados de microgravedad y de 1 g acotan lo que puede pasar entre medias, y en el experimento ACME E-FIELD se usa un campo eléctrico para imitar la gravedad parcial.',
        ),
      }
    case 'incidents':
      return {
        headline: L(lang, 'Three fires, three lessons that shaped spacecraft safety', 'Tres incendios, tres lecciones que moldearon la seguridad de las naves'),
        body: L(
          lang,
          'In 1967 a flash fire in a 100% oxygen cabin killed the Apollo 1 crew; the hatch took about 90 seconds to open. In 1970 an oxygen tank exploded on the way to the Moon after its heaters overheated and degraded the Teflon insulation. In 1997 a solid-fuel oxygen generator canister caught fire on Mir. Each one changed hardware, materials or procedures, and the Artemis II smoke alarm shows why it still matters.',
          'En 1967 un incendio relámpago en una cabina con 100% de oxígeno mató a la tripulación del Apollo 1; la escotilla tardaba unos 90 segundos en abrirse. En 1970 explotó un tanque de oxígeno camino de la Luna tras sobrecalentarse sus calentadores y degradar el aislante de teflón. En 1997 ardió un cartucho de generador de oxígeno de combustible sólido en Mir. Cada uno cambió equipos, materiales o procedimientos, y la alarma de humo de Artemis II muestra por qué sigue importando.',
        ),
      }
    case 'earth':
      return {
        headline: L(lang, 'Space fire research already protects firefighters on Earth', 'La investigación espacial sobre el fuego ya protege a los bomberos en la Tierra'),
        body: L(
          lang,
          'Spacesuit technology produced a firefighter air tank that is 13 lb lighter, protective clothing field-tested in 14 municipal fire departments, and a shuttle smoke detector that tells combustion particles from dust and is suited to mines. Water-mist extinguishers developed for the ISS are another example of the same path.',
          'La tecnología de los trajes espaciales dio un depósito de aire para bomberos 13 lb más ligero, ropa de protección probada en 14 cuerpos de bomberos municipales y un detector de humo del transbordador que distingue las partículas de combustión del polvo y está pensado para minas. Los extintores de agua nebulizada desarrollados para la ISS son otro ejemplo del mismo camino.',
        ),
      }
    default:
      return null
  }
}

const FOLLOW: Record<Topic, [string, string][]> = {
  lunar: [['Is NASA\'s standard material flammability test conservative?', '¿Es conservador el test estándar de inflamabilidad de materiales de NASA?'], ['What data exists for partial gravity?', '¿Qué datos hay sobre gravedad parcial?'], ['Which suppressants were tested?', '¿Qué supresores se ensayaron?']],
  flex: [['What happens to fire when ventilation is turned off in a lunar habitat?', '¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?'], ['How is smoke different in microgravity?', '¿Cómo es el humo en microgravedad?'], ['What data exists for partial gravity?', '¿Qué datos hay sobre gravedad parcial?']],
  materials: [['What happens to fire when ventilation is turned off in a lunar habitat?', '¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?'], ['Which suppressants were tested?', '¿Qué supresores se ensayaron?'], ['Tell me about Apollo 1, Apollo 13 and Mir', 'Cuéntame lo de Apollo 1, Apollo 13 y Mir']],
  smoke: [['What did firefighters gain from space research?', '¿Qué ganaron los bomberos con la investigación espacial?'], ['Is NASA\'s standard material flammability test conservative?', '¿Es conservador el test estándar de inflamabilidad de materiales de NASA?'], ['What data exists for partial gravity?', '¿Qué datos hay sobre gravedad parcial?']],
  gap: [['What happens to fire when ventilation is turned off in a lunar habitat?', '¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?'], ['Which suppressants were tested?', '¿Qué supresores se ensayaron?'], ['Tell me about Apollo 1, Apollo 13 and Mir', 'Cuéntame lo de Apollo 1, Apollo 13 y Mir']],
  incidents: [['What happens to fire when ventilation is turned off in a lunar habitat?', '¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?'], ['What did firefighters gain from space research?', '¿Qué ganaron los bomberos con la investigación espacial?'], ['How is smoke different in microgravity?', '¿Cómo es el humo en microgravedad?']],
  earth: [['How is smoke different in microgravity?', '¿Cómo es el humo en microgravedad?'], ['Tell me about Apollo 1, Apollo 13 and Mir', 'Cuéntame lo de Apollo 1, Apollo 13 y Mir'], ['Which suppressants were tested?', '¿Qué supresores se ensayaron?']],
  general: [['What happens to fire when ventilation is turned off in a lunar habitat?', '¿Qué le pasa al fuego cuando se apaga la ventilación en un hábitat lunar?'], ['Is NASA\'s standard material flammability test conservative?', '¿Es conservador el test estándar de inflamabilidad de materiales de NASA?'], ['What data exists for partial gravity?', '¿Qué datos hay sobre gravedad parcial?']],
}

const VIZ_FOR: Record<Topic, VizId> = { lunar: 'coverage', flex: 'flexOutcomes', materials: 'bassOxygen', gap: 'gravityGap', smoke: 'none', incidents: 'none', earth: 'none', general: 'none' }

function ctasFor(topic: Topic, lang: Lang): Cta[] {
  const m: Record<Topic, [string, string, string][]> = {
    lunar: [['/simulator', 'Watch it in the Simulator', 'Míralo en el Simulador'], ['/lab', 'Open the Data Lab', 'Abrir el Laboratorio']],
    flex: [['/lab', 'Explore the 274 tests', 'Explora los 274 ensayos'], ['/explorer/flex', 'Open FLEX', 'Abrir FLEX']],
    materials: [['/explorer/bass', 'Open BASS', 'Abrir BASS'], ['/simulator', 'See why airflow matters', 'Mira por qué importa el flujo de aire']],
    smoke: [['/explorer/same', 'Open SAME', 'Abrir SAME'], ['/explorer/daft-daft-2', 'Open DAFT', 'Abrir DAFT']],
    gap: [['/simulator', 'See the lunar environment', 'Mira el entorno lunar'], ['/history', 'See what comes next', 'Mira lo que viene']],
    incidents: [['/history', 'Open the timeline', 'Abrir la línea del tiempo']],
    earth: [['/history', 'Open the timeline', 'Abrir la línea del tiempo']],
    general: [['/explorer', 'Browse the investigations', 'Explorar las investigaciones']],
  }
  return m[topic].map(([href, en, es]) => ({ href, label: L(lang, en, es) }))
}

function toEvidence(chunks: Chunk[]): Evidence[] {
  return chunks.slice(0, 4).map((c) => ({
    title: c.title,
    text: c.text.replace(/^[^:]+:\s*/, '').slice(0, 320),
    cite: c.cite,
    url: c.url,
    kind: c.kind ?? 'context',
  }))
}

function confidence(topic: Topic, chunks: Chunk[], lang: Lang): { level: 'high' | 'medium' | 'low'; why: string } {
  const n = new Set(chunks.map((c) => c.title)).size
  const hasResult = chunks.some((c) => c.kind === 'measured' || c.kind === 'reported')
  if (topic !== 'general' && n >= 3 && hasResult) return { level: 'high', why: L(lang, `Backed by ${n} investigations with cited results.`, `Respaldado por ${n} investigaciones con resultados citados.`) }
  if (topic !== 'general' || n >= 2) return { level: 'medium', why: L(lang, 'Partly covered by the data; read the gaps below.', 'Cubierto en parte por los datos; lee las lagunas de abajo.') }
  return { level: 'low', why: L(lang, 'Few matching passages: treat this as a pointer, not an answer.', 'Pocos pasajes coinciden: tómalo como una pista, no como una respuesta.') }
}

/** Everything the page needs, built only from verified data. `narration` (AI) can replace headline/body/follow-ups/viz. */
export function buildAnswer(question: string, lang: Lang): { answer: OracleAnswer; context: Chunk[] } {
  const topic = detectTopic(question)
  const context = retrieve(question, 6, lang)
  const base = narrative(topic, lang)
  const conf = confidence(topic, context, lang)
  const top = context[0]
  const fallbackHeadline = top ? top.text.replace(/^[^:]+:\s*/, '').split(/(?<=[.!?])\s/)[0].slice(0, 150) : L(lang, 'No verified data for that question', 'No hay datos verificados para esa pregunta')
  const answer: OracleAnswer = {
    mode: 'evidence',
    topic,
    headline: base?.headline ?? fallbackHeadline,
    body:
      base?.body ??
      (context.length
        ? context.slice(0, 3).map((c) => c.text.replace(/^[^:]+:\s*/, '').split(/(?<=[.!?])\s/)[0]).join(' ')
        : L(lang, 'Try asking about an investigation (BASS, FLEX, SAME, BRE), an environment (Moon, ISS) or a topic (smoke detection, suppression, ventilation).', 'Prueba a preguntar por una investigación (BASS, FLEX, SAME, BRE), un entorno (Luna, ISS) o un tema (detección de humo, supresión, ventilación).')),
    keyFacts: facts(topic, lang),
    evidence: toEvidence(context),
    gap: mentionsPartialGravity(question) || topic === 'lunar' || topic === 'gap' ? gapNote(lang) : null,
    confidence: conf.level,
    confidenceWhy: conf.why,
    followUps: FOLLOW[topic].map(([en, es]) => L(lang, en, es)),
    viz: VIZ_FOR[topic],
    ctas: ctasFor(topic, lang),
  }
  return { answer, context }
}
