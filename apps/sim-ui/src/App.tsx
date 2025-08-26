import React from "react";
import { HexLoader } from "./components/HexLoader";
import { PinViewer } from "./components/PinViewer";

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>RUMWaiter Mk2 Simulator v1.4.0</h1>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <HexLoader />
        <PinViewer />
      </div>
      {/* Existing simulator UI goes below */}
    </div>
  );
}

export default App;
