import React, { useState } from "react";
import { startCpu, flashHex } from "mcu-emu";

export const HexLoader: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    // Read HEX file as text
    const text = await file.text();

    // Parse HEX → Uint8Array
    const program = flashHex(text);

    console.log("✅ HEX parsed in HexLoader, program length:", program.length);

    // Start emulator with compiled program
    startCpu(program);
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem" }}>
      <h3>Arduino HEX Loader</h3>
      <input type="file" accept=".hex" onChange={handleFile} />
      {fileName && <p>Loaded: {fileName}</p>}
      <p>Check console logs for CPU start + pin updates.</p>
    </div>
  );
};
