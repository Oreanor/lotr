import { useState } from "react";
import { createPortal } from "react-dom";
import { LocationPreview } from "@/components/ui/LocationPreview";

// A 4:3 preview thumbnail that opens a full-screen lightbox on click. Remount
// (via a `key` on the source) to reset the open state when the image changes.
export function ZoomableImage({
  src,
  alt,
  initiallyLoaded,
  className,
}: {
  src: string;
  alt: string;
  initiallyLoaded?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <LocationPreview
        src={src}
        alt={alt}
        initiallyLoaded={initiallyLoaded}
        onOpen={() => setOpen(true)}
        className={className}
      />
      {open &&
        createPortal(
          <div
            className="modal-overlay fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setOpen(false)}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="inline-flex max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] overflow-hidden rounded border-2 border-amber-700 bg-neutral-950 p-1 shadow-2xl shadow-black/60">
              <img
                src={src}
                alt={alt}
                draggable="false"
                className="max-h-[calc(100dvh-2.75rem)] max-w-[calc(100dvw-2.75rem)] select-none object-contain md:h-[calc(100dvh-2.75rem)] md:w-auto"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
