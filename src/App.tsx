import { useState } from "react";
import { loadSave } from "@/game";
import MiddleEarthMap from "@/components/MiddleEarthMap";
import { TitleScreen } from "@/components/modals/TitleScreen";

// Show the splash before a fresh game; resume a saved game straight into the map.
// The map isn't mounted until the player starts, so nothing of it shows through.
export default function App() {
  const [started, setStarted] = useState(() => loadSave() !== null);
  if (!started) {
    return <TitleScreen onStart={() => setStarted(true)} />;
  }
  return <MiddleEarthMap />;
}
