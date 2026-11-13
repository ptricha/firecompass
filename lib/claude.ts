import Anthropic from '@anthropic-ai/sdk'
import { GAP_NOTE, type Chunk } from './retrieval'
import type { Lang } from './data'
import { dropUnsupportedSentences, parseModelJson, VIZ_IDS, type ModelReply } from './oracleGuard'
import type { KeyFact } from './oracle'

export const MODEL_MAIN = 'claude-sonnet-5-5'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
}

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY)

const systemPrompt = (lang: Lang) => `You are the Flame Oracle of JaPax, an assistant grounded ONLY in NASA's microgravity combustion research (PSI) and the verified facts supplied in each request.

Reply with ONE JSON object and nothing else:
{
  "headline": "one striking sentence (max 120 chars) that answers the question",
  "body": "2 to 4 sentences, vivid but precise, for a curious non-specialist",
  "confidence": "high" | "medium" | "low",
  "followUps": ["three short follow-up questions the data can answer"],
  "viz": one of ${VIZ_IDS.map((v) => `"${v}"`).join(', ')}
}

RULES
1. Use ONLY information present in CONTEXT or FACTS. Every number you write must appear there. Never add statistics, temperatures or results of your own.
2. Name the investigation (e.g. "BASS", "FLEX") when you state a result. Distinguish measured results, reported results and hypotheses.
3. If the context does not answer the question, say so plainly and point to the closest relevant data; use confidence "low".
4. ${GAP_NOTE} Mention this gap whenever the question involves the Moon, Mars or partial gravity.
5. viz guide: "coverage" for atmospheres/oxygen/lunar habitat, "flexOutcomes" for suppression and droplet tests, "bassOxygen" for solid-material flammability, "gravityGap" for partial gravity, otherwise "none".
6. Write in ${lang === 'es' ? 'Spanish' : 'English'}.`

export async function narrateWithClaude(question: string, context: Chunk[], facts: KeyFact[], lang: Lang): Promise<ModelReply | null> {
  const ctx = context.map((c, i) => `[${i + 1}] ${c.text} (source: ${c.cite})`).join('\n')
  const fx = facts.map((f) => `- ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ''}`).join('\n')
  const message = await getClient().messages.create({
    model: MODEL_MAIN,
    max_tokens: 700,
    system: systemPrompt(lang),
    messages: [{ role: 'user', content: `CONTEXT:\n${ctx || '(none)'}\n\nFACTS:\n${fx || '(none)'}\n\nQUESTION: ${question}` }],
  })
  const block = message.content[0]
  const raw = block.type === 'text' ? block.text : ''
  const reply = parseModelJson(raw)
  if (!reply) return null
  // anti-hallucination: keep only sentences whose numbers are in the evidence
  const allowed = `${ctx}\n${fx}\n${question}`
  const body = dropUnsupportedSentences(reply.body, allowed)
  const head = dropUnsupportedSentences(reply.headline, allowed)
  if (!body.text || !head.text) return null
  return { ...reply, body: body.text, headline: head.text }
}
