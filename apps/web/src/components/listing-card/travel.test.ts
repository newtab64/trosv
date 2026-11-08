import { describe, expect, it } from "vitest";
import { formatKm, travelMinutes } from "./travel";

describe("travelMinutes", () => {
  it.each([
    [0, 1],
    [0.1, 1],
    [0.4, 1],
    [1, 3],
    [1.2, 4],
    [2, 6],
    [10, 30],
  ])("%d km takes about %d min (at least 1)", (km, minutes) => {
    expect(travelMinutes(km)).toBe(minutes);
  });
});

describe("formatKm", () => {
  it("uses at most one decimal, with the Vietnamese comma", () => {
    expect(formatKm(1.234)).toBe("1,2");
    expect(formatKm(0.05)).toBe("0,1");
  });

  it("drops a trailing .0", () => {
    expect(formatKm(2)).toBe("2");
  });
});
