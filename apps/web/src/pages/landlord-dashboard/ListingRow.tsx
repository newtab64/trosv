import { Link, useNavigate } from "react-router-dom";
import { Edit3, ExternalLink, MapPin, Trash2 } from "lucide-react";
import { ROUTES, route } from "@/constants/routes";
import { Button } from "@/ui/button";
import { Rating } from "@/ui/badge";
import { HousePlaceholder } from "@/ui/icons";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/api";
import { statusDotClass, statusLabel, statusPillClass } from "./listingStatus";

function Thumbnail({ listing: l }: { listing: Listing }) {
  return (
    <div className="relative aspect-3/2 w-full sm:w-48 sm:shrink-0 overflow-hidden bg-tint">
      {l.cover_image ? (
        <img
          src={l.cover_image}
          alt={l.title}
          width={320}
          height={213}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <HousePlaceholder />
      )}
      <div className="absolute top-2 left-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-xs backdrop-blur-xs",
            statusPillClass(l.status),
          )}
        >
          <span
            className={cn("inline-block size-1.5 rounded-full", statusDotClass(l.status))}
            aria-hidden
          />
          {statusLabel(l.status)}
        </span>
      </div>
    </div>
  );
}

function Details({ listing: l }: { listing: Listing }) {
  return (
    <div>
      <Link
        to={route(ROUTES.ROOM_DETAIL, { id: l.id })}
        className="line-clamp-2 min-h-[2.75rem] font-semibold text-ink text-base hover:text-plate hover:underline transition-colors leading-snug"
        title={l.title}
      >
        {l.title}
      </Link>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-bold text-ink tabular-nums text-base">
          {formatVnd(l.price)}
          <span className="text-xs font-normal text-muted">/tháng</span>
        </span>
        {l.area_m2 != null ? (
          <span className="text-xs font-medium text-muted">· {l.area_m2} m²</span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-muted flex items-center gap-1">
        <MapPin className="size-3 shrink-0" aria-hidden />
        <span>{l.address}</span>
      </p>
      <Rating value={l.avg_rating} count={l.reviews_count} className="mt-2 text-xs" />
    </div>
  );
}

/** One listing on the dashboard: photo and status, details, and view / edit / delete. */
export function ListingRow({
  listing: l,
  onDelete,
}: {
  listing: Listing;
  onDelete: (listing: Listing) => void;
}) {
  const navigate = useNavigate();
  return (
    <div
      data-testid="listing-row"
      className="group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-line bg-card shadow-xs transition-all hover:border-line-strong hover:shadow-sm"
    >
      <Thumbnail listing={l} />
      <div className="flex flex-1 flex-col justify-between p-4 min-w-0">
        <Details listing={l} />
        <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
          <Link
            to={route(ROUTES.ROOM_DETAIL, { id: l.id })}
            className="text-xs font-medium text-plate hover:underline flex items-center gap-1"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            <span>Xem tin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigate(route(ROUTES.LANDLORD_EDIT, { id: l.id }));
              }}
              className="h-8 px-2.5 text-xs flex items-center gap-1"
            >
              <Edit3 className="size-3.5" aria-hidden />
              <span>Sửa</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              data-testid="delete-listing"
              className="h-8 px-2.5 text-xs text-danger hover:bg-danger/10 flex items-center gap-1"
              onClick={() => {
                onDelete(l);
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span>Xóa</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
