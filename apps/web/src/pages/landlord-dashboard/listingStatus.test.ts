import { describe, expect, it } from "vitest";
import { STATUS_FILTERS, statusDotClass, statusLabel, statusPillClass } from "./listingStatus";

describe("listing status look", () => {
  it.each([
    ["available", "Còn trống"],
    ["rented", "Đã thuê"],
    ["hidden", "Ẩn"],
  ])("labels %s as %s", (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });

  it("says 'Mới' when there is no status and shows an unknown one as it is", () => {
    expect(statusLabel(undefined)).toBe("Mới");
    expect(statusLabel("")).toBe("Mới");
    expect(statusLabel("archived")).toBe("archived");
  });

  it("gives each known status its own pill colour", () => {
    expect(statusPillClass("available")).toContain("bg-moss");
    expect(statusPillClass("rented")).toContain("bg-ink");
    expect(statusPillClass("hidden")).toContain("bg-muted");
  });

  it("has no pill colour for an unknown status", () => {
    expect(statusPillClass("archived")).toBe("");
    expect(statusPillClass(undefined)).toBe("");
  });

  it("fades the dot from solid to faint, and defaults to solid", () => {
    expect(statusDotClass("available")).toBe("bg-white");
    expect(statusDotClass("rented")).toBe("bg-white/70");
    expect(statusDotClass("hidden")).toBe("bg-white/50");
    expect(statusDotClass("archived")).toBe("bg-white");
    expect(statusDotClass(undefined)).toBe("bg-white");
  });

  it("offers a filter for every status, plus 'all' first", () => {
    expect(STATUS_FILTERS.map((f) => f.value)).toEqual(["", "available", "rented", "hidden"]);
  });
});
