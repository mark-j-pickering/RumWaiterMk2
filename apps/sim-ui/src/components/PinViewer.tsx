import React, { useEffect, useState } from "react";
import { subscribePins } from "mcu-emu";

export const PinViewer: React.FC = () => {
  const [pins, setPins] = useState<Record<number, boolean>>({});

  useEffect(() => {
    subscribePins((p) => setPins(p));
  }, []);

  const renderPin = (pin: number) => {
    const state = pins[pin] ?? false;
    return (
      <div key={pin} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            marginRight: "8px",
            backgroundColor: state ? "limegreen" : "lightgray",
            border: "1px solid #333"
          }}
        ></div>
        <span>Pin {pin}: {state ? "HIGH" : "LOW"}</span>
      </div>
    );
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "1rem" }}>
      <h3>Pin Viewer</h3>
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(renderPin)}
    </div>
  );
};
