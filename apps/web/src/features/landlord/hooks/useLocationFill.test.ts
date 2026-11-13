import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { City, Ward } from "@/shared/types/api";
import type { GeoSuggestion } from "../api/geocodeApi";
import { EMPTY_FORM, type ListingFormState } from "../lib/listingFormModel";
import { useLocationFill } from "./useLocationFill";

const reverse = vi.hoisted(() => vi.fn());
vi.mock("../api/geocodeApi", () => ({ reverseGeocode: reverse }));

const cities: City[] = [
  { id: 1, name: "Hà Nội" },
  { id: 2, name: "Hồ Chí Minh" },
];
const wards: Ward[] = [{ id: 10, name: "Bách Khoa", city: { id: 1, name: "Hà Nội" } }];
const sug = (over: Partial<GeoSuggestion> = {}): GeoSuggestion => ({
  id: "N1",
  label: "12 Ngõ 35 Đại Cồ Việt",
  detail: "",
  latitude: 21.005,
  longitude: 105.84,
  street: "12 Ngõ 35 Đại Cồ Việt",
  cityName: "Hà Nội",
  wardCandidates: ["Bách Khoa"],
  ...over,
});

function mount(initial: Partial<ListingFormState> = {}) {
  return renderHook(() => {
    const [form, setForm] = useState<ListingFormState>({ ...EMPTY_FORM, ...initial });
    return { form, ...useLocationFill({ cities, wards, setForm }) };
  });
}

const setGeolocation = (impl: unknown) => {
  Object.defineProperty(navigator, "geolocation", { value: impl, configurable: true });
};

beforeEach(() => {
  reverse.mockReset();
});
afterEach(() => {
  setGeolocation(undefined);
});

describe("useLocationFill: applySuggestion", () => {
  it("fills the pin, the address, the city and the ward", () => {
    const { result } = mount();
    act(() => {
      result.current.applySuggestion(sug());
    });
    expect(result.current.form).toMatchObject({
      latitude: 21.005,
      longitude: 105.84,
      address: "12 Ngõ 35 Đại Cồ Việt",
      city_id: 1,
      ward_id: 10,
    });
    expect(result.current.autofilled).toBe(true);
  });

  it("sets only the city and clears the ward when the ward is unknown", () => {
    const { result } = mount({ city_id: 2, ward_id: 99 });
    act(() => {
      result.current.applySuggestion(sug({ wardCandidates: ["Phường Lạ"] }));
    });
    expect(result.current.form).toMatchObject({ city_id: 1, ward_id: "" });
  });

  it("keeps the city and ward already chosen when nothing matches", () => {
    const { result } = mount({ city_id: 2, ward_id: 99 });
    act(() => {
      result.current.applySuggestion(sug({ cityName: "Huế", wardCandidates: ["Phú Hội"] }));
    });
    expect(result.current.form).toMatchObject({ city_id: 2, ward_id: 99, latitude: 21.005 });
  });

  it("keeps the typed address when the suggestion has no street line", () => {
    const { result } = mount({ address: "Số 5" });
    act(() => {
      result.current.applySuggestion(sug({ street: "" }));
    });
    expect(result.current.form.address).toBe("Số 5");
  });

  it("clearAutofilled turns the message off", () => {
    const { result } = mount();
    act(() => {
      result.current.applySuggestion(sug());
    });
    act(() => {
      result.current.clearAutofilled();
    });
    expect(result.current.autofilled).toBe(false);
  });
});

describe("useLocationFill: locateMe", () => {
  const position = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });

  it("uses the device position and fills the rest from the place found there", async () => {
    setGeolocation({
      getCurrentPosition: (ok: (p: unknown) => void) => {
        ok(position(21.1, 105.9));
      },
    });
    reverse.mockResolvedValue(sug({ latitude: 0, longitude: 0 }));
    const { result } = mount();
    await act(async () => {
      await result.current.locateMe();
    });
    expect(reverse).toHaveBeenCalledWith(21.1, 105.9);
    expect(result.current.form).toMatchObject({
      latitude: 21.1,
      longitude: 105.9,
      city_id: 1,
      ward_id: 10,
    });
    expect(result.current.locateError).toBe("");
  });

  it("keeps the position when the place lookup fails", async () => {
    setGeolocation({
      getCurrentPosition: (ok: (p: unknown) => void) => {
        ok(position(21.1, 105.9));
      },
    });
    reverse.mockRejectedValue(new Error("offline"));
    const { result } = mount();
    await act(async () => {
      await result.current.locateMe();
    });
    expect(result.current.form).toMatchObject({ latitude: 21.1, longitude: 105.9 });
    expect(result.current.locateError).toBe("");
  });

  it("explains a refusal and leaves the form alone", async () => {
    setGeolocation({
      getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => {
        fail({ code: 1 });
      },
    });
    const { result } = mount({ address: "Số 5" });
    await act(async () => {
      await result.current.locateMe();
    });
    expect(result.current.locateError).toBe(
      "Không lấy được vị trí. Hãy bật quyền vị trí hoặc chọn trên bản đồ.",
    );
    expect(result.current.form.address).toBe("Số 5");
    expect(result.current.form.latitude).toBe("");
  });

  it("gives the same message when the browser has no geolocation", async () => {
    setGeolocation(undefined);
    const { result } = mount();
    await act(async () => {
      await result.current.locateMe();
    });
    expect(result.current.locateError).toContain("Không lấy được vị trí");
  });
});
