import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Single horizontal row that scrolls when its content overflows: drag the row
// directly, or use the left/right arrows (which hide when there's nothing more
// to scroll that way). Drag past a small threshold suppresses the click so
// dragging over a button doesn't accidentally trigger it.
export function ScrollRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const suppressClick = useRef(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setCanLeft(el.scrollLeft > 1);
    setCanRight(Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) {
      return undefined;
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update, children]);

  const scrollByPage = (direction: number) => {
    const el = ref.current;
    if (el) {
      el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
    }
  };

  // Drag-to-scroll anywhere in the row (including over the portrait buttons):
  // window listeners track the pointer regardless of what's under it. A real
  // drag swallows the trailing click so cards aren't accidentally activated.
  const startDrag = (event: ReactPointerEvent) => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const startX = event.clientX;
    const startScroll = el.scrollLeft;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = true;
      }
      el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      // Capture phase: the modal shell stops pointerup bubbling, so we must
      // listen before that or cleanup never runs and the drag "sticks".
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      if (moved) {
        suppressClick.current = true;
      }
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
  };

  return (
    <div className="relative mt-4">
      {canLeft && (
        <button
          type="button"
          aria-label="‹"
          onClick={() => scrollByPage(-1)}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-neutral-700 bg-neutral-900/90 p-1 text-neutral-200 shadow transition hover:bg-neutral-800"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      <div
        ref={ref}
        onScroll={update}
        onPointerDown={startDrag}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        className="flex cursor-grab select-none gap-3 overflow-x-auto pb-1 active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {canRight && (
        <button
          type="button"
          aria-label="›"
          onClick={() => scrollByPage(1)}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-neutral-700 bg-neutral-900/90 p-1 text-neutral-200 shadow transition hover:bg-neutral-800"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}
