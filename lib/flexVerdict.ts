import lab from '@/data/lab.json'
import type { Fate, Fuel } from './flameEngine'

/**
 * Descriptive verdict from the nearest measured FLEX tests (PSI-69).
 * Never extrapolates: outside the measured range it returns fate 'unknown'.
 */
type Row = (typeof lab.flex.rows)[number]
const ROWS: Row[] = lab.flex.rows.filter((r) => r.o2 != null && r.pAtm)
const NAME: Record<Fuel, string> = { methanol: 'Methanol', heptane: 'Heptane' }

export interface Verdict {
  inRange: boolean
  issues: { key: 'o2' | 'p' | 'co2' | 'he'; value: number; lo: number; hi: number }[]
  near: { r: Row; d: number }[]
  extinctions: number
  fate: Fate
}

export function flexVerdict(q: { fuel: Fuel; o2: number; pressureAtm: number; co2: number; he: number }): Verdict {
  const set = ROWS.filter((r) => r.fuel === NAME[q.fuel])
  const rng = (f: (r: Row) => number) => {
    const v = set.map(f)
    return [Math.min(...v), Math.max(...v)] as const
  }
  const [o0, o1] = rng((r) => r.o2!)
  const [p0, p1] = rng((r) => r.pAtm!)
  const c1 = Math.max(...set.map((r) => r.co2 ?? 0))
  const h1 = Math.max(...set.map((r) => r.he ?? 0))
  const issues: Verdict['issues'] = []
  if (q.o2 < o0 - 1e-9 || q.o2 > o1 + 1e-9) issues.push({ key: 'o2', value: q.o2, lo: o0, hi: o1 })
  if (q.pressureAtm < p0 * 0.97 || q.pressureAtm > p1 * 1.03) issues.push({ key: 'p', value: q.pressureAtm, lo: p0, hi: p1 })
  if (q.co2 > c1 + 1e-9) issues.push({ key: 'co2', value: q.co2, lo: 0, hi: c1 })
  if (q.he > h1 + 1e-9) issues.push({ key: 'he', value: q.he, lo: 0, hi: h1 })
  const dist = (r: Row) =>
    Math.hypot(
      (r.o2! - q.o2) / (o1 - o0 || 1),
      (r.pAtm! - q.pressureAtm) / (p1 - p0 || 1),
      ((r.co2 ?? 0) - q.co2) / (c1 || 1),
      ((r.he ?? 0) - q.he) / (h1 || 1),
    )
  const near = set.map((r) => ({ r, d: dist(r) })).sort((a, b) => a.d - b.d).slice(0, 5)
  const extinctions = near.filter((x) => x.r.end === 'Extinction').length
  const inRange = issues.length === 0
  return { inRange, issues, near, extinctions, fate: !inRange ? 'unknown' : extinctions >= 3 ? 'extinguish' : 'burn' }
}
