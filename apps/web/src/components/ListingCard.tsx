import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MapPin, Navigation } from "lucide-react";
import { ROUTES, route } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import type { Listing } from "@/types/api";
import { formatPriceShort, TYPE_LABELS } from "@/lib/format";
import { Rating, Tag } from "@/ui/badge";
import { HousePlaceholder } from "@/ui/icons";
import { toast } from "@/ui/toast";
import { addFavorite, removeFavorite } from "@/api/socialApi";
import { cn } from "@/lib/utils";

export interface DistanceBadgeProps {
  distanceKm: number;
  className?: string;
}

export function DistanceBadge({ distanceKm, className }: DistanceBadgeProps) {
  const kmFormatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(distanceKm);
  const minutes = Math.max(1, Math.round(distanceKm * 3));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-plate px-1.5 py-0.5 text-xs font-medium text-white",
        className
      )}
      title={`${kmFormatted} km tới trường (~${minutes} phút xe máy)`}
    >
      <Navigation className="size-3" aria-hidden />
      <span>{kmFormatted} km · ~{minutes}p xe</span>
    </span>
  );
}

export interface ListingCardProps {
  listing: Listing;
  onHover?: (id: number | null) => void;
  onFavToggle?: (l: Listing) => void;
  actionSlot?: React.ReactNode;
  className?: string;
}

export function ListingCard({
  listing,
  onHover,
  onFavToggle,
  actionSlot,
  className,
}: ListingCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localFav, setLocalFav] = useState(listing.is_favorited === true);
  const [prevFav, setPrevFav] = useState(listing.is_favorited);

  if (listing.is_favorited !== prevFav) {
    setPrevFav(listing.is_favorited);
    setLocalFav(listing.is_favorited === true);
  }

  const effectiveFav = onFavToggle ? listing.is_favorited === true : localFav;
  const typeLabel = TYPE_LABELS[listing.type ?? "room"] ?? "Phòng trọ";

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast("Vui lòng đăng nhập bằng tài khoản sinh viên để lưu phòng.");
      void navigate(ROUTES.LOGIN);
      return;
    }

    if (user.role !== "student") {
      toast("Chức năng lưu phòng chỉ dành cho tài khoản sinh viên.");
      return;
    }

    if (onFavToggle) {
      onFavToggle(listing);
      return;
    }

    // Fallback when onFavToggle is not provided (e.g. Home page)
    const next = !localFav;
    setLocalFav(next);
    try {
      if (next) {
        await addFavorite(listing.id);
        toast("Đã lưu phòng.");
      } else {
        await removeFavorite(listing.id);
        toast("Đã bỏ lưu phòng.");
      }
    } catch {
      setLocalFav(!next);
      toast("Không cập nhật được yêu thích. Bạn thử lại nhé.");
    }
  };

  return (
    <div
      data-testid={`listing-card-${listing.id}`}
      onMouseEnter={() => { onHover?.(listing.id); }}
      onMouseLeave={() => { onHover?.(null); }}
      className={cn(
        "group flex flex-col rounded-xl border border-line bg-card motion-card hover:border-line-strong hover:shadow-pop",
        className
      )}
    >
      <div className="relative aspect-3/2 w-full overflow-hidden rounded-t-xl bg-sunken">
        <Link
          to={route(ROUTES.ROOM_DETAIL, { id: listing.id })}
          tabIndex={-1}
          aria-hidden="true"
          className="block h-full w-full"
        >
          {listing.cover_image ? (
            <img
              src={listing.cover_image}
              alt=""
              loading="lazy"
              decoding="async"
              width={640}
              height={427}
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <HousePlaceholder />
          )}
        </Link>

        {/* Top-left: Type Tag */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          <Tag className="bg-paper/95 text-ink shadow-xs backdrop-blur-xs font-medium">
            {typeLabel}
          </Tag>
        </div>

        {/* Top-right: Favorite button */}
        <button
          type="button"
          aria-label={effectiveFav ? "Bỏ lưu phòng" : "Lưu phòng"}
          aria-pressed={effectiveFav}
          onClick={(e) => {
            void handleHeartClick(e);
          }}
          className={cn(
            "absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-card/90 shadow-xs backdrop-blur-xs transition hover:scale-110",
            effectiveFav ? "text-danger" : "text-ink hover:text-danger"
          )}
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              effectiveFav ? "fill-danger stroke-danger text-danger" : "stroke-ink hover:stroke-danger"
            )}
            aria-hidden
          />
        </button>

        {/* Bottom banner on photo: Flyer price tab + Distance badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-1.5">
          <span className="inline-flex items-center rounded bg-flyer px-2 py-0.5 text-sm font-bold text-ink shadow-xs">
            {formatPriceShort(listing.price)}
            <span className="ml-0.5 text-xs font-normal opacity-75">/th</span>
          </span>
          {listing.distance_km != null ? (
            <DistanceBadge distanceKm={listing.distance_km} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <Link
          to={route(ROUTES.ROOM_DETAIL, { id: listing.id })}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate rounded-xs"
        >
          <h3 className="line-clamp-1 text-base font-semibold text-ink group-hover:text-plate transition-colors">
            {listing.title}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5 flex-none text-muted" aria-hidden />
          <span className="line-clamp-1">
            {listing.address}
            {listing.ward ? `, ${listing.ward.name}` : ""}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-ink-2">
          <span>
            {listing.area_m2 != null ? `${listing.area_m2} m²` : ""}
          </span>
          <Rating value={listing.avg_rating} count={listing.reviews_count} />
        </div>

        {actionSlot ? (
          <div className="mt-3 pt-2.5 border-t border-line">
            {actionSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
