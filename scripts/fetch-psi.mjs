// Descarga y resume los metadatos públicos de PSI (sin autenticación).
// Uso: node scripts/fetch-psi.mjs  ->  data/psi/PSI-XX.json + data/psi/_summary.json
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = 'https://psi.nasa.gov/geode-py/ws/repo/investigations'
const IDS = [10, 20, 21, 22, 25, 26, 39, 47, 60, 68, 69, 98, 99, 100, 101, 102, 106, 107, 159]
const OUT = new URL('../data/psi/', import.meta.url)

async function get(id, tries = 6) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`${BASE}/PSI-${id}`, {
        headers: { 'User-Agent': 'firecompass-spaceapps-2026/1.0' },
        signal: AbortSignal.timeout(90_000),
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (i === tries) { console.error(`PSI-${id} FAIL: ${e.message}`); return undefined }
      await new Promise(r => setTimeout(r, 1500 * i))
    }
  }
}

const ext = n => (n.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'other').toLowerCase()

function summarize(j) {
  const files = [...(j.added ?? []), ...(j.experimentalTable ?? [])].filter(f => !f.restricted)
  const byType = {}
  for (const f of files) byType[ext(f.file_name)] = (byType[ext(f.file_name)] ?? 0) + 1
  return {
    accession: j.accession,
    acronym: j.investigationAcronym,
    title: j.title,
    doi: j.doi ?? null,
    objective: j.objective ?? null,
    hypothesis: j.hypothesis ?? null,
    hardware: j.experimentHardware ?? null,
    flightProgram: j.flightProgram ?? null,
    mission: j.missionName ?? null,
    missionStart: j.missionStart ?? null,
    researchArea: j.researchArea ?? null,
    researchImpacts: j.researchImpacts ?? null,
    publications: (j.publications ?? []).slice(0, 12),
    fileCountByType: byType,
    totalFiles: files.length,
    experimentalTable: (j.experimentalTable ?? []).map(f => ({ name: f.file_name, bytes: f.file_size, path: f.s3_path })),
    videos: (j.added ?? []).filter(f => /\.mp4$/i.test(f.file_name) && !f.restricted)
      .map(f => ({ name: f.file_name, bytes: f.file_size, url: f.remote_url, group: f.subcategory })),
    license: j.licenseName ?? null,
    releaseDate: j.releaseDate ?? null,
  }
}

await mkdir(OUT, { recursive: true })
const summary = []
for (const id of IDS) {
  const j = await get(id)
  if (j === null) { console.log(`PSI-${id}: no existe`); summary.push({ accession: `PSI-${id}`, missing: true }); continue }
  if (j === undefined) { summary.push({ accession: `PSI-${id}`, error: true }); continue }
  const s = summarize(j)
  summary.push(s)
  await writeFile(new URL(`PSI-${id}.json`, OUT), JSON.stringify(s, null, 2))
  console.log(`PSI-${id}: ${s.acronym} | ${s.title} | doi=${s.doi} | files=${s.totalFiles}`)
}
await writeFile(new URL('_summary.json', OUT), JSON.stringify(summary, null, 2))
