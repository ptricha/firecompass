import { data, fmtRange } from './data'

/**
 * Tiny dependency-free retrieval over the verified FireCompass data set.
 * It powers (a) the offline "Ask" mode and (b) the grounding context sent to Claude.
 */
export interface Chunk {
  id: string
  title: string
  text: string
  cite: string
  url: string | null
}

const STOP = new Set(
  'a an the of in on at to for from and or is are was were be been it its this that these those with without as by how what which why when where who whom do does did can could should would will about into than then there their them they you your we our i me my'.split(
    ' ',
  ),
)

export const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))

// domain synonyms so everyday wording reaches the technical passages
const SYN: Record<string, string[]> = {
  ventilation: ['airflow', 'flow', 'air'],
  ventilate: ['airflow', 'flow', 'air'],
  turned: ['cutting', 'cessation'],
  off: ['cutting', 'cessation'],
  moon: ['lunar'],
  lunar: ['moon', 'habitat'],
  base: ['habitat', 'lunar'],
  detector: ['detection', 'smoke'],
  detectors: ['detection', 'smoke', 'detector'],
  detect: ['detection', 'smoke'],
  smoke: ['aerosol', 'particles', 'detection'],
  extinguish: ['suppressant', 'extinction'],
  extinguisher: ['suppressant'],
  suppressants: ['suppressant', 'co2', 'helium'],
  material: ['materials', 'solid', 'flammability'],
  materials: ['material', 'solid', 'flammability'],
  conservative: ['conservative', 'test', 'margin'],
  oxygen: ['o2'],
  dust: ['dust', 'false', 'alarms'],
}

function buildChunks(): Chunk[] {
  const out: Chunk[] = []
  for (const inv of data.investigations) {
    const cite = `${inv.acronym} (${inv.psiId}${inv.doi ? `, DOI: ${inv.doi}` : ''})`
    const o2 = fmtRange(inv.conditions.o2, '', 100)
    const p = fmtRange(inv.conditions.pressureAtm, 'atm')
    const fl = fmtRange(inv.conditions.flowCmS, 'cm/s')
    out.push({
      id: `${inv.id}:summary`,
      title: inv.acronym,
      text: `${inv.acronym} — ${inv.title}. ${inv.summary} Fuels: ${inv.fuels.join(', ') || 'not verified'}. O2: ${o2 ? o2 + '%' : 'not verified'}. Pressure: ${p ?? 'not verified'}. Airflow: ${fl ?? 'not verified'}. Sensors: ${inv.sensors.join(', ') || 'not verified'}. Areas: ${inv.areas.join(', ')}.`,
      cite,
      url: inv.doiUrl,
    })
    inv.findings.forEach((f, i) =>
      out.push({ id: `${inv.id}:f${i}`, title: inv.acronym, text: `${inv.acronym}: ${f.text}`, cite, url: inv.doiUrl }),
    )
    if (inv.spaceApplication) out.push({ id: `${inv.id}:space`, title: inv.acronym, text: `${inv.acronym} space application: ${inv.spaceApplication}`, cite, url: inv.doiUrl })
    if (inv.earthApplication) out.push({ id: `${inv.id}:earth`, title: inv.acronym, text: `${inv.acronym} Earth application: ${inv.earthApplication}`, cite, url: inv.doiUrl })
  }
  for (const u of data.upcoming)
    out.push({ id: `up:${u.acronym}`, title: u.acronym, text: `${u.acronym} (${u.name}), upcoming, ${u.gravity}: ${u.note}`, cite: `${u.acronym} (no data yet)`, url: data.sources[u.src.split(' ')[0]]?.url ?? null })
  for (const i of data.incidents)
    out.push({ id: `inc:${i.name}`, title: i.name, text: `${i.name} (${i.year}): ${i.text} Lesson: ${i.lesson}`, cite: `${i.name} incident`, url: i.src })
  for (const s of data.spinoffs)
    out.push({ id: `sp:${s.name}`, title: s.name, text: `${s.name} (${s.year}): ${s.text}`, cite: `${s.name} (NASA spinoff)`, url: s.src })
  for (const e of data.environments)
    out.push({ id: `env:${e.id}`, title: e.name, text: `${e.name}: ${Math.round(e.o2 * 100)}% O2, ${e.pressurePsi} psi, gravity ${e.gravityG ?? 'n/a'} g. ${e.note ?? ''}`, cite: `${e.name} environment`, url: null })
  return out
}

let _chunks: Chunk[] | null = null
const chunks = () => (_chunks ??= buildChunks())

const stem = (t: string) => t.replace(/(ing|ed|es|s|ion|ions)$/, '')

let _index: { doc: Set<string>; len: number }[] | null = null
let _idf: Map<string, number> | null = null
function index() {
  if (!_index) {
    _index = chunks().map((c) => {
      const tt = tokenize(c.text).map(stem)
      return { doc: new Set(tt), len: tt.length }
    })
    const df = new Map<string, number>()
    for (const d of _index) for (const t of d.doc) df.set(t, (df.get(t) ?? 0) + 1)
    _idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + _index!.length / n)]))
  }
  return { idx: _index, idf: _idf! }
}

// findings carry the real results; environment cards are only context
const TYPE_WEIGHT = (id: string) => (/:f\d+$/.test(id) ? 1.35 : id.startsWith('env:') ? 0.55 : id.startsWith('inc:') || id.startsWith('sp:') ? 0.9 : 1)

export function retrieve(question: string, k = 5): Chunk[] {
  const base = tokenize(question)
  const q = [...new Set([...base, ...base.flatMap((t) => SYN[t] ?? [])])].map(stem)
  if (!q.length) return []
  const { idx, idf } = index()
  const all = chunks()
  const scored = all.map((c, i) => {
    let s = 0
    for (const t of q) {
      const w = idf.get(t) ?? 0.5
      if (idx[i].doc.has(t)) s += w
      if (c.title.toLowerCase().includes(t)) s += 0.5 * w
    }
    const gapBoost = c.id.startsWith('up:') && mentionsPartialGravity(question) ? 4 : 1
    return { c, s: (s / Math.sqrt(idx[i].len + 30)) * TYPE_WEIGHT(c.id) * gapBoost }
  })
  return scored
    .filter((r) => r.s > 0.15)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((r) => r.c)
}

export const GAP_NOTE =
  'Important: PSI currently contains no partial-gravity (Moon or Mars) combustion data. LUCI and FM2 are expected to provide it; microgravity and 1 g results bound the answer.'

export function mentionsPartialGravity(q: string) {
  return /\b(moon|lunar|mars|martian|partial|0\.16|0\.38)\b/i.test(q)
}
