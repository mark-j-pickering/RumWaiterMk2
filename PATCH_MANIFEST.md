# RUMWaiter Mk2 v1.4.0 Modern AVR8JS Patch

This patch updates `packages/mcu-emu/cpuRunner.ts` to use the current avr8js API.

## Changes
- Replaced `AVRRunner` with `AVRCPU` + `avrInstruction` + `AVRIOPort`.
- Tracks PORTD (pins 0-7) and PORTB (pins 8-13).
- Adds console logs on start/stop.
- Executes in a timed loop with `setTimeout`.

## Next Steps
1. Unzip into repo root (overwrite `packages/mcu-emu/cpuRunner.ts`).
2. Run `pnpm --filter sim-ui dev`.
3. Load a `.hex` (e.g. Blink.ino.hex) → Pin 13 LED should blink in GUI.
