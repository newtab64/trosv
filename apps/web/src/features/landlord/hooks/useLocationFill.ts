import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { City, Ward } from "@/shared/types/api";
import { reverseGeocode, type GeoSuggestion } from "../api/geocodeApi";
import { matchAddress } from "../lib/addressMatch";
import type { ListingFormState } from "../lib/listingFormModel";

const LOCATE_ERROR = "Không lấy được vị trí. Hãy bật quyền vị trí hoặc chọn trên bản đồ.";

const devicePosition = (): Promise<{ latitude: number; longitude: number }> =>
  new Promise((resolve, reject) => {
    const geo = (navigator as Partial<Navigator>).geolocation;
    if (!geo) {
      reject(new Error("no geolocation"));
      return;
    }
    geo.getCurrentPosition(
      (p) => {
        resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      },
      reject,
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });

/**
 * Fills the location part of the listing form from a chosen address suggestion or from the
 * device position: the pin, the address line and, when they match the lists the API knows,
 * the city and the ward.
 */
export function useLocationFill(args: {
  cities: City[];
  wards: Ward[];
  setForm: Dispatch<SetStateAction<ListingFormState>>;
}) {
  const { cities, wards, setForm } = args;
  const [autofilled, setAutofilled] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [locating, setLocating] = useState(false);
  // Bumped whenever the landlord picks something else, so a slow device position or place
  // lookup cannot overwrite it. `busy` stops a second tap from starting a parallel lookup.
  const generation = useRef(0);
  const busy = useRef(false);

  /** Drops a locate request still in flight (a suggestion or a map click took over). */
  const cancelLocate = useCallback((): void => {
    generation.current += 1;
    busy.current = false;
    setLocating(false);
  }, []);

  function fill(s: GeoSuggestion, coords?: { latitude: number; longitude: number }): void {
    const match = matchAddress(s, cities, wards);
    // A place that does not match the lists must not keep the previous place's city and ward.
    setForm((f) => ({
      ...f,
      latitude: coords?.latitude ?? s.latitude,
      longitude: coords?.longitude ?? s.longitude,
      address: s.street || f.address,
      city_id: match.city_id ?? "",
      ward_id: match.ward_id ?? "",
    }));
    setAutofilled(Boolean(s.street) || match.city_id !== null || match.ward_id !== null);
  }

  function applySuggestion(s: GeoSuggestion): void {
    cancelLocate();
    setLocateError("");
    fill(s);
  }

  /** Uses the device position, then asks Photon what is there. The pin is kept either way. */
  async function locateMe(): Promise<void> {
    if (busy.current) return;
    busy.current = true;
    setLocating(true);
    setLocateError("");
    const mine = generation.current;
    const superseded = (): boolean => mine !== generation.current;
    const finish = (): void => {
      if (superseded()) return;
      busy.current = false;
      setLocating(false);
    };
    let coords: { latitude: number; longitude: number };
    try {
      coords = await devicePosition();
    } catch {
      if (!superseded()) setLocateError(LOCATE_ERROR);
      finish();
      return;
    }
    if (superseded()) return;
    setForm((f) => ({ ...f, ...coords }));
    try {
      const place = await reverseGeocode(coords.latitude, coords.longitude);
      if (place && !superseded()) fill(place, coords);
    } catch {
      // The pin is already set; the landlord can fill the address by hand.
    }
    finish();
  }

  const clearAutofilled = (): void => {
    setAutofilled(false);
  };

  return {
    applySuggestion,
    locateMe,
    cancelLocate,
    locating,
    autofilled,
    locateError,
    clearAutofilled,
  };
}
