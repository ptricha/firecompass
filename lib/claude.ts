import Anthropic from '@anthropic-ai/sdk'
import { GAP_NOTE, type Chunk } from './retrieval'

export const MODEL_MAIN = 'claude-sonnet-5-5'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
}

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY)

const SYSTEM_PROMPT = `You are FireCompass AI, a fire-safety assistant grounded in NASA's microgravity combustion research (Physical Sciences Informatics, PSI).

RULES
1. Answer ONLY from the CONTEXT passages provided. Never add numbers, results or claims that are not in them.
2. Cite every claim inline with the investigation name and PSI ID, e.g. "BASS (PSI-26)". Include the DOI when the context has it.
3. If the context does not contain the answer, say "No verified data available for that" and say what the closest relevant data is.
4. ${GAP_NOTE}
5. Distinguish reported results from hypotheses and from planned ranges.
6. Be concise (under 170 words), clear for non-specialists, and answer in English.`

export async function askClaude(question: string, context: Chunk[]): Promise<string> {
  const ctx = context.map((c, i) => `[${i + 1}] ${c.text}\n(source: ${c.cite})`).join('\n\n')
  const message = await getClient().messages.create({
    model: MODEL_MAIN,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `CONTEXT:\n${ctx || '(none found)'}\n\nQUESTION: ${question}` }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}
