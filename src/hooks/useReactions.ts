import { useCallback, useEffect, useRef, useState } from "react";
import { REACTION_GAP_MS, REACTION_QUEUE_MAX, REACTION_SHOW_MS } from "@/game";
import type { ReactionMood } from "@/game";

export interface Reaction {
  key: string;
  charId: string;
  text: string;
  mood: ReactionMood;
}

// A small queue + timer that shows one speech bubble at a time. `paused` holds
// playback while the map is covered (a modal, battle, encounter, or a march) —
// so a remark prompted inside a window only surfaces once the card is gone and
// the map is clear, and lines never overlap.
export function useReactions(paused: boolean) {
  const [active, setActive] = useState<Reaction | null>(null);
  const queueRef = useRef<Reaction[]>([]);
  const seqRef = useRef(0);
  const busyRef = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const timersRef = useRef<number[]>([]);

  const pump = useCallback(() => {
    if (busyRef.current || pausedRef.current) {
      return;
    }
    const next = queueRef.current.shift();
    if (!next) {
      return;
    }
    busyRef.current = true;
    setActive(next);
    timersRef.current.push(
      window.setTimeout(() => {
        setActive(null);
        timersRef.current.push(
          window.setTimeout(() => {
            busyRef.current = false;
            pump();
          }, REACTION_GAP_MS),
        );
      }, REACTION_SHOW_MS),
    );
  }, []);

  // Resume as soon as the map clears.
  useEffect(() => {
    if (!paused) {
      pump();
    }
  }, [paused, pump]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    },
    [],
  );

  const enqueue = useCallback(
    (charId: string, text: string, mood: ReactionMood) => {
      if (queueRef.current.length >= REACTION_QUEUE_MAX) {
        return; // already enough waiting — stay quiet rather than pile up
      }
      queueRef.current.push({ key: `rx${seqRef.current++}`, charId, text, mood });
      pump();
    },
    [pump],
  );

  return { reaction: active, enqueue };
}
