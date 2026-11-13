// Descarga las tablas experimentales (CSV) publicas de PSI (licencia CC0).
// Proceso de dos pasos (el mismo que usa el portal de PSI):
//   1) GET /studies/{PSI-XX}/download?file=...&version=N&redirect=false  -> URL firmada (texto plano)
//   2) GET de esa URL firmada -> el archivo
// Uso: node scripts/fetch-psi-files.mjs [--retry-wait=30] [--only=PSI-69,PSI-25]
// Salida: data/raw/psi/<archivo>  (ignorado por git). Verifica el tamano contra los metadatos.
import { mkdir, stat, writeFile, rename } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const API = 'https://psi.nasa.gov/geode-py/ws'
const OUT = fileURLToPath(new URL('../data/raw/psi/', import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
const only = args.only ? args.only.split(',') : null

const headers = { 'User-Agent': 'japax-spaceapps-2026/1.0' }

async function getText(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(120_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (e) {
      if (i === tries) throw e
      await new Promise(r => setTimeout(r, 2000 * i))
    }
  }
}

const summary = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../data/psi/_summary.json', import.meta.url), 'utf8'))
await mkdir(OUT, { recursive: true })

let ok = 0, fail = 0
for (const inv of summary) {
  if (!inv.experimentalTable || (only && !only.includes(inv.accession))) continue
  for (const f of inv.experimentalTable) {
    const dest = OUT + f.name
    try { if ((await stat(dest)).size === f.bytes) { console.log(`= ${f.name} (ya descargado)`); ok++; continue } } catch {}
    try {
      const q = new URLSearchParams({ file: f.name, version: '1', redirect: 'false' })
      const signed = (await (await getText(`${API}/studies/${inv.accession}/download?${q}`)).text()).trim()
      if (!/^https?:\/\//.test(signed)) throw new Error('el servicio devolvio una respuesta vacia (PSI degradado); reintenta mas tarde')
      const buf = Buffer.from(await (await getText(signed)).arrayBuffer())
      if (f.bytes && buf.length !== f.bytes) throw new Error(`tamano ${buf.length} != esperado ${f.bytes}`)
      await writeFile(dest + '.part', buf)
      await rename(dest + '.part', dest)
      console.log(`+ ${f.name} (${buf.length} bytes)`)
      ok++
    } catch (e) {
      console.error(`! ${f.name}: ${e.message}`)
      fail++
    }
  }
}
console.log(`\nListo: ${ok} correctos, ${fail} fallidos.`)
process.exit(fail ? 1 : 0)
