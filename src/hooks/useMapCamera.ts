import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  clamp,
  coverZoom,
  DEFAULT_VIEW_SIZE,
  DEFAULT_VISIBLE_FRACTION,
  DEFAULT_ZOOM,
  DEFAULT_ZOOM_BOOST,
  fitZoom,
  MAX_ZOOM_FACTOR,
  ZOOM_WHEEL_SENSITIVITY,
} from "@/game";
import type { DragState, Point, Size } from "@/game";

// All of the map camera: zoom/offset state, the imperative pan layers, drag/
// pinch/wheel gestures, follow-suspend flag, centering, and the responsive fit.
// Returns values under the same names the page already used, so the rest of the
// component is untouched. The travel loop reads the returned refs/writePanTransform.
export function useMapCamera({
  mapSize,
  initialFocus,
  resizeFocus,
  playerRef,
  mapInputLockedRef,
  onTapRef,
}: {
  mapSize: Size;
  // Where the camera starts (figure's start position).
  initialFocus: Point;
  // Fallback focus for the first responsive fit when no figure exists yet.
  resizeFocus: Point;
  playerRef: MutableRefObject<Point | null>;
  // Live "a modal is up — ignore map input" flag, kept current by the page.
  mapInputLockedRef: MutableRefObject<boolean>;
  // Tap-to-move handler (page logic that turns a screen tap into a march target).
  onTapRef: MutableRefObject<(clientX: number, clientY: number) => void>;
}) {
  const dragRef = useRef<DragState>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffset: { x: 0, y: 0 },
  });
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number }>({
    active: false,
    startDist: 0,
    startZoom: 1,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  // The three camera layers (map, terrain overlay, marker overlay). During a pan
  // we write their transforms straight to the DOM so a drag doesn't re-render the
  // whole component every frame; React state catches up once on release.
  const mapImgRef = useRef<HTMLImageElement | null>(null);
  const terrainImgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<Point | null>(null);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const baseZoomRef = useRef(DEFAULT_ZOOM);
  const viewRef = useRef<Size>({ width: DEFAULT_VIEW_SIZE, height: DEFAULT_VIEW_SIZE });
  const initializedRef = useRef(false);
  // Set when the user manually pans during a journey; suspends auto-follow until
  // the next target so the camera doesn't snap back to the figure.
  const followDisabledRef = useRef(false);

  const [view, setView] = useState<Size>({ width: DEFAULT_VIEW_SIZE, height: DEFAULT_VIEW_SIZE });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState<Point>(() => ({
    x: DEFAULT_VIEW_SIZE / 2 - initialFocus.x * DEFAULT_ZOOM,
    y: DEFAULT_VIEW_SIZE / 2 - initialFocus.y * DEFAULT_ZOOM,
  }));

  // Mirror state into refs so the rAF loop reads current values without being a
  // dependency (which would restart the animation on every pan/zoom).
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const clampOffset = useCallback(
    (nextOffset: Point, nextZoom: number): Point => {
      const scaledWidth = mapSize.width * nextZoom;
      const scaledHeight = mapSize.height * nextZoom;
      return {
        x: clamp(nextOffset.x, view.width - scaledWidth, 0),
        y: clamp(nextOffset.y, view.height - scaledHeight, 0),
      };
    },
    [mapSize, view],
  );

  // Position inside the overlay layer, which itself is translated by `offset`.
  // Depends only on zoom (not offset), so panning every frame doesn't re-project
  // the markers/figure — only the layer's transform shifts.
  const mapToLayer = useCallback(
    (point: Point): Point => ({ x: point.x * zoom, y: point.y * zoom }),
    [zoom],
  );

  const screenToMap = useCallback(
    (screenPoint: Point): Point => ({
      x: clamp((screenPoint.x - offset.x) / zoom, 0, mapSize.width),
      y: clamp((screenPoint.y - offset.y) / zoom, 0, mapSize.height),
    }),
    [mapSize, offset, zoom],
  );

  const centerOnPlayer = useCallback(() => {
    const figure = playerRef.current;
    if (!figure) {
      return;
    }
    const next = clampOffset(
      { x: view.width / 2 - figure.x * zoom, y: view.height / 2 - figure.y * zoom },
      zoom,
    );
    offsetRef.current = next;
    setOffset(next);
  }, [clampOffset, view, zoom, playerRef]);

  // Cycle the zoom presets (0.5/1/2× of the base fit), viewport centre fixed.
  const cycleZoom = useCallback(() => {
    if (mapInputLockedRef.current) {
      return;
    }
    const presets = [0.5, 1, 2];
    const base = baseZoomRef.current || 1;
    const current = zoom / base;
    const nextPreset = presets.find((p) => p > current + 0.05) ?? presets[0];
    const minZoom = coverZoom(view, mapSize);
    const maxZoom = Math.max(minZoom, base * MAX_ZOOM_FACTOR);
    const nextZoom = clamp(base * nextPreset, minZoom, maxZoom);
    const center = { x: view.width / 2, y: view.height / 2 };
    const anchor = screenToMap(center);
    const nextOffset = clampOffset(
      { x: center.x - anchor.x * nextZoom, y: center.y - anchor.y * nextZoom },
      nextZoom,
    );
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }, [zoom, view, mapSize, screenToMap, clampOffset, mapInputLockedRef]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport || mapInputLockedRef.current) {
        return;
      }
      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      const cursor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const mapPoint = screenToMap(cursor);
      const minZoom = coverZoom(view, mapSize);
      const maxZoom = Math.max(minZoom, baseZoomRef.current * MAX_ZOOM_FACTOR);
      // Multiplicative, delta-proportional zoom → smooth glide, not fixed steps.
      const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY);
      const nextZoom = clamp(zoom * factor, minZoom, maxZoom);
      if (nextZoom === zoom) {
        return;
      }
      const nextOffset = clampOffset(
        { x: cursor.x - mapPoint.x * nextZoom, y: cursor.y - mapPoint.y * nextZoom },
        nextZoom,
      );
      setZoom(nextZoom);
      setOffset(nextOffset);
    },
    [clampOffset, mapSize, screenToMap, view, zoom, mapInputLockedRef],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Begin a two-finger pinch: freeze the drag and remember the start spread/zoom.
  const beginPinch = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) {
      return;
    }
    dragRef.current = { ...dragRef.current, active: false, pointerId: null };
    pinchRef.current = {
      active: true,
      startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      startZoom: zoomRef.current,
    };
    followDisabledRef.current = true;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // A modal is up: the map is inert (no pan, pinch, or click-to-move).
      if (mapInputLockedRef.current) {
        return;
      }
      // Touch/pen always tracked; for mouse only the primary button drags.
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointersRef.current.size >= 2) {
        beginPinch();
        return;
      }
      dragRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
      };
    },
    [beginPinch, offset, mapInputLockedRef],
  );

  // Write the camera transform straight to the three layer nodes — used to pan
  // without a React re-render each frame.
  const writePanTransform = useCallback((off: Point) => {
    const translate = `translate(${off.x}px, ${off.y}px)`;
    const scaled = `${translate} scale(${zoomRef.current})`;
    if (mapImgRef.current) {
      mapImgRef.current.style.transform = scaled;
    }
    if (terrainImgRef.current) {
      terrainImgRef.current.style.transform = scaled;
    }
    if (overlayRef.current) {
      overlayRef.current.style.transform = translate;
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      // Two fingers → pinch-zoom around their midpoint.
      if (pinchRef.current.active && pointersRef.current.size >= 2) {
        const viewport = viewportRef.current;
        if (!viewport) {
          return;
        }
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist <= 0) {
          return;
        }
        const bounds = viewport.getBoundingClientRect();
        const mid = { x: (a.x + b.x) / 2 - bounds.left, y: (a.y + b.y) / 2 - bounds.top };
        const minZoom = coverZoom(view, mapSize);
        const maxZoom = Math.max(minZoom, baseZoomRef.current * MAX_ZOOM_FACTOR);
        const nextZoom = clamp(
          (pinchRef.current.startZoom * dist) / pinchRef.current.startDist,
          minZoom,
          maxZoom,
        );
        const liveOffset = offsetRef.current ?? offset;
        const liveZoom = zoomRef.current;
        const mapPoint = { x: (mid.x - liveOffset.x) / liveZoom, y: (mid.y - liveOffset.y) / liveZoom };
        const nextOffset = clampOffset(
          { x: mid.x - mapPoint.x * nextZoom, y: mid.y - mapPoint.y * nextZoom },
          nextZoom,
        );
        zoomRef.current = nextZoom;
        offsetRef.current = nextOffset;
        setZoom(nextZoom);
        setOffset(nextOffset);
        return;
      }

      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (Math.hypot(deltaX, deltaY) > 3) {
        drag.moved = true;
        // User took over the camera — stop auto-following for this journey.
        followDisabledRef.current = true;
      }

      const draggedOffset = clampOffset(
        { x: drag.startOffset.x + deltaX, y: drag.startOffset.y + deltaY },
        zoom,
      );
      // Pan imperatively: write the layer transforms straight to the DOM and keep
      // offsetRef in sync, but DON'T setState — that would re-render the whole
      // component every frame. The committed offset is set once on release.
      offsetRef.current = draggedOffset;
      writePanTransform(draggedOffset);
    },
    [clampOffset, mapSize, offset, view, zoom, writePanTransform],
  );

  const releasePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer may already be released
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current.active = false;
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const wasPinching = pinchRef.current.active;
      const drag = dragRef.current;
      releasePointer(event);

      if (wasPinching || pinchRef.current.active) {
        return;
      }
      if (drag.active && drag.pointerId === event.pointerId) {
        dragRef.current = { ...drag, active: false, pointerId: null };
        if (drag.moved) {
          // Commit the imperatively-panned offset to state now the drag is done.
          if (offsetRef.current) {
            setOffset(offsetRef.current);
          }
        } else {
          onTapRef.current(event.clientX, event.clientY);
        }
      }
    },
    [releasePointer, onTapRef],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      releasePointer(event);
      const drag = dragRef.current;
      if (drag.active && drag.pointerId === event.pointerId) {
        dragRef.current = { ...drag, active: false, pointerId: null };
        if (drag.moved && offsetRef.current) {
          setOffset(offsetRef.current);
        }
      }
    },
    [releasePointer],
  );

  // Responsive fit: measure the viewport, fit ~a quarter of the map on first
  // sight (centred on the figure), and keep the map covering the viewport on
  // later resizes.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width === 0 || height === 0) {
        return;
      }
      const nextView = { width, height };
      setView(nextView);
      viewRef.current = nextView;

      const cover = coverZoom(nextView, mapSize);

      if (!initializedRef.current) {
        initializedRef.current = true;
        const figure = playerRef.current ?? resizeFocus;
        const fit = Math.max(fitZoom(nextView, mapSize, DEFAULT_VISIBLE_FRACTION) * DEFAULT_ZOOM_BOOST, cover);
        baseZoomRef.current = fit;
        const centered = {
          x: clamp(width / 2 - figure.x * fit, width - mapSize.width * fit, 0),
          y: clamp(height / 2 - figure.y * fit, height - mapSize.height * fit, 0),
        };
        setZoom(fit);
        zoomRef.current = fit;
        setOffset(centered);
        offsetRef.current = centered;
        return;
      }

      if (zoomRef.current < cover) {
        const o = offsetRef.current ?? { x: 0, y: 0 };
        const clampedOffset = {
          x: clamp(o.x, width - mapSize.width * cover, 0),
          y: clamp(o.y, height - mapSize.height * cover, 0),
        };
        setZoom(cover);
        zoomRef.current = cover;
        setOffset(clampedOffset);
        offsetRef.current = clampedOffset;
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [mapSize, playerRef, resizeFocus]);

  return {
    view,
    zoom,
    offset,
    setZoom,
    setOffset,
    dragRef,
    viewportRef,
    mapImgRef,
    terrainImgRef,
    overlayRef,
    offsetRef,
    zoomRef,
    baseZoomRef,
    viewRef,
    followDisabledRef,
    clampOffset,
    mapToLayer,
    screenToMap,
    centerOnPlayer,
    cycleZoom,
    writePanTransform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
