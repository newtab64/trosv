import { ListingCard } from "@/features/listings/components/ListingCard";
import { ListingCardSkeleton } from "@/features/listings/components/ListingCardSkeleton";
import { Button } from "@/shared/ui/button";
import { EmptyState, ErrorState } from "@/shared/ui/empty-state";
import { SearchEmptyIllustration } from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import type { Listing } from "@/shared/types/api";

export interface ListingResultsProps {
  loading: boolean;
  error: string | null | undefined;
  listings: Listing[];
  onHover: (id: number | null) => void;
  onFavoriteToggle: (listing: Listing) => void;
  onResetFilters: () => void;
  /** Extra explanation when the empty result is expected (e.g. a far school). */
  emptyHint?: string | undefined;
  /** No map beside the list (desktop): use the full width with more columns. */
  wide?: boolean;
}

/** The result grid, or its loading skeleton, error or empty state. */
export function ListingResults({
  loading,
  error,
  listings,
  onHover,
  onFavoriteToggle,
  onResetFilters,
  emptyHint,
  wide = false,
}: ListingResultsProps) {
  const grid = cn("grid grid-cols-1 gap-4 sm:grid-cols-2", wide && "lg:grid-cols-3 xl:grid-cols-4");
  if (loading) {
    return (
      <div className={grid}>
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <ErrorState message={error} />
      </div>
    );
  }
  if (listings.length === 0) {
    return (
      <div>
        <EmptyState
          illustration={<SearchEmptyIllustration />}
          title="Chưa có phòng nào khớp bộ lọc"
          description={emptyHint ?? "Thử nới khoảng giá hoặc chọn trường khác để xem thêm phòng."}
          action={
            <Button variant="outline" onClick={onResetFilters}>
              Xóa bộ lọc
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div className={cn("motion-stagger", grid)}>
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} onHover={onHover} onFavToggle={onFavoriteToggle} />
      ))}
    </div>
  );
}
