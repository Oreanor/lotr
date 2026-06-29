// Game endings: the outcome union and the "a non-bearer is left holding the
// Ring" resolver. Pure domain data — no React, no UI.

export type Ending =
  | "victory"
  // Gollum springs for the Precious at the brink and falls with it into the Fire
  // — the Ring unmade in spite of the bearer (as the tale truly ended).
  | "gollumFall"
  | "lord"
  | "starved"
  | "battle"
  | "nothing"
  | "rogueLord"
  | "sauron"
  | "valinorWest"
  | "valinorRing"
  | "valinorSink"
  // The bearer fell and only a companion who cannot truly carry the Ring is left;
  // each takes it to a different doom.
  | "sarumanLord"
  | "boromirGondor"
  | "bombadilLost"
  | "gollumHides"
  | "treebeardBuries"
  | "deadKeep";

// When the bearer falls and only companions who can't truly carry the Ring are
// left, one of them (chosen at random) takes it to their own doom.
export const NON_BEARER_ENDING: Record<string, Ending> = {
  saruman: "sarumanLord",
  boromir: "boromirGondor",
  bombadil: "bombadilLost",
  gollum: "gollumHides",
  treebeard: "treebeardBuries",
  king_dead: "deadKeep",
};

// Pick the doom for whoever is left holding the Ring; "nothing" if none of the
// survivors is one of the doomed non-bearers.
export function nonBearerEnding(living: string[]): Ending {
  const claimants = living.filter((id) => id in NON_BEARER_ENDING);
  if (claimants.length === 0) {
    return "nothing";
  }
  return NON_BEARER_ENDING[claimants[Math.floor(Math.random() * claimants.length)]];
}
