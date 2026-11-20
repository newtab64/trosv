import { Map as MapIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES, route } from "@/shared/constants/routes";
import { ListingMap } from "@/features/listings/components/ListingMap";
import { cn } from "@/shared/lib/utils";
import type { SearchState } from "../lib/types";
import type { MobileTab } from "./MobileViewToggle";

/** Desktop only ("Ẩn bản đồ" / "Hiện bản đồ"): the phone has its own list/map switch. */
export function MapVisibilityButton({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      className={
        "hidden items-center gap-1 rounded-md border border-line bg-card px-2.5 py-1 " +
        "text-xs font-semibold text-ink shadow-2xs hover:bg-tint lg:inline-flex " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
      }
    >
      <MapIcon className="size-3.5 text-muted" aria-hidden />
      {hidden ? "Hiện bản đồ" : "Ẩn bản đồ"}
    </button>
  );
}

export interface SearchMapPaneProps {
  search: SearchState;
  mobileTab: MobileTab;
  /** Desktop: the user hid the map. */
  hidden: boolean;
  hoveredListing: number | null;
  onHover: (id: number | null) => void;
}

/** The map column: on desktop unless hidden, on phones only on the map tab. */
export function SearchMapPane({
  search,
  mobileTab,
  hidden,
  hoveredListing,
  onHover,
}: SearchMapPaneProps) {
  const navigate = useNavigate();
  // Not mounted at all when neither applies, so a hidden map loads no tiles.
  if (hidden && mobileTab === "list") return null;

  const selectedSchool = search.filters.school_id
    ? search.schools.find((s) => String(s.id) === search.filters.school_id) ?? null
    : null;
  const radiusKm = search.filters.max_km ? Number(search.filters.max_km) : null;

  return (
    <div
      data-testid="map-pane"
      className={cn(
        "animate-fade-in lg:animate-none lg:order-1",
        mobileTab === "map" ? "block h-[calc(100dvh-var(--nav-h)-115px)] w-full" : "hidden",
        hidden ? "lg:hidden" : "lg:block",
      )}
    >
      <div
        className={
          "h-full w-full lg:sticky lg:top-[calc(var(--nav-h)+55px)] " +
          "lg:h-[calc(100vh-var(--nav-h)-55px)]"
        }
      >
        <ListingMap
          listings={search.mapListings.length > 0 ? search.mapListings : search.listings}
          selectedId={hoveredListing}
          onSelect={(id) => {
            void navigate(route(ROUTES.ROOM_DETAIL, { id }));
          }}
          onHover={onHover}
          hasLocationFilter={Boolean(
            search.filters.city_id || search.filters.ward_id || search.filters.school_id,
          )}
          school={selectedSchool}
          radiusKm={radiusKm}
          ariaLabel="Bản đồ phòng trọ"
        />
      </div>
    </div>
  );
}
