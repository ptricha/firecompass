// Fusiona data/curated.json (hechos citados) con data/psi/*.json (metadatos de PSI)
// y genera data/investigations.v2.json, que es lo único que lee la app.
// Uso: node scripts/build-data.mjs
import { readFile, writeFile } from 'node:fs/promises'

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'))
const curated = await read('../data/curated.json')

const dataFactor = n => (n >= 500 ? 1 : n >= 100 ? 0.7 : n >= 10 ? 0.4 : 0.2)
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const investigations = []
for (const c of curated.investigations) {
  const psi = await read(`../data/psi/${c.psiId}.json`)
  const totalFiles = psi.totalFiles ?? 0
  investigations.push({
    id: slug(c.acronym),
    psiId: c.psiId,
    acronym: c.acronym,
    title: psi.title,
    doi: psi.doi,
    doiUrl: psi.doi ? `https://doi.org/${psi.doi}` : null,
    psiUrl: `https://psi.nasa.gov/physci/repo/data/investigations/${c.psiId}`,
    areas: c.areas,
    fuelPhase: c.fuelPhase,
    fuels: (c.fuels ?? []).filter(Boolean),
    conditions: c.conditions,
    sensors: c.sensors ?? [],
    summary: c.summary,
    findings: c.findings,
    habitat: c.habitat,
    factors: { realism: c.factors.realism, safety: c.factors.safety, modeling: c.factors.modeling, data: dataFactor(totalFiles) },
    spaceApplication: c.spaceApp,
    earthApplication: c.earthApp,
    status: c.status,
    hardware: psi.hardware,
    program: psi.flightProgram,
    files: { total: totalFiles, byType: psi.fileCountByType, videos: (psi.videos ?? []).length, experimentalTable: (psi.experimentalTable ?? []).length > 0 },
    publications: (psi.publications ?? []).slice(0, 6).map(p => ({ title: p.title, authors: p.authorList, doi: p.doi || null })),
  })
}

const out = {
  generatedAt: new Date().toISOString(),
  sources: curated.sources,
  investigations,
  upcoming: curated.upcoming,
  environments: curated.environments,
  incidents: curated.incidents,
  spinoffs: curated.spinoffs,
}
await writeFile(new URL('../data/investigations.v2.json', import.meta.url), JSON.stringify(out, null, 2))
console.log(`OK: ${investigations.length} investigaciones, ${investigations.filter(i => i.doi).length} con DOI`)
