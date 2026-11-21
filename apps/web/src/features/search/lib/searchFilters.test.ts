import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  MAP_PAGE_SIZE,
  filtersFromParams,
  filtersToApiParams,
  filtersToUrlParams,
  withCity,
  withSchool,
  withWard,
  DEFAULT_SCHOOL_RADIUS_KM,
  schoolSearchHref,
  type ListingFilters,
} from "./searchFilters";

const filters = (over: Partial<ListingFilters> = {}): ListingFilters => ({
  ...EMPTY_FILTERS,
  ...over,
});

describe("filtersFromParams", () => {
  it("is the empty filter set for an empty query string", () => {
    expect(filtersFromParams(new URLSearchParams(""))).toEqual(EMPTY_FILTERS);
  });

  it("reads every text filter and the sort", () => {
    const params = new URLSearchParams(
      "q=g%C3%A1c&type=room&city_id=1&ward_id=2&school_id=3&max_km=5&price_min=1000000&price_max=3000000&sort=price_asc",
    );
    expect(filtersFromParams(params)).toMatchObject({
      q: "gác",
      type: "room",
      city_id: "1",
      ward_id: "2",
      school_id: "3",
      max_km: "5",
      price_min: "1000000",
      price_max: "3000000",
      sort: "price_asc",
    });
  });

  it("collects repeated amenity ids as numbers and drops junk", () => {
    const params = new URLSearchParams("amenity_ids=4&amenity_ids=7&amenity_ids=x&amenity_ids=0");
    expect(filtersFromParams(params).amenity_ids).toEqual([4, 7]);
  });
});

describe("filtersToUrlParams", () => {
  it("writes nothing for the default filters", () => {
    expect(filtersToUrlParams(EMPTY_FILTERS)).toEqual({});
  });

  it("writes only what is set, in a stable order", () => {
    const out = filtersToUrlParams(filters({ price_max: "3000000", q: "x", city_id: "1" }));
    expect(Object.keys(out)).toEqual(["q", "city_id", "price_max"]);
  });

  it("writes the sort only when it is not the default", () => {
    expect(filtersToUrlParams(filters({ sort: "newest" }))).toEqual({});
    expect(filtersToUrlParams(filters({ sort: "rating" }))).toEqual({ sort: "rating" });
  });

  it("does not put amenities in the address bar", () => {
    expect(filtersToUrlParams(filters({ amenity_ids: [1, 2] }))).toEqual({});
  });

  it("round-trips with filtersFromParams (apart from amenities)", () => {
    const original = filters({
      q: "gác",
      type: "house",
      ward_id: "9",
      price_min: "1000000",
      sort: "price_desc",
    });
    const back = filtersFromParams(new URLSearchParams(filtersToUrlParams(original)));
    expect(back).toEqual(original);
  });
});

describe("filtersToApiParams", () => {
  it("always sends page, page size and sort", () => {
    expect(filtersToApiParams(EMPTY_FILTERS, 2)).toEqual({ page: 2, per_page: 12, sort: "newest" });
  });

  it("trims the search text and skips a blank one", () => {
    expect(filtersToApiParams(filters({ q: "  gác  " }), 1)["q"]).toBe("gác");
    expect(filtersToApiParams(filters({ q: "   " }), 1)).not.toHaveProperty("q");
  });

  it("sends the other filters as given and amenities in array form", () => {
    expect(
      filtersToApiParams(
        filters({ type: "room", ward_id: "2", price_min: "1000000", amenity_ids: [4, 7] }),
        1,
      ),
    ).toMatchObject({ type: "room", ward_id: "2", price_min: "1000000", "amenity_ids[]": [4, 7] });
  });

  it("uses a bigger page for the map", () => {
    expect(filtersToApiParams(EMPTY_FILTERS, 1, MAP_PAGE_SIZE)).toMatchObject({
      page: 1,
      per_page: 50,
    });
  });
});

describe("cascade", () => {
  const set = filters({ city_id: "1", ward_id: "2", school_id: "3", max_km: "5", q: "keep" });

  it("a new city clears ward, school and radius, and keeps the rest", () => {
    expect(withCity(set, "9")).toMatchObject({
      city_id: "9",
      ward_id: "",
      school_id: "",
      max_km: "",
      q: "keep",
    });
  });

  it("a new ward keeps school and radius, so a nearby ward still filters near the school", () => {
    expect(withWard(set, "8")).toMatchObject({
      city_id: "1",
      ward_id: "8",
      school_id: "3",
      max_km: "5",
    });
  });

  it("never mutates the filters it is given", () => {
    withCity(set, "9");
    withWard(set, "8");
    expect(set.school_id).toBe("3");
  });
});

describe("withSchool", () => {
  it("picking a school filters to 3 km around it and sorts nearest first", () => {
    expect(withSchool(filters(), "41")).toMatchObject({
      school_id: "41",
      max_km: DEFAULT_SCHOOL_RADIUS_KM,
      sort: "distance",
    });
    expect(DEFAULT_SCHOOL_RADIUS_KM).toBe("3");
  });

  it("keeps a radius the user already chose", () => {
    expect(withSchool(filters({ max_km: "1" }), "41").max_km).toBe("1");
  });

  it("clearing the school drops the radius and the distance sort", () => {
    const set = filters({ school_id: "41", max_km: "3", sort: "distance" });
    expect(withSchool(set, "")).toMatchObject({ school_id: "", max_km: "", sort: "newest" });
  });

  it("clearing the school keeps a sort that is not about distance", () => {
    const set = filters({ school_id: "41", max_km: "3", sort: "price_asc" });
    expect(withSchool(set, "").sort).toBe("price_asc");
  });
});

describe("schoolSearchHref", () => {
  it("links to rooms within 3 km of the school, nearest first", () => {
    expect(schoolSearchHref(41)).toBe("/rooms?school_id=41&max_km=3&sort=distance");
  });
});
