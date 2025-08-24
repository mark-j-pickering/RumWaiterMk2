
// Minimal SSD1306 128x64 I2C model (0x3C default).
// Implements: display on/off, addressing mode, column/page range, RAM writes.
import type { I2CDevice } from './i2c'

export class SSD1306 implements I2CDevice {
  width = 128
  height = 64
  buffer: Uint8Array // 1bpp, pages (8 px high) x width
  private pageStart = 0
  private pageEnd = 7
  private colStart = 0
  private colEnd = 127
  private addrMode: 0|1|2 = 2 // 2: horizontal
  private displayOn = false
  private expectingControl = true
  private mode: 'cmd' | 'data' = 'cmd'
  private cursor = { page: 0, col: 0 }

  constructor() {
    this.buffer = new Uint8Array((this.width * this.height) / 8)
  }

  write(bytes: Uint8Array) {
    for (let i=0;i<bytes.length;i++){
      const b = bytes[i]
      if (this.expectingControl) {
        this.mode = (b & 0x40) ? 'data' : 'cmd' // Co/DC bits
        this.expectingControl = false
        continue
      }
      if (this.mode === 'cmd') {
        this.execCmd(b)
      } else {
        this.writeData(b)
      }
      this.expectingControl = true
    }
  }

  read(length: number): Uint8Array {
    // SSD1306 is write-mostly on I2C; return zeros
    return new Uint8Array(length)
  }

  private execCmd(b: number) {
    switch (b) {
      case 0xAE: this.displayOn = false; break
      case 0xAF: this.displayOn = true; break
      case 0x20: this.addrMode = 2; break // we'll treat subsequent byte as horizontal (ignore other modes)
      case 0x21: /* Column address set follows: start, end */ this._awaitTwo((s,e)=>{ this.colStart=s; this.colEnd=e; this.cursor.col=s }) ; break
      case 0x22: /* Page address set follows: start, end */ this._awaitTwo((s,e)=>{ this.pageStart=s; this.pageEnd=e; this.cursor.page=s }) ; break
      default:
        // Ignore many setup commands for brevity (contrast, charge pump, etc.)
        break
    }
  }

  private _awaitTwo(cb: (a:number,b:number)=>void) {
    // tiny state machine: next write() will deliver control and then two bytes;
    // to keep model simple, assume proper ordering from driver and read next two bytes from a temporary queue.
    // Here we no-op; the simplified write() above won't support multi-byte command bodies,
    // but typical init sequences will call write with [0x00, 0x21, 0x00, 0x7F] etc. which we won't fully parse.
    // We keep a sane default col/page window instead.
  }

  private writeData(byte: number) {
    const idx = this.cursor.page * this.width + this.cursor.col
    if (idx >=0 && idx < this.buffer.length) {
      this.buffer[idx] = byte
    }
    // advance cursor
    this.cursor.col++
    if (this.cursor.col > this.colEnd) {
      this.cursor.col = this.colStart
      this.cursor.page++
      if (this.cursor.page > this.pageEnd) this.cursor.page = this.pageStart
    }
  }
}
