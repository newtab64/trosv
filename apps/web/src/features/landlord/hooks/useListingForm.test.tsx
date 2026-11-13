import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import type { ChangeEvent, FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/shared/constants/routes";
import type { Listing } from "@/shared/types/api";
import { MAX_PHOTOS } from "../lib/listingFormModel";
import { useListingForm } from "./useListingForm";

const api = vi.hoisted(() => ({
  createListing: vi.fn(),
  updateListing: vi.fn(),
  uploadImages: vi.fn(),
  deleteImage: vi.fn(),
  getListing: vi.fn(),
  aiDescription: vi.fn(),
}));
vi.mock("@/features/landlord/api/landlordApi", () => ({
  createListing: api.createListing,
  updateListing: api.updateListing,
  uploadImages: api.uploadImages,
  deleteImage: api.deleteImage,
}));
vi.mock("@/features/listings/api/listingApi", () => ({ getListing: api.getListing }));
vi.mock("@/features/ai/api/aiApi", () => ({ aiDescription: api.aiDescription }));
vi.mock("@/features/listings/hooks/useReferenceData", () => {
  const empty = { data: [], loading: false, error: false, reload: () => undefined };
  return { useWards: () => empty, useCities: () => empty, useAmenities: () => empty };
});

const toast = { success: vi.fn(), error: vi.fn() };
const navigate = vi.fn();

const EXISTING = {
  id: 5,
  title: "Phòng A",
  type: "room",
  price: 2500000,
  area_m2: 20,
  address: "1 Võ Văn Ngân",
  latitude: 10.85,
  longitude: 106.77,
  description: "Mô tả cũ",
  ward: { id: 3, city: { id: 2 } },
  amenities: [{ id: 7 }, { id: 9 }],
  status: "available",
  images: [
    { id: 1, url: "u1" },
    { id: 2, url: "u2" },
  ],
} as unknown as Listing;

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;
const file = (name: string) => new File(["x"], name, { type: "image/png" });
const apiError = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

function mount(id?: number) {
  return renderHook(() => useListingForm(id, toast));
}

/** A create-mode form with the minimum filled in. */
function filled(result: ReturnType<typeof mount>["result"]) {
  act(() => {
    result.current.setField("title", "Phòng mới");
    result.current.setField("price", "2000000");
  });
}

beforeEach(() => {
  Object.values(api).forEach((fn) => {
    fn.mockReset();
  });
  toast.success.mockReset();
  toast.error.mockReset();
  navigate.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("useListingForm: loading", () => {
  it("starts empty in create mode and loads nothing", () => {
    const { result } = mount();
    expect(result.current.isEdit).toBe(false);
    expect(result.current.form.title).toBe("");
    expect(result.current.form.status).toBe("available");
    expect(api.getListing).not.toHaveBeenCalled();
  });

  it("loads the listing in edit mode and fills the form and photos", async () => {
    api.getListing.mockResolvedValue(EXISTING);
    const { result } = mount(5);

    await waitFor(() => {
      expect(result.current.form.title).toBe("Phòng A");
    });
    expect(result.current.isEdit).toBe(true);
    expect(result.current.form).toMatchObject({ city_id: 2, ward_id: 3, amenity_ids: [7, 9] });
    expect(result.current.images).toHaveLength(2);
    expect(api.getListing).toHaveBeenCalledWith(5);
  });

  it("says so when the listing cannot be loaded", async () => {
    api.getListing.mockRejectedValue(new Error("offline"));
    const { result } = mount(5);
    await waitFor(() => {
      expect(result.current.notice).toBe("offline");
    });
  });
});

describe("useListingForm: editing fields", () => {
  it("setField updates one field and clears old validation errors", async () => {
    api.createListing.mockRejectedValue(apiError(422, { errors: { title: ["Bắt buộc"] } }));
    const { result } = mount();
    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });
    expect(result.current.errors).toEqual({ title: ["Bắt buộc"] });

    act(() => {
      result.current.setField("title", "Có tên rồi");
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.form.title).toBe("Có tên rồi");
  });

  it("set(key) reads the value of an input event", () => {
    const { result } = mount();
    act(() => {
      result.current.set("address")({
        target: { value: "12 Lê Lợi" },
      } as ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.form.address).toBe("12 Lê Lợi");
  });

  it("choosing another city clears the ward so they never disagree", () => {
    const { result } = mount();
    act(() => {
      result.current.setField("ward_id", "3");
      result.current.changeCity("9");
    });
    expect(result.current.form.city_id).toBe("9");
    expect(result.current.form.ward_id).toBe("");
  });

  it("toggles amenities on and off", () => {
    const { result } = mount();
    act(() => {
      result.current.toggleAmenity(4);
      result.current.toggleAmenity(6);
    });
    expect(result.current.form.amenity_ids).toEqual([4, 6]);
    act(() => {
      result.current.toggleAmenity(4);
    });
    expect(result.current.form.amenity_ids).toEqual([6]);
  });

  it("setCoordinates stores the point and keeps a stable identity (the map effect depends on it)", () => {
    const { result, rerender } = mount();
    const before = result.current.setCoordinates;
    act(() => {
      result.current.setCoordinates(10.8, 106.7);
    });
    rerender();
    expect(result.current.form).toMatchObject({ latitude: 10.8, longitude: 106.7 });
    expect(result.current.setCoordinates).toBe(before);
  });
});

describe("useListingForm: AI description", () => {
  it("fills the description from what has been typed so far", async () => {
    api.aiDescription.mockResolvedValue({ description: "Phòng thoáng mát." });
    const { result } = mount();
    filled(result);

    await act(async () => {
      await result.current.generateDescription();
    });

    expect(api.aiDescription).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Phòng mới", price: 2000000 }),
    );
    expect(result.current.form.description).toBe("Phòng thoáng mát.");
    expect(result.current.aiBusy).toBe(false);
  });

  it("explains the failure and frees the button", async () => {
    api.aiDescription.mockRejectedValue(apiError(503, { message: "AI đang bận" }));
    const { result } = mount();

    await act(async () => {
      await result.current.generateDescription();
    });

    expect(result.current.notice).toBe("AI đang bận");
    expect(result.current.aiBusy).toBe(false);
    expect(result.current.form.description).toBe("");
  });

  it("an empty AI answer clears the description rather than leaving stale text", async () => {
    api.aiDescription.mockResolvedValue({ description: "" });
    const { result } = mount();
    act(() => {
      result.current.setField("description", "cũ");
    });
    await act(async () => {
      await result.current.generateDescription();
    });
    expect(result.current.form.description).toBe("");
  });
});

describe("useListingForm: submitting a new listing", () => {
  it("creates the listing, then goes back to the dashboard", async () => {
    api.createListing.mockResolvedValue({ id: 11 });
    const { result } = mount();
    filled(result);

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(api.createListing).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Phòng mới", price: 2000000 }),
    );
    expect(api.createListing.mock.calls[0]?.[0]).not.toHaveProperty("status");
    expect(api.uploadImages).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(ROUTES.LANDLORD);
    expect(result.current.busy).toBe(false);
  });

  it("uploads the chosen photos to the new listing before leaving", async () => {
    api.createListing.mockResolvedValue({ id: 11 });
    api.uploadImages.mockResolvedValue({});
    const { result } = mount();
    filled(result);
    const photos = [file("a.png"), file("b.png")];
    act(() => {
      result.current.pickFiles(photos);
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(api.uploadImages).toHaveBeenCalledWith(11, photos);
    expect(navigate).toHaveBeenCalledWith(ROUTES.LANDLORD);
  });

  it("shows field errors and stays on the form when the API rejects it", async () => {
    api.createListing.mockRejectedValue(
      apiError(422, { message: "Dữ liệu không hợp lệ.", errors: { price: ["Giá phải là số."] } }),
    );
    const { result } = mount();

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(result.current.errors).toEqual({ price: ["Giá phải là số."] });
    expect(result.current.notice).toBe("Dữ liệu không hợp lệ.");
    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.busy).toBe(false);
  });

  it("is busy while the request is in flight", async () => {
    let finish: (v: unknown) => void = () => undefined;
    api.createListing.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = mount();

    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      finish({ id: 11 });
      await pending;
    });
    expect(result.current.busy).toBe(false);
  });

  it("does not create the listing a second time when only the photo upload failed", async () => {
    api.createListing.mockResolvedValue({ id: 11 });
    api.updateListing.mockResolvedValue({ id: 11 });
    api.uploadImages.mockRejectedValueOnce(new Error("Upload thất bại")).mockResolvedValue({});
    const { result } = mount();
    filled(result);
    const photos = [file("a.png")];
    act(() => {
      result.current.pickFiles(photos);
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });
    expect(result.current.notice).toBe("Upload thất bại");
    expect(navigate).not.toHaveBeenCalled();

    // The landlord presses "save" again to retry the photos.
    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(api.createListing).toHaveBeenCalledTimes(1);
    expect(api.uploadImages).toHaveBeenLastCalledWith(11, photos);
    expect(navigate).toHaveBeenCalledWith(ROUTES.LANDLORD);
  });
});

describe("useListingForm: submitting an edit", () => {
  async function editMode() {
    api.getListing.mockResolvedValue(EXISTING);
    const hook = mount(5);
    await waitFor(() => {
      expect(hook.result.current.form.title).toBe("Phòng A");
    });
    return hook;
  }

  it("updates the listing (including its status) and opens it", async () => {
    api.updateListing.mockResolvedValue({ id: 5 });
    const { result } = await editMode();
    act(() => {
      result.current.setField("status", "rented");
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(api.updateListing).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ status: "rented" }),
    );
    expect(api.createListing).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/rooms/5");
  });

  it("uploads newly picked photos after the update", async () => {
    api.updateListing.mockResolvedValue({ id: 5 });
    api.uploadImages.mockResolvedValue({});
    const { result } = await editMode();
    const photos = [file("new.png")];
    act(() => {
      result.current.pickFiles(photos);
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(api.uploadImages).toHaveBeenCalledWith(5, photos);
  });

  it("stays on the form when the update fails", async () => {
    api.updateListing.mockRejectedValue(apiError(403, { message: "Không phải tin của bạn." }));
    const { result } = await editMode();

    await act(async () => {
      await result.current.handleSubmit(submitEvent(), navigate as NavigateFunction);
    });

    expect(result.current.notice).toBe("Không phải tin của bạn.");
    expect(navigate).not.toHaveBeenCalled();
  });
});

const pic = (name: string, size = 1000) => {
  const f = new File(["x"], name, { type: "image/png", lastModified: 1 });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("useListingForm: picking photos", () => {
  it("adds each pick to the earlier ones instead of replacing them", () => {
    const { result } = mount();
    const [a, b] = [pic("a.png"), pic("b.png")] as [File, File];
    act(() => {
      result.current.pickFiles([a]);
    });
    act(() => {
      result.current.pickFiles([b]);
    });
    expect(result.current.newFiles).toEqual([a, b]);
  });

  it("keeps one copy when the same file is picked twice", () => {
    const { result } = mount();
    act(() => {
      result.current.pickFiles([pic("a.png")]);
    });
    let accepted = true;
    act(() => {
      accepted = result.current.pickFiles([pic("a.png")]);
    });
    expect(accepted).toBe(false);
    expect(result.current.newFiles).toHaveLength(1);
  });

  it("keeps the valid photos and explains each skipped one", () => {
    const { result } = mount();
    let accepted = false;
    act(() => {
      accepted = result.current.pickFiles([pic("ok.png"), pic("lon.png", 6.4 * 1024 * 1024)]);
    });
    expect(accepted).toBe(true);
    expect(result.current.newFiles.map((f) => f.name)).toEqual(["ok.png"]);
    expect(result.current.photoNotices).toEqual([
      "“lon.png” nặng 6,4 MB, vượt 5 MB nên đã bị bỏ qua.",
    ]);
  });

  it("stops at the limit when creating", () => {
    const { result } = mount();
    act(() => {
      result.current.pickFiles(Array.from({ length: MAX_PHOTOS + 1 }, (_, i) => pic(`${i}.png`)));
    });
    expect(result.current.newFiles).toHaveLength(MAX_PHOTOS);
    expect(result.current.photoNotices).toEqual(["Chỉ còn chỗ cho 5 ảnh, đã bỏ 1 ảnh cuối."]);
  });

  it("counts the photos a listing already has when editing", async () => {
    api.getListing.mockResolvedValue(EXISTING); // already has 2
    const { result } = mount(5);
    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    act(() => {
      result.current.pickFiles([pic("a.png"), pic("b.png"), pic("c.png"), pic("d.png")]);
    });

    expect(result.current.newFiles).toHaveLength(3);
    expect(result.current.photoNotices).toEqual(["Chỉ còn chỗ cho 3 ảnh, đã bỏ 1 ảnh cuối."]);
  });
});

describe("useListingForm: photos", () => {
  it("removes one new photo by index", () => {
    const { result } = mount();
    const [a, b, c] = [pic("a.png"), pic("b.png"), pic("c.png")] as [File, File, File];
    act(() => {
      result.current.pickFiles([a, b, c]);
    });
    act(() => {
      result.current.removeNewFile(0);
    });
    expect(result.current.newFiles).toEqual([b, c]);
  });

  it("makeCover moves a photo to the front", () => {
    const { result } = mount();
    const [a, b, c] = [pic("a.png"), pic("b.png"), pic("c.png")] as [File, File, File];
    act(() => {
      result.current.pickFiles([a, b, c]);
    });
    act(() => {
      result.current.makeCover(2);
    });
    expect(result.current.newFiles).toEqual([c, a, b]);
  });

  it("clears the file input after every pick so the same file can be chosen again", () => {
    const { result } = mount();
    const input = { files: [pic("a.png")], value: "C:\\fakepath\\a.png" };
    act(() => {
      result.current.handleFilePick({ target: input } as unknown as ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.newFiles).toHaveLength(1);
    expect(input.value).toBe("");
  });

  it("deletes a photo after confirmation and drops it from the list", async () => {
    api.getListing.mockResolvedValue(EXISTING);
    api.deleteImage.mockResolvedValue({});
    const { result } = mount(5);
    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleDeleteImage(1);
    });

    expect(api.deleteImage).toHaveBeenCalledWith(5, 1);
    expect(result.current.images.map((i) => i.id)).toEqual([2]);
    expect(toast.success).toHaveBeenCalledWith("Đã xóa ảnh.");
  });

  it("keeps the photo when the user cancels", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    api.getListing.mockResolvedValue(EXISTING);
    const { result } = mount(5);
    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleDeleteImage(1);
    });

    expect(api.deleteImage).not.toHaveBeenCalled();
    expect(result.current.images).toHaveLength(2);
  });

  it("keeps the photo and reports an error when the delete fails", async () => {
    api.getListing.mockResolvedValue(EXISTING);
    api.deleteImage.mockRejectedValue(apiError(500, { message: "Lỗi máy chủ." }));
    const { result } = mount(5);
    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    await act(async () => {
      await result.current.handleDeleteImage(1);
    });

    expect(result.current.images).toHaveLength(2);
    expect(toast.error).toHaveBeenCalledWith("Lỗi máy chủ.");
  });

  it("cannot delete photos before the listing exists", async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.handleDeleteImage(1);
    });
    expect(api.deleteImage).not.toHaveBeenCalled();
  });
});
