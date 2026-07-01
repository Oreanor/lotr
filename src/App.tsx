import { useState } from "react";
import { loadSave } from "@/game";
import MiddleEarthMap from "@/components/MiddleEarthMap";
import { GuidePage } from "@/components/GuidePage";
import { TitleScreen } from "@/components/modals/TitleScreen";

// Show the splash before a fresh game; resume a saved game straight into the map.
// The map isn't mounted until the player starts, so nothing of it shows through.
export default function App() {
  // A tiny path check stands in for a router: /guide opens the standalone
  // reference site (portraits, stats, schedules) instead of the game.
  const path = window.location.pathname.replace(/\/+$/, "");
  const [started, setStarted] = useState(() => loadSave() !== null);
  if (path.endsWith("/guide")) {
    return <GuidePage />;
  }
  if (!started) {
    return <TitleScreen onStart={() => setStarted(true)} />;
  }
  return <MiddleEarthMap />;
}
