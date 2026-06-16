// Side-effecting browser helpers: speed persistence and image preloading.
import { ANIMATION_SPEEDS, SPEED_STORAGE_KEY } from "@/game/constants";
import type { SavedSpeeds } from "@/game/types";

export function readSavedSpeed(kind: keyof SavedSpeeds): number {
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    if (!raw) {
      return 1;
    }
    const value = (JSON.parse(raw) as SavedSpeeds)[kind];
    return typeof value === "number" && ANIMATION_SPEEDS.includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

export function writeSavedSpeed(kind: keyof SavedSpeeds, value: number) {
  try {
    const raw = localStorage.getItem(SPEED_STORAGE_KEY);
    const prev: SavedSpeeds = raw ? (JSON.parse(raw) as SavedSpeeds) : {};
    localStorage.setItem(SPEED_STORAGE_KEY, JSON.stringify({ ...prev, [kind]: value }));
  } catch {
    // ignore storage errors
  }
}

export const preloadedLocationImages = new Set<string>();
const preloadedImages = new Set<string>();

export function preloadImage(src: string): void {
  if (preloadedImages.has(src)) {
    return;
  }
  const img = new Image();
  img.onload = () => {
    preloadedImages.add(src);
  };
  img.onerror = () => {
    preloadedImages.add(src);
  };
  img.src = src;
}

export function preloadLocationImage(src: string): Promise<void> {
  if (preloadedLocationImages.has(src)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedLocationImages.add(src);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}
