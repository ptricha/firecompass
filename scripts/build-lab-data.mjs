// Convierte las tablas experimentales de PSI (CSV, CC0) en data/lab.json para la pagina Data Lab.
// Entrada: data/raw/psi/*.csv  (descargados con fetch-psi-files.mjs o copias CC0 verificadas por tamano)
// Salida: data/lab.json (pequeno; se versiona). No interpreta ni modifica valores: solo los convierte a numeros
// cuando son numericos y conserva el texto original cuando no lo son.
import { readFile, writeFile } from 'node:fs/promises'

const RAW = new URL('../data/raw/psi/', import.meta.url)
const OUT = new URL('../data/lab.json', import.meta.url)

async function readCsv(name) {
  const buf = await readFile(new URL(name, RAW))
  const text = new TextDecoder('windows-1252').decode(buf).replace(/^(﻿|ï»¿)/, '')
  // RFC 4180
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"' && cell === '') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row) }
  const head = rows.shift()
  return { head, rows: rows.filter(r => r.length > 1 || r[0] !== '') }
}

const num = s => {
  const t = (s ?? '').trim()
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}
const txt = s => ((s ?? '').trim() || null)

// ---------- FLEX (PSI-69) ----------
const flex = await readCsv('PSI-69_Experimental table_FLEX.csv')
const fi = n => flex.head.findIndex(h => h.startsWith(n))
const FX = { n: fi('FLEX Test'), id: fi('FLEX Identifier'), date: fi('Test Date'), fuel: fi('Fuel'), p: fi('Ambient pressure'),
  o2: fi('O initial'), n2: fi('N initial'), co2: fi('CO initial'), he: fi('He initial'), d0: fi('Droplet initial'),
  dext: fi('Visible flame extinction'), rate: fi('Burning rate'), time: fi('Burn time'), end: fi('Test end') }
if (Object.values(FX).some(v => v < 0)) throw new Error('FLEX: columna no encontrada ' + JSON.stringify(FX))

const flexRows = flex.rows.map(r => {
  const pMm = num(r[FX.p])
  return {
    n: num(r[FX.n]), id: txt(r[FX.id]), date: txt(r[FX.date]), fuel: txt(r[FX.fuel]),
    pMmHg: pMm, pAtm: pMm == null ? null : Math.round((pMm / 760) * 1000) / 1000,
    o2: num(r[FX.o2]), n2: num(r[FX.n2]), co2: num(r[FX.co2]), he: num(r[FX.he]),
    d0: num(r[FX.d0]), dExt: num(r[FX.dext]), rate: num(r[FX.rate]), time: num(r[FX.time]), end: txt(r[FX.end]),
  }
})

// ---------- BASS-II (PSI-25) ----------
const bass = await readCsv('PSI-25_Experimental table_BASS-II.csv')
const bi = n => bass.head.findIndex(h => h.trim().startsWith(n))
const BX = { pi: bi('PI'), test: bi('Test #'), date: bi('Date'), sample: bi('Sample #'), mat: bi('Fuel Sample Material'),
  restr: bi('Flow restrictor'), fan: bi('Fan display'), air: bi('Air display'), o2i: bi('Calibrated  initial O2'), o2f: bi('Calibrated final O2') }
if (Object.values(BX).some(v => v < 0)) throw new Error('BASS-II: columna no encontrada ' + JSON.stringify(BX))

const bassRows = bass.rows.map(r => ({
  pi: txt(r[BX.pi]), test: txt(r[BX.test]), date: txt(r[BX.date]), sample: txt(r[BX.sample]),
  material: (txt(r[BX.mat]) ?? '').replace(/\s+/g, ' '),
  restrictor: txt(r[BX.restr]), fan: txt(r[BX.fan]), air: txt(r[BX.air]),
  o2Initial: num(r[BX.o2i]), o2Final: num(r[BX.o2f]),
}))

// ---------- verificaciones ----------
const bad = flexRows.filter(r => r.o2 == null || r.pAtm == null || !r.end || !r.fuel)
const sumOk = flexRows.filter(r => r.o2 != null && r.n2 != null && r.co2 != null && r.he != null && Math.abs(r.o2 + r.n2 + r.co2 + r.he - 1) > 0.011)
console.log(`FLEX: ${flexRows.length} ensayos, ${bad.length} con campos clave vacios, ${sumOk.length} cuya composicion no suma 1`)
console.log(`BASS-II: ${bassRows.length} ensayos, ${new Set(bassRows.map(r => r.pi)).size} investigadores principales`)

const out = {
  generatedAt: new Date().toISOString(),
  flex: {
    psiId: 'PSI-69', doi: '10.60555/mbq8-0451', license: 'CC0-1.0', file: 'PSI-69_Experimental table_FLEX.csv', sizeBytes: 24776,
    columnNotes: {
      o2: 'PSI header "O initial ambient composition" (subscript lost in export): oxygen mole fraction.',
      co2: 'PSI header "CO initial ambient composition" (subscript lost in export): treated as CO2, the suppressant named in the FLEX fact sheet.',
      rate: 'PSI header reads "Burning rate; mm" (unit truncated in export); not interpreted further.',
      end: 'Outcome label as recorded by PSI: Extinction, Completion or Disruption.',
    },
    rows: flexRows,
  },
  bass2: {
    psiId: 'PSI-25', doi: '10.60555/4qc4-de67', license: 'CC0-1.0', file: 'PSI-25_Experimental table_BASS-II.csv', sizeBytes: 16590,
    columnNotes: { air: 'Free text as recorded (e.g. "5", "5 down to ext"); units not stated in the table.', o2: 'Calibrated O2 % by volume, initial and final, as recorded.' },
    rows: bassRows,
  },
}
await writeFile(OUT, JSON.stringify(out))
console.log('OK data/lab.json')
