import { CPU, avrInstruction, AVRIOPort } from "avr8js";

let cpu: CPU | null = null;
let pinSubscribers: ((pins: Record<number, boolean>) => void)[] = [];
let pinStates: Record<number, boolean> = {};

export function startCpu(program: Uint8Array) {
  console.log("🚀 startCpu() called, program length:", program.length);
  cpu = new CPU(program);

  const resetAddr = program[1] << 8 | program[0];  // crude way, but works for now
  console.log("🔎 Reset vector points to:", resetAddr);

  console.log("🔎 Bytes around reset target:",
    Array.from(program.slice(resetAddr*2, resetAddr*2 + 32))
      .map(b => b.toString(16).padStart(2, "0"))
      .join(" ")
  );

  // Dump first 16 instructions (32 bytes)
  const prog = program.slice(0, 32);
  console.log("🔎 First 32 program bytes:", Array.from(prog).map(b => b.toString(16).padStart(2, "0")).join(" "));

  // Wire AVR I/O ports with DDR + PORT registers
  const portB = new AVRIOPort(cpu, 0x25, 0x24); // PORTB, DDRB
  const portD = new AVRIOPort(cpu, 0x2B, 0x2A); // PORTD, DDRD

  console.log("✅ AVRIOPort listeners attached (PORTB 0x25/0x24, PORTD 0x2B/0x2A)");

  portB.addListener(() => {
    console.log("🔥 PORTB changed:", portB.pinState.toString(2).padStart(8, "0"));
    for (let bit = 0; bit < 8; bit++) {
      pinStates[8 + bit] = !!(portB.pinState & (1 << bit));
    }
    notifySubscribers();
  });

  portD.addListener(() => {
    console.log("🔥 PORTD changed:", portD.pinState.toString(2).padStart(8, "0"));
    for (let bit = 0; bit < 8; bit++) {
      pinStates[bit] = !!(portD.pinState & (1 << bit));
    }
    notifySubscribers();
  });

  console.log("✅ AVR CPU started");
  runLoop();
}

function runLoop() {
  if (!cpu) return;
  for (let i = 0; i < 50000; i++) {
    avrInstruction(cpu);
  }
  // show heartbeat of program counter
  //console.log("PC:", cpu.pc);
  setTimeout(runLoop, 0);
}

export function stopCpu() {
  cpu = null;
  console.log("🛑 AVR CPU stopped");
}

function notifySubscribers() {
  console.log("📢 Pin states updated:", { ...pinStates });
  for (const sub of pinSubscribers) {
    sub({ ...pinStates });
  }
}

export function subscribePins(cb: (pins: Record<number, boolean>) => void) {
  pinSubscribers.push(cb);
}
