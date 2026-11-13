/*
  Address search through Photon (OpenStreetMap), called straight from the browser.
  Plain `fetch` on purpose: the shared axios client would attach the user's bearer token
  to a third-party request. Every call to Photon goes through this module so the provider
  can be swapped (for a proxy or another service) without touching the UI.
*/

const PHOTON = "https://photon.komoot.io";
/** minLon,minLat,maxLon,maxLat around Vietnam. */
const VIETNAM_BBOX = "102.1,8.4,109.5,23.4";

export interface GeoSuggestion {
  id: string;
  /** Bold line of a suggestion: the street line, or the place name. */
  label: string;
  /** Muted line: ward, district and city. */
  detail: string;
  latitude: number;
  longitude: number;
  /** House number and street, ready for the "Địa chỉ" field. */
  street: string;
  cityName: string | null;
  /** Names that may be the ward, most specific first. */
  wardCandidates: string[];
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | number | undefined>;
}

const text = (v: string | number | undefined): string => (typeof v === "string" ? v.trim() : "");
const unique = (list: string[]): string[] => [...new Set(list.filter(Boolean))];

function toSuggestion(feature: PhotonFeature): GeoSuggestion {
  const p = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  const streetName = text(p["street"]);
  const house = text(p["housenumber"]);
  const street = streetName ? [house, streetName].filter(Boolean).join(" ") : text(p["name"]);
  const cityName = text(p["city"]) || text(p["state"]) || null;
  const wardCandidates = unique([
    text(p["locality"]),
    text(p["suburb"]),
    text(p["district"]),
    text(p["county"]),
  ]);
  return {
    id: `${text(p["osm_type"])}${String(p["osm_id"] ?? "")}`,
    label: street,
    detail: unique([...wardCandidates, cityName ?? ""]).join(", "),
    latitude,
    longitude,
    street,
    cityName,
    wardCandidates,
  };
}

async function photon(path: string, params: Record<string, string>, signal?: AbortSignal) {
  const url = new URL(path, PHOTON);
  Object.entries(params).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), signal ? { signal } : {});
  if (!res.ok) throw new Error(`Photon trả về lỗi ${String(res.status)}.`);
  const body = (await res.json()) as { features?: PhotonFeature[] };
  return (body.features ?? [])
    .filter((f) => f.properties["countrycode"] === "VN")
    .map(toSuggestion);
}

/** Up to 5 places in Vietnam matching what the landlord typed. */
export function searchAddress(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]> {
  return photon("/api/", { q: query, limit: "5", bbox: VIETNAM_BBOX }, signal);
}

/** The place at a point, or null when Photon knows nothing there. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<GeoSuggestion | null> {
  const list = await photon(
    "/reverse",
    { lat: String(latitude), lon: String(longitude), limit: "1" },
    signal,
  );
  return list[0] ?? null;
}
