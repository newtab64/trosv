import { describe, expect, it, vi } from "vitest";
import L from "leaflet";
import type { School } from "@/shared/types/api";
import { fitMapBounds, hasCoordinates, makeSchoolPinIcon, renderSchoolLayer, VIETNAM_BOUNDS } from "./schoolMarker";

const s: School = { id: 1, name: "ĐH Bách Khoa", latitude: 10.7, longitude: 106.6 };

describe("schoolMarker", () => {
  it("checks coordinates and DivIcon", () => {
    expect(hasCoordinates(s)).toBe(true);
    expect(hasCoordinates(null)).toBe(false);
    expect(makeSchoolPinIcon(s).options.html).toContain("Bách Khoa");
  });

  it("fits map bounds and renders layer", () => {
    const fitSpy = vi.fn();
    const setSpy = vi.fn();
    const map = { fitBounds: fitSpy, setView: setSpy } as unknown as L.Map;
    fitMapBounds(map, [], null, false);
    expect(fitSpy).toHaveBeenCalledWith(VIETNAM_BOUNDS, expect.any(Object));
    fitMapBounds(map, [], s, false);
    expect(setSpy).toHaveBeenCalledWith([10.7, 106.6], 14);

    const clearSpy = vi.fn();
    const addSpy = vi.fn();
    const layer = { clearLayers: clearSpy, addLayer: addSpy } as unknown as L.LayerGroup;
    renderSchoolLayer({} as L.Map, { current: layer }, s, 3);
    expect(clearSpy).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledTimes(2);
  });
});