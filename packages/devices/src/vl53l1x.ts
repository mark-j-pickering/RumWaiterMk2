
// Minimal VL53L1X model: returns distance in mm at a single result register.
import type { I2CDevice } from './i2c'

/**
 * We'll serve distance at RESULT__FINAL_CROSSTALK_CORRECTED_RANGE_MM_SD0 (0x0096)
 * but since our simple bus uses 8-bit pointers, we expose at 0x96 for demo.
 */
export class VL53L1X implements I2CDevice {
  private distanceMm = 0
  private pointer = 0x00
  setDistance(mm: number) { this.distanceMm = Math.max(0, Math.min(4000, Math.round(mm))) }
  write(bytes: Uint8Array) {
    if (bytes.length >= 2) this.pointer = bytes[1]
  }
  read(length: number): Uint8Array {
    if ((this.pointer & 0xff) === 0x96) {
      const mm = this.distanceMm & 0xffff
      return new Uint8Array([ (mm>>8)&0xff, mm&0xff ])
    }
    return new Uint8Array(length)
  }
}
