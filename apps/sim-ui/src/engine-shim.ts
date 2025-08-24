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
  trip: 'none' | 'soft' | 'hard' | 'door' | 'limit'
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
    this.onJamStart?.()       // tell UI: button goes red
    let start = Date.now()
    this.jamTimer = setInterval(() => {
      let dt = Date.now() - start
      this.state.currentA = (dt / this.jamRampMs) * this.hardTripA
      if (this.state.currentA >= this.hardTripA) {
        clearInterval(this.jamTimer)
        this.jamTimer = undefined
        this.state.duty = 0
        this.doJamBackout()
      }
    }, 50)
  }

  doJamBackout() {
    this.state.duty = -0.2 // small reverse
    setTimeout(() => {
      this.state.duty = 0
      this.state.currentA = 0
      this.onJamDone?.() // tell UI: button resets
    }, 300)
  }

  tick(ms: number) {
    this.state.t += ms

    // Physics would normally update pos/vel/accel/current here...
    // Example placeholder (replace with your real model if different):
    this.state.posM += this.state.velMS * (ms / 1000)
    this.state.velMS += (this.state.duty * this.params.targetSpeedMS - this.state.velMS) * 0.1
    this.state.accelMS2 = (this.state.duty * this.params.targetSpeedMS - this.state.velMS)

    // Direction flag
    this.state.dir = this.state.duty > 0 ? 1 : this.state.duty < 0 ? -1 : 0

    // Limit switches (simplified)
    const top = (this.params.limitTopM !== undefined) && (this.state.posM >= this.params.limitTopM)
    const bottom = (this.params.limitBottomM !== undefined) && (this.state.posM <= this.params.limitBottomM)
    this.state.limitTop = top || this.limitOverride.top
    this.state.limitBottom = bottom || this.limitOverride.bottom

    // Current decay if idle (but not during jam ramp)
    if (this.state.duty === 0 && !this.jamTimer) {
      this.state.currentA = Math.max(this.state.currentA - 0.2, 0)
    }

    this.onUpdate?.(this.state)
  }
}
