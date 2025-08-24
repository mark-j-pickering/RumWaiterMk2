// Engine shim to add limit switch behaviour, exporting class SimEngine
import { SimEngine as BaseSimEngine, defaultParams } from 'sim-engine'

export class SimEngine extends BaseSimEngine {
  override tick(ms: number) {
    super.tick(ms)
    const eps = 0.001
    if ((this.state as any).posM >= (this.params as any).limitTopM - eps) {
      (this.state as any).limitTop = true
    } else {
      (this.state as any).limitTop = false
    }
    if ((this.state as any).posM <= (this.params as any).limitBottomM + eps) {
      (this.state as any).limitBottom = true
    } else {
      (this.state as any).limitBottom = false
    }
  }
}

export { defaultParams }
