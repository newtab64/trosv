import { describe, expect, it } from "vitest";
import type { Listing } from "@/shared/types/api";
import {
  EMPTY_FORM,
  MAX_PHOTOS,
  mergePhotos,
  movePhotoToFront,
  buildDescriptionRequest,
  buildListingPayload,
  formFromListing,
} from "./listingFormModel";

const FILLED = {
  ...EMPTY_FORM,
  title: "Phòng gác lửng",
  type: "apartment",
  price: "2900000",
  area_m2: "24",
  address: "214 Lương Nhữ Học",
  latitude: "16.06",
  longitude: "108.22",
  city_id: "1",
  ward_id: "10",
  description: "Thoáng mát",
  amenity_ids: [1, 2],
  status: "rented",
};

describe("formFromListing", () => {
  it("copies a full listing into form values", () => {
    const listing = {
      title: "Phòng A",
      type: "house",
      price: 3_000_000,
      area_m2: 30,
      address: "1 Đường B",
      latitude: 16.1,
      longitude: 108.2,
      ward: { id: 10, name: "Hải Châu", city: { id: 1, name: "Đà Nẵng" } },
      description: "Mô tả",
      amenities: [{ id: 4 }, { id: 7 }],
      status: "hidden",
    } as unknown as Listing;
    expect(formFromListing(listing)).toEqual({
      title: "Phòng A",
      type: "house",
      price: 3_000_000,
      area_m2: 30,
      address: "1 Đường B",
      latitude: 16.1,
      longitude: 108.2,
      city_id: 1,
      ward_id: 10,
      description: "Mô tả",
      amenity_ids: [4, 7],
      status: "hidden",
    });
  });

  it("fills sensible defaults for a sparse listing", () => {
    const form = formFromListing({ price: 1_000_000 } as unknown as Listing);
    expect(form).toMatchObject({
      title: "",
      type: "room",
      area_m2: "",
      latitude: "",
      city_id: "",
      ward_id: "",
      description: "",
      amenity_ids: [],
      status: "available",
    });
  });
});

describe("buildListingPayload", () => {
  it("turns the text fields into numbers", () => {
    expect(buildListingPayload(FILLED, false)).toMatchObject({
      price: 2_900_000,
      area_m2: 24,
      latitude: 16.06,
      longitude: 108.22,
      ward_id: 10,
      amenity_ids: [1, 2],
    });
  });

  it("sends the status only when editing", () => {
    expect(buildListingPayload(FILLED, false)).not.toHaveProperty("status");
    expect(buildListingPayload(FILLED, true).status).toBe("rented");
  });

  it("sends an empty description as null", () => {
    expect(buildListingPayload({ ...FILLED, description: "" }, false).description).toBeNull();
  });
});

describe("buildDescriptionRequest", () => {
  it("leaves out everything that is still blank", () => {
    expect(buildDescriptionRequest(EMPTY_FORM)).toEqual({
      title: undefined,
      type: "room",
      price: undefined,
      area_m2: undefined,
      address: undefined,
      ward_id: undefined,
      amenity_ids: undefined,
    });
  });

  it("sends numbers for the numeric fields and the chosen amenities", () => {
    expect(buildDescriptionRequest(FILLED)).toMatchObject({
      price: 2_900_000,
      area_m2: 24,
      ward_id: "10",
      amenity_ids: [1, 2],
    });
  });
});

const MB = 1024 * 1024;
const photo = (name: string, size = 1000, type = "image/png", lastModified = 1): File => {
  const f = new File(["x"], name, { type, lastModified });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("mergePhotos", () => {
  it("appends the incoming photos after the current ones", () => {
    const a = photo("a.png");
    const b = photo("b.png");
    const r = mergePhotos(0, [a], [b]);
    expect(r.files).toEqual([a, b]);
    expect(r.added).toBe(1);
    expect(r.notices).toEqual([]);
  });

  it("ignores a duplicate (same name, size and last modified) without a notice", () => {
    const a = photo("a.png");
    const r = mergePhotos(0, [a], [photo("a.png")]);
    expect(r.files).toEqual([a]);
    expect(r.added).toBe(0);
    expect(r.notices).toEqual([]);
  });

  it("skips a file that is not JPG, PNG or WebP and says so", () => {
    const r = mergePhotos(0, [], [photo("doc.pdf", 100, "application/pdf")]);
    expect(r.files).toEqual([]);
    expect(r.notices).toEqual(["“doc.pdf” không phải JPG, PNG hoặc WebP."]);
  });

  it("skips a file over 5 MB but keeps the valid ones in the same pick", () => {
    const ok = photo("ok.jpg", 1 * MB, "image/jpeg");
    const big = photo("lon.jpg", 6.4 * MB, "image/jpeg");
    const r = mergePhotos(0, [], [big, ok]);
    expect(r.files).toEqual([ok]);
    expect(r.notices).toEqual(["“lon.jpg” nặng 6,4 MB, vượt 5 MB nên đã bị bỏ qua."]);
  });

  it("accepts a file of exactly 5 MB", () => {
    const edge = photo("edge.webp", 5 * MB, "image/webp");
    expect(mergePhotos(0, [], [edge]).files).toEqual([edge]);
  });

  it("keeps only what fits when the listing already has photos", () => {
    const four = [1, 2, 3, 4].map((n) => photo(`${String(n)}.png`));
    const r = mergePhotos(3, [], four);
    expect(r.files).toEqual(four.slice(0, 2));
    expect(r.notices).toEqual(["Chỉ còn chỗ cho 2 ảnh, đã bỏ 2 ảnh cuối."]);
  });

  it("refuses everything when the listing is already full", () => {
    const r = mergePhotos(MAX_PHOTOS, [], [photo("a.png")]);
    expect(r.files).toEqual([]);
    expect(r.added).toBe(0);
    expect(r.notices).toEqual(["Tin đăng đã đủ 5 ảnh."]);
  });
});

describe("movePhotoToFront", () => {
  const [a, b, c] = [photo("a.png"), photo("b.png"), photo("c.png")] as [File, File, File];

  it("moves the chosen photo to index 0", () => {
    expect(movePhotoToFront([a, b, c], 2)).toEqual([c, a, b]);
  });

  it("keeps the order for index 0 or an index out of range", () => {
    expect(movePhotoToFront([a, b, c], 0)).toEqual([a, b, c]);
    expect(movePhotoToFront([a, b, c], 9)).toEqual([a, b, c]);
  });
});
