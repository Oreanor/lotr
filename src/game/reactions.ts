// Spoken companion reactions: which interface events can prompt a line, and the
// mood each carries (drives the speaker's portrait flicker — joy/refuse, or a
// plain face for neutral). The actual lines live in the locales under
// `reaction.<temperament|id>.<event>`; see useReactions for the queue/display.

export type ReactionEvent =
  | "itemLike"
  | "itemDislike"
  | "itemOff"
  | "ringTake"
  | "ringGive"
  | "food"
  | "transport"
  | "eagles"
  | "levelStr"
  | "levelDef"
  | "levelInt"
  | "levelLuck"
  | "bearer60"
  | "bearer80"
  | "idle"
  | "langChange"
  | "mapChange"
  | "terrainOn"
  | "speedUp"
  | "speedDown"
  | "mountains"
  | "sea"
  | "mourn"
  | "hurt"
  | "battleEasy"
  | "battleHard"
  | "battleNarrow";

export type ReactionMood = "joy" | "refuse" | "neutral";

const EVENT_MOOD: Record<ReactionEvent, ReactionMood> = {
  itemLike: "joy",
  itemDislike: "refuse",
  itemOff: "neutral",
  ringTake: "neutral",
  ringGive: "joy", // relief at handing the burden on
  food: "refuse",
  transport: "joy",
  eagles: "joy",
  levelStr: "joy",
  levelDef: "joy",
  levelInt: "joy",
  levelLuck: "joy",
  bearer60: "refuse",
  bearer80: "refuse",
  idle: "neutral",
  langChange: "joy",
  mapChange: "joy",
  terrainOn: "joy",
  speedUp: "joy",
  speedDown: "neutral",
  mountains: "refuse",
  sea: "neutral",
  mourn: "refuse",
  hurt: "refuse",
  battleEasy: "joy",
  battleHard: "neutral",
  battleNarrow: "joy",
};

// The tone of a line, with a couple of character-specific twists (Gollum lusts
// after the Ring rather than dreading it).
export function reactionMood(charId: string, event: ReactionEvent): ReactionMood {
  if (charId === "gollum") {
    if (event === "ringTake") return "joy";
    if (event === "ringGive") return "refuse";
  }
  return EVENT_MOOD[event];
}
