import { AVRRunner } from "avr8js";
import { loadHex } from "avr8js";

export function flashHex(hexString: string): Uint8Array {
  return loadHex(hexString);
}
