import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reverseGeocode, searchAddress } from "./geocodeApi";

const feature = (props: Record<string, unknown>, coords: [number, number] = [105.84, 21.005]) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: coords },
  properties: { osm_id: 1, osm_type: "N", countrycode: "VN", ...props },
});

const respond = (features: unknown[], ok = true) =>
  vi
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 503, json: () => Promise.resolve({ features }) });

let fetchMock: ReturnType<typeof respond>;
beforeEach(() => {
  fetchMock = respond([]);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const calledUrl = () => new URL(fetchMock.mock.calls[0]?.[0] as string);

describe("searchAddress", () => {
  it("asks Photon for 5 results inside Vietnam and sends no credentials", async () => {
    await searchAddress("12 Đại Cồ Việt");
    const url = calledUrl();
    expect(url.origin + url.pathname).toBe("https://photon.komoot.io/api/");
    expect(url.searchParams.get("q")).toBe("12 Đại Cồ Việt");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("bbox")).toBe("102.1,8.4,109.5,23.4");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.stringify(init?.headers ?? {}).toLowerCase()).not.toContain("authorization");
  });

  it("maps a feature to a suggestion (coordinates arrive as [lon, lat])", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [
            feature({
              street: "Ngõ 35 Đại Cồ Việt",
              housenumber: "12",
              locality: "Bách Khoa",
              district: "Hai Bà Trưng",
              city: "Hà Nội",
              state: "Hà Nội",
            }),
          ],
        }),
    });
    const [s] = await searchAddress("12 ngõ 35");
    expect(s).toEqual({
      id: "N1",
      label: "12 Ngõ 35 Đại Cồ Việt",
      detail: "Bách Khoa, Hai Bà Trưng, Hà Nội",
      latitude: 21.005,
      longitude: 105.84,
      street: "12 Ngõ 35 Đại Cồ Việt",
      cityName: "Hà Nội",
      wardCandidates: ["Bách Khoa", "Hai Bà Trưng"],
    });
  });

  it("uses the name when the place has no street line", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [feature({ name: "Đại Cồ Việt", district: "Hai Bà Trưng", state: "Hà Nội" })],
        }),
    });
    const [s] = await searchAddress("đại cồ việt");
    expect(s?.street).toBe("Đại Cồ Việt");
    expect(s?.cityName).toBe("Hà Nội");
  });

  it("drops results outside Vietnam", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          features: [feature({ name: "Vientiane", countrycode: "LA" }), feature({ name: "Huế" })],
        }),
    });
    const list = await searchAddress("hue");
    expect(list.map((s) => s.street)).toEqual(["Huế"]);
  });

  it("rejects when Photon answers with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) });
    await expect(searchAddress("abc")).rejects.toThrow();
  });

  it("passes the abort signal through and surfaces an AbortError", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const pending = searchAddress("abc", controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("reverseGeocode", () => {
  it("asks Photon for the place at a point", async () => {
    await reverseGeocode(21.005, 105.84);
    const url = calledUrl();
    expect(url.pathname).toBe("/reverse");
    expect(url.searchParams.get("lat")).toBe("21.005");
    expect(url.searchParams.get("lon")).toBe("105.84");
  });

  it("returns null when nothing is found", async () => {
    expect(await reverseGeocode(0, 0)).toBeNull();
  });

  it("returns the first suggestion", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ features: [feature({ street: "Đại Cồ Việt", state: "Hà Nội" })] }),
    });
    expect((await reverseGeocode(21.005, 105.84))?.street).toBe("Đại Cồ Việt");
  });
});
