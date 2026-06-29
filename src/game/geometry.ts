// Pure map/viewport geometry extracted from the map component. No React.
import { clamp } from "@/game/rules";
import type { Point } from "@/game/types";

export interface Viewport {
  width: number;
  height: number;
}

// Edge-follow camera pan. Once the figure crosses the inner margin band near a
// viewport edge, return the new camera offset (clamped so the map never shows a
// gap), or null if the camera shouldn't move. Pure — no refs, no side effects.
export function followOffset(
  player: Point,
  offset: Point,
  zoom: number,
  view: Viewport,
  mapSize: { width: number; height: number },
  marginRatio: number,
): Point | null {
  const marginX = view.width * marginRatio;
  const marginY = view.height * marginRatio;
  const screenX = player.x * zoom + offset.x;
  const screenY = player.y * zoom + offset.y;
  let nextX = offset.x;
  let nextY = offset.y;

  if (screenX < marginX) {
    nextX = marginX - player.x * zoom;
  } else if (screenX > view.width - marginX) {
    nextX = view.width - marginX - player.x * zoom;
  }

  if (screenY < marginY) {
    nextY = marginY - player.y * zoom;
  } else if (screenY > view.height - marginY) {
    nextY = view.height - marginY - player.y * zoom;
  }

  if (nextX === offset.x && nextY === offset.y) {
    return null;
  }
  return {
    x: clamp(nextX, view.width - mapSize.width * zoom, 0),
    y: clamp(nextY, view.height - mapSize.height * zoom, 0),
  };
}
