// A companion's speech bubble — a white, black-bordered box with a small tail.
// `tail` says where the nub points: "left" toward a portrait on the left (party
// strip / character panel), "down" toward a portrait below (battle screen), or
// "up" toward a portrait above (recruit refusals). For up/down tails,
// `tailLeftPx` places the nub horizontally (so a bubble nudged to stay on-screen
// still points at its portrait). Pops in/out via .reaction-pop; `delayMs` staggers.
export function ReactionBubble({
  text,
  tail = "left",
  delayMs = 0,
  maxWClass,
  tailLeftPx,
}: {
  text: string;
  tail?: "left" | "down" | "up";
  delayMs?: number;
  maxWClass?: string;
  tailLeftPx?: number;
}) {
  const width = maxWClass ?? (tail === "left" ? "max-w-[12rem]" : "max-w-[11rem]");
  const origin = tail === "left" ? "left center" : tail === "up" ? "top center" : "bottom center";
  const popClass = tail === "left" ? "reaction-pop-left" : "reaction-pop-down";
  return (
    <div
      className={`${popClass} ${width} relative w-max rounded border border-black bg-white px-1.5 py-0.5 text-sm font-medium uppercase leading-snug text-black shadow-lg`}
      style={{
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        transformOrigin: origin,
        animationDelay: delayMs ? `${delayMs}ms` : undefined,
      }}
    >
      {text}
      {tail === "left" ? (
        <span className="absolute -left-[4px] top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-black bg-white" />
      ) : tail === "up" ? (
        <span
          className="absolute -top-[4px] size-2 border-l border-t border-black bg-white"
          style={{ left: tailLeftPx != null ? `${tailLeftPx}px` : "50%", transform: "translateX(-50%) rotate(45deg)" }}
        />
      ) : (
        <span
          className="absolute -bottom-[4px] size-2 border-b border-r border-black bg-white"
          style={{ left: tailLeftPx != null ? `${tailLeftPx}px` : "50%", transform: "translateX(-50%) rotate(45deg)" }}
        />
      )}
    </div>
  );
}
