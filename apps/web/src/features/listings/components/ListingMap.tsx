import { formatVnd } from "@/shared/lib/format";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { Listing } from "@/shared/types/api";
import "@/features/listings/components/leaflet-pins.css";

/*
  Price pins: white pills with 1px ink border, small tail, tabular
  numbers. Hover/selected = plate. Clusters: red location pins with the
  count in the head. Warm tiles via .leaflet-tile-pane filter (styles.css).

  Both icons are anchored at their tip: Leaflet scales the map around the
  anchor while zooming, so a tip that is not on the anchor seems to slide.
*/

/* Red location pin, 34x46, tip at the bottom centre (17, 46). */
const CLUSTER_PIN_SIZE: [number, number] = [34, 46];
const CLUSTER_PIN_SVG = `<svg data-tip viewBox="0 0 34 46" width="34" height="46" aria-hidden="true"><path fill="#EA4335" stroke="#B31412" stroke-width="1.5" d="M17 45C17 45 2 27.5 2 16.5a15 15 0 0 1 30 0C32 27.5 17 45 17 45Z"/></svg>`;

const DEFAULT_CENTER: [number, number] = [16.0471, 107.5]; // Việt Nam trung tâm
const VIETNAM_BOUNDS: [[number, number], [number, number]] = [
  [8.5, 102.1], // Cà Mau / Nam Bộ
  [23.4, 109.5], // Hà Giang / Bắc Bộ
];

export interface ListingMapProps {
  listings: Listing[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onHover?: (id: number | null) => void;
  ariaLabel?: string;
  hasLocationFilter?: boolean;
  /** Wheel zoom hijacks page scroll; embedded maps turn it off. */
  scrollWheelZoom?: boolean;
  /** School being searched around: a dot at the school and, with a radius, a blue circle. */
  schoolArea?: SchoolArea | null;
}

export interface SchoolArea {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number | null;
}

const SCHOOL_BLUE = "#1A73E8";

/* Cluster icon: red location pin with the count in its head. */
function makeClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `${CLUSTER_PIN_SVG}<span class="trosv-cluster" aria-hidden="true">${count}</span>`,
    className: "trosv-cluster-wrap",
    iconSize: CLUSTER_PIN_SIZE,
    iconAnchor: [CLUSTER_PIN_SIZE[0] / 2, CLUSTER_PIN_SIZE[1]],
  });
}

/* Zero-size icon anchored on the point; CSS lifts the pill so its tail tip sits on it. */
export function makePinIcon(listing: Listing, selected: boolean): L.DivIcon {
  return L.divIcon({
    html: `<span
      class="trosv-pin${selected ? " trosv-pin--selected" : ""}"
      role="button"
      tabindex="0"
      aria-label="${formatVnd(listing.price)} một tháng, ${listing.title.replace(/"/g, "&quot;")}"
    >${formatVnd(listing.price)}<i class="trosv-pin-tail" data-tip aria-hidden="true"></i></span>`,
    className: "trosv-pin-wrap",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Ensure Leaflet is available globally for plugins
if (typeof window !== "undefined" && !(window as unknown as { L?: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}

/* Cluster group from leaflet.markercluster (on L or window.L); a plain group if it is missing. */
function makeClusterGroup(): L.MarkerClusterGroup | L.FeatureGroup {
  const clusterFactory =
    (L as unknown as { markerClusterGroup?: (opts: unknown) => L.MarkerClusterGroup })
      .markerClusterGroup ||
    (typeof window !== "undefined" &&
      (
        window as unknown as {
          L?: { markerClusterGroup?: (opts: unknown) => L.MarkerClusterGroup };
        }
      ).L?.markerClusterGroup);
  if (typeof clusterFactory !== "function") return L.featureGroup();
  return clusterFactory({
    iconCreateFunction: makeClusterIcon,
    showCoverageOnHover: false,
    maxClusterRadius: 55,
  });
}

/** School dot and radius circle; redrawn (and the map refitted) when the school or radius changes. */
function useSchoolLayer(
  leafletMap: MutableRefObject<L.Map | null>,
  schoolArea: SchoolArea | null,
  ready: boolean,
  refit: () => void,
): void {
  const schoolLayer = useRef<L.LayerGroup | null>(null);
  const schoolKey = schoolArea
    ? `${String(schoolArea.latitude)},${String(schoolArea.longitude)},${String(schoolArea.radiusKm)}`
    : "";
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    schoolLayer.current?.remove();
    schoolLayer.current = null;
    if (!schoolArea) return;

    const centre: [number, number] = [schoolArea.latitude, schoolArea.longitude];
    const layer = L.layerGroup().addTo(map);
    if (schoolArea.radiusKm) {
      L.circle(centre, {
        radius: schoolArea.radiusKm * 1000,
        className: "trosv-school-radius",
        color: SCHOOL_BLUE,
        weight: 1.5,
        fillColor: SCHOOL_BLUE,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(layer);
    }
    L.circleMarker(centre, {
      radius: 7,
      className: "trosv-school-center",
      color: "#fff",
      weight: 2,
      fillColor: SCHOOL_BLUE,
      fillOpacity: 1,
    })
      .bindTooltip(schoolArea.name)
      .addTo(layer);
    schoolLayer.current = layer;
    refit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schoolKey covers schoolArea
  }, [schoolKey, ready, refit]);
}

export function ListingMap({
  listings,
  selectedId,
  onSelect,
  onHover,
  ariaLabel = "Bản đồ phòng trọ",
  hasLocationFilter = false,
  scrollWheelZoom = true,
  schoolArea = null,
}: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroup = useRef<L.MarkerClusterGroup | L.FeatureGroup | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const prevListingsKey = useRef<string>("");
  const { latitude: schoolLat, longitude: schoolLng, radiusKm } = schoolArea ?? {};
  // The radius circle's box, so a school search frames the whole area, not only its rooms.
  const schoolBounds = useMemo(
    () =>
      schoolLat != null && schoolLng != null && radiusKm
        ? L.latLng(schoolLat, schoolLng).toBounds(radiusKm * 2000)
        : null,
    [schoolLat, schoolLng, radiusKm],
  );
  const [ready, setReady] = useState(false);

  const points = useMemo(
    () =>
      listings.filter(
        (l): l is Listing & { latitude: number; longitude: number } =>
          typeof l.latitude === "number" &&
          typeof l.longitude === "number" &&
          !Number.isNaN(l.latitude) &&
          !Number.isNaN(l.longitude),
      ),
    [listings],
  );

  const listingsKey = useMemo(
    () =>
      points
        .map((p) => p.id)
        .sort()
        .join(","),
    [points],
  );

  const latestPointsRef = useRef(points);

  useEffect(() => {
    latestPointsRef.current = points;
  }, [points]);

  const fitBoundsToPoints = useCallback(() => {
    const map = leafletMap.current;
    if (!map) return;

    // When user chooses NO location filter, default focus is the entire country (not a single city like Da Nang)
    if (!hasLocationFilter) {
      map.fitBounds(VIETNAM_BOUNDS, { padding: [20, 20], maxZoom: 6 });
      return;
    }

    // Searching around a school: show the whole radius, not just the rooms in it.
    if (schoolBounds) {
      map.fitBounds(schoolBounds, { padding: [20, 20] });
      return;
    }

    const pts = latestPointsRef.current;
    if (pts.length === 0) {
      map.fitBounds(VIETNAM_BOUNDS, { padding: [20, 20], maxZoom: 6 });
      return;
    }

    const validLatLngs: [number, number][] = pts.map((p) => [p.latitude, p.longitude]);
    if (validLatLngs.length === 1 && validLatLngs[0]) {
      map.setView(validLatLngs[0], 14);
    } else if (validLatLngs.length > 1) {
      const bounds = L.latLngBounds(validLatLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [hasLocationFilter, schoolBounds]);

  // Initialize map instance once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || leafletMap.current) return;

    const map = L.map(el, { scrollWheelZoom });
    if (!hasLocationFilter) {
      map.fitBounds(VIETNAM_BOUNDS, { padding: [20, 20], maxZoom: 6 });
    } else {
      map.setView(DEFAULT_CENTER, 5);
    }
    leafletMap.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    setReady(true);

    let hadNonZeroSize = false;
    const ro = new ResizeObserver((entries) => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
        for (const entry of entries) {
          if (entry.contentRect.width > 50 && entry.contentRect.height > 50) {
            if (!hadNonZeroSize) {
              hadNonZeroSize = true;
              fitBoundsToPoints();
            }
          }
        }
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      leafletMap.current = null;
      clusterGroup.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers and fit bounds
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (!clusterGroup.current) {
      clusterGroup.current = makeClusterGroup();
      map.addLayer(clusterGroup.current);
    } else {
      clusterGroup.current.clearLayers();
    }

    for (const item of points) {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: makePinIcon(item, item.id === selectedId),
        keyboard: true,
        alt: `${formatVnd(item.price)} - ${item.title}`,
      });
      marker.on("click", () => {
        onSelect(item.id);
      });
      marker.on("mouseover", () => onHover?.(item.id));
      marker.on("mouseout", () => onHover?.(null));
      clusterGroup.current.addLayer(marker);
    }

    // Fit bounds only when the listings set or location filter actually changes
    const filterKey = `${listingsKey}:${hasLocationFilter ? "loc" : "country"}`;
    if (prevListingsKey.current !== filterKey) {
      prevListingsKey.current = filterKey;
      fitBoundsToPoints();
    }
  }, [points, listingsKey, selectedId, onSelect, onHover, hasLocationFilter, fitBoundsToPoints]);

  useSchoolLayer(leafletMap, schoolArea, ready, fitBoundsToPoints);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className="h-full w-full"
      data-testid="map"
      data-ready={ready ? "true" : "false"}
      data-school-radius-km={schoolArea?.radiusKm ?? undefined}
    />
  );
}
