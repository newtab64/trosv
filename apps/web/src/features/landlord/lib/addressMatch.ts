import type { City, Ward } from "@/shared/types/api";
import type { GeoSuggestion } from "../api/geocodeApi";

const PREFIXES = ["thanh pho", "thi xa", "thi tran", "tinh", "quan", "huyen", "phuong", "xa", "tp"];
const HO_CHI_MINH = new Set(["hcm", "tphcm", "sai gon", "saigon", "ho chi minh"]);

/**
 * A comparable form of a place name: lower case, no accents, no administrative prefix
 * ("Phường", "Thành phố", "TP."), and one spelling for Ho Chi Minh City.
 */
export function normalizeName(name: string): string {
  let n = name
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const prefix of PREFIXES) {
    if (n.startsWith(`${prefix} `)) {
      n = n.slice(prefix.length + 1);
      break;
    }
  }
  n = n.replace(/ city$/, "").trim();
  return HO_CHI_MINH.has(n) ? "ho chi minh" : n;
}

export interface AddressMatch {
  city_id: number | null;
  ward_id: number | null;
}

const wardCityId = (w: Ward): number | undefined => w.city?.id ?? w.city_id;

/**
 * Finds the city and ward of a Photon suggestion among the ones the API knows. The ward is
 * only searched inside the matched city; with no matched city, a ward that matches exactly
 * one entry brings its own city along.
 */
export function matchAddress(s: GeoSuggestion, cities: City[], wards: Ward[]): AddressMatch {
  const cityKey = s.cityName ? normalizeName(s.cityName) : "";
  const city = cityKey ? cities.find((c) => normalizeName(c.name) === cityKey) : undefined;
  const keys = new Set(s.wardCandidates.map(normalizeName));
  const inCity = city ? wards.filter((w) => wardCityId(w) === city.id) : wards;
  const found = inCity.filter((w) => keys.has(normalizeName(w.name)));

  if (city) return { city_id: city.id, ward_id: found[0]?.id ?? null };
  if (found.length === 1 && found[0]) {
    return { city_id: wardCityId(found[0]) ?? null, ward_id: found[0].id };
  }
  return { city_id: null, ward_id: null };
}
