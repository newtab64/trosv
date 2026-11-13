import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoSuggestion } from "../../api/geocodeApi";
import { AddressSearch } from "./AddressSearch";

const search = vi.hoisted(() => vi.fn());
vi.mock("../../hooks/useAddressSearch", () => ({ useAddressSearch: search }));

const sug = (n: number): GeoSuggestion => ({
  id: `N${String(n)}`,
  label: `Đường số ${String(n)}`,
  detail: "Bách Khoa, Hà Nội",
  latitude: 1,
  longitude: 2,
  street: `Đường số ${String(n)}`,
  cityName: "Hà Nội",
  wardCandidates: [],
});

beforeEach(() => {
  search.mockReset();
  search.mockReturnValue({ suggestions: [], status: "idle" });
});

const type = (value: string) => {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
};

describe("AddressSearch", () => {
  it("lists at most 5 suggestions with a name and a muted detail line", () => {
    search.mockReturnValue({ suggestions: [1, 2, 3, 4, 5, 6].map(sug), status: "idle" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("đường");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(5);
    expect(screen.getAllByText("Bách Khoa, Hà Nội")).toHaveLength(5);
  });

  it("picks a suggestion on click, closes the list and shows its name in the box", () => {
    search.mockReturnValue({ suggestions: [sug(1), sug(2)], status: "idle" });
    const onPick = vi.fn();
    render(<AddressSearch onPick={onPick} />);
    type("đường");
    fireEvent.click(screen.getByRole("option", { name: /Đường số 2/ }));
    expect(onPick).toHaveBeenCalledWith(sug(2));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveValue("Đường số 2");
  });

  it("selects with the arrow keys and Enter", () => {
    search.mockReturnValue({ suggestions: [sug(1), sug(2)], status: "idle" });
    const onPick = vi.fn();
    render(<AddressSearch onPick={onPick} />);
    type("đường");
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith(sug(2));
  });

  it("closes the list on Escape", () => {
    search.mockReturnValue({ suggestions: [sug(1)], status: "idle" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("đường");
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes the list when the box loses focus, and reopens it on focus", () => {
    search.mockReturnValue({ suggestions: [sug(1)], status: "idle" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("đường");
    const box = screen.getByRole("combobox");
    fireEvent.blur(box);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.focus(box);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("does not search again after a suggestion is picked", () => {
    search.mockReturnValue({ suggestions: [sug(1)], status: "idle" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("đường");
    fireEvent.click(screen.getByRole("option"));
    expect(search).toHaveBeenLastCalledWith("đường");
  });

  it("says 'Không tìm thấy địa chỉ' when nothing matches", () => {
    search.mockReturnValue({ suggestions: [], status: "empty" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("zzzz");
    expect(screen.getByText("Không tìm thấy địa chỉ")).toBeInTheDocument();
  });

  it("suggests clicking the map when the search fails", () => {
    search.mockReturnValue({ suggestions: [], status: "error" });
    render(<AddressSearch onPick={vi.fn()} />);
    type("zzzz");
    expect(
      screen.getByText("Không tìm thấy địa chỉ. Bạn có thể bấm vào bản đồ để chọn."),
    ).toBeInTheDocument();
  });
});
