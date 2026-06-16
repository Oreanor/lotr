// Splash shown before a fresh game: Gandalf offering the One Ring on his open
// palm. Click the palm/ring to begin. The image is shown whole (object-contain)
// inside a shrink-wrapped box so the (invisible) clickable region stays over the
// hand on any screen.
export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#020202]">
      <div className="relative">
        <img
          src="/gandalf.jpg"
          alt=""
          draggable="false"
          className="block h-screen w-auto max-w-none select-none object-cover"
        />

        <h1 className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[120px] font-bold leading-none text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">
          lotr
        </h1>

        {/* Invisible hotspot over Gandalf's open palm with the Ring. */}
        <button
          type="button"
          onClick={onStart}
          aria-label="Start"
          title="lotr"
          style={{ left: "34.75%", top: "68.2%", width: "15%", height: "16%" }}
          className="absolute cursor-pointer rounded-[50%]"
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-neutral-500">
        © 2026 Oreanor Aurgilion
      </p>
    </div>
  );
}
