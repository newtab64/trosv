import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useObjectUrls } from "./useObjectUrls";

const create = vi.fn((f: File) => `blob:${f.name}`);
const revoke = vi.fn();
const file = (name: string) => new File(["x"], name, { type: "image/png" });

beforeEach(() => {
  create.mockClear();
  revoke.mockClear();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useObjectUrls", () => {
  it("gives one URL per file, in the same order", () => {
    const files = [file("a.png"), file("b.png")];
    const { result } = renderHook(() => useObjectUrls(files));
    expect(result.current).toEqual(["blob:a.png", "blob:b.png"]);
  });

  it("does not recreate a URL for a file that is still there", () => {
    const [a, b] = [file("a.png"), file("b.png")] as [File, File];
    const { rerender } = renderHook(({ files }) => useObjectUrls(files), {
      initialProps: { files: [a] },
    });
    rerender({ files: [a, b] });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("revokes exactly the URL of a removed file", () => {
    const [a, b] = [file("a.png"), file("b.png")] as [File, File];
    const { rerender } = renderHook(({ files }) => useObjectUrls(files), {
      initialProps: { files: [a, b] },
    });
    rerender({ files: [b] });
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:a.png");
  });

  it("revokes the remaining URLs on unmount", () => {
    const files = [file("a.png"), file("b.png")];
    const { unmount } = renderHook(() => useObjectUrls(files));
    unmount();
    expect(revoke.mock.calls.map((c) => c[0] as string).sort()).toEqual([
      "blob:a.png",
      "blob:b.png",
    ]);
  });
});
