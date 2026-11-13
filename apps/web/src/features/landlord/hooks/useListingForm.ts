import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  createListing,
  updateListing,
  uploadImages,
  deleteImage,
} from "@/features/landlord/api/landlordApi";
import { getListing } from "@/features/listings/api/listingApi";
import { useAmenities, useCities, useWards } from "@/features/listings/hooks/useReferenceData";
import { aiDescription } from "@/features/ai/api/aiApi";
import { toggleId } from "@/shared/lib/list";
import { errMessage, errFieldErrors } from "@/shared/api/axiosClient";
import { ROUTES, route } from "@/shared/constants/routes";
import type { ListingImage, ListingPayload } from "@/shared/types/api";
import {
  EMPTY_FORM,
  buildDescriptionRequest,
  buildListingPayload,
  formFromListing,
  mergePhotos,
  movePhotoToFront,
  type ListingFormState,
} from "../lib/listingFormModel";

/** Toast interface du can cua hook - khong toan bo toast context. */
export interface ToastLike {
  success: (msg: string) => unknown;
  error: (msg: string) => unknown;
}

/**
 * Saves the form and returns where to go next. When creating, the id of the new listing is
 * remembered in `createdId`: if the photo upload that follows fails and the landlord presses
 * save again, the retry updates that listing instead of creating a duplicate.
 */
async function saveListing(args: {
  id: number | undefined;
  createdId: { current: number | null };
  payload: ListingPayload;
  files: File[];
}): Promise<string> {
  const { id, createdId, payload, files } = args;
  if (id) {
    const updated = await updateListing(id, payload);
    if (files.length > 0) await uploadImages(id, files);
    return route(ROUTES.ROOM_DETAIL, { id: updated.id });
  }
  let listingId = createdId.current;
  if (listingId === null) {
    listingId = (await createListing(payload)).id;
    createdId.current = listingId;
  } else {
    await updateListing(listingId, payload);
  }
  if (files.length > 0) await uploadImages(listingId, files);
  return ROUTES.LANDLORD;
}

/**
 * Listing create/edit form state and actions for the landlord pages:
 * reference data, edit-mode load, field setters with cascade (city resets
 * ward), ward-centroid memo for the map, AI description generation,
 * image picking/deleting and the final submit payload (create or update,
 * uploading any newly picked images afterwards).
 */
export function useListingForm(id: number | undefined, toast: ToastLike) {
  const isEdit = !!id;

  const { data: wards } = useWards();
  const { data: cities } = useCities();
  const { data: amenities } = useAmenities();
  const [form, setForm] = useState<ListingFormState>({ ...EMPTY_FORM });
  const [images, setImages] = useState<ListingImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [photoNotices, setPhotoNotices] = useState<string[]>([]);
  // Id of the listing this form already created. If the photo upload that follows the
  // create fails, pressing save again must finish the job, not create a second listing.
  const createdId = useRef<number | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    getListing(id)
      .then((l) => {
        setForm(formFromListing(l));
        setImages(l.images || []);
      })
      .catch((err: unknown) => {
        setNotice(errMessage(err, "Không tải được tin đăng."));
      });
  }, [id, isEdit]);

  const setField = (key: keyof ListingFormState, value: string): void => {
    setErrors({});
    setForm((f) => ({ ...f, [key]: value }));
  };

  /** onChange handler for a text input, select or textarea bound to `key`. */
  const set =
    (key: keyof ListingFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setField(key, e.target.value);
    };

  /** Choosing another city clears the ward, so the two never disagree. */
  const changeCity = (cityId: string): void => {
    setErrors({});
    setForm((f) => ({ ...f, city_id: cityId, ward_id: "" }));
  };

  /** Stable on purpose: the map effect depends on it and must not restart. */
  const setCoordinates = useCallback((latitude: number, longitude: number): void => {
    setForm((f) => ({ ...f, latitude, longitude }));
  }, []);

  function toggleAmenity(amenityId: number): void {
    setForm((f) => ({ ...f, amenity_ids: toggleId(f.amenity_ids, amenityId) }));
  }

  /** "Viết mô tả giúp tôi" - POST /ai/description (Landlord). */
  async function generateDescription(): Promise<void> {
    setAiBusy(true);
    setNotice("");
    try {
      const { description } = await aiDescription(buildDescriptionRequest(form));
      setForm((f) => ({ ...f, description: description || "" }));
    } catch (err) {
      setNotice(errMessage(err, "AI không tạo được mô tả lúc này."));
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent, navigate: NavigateFunction): Promise<void> {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    setNotice("");

    const payload = buildListingPayload(form, isEdit);

    try {
      void navigate(await saveListing({ id, createdId, payload, files: newFiles }));
    } catch (err: unknown) {
      setErrors(errFieldErrors(err));
      setNotice(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteImage(imageId: number): Promise<void> {
    if (!id || !window.confirm("Xóa ảnh này?")) return;
    try {
      await deleteImage(id, imageId);
      setImages((rows) => rows.filter((i) => i.id !== imageId));
      toast.success("Đã xóa ảnh.");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  /**
   * Adds the picked photos to the ones already chosen. Skipped files and trimmed picks are
   * explained in `photoNotices`. Returns whether at least one photo was added.
   */
  function pickFiles(files: File[]): boolean {
    const result = mergePhotos(isEdit ? images.length : 0, newFiles, files);
    setPhotoNotices(result.notices);
    setNewFiles(result.files);
    return result.added > 0;
  }

  /** The input is cleared every time so choosing the same file again fires `change`. */
  function handleFilePick(e: ChangeEvent<HTMLInputElement>): void {
    pickFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  function removeNewFile(index: number): void {
    setPhotoNotices([]);
    setNewFiles((files) => files.filter((_, i) => i !== index));
  }

  /** The first new photo becomes the cover once uploaded. */
  function makeCover(index: number): void {
    setNewFiles((files) => movePhotoToFront(files, index));
  }

  return {
    isEdit,
    wards,
    cities,
    amenities,
    form,
    set,
    setField,
    changeCity,
    setCoordinates,
    pickFiles,
    removeNewFile,
    makeCover,
    photoNotices,
    setErrors,
    images,
    newFiles,
    errors,
    busy,
    aiBusy,
    notice,
    toggleAmenity,
    generateDescription,
    handleSubmit,
    handleDeleteImage,
    handleFilePick,
  };
}
