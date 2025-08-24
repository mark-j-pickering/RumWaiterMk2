
// Minimal INA226 model: expose bus voltage and current in simple registers.
import type { I2CDevice } from './i2c'

/**
 * Register map subset (big-endian words):
 * 0x02: Shunt Voltage (µV)   [we'll encode mA directly for demo]
 * 0x03: Bus Voltage (mV)
 * 0x04: Power (mW)
 * 0x05: Current (mA)
 */
export class INA226 implements I2CDevice {
  private regs = new Uint16Array(8) // tiny map
  private pointer = 0x00
  constructor() {}

  setReadings(busV: number, currentA: number) {
    const mV = Math.round(busV * 1000)
    const mA = Math.round(currentA * 1000)
    this.regs[0x03] = mV & 0xffff
    this.regs[0x05] = mA & 0xffff
    const mW = Math.round((busV * currentA) * 1000)
    this.regs[0x04] = mW & 0xffff
  }

  write(bytes: Uint8Array) {
    // first byte after control is pointer or data; keep simple:
    if (bytes.length >= 2) {
      this.pointer = bytes[1]
    }
  }
  read(length: number): Uint8Array {
    const val = this.regs[this.pointer & 7]
    const out = new Uint8Array(2)
    out[0] = (val >> 8) & 0xff
    out[1] = val & 0xff
    return out
  }
}
