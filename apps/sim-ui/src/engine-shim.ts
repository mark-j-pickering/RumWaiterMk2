export interface SimParams {
  massKg: number
  targetSpeedMS: number
  softTripA: number
  hardTripA: number
  limitTopM?: number
  limitBottomM?: number
  limitHystM?: number
}

export interface SimState {
  t: number
  posM: number
  velMS: number
  accelMS2: number
  currentA: number
  duty: number
  dir: -1 | 0 | 1
  trip: 'none' | 'soft' | 'hard' | 'door' | 'limit' | 'RUNNING' | 'PAUSED' | 'JAM'
  limitTop: boolean
  limitBottom: boolean
}

export const defaultParams: SimParams = {
  massKg: 20,
  targetSpeedMS: 0.2,
  softTripA: 16,
  hardTripA: 20,
  limitTopM: 1.995,
  limitBottomM: 0.005,
  limitHystM: 0.002,
}

export class SimEngine {
  params: SimParams
  state: SimState
  tickCount: number
  doorOpen: boolean
  limitOverride: { top: boolean; bottom: boolean }
  onUpdate?: (s: SimState) => void
  onJamStart?: () => void
  onJamDone?: () => void

  hardTripA = 20   // current threshold where jam trips
  jamRampMs = 1000 // 1 second ramp duration
  jamTimer?: any

  constructor(params: SimParams) {
    this.params = params
    this.state = {
      t: 0,
      posM: 0,
      velMS: 0,
      accelMS2: 0,
      currentA: 0,
      duty: 0,
      dir: 0,
      trip: 'none',
      limitTop: false,
      limitBottom: false,
    }
    this.tickCount = 0
    this.doorOpen = false
    this.limitOverride = { top: false, bottom: false }
  }

  setDoorOpen(open: boolean) {
    this.doorOpen = open
  }

  setLimitOverride(v: { top?: boolean; bottom?: boolean }) {
    this.limitOverride = { ...this.limitOverride, ...v }
  }

  command(dir: 'up' | 'down' | 'stop') {
    if (dir === 'stop') this.state.duty = 0
    else this.state.duty = dir === 'up' ? +1 : -1
  }

  triggerJam() {
    if (this.jamTimer) return // already running
    this.onJamStart?.()
    let start = Date.now()
    this.jamTimer = setInterval(() => {
      let dt = Date.now() - start
      this.state.currentA = (dt / this.jamRampMs) * this.hardTripA
      if (this.state.currentA >= this.hardTripA) {
        clearInterval(this.jamTimer)
        this.jamTimer = undefined
        this.onJamDone?.()
      }
    }, 50)
  }

  tick(ms: number) {
    // --- Run time (only accumulate if moving and not at limits) ---
    if (this.state.duty !== 0 && !this.state.limitTop && !this.state.limitBottom) {
      this.state.t += ms
    }

    // --- Physics updates ---
    this.state.posM += this.state.velMS * (ms / 1000)
    this.state.velMS += (this.state.duty * this.params.targetSpeedMS - this.state.velMS) * 0.1
    this.state.accelMS2 = (this.state.duty * this.params.targetSpeedMS - this.state.velMS)

    // --- Direction flag ---
    this.state.dir = this.state.duty > 0 ? 1 : this.state.duty < 0 ? -1 : 0

    // --- Limit switches (simplified) ---
    const top = (this.params.limitTopM !== undefined) && (this.state.posM >= this.params.limitTopM)
    const bottom = (this.params.limitBottomM !== undefined) && (this.state.posM <= this.params.limitBottomM)
    this.state.limitTop = top || this.limitOverride.top
    this.state.limitBottom = bottom || this.limitOverride.bottom

	// --- Current model: gravity + dynamic error (hybrid lively model) ---
	const g = 9.81
	const eff = 0.8

	// Gravity load only applies when lifting UP
	const gravityForceN = this.state.dir > 0 ? this.params.massKg * g : 0

	// Velocity error = dynamic lively term
	const velError = (this.state.duty * this.params.targetSpeedMS - this.state.velMS)
	const dynamicForceN = this.params.massKg * velError * 5   // gain tweak

	// Combine forces
	const totalForceN = gravityForceN + dynamicForceN

	// Convert to current
	const targetCurrent = Math.abs(totalForceN / g) / eff

	// Smooth ramp
	const tau = 0.1
	this.state.currentA += (targetCurrent - this.state.currentA) * (ms / 1000) / tau


    // --- Zero current if stopped at limits or duty off ---
    if ((this.state.limitTop && this.state.dir > 0) ||
        (this.state.limitBottom && this.state.dir < 0) ||
        this.state.duty === 0) {
      this.state.currentA = 0
    }

    // --- Current decay if idle (safety net, but not during jam ramp) ---
    if (this.state.duty === 0 && !this.jamTimer) {
      this.state.currentA = Math.max(this.state.currentA - 0.2, 0)
    }

    // --- Motion state ---
    let motion: 'RUNNING' | 'PAUSED' | 'JAM' = 'PAUSED'
    if (this.jamTimer) {
      motion = 'JAM'
    } else if (this.state.duty !== 0 && !this.state.limitTop && !this.state.limitBottom) {
      motion = 'RUNNING'
    }
    this.state.trip = motion

    // --- Auto-stop condition ---
    if (this.state.duty === 0 && Math.abs(this.state.velMS) < 1e-3 && !this.jamTimer) {
      return
    }

    // Debug
    console.log(`[Sim] t=${this.state.t}ms current=${this.state.currentA.toFixed(2)} A state=${motion}`)

    // --- Emit update to UI ---
    this.onUpdate?.(this.state)
  }
}
