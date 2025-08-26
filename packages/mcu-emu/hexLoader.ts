// Intel HEX parser for AVR .hex files
// Builds a full 32 KB flash image for the ATmega328P (Arduino Uno)
export function flashHex(hexString: string): Uint8Array {
  const FLASH_SIZE = 32 * 1024; // 32 KB flash
  const bytes = new Uint8Array(FLASH_SIZE);

  const lines = hexString.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith(":")) continue;

    const len = parseInt(line.substr(1, 2), 16);
    const addr = parseInt(line.substr(3, 4), 16);
    const type = parseInt(line.substr(7, 2), 16);

    if (type !== 0) continue; // only process data records

    for (let i = 0; i < len; i++) {
      const byte = parseInt(line.substr(9 + i * 2, 2), 16);
      bytes[addr + i] = byte;
    }
  }

  console.log("✅ HEX parsed into full flash image, size:", bytes.length, "bytes");
  return bytes;
}
