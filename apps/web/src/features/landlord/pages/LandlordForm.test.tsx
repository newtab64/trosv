import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandlordForm from "./LandlordForm";

const api = vi.hoisted(() => ({
  createListing: vi.fn(),
  updateListing: vi.fn(),
  uploadImages: vi.fn(),
  deleteImage: vi.fn(),
  getListing: vi.fn(),
}));
vi.mock("@/features/landlord/api/landlordApi", () => ({
  createListing: api.createListing,
  updateListing: api.updateListing,
  uploadImages: api.uploadImages,
  deleteImage: api.deleteImage,
}));
vi.mock("@/features/listings/api/listingApi", () => ({ getListing: api.getListing }));
vi.mock("@/features/ai/api/aiApi", () => ({ aiDescription: vi.fn() }));
vi.mock("@/shared/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/features/listings/hooks/useReferenceData", () => {
  const ok = (data: unknown[]) => ({ data, loading: false, error: false, reload: () => undefined });
  const cities = [{ id: 1, name: "Hà Nội" }];
  const wards = [{ id: 10, name: "Bách Khoa", city: { id: 1, name: "Hà Nội" } }];
  return { useCities: () => ok(cities), useWards: () => ok(wards), useAmenities: () => ok([]) };
});
vi.mock("../components/landlord-form/CoordinatePicker", () => ({
  CoordinatePicker: ({ onPick }: { onPick: (a: number, b: number) => void }) => (
    <button
      type="button"
      onClick={() => {
        onPick(21.005, 105.84);
      }}
    >
      đặt ghim
    </button>
  ),
}));

const apiError = (status: number, data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

function mount(path = "/landlord/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/landlord/new" element={<LandlordForm />} />
        <Route path="/landlord/edit/:id" element={<LandlordForm />} />
        <Route path="/landlord" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;
const change = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
};
const next = () => {
  fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
};
const heading = (name: string) => screen.getByRole("heading", { level: 2, name });

function fillLocation() {
  fireEvent.click(screen.getByRole("button", { name: "đặt ghim" }));
  change(byId("lf-city"), "1");
  change(byId("lf-ward"), "10");
  change(byId("lf-address"), "12 Đại Cồ Việt");
}
function fillInfo() {
  change(byId("lf-title"), "Phòng gác lửng");
  change(byId("lf-price"), "2500000");
  change(byId("lf-area"), "20");
}
/** Walks a create form up to the last step. */
function toLastStep() {
  fillLocation();
  next();
  fillInfo();
  next();
  next();
}

beforeEach(() => {
  Object.values(api).forEach((fn) => {
    fn.mockReset();
  });
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() }),
  );
});

describe("LandlordForm wizard", () => {
  it("shows the stepper and only the first step, with a plain title", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Đăng tin mới" })).toBeInTheDocument();
    expect(document.querySelector("h1 mark")).toBeNull();
    expect(screen.getByLabelText("Các bước đăng tin")).toBeInTheDocument();
    expect(heading("Phòng ở đâu?")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Thông tin chính" })).toBeNull();
  });

  it("stays on the step and shows the errors when 'Tiếp tục' finds a problem", () => {
    mount();
    next();
    expect(heading("Phòng ở đâu?")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng chọn phường.")).toBeInTheDocument();
    expect(screen.getByText("Hãy chọn vị trí trên bản đồ.")).toBeInTheDocument();
  });

  it("moves through the steps and keeps what was typed when going back", () => {
    mount();
    fillLocation();
    next();
    expect(heading("Thông tin chính")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Quay lại$/ }));
    expect(byId("lf-address").value).toBe("12 Đại Cồ Việt");
  });

  it("pressing Enter in a field on an earlier step goes to the next step and never saves", () => {
    const { container } = mount();
    fillLocation();
    next();
    fillInfo();
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    expect(heading("Ảnh")).toBeInTheDocument();
    expect(api.createListing).not.toHaveBeenCalled();
  });

  it("ends with a review and the 'Đăng tin' button, which saves once", async () => {
    api.createListing.mockResolvedValue({ id: 11 });
    mount();
    toLastStep();
    expect(screen.getByText("Xem lại trước khi đăng")).toBeInTheDocument();
    expect(screen.getByText("Phòng gác lửng")).toBeInTheDocument();
    // Reaching the last step must not save by itself.
    expect(api.createListing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đăng tin" }));
    await waitFor(() => {
      expect(screen.getByText("dashboard")).toBeInTheDocument();
    });
    expect(api.createListing).toHaveBeenCalledTimes(1);
  });

  it("goes back to the step of a field the server rejected", async () => {
    api.createListing.mockRejectedValue(
      apiError(422, {
        message: "Dữ liệu không hợp lệ.",
        errors: { ward_id: ["Phường không tồn tại."] },
      }),
    );
    mount();
    toLastStep();
    fireEvent.click(screen.getByRole("button", { name: "Đăng tin" }));
    await waitFor(() => {
      expect(heading("Phòng ở đâu?")).toBeInTheDocument();
    });
    expect(screen.getByText("Phường không tồn tại.")).toBeInTheDocument();
  });

  it("when editing, loads the listing, offers 'Lưu thay đổi' and lets every step be clicked", async () => {
    api.getListing.mockResolvedValue({
      id: 5,
      title: "Phòng A",
      type: "room",
      price: 2500000,
      area_m2: 20,
      address: "1 Võ Văn Ngân",
      latitude: 10.85,
      longitude: 106.77,
      ward: { id: 10, city: { id: 1 } },
      amenities: [],
      images: [],
      status: "available",
    });
    mount("/landlord/edit/5");
    await waitFor(() => {
      expect(byId("lf-address").value).toBe("1 Võ Văn Ngân");
    });
    fireEvent.click(screen.getByRole("button", { name: /Mô tả/ }));
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeInTheDocument();
  });
});
