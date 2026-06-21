import { useCallback, useEffect, useRef, useState } from "react";
import { REACTION_GAP_MS, REACTION_QUEUE_MAX, REACTION_SHOW_MS } from "@/game";
import type { ReactionMood } from "@/game";

export interface Reaction {
  key: string;
  charId: string;
  text: string;
  mood: ReactionMood;
  // Optional staleness check, run just before showing: a queued line that's no
  // longer true by the time the map clears (e.g. "we need supplies" after you've
  // already restocked) is skipped.
  valid?: () => boolean;
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
    let next = queueRef.current.shift();
    while (next && next.valid && !next.valid()) {
      next = queueRef.current.shift(); // drop lines that went stale while queued
    }
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

  const lastTextRef = useRef<string | null>(null);
  const enqueue = useCallback(
    (charId: string, text: string, mood: ReactionMood, valid?: () => boolean) => {
      if (text === lastTextRef.current) {
        return; // don't echo the very same line twice in a row
      }
      if (queueRef.current.length >= REACTION_QUEUE_MAX) {
        return; // already enough waiting — stay quiet rather than pile up
      }
      lastTextRef.current = text;
      queueRef.current.push({ key: `rx${seqRef.current++}`, charId, text, mood, valid });
      pump();
    },
    [pump],
  );

  return { reaction: active, enqueue };
}
