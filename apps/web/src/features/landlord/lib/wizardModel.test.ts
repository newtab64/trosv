import { describe, expect, it } from "vitest";
import { EMPTY_FORM } from "./listingFormModel";
import { stepOfField, validateStep, WIZARD_STEPS } from "./wizardModel";

const PLACE = {
  ...EMPTY_FORM,
  latitude: 21.005,
  longitude: 105.84,
  ward_id: 10,
  address: "12 Đại Cồ Việt",
};
const INFO = {
  ...EMPTY_FORM,
  title: "Phòng gác lửng",
  type: "room",
  price: "2500000",
  area_m2: "20",
};

describe("WIZARD_STEPS", () => {
  it("lists the four steps in order", () => {
    expect([...WIZARD_STEPS]).toEqual(["Vị trí", "Thông tin", "Ảnh", "Mô tả"]);
  });
});

describe("validateStep: location", () => {
  it("asks for a pin, a ward and an address", () => {
    expect(validateStep(0, EMPTY_FORM)).toEqual({
      latitude: ["Hãy chọn vị trí trên bản đồ."],
      ward_id: ["Vui lòng chọn phường."],
      address: ["Vui lòng nhập địa chỉ."],
    });
  });

  it("passes when all three are there", () => {
    expect(validateStep(0, PLACE)).toEqual({});
  });

  it("treats a blank address as missing and accepts a pin at 0, 0 only when typed", () => {
    expect(validateStep(0, { ...PLACE, address: "   " })).toEqual({
      address: ["Vui lòng nhập địa chỉ."],
    });
    expect(validateStep(0, { ...PLACE, latitude: "", longitude: 105 }).latitude).toBeDefined();
  });
});

describe("validateStep: info", () => {
  it("passes with a filled form", () => {
    expect(validateStep(1, INFO)).toEqual({});
  });

  it("checks the title length (5 to 200)", () => {
    expect(validateStep(1, { ...INFO, title: "abcd" }).title).toEqual([
      "Tiêu đề phải từ 5 đến 200 ký tự.",
    ]);
    expect(validateStep(1, { ...INFO, title: "a".repeat(201) }).title).toBeDefined();
    expect(validateStep(1, { ...INFO, title: "abcde" })).toEqual({});
  });

  it("checks the price (100000 to 100000000)", () => {
    expect(validateStep(1, { ...INFO, price: "" }).price).toEqual(["Vui lòng nhập giá."]);
    expect(validateStep(1, { ...INFO, price: "99999" }).price).toEqual([
      "Giá phải từ 100.000 đến 100.000.000 VND.",
    ]);
    expect(validateStep(1, { ...INFO, price: "100000001" }).price).toBeDefined();
    expect(validateStep(1, { ...INFO, price: "100000" })).toEqual({});
  });

  it("checks the area (5 to 1000)", () => {
    expect(validateStep(1, { ...INFO, area_m2: "" }).area_m2).toEqual(["Vui lòng nhập diện tích."]);
    expect(validateStep(1, { ...INFO, area_m2: "4" }).area_m2).toEqual([
      "Diện tích phải từ 5 đến 1000 m².",
    ]);
    expect(validateStep(1, { ...INFO, area_m2: "1001" }).area_m2).toBeDefined();
  });

  it("requires a type", () => {
    expect(validateStep(1, { ...INFO, type: "" }).type).toEqual(["Vui lòng chọn loại tin."]);
  });
});

describe("validateStep: photos and description", () => {
  it("never blocks", () => {
    expect(validateStep(2, EMPTY_FORM)).toEqual({});
    expect(validateStep(3, EMPTY_FORM)).toEqual({});
  });
});

describe("stepOfField", () => {
  it("maps every form field to the step that shows it", () => {
    expect(stepOfField("latitude")).toBe(0);
    expect(stepOfField("longitude")).toBe(0);
    expect(stepOfField("city_id")).toBe(0);
    expect(stepOfField("ward_id")).toBe(0);
    expect(stepOfField("address")).toBe(0);
    expect(stepOfField("title")).toBe(1);
    expect(stepOfField("type")).toBe(1);
    expect(stepOfField("price")).toBe(1);
    expect(stepOfField("area_m2")).toBe(1);
    expect(stepOfField("images")).toBe(2);
    expect(stepOfField("images.0")).toBe(2);
    expect(stepOfField("description")).toBe(3);
    expect(stepOfField("amenity_ids")).toBe(3);
    expect(stepOfField("status")).toBe(3);
  });

  it("returns null for a field no step shows", () => {
    expect(stepOfField("something_else")).toBeNull();
  });
});
