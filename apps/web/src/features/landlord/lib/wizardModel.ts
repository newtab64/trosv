/*
  The listing wizard: its four steps, what each step checks before "Tiếp tục", and which
  step shows which field (to send the landlord back to a field the server rejected).
*/

import type { ListingFormState } from "./listingFormModel";

export const WIZARD_STEPS = ["Vị trí", "Thông tin", "Ảnh", "Mô tả"] as const;
export type WizardStep = 0 | 1 | 2 | 3;

type Errors = Record<string, string[]>;

const blank = (v: string | number): boolean => String(v).trim() === "";
const outside = (v: string | number, min: number, max: number): boolean => {
  const n = Number(v);
  return !Number.isFinite(n) || n < min || n > max;
};

function locationErrors(form: ListingFormState): Errors {
  const errors: Errors = {};
  if (blank(form.latitude) || blank(form.longitude)) {
    errors["latitude"] = ["Hãy chọn vị trí trên bản đồ."];
  }
  if (blank(form.ward_id)) errors["ward_id"] = ["Vui lòng chọn phường."];
  if (blank(form.address)) errors["address"] = ["Vui lòng nhập địa chỉ."];
  return errors;
}

function infoErrors(form: ListingFormState): Errors {
  const errors: Errors = {};
  const title = form.title.trim();
  if (title.length < 5 || title.length > 200) {
    errors["title"] = ["Tiêu đề phải từ 5 đến 200 ký tự."];
  }
  if (blank(form.type)) errors["type"] = ["Vui lòng chọn loại tin."];
  if (blank(form.price)) {
    errors["price"] = ["Vui lòng nhập giá."];
  } else if (outside(form.price, 100_000, 100_000_000)) {
    errors["price"] = ["Giá phải từ 100.000 đến 100.000.000 VND."];
  }
  if (blank(form.area_m2)) {
    errors["area_m2"] = ["Vui lòng nhập diện tích."];
  } else if (outside(form.area_m2, 5, 1000)) {
    errors["area_m2"] = ["Diện tích phải từ 5 đến 1000 m²."];
  }
  return errors;
}

/** What is wrong on `step`, keyed by form field. Photos and description never block. */
export function validateStep(step: WizardStep, form: ListingFormState): Errors {
  if (step === 0) return locationErrors(form);
  if (step === 1) return infoErrors(form);
  return {};
}

const STEP_FIELDS: Record<WizardStep, readonly string[]> = {
  0: ["latitude", "longitude", "city_id", "ward_id", "address"],
  1: ["title", "type", "price", "area_m2"],
  2: ["images"],
  3: ["description", "amenity_ids", "status"],
};

/** The step that shows `field` (a server key such as `images.0` counts as `images`). */
export function stepOfField(field: string): WizardStep | null {
  const key = field.split(".")[0] ?? field;
  for (const step of [0, 1, 2, 3] as const) {
    if (STEP_FIELDS[step].includes(key)) return step;
  }
  return null;
}
