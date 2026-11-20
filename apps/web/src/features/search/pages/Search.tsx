import { useCallback, useMemo, useState } from "react";
import { useListingSearch } from "@/features/search/hooks/useListingSearch";
import { cn } from "@/shared/lib/utils";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { ActiveChips } from "../components/ActiveChips";
import { ListingResults } from "../components/ListingResults";
import { MobileViewToggle, type MobileTab } from "../components/MobileViewToggle";
import { Pagination } from "../components/Pagination";
import { SearchFilterBar } from "../components/SearchFilterBar";
import { MapVisibilityButton, SearchMapPane } from "../components/SearchMapPane";
import { SortMenu } from "../components/SortMenu";
import { areaName, buildFilterChips } from "../lib/filterChips";
import { useFavoriteToggle } from "../hooks/useFavoriteToggle";

export default function Search() {
  useDocumentTitle("Tìm phòng · TROSV");
  const search = useListingSearch();
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const [hoveredListing, setHoveredListing] = useState<number | null>(null);
  const [mapHidden, setMapHidden] = useState(false);
  const toggleFavorite = useFavoriteToggle(search.setListings);
  const toggleMobileTab = () => {
    setMobileTab((t) => (t === "list" ? "map" : "list"));
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
  };

  const chips = useMemo(() => buildFilterChips(search.filters, search, search), [search]);
  const onHover = useCallback((id: number | null) => {
    setHoveredListing(id);
  }, []);
  const totalCount = search.meta?.total ?? search.listings.length;
  const area = areaName(search.filters, search);

  return (
    <div className="flex min-h-[calc(100svh-var(--nav-h))] flex-col bg-paper">
      {/* Sticky top filter bar */}
      <SearchFilterBar
        search={search}
        showMap={mobileTab === "map"}
        onToggleMap={toggleMobileTab}
      />

      {/* Result metadata + Active filter chips */}
      <div className="border-b border-line bg-paper/50 px-4 py-2.5 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-semibold text-ink">
            {search.loading ? (
              <span className="text-muted">Đang tìm phòng…</span>
            ) : (
              <>
                <span className="tabular-nums">{totalCount}</span> kết quả
                {area ? <span className="font-normal text-muted"> tại {area}</span> : null}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <MapVisibilityButton
              hidden={mapHidden}
              onToggle={() => {
                setMapHidden((h) => !h);
              }}
            />
            <SortMenu
              sort={search.filters.sort}
              onChange={(sort) => {
                search.setFilter("sort", sort);
              }}
            />
          </div>
        </div>
        <ActiveChips chips={chips} />
      </div>

      {/* Split view: List | Map (Responsive Desktop Split + Mobile Tab) */}
      <div
        className={cn(
          "flex flex-1 flex-col pt-3",
          !mapHidden && "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,50%)]",
        )}
      >
        {/* Listings column: Always on desktop, conditional on mobile */}
        <div
          data-testid="list-pane"
          className={cn(
            "animate-fade-in px-4 pb-20 lg:order-2 lg:animate-none lg:px-6 lg:pb-16",
            mobileTab === "map" ? "hidden lg:block" : "block",
            mapHidden && "lg:mx-auto lg:w-full lg:max-w-7xl",
          )}
        >
          <ListingResults
            loading={search.loading}
            error={search.error}
            listings={search.listings}
            onHover={onHover}
            onFavoriteToggle={(l) => {
              void toggleFavorite(l);
            }}
            onResetFilters={search.resetFilters}
            wide={mapHidden}
          />
          <Pagination
            page={search.page}
            lastPage={search.meta?.last_page ?? 0}
            onPage={search.setPage}
          />
        </div>

        <SearchMapPane
          search={search}
          mobileTab={mobileTab}
          hidden={mapHidden}
          hoveredListing={hoveredListing}
          onHover={onHover}
        />
      </div>

      <MobileViewToggle tab={mobileTab} onToggle={toggleMobileTab} />
    </div>
  );
}
