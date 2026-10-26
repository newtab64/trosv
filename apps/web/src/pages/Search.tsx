import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES, route } from "@/constants/routes";
import { useListingSearch } from "@/hooks/useListingSearch";
import type { Listing } from "@/types/api";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/badge";
import { ErrorState, EmptyState } from "@/ui/empty-state";
import { SearchEmptyIllustration } from "@/ui/icons";
import { ListingMap } from "@/components/ListingMap";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { ListingCard } from "@/components/ListingCard";
import { X, ChevronDown, Map as MapIcon, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { addFavorite, removeFavorite } from "@/api/socialApi";
import { toast } from "@/ui/toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatPriceShort } from "@/lib/format";
import { SearchFilterBar, TYPE_OPTIONS } from "./search/SearchFilterBar";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp trước" },
  { value: "price_desc", label: "Giá cao trước" },
  { value: "rating", label: "Đánh giá cao trước" },
] as const;

export default function Search() {
  const navigate = useNavigate();
  useDocumentTitle("Tìm phòng · TROSV");
  const search = useListingSearch();
  const [mobileTab, setMobileTab] = useState<"list" | "map">("list");
  const [hoveredListing, setHoveredListing] = useState<number | null>(null);
  const { user } = useAuth();

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search.filters.q) {
      chips.push({
        key: "q",
        label: `"${search.filters.q}"`,
        onRemove: () => { search.setFilter("q", ""); },
      });
    }
    if (search.filters.type) {
      const t = TYPE_OPTIONS.find((o) => o.value === search.filters.type);
      if (t) {
        chips.push({ key: "type", label: t.label, onRemove: () => { search.setFilter("type", ""); } });
      }
    }
    if (search.filters.city_id) {
      const c = search.cities.find((x) => String(x.id) === search.filters.city_id);
      if (c) {
        chips.push({
          key: "city_id",
          label: c.name,
          onRemove: () => { search.setCity(""); },
        });
      }
    }
    if (search.filters.ward_id) {
      const w = search.wards.find((x) => String(x.id) === search.filters.ward_id);
      if (w) {
        chips.push({
          key: "ward_id",
          label: w.name,
          onRemove: () => { search.setWard(""); },
        });
      }
    }
    if (search.filters.price_min || search.filters.price_max) {
      const min = search.filters.price_min ? formatPriceShort(Number(search.filters.price_min)) : "";
      const max = search.filters.price_max ? formatPriceShort(Number(search.filters.price_max)) : "";
      const priceLabel =
        search.filters.price_min && search.filters.price_max
          ? `${min} – ${max}`
          : search.filters.price_min
          ? `Từ ${min}`
          : `Dưới ${max}`;
      chips.push({
        key: "price",
        label: priceLabel,
        onRemove: () => {
          search.setFilter("price_min", "");
          search.setFilter("price_max", "");
        },
      });
    }
    if (search.filters.school_id) {
      const s = search.schools.find((x) => String(x.id) === search.filters.school_id);
      if (s) {
        chips.push({ key: "school_id", label: s.name, onRemove: () => { search.setFilter("school_id", ""); } });
      }
    }
    return chips;
  }, [search]);

  async function toggleFavorite(listing: Listing): Promise<void> {
    if (!user) {
      toast("Vui lòng đăng nhập bằng tài khoản sinh viên để lưu phòng.");
      void navigate(ROUTES.LOGIN);
      return;
    }
    if (user.role !== "student") {
      toast("Chức năng lưu phòng chỉ dành cho tài khoản sinh viên.");
      return;
    }
    const wasFav = listing.is_favorited === true;
    search.setListings((rows) =>
      rows.map((r) =>
        r.id === listing.id ? { ...r, is_favorited: !wasFav } : r
      )
    );
    try {
      if (wasFav) {
        await removeFavorite(listing.id);
        toast("Đã bỏ lưu phòng.");
      } else {
        await addFavorite(listing.id);
        toast("Đã lưu phòng.");
      }
    } catch {
      search.setListings((rows) =>
        rows.map((r) =>
          r.id === listing.id ? { ...r, is_favorited: wasFav } : r
        )
      );
      toast("Không cập nhật được yêu thích. Bạn thử lại nhé.");
    }
  }

  const onHover = useCallback((id: number | null) => { setHoveredListing(id); }, []);
  const totalCount = search.meta?.total ?? search.listings.length;

  const areaName = (() => {
    const ward = search.wards.find((x) => String(x.id) === search.filters.ward_id);
    if (ward) return ward.name;
    const school = search.schools.find((x) => String(x.id) === search.filters.school_id);
    if (school) return school.name;
    const city = search.cities.find((x) => String(x.id) === search.filters.city_id);
    if (city) return city.name;
    return null;
  })();

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === search.filters.sort)?.label ?? "Mới nhất";

  return (
    <div className="flex min-h-[calc(100svh-var(--nav-h))] flex-col bg-paper">
      {/* Sticky top filter bar */}
      <SearchFilterBar
        search={search}
        showMap={mobileTab === "map"}
        onToggleMap={() => { setMobileTab((t) => (t === "list" ? "map" : "list")); }}
        onSaveSearch={() => { toast("Đã lưu tiêu chí tìm kiếm vào bộ nhớ trình duyệt."); }}
      />

      {/* Result metadata + Active filter chips */}
      <div className="border-b border-line bg-paper/50 px-4 py-2.5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-semibold text-ink">
            {search.loading ? (
              <span className="text-muted">Đang tìm phòng…</span>
            ) : (
              <>
                <span className="tabular-nums">{totalCount}</span> phòng trọ
                {areaName ? (
                  <span className="font-normal text-muted"> tại {areaName}</span>
                ) : null}
              </>
            )}
          </p>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted hidden sm:inline">Sắp xếp:</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={
                    "inline-flex items-center gap-1 rounded-md border border-line bg-card " +
                    "px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs hover:bg-tint " +
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate"
                  }
                >
                  <span>{currentSortLabel}</span>
                  <ChevronDown className="size-3.5 text-muted" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { search.setFilter("sort", opt.value); }}
                    className={cn(
                      "w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors",
                      search.filters.sort === opt.value
                        ? "bg-plate-tint font-bold text-plate"
                        : "text-ink hover:bg-tint"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active chips */}
        {activeChips.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/60">
            <span className="text-xs text-muted">Đang lọc theo:</span>
            {activeChips.map((c) => (
              <span
                key={c.key}
                className={
                  "inline-flex items-center gap-1 rounded-full border border-plate/30 " +
                  "bg-card px-2.5 py-0.5 text-xs font-medium text-plate shadow-2xs"
                }
              >
                <span>{c.label}</span>
                <button
                  type="button"
                  onClick={c.onRemove}
                  aria-label={`Bỏ lọc ${c.label}`}
                  className={
                    "flex size-4 items-center justify-center rounded-full text-muted " +
                    "hover:text-ink hover:bg-line"
                  }
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Split view: List | Map (Responsive Desktop Split + Mobile Tab) */}
      <div className="flex flex-1 flex-col pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,50%)]">
        {/* Listings column: Always on desktop, conditional on mobile */}
        <div
          className={cn(
            "px-4 pb-20 lg:order-2 lg:px-6 lg:pb-16",
            mobileTab === "map" ? "hidden lg:block" : "block"
          )}
        >
          {search.loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          ) : search.error ? (
            <div>
              <ErrorState message={search.error} />
            </div>
          ) : search.listings.length === 0 ? (
            <div>
              <EmptyState
                illustration={<SearchEmptyIllustration />}
                title="Chưa có phòng nào khớp bộ lọc"
                description="Thử nới khoảng giá hoặc chọn trường khác để xem thêm phòng."
                action={
                  <Button variant="outline" onClick={search.resetFilters}>
                    Xóa bộ lọc
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {search.listings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onHover={onHover}
                  onFavToggle={(l) => { void toggleFavorite(l); }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {search.meta != null && (search.meta.last_page ?? 0) > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-1.5">
              {Array.from({ length: search.meta.last_page ?? 0 }, (_, i) => i + 1)
                .slice(Math.max(0, (search.page || 1) - 2), Math.max(0, (search.page || 1) - 2) + 5)
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { search.setPage(p); }}
                    aria-current={p === search.page ? "page" : undefined}
                    className={cn(
                      "size-9 rounded-lg text-sm font-semibold tabular-nums transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate",
                      p === search.page
                        ? "bg-plate text-white"
                        : "border border-line-strong bg-card text-ink hover:bg-tint"
                    )}
                  >
                    {p}
                  </button>
                ))}
            </div>
          ) : null}
        </div>

        {/* Map column: Always on desktop, conditional on mobile */}
        <div
          className={cn(
            "lg:order-1 lg:block",
            mobileTab === "map" ? "block h-[calc(100dvh-var(--nav-h)-115px)] w-full" : "hidden lg:block"
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
              hasLocationFilter={Boolean(search.filters.city_id || search.filters.ward_id || search.filters.school_id)}
              ariaLabel="Bản đồ phòng trọ"
            />
          </div>
        </div>
      </div>

      {/* Mobile Floating View Toggle Button */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <button
          type="button"
          onClick={() => { setMobileTab((tab) => (tab === "list" ? "map" : "list")); }}
          className={
            "flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold " +
            "text-white shadow-pop transition hover:scale-105 active:scale-95"
          }
        >
          {mobileTab === "list" ? (
            <>
              <MapIcon className="size-4 text-flyer" />
              <span>Xem bản đồ</span>
            </>
          ) : (
            <>
              <ListIcon className="size-4 text-flyer" />
              <span>Xem danh sách</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
