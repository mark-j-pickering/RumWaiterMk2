
export class McuEmu {
  hexLoaded = false
  loadHex(data: ArrayBuffer) { this.hexLoaded = true }
  step(ms: number) { /* no-op stub */ }
}
