import { triggerJam } from "../../engine/jam";

export function JamButton() {
  return (
    <button onClick={() => triggerJam()}>
      Trigger Jam
    </button>
  );
}
