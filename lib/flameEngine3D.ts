/**
 * JaPax 3D flame engine: physics only (no drawing, no three.js), so it can be tested in Node.
 *
 * World units ~ centimetres. The combustion chamber is a box: x in [-4, 4], y in [-2.6, 3.4] (up is +y),
 * z in [-3, 3]. The fuel droplet sits at the origin.
 *
 * DATA-DRIVEN: molecule counts follow the gas composition; density follows pressure; diffusion slows as
 * pressure rises (D ~ 1/p) and light molecules move faster (speed ~ 1/sqrt(mass)); hot products rise only if
 * g > 0; the fate of the flame comes from the nearest measured FLEX tests (passed in as `fate`).
 * ILLUSTRATIVE: flame size and speed, reaction rates and soot amount are qualitative.
 */
import type { Fate, Fuel, FlameStatus, Layers, SimParams, SimStats } from './flameEngine'

export type Env3 = 'earth' | 'iss' | 'moon' | 'suit' | 'none'
export interface Params3 extends SimParams {
  /** unit vector the forced air travels along (default +x) */
  wind?: [number, number, number]
}
export type { Fate, Fuel, FlameStatus, Layers, SimStats }

export const BOX = { x: 4, yMin: -2.6, yMax: 3.4, z: 3 }

export const T3 = { O2: 0, N2: 1, CO2: 2, HE: 3, FUEL: 4, H2O: 5, SOOT: 6 } as const
const { O2, N2, CO2, HE, FUEL, H2O, SOOT } = T3
const MASS = [32, 28, 44, 4, 32, 18, 220]
const CAP = 5200

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rnd = () => Math.random()
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())

export class FlameEngine3D {
  params: Params3 = { o2: 0.21, pressureAtm: 1, gravityG: 0, flowCmS: 0, co2: 0, he: 0, fuel: 'methanol', fate: 'unknown' }
  /** optional live override (e.g. "air from the cursor") */
  windOverride: { dir: [number, number, number]; cmS: number } | null = null

  t = 0
  n = 0
  x = new Float32Array(CAP)
  y = new Float32Array(CAP)
  z = new Float32Array(CAP)
  ax = new Float32Array(CAP) // bond axis (unit vector), also Stefan-flow direction for fuel vapor
  ay = new Float32Array(CAP)
  az = new Float32Array(CAP)
  life = new Float32Array(CAP) // <0 = ambient gas
  type = new Uint8Array(CAP)
  prod = new Uint8Array(CAP)

  intensity = 0
  status: FlameStatus = 'igniting'
  burnClock = 0
  outClock = 0
  rf = 0.6 // current flame radius
  zoneY = 0 // height of the reaction zone centre
  reactions = 0
  rate = 0
  private rateAcc = 0
  private rateT = 0

  setParams(p: Params3) {
    const fateChanged = p.fate !== this.params.fate
    this.params = p
    if (fateChanged) this.reignite()
  }

  reignite() {
    this.status = 'igniting'
    this.burnClock = 0
    this.outClock = 0
  }

  private wind(): { d: [number, number, number]; px: number } {
    const o = this.windOverride
    if (o) return { d: o.dir, px: o.cmS * 0.017 }
    return { d: this.params.wind ?? [1, 0, 0], px: this.params.flowCmS * 0.017 }
  }

  private spawn(type: number, x: number, y: number, z: number, life: number, prod = 0) {
    if (this.n >= CAP) return -1
    const i = this.n++
    this.x[i] = x; this.y[i] = y; this.z[i] = z
    this.type[i] = type
    this.life[i] = life
    this.prod[i] = prod
    let a = gauss(), b = gauss(), c = gauss()
    const l = Math.hypot(a, b, c) || 1
    a /= l; b /= l; c /= l
    this.ax[i] = a; this.ay[i] = b; this.az[i] = c
    return i
  }

  private kill(i: number) {
    const l = --this.n
    if (i !== l) {
      this.x[i] = this.x[l]; this.y[i] = this.y[l]; this.z[i] = this.z[l]
      this.ax[i] = this.ax[l]; this.ay[i] = this.ay[l]; this.az[i] = this.az[l]
      this.type[i] = this.type[l]; this.life[i] = this.life[l]; this.prod[i] = this.prod[l]
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
    const total = Math.round(Math.min(1200, 440 * clamp(this.params.pressureAtm, 0.1, 3.2)))
    const target = [f.o2, f.n2, f.co2, f.he].map((fr) => (fr > 0 ? Math.max(fr * total, fr > 0.015 ? 2 : 0) : 0))
    const cur = [0, 0, 0, 0]
    for (let i = 0; i < this.n; i++) if (this.life[i] < 0 && this.type[i] <= HE) cur[this.type[i]]++
    const sumTarget = target[0] + target[1] + target[2] + target[3]
    const sumCur = cur[0] + cur[1] + cur[2] + cur[3]
    // initial fill is uniform; replenishment enters through the chamber walls (so oxygen must travel to the flame)
    const uniform = sumCur < sumTarget * 0.5
    const w = this.wind()
    for (let t = 0; t < 4; t++) {
      const diff = Math.round(target[t]) - cur[t]
      if (diff > 0) {
        for (let k = 0; k < Math.min(14, diff); k++) {
          if (uniform) {
            this.spawn(t, (rnd() * 2 - 1) * BOX.x, BOX.yMin + rnd() * (BOX.yMax - BOX.yMin), (rnd() * 2 - 1) * BOX.z, -1)
          } else {
            const x = (rnd() * 2 - 1) * BOX.x
            const y = BOX.yMin + rnd() * (BOX.yMax - BOX.yMin)
            const z = (rnd() * 2 - 1) * BOX.z
            const streaming = this.params.flowCmS > 0.5 || this.windOverride !== null
            // fresh gas arrives from the upwind wall when there is forced flow, otherwise from any wall
            const face = streaming && rnd() < 0.7 ? -1 : Math.floor(rnd() * 6)
            if (face === -1) {
              const [dx, dy, dz] = w.d
              // project the random point onto the upwind side of the box
              const sx = -Math.sign(dx || 0.0001) * (BOX.x - 0.01)
              const sy = -Math.sign(dy || 0.0001) * 3
              const sz = -Math.sign(dz || 0.0001) * (BOX.z - 0.01)
              const ax = Math.abs(dx), ay = Math.abs(dy), az = Math.abs(dz)
              if (ax >= ay && ax >= az) this.spawn(t, sx, y, z, -1)
              else if (ay >= az) this.spawn(t, x, clamp(sy, BOX.yMin + 0.01, BOX.yMax - 0.01), z, -1)
              else this.spawn(t, x, y, sz, -1)
            } else if (face === 0) this.spawn(t, -BOX.x + 0.01, y, z, -1)
            else if (face === 1) this.spawn(t, BOX.x - 0.01, y, z, -1)
            else if (face === 2) this.spawn(t, x, BOX.yMax - 0.01, z, -1)
            else if (face === 3) this.spawn(t, x, BOX.yMin + 0.01, z, -1)
            else if (face === 4) this.spawn(t, x, y, -BOX.z + 0.01, -1)
            else this.spawn(t, x, y, BOX.z - 0.01, -1)
          }
        }
      } else if (diff < 0) {
        let rem = Math.min(14, -diff)
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
    const w = this.wind()
    const oxy = clamp(f.o2 / 0.21, 0, 4.8)
    const dil = clamp(1 - 1.2 * f.co2 - 0.6 * f.he, 0.15, 1) // qualitative dilution of the reaction

    // ---- flame state machine (identical to the 2D engine) ----
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

    const Rf = 1.25 * (0.24 + 0.62 * Math.min(1.7, Math.pow(Math.max(oxy, 0.05), 0.55))) * (0.5 + 0.5 * Math.min(1, I))
    const zy = Rf * 0.4 * Math.min(1, g)
    this.rf = Rf
    this.zoneY = zy

    this.balanceAmbient()

    // ---- fuel vapor leaves the droplet ----
    if (I > 0.03) {
      const nSpawn = I * dt * 70
      let k = Math.floor(nSpawn) + (rnd() < nSpawn % 1 ? 1 : 0)
      while (k-- > 0) {
        const i = this.spawn(FUEL, 0, 0, 0, 5)
        if (i >= 0) {
          this.x[i] = this.ax[i] * 0.09
          this.y[i] = this.ay[i] * 0.09
          this.z[i] = this.az[i] * 0.09
        }
      }
    }

    const sootBase = P.fuel === 'heptane' ? 0.14 : 0.025
    const sootProb = sootBase * (1.8 - 0.8 * Math.min(1, g)) // reported hypothesis: more soot in microgravity

    // ---- molecules ----
    const D0 = 0.03 / p // diffusion in units^2/s, slower at higher pressure
    const fuelMass = P.fuel === 'heptane' ? 100 : 32
    for (let i = this.n - 1; i >= 0; i--) {
      const ty = this.type[i]
      const m = ty === FUEL ? fuelMass : MASS[ty]
      const sigma = Math.sqrt(2 * D0 * Math.sqrt(28 / m) * dt)
      let px = this.x[i] + gauss() * sigma
      let py = this.y[i] + gauss() * sigma
      let pz = this.z[i] + gauss() * sigma

      // forced airflow
      px += w.d[0] * w.px * dt
      py += w.d[1] * w.px * dt
      pz += w.d[2] * w.px * dt

      // buoyant plume + entrainment (natural convection, only if g > 0)
      if (g > 0.001) {
        const dx = px, dz = pz
        const rho2 = dx * dx + dz * dz
        const wp = 0.36 + 0.16 * Math.max(0, py - zy)
        if (py > zy - 0.24) py += g * 1.15 * Math.exp(-rho2 / (wp * wp)) * dt
        if (py < zy + 0.4) {
          const rho = Math.sqrt(rho2)
          if (rho < 2.8) {
            const pull = (g * 0.46 * Math.exp(-Math.pow((py - zy) / 1.7, 2)) * dt) / 2.8
            px -= dx * pull
            pz -= dz * pull
          }
        }
      }

      if (this.life[i] >= 0) {
        this.life[i] -= dt
        if (this.life[i] <= 0) { this.kill(i); continue }
        if (ty === FUEL) {
          // Stefan flow: vapor leaves the droplet radially until it meets the oxygen at the reaction zone
          px += this.ax[i] * 0.34 * dt
          py += this.ay[i] * 0.34 * dt
          pz += this.az[i] * 0.34 * dt
          const d = Math.hypot(px, py - zy, pz)
          if (d >= Rf * 0.92 || this.life[i] < 0.4) {
            if (rnd() < sootProb) { this.type[i] = SOOT; this.life[i] = 11; this.prod[i] = 1 }
            else { this.type[i] = rnd() < 0.5 ? H2O : CO2; this.life[i] = 9; this.prod[i] = 1 }
            this.reactions++
            this.rateAcc++
          }
        } else if (this.prod[i]) {
          // hot products: buoyant lift (zero in microgravity) and expansion away from the flame
          py += g * 0.7 * dt
          const dx = px, dy = py - zy, dz = pz
          const d = Math.hypot(dx, dy, dz) + 0.001
          if (d < Rf * 2.2) { px += (dx / d) * 0.14 * dt; py += (dy / d) * 0.14 * dt; pz += (dz / d) * 0.14 * dt }
        }
      } else if (ty === O2 && I > 0.03) {
        // oxygen reaching the reaction zone is consumed
        const dx = px, dy = py - zy, dz = pz
        const d = Math.hypot(dx, dy, dz)
        if (d > Rf * 0.55 && d < Rf * 1.18 && rnd() < 2.4 * I * dt) {
          this.type[i] = rnd() < 0.5 ? H2O : CO2
          this.life[i] = 9
          this.prod[i] = 1
          this.reactions++
          this.rateAcc++
        } else if (d < Rf * 2.6 && d > Rf * 1.1) {
          const pull = (0.16 * I * dt) / (d + 0.001)
          px -= dx * pull; py -= dy * pull; pz -= dz * pull // oxygen drifts toward the zone that is consuming it
        }
      }

      // tumbling: slow random walk of the bond axis (not for fuel vapor, whose axis is its direction of travel)
      if (ty !== FUEL) {
        let a = this.ax[i] + gauss() * 0.9 * dt
        let b = this.ay[i] + gauss() * 0.9 * dt
        let c = this.az[i] + gauss() * 0.9 * dt
        const l = Math.hypot(a, b, c) || 1
        this.ax[i] = a / l; this.ay[i] = b / l; this.az[i] = c / l
      }

      // ventilated chamber: gas that leaves is lost, fresh gas enters through the walls
      if (px < -BOX.x - 0.02 || px > BOX.x + 0.02 || py < BOX.yMin - 0.02 || py > BOX.yMax + 0.02 || pz < -BOX.z - 0.02 || pz > BOX.z + 0.02) {
        this.kill(i)
        continue
      }
      this.x[i] = px; this.y[i] = py; this.z[i] = pz
    }

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
}
