import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getListings } from "@/features/listings/api/listingApi";
import {
  useAmenities,
  useCities,
  useSchools,
  useWards,
} from "@/features/listings/hooks/useReferenceData";
import { errMessage } from "@/shared/api/axiosClient";
import { toggleId } from "@/shared/lib/list";
import type { Listing, PaginationMeta } from "@/shared/types/api";
import {
  EMPTY_FILTERS,
  MAP_PAGE_SIZE,
  filtersFromParams,
  filtersToApiParams,
  filtersToUrlParams,
  withCity,
  withSchool,
  withWard,
  type ListingFilters,
} from "../lib/searchFilters";

/**
 * Listing search for the /rooms page: filter state, reference data
 * (cities/wards/schools/amenities), debounced fetch with URL-sync for
 * q/type, and cascade-aware filter setters (city change resets ward/
 * school/radius). Pagination state rides along so filter changes reset
 * to page 1.
 */
export function useListingSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: cities } = useCities();
  const { data: wards } = useWards();
  const { data: schools } = useSchools();
  const { data: amenities } = useAmenities();

  const [filters, setFilters] = useState<ListingFilters>(() => filtersFromParams(searchParams));
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [mapListings, setMapListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const prevParamsStringRef = useRef(searchParams.toString());

  // Sync state if searchParams change externally (e.g. navigation / back / direct link)
  const currentParamsString = searchParams.toString();
  useEffect(() => {
    if (currentParamsString !== prevParamsStringRef.current) {
      prevParamsStringRef.current = currentParamsString;
      setFilters(filtersFromParams(searchParams));
      setPage(1);
    }
  }, [currentParamsString, searchParams]);

  // Build query from filters and fetch.
  const fetchListings = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      setError("");
      const params = filtersToApiParams(filters, currentPage);

      try {
        const mapParams = filtersToApiParams(filters, 1, MAP_PAGE_SIZE);
        const [pagedRes, mapRes] = await Promise.all([getListings(params), getListings(mapParams)]);
        setListings(pagedRes.data);
        setMeta(pagedRes.meta);
        setMapListings(mapRes.data);
      } catch (err) {
        setError(errMessage(err));
        setListings([]);
        setMapListings([]);
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  // Refetch whenever filters change (debounced) or page changes.
  useEffect(() => {
    const t = setTimeout(() => {
      void fetchListings(page);
      const next = filtersToUrlParams(filters);
      const nextString = new URLSearchParams(next).toString();
      // Only touch the URL when it actually differs (so first load never rewrites it,
      // while a change made before the first debounce still lands).
      if (nextString !== prevParamsStringRef.current) {
        prevParamsStringRef.current = nextString;
        setSearchParams(next, { replace: true });
      }
    }, 300);
    return () => {
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const setFilter = (key: keyof ListingFilters, value: string): void => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  // Another city: ward, school and radius reset so the cascade stays valid.
  const setCity = (cityId: string): void => {
    setPage(1);
    setFilters((f) => withCity(f, cityId));
  };

  // Another ward: the school list is per ward, so school and radius reset.
  const setWard = (wardId: string): void => {
    setPage(1);
    setFilters((f) => withWard(f, wardId));
  };

  // A school filters to a radius around it (3 km by default) and sorts nearest first.
  const setSchool = (schoolId: string): void => {
    setPage(1);
    setFilters((f) => withSchool(f, schoolId));
  };

  const toggleAmenity = (id: number): void => {
    setPage(1);
    setFilters((f) => ({ ...f, amenity_ids: toggleId(f.amenity_ids, id) }));
  };

  const resetFilters = (): void => {
    setPage(1);
    setFilters({ ...EMPTY_FILTERS });
  };

  return {
    // reference data
    cities,
    wards,
    schools,
    amenities,
    // search state
    filters,
    setFilter,
    setCity,
    setWard,
    setSchool,
    toggleAmenity,
    resetFilters,
    // results
    listings,
    mapListings,
    setListings,
    meta,
    loading,
    error,
    page,
    setPage,
  };
}
