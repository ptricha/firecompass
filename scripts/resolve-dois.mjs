// Busca en Crossref el DOI de las publicaciones de PSI que no lo traen y guarda data/pubdois.json.
// Solo acepta coincidencias con título casi idéntico. Uso: node scripts/resolve-dois.mjs
import { readFile, writeFile } from 'node:fs/promises'
const inv = JSON.parse(await readFile(new URL('../data/investigations.v2.json', import.meta.url), 'utf8'))
const norm = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
const sim = (a, b) => { const A = new Set(norm(a).split(' ')), B = new Set(norm(b).split(' ')); let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(A.size, B.size) }
const out = {}
for (const i of inv.investigations) for (const p of i.publications) {
  if (p.doi || out[p.title]) continue
  try {
    const r = await fetch(`https://api.crossref.org/works?rows=3&select=DOI,title&query.bibliographic=${encodeURIComponent(p.title)}`, { headers: { 'User-Agent': 'japax-spaceapps-2026/1.0' }, signal: AbortSignal.timeout(30000) })
    const items = (await r.json()).message.items
    const best = items.map(x => ({ doi: x.DOI, t: x.title?.[0] ?? '', s: sim(p.title, x.title?.[0] ?? '') })).sort((a, b) => b.s - a.s)[0]
    if (best && best.s >= 0.9) { out[p.title] = best.doi; console.log('OK ', best.s.toFixed(2), best.doi, '|', p.title.slice(0, 70)) }
    else console.log('NO ', best?.s.toFixed(2), '|', p.title.slice(0, 70))
  } catch (e) { console.log('ERR', e.message) }
}
await writeFile(new URL('../data/pubdois.json', import.meta.url), JSON.stringify(out, null, 2))
