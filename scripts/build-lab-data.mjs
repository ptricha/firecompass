// Convierte las tablas experimentales de PSI (CSV, CC0) en data/lab.json para la pagina Data Lab.
// Entrada: data/raw/psi/*.csv  (descargados con fetch-psi-files.mjs)
// Salida: data/lab.json (pequeno; se versiona). Convierte a numeros donde aplica.
import { readFile, writeFile } from 'node:fs/promises'

const RAW = new URL('../data/raw/psi/', import.meta.url)
const OUT = new URL('../data/lab.json', import.meta.url)

async function readCsv(name) {
  const buf = await readFile(new URL(name, RAW))
  const text = new TextDecoder('windows-1252').decode(buf).replace(/^(﻿|ï»¿)/, '')
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
  if (t === '' || !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return null
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

// ---------- CFI-G (PSI-159) Normal Flames ----------
const cfigN = await readCsv('PSI-159_Experimental table_CFI-G_Normal Flames.csv')
const cn = n => cfigN.head.findIndex(h => h.trim().startsWith(n))
const cfigNRows = cfigN.rows.map(r => ({
  flameType: txt(r[cn('Flame Type')]),
  day: num(r[cn('Day')]),
  fuel: txt(r[cn('Fuel')]),
  coolFlame: txt(r[cn('Cool flame')]),
  o2Before: num(r[cn('XO2 before')]),
  o2After: num(r[cn('XO2  after')]),
  pressureBar: num(r[cn('approx p (bar)')]),
  fuelMoleFrac: num(r[cn('Xf')]),
  burnRateMgS: num(r[cn('mHC')]),
  hotIgnition: txt(r[cn('Hot ignition')]),
  burnTimeSec: num(r[cn('burn time')]),
  selfExt: txt(r[cn('Self-ext')]),
}))

// ---------- CFI-G (PSI-159) Inverse Flames ----------
const cfigI = await readCsv('PSI-159_Experimental table_CFI-G_Inverse Flames.csv')
const ci = n => cfigI.head.findIndex(h => h.trim().startsWith(n))
const cfigIRows = cfigI.rows.map(r => ({
  flameType: txt(r[ci('Flame Type')]),
  day: num(r[ci('Day')]),
  fuel: txt(r[ci('Fuel')]),
  o2: num(r[ci('XO2')]),
  pressureBar: num(r[ci('approx p (bar)')]),
  burnRateMgS: num(r[ci('HC burnrate')]),
  hotIgnition: txt(r[ci('Hot ignition')]),
  burnTimeSec: num(r[ci('burn time')]),
  selfExt: txt(r[ci('Self -ext')]),
}))

// ---------- CFI (PSI-39) ----------
const cfi = await readCsv('PSI-39_Experimental table_CFI.csv')
const cfi_i = n => cfi.head.findIndex(h => h.trim().startsWith(n))
const cfiRows = cfi.rows.map(r => ({
  flexNumber: num(r[cfi_i('Flex Number')]),
  date: txt(r[cfi_i('Test Date')]),
  cir: txt(r[cfi_i('CIR')]),
  pressureAtm: num(r[cfi_i('Pressure')]),
  o2: num(r[cfi_i('Oxygen')]),
  n2: num(r[cfi_i('Nitrogen')]),
  he: num(r[cfi_i('Helium')]),
  fiber: txt(r[cfi_i('Fiber')]),
  fuel: txt(r[cfi_i('Fuel')]),
}))

// ---------- SPICE (PSI-107) ----------
const spice = await readCsv('PSI-107_Experimental table_Spice.csv')
const sp_i = n => spice.head.findIndex(h => h.trim().startsWith(n))
const spiceRows = spice.rows.map(r => ({
  date: txt(r[sp_i('GMT date')]),
  fuel: txt(r[sp_i('Fuel')]),
  nozzleMm: num(r[sp_i('Nozzle (mm)')]),
  fuelRateSccm: num(r[sp_i('Fuel Rate (sccm)')]),
  fuelRateMgS: num(r[sp_i('Fuel Rate (mg/s)')]),
  airRateCmS: num(r[sp_i('Air Rate (cm/s)')]),
}))

// ---------- SAME-R (PSI-101) ----------
const samer = await readCsv('PSI-101_Experimental table_SAME-R.csv')
const sr_i = n => samer.head.findIndex(h => h.trim().startsWith(n))
const samerRows = samer.rows.map(r => ({
  sampleType: txt(r[sr_i('Sample Type')]),
  testNum: txt(r[sr_i('SAME Test #')]),
  description: txt(r[sr_i('Description')]),
  date: txt(r[sr_i('Date')]),
  inletVelocityCmS: num(r[sr_i('Inlet velocity')]),
  rtR0: num(r[sr_i('Rt/R0')]),
  durationSec: num(r[sr_i('Duration (sec)')]),
}))

// ---------- BASS (PSI-26) ----------
const bass1 = await readCsv('PSI-26_Experimental table_BASS.csv')
const b1_i = n => bass1.head.findIndex(h => h.trim().startsWith(n))
const bass1Rows = bass1.rows.map(r => ({
  date: txt(r[b1_i('Date')]),
  gmt: txt(r[b1_i('GMT')]),
  testNum: txt(r[b1_i('As Run Test #')]),
  sample: txt(r[b1_i('Sample #')]),
  material: (txt(r[b1_i('Fuel Sample Material')]) ?? '').replace(/\s+/g, ' '),
}))

// ---------- ACME Flame Design (PSI-10) Normal ----------
const acmeN = await readCsv('PSI-10_Experimental table_Flame Design_Normal Flame.csv')
const an_i = n => acmeN.head.findIndex(h => h.trim().startsWith(n))
const acmeNRows = acmeN.rows.map(r => ({
  flameType: txt(r[an_i('Flame Type')]),
  fuel: txt(r[an_i('Fuel')]),
  o2Init: num(r[an_i('XO2 (init)')]),
  o2Final: num(r[an_i('XO2 (final)')]),
  pInitAtm: num(r[an_i('pinit (atm)')]),
  pFinalAtm: num(r[an_i('pfinal (atm)')]),
  pMeanAtm: num(r[an_i('pmean (atm)')]),
  tAdK: num(r[an_i('Tad (K)')]),
}))

// ---------- ACME Flame Design (PSI-10) Inverse ----------
const acmeI = await readCsv('PSI-10_Experimental table_Flame Design_Inverse Flame.csv')
const ai_i = n => acmeI.head.findIndex(h => h.trim().startsWith(n))
const acmeIRows = acmeI.rows.map(r => ({
  flameType: txt(r[ai_i('Flame Type')]),
  xO2: num(r[ai_i('XO2')]),
  pInitAtm: num(r[ai_i('pinit (atm)')]),
  pFinalAtm: num(r[ai_i('pfinal (atm)')]),
  pMeanAtm: num(r[ai_i('pmean (atm)')]),
  tAdK: num(r[ai_i('Tad (K)')]),
}))

// ---------- SAFFIRE-I (PSI-98) ----------
const saff1 = await readCsv('PSI-98_Experimental table_SAFFIRE-1.csv')
const s1_i = n => saff1.head.findIndex(h => h.trim().startsWith(n))
const saff1Rows = saff1.rows.map(r => ({
  sample: txt(r[s1_i('Sample Number')]),
  material: (txt(r[s1_i('Material')]) ?? '').replace(/\s+/g, ' '),
  thicknessCm: num(r[s1_i('Sample Thickness')]),
  airFlowCmS: num(r[s1_i('Air Flow')]),
  o2Pct: num(r[s1_i('Percent O2')]),
  burnTimeSec: num(r[s1_i('Burn Time')]),
}))

// ---------- SAFFIRE-II (PSI-99) ----------
const saff2 = await readCsv('PSI-99_Experimental table_SAFFIRE-2.csv')
const s2_i = n => saff2.head.findIndex(h => h.trim().startsWith(n))
const saff2Rows = saff2.rows.map(r => ({
  sample: txt(r[s2_i('Sample Number')]),
  material: (txt(r[s2_i('Material')]) ?? '').replace(/\s+/g, ' '),
  airFlowCmS: num(r[s2_i('Air Flow')]),
  o2Pct: num(r[s2_i('Percent O2')]),
  burnTimeSec: num(r[s2_i('Burn Time')]),
}))

// ---------- verificaciones ----------
const bad = flexRows.filter(r => r.o2 == null || r.pAtm == null || !r.end || !r.fuel)
const sumOk = flexRows.filter(r => r.o2 != null && r.n2 != null && r.co2 != null && r.he != null && Math.abs(r.o2 + r.n2 + r.co2 + r.he - 1) > 0.011)
console.log(`FLEX: ${flexRows.length} rows, ${bad.length} incomplete, ${sumOk.length} composition != 1`)
console.log(`BASS-II: ${bassRows.length} rows | BASS: ${bass1Rows.length} rows`)
console.log(`CFI-G Normal: ${cfigNRows.length} | CFI-G Inverse: ${cfigIRows.length} | CFI: ${cfiRows.length}`)
console.log(`SPICE: ${spiceRows.length} | SAME-R: ${samerRows.length}`)
console.log(`ACME Normal: ${acmeNRows.length} | ACME Inverse: ${acmeIRows.length}`)
console.log(`SAFFIRE-I: ${saff1Rows.length} | SAFFIRE-II: ${saff2Rows.length}`)

const out = {
  generatedAt: new Date().toISOString(),
  flex: {
    psiId: 'PSI-69', doi: '10.60555/mbq8-0451', license: 'CC0-1.0',
    file: 'PSI-69_Experimental table_FLEX.csv', sizeBytes: 24776,
    columnNotes: {
      o2: 'PSI header "O initial ambient composition" (subscript lost in export): oxygen mole fraction.',
      co2: 'PSI header "CO initial ambient composition" (subscript lost in export): treated as CO2.',
      rate: 'PSI header reads "Burning rate; mm" (unit truncated in export).',
      end: 'Outcome: Extinction, Completion or Disruption.',
    },
    rows: flexRows,
  },
  bass2: {
    psiId: 'PSI-25', doi: '10.60555/4qc4-de67', license: 'CC0-1.0',
    file: 'PSI-25_Experimental table_BASS-II.csv', sizeBytes: 16590,
    columnNotes: { air: 'Free text (e.g. "5", "5 down to ext"); units not stated.', o2: 'Calibrated O2 % by volume, initial and final.' },
    rows: bassRows,
  },
  cfigNormal: {
    psiId: 'PSI-159', doi: '10.60555/cyt1-kh64', license: 'CC0-1.0',
    file: 'PSI-159_Experimental table_CFI-G_Normal Flames.csv',
    note: 'Cool Flames Investigation with Gases — normal (co-flow). O2 up to 85%, critical for lunar habitat safety.',
    rows: cfigNRows,
  },
  cfigInverse: {
    psiId: 'PSI-159', doi: '10.60555/cyt1-kh64', license: 'CC0-1.0',
    file: 'PSI-159_Experimental table_CFI-G_Inverse Flames.csv',
    note: 'Cool Flames Investigation with Gases — inverse (counter-flow) configuration.',
    rows: cfigIRows,
  },
  cfi: {
    psiId: 'PSI-39', doi: '10.60555/m6pj-a914', license: 'CC0-1.0',
    file: 'PSI-39_Experimental table_CFI.csv',
    note: 'Cool Flames Investigation (liquid fuels). Cool flames burn at ~600K, invisible to standard detectors.',
    rows: cfiRows,
  },
  spice: {
    psiId: 'PSI-107', license: 'CC0-1.0',
    file: 'PSI-107_Experimental table_Spice.csv',
    note: 'Smoke Point In Co-flow Experiment. Smoke point critical for soot formation and fire detection.',
    rows: spiceRows,
  },
  samer: {
    psiId: 'PSI-101', license: 'CC0-1.0',
    file: 'PSI-101_Experimental table_SAME-R.csv',
    note: 'Smoke Aerosol Measurement Experiment Reflight. Smaller, less dense smoke particles in microgravity.',
    rows: samerRows,
  },
  bass: {
    psiId: 'PSI-26', doi: '10.60555/58h4-dy80', license: 'CC0-1.0',
    file: 'PSI-26_Experimental table_BASS.csv',
    note: 'Burning and Suppression of Solids. Precursor to BASS-II.',
    rows: bass1Rows,
  },
  acmeNormal: {
    psiId: 'PSI-10', license: 'CC0-1.0',
    file: 'PSI-10_Experimental table_Flame Design_Normal Flame.csv',
    note: 'ACME Flame Design — normal flame. Database for spacecraft fire computational models.',
    rows: acmeNRows,
  },
  acmeInverse: {
    psiId: 'PSI-10', license: 'CC0-1.0',
    file: 'PSI-10_Experimental table_Flame Design_Inverse Flame.csv',
    note: 'ACME Flame Design — inverse flame configuration.',
    rows: acmeIRows,
  },
  saffire1: {
    psiId: 'PSI-98', license: 'CC0-1.0',
    file: 'PSI-98_Experimental table_SAFFIRE-1.csv',
    note: 'Spacecraft Fire Experiment I. Largest fire intentionally set in space.',
    rows: saff1Rows,
  },
  saffire2: {
    psiId: 'PSI-99', license: 'CC0-1.0',
    file: 'PSI-99_Experimental table_SAFFIRE-2.csv',
    note: 'Spacecraft Fire Experiment II. 9 materials tested simultaneously.',
    rows: saff2Rows,
  },
}

await writeFile(OUT, JSON.stringify(out))
console.log(`\nOK data/lab.json — ${Object.keys(out).filter(k => k !== 'generatedAt').length} datasets`)
