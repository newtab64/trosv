import { describe, expect, it } from "vitest";
import type { City, Ward } from "@/shared/types/api";
import type { GeoSuggestion } from "../api/geocodeApi";
import { matchAddress, normalizeName } from "./addressMatch";

const cities: City[] = [
  { id: 1, name: "Hà Nội" },
  { id: 2, name: "TP.HCM" },
];
const wards: Ward[] = [
  { id: 10, name: "Bách Khoa", city: { id: 1, name: "Hà Nội" } },
  { id: 11, name: "Phường 5", city: { id: 2, name: "TP.HCM" } },
  { id: 12, name: "Bách Khoa", city: { id: 2, name: "TP.HCM" } },
];
const suggestion = (over: Partial<GeoSuggestion>): GeoSuggestion => ({
  id: "N1",
  label: "x",
  detail: "",
  latitude: 1,
  longitude: 2,
  street: "x",
  cityName: null,
  wardCandidates: [],
  ...over,
});

describe("normalizeName", () => {
  it("ignores case, accents and đ", () => {
    expect(normalizeName("Phường Bách Khoa")).toBe(normalizeName("bach khoa"));
    expect(normalizeName("Đà Nẵng")).toBe("da nang");
  });

  it("drops administrative prefixes", () => {
    for (const p of ["Thành phố ", "Tỉnh ", "Quận ", "Huyện ", "Phường ", "Xã "]) {
      expect(normalizeName(`${p}Cầu Giấy`)).toBe("cau giay");
    }
  });

  it("treats the common names of Ho Chi Minh City as one", () => {
    for (const n of ["TP.HCM", "Thành phố Hồ Chí Minh", "Ho Chi Minh City", "Sài Gòn"]) {
      expect(normalizeName(n)).toBe("ho chi minh");
    }
  });
});

describe("matchAddress", () => {
  it("finds the city and the ward", () => {
    const s = suggestion({ cityName: "Hà Nội", wardCandidates: ["Hai Bà Trưng", "Bách Khoa"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: 1, ward_id: 10 });
  });

  it("only looks for the ward inside the matched city", () => {
    const s = suggestion({ cityName: "Thành phố Hồ Chí Minh", wardCandidates: ["Bách Khoa"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: 2, ward_id: 12 });
  });

  it("keeps the city when no ward matches", () => {
    const s = suggestion({ cityName: "Hà Nội", wardCandidates: ["Phường Lạ"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: 1, ward_id: null });
  });

  it("returns nothing when neither is found", () => {
    const s = suggestion({ cityName: "Huế", wardCandidates: ["Phú Hội"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: null, ward_id: null });
  });

  it("matches numbered wards written with or without the prefix", () => {
    const s = suggestion({ cityName: "Hồ Chí Minh", wardCandidates: ["5"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: 2, ward_id: 11 });
  });

  it("uses the ward's own city when the city name is missing but only one ward matches", () => {
    const s = suggestion({ cityName: null, wardCandidates: ["Phường 5"] });
    expect(matchAddress(s, cities, wards)).toEqual({ city_id: 2, ward_id: 11 });
  });
});
