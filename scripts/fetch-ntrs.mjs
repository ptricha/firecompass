// Descarga literatura oficial de NASA NTRS (API publica, sin clave) para cada investigacion PSI.
// Solo conserva resultados cuyo titulo o resumen contiene la frase exacta buscada.
// Salida: data/ntrs.json { "PSI-XX": [{id,title,year,authors,abstract,url}], _topics: {...} }
import { writeFile } from 'node:fs/promises'
const Q = {
  'PSI-10': ['Flame Design', 'sooting spherical diffusion flames microgravity'],
  'PSI-20': ['Burning Rate Emulator', 'ACME BRE'],
  'PSI-21': ['Coflow Laminar Diffusion Flame', 'CLD Flame'],
  'PSI-22': ['E-FIELD Flames', 'electric field flame microgravity'],
  'PSI-25': ['Burning and Suppression of Solids II', 'BASS-II'],
  'PSI-26': ['Burning and Suppression of Solids', 'BASS flammability'],
  'PSI-39': ['Cool Flames Investigation', 'cool flame droplet microgravity'],
  'PSI-47': ['Dust Aerosol Feasibility Test', 'DAFT P-Trak'],
  'PSI-60': ['Smoke Point In Coflow Experiment', 'SPICE soot'],
  'PSI-68': ['FLEX-2', 'Flame Extinguishment Experiment'],
  'PSI-69': ['Flame Extinguishment Experiment', 'FLEX droplet extinction'],
  'PSI-98': ['Saffire-I', 'Spacecraft Fire Experiment'],
  'PSI-99': ['Saffire-II', 'Spacecraft Fire Experiment'],
  'PSI-100': ['Saffire-III', 'Spacecraft Fire Experiment'],
  'PSI-101': ['Smoke Aerosol Measurement Experiment-Reflight', 'SAME-R'],
  'PSI-102': ['Smoke Aerosol Measurement Experiment', 'SAME smoke'],
  'PSI-106': ['Structure and Liftoff in Combustion Experiment', 'SLICE'],
  'PSI-107': ['Smoke Point In Coflow Experiment', 'SPICE'],
  'PSI-159': ['Cool Flames Investigation with Gases', 'CFI-G'],
}
const TOPICS = {
  'Partial gravity flammability': ['partial gravity flammability', 'lunar gravity combustion', 'Mars gravity flame spread'],
  'Spacecraft fire safety': ['spacecraft fire safety', 'spacecraft fire detection', 'spacecraft fire suppression'],
  'Habitat atmospheres': ['exploration atmosphere flammability', 'reduced pressure oxygen enriched flammability'],
  'Lunar missions (LUCI, FM2)': ['LUCI combustion lunar', 'Flammability of Materials on the Moon', 'Lunar-g Combustion Investigation'],
}
const yearOf = r => (r.publications?.[0]?.publicationDate ?? r.created ?? '').slice(0, 4) || null
const clean = a => (!a || /^no abstract/i.test(a)) ? null : a.replace(/\s+/g, ' ').trim().slice(0, 500)
async function search(q, rows = 12) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://ntrs.nasa.gov/api/citations/search?rows=${rows}&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(30000) })
      return (await r.json()).results ?? []
    } catch { await new Promise(r => setTimeout(r, 1500)) }
  }
  return []
}
const shape = r => ({
  id: String(r.id), title: r.title, year: yearOf(r),
  authors: (r.authorAffiliations ?? []).slice(0, 4).map(a => a.meta?.author?.name).filter(Boolean),
  abstract: clean(r.abstract), url: `https://ntrs.nasa.gov/citations/${r.id}`,
})
const out = {}
const taken = new Set()
for (const [psi, phrases] of Object.entries(Q)) {
  const keep = new Map()
  for (const ph of phrases) {
    for (const r of await search(`"${ph}"`)) {
      const hay = `${r.title} ${r.abstract ?? ''}`.toLowerCase()
      if (hay.includes(ph.toLowerCase()) && /combust|flame|fire|smoke|soot|microgravity|droplet|flammab|aerosol/.test(hay)) keep.set(String(r.id), shape(r))
    }
  }
  out[psi] = [...keep.values()].sort((a, b) => (b.year ?? '').localeCompare(a.year ?? '')).slice(0, 12)
  console.log(psi, out[psi].length)
}
out._topics = {}
for (const [name, qs] of Object.entries(TOPICS)) {
  const keep = new Map()
  for (const q of qs) for (const r of await search(`"${q}"`, 10)) {
    const hay = `${r.title} ${r.abstract ?? ''}`.toLowerCase()
    if (/flammab|combust|flame|fire/.test(hay)) keep.set(String(r.id), shape(r))
  }
  out._topics[name] = [...keep.values()].sort((a, b) => (b.year ?? '').localeCompare(a.year ?? '')).slice(0, 15)
  console.log('topic', name, out._topics[name].length)
}
out._generatedAt = new Date().toISOString()
await writeFile(new URL('../data/ntrs.json', import.meta.url), JSON.stringify(out, null, 1))
