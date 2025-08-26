import { AVRRunner } from "avr8js";
import { flashHex } from "./hexLoader";

let runner: AVRRunner | null = null;

export function startCpu(hexString: string) {
  const program = flashHex(hexString);
  runner = new AVRRunner(program);
  runner.execute((cpu) => {
    // Basic pin change logging
    cpu.writeHooks[0x25] = (value) => {
      console.log("PORTB changed:", value.toString(2).padStart(8, "0"));
    };
  });
}

export function stopCpu() {
  runner = null;
}

