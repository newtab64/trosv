/*
  Pure model of the landlord listing form: initial values, the request
  payloads, the address-guess rule and the photo limits. No React.
*/

import type { Listing, ListingPayload } from "@/shared/types/api";

export interface ListingFormState {
  title: string;
  type: string;
  price: string | number;
  area_m2: string | number;
  address: string;
  latitude: string | number;
  longitude: string | number;
  city_id: string | number;
  ward_id: string | number;
  description: string;
  amenity_ids: number[];
  status: string;
}

export const EMPTY_FORM: ListingFormState = {
  title: "",
  type: "room",
  price: "",
  area_m2: "",
  address: "",
  latitude: "",
  longitude: "",
  city_id: "",
  ward_id: "",
  description: "",
  amenity_ids: [],
  status: "available",
};

/** Most photos a listing may have. */
export const MAX_PHOTOS = 5;

const orElse = <T, F>(value: T | null | undefined, fallback: F): T | F => value || fallback;
const orBlank = <T>(value: T | null | undefined): T | "" => value ?? "";

/** Form values for editing an existing listing. */
export function formFromListing(l: Listing): ListingFormState {
  return {
    title: orElse(l.title, ""),
    type: orElse(l.type, "room"),
    price: l.price,
    area_m2: orBlank(l.area_m2),
    address: orElse(l.address, ""),
    latitude: orBlank(l.latitude),
    longitude: orBlank(l.longitude),
    city_id: orElse(l.ward?.city?.id, ""),
    ward_id: orElse(l.ward?.id, ""),
    description: orElse(l.description, ""),
    amenity_ids: orElse(
      l.amenities?.map((a) => a.id),
      [],
    ),
    status: orElse(l.status, "available"),
  };
}

/** Body of POST /listings (create) or PUT /listings/{id} (edit adds the status). */
export function buildListingPayload(form: ListingFormState, isEdit: boolean): ListingPayload {
  const payload: ListingPayload = {
    title: form.title,
    type: form.type,
    price: Number(form.price),
    area_m2: Number(form.area_m2),
    address: form.address,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    ward_id: Number(form.ward_id),
    description: form.description || null,
    amenity_ids: form.amenity_ids,
  };
  if (isEdit) payload.status = form.status;
  return payload;
}

/** Body of POST /ai/description: only the fields the landlord has filled in. */
export function buildDescriptionRequest(form: ListingFormState) {
  return {
    title: form.title || undefined,
    type: form.type || undefined,
    price: form.price === "" ? undefined : Number(form.price),
    area_m2: form.area_m2 === "" ? undefined : Number(form.area_m2),
    address: form.address || undefined,
    ward_id: form.ward_id || undefined,
    amenity_ids: form.amenity_ids.length ? form.amenity_ids : undefined,
  };
}

/** Biggest photo the API accepts (matches `max:5120` in ListingImageUploadRequest). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp"];

export interface MergeResult {
  /** The whole new set: the current photos plus the ones that were accepted. */
  files: File[];
  /** One sentence per skipped file, plus one if the limit trimmed the pick. */
  notices: string[];
  /** How many of the incoming files were accepted. */
  added: number;
}

const sameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const megabytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");

/**
 * Adds a pick to the photos already chosen. Duplicates are ignored quietly, files that are
 * not images or are too big are skipped one by one, and whatever does not fit under the
 * 5-photo limit (counting `existingCount` photos already on the listing) is dropped.
 */
export function mergePhotos(existingCount: number, current: File[], incoming: File[]): MergeResult {
  const notices: string[] = [];
  const accepted: File[] = [];
  for (const file of incoming) {
    if ([...current, ...accepted].some((f) => sameFile(f, file))) continue;
    if (!PHOTO_TYPES.includes(file.type)) {
      notices.push(`“${file.name}” không phải JPG, PNG hoặc WebP.`);
    } else if (file.size > MAX_PHOTO_BYTES) {
      notices.push(`“${file.name}” nặng ${megabytes(file.size)} MB, vượt 5 MB nên đã bị bỏ qua.`);
    } else {
      accepted.push(file);
    }
  }
  const room = Math.max(0, MAX_PHOTOS - existingCount - current.length);
  const kept = accepted.slice(0, room);
  if (accepted.length > 0 && room === 0) {
    notices.push("Tin đăng đã đủ 5 ảnh.");
  } else if (kept.length < accepted.length) {
    notices.push(
      `Chỉ còn chỗ cho ${String(room)} ảnh, đã bỏ ${String(accepted.length - kept.length)} ảnh cuối.`,
    );
  }
  return { files: [...current, ...kept], notices, added: kept.length };
}

/** The same photos with the one at `index` first (the first photo is the cover). */
export function movePhotoToFront(files: File[], index: number): File[] {
  if (index <= 0 || index >= files.length) return files;
  return [files[index] as File, ...files.slice(0, index), ...files.slice(index + 1)];
}
