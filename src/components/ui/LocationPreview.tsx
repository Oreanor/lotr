import { useState } from "react";

// Landscape (4:3) location artwork shown on entering a town, cropped top/bottom
// via object-cover. A pulsing skeleton holds the space until the image loads,
// then it fades in. Remount (via key) per town. `initiallyLoaded` lets the
// caller skip the skeleton for already-preloaded art.
export function LocationPreview({
  src,
  alt,
  initiallyLoaded = false,
}: {
  src: string;
  alt: string;
  initiallyLoaded?: boolean;
}) {
  const [loaded, setLoaded] = useState(initiallyLoaded);
  return (
    <div className="relative mx-auto my-4 aspect-[4/3] w-full max-w-[400px] overflow-hidden rounded border border-neutral-700 bg-neutral-800">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-neutral-800" />}
      <img
        src={src}
        alt={alt}
        draggable="false"
        onLoad={() => setLoaded(true)}
        className={`size-full select-none object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
