import Anthropic from '@anthropic-ai/sdk'
import investigations from '@/data/investigations.json'

const MODEL_MAIN = 'claude-sonnet-5-5'
const MODEL_FAST = 'claude-haiku-5-5'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY no configurada')
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
}

const SYSTEM_PROMPT = `You are FireCompass AI, a fire safety expert specializing in NASA microgravity combustion research.
Your knowledge comes exclusively from NASA's Physical Sciences Informatics (PSI) database experiments.

CRITICAL RULES:
1. ALWAYS cite the specific investigation (e.g., "FLEX (PSI-69, DOI: 10.60555/mbq8-0451)")
2. NEVER invent data — only state what comes from the PSI experiments
3. When data is missing, say "No experimental data available yet" (this is especially true for partial gravity)
4. Keep answers clear for non-specialists (professors, students, mission planners)
5. Distinguish: MEASURED data vs PREDICTED/ESTIMATED data

KEY SCIENTIFIC CONTEXT:
- Earth: 21% O2, 14.7 psi, 1g — teardrop flames, convection-driven
- ISS: 21% O2, 14.7 psi, 0g — spherical blue flames, diffusion-only
- Moon Base: ~30% O2, ~10.2 psi, 0.16g — 40%+ more flammable than Earth
- Spacesuit: 100% O2, 4.3 psi, 0g — extremely flammable
- CRITICAL GAP: NO partial-gravity (Moon/Mars) combustion data exists yet

AVAILABLE INVESTIGATIONS:
${investigations.map(i => `- ${i.acronym} (${i.psiId}): ${i.keyFinding}`).join('\n')}`

export async function askFireCompass(question: string): Promise<string> {
  const message = await getClient().messages.create({
    model: MODEL_MAIN,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }]
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function analyzeInvestigation(psiId: string): Promise<string> {
  const inv = investigations.find(i => i.psiId === psiId)
  if (!inv) return 'Investigation not found'

  const message = await getClient().messages.create({
    model: MODEL_FAST,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Explain the ${inv.acronym} investigation (${inv.psiId}) for a non-specialist.
      What did it measure? What did it find? Why does it matter for Moon Base fire safety?
      Keep it under 150 words. Cite the PSI ID and DOI.`
    }]
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function getEnvironmentRisk(
  environment: 'earth' | 'iss' | 'moon' | 'mars' | 'spacesuit'
): Promise<string> {
  const envData = {
    earth: { o2: '21%', pressure: '14.7 psi', gravity: '1g' },
    iss: { o2: '21%', pressure: '14.7 psi', gravity: '0g' },
    moon: { o2: '30%+', pressure: '10.2 psi', gravity: '0.16g' },
    mars: { o2: '0.13%', pressure: '0.09 psi', gravity: '0.38g' },
    spacesuit: { o2: '100%', pressure: '4.3 psi', gravity: '0g' }
  }

  const message = await getClient().messages.create({
    model: MODEL_FAST,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze fire risk for ${environment.toUpperCase()}: ${JSON.stringify(envData[environment])}.
      Based on NASA PSI data, what is the fire risk level and why?
      Which investigations are most relevant?
      Format: Risk Level (LOW/MEDIUM/HIGH/CRITICAL), 2-3 sentence explanation, top 2 relevant experiments with PSI IDs.`
    }]
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function analyzeVideoFrame(base64Image: string, frameContext: string): Promise<{
  flameShape: string
  estimatedDiameterPx: number
  dominantColor: string
  hasExtinction: boolean
  notes: string
}> {
  const message = await getClient().messages.create({
    model: MODEL_MAIN,
    max_tokens: 512,
    system: 'You are a combustion scientist analyzing NASA experiment video frames. Extract precise measurements.',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
        },
        {
          type: 'text',
          text: `Analyze this microgravity flame frame. Context: ${frameContext}
          Return JSON with: flameShape (spherical/elongated/extinguishing/none),
          estimatedDiameterPx (pixels, 0 if no flame), dominantColor (blue/yellow/orange/none),
          hasExtinction (boolean), notes (1 sentence observation).`
        }
      ]
    }]
  })
  const block = message.content[0]
  if (block.type !== 'text') throw new Error('No text response')
  const jsonMatch = block.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  return JSON.parse(jsonMatch[0])
}
