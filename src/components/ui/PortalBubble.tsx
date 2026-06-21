import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReactionBubble } from "@/components/ui/ReactionBubble";

// Renders a reaction bubble in a top-level portal, fixed-positioned against an
// anchor element (a portrait). On <body> so no modal overflow clips it.
//
// tail "down": bubble sits above the portrait; "up": below it; "left": to its
// right. Up/down bubbles are kept on-screen — if centring would run off an edge
// they slide inward and the tail shifts to keep pointing at the portrait.
export function PortalBubble({
  getEl,
  text,
  tail = "down",
  delayMs = 0,
  maxWClass,
}: {
  getEl: () => HTMLElement | null | undefined;
  text: string;
  tail?: "left" | "down" | "up";
  delayMs?: number;
  maxWClass?: string;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<
    { cx: number; top: number; bottom: number; right: number; midY: number } | null
  >(null);
  const [layout, setLayout] = useState<{
    left: number;
    top: number;
    transform?: string;
    tailLeftPx?: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = getEl();
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    setAnchor({
      cx: r.left + r.width / 2,
      top: r.top,
      bottom: r.bottom,
      right: r.right,
      midY: r.top + r.height / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tail]);

  useLayoutEffect(() => {
    if (!anchor) {
      return;
    }
    if (tail === "left") {
      setLayout({ left: anchor.right + 8, top: anchor.midY, transform: "translateY(-50%)" });
      return;
    }
    const bw = bubbleRef.current?.offsetWidth ?? 140;
    const margin = 6;
    let left = anchor.cx - bw / 2;
    left = Math.min(Math.max(left, margin), window.innerWidth - margin - bw);
    const tailLeftPx = Math.min(Math.max(anchor.cx - left, 10), bw - 10);
    if (tail === "up") {
      setLayout({ left, top: anchor.bottom + 6, tailLeftPx });
    } else {
      setLayout({ left, top: anchor.top - 6, transform: "translateY(-100%)", tailLeftPx });
    }
  }, [anchor, tail, text]);

  if (!anchor) {
    return null;
  }
  return createPortal(
    <div
      className="pointer-events-none fixed z-[100]"
      style={{ left: layout?.left ?? -9999, top: layout?.top ?? -9999, transform: layout?.transform }}
    >
      <div ref={bubbleRef} className={layout ? "" : "invisible"}>
        <ReactionBubble
          text={text}
          tail={tail}
          delayMs={delayMs}
          maxWClass={maxWClass}
          tailLeftPx={tail === "left" ? undefined : layout?.tailLeftPx}
        />
      </div>
    </div>,
    document.body,
  );
}
