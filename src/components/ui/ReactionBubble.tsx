// A companion's speech bubble — a white, black-bordered box with a small tail.
// `tail` says where the nub points: "left" toward a portrait on the left (party
// strip / character panel), or "down" toward a portrait below (battle screen).
export function ReactionBubble({ text, tail = "left" }: { text: string; tail?: "left" | "down" }) {
  return (
    <div
      className="relative w-fit max-w-[10rem] text-balance rounded border border-black bg-white px-1.5 py-0.5 text-sm font-medium uppercase leading-snug text-black shadow-lg"
      style={{ fontFamily: '"Comic Sans MS", "Comic Sans", cursive' }}
    >
      {text}
      {tail === "down" ? (
        <span className="absolute -bottom-[4px] left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-black bg-white" />
      ) : (
        <span className="absolute -left-[4px] top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-black bg-white" />
      )}
    </div>
  );
}
