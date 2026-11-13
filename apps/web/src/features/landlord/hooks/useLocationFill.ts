import { useState } from "react";
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

  function fill(s: GeoSuggestion, coords?: { latitude: number; longitude: number }): void {
    const match = matchAddress(s, cities, wards);
    setForm((f) => ({
      ...f,
      latitude: coords?.latitude ?? s.latitude,
      longitude: coords?.longitude ?? s.longitude,
      address: s.street || f.address,
      city_id: match.city_id ?? f.city_id,
      ward_id: match.city_id !== null ? (match.ward_id ?? "") : f.ward_id,
    }));
    setAutofilled(true);
  }

  function applySuggestion(s: GeoSuggestion): void {
    setLocateError("");
    fill(s);
  }

  /** Uses the device position, then asks Photon what is there. The pin is kept either way. */
  async function locateMe(): Promise<void> {
    setLocateError("");
    let coords: { latitude: number; longitude: number };
    try {
      coords = await devicePosition();
    } catch {
      setLocateError(LOCATE_ERROR);
      return;
    }
    setForm((f) => ({ ...f, ...coords }));
    try {
      const place = await reverseGeocode(coords.latitude, coords.longitude);
      if (place) fill(place, coords);
    } catch {
      // The pin is already set; the landlord can fill the address by hand.
    }
  }

  const clearAutofilled = (): void => {
    setAutofilled(false);
  };

  return { applySuggestion, locateMe, autofilled, locateError, clearAutofilled };
}
