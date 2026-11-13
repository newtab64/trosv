import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListingFormApi } from "./types";
import { PhotosStep } from "./PhotosStep";

const file = (name: string) => new File(["x"], name, { type: "image/png" });

function api(over: Partial<Record<keyof ListingFormApi, unknown>> = {}) {
  const form = {
    isEdit: false,
    images: [],
    newFiles: [file("a.png"), file("b.png"), file("c.png")],
    photoNotices: [],
    handleFilePick: vi.fn(),
    pickFiles: vi.fn(),
    removeNewFile: vi.fn(),
    makeCover: vi.fn(),
    handleDeleteImage: vi.fn(),
    ...over,
  };
  return form as unknown as ListingFormApi & typeof form;
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

describe("PhotosStep", () => {
  it("shows a thumbnail per new photo, the counter and the limits", () => {
    const { container } = render(<PhotosStep form={api()} />);
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(screen.getByText("3/5 ảnh")).toBeInTheDocument();
    expect(
      screen.getByText("JPG, PNG hoặc WebP · tối đa 5 ảnh · mỗi ảnh 5 MB"),
    ).toBeInTheDocument();
  });

  it("tags only the first photo as the cover", () => {
    render(<PhotosStep form={api()} />);
    expect(screen.getAllByText("Ảnh bìa")).toHaveLength(1);
  });

  it("removes a new photo by its position", () => {
    const form = api();
    render(<PhotosStep form={form} />);
    fireEvent.click(screen.getByRole("button", { name: "Xóa ảnh 2" }));
    expect(form.removeNewFile).toHaveBeenCalledWith(1);
  });

  it("offers 'Đặt làm ảnh bìa' on the non-first photos and calls makeCover", () => {
    const form = api();
    render(<PhotosStep form={form} />);
    const buttons = screen.getAllByRole("button", { name: "Đặt làm ảnh bìa" });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1] as HTMLElement);
    expect(form.makeCover).toHaveBeenCalledWith(2);
  });

  it("hides 'Đặt làm ảnh bìa' when the listing already has photos", () => {
    render(<PhotosStep form={api({ isEdit: true, images: [{ id: 1, url: "u1" }] })} />);
    expect(screen.queryByRole("button", { name: "Đặt làm ảnh bìa" })).toBeNull();
  });

  it("lists existing photos in edit mode and deletes one by id", () => {
    const form = api({
      isEdit: true,
      images: [
        { id: 7, url: "u7" },
        { id: 8, url: "u8" },
      ],
      newFiles: [],
    });
    render(<PhotosStep form={form} />);
    expect(screen.getByText("2/5 ảnh")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Xóa ảnh 2" }));
    expect(form.handleDeleteImage).toHaveBeenCalledWith(8);
  });

  it("shows every notice in an alert", () => {
    render(<PhotosStep form={api({ photoNotices: ["Một.", "Hai."] })} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Một.");
    expect(alert).toHaveTextContent("Hai.");
  });

  it("opens the file picker from the add tile and hides it at 5 photos", () => {
    const { container, rerender } = render(<PhotosStep form={api()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Thêm ảnh" }));
    expect(click).toHaveBeenCalled();
    rerender(
      <PhotosStep
        form={api({ newFiles: ["a", "b", "c", "d", "e"].map((n) => file(`${n}.png`)) })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Thêm ảnh" })).toBeNull();
  });
});
