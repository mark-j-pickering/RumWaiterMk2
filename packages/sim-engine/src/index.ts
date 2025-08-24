export type TripState = 'none' | 'soft' | 'hard' | 'door' | 'limit'

export interface PlantParams {
  massKg: number
  drumRadiusM: number
  travelM: number
  targetSpeedMS: number
  softTripA: number
  hardTripA: number
  supplyV: number
  Ra: number
  Kt: number
  Ke: number
  nonBackdrivable?: boolean
  limitTopM: number
  limitBottomM: number
  limitHystM: number
}

export const defaultParams: PlantParams = {
  massKg: 50,
  drumRadiusM: 0.05,
  travelM: 2.0,
  targetSpeedMS: 0.2,
  softTripA: 22,
  hardTripA: 28,
  supplyV: 12,
  Ra: 0.4,
  Kt: 0.08,
  Ke: 0.08,
  nonBackdrivable: true,
  limitTopM: 1.995,
  limitBottomM: 0.005,
  limitHystM: 0.002,
}

export interface PlantState {
  t: number
  posM: number
  velMS: number
  accelMS2: number
  currentA: number
  duty: number
  dir: -1 | 0 | 1
  trip: TripState
  limitTop: boolean
  limitBottom: boolean
}

export class SimEngine {
  params: PlantParams
  state: PlantState
  private cmd: 'stop' | 'up' | 'down' = 'stop'
  private doorOpen = false
  private overloadUntilMs = 0
  private overloadFactor = 2.5
  private forceLimitTop: boolean | null = null
  private forceLimitBottom: boolean | null = null

  constructor(p: PlantParams) {
    this.params = p
    this.state = {
      t: 0, posM: 0, velMS: 0, accelMS2: 0,
      currentA: 0, duty: 0, dir: 0, trip: 'none',
      limitTop: false, limitBottom: false
    }
  }

  command(c: 'stop' | 'up' | 'down') { this.cmd = c }

  setDoorOpen(open: boolean) {
    this.doorOpen = open
    if (!open && this.state.trip === 'door') this.state.trip = 'none'
  }

  setOverloadActive(active: boolean, factor: number = 2.5) {
    this.overloadUntilMs = active ? Number.POSITIVE_INFINITY : 0
    this.overloadFactor = Math.max(1, factor)
  }
  pulseOverload(ms: number = 2000, factor: number = 2.5) {
    this.overloadUntilMs = Math.max(this.state.t + Math.max(0, ms), this.overloadUntilMs)
    this.overloadFactor = Math.max(1, factor)
  }

  setLimitOverride(opts: { top?: boolean|null; bottom?: boolean|null }) {
    if (opts.top !== undefined) this.forceLimitTop = opts.top
    if (opts.bottom !== undefined) this.forceLimitBottom = opts.bottom
    const s = this.state, p = this.params
    const forcingTop = this.forceLimitTop === true
    const forcingBottom = this.forceLimitBottom === true
    if (forcingTop || forcingBottom) {
      if (forcingTop) s.posM = p.limitTopM
      if (forcingBottom) s.posM = p.limitBottomM
      s.limitTop = true; s.limitBottom = true
      s.velMS = 0; s.duty = 0; s.accelMS2 = 0; s.currentA = 0; s.dir = 0; s.trip = 'limit'
    }
  }

  // 1 ms tick
  tick(dtMs: number) {
    const s = this.state, p = this.params
    s.t += dtMs

    // command -> target
    let dutyTarget = 0; let dir: -1|0|1 = 0
    if (this.cmd === 'up') { dutyTarget = 0.9; dir = 1 }
    else if (this.cmd === 'down') { dutyTarget = 0.2; dir = -1 }

    // Door => decel to zero
    if (this.doorOpen) { s.trip = 'door'; dutyTarget = 0; dir = 0 }

    // Update limit switches (with hysteresis) + overrides
    {
      const pos = s.posM
      if (this.forceLimitTop !== null) s.limitTop = !!this.forceLimitTop
      else if (s.limitTop) s.limitTop = pos >= (p.limitTopM - p.limitHystM)
      else s.limitTop = pos >= (p.limitTopM + p.limitHystM)

      if (this.forceLimitBottom !== null) s.limitBottom = !!this.forceLimitBottom
      else if (s.limitBottom) s.limitBottom = pos <= (p.limitBottomM + p.limitHystM)
      else s.limitBottom = pos <= (p.limitBottomM - p.limitHystM)
    }

    // simple ramp
    const ramp = 0.02
    const dv = Math.max(-ramp, Math.min(ramp, dutyTarget - s.duty))
    s.duty += dv; s.dir = dir

    // Hold at limit if pushing into switch
    if ((s.limitTop && dir > 0) || (s.limitBottom && dir < 0)) {
      s.trip = 'limit'; s.duty = 0; s.velMS = 0; s.accelMS2 = 0; s.currentA = 0; s.dir = 0; return
    }

    // Worm hold at rest (skip while door open or in limit)
    if (p.nonBackdrivable && dir === 0 && !this.doorOpen && s.trip !== 'limit') {
      s.duty = 0; s.velMS = 0; s.accelMS2 = 0; s.currentA = 0; if (s.trip === 'soft') s.trip = 'none'; return
    }

    // Load torque (+jam factor if active)
    const jam = s.t < this.overloadUntilMs
    const F = p.massKg * 9.81
    let tauLoad = F * p.drumRadiusM * (dir !== 0 ? 1 : 0)
    if (jam) tauLoad *= this.overloadFactor

    const omega = s.velMS / p.drumRadiusM
    const V = p.supplyV * s.duty
    const I = Math.max(0, (V - p.Ke * omega) / p.Ra)
    const tauMotor = p.Kt * I

    // Trips
    if (s.trip !== 'hard' && s.trip !== 'door' && s.trip !== 'limit') {
      if (I >= p.hardTripA) s.trip = 'hard'
      else if (I >= p.softTripA && s.trip === 'none') s.trip = 'soft'
    }
    if (s.trip === 'hard') { s.duty = 0; this.cmd = 'stop'; s.dir = 0 }
    else if (s.trip === 'soft') { s.duty = Math.min(s.duty, 0.5) }

    // Jam => immediate hard trip when moving/commanding
    if (jam && (Math.abs(s.velMS) > 1e-4 || dir !== 0) && s.trip !== 'hard') {
      s.trip = 'hard'; s.duty = 0; this.cmd = 'stop'; s.dir = 0
    }

    // Dynamics
    const tauNet = Math.max(0, tauMotor - tauLoad * (dir !== 0 ? 1 : 0))
    const a_tan = tauNet / (p.massKg * p.drumRadiusM)
    const vTarget = dir !== 0 ? p.targetSpeedMS * dir : 0
    const vErr = vTarget - s.velMS
    const a_ctrl = Math.max(-1, Math.min(1, vErr * 5))
    const a = a_ctrl + (dir !== 0 ? a_tan : 0)

    const dt = dtMs / 1000
    s.accelMS2 = a
    s.velMS += a * dt
    let nextPos = s.posM + s.velMS * dt
    if (nextPos <= 0) { nextPos = 0; s.velMS = 0 }
    if (nextPos >= p.travelM) { nextPos = p.travelM; s.velMS = 0 }
    s.posM = nextPos

    // Update current with new speed
    const omega2 = Math.abs(s.velMS) / p.drumRadiusM
    s.currentA = Math.max(0, (V - p.Ke * omega2) / p.Ra)
  }
}
