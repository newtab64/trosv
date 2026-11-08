import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKm, travelMinutes } from "./travel";

/** "1,2 km · ~4p xe": distance to the chosen school and a scooter estimate. */
export function DistanceBadge({
  distanceKm,
  className,
}: {
  distanceKm: number;
  className?: string;
}) {
  const km = formatKm(distanceKm);
  const minutes = travelMinutes(distanceKm);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-plate px-1.5 py-0.5 text-xs font-medium text-white",
        className,
      )}
      title={`${km} km tới trường (~${minutes} phút xe máy)`}
    >
      <Navigation className="size-3" aria-hidden />
      <span>
        {km} km · ~{minutes}p xe
      </span>
    </span>
  );
}
