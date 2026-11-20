/*
  Pure model of the /rooms filters: what they look like, how they round-trip
  through the URL, what the API is asked for, and the city -> ward -> school
  cascade. No React.
*/

export interface ListingFilters {
  q: string;
  type: string;
  city_id: string;
  ward_id: string;
  school_id: string;
  max_km: string;
  price_min: string;
  price_max: string;
  amenity_ids: number[];
  sort: string;
}

export const EMPTY_FILTERS: ListingFilters = {
  q: "",
  type: "",
  city_id: "",
  ward_id: "",
  school_id: "",
  max_km: "",
  price_min: "",
  price_max: "",
  amenity_ids: [],
  sort: "newest",
};

/** Filters that are plain strings in the URL, in the order they are written. */
const URL_TEXT_KEYS = [
  "q",
  "type",
  "city_id",
  "ward_id",
  "school_id",
  "max_km",
  "price_min",
  "price_max",
] as const;

/** Read the filters from a query string (a shared link, back/forward, a reload). */
export function filtersFromParams(params: URLSearchParams): ListingFilters {
  const text = (key: string) => params.get(key) || "";
  return {
    ...EMPTY_FILTERS,
    q: text("q"),
    type: text("type"),
    city_id: text("city_id"),
    ward_id: text("ward_id"),
    school_id: text("school_id"),
    max_km: text("max_km"),
    price_min: text("price_min"),
    price_max: text("price_max"),
    sort: text("sort") || "newest",
    amenity_ids: params.getAll("amenity_ids").map(Number).filter(Boolean),
  };
}

/** The query string for the address bar: only non-default filters (amenities are not in the URL). */
export function filtersToUrlParams(filters: ListingFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of URL_TEXT_KEYS) {
    if (filters[key]) params[key] = filters[key];
  }
  if (filters.sort && filters.sort !== "newest") params["sort"] = filters.sort;
  return params;
}

export const PAGE_SIZE = 12;
export const MAP_PAGE_SIZE = 50;

/** Query for GET /listings. The search box is trimmed; amenities use the array form. */
export function filtersToApiParams(
  filters: ListingFilters,
  page: number,
  perPage: number = PAGE_SIZE,
): Record<string, string | number | number[]> {
  const params: Record<string, string | number | number[]> = {
    page,
    per_page: perPage,
    sort: filters.sort,
  };
  if (filters.q.trim()) params["q"] = filters.q.trim();
  for (const key of URL_TEXT_KEYS) {
    if (key !== "q" && filters[key]) params[key] = filters[key];
  }
  if (filters.amenity_ids.length) params["amenity_ids[]"] = filters.amenity_ids;
  return params;
}

/** Another city: the ward, school and radius no longer apply. */
export function withCity(filters: ListingFilters, cityId: string): ListingFilters {
  return { ...filters, city_id: cityId, ward_id: "", school_id: "", max_km: "" };
}

/** Another ward: keep chosen school & radius since school is bound only to city, not ward. */
export function withWard(filters: ListingFilters, wardId: string): ListingFilters {
  return { ...filters, ward_id: wardId };
}
