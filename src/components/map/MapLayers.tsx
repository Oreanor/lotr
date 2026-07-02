import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import * as G from "@/game";
import type { Character, MapLocation, Point, Size, Squad } from "@/game";

// The visual map layers that sit inside the interactive viewport: the background
// map image, the optional terrain overlay, the camera-tracked overlay of markers
// / squads / target ping / hero-path / the party figure, and the map-swap spinner.
// The container owns the viewport shell (refs + pointer handlers) and the camera;
// this is pure presentation driven by the current transform and layer data.
export function MapLayers({
  mapImgRef,
  terrainImgRef,
  overlayRef,
  figureRef,
  panOffset,
  zoom,
  mapSize,
  mapIndex,
  showTerrain,
  terrainReady,
  mapLoading,
  locationMarkers,
  squads,
  mapToLayer,
  charName,
  canSwitchSquads,
  onFocusSquad,
  targetLayer,
  showHeroPath,
  heroPathLayer,
  figureCharacter,
  playerLayer,
  isMoving,
  target,
  currentLocation,
  onOpenLocation,
  onOpenParty,
}: {
  mapImgRef: ComponentProps<"img">["ref"];
  terrainImgRef: ComponentProps<"img">["ref"];
  overlayRef: ComponentProps<"div">["ref"];
  figureRef: ComponentProps<"button">["ref"];
  panOffset: { x: number; y: number };
  zoom: number;
  mapSize: Size;
  mapIndex: number;
  showTerrain: boolean;
  terrainReady: boolean;
  mapLoading: boolean;
  locationMarkers: ReactNode;
  squads: Squad[];
  mapToLayer: (point: Point) => { x: number; y: number };
  charName: (id: string) => string;
  canSwitchSquads: boolean;
  onFocusSquad: (id: string) => void;
  targetLayer: { x: number; y: number } | null;
  showHeroPath: boolean;
  heroPathLayer: { x: number; y: number }[];
  figureCharacter: Character | null | undefined;
  playerLayer: { x: number; y: number };
  isMoving: boolean;
  target: unknown | null;
  currentLocation: MapLocation | null;
  onOpenLocation: (location: MapLocation) => void;
  onOpenParty: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <img
        ref={mapImgRef}
        alt="Middle-earth map"
        draggable="false"
        src={G.MAP_VARIANTS[mapIndex] ?? G.mapImage}
        className="absolute left-0 top-0 max-w-none select-none"
        style={{
          width: mapSize.width,
          height: mapSize.height,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      />
      {/* Terrain overlay only mounts when enabled — otherwise its mix-blend
          layer would keep re-compositing every frame for nothing. (The warm
          sepia tone is baked into the map art itself, so no tint layer here.) */}
      {showTerrain && terrainReady && (
        <img
          ref={terrainImgRef}
          alt="Terrain overlay"
          draggable="false"
          src={G.terrainImage}
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none [image-rendering:pixelated] mix-blend-multiply"
          style={{
            width: mapSize.width,
            height: mapSize.height,
            opacity: G.TERRAIN_OVERLAY_OPACITY,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
      )}

      {/* Overlay layer: only the container's translate tracks the camera each
          frame, so markers/figure aren't re-projected on pan. Children sit at
          point×zoom (constant pixel size — no scale on this layer). */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "0 0" }}
      >
        {locationMarkers}

        {squads.map((squad) => {
          const lead = G.CHARACTERS.find((c) => c.id === squad.members[0]);
          if (!lead) {
            return null;
          }
          const pos = mapToLayer(squad.point);
          const label = squad.members.map((id) => charName(id)).join(", ");
          const canTake = canSwitchSquads;
          return (
            <button
              key={squad.id}
              type="button"
              title={label}
              aria-label={t("ui.switchToSquad", { members: label })}
              disabled={!canTake}
              className="pointer-events-auto absolute z-20 size-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-amber-300 bg-parchment shadow-lg disabled:cursor-default"
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (canTake) {
                  onFocusSquad(squad.id);
                }
              }}
            >
              <img src={lead.icon} alt="" className="size-full object-cover grayscale" />
              {squad.members.length > 1 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border border-amber-200 bg-neutral-900 text-[10px] font-bold leading-none text-amber-200">
                  {squad.members.length}
                </span>
              )}
            </button>
          );
        })}

        {targetLayer && (
          <div
            className="pointer-events-none absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2"
            style={{ left: targetLayer.x, top: targetLayer.y }}
            aria-hidden="true"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-green-500/70" />
            <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-green-500 shadow" />
          </div>
        )}

        {showHeroPath && heroPathLayer.length > 1 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 z-[25] overflow-visible"
            aria-hidden="true"
          >
            <polyline
              points={heroPathLayer.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#c9a227"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </svg>
        )}

        <button
          ref={figureRef}
          type="button"
          aria-label={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
          title={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
          className="pointer-events-auto absolute z-30 size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{ left: playerLayer.x, top: playerLayer.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (!isMoving && !target && currentLocation) {
              onOpenLocation(currentLocation);
              return;
            }
            // Show the whole group at a glance first; pick a hero from there.
            onOpenParty();
          }}
        >
          <img
            src={figureCharacter?.icon ?? G.PLAYER_ICON}
            alt=""
            draggable="false"
            // Thin gold silhouette outline marks the active group's figure (8
            // directions for a solid edge); the last shadow lifts it off the map.
            className="size-full select-none object-contain [filter:drop-shadow(1px_0_0_#fcd34d)_drop-shadow(-1px_0_0_#fcd34d)_drop-shadow(0_1px_0_#fcd34d)_drop-shadow(0_-1px_0_#fcd34d)_drop-shadow(1px_1px_0_#fcd34d)_drop-shadow(-1px_1px_0_#fcd34d)_drop-shadow(1px_-1px_0_#fcd34d)_drop-shadow(-1px_-1px_0_#fcd34d)_drop-shadow(0_1px_3px_rgba(0,0,0,0.75))]"
          />
        </button>
      </div>

      {/* Loading the next background map: dim + spinner over a locked map until
          it's fetched, so the swap is instant and input can't fight it. */}
      {mapLoading && (
        <div
          className="modal-overlay absolute inset-0 z-[45] flex items-center justify-center bg-black/50"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <Loader2 className="size-10 animate-spin text-neutral-200" />
        </div>
      )}
    </>
  );
}
