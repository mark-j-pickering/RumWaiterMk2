
export interface I2CDevice {
  write(bytes: Uint8Array): void
  read(length: number): Uint8Array
}

export class I2CBus {
  private devices = new Map<number, I2CDevice>()
  register(address: number, dev: I2CDevice) {
    this.devices.set(address & 0x7f, dev)
  }
  write(address: number, bytes: Uint8Array) {
    const dev = this.devices.get(address & 0x7f)
    if (!dev) throw new Error(`I2C: write to unknown address 0x${address.toString(16)}`)
    dev.write(bytes)
  }
  read(address: number, length: number): Uint8Array {
    const dev = this.devices.get(address & 0x7f)
    if (!dev) throw new Error(`I2C: read from unknown address 0x${address.toString(16)}`)
    return dev.read(length)
  }
}
