import { useEffect, useRef, useState, type ReactNode } from "react";

const TRANSITION_MS = 150;

// Elements that should receive focus when trapping Tab inside an open dialog.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared overlay + dialog shell for every modal. Animates in and out (fade +
// 95%→100% scale) driven by `open`, and keeps the last content visible during
// the close transition so data-driven modals don't blank out mid-fade.
//
// While open it swallows pointer events so they never leak to the map. Crucially,
// the instant it starts closing (or before the first paint when opening) the
// overlay goes `pointer-events-none` — otherwise it keeps half-catching a pan/
// zoom gesture during the 150ms fade and the map camera jumps around.
//
// Opt in to `onClose` to get Escape-to-close and click-outside; the dialog also
// pulls focus in on open and traps Tab within itself.
export function Modal({
  open,
  children,
  className,
  overlayClassName = "bg-black/70",
  z = "z-50",
  align = "center",
  onClose,
}: {
  open: boolean;
  children: ReactNode;
  className: string;
  overlayClassName?: string;
  z?: string;
  align?: "center" | "top";
  // When provided, Escape and a click on the backdrop dismiss the modal.
  onClose?: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const lastChildren = useRef<ReactNode>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
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

  // Once fully shown: pull focus into the dialog, then keep Tab (and Escape)
  // contained. Listening on the dialog node (not window) means a stacked child
  // modal handles the keys first and stops them reaching the parent.
  useEffect(() => {
    if (!shown) {
      return undefined;
    }
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
    (focusable()[0] ?? dialog).focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      event.stopPropagation();
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`modal-overlay absolute inset-0 ${z} flex cursor-default justify-center ${overlayClassName} p-4 transition-opacity duration-150 ${
        align === "top" ? "items-start pt-4" : "items-center"
      } ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        // A press that starts on the backdrop itself (not the dialog) dismisses.
        if (onClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`rounded border bg-neutral-900 shadow-2xl outline-none transition duration-150 ${
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } ${className}`}
      >
        {lastChildren.current}
      </div>
    </div>
  );
}
