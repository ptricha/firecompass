import raw from '@/data/investigations.v2.json'
import es from '@/data/data.es.json'

export type Area = 'prevention' | 'detection' | 'suppression' | 'fundamental'

export interface Conditions {
  o2: [number | null, number | null] | null
  pressureAtm: [number, number] | null
  flowCmS: [number, number] | null
  note?: string
  atmospheres?: string[]
  suppressants?: string[]
  suppressantMoleFraction?: [number, number]
  dropletMm?: [number, number]
  n2SuppressantCcMin?: [number, number]
  inerts?: string[]
}

export interface Finding {
  text: string
  src: string
  kind: 'reported' | 'measured'
}

export interface Investigation {
  id: string
  psiId: string
  acronym: string
  title: string
  doi: string | null
  doiUrl: string | null
  psiUrl: string
  areas: Area[]
  fuelPhase: string
  fuels: string[]
  conditions: Conditions
  sensors: string[]
  summary: string
  findings: Finding[]
  habitat: { o2: boolean | null; pressure: boolean | null }
  factors: { realism: number; safety: number; modeling: number; data: number }
  spaceApplication: string | null
  earthApplication: string | null
  status: string
  hardware: string | null
  program: string | null
  files: {
    total: number
    byType: Record<string, number>
    videos: number
    experimentalTable: boolean
    videoUrls?: { name: string; bytes: number; url: string; group: string | null }[]
  }
  publications: { title: string; authors: string; doi: string | null; ntrs?: string | null }[]
}

export interface Source { label: string; url: string }
export interface Upcoming { acronym: string; name: string; gravity: string; note: string; src: string }
export interface Environment {
  id: string
  name: string
  o2: number
  pressureAtm: number
  pressurePsi: number
  gravityG: number | null
  src: string
  note?: string
}
export interface Incident { year: number | string; name: string; text: string; lesson: string; src: string }
export interface Spinoff { name: string; year: number; text: string; src: string }

export interface DataSet {
  generatedAt: string
  sources: Record<string, Source>
  investigations: Investigation[]
  upcoming: Upcoming[]
  environments: Environment[]
  incidents: Incident[]
  spinoffs: Spinoff[]
}

export const data = raw as unknown as DataSet

export type Lang = 'en' | 'es'

export const AREA_LABEL: Record<Area, string> = {
  prevention: 'Prevention',
  detection: 'Detection',
  suppression: 'Suppression',
  fundamental: 'Basic science',
}

export const AREA_LABEL_ES: Record<Area, string> = {
  prevention: 'Prevención',
  detection: 'Detección',
  suppression: 'Supresión',
  fundamental: 'Ciencia básica',
}

export const areaLabel = (a: Area, lang: Lang) => (lang === 'es' ? AREA_LABEL_ES[a] : AREA_LABEL[a])

interface EsInv {
  acronym?: string
  fuelPhase?: string
  fuels?: string[]
  note?: string
  sensors?: string[]
  summary?: string
  findings?: string[]
  spaceApplication?: string
  earthApplication?: string
  status?: string
}
interface EsData {
  investigations: Record<string, EsInv>
  upcoming: Record<string, { gravity?: string; note?: string }>
  environments: Record<string, { name?: string; note?: string }>
  incidents: Record<string, { year?: number | string; text?: string; lesson?: string }>
  spinoffs: Record<string, { name?: string; text?: string }>
}

let _es: DataSet | null = null
function localizeEs(): DataSet {
  const o = es as unknown as EsData
  return {
    ...data,
    investigations: data.investigations.map((inv) => {
      const e = o.investigations[inv.psiId]
      if (!e) return inv
      return {
        ...inv,
        acronym: e.acronym ?? inv.acronym,
        fuelPhase: e.fuelPhase ?? inv.fuelPhase,
        fuels: e.fuels ?? inv.fuels,
        sensors: e.sensors ?? inv.sensors,
        summary: e.summary ?? inv.summary,
        findings: inv.findings.map((f, i) => ({ ...f, text: e.findings?.[i] ?? f.text })),
        spaceApplication: inv.spaceApplication ? (e.spaceApplication ?? inv.spaceApplication) : null,
        earthApplication: inv.earthApplication ? (e.earthApplication ?? inv.earthApplication) : null,
        status: e.status ?? inv.status,
        conditions: { ...inv.conditions, note: e.note ?? inv.conditions.note },
      }
    }),
    upcoming: data.upcoming.map((u) => ({ ...u, ...(o.upcoming[u.acronym] ?? {}) })),
    environments: data.environments.map((v) => ({ ...v, ...(o.environments[v.id] ?? {}) })),
    incidents: data.incidents.map((i) => ({ ...i, ...(o.incidents[i.name] ?? {}) })),
    spinoffs: data.spinoffs.map((s) => ({ ...s, ...(o.spinoffs[s.name] ?? {}) })),
  }
}

/** Dataset in the requested language (Spanish falls back to English per field). */
export function getData(lang: Lang): DataSet {
  if (lang === 'en') return data
  return (_es ??= localizeEs())
}

export const AREA_COLOR: Record<Area, string> = {
  prevention: 'var(--a-prevention)',
  detection: 'var(--a-detection)',
  suppression: 'var(--a-suppression)',
  fundamental: 'var(--a-fundamental)',
}

export function getInvestigation(id: string): Investigation | undefined {
  return data.investigations.find(i => i.id === id)
}

export function sourceFor(key: string): Source | undefined {
  const base = key.split(' ')[0]
  return data.sources[base]
}

export const fmtPct = (x: number) => `${Math.round(x * 1000) / 10}%`

export function fmtRange(r: [number | null, number | null] | null, unit: string, scale = 1, lang: Lang = 'en'): string | null {
  if (!r) return null
  const [a, b] = r
  const f = (v: number) => `${Math.round(v * scale * 100) / 100}`
  if (a == null && b != null) return `${lang === 'es' ? 'hasta' : 'up to'} ${f(b)} ${unit}`
  if (a != null && b == null) return `${lang === 'es' ? 'desde' : 'from'} ${f(a)} ${unit}`
  if (a != null && b != null) return `${f(a)} – ${f(b)} ${unit}`
  return null
}
