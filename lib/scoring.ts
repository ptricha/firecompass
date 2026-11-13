import type { Investigation } from './data'

/**
 * Explainable lunar-habitat relevance engine (FireCompass editorial method).
 * Each factor is a 0-1 value derived from facts cited in data/curated.json; users can
 * change the weights. An unknown value counts as 0.5 and is flagged as pending
 * (never hidden).
 */
export const FACTORS = ['habitat', 'realism', 'safety', 'data', 'modeling'] as const
export type FactorKey = (typeof FACTORS)[number]
export type Weights = Record<FactorKey, number>

export const DEFAULT_WEIGHTS: Weights = { habitat: 35, realism: 25, safety: 20, data: 10, modeling: 10 }

export const FACTOR_INFO: Record<FactorKey, { label: string; help: string }> = {
  habitat: {
    label: 'Habitat atmosphere',
    help: 'Whether the tested O2 range covers ≥26.5% and the pressure range covers ≤0.69 atm (10.2 psi), the conditions planned for lunar bases.',
  },
  realism: {
    label: 'Fuel realism',
    help: 'Solid spacecraft materials and large-scale fires score high; droplets and model gases score low.',
  },
  safety: {
    label: 'Fire-safety focus',
    help: 'Whether the PSI objective is directly about prevention, detection or suppression (1.0) or basic science with indirect relevance (0.25–0.5).',
  },
  data: {
    label: 'Data richness',
    help: 'Number of public files in PSI (≥500, ≥100, ≥10 or fewer).',
  },
  modeling: {
    label: 'Modeling value',
    help: 'Whether the investigation states model-validation goals and has an experimental table.',
  },
}

const tri = (v: boolean | null) => (v === true ? 1 : v === false ? 0 : 0.5)

export interface ScoreResult {
  total: number
  parts: Record<FactorKey, number> // points contributed to the total
  raw: Record<FactorKey, number> // 0-1 value
  pending: FactorKey[] // factors with an unverified input
}

export function scoreInvestigation(inv: Investigation, w: Weights = DEFAULT_WEIGHTS): ScoreResult {
  const raw: Record<FactorKey, number> = {
    habitat: (tri(inv.habitat.o2) + tri(inv.habitat.pressure)) / 2,
    realism: inv.factors.realism,
    safety: inv.factors.safety,
    data: inv.factors.data,
    modeling: inv.factors.modeling,
  }
  const sum = FACTORS.reduce((s, k) => s + w[k], 0) || 1
  const parts = {} as Record<FactorKey, number>
  let total = 0
  for (const k of FACTORS) {
    parts[k] = (raw[k] * w[k] * 100) / sum
    total += parts[k]
  }
  const pending: FactorKey[] = []
  if (inv.habitat.o2 === null || inv.habitat.pressure === null) pending.push('habitat')
  return { total, parts, raw, pending }
}

export function level(total: number): 'High' | 'Medium' | 'Low' {
  return total >= 70 ? 'High' : total >= 50 ? 'Medium' : 'Low'
}

/** Coverage of an environment by an investigation, using known ranges only. */
export function coversEnvironment(
  inv: Investigation,
  env: { o2: number; pressureAtm: number },
): 'full' | 'partial' | 'none' {
  const o2 = inv.conditions.o2
  const p = inv.conditions.pressureAtm
  const inO2 = o2 && o2[1] != null ? env.o2 <= o2[1] + 1e-9 && (o2[0] == null || env.o2 >= o2[0] - 1e-9) : null
  const inP = p ? env.pressureAtm >= p[0] - 1e-9 && env.pressureAtm <= p[1] + 1e-9 : null
  if (inO2 && inP) return 'full'
  if (inO2 || inP) return 'partial'
  return 'none'
}
