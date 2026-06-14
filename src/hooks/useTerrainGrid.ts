import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, nearestTerrainId, TERRAIN, TERRAIN_TYPES, terrainImage } from "@/game";
import type { Point, Size, TerrainGrid, TerrainSample } from "@/game";

// Loads the terrain mask (map.gif) once, classifies every pixel into a compact
// id grid, and exposes an O(1) terrain lookup for any map point.
export function useTerrainGrid(mapSize: Size) {
  const terrainRef = useRef<TerrainGrid | null>(null);
  const [terrainReady, setTerrainReady] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = terrainImage;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return;
      }

      context.drawImage(image, 0, 0);

      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const { data } = context.getImageData(0, 0, width, height);
      // Classify once into a compact terrain-id grid; lookups are then O(1).
      const grid = new Uint8Array(width * height);
      for (let pixel = 0; pixel < grid.length; pixel += 1) {
        const offset = pixel * 4;
        grid[pixel] =
          data[offset + 3] < 16
            ? 0 // transparent -> plain
            : nearestTerrainId(data[offset], data[offset + 1], data[offset + 2]);
      }

      terrainRef.current = { width, height, grid };
      setTerrainReady(true);
    };

    return () => {
      image.onload = null;
    };
  }, []);

  const getTerrainAtPoint = useCallback(
    (point: Point): TerrainSample => {
      const terrain = terrainRef.current;
      if (!terrain) {
        return { ...TERRAIN.plain, cellKey: null };
      }
      const cellX = clamp(Math.floor((point.x / mapSize.width) * terrain.width), 0, terrain.width - 1);
      const cellY = clamp(
        Math.floor((point.y / mapSize.height) * terrain.height),
        0,
        terrain.height - 1,
      );
      const terrainType = TERRAIN_TYPES[terrain.grid[cellY * terrain.width + cellX]];
      return { ...terrainType, cellKey: `${cellX}:${cellY}` };
    },
    [mapSize],
  );

  return { terrainReady, getTerrainAtPoint };
}
