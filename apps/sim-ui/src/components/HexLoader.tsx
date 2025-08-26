import React, { useState } from "react";
import { startCpu } from "../../../packages/mcu-emu";

export const HexLoader: React.FC = () => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    startCpu(text);
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem" }}>
      <h3>Arduino HEX Loader</h3>
      <input type="file" accept=".hex" onChange={handleFile} />
      {fileName && <p>Loaded: {fileName}</p>}
      <p>Check console logs for pin changes.</p>
    </div>
  );
};
