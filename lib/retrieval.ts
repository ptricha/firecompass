import { getData, fmtRange, type Lang } from './data'

/**
 * Tiny dependency-free retrieval over the verified FireCompass data set, per language.
 * It powers (a) the offline "Ask" mode and (b) the grounding context sent to Claude.
 */
export interface Chunk {
  id: string
  title: string
  text: string
  cite: string
  url: string | null
}

const STOP_EN =
  'a an the of in on at to for from and or is are was were be been it its this that these those with without as by how what which why when where who whom do does did can could should would will about into than then there their them they you your we our i me my'
const STOP_ES =
  'el la los las un una unos unas de del al y o u en con sin por para como que cual cuales cuando donde quien es son fue fueron ser esta este estos estas eso esa ese se su sus lo le les mas muy ya hay sobre entre'
const STOP = new Set([...STOP_EN.split(' '), ...STOP_ES.split(' ')])

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const tokenize = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))

// domain synonyms so everyday wording (English or Spanish) reaches the technical passages
const SYN: Record<string, string[]> = {
  ventilation: ['airflow', 'flow', 'air'],
  ventilate: ['airflow', 'flow', 'air'],
  ventilacion: ['flujo', 'aire', 'airflow'],
  turned: ['cutting', 'cessation'],
  off: ['cutting', 'cessation'],
  apagar: ['cortar', 'cutting'],
  apaga: ['cortar', 'cutting'],
  moon: ['lunar', 'luna'],
  lunar: ['moon', 'habitat', 'luna'],
  luna: ['lunar', 'moon', 'habitat'],
  base: ['habitat', 'lunar'],
  marte: ['mars', 'parcial', 'partial'],
  mars: ['marte', 'partial', 'parcial'],
  detector: ['detection', 'smoke', 'deteccion', 'humo'],
  detectors: ['detection', 'smoke', 'detector'],
  detectores: ['deteccion', 'humo', 'detector', 'detection', 'smoke'],
  detect: ['detection', 'smoke'],
  smoke: ['aerosol', 'particles', 'detection', 'humo'],
  humo: ['smoke', 'aerosol', 'particulas', 'deteccion'],
  extinguish: ['suppressant', 'extinction'],
  extinguisher: ['suppressant'],
  suppressants: ['suppressant', 'co2', 'helium', 'supresores'],
  supresores: ['supresor', 'suppressant', 'co2', 'helio'],
  supresor: ['suppressant', 'supresores'],
  material: ['materials', 'solid', 'flammability', 'materiales', 'solido', 'inflamabilidad'],
  materials: ['material', 'solid', 'flammability'],
  materiales: ['material', 'solido', 'inflamabilidad', 'solid', 'flammability'],
  conservative: ['conservative', 'test', 'margin'],
  conservador: ['conservadora', 'conservative', 'test', 'margen'],
  oxygen: ['o2', 'oxigeno'],
  oxigeno: ['o2', 'oxygen'],
  dust: ['dust', 'false', 'alarms', 'polvo'],
  polvo: ['dust', 'falsas', 'alarmas'],
}

// light stemmer shared by queries and documents (English suffixes + Spanish verb/noun endings)
const stem = (t: string) => {
  let s = t.replace(/(ing|ed|es|s|ion|ions|ciones|cion)$/, '')
  if (s.length > 4) s = s.replace(/(ando|ar|an|a|o|e)$/, '')
  return s
}

const L = {
  en: { fuels: 'Fuels', o2: 'O2', pressure: 'Pressure', airflow: 'Airflow', sensors: 'Sensors', areas: 'Areas', nv: 'not verified', space: 'space application', earth: 'Earth application', upcoming: 'upcoming', noData: 'no data yet', lesson: 'Lesson', incident: 'incident', spinoff: 'NASA spinoff', env: 'environment' },
  es: { fuels: 'Combustibles', o2: 'O2', pressure: 'Presión', airflow: 'Flujo de aire', sensors: 'Sensores', areas: 'Áreas', nv: 'no verificado', space: 'aplicación espacial', earth: 'aplicación en la Tierra', upcoming: 'próximo', noData: 'aún sin datos', lesson: 'Lección', incident: 'incidente', spinoff: 'derivado tecnológico de NASA', env: 'entorno' },
}

function buildChunks(lang: Lang): Chunk[] {
  const data = getData(lang)
  const l = L[lang]
  const out: Chunk[] = []
  for (const inv of data.investigations) {
    const cite = `${inv.acronym} (${inv.psiId}${inv.doi ? `, DOI: ${inv.doi}` : ''})`
    const o2 = fmtRange(inv.conditions.o2, '', 100, lang)
    const p = fmtRange(inv.conditions.pressureAtm, 'atm', 1, lang)
    const fl = fmtRange(inv.conditions.flowCmS, 'cm/s', 1, lang)
    out.push({
      id: `${inv.id}:summary`,
      title: inv.acronym,
      text: `${inv.acronym} — ${inv.title}. ${inv.summary} ${l.fuels}: ${inv.fuels.join(', ') || l.nv}. ${l.o2}: ${o2 ? o2.trim() + '%' : l.nv}. ${l.pressure}: ${p ?? l.nv}. ${l.airflow}: ${fl ?? l.nv}. ${l.sensors}: ${inv.sensors.join(', ') || l.nv}. ${l.areas}: ${inv.areas.join(', ')}.`,
      cite,
      url: inv.doiUrl,
    })
    inv.findings.forEach((f, i) =>
      out.push({ id: `${inv.id}:f${i}`, title: inv.acronym, text: `${inv.acronym}: ${f.text}`, cite, url: inv.doiUrl }),
    )
    if (inv.spaceApplication) out.push({ id: `${inv.id}:space`, title: inv.acronym, text: `${inv.acronym} ${l.space}: ${inv.spaceApplication}`, cite, url: inv.doiUrl })
    if (inv.earthApplication) out.push({ id: `${inv.id}:earth`, title: inv.acronym, text: `${inv.acronym} ${l.earth}: ${inv.earthApplication}`, cite, url: inv.doiUrl })
  }
  for (const u of data.upcoming)
    out.push({ id: `up:${u.acronym}`, title: u.acronym, text: `${u.acronym} (${u.name}), ${l.upcoming}, ${u.gravity}: ${u.note}`, cite: `${u.acronym} (${l.noData})`, url: data.sources[u.src.split(' ')[0]]?.url ?? null })
  for (const i of data.incidents)
    out.push({ id: `inc:${i.name}`, title: i.name, text: `${i.name} (${i.year}): ${i.text} ${l.lesson}: ${i.lesson}`, cite: `${i.name} ${l.incident}`, url: i.src })
  for (const s of data.spinoffs)
    out.push({ id: `sp:${s.src}`, title: s.name, text: `${s.name} (${s.year}): ${s.text}`, cite: `${s.name} (${l.spinoff})`, url: s.src })
  for (const e of data.environments)
    out.push({ id: `env:${e.id}`, title: e.name, text: `${e.name}: ${Math.round(e.o2 * 100)}% O2, ${e.pressurePsi} psi, ${lang === 'es' ? 'gravedad' : 'gravity'} ${e.gravityG ?? 'n/a'} g. ${e.note ?? ''}`, cite: `${e.name} (${l.env})`, url: null })
  return out
}

interface Index {
  chunks: Chunk[]
  docs: { doc: Set<string>; len: number }[]
  idf: Map<string, number>
}
const _idx: Partial<Record<Lang, Index>> = {}
function index(lang: Lang): Index {
  if (!_idx[lang]) {
    const chunks = buildChunks(lang)
    const docs = chunks.map((c) => {
      const tt = tokenize(c.text).map(stem)
      return { doc: new Set(tt), len: tt.length }
    })
    const df = new Map<string, number>()
    for (const d of docs) for (const t of d.doc) df.set(t, (df.get(t) ?? 0) + 1)
    const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + docs.length / n)] as [string, number]))
    _idx[lang] = { chunks, docs, idf }
  }
  return _idx[lang]!
}

// findings carry the real results; environment cards are only context
const TYPE_WEIGHT = (id: string) =>
  /:f\d+$/.test(id) ? 1.35 : id.startsWith('env:') ? 0.55 : id.startsWith('up:') ? 0.75 : id.startsWith('inc:') || id.startsWith('sp:') ? 0.9 : 1

export function retrieve(question: string, k = 5, lang: Lang = 'en'): Chunk[] {
  const base = tokenize(question)
  const q = [...new Set([...base, ...base.flatMap((t) => SYN[t] ?? [])])].map(stem)
  if (!q.length) return []
  const { chunks, docs, idf } = index(lang)
  // strong gap intent (Mars / partial gravity) boosts the upcoming-mission cards; a plain "lunar" only nudges them
  const strong = /\b(mars|marte|marciana|martian|partial|parcial)\b/.test(norm(question))
  const partial = strong ? 4 : mentionsPartialGravity(question) ? 1.15 : 1
  const scored = chunks.map((c, i) => {
    let s = 0
    for (const t of q) {
      const w = idf.get(t) ?? 0.5
      if (docs[i].doc.has(t)) s += w
      if (norm(c.title).includes(t)) s += 0.5 * w
    }
    const gapBoost = c.id.startsWith('up:') ? partial : 1
    return { c, s: (s / Math.sqrt(docs[i].len + 30)) * TYPE_WEIGHT(c.id) * gapBoost }
  })
  return scored
    .filter((r) => r.s > 0.15)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((r) => r.c)
}

export const GAP_NOTE =
  'Important: PSI currently contains no partial-gravity (Moon or Mars) combustion data. LUCI and FM2 are expected to provide it; microgravity and 1 g results bound the answer.'

export const GAP_NOTE_ES =
  'Importante: PSI no contiene actualmente datos de combustión en gravedad parcial (Luna o Marte). Se espera que LUCI y FM2 los aporten; los resultados de microgravedad y de 1 g acotan la respuesta.'

export const gapNote = (lang: Lang) => (lang === 'es' ? GAP_NOTE_ES : GAP_NOTE)

export function mentionsPartialGravity(q: string) {
  return /\b(moon|lunar|luna|mars|martian|marte|marciana|partial|parcial|0\.16|0\.38)\b/i.test(norm(q))
}
