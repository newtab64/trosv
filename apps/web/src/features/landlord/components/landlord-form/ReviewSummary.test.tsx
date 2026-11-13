import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingFormApi } from "./types";
import { ReviewSummary } from "./ReviewSummary";

const file = (n: string) => new File(["x"], n, { type: "image/png" });

function api(over: Record<string, unknown> = {}) {
  return {
    isEdit: false,
    images: [],
    newFiles: [file("a.png"), file("b.png"), file("c.png")],
    wards: [{ id: 10, name: "Bách Khoa", city: { id: 1, name: "Hà Nội" } }],
    form: { title: "Phòng gác lửng", price: "2500000", area_m2: "20", ward_id: 10 },
    ...over,
  } as unknown as ListingFormApi;
}

beforeEach(() => {
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReviewSummary", () => {
  it("shows the title, the price, the area, the ward and the photo count", () => {
    render(<ReviewSummary form={api()} />);
    expect(screen.getByText("Phòng gác lửng")).toBeInTheDocument();
    expect(screen.getByText(/2\.500\.000đ\/tháng/)).toBeInTheDocument();
    expect(screen.getByText(/20 m²/)).toBeInTheDocument();
    expect(screen.getByText(/Bách Khoa, Hà Nội/)).toBeInTheDocument();
    expect(screen.getByText(/3 ảnh/)).toBeInTheDocument();
  });

  it("counts the photos already on the listing when editing", () => {
    render(
      <ReviewSummary
        form={api({ isEdit: true, images: [{ id: 1, url: "u1" }], newFiles: [file("a.png")] })}
      />,
    );
    expect(screen.getByText(/2 ảnh/)).toBeInTheDocument();
  });

  it("copes with a form that is still empty", () => {
    render(
      <ReviewSummary
        form={api({
          newFiles: [],
          form: { title: "", price: "", area_m2: "", ward_id: "" },
        })}
      />,
    );
    expect(screen.getByText("Chưa có tiêu đề")).toBeInTheDocument();
    expect(screen.getByText(/0 ảnh/)).toBeInTheDocument();
  });
});
