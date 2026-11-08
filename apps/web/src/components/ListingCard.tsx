import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ROUTES, route } from "@/constants/routes";
import type { Listing } from "@/types/api";
import { formatVnd, TYPE_LABELS } from "@/lib/format";
import { Rating, Tag } from "@/ui/badge";
import { cn } from "@/lib/utils";
import { CardPhoto } from "./listing-card/CardPhoto";
import { DistanceBadge } from "./listing-card/DistanceBadge";
import { FavoriteButton } from "./listing-card/FavoriteButton";
import { useCardFavorite } from "./listing-card/useCardFavorite";

export interface ListingCardProps {
  listing: Listing;
  onHover?: (id: number | null) => void;
  onFavToggle?: (l: Listing) => void;
  actionSlot?: ReactNode;
  className?: string;
}

function CardDetails({ listing }: { listing: Listing }) {
  return (
    <>
      <Link
        to={route(ROUTES.ROOM_DETAIL, { id: listing.id })}
        /* Stretched link: the whole card opens the room. Controls sit above it (z-10). */
        className="rounded-xs after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-plate"
      >
        <h3 className="line-clamp-2 min-h-10 text-base font-bold leading-tight text-ink group-hover:text-plate transition-colors">
          {listing.title}
        </h3>
      </Link>

      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted">
        <MapPin className="size-3.5 flex-none text-muted" aria-hidden />
        <span className="line-clamp-1">
          {listing.address}
          {listing.ward ? `, ${listing.ward.name}` : ""}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-2">
        {listing.area_m2 != null ? (
          <span className="rounded-full bg-tint px-2.5 py-1 font-semibold text-ink-2">
            {listing.area_m2} m²
          </span>
        ) : (
          <span />
        )}
        <Rating value={listing.avg_rating} count={listing.reviews_count} />
      </div>
    </>
  );
}

export function ListingCard({
  listing,
  onHover,
  onFavToggle,
  actionSlot,
  className,
}: ListingCardProps) {
  const fav = useCardFavorite(listing, onFavToggle);
  const typeLabel = TYPE_LABELS[listing.type ?? "room"] ?? "Phòng trọ";

  return (
    <div
      data-testid={`listing-card-${listing.id}`}
      onMouseEnter={() => {
        onHover?.(listing.id);
      }}
      onMouseLeave={() => {
        onHover?.(null);
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border border-line bg-card shadow-card motion-card hover:border-line-strong hover:shadow-card-hover",
        className,
      )}
    >
      <div className="relative aspect-3/2 w-full overflow-hidden rounded-t-xl bg-sunken">
        <CardPhoto listingId={listing.id} src={listing.cover_image} />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          <Tag className="bg-paper/95 text-ink shadow-xs backdrop-blur-xs font-medium">
            {typeLabel}
          </Tag>
        </div>

        <FavoriteButton
          isFavorite={fav.isFavorite}
          pop={fav.pop}
          onClick={(e) => {
            void fav.onHeartClick(e);
          }}
          onPopEnd={fav.endPop}
        />

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-1.5">
          <span className="inline-flex items-center rounded bg-flyer px-2 py-0.5 text-sm font-bold text-ink shadow-xs">
            {formatVnd(listing.price)}
            <span className="ml-0.5 text-xs font-normal opacity-75">/th</span>
          </span>
          {listing.distance_km != null ? <DistanceBadge distanceKm={listing.distance_km} /> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <CardDetails listing={listing} />
        {actionSlot ? (
          <div className="relative z-10 mt-3 pt-2.5 border-t border-line">{actionSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
