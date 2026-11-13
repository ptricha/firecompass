import raw from '@/data/investigations.v2.json'

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
  files: { total: number; byType: Record<string, number>; videos: number; experimentalTable: boolean }
  publications: { title: string; authors: string; doi: string | null }[]
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

export const AREA_LABEL: Record<Area, string> = {
  prevention: 'Prevention',
  detection: 'Detection',
  suppression: 'Suppression',
  fundamental: 'Basic science',
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

export function fmtRange(r: [number | null, number | null] | null, unit: string, scale = 1): string | null {
  if (!r) return null
  const [a, b] = r
  const f = (v: number) => `${Math.round(v * scale * 100) / 100}`
  if (a == null && b != null) return `up to ${f(b)} ${unit}`
  if (a != null && b == null) return `from ${f(a)} ${unit}`
  if (a != null && b != null) return `${f(a)} – ${f(b)} ${unit}`
  return null
}
