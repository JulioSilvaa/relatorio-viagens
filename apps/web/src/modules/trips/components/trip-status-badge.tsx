import { Badge } from "@/components/ui/badge";
import { getTripStatusMeta } from "@/lib/trip-status";
import type { TripStatus } from "@/types/domain";

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const meta = getTripStatusMeta(status);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 border-transparent ${meta.badgeClass}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
