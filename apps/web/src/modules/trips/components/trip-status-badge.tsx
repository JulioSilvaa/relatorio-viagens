import { Badge } from "@/components/ui/badge";
import { getTripStatusMeta } from "@/lib/trip-status";
import type { TripStatus } from "@/types/domain";

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const meta = getTripStatusMeta(status);

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 border-transparent ${meta.badgeClass}`}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </Badge>
  );
}
