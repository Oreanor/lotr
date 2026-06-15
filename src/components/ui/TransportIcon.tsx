import { TRANSPORT_ICONS, transportIconSrc } from "@/game";
import type { TransportId } from "@/game";

export function TransportIcon({
  transport,
  sailingWithCirdan = false,
  className = "size-5 object-contain",
}: {
  transport?: TransportId | null;
  sailingWithCirdan?: boolean;
  className?: string;
}) {
  const src = transport ? TRANSPORT_ICONS[transport] : transportIconSrc(null, sailingWithCirdan);
  return <img src={src} alt="" draggable={false} className={className} />;
}
