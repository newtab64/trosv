import { describe, expect, it } from "vitest";
import { schoolPlaceholder, schoolsFor, wardPlaceholder, wardsInCity } from "./locationOptions";

const wards = [
  { id: 1, name: "Hải Châu", city: { id: 10 } },
  { id: 2, name: "Linh Trung", city_id: 20 },
  { id: 3, name: "Không rõ" },
];

const schools = [
  { id: 1, name: "ĐH Bách Khoa", city_id: 10, ward: { id: 1 } },
  { id: 2, name: "UIT", city: { id: 20 }, ward: { id: 2 } },
  { id: 3, name: "HCMIU", city_id: 20, ward: { id: 2 } },
  { id: 4, name: "Trường mồ côi" },
];

describe("wardsInCity", () => {
  it("returns every ward while no city is chosen", () => {
    expect(wardsInCity(wards, "")).toHaveLength(3);
  });

  it("matches a ward by its nested city or by city_id", () => {
    expect(wardsInCity(wards, "10").map((w) => w.id)).toEqual([1]);
    expect(wardsInCity(wards, "20").map((w) => w.id)).toEqual([2]);
  });

  it("drops wards with no city once a city is chosen", () => {
    expect(wardsInCity(wards, "10").some((w) => w.id === 3)).toBe(false);
  });

  it("is empty for a city with no wards", () => {
    expect(wardsInCity(wards, "999")).toEqual([]);
  });
});

describe("schoolsFor", () => {
  it("narrows to the chosen city regardless of ward", () => {
    expect(schoolsFor(schools, { cityId: "20", wardId: "2" }).map((s) => s.name)).toEqual([
      "UIT",
      "HCMIU",
    ]);
  });

  it("lists all schools in the chosen city", () => {
    expect(schoolsFor(schools, { cityId: "20" }).map((s) => s.id)).toEqual([2, 3]);
  });

  it("lists every school when no city is chosen", () => {
    expect(schoolsFor(schools, { cityId: "" })).toHaveLength(4);
  });
});

describe("placeholders", () => {
  it("guides the user through the cascade", () => {
    expect(wardPlaceholder("")).toBe("Chọn Tỉnh/TP trước");
    expect(wardPlaceholder("10")).toBe("Tất cả phường");
    expect(schoolPlaceholder("")).toBe("Chọn Tỉnh/TP trước");
    expect(schoolPlaceholder("10")).toBe("Chọn trường đại học");
  });
});
