import { useEffect, useRef, useState, type ReactNode } from "react";

const TRANSITION_MS = 150;

// Shared overlay + dialog shell for every modal. Animates in and out (fade +
// 95%→100% scale) driven by `open`, and keeps the last content visible during
// the close transition so data-driven modals don't blank out mid-fade. Stops
// pointer events from leaking to the map underneath.
export function Modal({
  open,
  children,
  className,
  overlayClassName = "bg-black/70",
  z = "z-50",
  align = "center",
}: {
  open: boolean;
  children: ReactNode;
  className: string;
  overlayClassName?: string;
  z?: string;
  align?: "center" | "top";
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const lastChildren = useRef<ReactNode>(null);
  if (open) {
    lastChildren.current = children;
  }

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 ${z} flex justify-center ${overlayClassName} p-6 transition-opacity duration-150 ${
        align === "top" ? "items-start pt-8" : "items-center"
      } ${shown ? "opacity-100" : "opacity-0"}`}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`rounded border bg-neutral-900 shadow-2xl transition duration-150 ${
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } ${className}`}
      >
        {lastChildren.current}
      </div>
    </div>
  );
}
