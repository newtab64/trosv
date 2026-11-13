import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoSuggestion } from "../api/geocodeApi";
import { useAddressSearch } from "./useAddressSearch";

const search = vi.hoisted(() => vi.fn());
vi.mock("../api/geocodeApi", () => ({ searchAddress: search }));

const sug = (street: string): GeoSuggestion => ({
  id: street,
  label: street,
  detail: "",
  latitude: 1,
  longitude: 2,
  street,
  cityName: null,
  wardCandidates: [],
});

const flush = () => act(() => vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  vi.useFakeTimers();
  search.mockReset();
  search.mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useAddressSearch", () => {
  it("does nothing for fewer than 3 characters (after trimming)", async () => {
    const { result } = renderHook(() => useAddressSearch("  ab "));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(search).not.toHaveBeenCalled();
    expect(result.current).toEqual({ suggestions: [], status: "idle" });
  });

  it("waits 300 ms after the last keystroke and searches once", async () => {
    const { rerender } = renderHook(({ q }) => useAddressSearch(q), {
      initialProps: { q: "12 n" },
    });
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender({ q: "12 ngõ" });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(search).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toBe("12 ngõ");
  });

  it("returns the suggestions", async () => {
    search.mockResolvedValue([sug("A"), sug("B")]);
    const { result } = renderHook(() => useAddressSearch("đại cồ"));
    await act(() => vi.advanceTimersByTimeAsync(300));
    await flush();
    expect(result.current.suggestions.map((s) => s.street)).toEqual(["A", "B"]);
    expect(result.current.status).toBe("idle");
  });

  it("aborts the request of an older query when a newer one starts", async () => {
    search.mockReturnValue(new Promise(() => undefined));
    const { rerender } = renderHook(({ q }) => useAddressSearch(q), { initialProps: { q: "abc" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    const firstSignal = search.mock.calls[0]?.[1] as AbortSignal;
    rerender({ q: "abcd" });
    expect(firstSignal.aborted).toBe(true);
  });

  it("ignores a slow answer that arrives after a newer query", async () => {
    let resolveFirst: (v: GeoSuggestion[]) => void = () => undefined;
    search
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveFirst = r;
          }),
      )
      .mockResolvedValueOnce([sug("new")]);
    const { result, rerender } = renderHook(({ q }) => useAddressSearch(q), {
      initialProps: { q: "abc" },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    rerender({ q: "abcd" });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await flush();
    await act(async () => {
      resolveFirst([sug("old")]);
      await Promise.resolve();
    });
    expect(result.current.suggestions.map((s) => s.street)).toEqual(["new"]);
  });

  it("ignores an answer that arrives after unmount", async () => {
    let resolve: (v: GeoSuggestion[]) => void = () => undefined;
    search.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const { unmount } = renderHook(() => useAddressSearch("abc"));
    await act(() => vi.advanceTimersByTimeAsync(300));
    unmount();
    await expect(
      act(async () => {
        resolve([sug("late")]);
        await Promise.resolve();
      }),
    ).resolves.toBeUndefined();
  });

  it("says 'empty' when nothing is found and 'error' when the search fails", async () => {
    const { result, rerender } = renderHook(({ q }) => useAddressSearch(q), {
      initialProps: { q: "abc" },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await flush();
    expect(result.current.status).toBe("empty");

    search.mockRejectedValue(new Error("offline"));
    rerender({ q: "abcd" });
    await act(() => vi.advanceTimersByTimeAsync(300));
    await flush();
    expect(result.current.status).toBe("error");
  });

  it("does not report an aborted request as an error", async () => {
    search.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const { result } = renderHook(() => useAddressSearch("abc"));
    await act(() => vi.advanceTimersByTimeAsync(300));
    await flush();
    expect(result.current.status).not.toBe("error");
  });
});
