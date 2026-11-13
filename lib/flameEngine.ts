/**
 * FireCompass flame engine: a small particle simulation drawn on a 2D canvas.
 *
 * WHAT IS DATA-DRIVEN
 *  - Gas composition (O2, N2, CO2, He mole fractions) sets how many molecules of each kind exist.
 *  - Total pressure sets the molecule density; diffusion slows as pressure rises (D ~ 1/p) and light
 *    molecules (He) move faster than heavy ones (kinetic theory, speed ~ 1/sqrt(mass)).
 *  - Gravity sets buoyancy: hot products rise only if g > 0, so with g = 0 they spread as a sphere.
 *  - The flame's fate (burns / goes out) is not invented: the caller derives it from the nearest
 *    measured FLEX tests and passes it in `fate`.
 *
 * WHAT IS ILLUSTRATION
 *  - Flame size, colors, reaction rates and the soot amount are qualitative.
 *  - Between 0 g and 1 g there is no experimental data; the shape is an interpolation.
 */

export type EnvId = 'earth' | 'iss' | 'moon' | 'suit' | 'none'
export type Fuel = 'methanol' | 'heptane'
export type Fate = 'burn' | 'extinguish' | 'unknown'

export interface SimParams {
  o2: number // mole fraction 0..1
  pressureAtm: number
  gravityG: number
  flowCmS: number
  co2: number // suppressant mole fraction
  he: number // suppressant mole fraction
  fuel: Fuel
  fate: Fate
}

export interface Layers {
  flame: boolean
  o2: boolean
  n2: boolean
  co2: boolean
  he: boolean
  fuel: boolean
  products: boolean
  soot: boolean
  flow: boolean
  labels: boolean
}

export interface LabelText {
  zone: string
  oxygenIn: string
  fuelVapor: string
  products: string
  plume: string
  sphere: string
  droplet: string
  down: string
}

export type FlameStatus = 'igniting' | 'burning' | 'extinguishing' | 'out'
export interface SimStats {
  counts: { o2: number; n2: number; co2: number; he: number; fuel: number; products: number; soot: number }
  rate: number // reactions per second
  intensity: number // 0..1.2
  status: FlameStatus
  regime: 'diffusion' | 'transition' | 'buoyant'
}

export const ALL_LAYERS: Layers = { flame: true, o2: true, n2: true, co2: true, he: true, fuel: true, products: true, soot: true, flow: true, labels: true }

const O2 = 0, N2 = 1, CO2 = 2, HE = 3, FUEL = 4, H2O = 5, SOOT = 6
const MASS = [32, 28, 44, 4, 32, 18, 220]
const CAP = 3600
const GCAP = 700
const TAU = Math.PI * 2

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rnd = () => Math.random()
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(TAU * rnd())

// CPK-like atom colors (chemistry convention)
const C_O = '#e34948'
const C_N = '#3987e5'
const C_C = '#9a988f'
const C_H = '#f0efec'
const C_HE = '#8ee8e0'
const C_FUEL = '#eda100'

function sprite(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`)
  gr.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`)
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`)
  x.fillStyle = gr
  x.fillRect(0, 0, 64, 64)
  return c
}

export class FlameEngine {
  w = 800
  h = 480
  cx = 400
  cy = 300
  t = 0

  params: SimParams = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0, co2: 0, he: 0, fuel: 'methanol', fate: 'unknown' }
  layers: Layers = { ...ALL_LAYERS }
  env: EnvId = 'none'
  labelText: LabelText = { zone: 'Reaction zone', oxygenIn: 'O₂ diffuses in', fuelVapor: 'Fuel vapor', products: 'Hot products', plume: 'Buoyant plume', sphere: 'No buoyancy: spherical flame', droplet: 'Fuel droplet', down: 'gravity' }

  // molecules
  n = 0
  x = new Float32Array(CAP)
  y = new Float32Array(CAP)
  life = new Float32Array(CAP) // <0 = ambient (never expires)
  rot = new Float32Array(CAP)
  type = new Uint8Array(CAP)
  prod = new Uint8Array(CAP) // 1 = created by the flame

  // glow (flame body)
  gn = 0
  gx = new Float32Array(GCAP)
  gy = new Float32Array(GCAP)
  gvx = new Float32Array(GCAP)
  gvy = new Float32Array(GCAP)
  gl = new Float32Array(GCAP)
  gm = new Float32Array(GCAP)
  gs = new Float32Array(GCAP)

  // flame state
  intensity = 0
  status: FlameStatus = 'igniting'
  burnClock = 0
  outClock = 0
  reactions = 0
  rate = 0
  private rateAcc = 0
  private rateT = 0

  private stars: { x: number; y: number; r: number; s: number }[] = []
  private sprites: HTMLCanvasElement[] = []

  constructor() {
    if (typeof document !== 'undefined') {
      for (let i = 0; i < 16; i++) {
        const k = i / 15
        // blue (microgravity) -> yellow-orange (buoyant, sooty)
        this.sprites.push(sprite(Math.round(70 + 185 * k), Math.round(140 + 50 * k), Math.round(255 - 185 * k)))
      }
    }
    for (let i = 0; i < 140; i++) this.stars.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.3, s: 0.2 + rnd() * 0.8 })
    this.resize(800, 480)
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.cx = w * 0.5
    this.cy = h * 0.64
    for (let i = 0; i < this.n; i++) {
      if (this.x[i] > w) this.x[i] = rnd() * w
      if (this.y[i] > h) this.y[i] = rnd() * h
    }
  }

  setParams(p: SimParams) {
    const fateChanged = p.fate !== this.params.fate
    this.params = p
    if (fateChanged) this.reignite()
  }
  setLayers(l: Layers) {
    this.layers = l
  }
  setEnv(e: EnvId) {
    this.env = e
  }

  reignite() {
    this.status = 'igniting'
    this.burnClock = 0
    this.outClock = 0
  }

  private spawn(type: number, x: number, y: number, life: number, prod = 0) {
    if (this.n >= CAP) return -1
    const i = this.n++
    this.x[i] = x
    this.y[i] = y
    this.type[i] = type
    this.life[i] = life
    this.prod[i] = prod
    this.rot[i] = rnd() * TAU
    return i
  }
  private kill(i: number) {
    const l = --this.n
    if (i !== l) {
      this.x[i] = this.x[l]; this.y[i] = this.y[l]; this.type[i] = this.type[l]
      this.life[i] = this.life[l]; this.prod[i] = this.prod[l]; this.rot[i] = this.rot[l]
    }
  }

  private fractions() {
    const { o2, co2, he } = this.params
    const a = clamp(o2, 0, 1)
    const c = clamp(co2, 0, 1 - a)
    const h = clamp(he, 0, 1 - a - c)
    return { o2: a, co2: c, he: h, n2: Math.max(0, 1 - a - c - h) }
  }

  private balanceAmbient() {
    const f = this.fractions()
    const area = clamp((this.w * this.h) / (800 * 480), 0.5, 1.7)
    const total = Math.round(Math.min(1000, 330 * clamp(this.params.pressureAtm, 0.1, 3.2)) * area)
    const target = [f.o2, f.n2, f.co2, f.he].map((fr) => (fr > 0 ? Math.max(fr * total, fr > 0.015 ? 2 : 0) : 0))
    const cur = [0, 0, 0, 0]
    for (let i = 0; i < this.n; i++) if (this.life[i] < 0 && this.type[i] <= HE) cur[this.type[i]]++
    const sumTarget = target[0] + target[1] + target[2] + target[3]
    const sumCur = cur[0] + cur[1] + cur[2] + cur[3]
    // initial fill is uniform; later replenishment enters through the chamber walls (so oxygen must travel to the flame)
    const uniform = sumCur < sumTarget * 0.5
    for (let t = 0; t < 4; t++) {
      const diff = Math.round(target[t]) - cur[t]
      if (diff > 0) {
        for (let k = 0; k < Math.min(10, diff); k++) {
          if (uniform) this.spawn(t, rnd() * this.w, rnd() * this.h, -1)
          else {
            const streaming = this.params.flowCmS > 0.5
            const side = streaming && rnd() < 0.7 ? 0 : Math.floor(rnd() * 4)
            const px = side === 0 ? 1 : side === 1 ? this.w - 1 : rnd() * this.w
            const py = side === 2 ? 1 : side === 3 ? this.h - 1 : rnd() * this.h
            this.spawn(t, px, py, -1)
          }
        }
      }
      else if (diff < 0) {
        let rem = Math.min(10, -diff)
        for (let i = this.n - 1; i >= 0 && rem > 0; i--) if (this.life[i] < 0 && this.type[i] === t) { this.kill(i); rem-- }
      }
    }
  }

  step(rawDt: number) {
    const dt = clamp(rawDt, 0, 0.05)
    if (dt === 0) return
    this.t += dt
    const P = this.params
    const f = this.fractions()
    const g = clamp(P.gravityG, 0, 1.2)
    const p = clamp(P.pressureAtm, 0.15, 3.2)
    const flowPx = P.flowCmS * 1.7
    const oxy = clamp(f.o2 / 0.21, 0, 3)
    const dil = clamp(1 - 1.2 * f.co2 - 0.6 * f.he, 0.15, 1) // qualitative dilution of the reaction

    // ---- flame state machine ----
    let target = dil * Math.min(1.2, 0.45 + 0.55 * Math.pow(oxy, 0.6))
    if (f.o2 < 0.04) target = 0
    if (this.status === 'igniting') {
      this.intensity = Math.min(target, this.intensity + dt * 1.2)
      if (this.intensity >= target - 0.01) { this.status = 'burning'; this.burnClock = 0 }
    } else if (this.status === 'burning') {
      this.burnClock += dt
      this.intensity += (target - this.intensity) * Math.min(1, dt * 3)
      if (P.fate === 'extinguish' && this.burnClock > 6.5) this.status = 'extinguishing'
    } else if (this.status === 'extinguishing') {
      this.intensity = Math.max(0, this.intensity - dt * 0.45)
      if (this.intensity < 0.02) { this.status = 'out'; this.outClock = 0; this.intensity = 0 }
    } else {
      this.outClock += dt
      if (this.outClock > 3.2) this.reignite()
    }
    const I = this.intensity

    const scale = this.w / 800
    const Rf = (24 + 62 * Math.min(1.7, Math.pow(Math.max(oxy, 0.05), 0.55))) * (0.5 + 0.5 * Math.min(1, I)) * scale
    const zx = this.cx
    const zy = this.cy - Rf * 0.4 * Math.min(1, g)

    this.balanceAmbient()

    // ---- fuel vapor from the droplet ----
    if (I > 0.03) {
      const nSpawn = I * dt * 60
      let k = Math.floor(nSpawn) + (rnd() < nSpawn % 1 ? 1 : 0)
      while (k-- > 0) {
        const a = rnd() * TAU
        const i = this.spawn(FUEL, this.cx + Math.cos(a) * 8, this.cy + Math.sin(a) * 8, 5)
        if (i >= 0) this.rot[i] = a // direction of Stefan flow stored in rot until it reacts
      }
    }

    const sootBase = P.fuel === 'heptane' ? 0.14 : 0.025
    const sootProb = sootBase * (1.8 - 0.8 * Math.min(1, g)) // reported hypothesis: more soot in microgravity

    // ---- molecules ----
    const D0 = 300 / p
    const fuelMass = P.fuel === 'heptane' ? 100 : 32
    for (let i = this.n - 1; i >= 0; i--) {
      const ty = this.type[i]
      let m = MASS[ty]
      if (ty === FUEL) m = fuelMass
      const sigma = Math.sqrt(2 * D0 * Math.sqrt(28 / m) * dt)
      let px = this.x[i]
      let py = this.y[i]

      // thermal / diffusive motion
      px += gauss() * sigma
      py += gauss() * sigma

      // forced airflow
      px += flowPx * dt

      // buoyant plume + entrainment (natural convection, only if g > 0)
      if (g > 0.001) {
        const dx = px - zx
        const wp = 36 + 0.16 * Math.max(0, zy - py)
        if (py < zy + 24) py -= g * 115 * Math.exp(-(dx * dx) / (wp * wp)) * dt
        if (py > zy - 40 && Math.abs(dx) < 280) px -= (dx / 280) * g * 46 * Math.exp(-Math.pow((py - zy) / 170, 2)) * dt
      }

      if (this.life[i] >= 0) {
        this.life[i] -= dt
        if (this.life[i] <= 0) {
          // aged products rejoin the surrounding gas: replace by an ambient molecule elsewhere
          this.kill(i)
          continue
        }
        if (ty === FUEL) {
          // Stefan flow: vapor leaves the droplet radially until it meets the oxygen in the reaction zone
          const a = this.rot[i]
          px += Math.cos(a) * 34 * dt
          py += Math.sin(a) * 34 * dt
          const d = Math.hypot(px - zx, py - zy)
          if (d >= Rf * 0.92 || this.life[i] < 0.4) {
            // reaction: fuel vapor + O2 -> products (and a little soot)
            if (rnd() < sootProb) { this.type[i] = SOOT; this.life[i] = 11; this.prod[i] = 1 }
            else { this.type[i] = rnd() < 0.5 ? H2O : CO2; this.life[i] = 9; this.prod[i] = 1 }
            this.reactions++
            this.rateAcc++
          }
        } else if (this.prod[i]) {
          // hot products: buoyant lift (zero in microgravity) and outward expansion from the flame
          py -= g * 70 * dt
          const dx = px - zx, dy = py - zy
          const d = Math.hypot(dx, dy) + 0.001
          if (d < Rf * 2.2) { px += (dx / d) * 14 * dt; py += (dy / d) * 14 * dt }
        }
      } else if (ty === O2 && I > 0.03) {
        // oxygen reaching the reaction zone is consumed
        const d = Math.hypot(px - zx, py - zy)
        if (d > Rf * 0.55 && d < Rf * 1.18 && rnd() < 2.4 * I * dt) {
          this.type[i] = rnd() < 0.5 ? H2O : CO2
          this.life[i] = 9
          this.prod[i] = 1
          this.reactions++
          this.rateAcc++
        } else if (d < Rf * 2.6 && d > Rf * 1.1) {
          // concentration gradient: oxygen drifts toward the zone that is consuming it (diffusion-controlled supply)
          const pull = 16 * I * dt
          px += ((zx - px) / (d + 0.001)) * pull
          py += ((zy - py) / (d + 0.001)) * pull
        }
      }

      // ventilated chamber: gas that leaves is lost, fresh gas enters through the walls (see balanceAmbient)
      if (px < -2 || px > this.w + 2 || py < -2 || py > this.h + 2) {
        this.kill(i)
        continue
      }
      this.x[i] = px
      this.y[i] = py
      this.rot[i] += dt * 3
    }

    // ---- flame glow particles ----
    const gCount = I * dt * 150
    let gs = Math.floor(gCount) + (rnd() < gCount % 1 ? 1 : 0)
    while (gs-- > 0 && this.gn < GCAP) {
      const j = this.gn++
      const a = rnd() * TAU
      const r = Rf * Math.sqrt(rnd()) * (0.5 + 0.4 * (1 - Math.min(1, g)))
      this.gx[j] = zx + Math.cos(a) * r
      this.gy[j] = zy + Math.sin(a) * r * (1 - 0.25 * Math.min(1, g)) + Rf * 0.25 * Math.min(1, g)
      this.gvx[j] = Math.cos(a) * 5 * (1 - Math.min(1, g))
      this.gvy[j] = Math.sin(a) * 5 * (1 - Math.min(1, g)) - g * (60 + 110 * rnd())
      this.gl[j] = this.gm[j] = 0.55 + rnd() * 0.45
      this.gs[j] = (15 + rnd() * 17) * Math.pow(Math.max(Rf / (60 * scale), 0.3), 0.7)
    }
    for (let j = this.gn - 1; j >= 0; j--) {
      this.gl[j] -= dt
      if (this.gl[j] <= 0) {
        const l = --this.gn
        if (j !== l) {
          this.gx[j] = this.gx[l]; this.gy[j] = this.gy[l]; this.gvx[j] = this.gvx[l]; this.gvy[j] = this.gvy[l]
          this.gl[j] = this.gl[l]; this.gm[j] = this.gm[l]; this.gs[j] = this.gs[l]
        }
        continue
      }
      const sway = Math.sin(this.t * 9 + j) * g * 18
      this.gx[j] += (this.gvx[j] + sway - (this.gx[j] - zx) * g * 1.5 + flowPx * 0.7) * dt
      this.gy[j] += this.gvy[j] * dt
    }

    // reaction-rate meter
    this.rateT += dt
    if (this.rateT >= 0.5) {
      this.rate = this.rateAcc / this.rateT
      this.rateAcc = 0
      this.rateT = 0
    }
  }

  stats(): SimStats {
    const c = { o2: 0, n2: 0, co2: 0, he: 0, fuel: 0, products: 0, soot: 0 }
    for (let i = 0; i < this.n; i++) {
      const t = this.type[i]
      if (t === O2) c.o2++
      else if (t === N2) c.n2++
      else if (t === CO2) { if (this.prod[i]) c.products++; else c.co2++ }
      else if (t === HE) c.he++
      else if (t === FUEL) c.fuel++
      else if (t === H2O) c.products++
      else if (t === SOOT) c.soot++
    }
    const g = this.params.gravityG
    return { counts: c, rate: this.rate, intensity: this.intensity, status: this.status, regime: g < 0.03 ? 'diffusion' : g > 0.5 ? 'buoyant' : 'transition' }
  }

  warmup(seconds = 3) {
    for (let k = 0; k < seconds * 60; k++) this.step(1 / 60)
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx: CanvasRenderingContext2D) {
    const { w, h } = this
    this.drawBackdrop(ctx)
    const L = this.layers
    const P = this.params
    const g = clamp(P.gravityG, 0, 1)

    if (L.flow) this.drawFlow(ctx)

    // molecules, batched by species
    ctx.lineCap = 'round'
    this.drawSpecies(ctx, N2, L.n2, false)
    this.drawSpecies(ctx, O2, L.o2, false)
    this.drawSpecies(ctx, CO2, L.co2, false)
    this.drawSpecies(ctx, HE, L.he, false)
    this.drawSpecies(ctx, FUEL, L.fuel, false)
    this.drawSpecies(ctx, H2O, L.products, true)
    this.drawSpecies(ctx, CO2, L.products, true)
    this.drawSpecies(ctx, SOOT, L.soot, true)

    // droplet and fiber
    ctx.strokeStyle = 'rgba(200,198,190,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(this.cx - 40, this.cy + 22)
    ctx.lineTo(this.cx + 40, this.cy - 22)
    ctx.stroke()
    const dg = ctx.createRadialGradient(this.cx - 2, this.cy - 2, 1, this.cx, this.cy, 9)
    dg.addColorStop(0, '#fff6d6')
    dg.addColorStop(1, P.fuel === 'heptane' ? '#d9a400' : '#cfd8e8')
    ctx.fillStyle = dg
    ctx.beginPath()
    ctx.arc(this.cx, this.cy, 8 * (w / 800 > 0.6 ? 1 : 0.8), 0, TAU)
    ctx.fill()

    // flame glow (additive)
    if (L.flame && this.gn > 0) {
      ctx.globalCompositeOperation = 'lighter'
      const col = Math.round(clamp(g / 0.65, 0, 1) * 15)
      const sp = this.sprites[col]
      for (let j = 0; j < this.gn; j++) {
        const k = this.gl[j] / this.gm[j]
        const s = this.gs[j] * (0.5 + 0.9 * k)
        ctx.globalAlpha = clamp(k * 0.27 * Math.min(1.1, 0.4 + this.intensity), 0, 0.5)
        ctx.drawImage(sp, this.gx[j] - s, this.gy[j] - s, s * 2, s * 2)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    }

    if (L.labels) this.drawLabels(ctx)
    void h
  }

  private drawSpecies(ctx: CanvasRenderingContext2D, ty: number, show: boolean, product: boolean) {
    if (!show) return
    const n = this.n
    if (!n) return
    const r = 3
    const fuelHeptane = this.params.fuel === 'heptane'
    // ambient gas vs. molecules created by the flame (fuel vapor and soot are always flame-side)
    const match = (i: number) => this.type[i] === ty && (ty === FUEL || ty === SOOT || (this.prod[i] === 1) === product)
    ctx.beginPath()
    // pass 1: bonds
    ctx.strokeStyle = 'rgba(230,228,220,0.35)'
    ctx.lineWidth = 1.4
    for (let i = 0; i < n; i++) {
      if (!match(i)) continue
      if (ty === HE) continue
      const x = this.x[i], y = this.y[i], a = this.rot[i]
      if (ty === O2 || ty === N2) { ctx.moveTo(x - Math.cos(a) * 2.7, y - Math.sin(a) * 2.7); ctx.lineTo(x + Math.cos(a) * 2.7, y + Math.sin(a) * 2.7) }
      else if (ty === CO2) { ctx.moveTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6); ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6) }
      else if (ty === H2O) { ctx.moveTo(x + Math.cos(a - 0.9) * 5, y + Math.sin(a - 0.9) * 5); ctx.lineTo(x, y); ctx.lineTo(x + Math.cos(a + 0.9) * 5, y + Math.sin(a + 0.9) * 5) }
      else if (ty === FUEL) { ctx.moveTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5) }
    }
    ctx.stroke()

    const fill = (color: string, offs: (i: number) => [number, number][], rad: number) => {
      ctx.fillStyle = color
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        if (!match(i)) continue
        for (const [ox, oy] of offs(i)) {
          ctx.moveTo(this.x[i] + ox + rad, this.y[i] + oy)
          ctx.arc(this.x[i] + ox, this.y[i] + oy, rad, 0, TAU)
        }
      }
      ctx.fill()
    }
    const c = (i: number) => Math.cos(this.rot[i])
    const s = (i: number) => Math.sin(this.rot[i])
    if (ty === O2) fill(C_O, (i) => [[-c(i) * 2.7, -s(i) * 2.7], [c(i) * 2.7, s(i) * 2.7]], r)
    else if (ty === N2) fill(C_N, (i) => [[-c(i) * 2.7, -s(i) * 2.7], [c(i) * 2.7, s(i) * 2.7]], r)
    else if (ty === HE) fill(C_HE, () => [[0, 0]], 2.4)
    else if (ty === CO2) {
      fill(C_O, (i) => [[-c(i) * 6, -s(i) * 6], [c(i) * 6, s(i) * 6]], 2.8)
      fill(C_C, () => [[0, 0]], 3.2)
    } else if (ty === H2O) {
      const a0 = (i: number) => this.rot[i]
      fill(C_H, (i) => [[Math.cos(a0(i) - 0.9) * 5, Math.sin(a0(i) - 0.9) * 5], [Math.cos(a0(i) + 0.9) * 5, Math.sin(a0(i) + 0.9) * 5]], 2)
      fill(C_O, () => [[0, 0]], 3.4)
    } else if (ty === FUEL) {
      fill(C_FUEL, (i) => (fuelHeptane ? [[-c(i) * 5, -s(i) * 5], [0, 0], [c(i) * 5, s(i) * 5]] : [[-c(i) * 4, -s(i) * 4], [c(i) * 4, s(i) * 4]]), fuelHeptane ? 2.6 : 3)
    } else if (ty === SOOT) {
      ctx.fillStyle = 'rgba(90,88,84,0.95)'
      ctx.strokeStyle = 'rgba(210,208,200,0.35)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        if (this.type[i] !== SOOT) continue
        ctx.moveTo(this.x[i] + 3.6, this.y[i])
        ctx.arc(this.x[i], this.y[i], 3.6, 0, TAU)
      }
      ctx.fill()
      ctx.stroke()
    }
  }

  private drawFlow(ctx: CanvasRenderingContext2D) {
    const P = this.params
    const g = clamp(P.gravityG, 0, 1)
    const flowPx = P.flowCmS * 1.7
    ctx.strokeStyle = 'rgba(138,200,255,0.45)'
    ctx.fillStyle = 'rgba(138,200,255,0.5)'
    ctx.lineWidth = 1.4
    if (flowPx > 1) {
      const spacing = 120
      const off = (this.t * flowPx) % spacing
      for (let row = 0; row < 5; row++) {
        const y = this.h * (0.14 + row * 0.18)
        for (let x = -spacing + off; x < this.w; x += spacing) this.arrow(ctx, x, y, x + Math.min(46, 8 + flowPx * 0.45), y)
      }
    }
    if (g > 0.02) {
      const len = 22 + 46 * g
      for (let k = -1; k <= 1; k++) {
        const x = this.cx + k * 26
        const ph = (this.t * (0.6 + g)) % 1
        const y0 = this.cy - 40 - ph * 90
        ctx.globalAlpha = 1 - ph
        this.arrow(ctx, x, y0, x, y0 - len * 0.55)
        ctx.globalAlpha = 1
      }
    }
  }

  private arrow(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    const a = Math.atan2(y1 - y0, x1 - x0)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x1 - Math.cos(a - 0.45) * 7, y1 - Math.sin(a - 0.45) * 7)
    ctx.lineTo(x1 - Math.cos(a + 0.45) * 7, y1 - Math.sin(a + 0.45) * 7)
    ctx.closePath()
    ctx.fill()
  }

  private drawLabels(ctx: CanvasRenderingContext2D) {
    const T = this.labelText
    const g = clamp(this.params.gravityG, 0, 1)
    const burning = this.intensity > 0.15
    const scale = clamp(this.w / 800, 0.7, 1.4)
    const fs = Math.round(12 * Math.min(1.1, scale + 0.15))
    ctx.font = `600 ${fs}px system-ui, sans-serif`
    const tag = (txt: string, x: number, y: number, tx: number, ty: number, color = 'rgba(236,234,228,0.95)') => {
      ctx.strokeStyle = 'rgba(236,234,228,0.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      const wTxt = ctx.measureText(txt).width
      const bx = tx > x ? tx : tx - wTxt - 12
      ctx.fillStyle = 'rgba(9,11,15,0.72)'
      ctx.fillRect(bx, ty - fs, wTxt + 12, fs + 8)
      ctx.fillStyle = color
      ctx.fillText(txt, bx + 6, ty)
    }
    const Rf = (24 + 62 * Math.min(1.7, Math.pow(Math.max(this.params.o2 / 0.21, 0.05), 0.55))) * (0.5 + 0.5 * Math.min(1, this.intensity)) * (this.w / 800)
    const zy = this.cy - Rf * 0.4 * g
    // each callout has its own corner so they never overlap: droplet bottom-left, fuel vapor bottom-right,
    // oxygen left, zone upper-right, products right, plume / sphere top
    const S = scale
    tag(T.droplet, this.cx - 6, this.cy + 6, this.cx - 130 * S - 70, this.cy + 86 * S)
    if (burning) {
      tag(T.fuelVapor, this.cx + 8, this.cy + 6, this.cx + 70 * S, this.cy + 96 * S, '#ffd36b')
      tag(T.oxygenIn, this.cx - Rf * 1.05, zy + Rf * 0.1, this.cx - Rf * 1.25 - 120 * S, zy - Rf * 0.55, '#ff9d9c')
      tag(T.zone, this.cx + Rf * 0.7, zy - Rf * 0.3, this.cx + Rf * 1.1 + 36 * S, zy - Rf * 0.55, '#ffb98a')
      tag(T.products, this.cx + Rf * 0.8, zy + Rf * 0.6, this.cx + Rf * 1.2 + 30 * S, zy + Rf * 0.85, '#e9e7e0')
      if (g > 0.3) tag(T.plume, this.cx, zy - Rf * 1.5, this.cx + 40 * S, zy - Rf * 1.5 - 64 * S, '#8ac8ff')
      else if (g < 0.03) tag(T.sphere, this.cx - Rf * 0.5, zy - Rf * 0.8, this.cx - Rf * 0.5 - 170 * S, zy - Rf - 28 * S, '#8ac8ff')
    }
    // gravity cue
    ctx.fillStyle = 'rgba(236,234,228,0.85)'
    ctx.font = `600 ${fs - 1}px system-ui, sans-serif`
    const gx = 26, gy = this.h - 26
    if (g > 0.02) {
      ctx.strokeStyle = 'rgba(236,234,228,0.85)'
      ctx.lineWidth = 2
      const len = 14 + 26 * g
      ctx.beginPath(); ctx.moveTo(gx, gy - len); ctx.lineTo(gx, gy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(gx, gy + 3); ctx.lineTo(gx - 5, gy - 6); ctx.lineTo(gx + 5, gy - 6); ctx.closePath(); ctx.fill()
      ctx.fillText(`g = ${this.params.gravityG.toFixed(2)}`, gx + 12, gy - 4)
    } else ctx.fillText('g ≈ 0', gx, gy - 4)
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D) {
    const { w, h } = this
    const e = this.env
    ctx.clearRect(0, 0, w, h)
    const grad = (c0: string, c1: string) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, c0)
      g.addColorStop(1, c1)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }
    const drawStars = (drift: number) => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (const s of this.stars) {
        const x = (((s.x * w - this.t * drift * s.s) % w) + w) % w
        ctx.globalAlpha = 0.35 + 0.5 * s.s
        ctx.beginPath()
        ctx.arc(x, s.y * h * 0.8, s.r, 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (e === 'earth') {
      grad('#16324f', '#0d1a29')
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      for (let i = 0; i < 3; i++) {
        const x = ((this.t * (6 + i * 3) + i * 300) % (w + 200)) - 100
        ctx.beginPath(); ctx.ellipse(x, h * (0.16 + i * 0.1), 70, 16, 0, 0, TAU); ctx.fill()
      }
      ctx.fillStyle = '#15202c'
      ctx.fillRect(0, h * 0.9, w, h * 0.1)
      ctx.fillStyle = 'rgba(138,200,255,0.15)'
      ctx.fillRect(0, h * 0.9, w, 1.5)
    } else if (e === 'iss') {
      grad('#04060b', '#070b14')
      drawStars(10)
      const eg = ctx.createRadialGradient(w * 0.5, h * 1.9, h * 1.1, w * 0.5, h * 1.9, h * 1.25)
      eg.addColorStop(0, 'rgba(40,110,200,0.0)')
      eg.addColorStop(0.9, 'rgba(70,150,255,0.35)')
      eg.addColorStop(1, 'rgba(120,190,255,0.0)')
      ctx.fillStyle = eg
      ctx.fillRect(0, h * 0.55, w, h * 0.45)
    } else if (e === 'moon') {
      grad('#020306', '#05070b')
      drawStars(0)
      const ed = ctx.createRadialGradient(w * 0.82, h * 0.2, 2, w * 0.82, h * 0.2, 26)
      ed.addColorStop(0, '#9fd0ff'); ed.addColorStop(0.7, '#3d7fd0'); ed.addColorStop(1, '#1b3d6b')
      ctx.fillStyle = ed
      ctx.beginPath(); ctx.arc(w * 0.82, h * 0.2, 20, 0, TAU); ctx.fill()
      ctx.fillStyle = '#3a3a38'
      ctx.beginPath(); ctx.moveTo(0, h * 0.86); ctx.quadraticCurveTo(w * 0.3, h * 0.82, w * 0.55, h * 0.87); ctx.quadraticCurveTo(w * 0.8, h * 0.9, w, h * 0.85); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      for (const [x, y, rx] of [[0.2, 0.93, 38], [0.55, 0.95, 52], [0.78, 0.92, 30]] as const) { ctx.beginPath(); ctx.ellipse(w * x, h * y, rx, 8, 0, 0, TAU); ctx.fill() }
    } else if (e === 'suit') {
      grad('#080a0f', '#0a0d13')
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(138,200,255,0.14)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.46, 0, TAU); ctx.stroke()
      ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.42, 0, TAU); ctx.stroke()
    } else {
      ctx.fillStyle = '#0d1017'
      ctx.fillRect(0, 0, w, h)
    }
  }
}
