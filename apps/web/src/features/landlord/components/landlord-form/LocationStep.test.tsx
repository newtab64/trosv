import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListingFormApi } from "./types";
import { LocationStep } from "./LocationStep";

vi.mock("./CoordinatePicker", () => ({ CoordinatePicker: () => <div data-testid="map" /> }));
vi.mock("./AddressSearch", () => ({
  AddressSearch: ({ onPick }: { onPick: (s: unknown) => void }) => (
    <button
      type="button"
      onClick={() => {
        onPick({ id: "N1" });
      }}
    >
      mock-search
    </button>
  ),
}));

function api(over: Record<string, unknown> = {}) {
  const form = {
    form: { latitude: "", longitude: "", address: "", city_id: "", ward_id: "" },
    cities: [
      { id: 1, name: "Hà Nội" },
      { id: 2, name: "TP.HCM" },
    ],
    wards: [
      { id: 10, name: "Bách Khoa", city: { id: 1, name: "Hà Nội" } },
      { id: 11, name: "Phường 5", city: { id: 2, name: "TP.HCM" } },
    ],
    errors: {},
    set: vi.fn(() => vi.fn()),
    changeCity: vi.fn(),
    setCoordinates: vi.fn(),
    applySuggestion: vi.fn(),
    locateMe: vi.fn(),
    autofilled: false,
    locateError: "",
    ...over,
  };
  return form as unknown as ListingFormApi & typeof form;
}

describe("LocationStep", () => {
  it("hands a chosen suggestion to the form", () => {
    const form = api();
    render(<LocationStep form={form} />);
    fireEvent.click(screen.getByText("mock-search"));
    expect(form.applySuggestion).toHaveBeenCalledWith({ id: "N1" });
  });

  it("uses the current location on request", () => {
    const form = api();
    render(<LocationStep form={form} />);
    fireEvent.click(screen.getByRole("button", { name: /Dùng vị trí hiện tại/ }));
    expect(form.locateMe).toHaveBeenCalled();
  });

  it("tells the landlord what was filled in automatically", () => {
    render(<LocationStep form={api({ autofilled: true })} />);
    expect(
      screen.getByText("Đã tự điền từ địa chỉ bạn chọn. Bạn vẫn sửa được."),
    ).toBeInTheDocument();
  });

  it("shows why the current location could not be used", () => {
    render(<LocationStep form={api({ locateError: "Không lấy được vị trí." })} />);
    expect(screen.getByText("Không lấy được vị trí.")).toBeInTheDocument();
  });

  it("keeps the ward select empty until a city is chosen, then lists that city's wards", () => {
    const { rerender } = render(<LocationStep form={api()} />);
    expect(screen.getByLabelText(/Phường/)).toBeDisabled();
    rerender(
      <LocationStep
        form={api({ form: { latitude: "", longitude: "", address: "", city_id: 1, ward_id: "" } })}
      />,
    );
    expect(screen.getByLabelText(/Phường/)).toBeEnabled();
    expect(screen.getByRole("option", { name: "Bách Khoa" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Phường 5" })).toBeNull();
  });

  it("changes the city through changeCity", () => {
    const form = api();
    render(<LocationStep form={form} />);
    fireEvent.change(screen.getByLabelText("Tỉnh/TP"), { target: { value: "2" } });
    expect(form.changeCity).toHaveBeenCalledWith("2");
  });

  it("shows the coordinates on one muted line and hides the number fields", () => {
    const form = api({
      form: { latitude: 21.005, longitude: 105.84, address: "", city_id: "", ward_id: "" },
    });
    render(<LocationStep form={form} />);
    expect(screen.getByText(/21\.005, 105\.84/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Vĩ độ/)).toBeNull();
  });

  it("reveals the latitude and longitude fields on request", () => {
    render(<LocationStep form={api()} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập tọa độ thủ công" }));
    expect(screen.getByLabelText(/Vĩ độ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kinh độ/)).toBeInTheDocument();
  });

  it("shows a missing-pin error under the map", () => {
    const form = api({ errors: { latitude: ["Hãy chọn vị trí trên bản đồ."] } });
    render(<LocationStep form={form} />);
    expect(screen.getByText("Hãy chọn vị trí trên bản đồ.")).toBeInTheDocument();
  });
});
