import type { ReactNode } from "react";

// Hover/focus popup explaining a HUD icon (food, mount, cloaks, …). The bubble
// drops below the icon so it never clips off the top edge of the screen.
export function HoverHint({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`} aria-label={label}>
      {children}
      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[60vw] whitespace-normal rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-normal leading-snug text-neutral-200 shadow-lg group-hover:block">
        {label}
      </span>
    </span>
  );
}
