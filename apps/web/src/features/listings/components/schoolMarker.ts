import L from "leaflet";
import type { School } from "@/shared/types/api";

export const VIETNAM_BOUNDS: [[number, number], [number, number]] = [[8.5, 102.1], [23.4, 109.5]];

export function hasCoordinates(s?: School | null): s is School & { latitude: number; longitude: number } {
  return typeof s?.latitude === "number" && typeof s.longitude === "number";
}

export function makeSchoolPinIcon(school: School): L.DivIcon {
  const short = school.name.replace(/^(Trường|Đại học|ĐH)\s+/i, "");
  return L.divIcon({
    html: `<div class="trosv-school-pin" role="button" tabindex="0" aria-label="Trường ${school.name}"><span class="trosv-school-badge" aria-hidden="true">🎓</span><span class="trosv-school-name">${short}</span></div>`,
    className: "trosv-school-pin-wrap",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function collectLatLngs(pts: Array<{ latitude: number; longitude: number }>, s?: School | null): [number, number][] {
  const res: [number, number][] = pts.map((p) => [p.latitude, p.longitude]);
  if (hasCoordinates(s)) res.push([s.latitude, s.longitude]);
  return res;
}

export function fitMapBounds(map: L.Map, pts: Array<{ latitude: number; longitude: number }>, s?: School | null, hasLoc = false): void {
  const valid = collectLatLngs(pts, s);
  if (valid.length === 0 || (!hasLoc && !hasCoordinates(s))) {
    map.fitBounds(VIETNAM_BOUNDS, { padding: [20, 20], maxZoom: 6 });
  } else if (valid.length === 1 && valid[0]) {
    map.setView(valid[0], 14);
  } else {
    map.fitBounds(L.latLngBounds(valid), { padding: [40, 40], maxZoom: 15 });
  }
}

function addSchoolCircle(layer: L.LayerGroup, latLng: [number, number], radiusKm?: number | null): void {
  if (!radiusKm || radiusKm <= 0) return;
  layer.addLayer(L.circle(latLng, {
    radius: radiusKm * 1000, color: "#17479e", fillColor: "#17479e", fillOpacity: 0.06, weight: 1.5, dashArray: "4, 6",
  }));
}

function addSchoolMarker(layer: L.LayerGroup, s: School & { latitude: number; longitude: number }, radiusKm?: number | null): void {
  const marker = L.marker([s.latitude, s.longitude], { icon: makeSchoolPinIcon(s), zIndexOffset: 1000, alt: s.name });
  const loc = [s.ward?.name, s.city?.name].filter(Boolean).join(", ");
  marker.bindPopup(`<div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;"><div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">🎓 ${s.name}</div>${loc ? `<div style="color: #64748b; font-size: 12px;">${loc}</div>` : ""}${radiusKm ? `<div style="margin-top: 4px; font-size: 12px; color: #17479e; font-weight: 600;">Đang lọc bán kính ${radiusKm} km</div>` : ""}</div>`);
  layer.addLayer(marker);
}

export function renderSchoolLayer(map: L.Map, layerRef: React.MutableRefObject<L.LayerGroup | null>, s?: School | null, radiusKm?: number | null): void {
  if (layerRef.current) layerRef.current.clearLayers();
  else layerRef.current = L.layerGroup().addTo(map);
  if (!hasCoordinates(s)) return;
  addSchoolCircle(layerRef.current, [s.latitude, s.longitude], radiusKm);
  addSchoolMarker(layerRef.current, s, radiusKm);
}