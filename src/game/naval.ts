// Pure sea/sailing helpers extracted from the map component. No React.
import { HARBOR_IDS } from "@/game/constants";
import type { MapLocation, Point, TerrainSample } from "@/game/types";

type TerrainAt = (p: Point) => TerrainSample;

// True open sea: all four orthogonal neighbours (each `step` px away) are water,
// so a river crossing (land on the banks) doesn't count. Pure — the caller hands
// in the terrain sampler.
export function isOpenSea(point: Point, step: number, terrainAt: TerrainAt): boolean {
  return [
    { x: point.x + step, y: point.y },
    { x: point.x - step, y: point.y },
    { x: point.x, y: point.y + step },
    { x: point.x, y: point.y - step },
  ].every((p) => terrainAt(p).name === "water");
}

// Cells a boarded ship may step onto (losing the ship): every harbour, plus any
// coastal city — one whose cell has open water on a neighbouring cell. Only real
// harbours sell passage back out, so a coastal landing strands the party ashore
// on purpose. Pure — the caller hands in the terrain sampler and cell size.
export function computeLandfallCells(
  locations: MapLocation[],
  terrainAt: TerrainAt,
  neighborCell: number,
): Set<string> {
  const cells = new Set<string>();
  for (const location of locations) {
    const key = terrainAt(location.point).cellKey;
    if (!key) {
      continue;
    }
    if (HARBOR_IDS.has(location.id)) {
      cells.add(key);
      continue;
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const neighbor = terrainAt({
          x: location.point.x + dx * neighborCell,
          y: location.point.y + dy * neighborCell,
        });
        if (neighbor.name === "water") {
          cells.add(key);
        }
      }
    }
  }
  return cells;
}
