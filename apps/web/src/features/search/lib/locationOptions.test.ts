import { describe, expect, it } from "vitest";
import { wardPlaceholder, wardsInCity } from "./locationOptions";

const wards = [
  { id: 1, name: "Hải Châu", city: { id: 10 } },
  { id: 2, name: "Linh Trung", city_id: 20 },
  { id: 3, name: "Không rõ" },
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

describe("placeholders", () => {
  it("guides the user through the cascade", () => {
    expect(wardPlaceholder("")).toBe("Chọn Tỉnh/TP trước");
    expect(wardPlaceholder("10")).toBe("Tất cả phường");
  });
});
