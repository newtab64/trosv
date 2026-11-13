import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

const START_VIEW: [number, number] = [16.0471, 108.2068];
const START_ZOOM = 5;
const PIN_ZOOM = 17;

const toNumber = (v: number | string): number | null => {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * A map with one draggable pin. Clicking the map or dragging the pin calls `onPick`; when
 * `lat`/`lng` change from outside (an address was chosen, or the numbers were typed) the pin
 * moves there and the map flies to it. Leaflet is loaded lazily. The callback is read through
 * a ref so the map is created once: restarting it whenever the parent re-rendered (every
 * keystroke in the form) used to throw away the marker you had just placed.
 */
function usePinMap(
  onPick: (lat: number, lng: number) => void,
  lat: number | string,
  lng: number | string,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const syncRef = useRef<(() => void) | null>(null);
  const latestRef = useRef({ lat, lng });

  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    latestRef.current = { lat, lng };
    syncRef.current?.();
  }, [lat, lng]);

  useEffect(() => {
    const el = containerRef.current;
    let map: LeafletMap | null = null;
    let active = true;

    void import("leaflet").then((L) => {
      if (!active || !el) return;
      const created = L.map(el).setView(START_VIEW, START_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(created);
      const marker: Marker = L.marker(START_VIEW, { draggable: true });
      const place = (la: number, ln: number): void => {
        marker.setLatLng([la, ln]);
        if (!created.hasLayer(marker)) marker.addTo(created);
      };

      created.on("click", (e) => {
        place(e.latlng.lat, e.latlng.lng);
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onPickRef.current(p.lat, p.lng);
      });

      syncRef.current = () => {
        const la = toNumber(latestRef.current.lat);
        const ln = toNumber(latestRef.current.lng);
        if (la === null || ln === null) return;
        const at = created.hasLayer(marker) ? marker.getLatLng() : null;
        if (at && Math.abs(at.lat - la) < 1e-9 && Math.abs(at.lng - ln) < 1e-9) return;
        place(la, ln);
        created.flyTo([la, ln], Math.max(created.getZoom(), PIN_ZOOM));
      };
      map = created;
      syncRef.current();
    });

    return () => {
      active = false;
      syncRef.current = null;
      map?.remove();
      map = null;
    };
  }, []);

  return containerRef;
}

export interface CoordinatePickerProps {
  lat: number | string;
  lng: number | string;
  onPick: (lat: number, lng: number) => void;
}

/** The map with the draggable pin. */
export function CoordinatePicker({ lat, lng, onPick }: CoordinatePickerProps) {
  const containerRef = usePinMap(onPick, lat, lng);
  return (
    <div className="relative h-full w-full" data-testid="coordinate-picker">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
