/**
 * Pure helpers that make AI narration safe. No imports, so they can be unit-tested in isolation.
 *  - parseModelJson: pulls the first JSON object out of a model reply.
 *  - dropUnsupportedSentences: removes any sentence with a number that is not in the evidence.
 */

export const VIZ_IDS = ['coverage', 'flexOutcomes', 'bassOxygen', 'gravityGap', 'none'] as const
export type VizId = (typeof VIZ_IDS)[number]

export interface ModelReply {
  headline: string
  body: string
  confidence: 'high' | 'medium' | 'low'
  followUps: string[]
  viz: VizId
}

export function parseModelJson(raw: string): ModelReply | null {
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  let j: Record<string, unknown>
  try {
    j = JSON.parse(m[0])
  } catch {
    return null
  }
  const headline = typeof j.headline === 'string' ? j.headline.trim().slice(0, 150) : ''
  const body = typeof j.body === 'string' ? j.body.trim().slice(0, 900) : ''
  if (!headline || !body) return null
  const confidence = j.confidence === 'high' || j.confidence === 'medium' || j.confidence === 'low' ? j.confidence : 'medium'
  const followUps = Array.isArray(j.followUps) ? j.followUps.filter((x): x is string => typeof x === 'string').map((s) => s.trim().slice(0, 120)).slice(0, 3) : []
  const viz = (VIZ_IDS as readonly string[]).includes(j.viz as string) ? (j.viz as VizId) : 'none'
  return { headline, body, confidence, followUps, viz }
}

const normNum = (s: string) => s.replace(',', '.')

/** Keeps only sentences whose numbers all appear in `allowed` (evidence text). Years and tiny integers are ignored. */
export function dropUnsupportedSentences(text: string, allowed: string): { text: string; dropped: number } {
  const hay = allowed.replace(/,/g, '.')
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [text]
  const keep: string[] = []
  let dropped = 0
  for (const s of sentences) {
    const nums = (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map(normNum)
    const bad = nums.some((n) => {
      if (/^(19|20)\d{2}$/.test(n)) return !hay.includes(n) // years must be in the evidence too
      if (n.length < 2 && !n.includes('.')) return false // single digits: counts like "two"
      return !hay.includes(n)
    })
    if (bad) dropped++
    else keep.push(s.trim())
  }
  return { text: keep.join(' ').trim(), dropped }
}
