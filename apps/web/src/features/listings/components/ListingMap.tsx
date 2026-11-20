import { formatVnd } from "@/shared/lib/format";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import type { Listing, School } from "@/shared/types/api";
import { fitMapBounds, renderSchoolLayer, VIETNAM_BOUNDS } from "./schoolMarker";
import "@/features/listings/components/leaflet-pins.css";

/*
  Price pins: white pills with 1px ink border, small tail, tabular
  numbers. Hover/selected = plate. Clusters: ink circles with paper
  numbers. Warm tiles via .leaflet-tile-pane filter (styles.css).
*/

const DEFAULT_CENTER: [number, number] = [16.0471, 107.5]; // Việt Nam trung tâm

export interface ListingMapProps {
  listings: Listing[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onHover?: (id: number | null) => void;
  ariaLabel?: string;
  hasLocationFilter?: boolean;
  /** Wheel zoom hijacks page scroll; embedded maps turn it off. */
  scrollWheelZoom?: boolean;
  school?: School | null;
  radiusKm?: number | null;
}

/* Cluster icon: ink circle with paper number. */
function makeClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<span class="trosv-cluster" aria-hidden="true">${count}</span>`,
    className: "trosv-cluster-wrap",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

export function makePinIcon(listing: Listing, selected: boolean): L.DivIcon {
  return L.divIcon({
    html: `<span
      class="trosv-pin${selected ? " trosv-pin--selected" : ""}"
      role="button"
      tabindex="0"
      aria-label="${formatVnd(listing.price)} một tháng, ${listing.title.replace(/"/g, "&quot;")}"
    >${formatVnd(listing.price)}</span>`,
    className: "trosv-pin-wrap",
    iconSize: [40, 40],
    iconAnchor: [20, 22],
  });
}

// Ensure Leaflet is available globally for plugins
if (typeof window !== "undefined" && !(window as unknown as { L?: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}

export function ListingMap({
  listings,
  selectedId,
  onSelect,
  onHover,
  ariaLabel = "Bản đồ phòng trọ",
  hasLocationFilter = false,
  scrollWheelZoom = true,
  school,
  radiusKm,
}: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroup = useRef<L.MarkerClusterGroup | L.FeatureGroup | null>(null);
  const schoolLayerGroup = useRef<L.LayerGroup | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const prevListingsKey = useRef<string>("");
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
    if (leafletMap.current) {
      fitMapBounds(leafletMap.current, latestPointsRef.current, school, hasLocationFilter);
    }
  }, [hasLocationFilter, school]);

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
      schoolLayerGroup.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update school layer when chosen school or radius changes
  useEffect(() => {
    if (leafletMap.current) {
      renderSchoolLayer(leafletMap.current, schoolLayerGroup, school, radiusKm);
    }
  }, [school, radiusKm]);

  // Update markers and fit bounds
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Resolve cluster factory from L or window.L
    const clusterFactory =
      (L as unknown as { markerClusterGroup?: (opts: unknown) => L.MarkerClusterGroup })
        .markerClusterGroup ||
      (typeof window !== "undefined" &&
        (
          window as unknown as {
            L?: { markerClusterGroup?: (opts: unknown) => L.MarkerClusterGroup };
          }
        ).L?.markerClusterGroup);

    if (!clusterGroup.current) {
      if (typeof clusterFactory === "function") {
        clusterGroup.current = clusterFactory({
          iconCreateFunction: makeClusterIcon,
          showCoverageOnHover: false,
          maxClusterRadius: 55,
        });
      } else {
        clusterGroup.current = L.featureGroup();
      }
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

    // Fit bounds only when listings set, location filter, or school actually changes
    const filterKey = `${listingsKey}:${hasLocationFilter ? "loc" : "country"}:${school?.id ?? ""}`;
    if (prevListingsKey.current !== filterKey) {
      prevListingsKey.current = filterKey;
      fitBoundsToPoints();
    }
  }, [points, listingsKey, selectedId, onSelect, onHover, hasLocationFilter, school, fitBoundsToPoints]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className="h-full w-full"
      data-testid="map"
      data-ready={ready ? "true" : "false"}
    />
  );
}
