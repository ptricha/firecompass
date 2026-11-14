// Busca en NASA NTRS las publicaciones de PSI sin DOI y guarda data/pubntrs.json {titulo: idNTRS}.
// Solo acepta títulos casi idénticos. Uso: node scripts/resolve-ntrs.mjs
import { readFile, writeFile } from 'node:fs/promises'
const inv = JSON.parse(await readFile(new URL('../data/investigations.v2.json', import.meta.url), 'utf8'))
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const sim = (a, b) => { const A = new Set(norm(a).split(' ')), B = new Set(norm(b).split(' ')); let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(A.size, B.size) }
const out = {}
for (const i of inv.investigations) for (const p of i.publications) {
  if (p.doi || out[p.title]) continue
  try {
    const r = await fetch(`https://ntrs.nasa.gov/api/citations/search?rows=5&q=${encodeURIComponent(p.title.slice(0, 120))}`, { signal: AbortSignal.timeout(30000) })
    const best = (await r.json()).results.map(x => ({ id: x.id, t: x.title, s: sim(p.title, x.title) })).sort((a, b) => b.s - a.s)[0]
    if (best && best.s >= 0.85) { out[p.title] = best.id; console.log('OK ', best.s.toFixed(2), best.id, '|', p.title.slice(0, 60)) }
    else console.log('NO ', best?.s.toFixed(2), '|', p.title.slice(0, 60))
  } catch (e) { console.log('ERR', e.message) }
}
await writeFile(new URL('../data/pubntrs.json', import.meta.url), JSON.stringify(out, null, 2))
