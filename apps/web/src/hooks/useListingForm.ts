import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import {
  createListing,
  updateListing,
  uploadImages,
  deleteImage,
} from "@/api/landlordApi";
import { getListing, getWards, getAmenities, getCities } from "@/api/listingApi";
import { aiDescription } from "@/api/aiApi";
import { errMessage, errFieldErrors } from "@/api/axiosClient";
import { ROUTES, route } from "@/constants/routes";
import type { Amenity, City, ListingImage, ListingPayload, Ward } from "@/types/api";

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

const EMPTY_FORM: ListingFormState = {
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

/** Toast interface du can cua hook - khong toan bo toast context. */
export interface ToastLike {
  success: (msg: string) => unknown;
  error: (msg: string) => unknown;
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

  const [wards, setWards] = useState<Ward[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [form, setForm] = useState<ListingFormState>({ ...EMPTY_FORM });
  const [images, setImages] = useState<ListingImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getCities().then(setCities).catch(() => {
    });
    getWards().then(setWards).catch(() => {});
    getAmenities().then(setAmenities).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getListing(id)
      .then((l) => {
        setForm({
          title: l.title || "",
          type: l.type || "room",
          price: l.price,
          area_m2: l.area_m2 ?? "",
          address: l.address || "",
          latitude: l.latitude ?? "",
          longitude: l.longitude ?? "",
          city_id: l.ward?.city?.id || "",
          ward_id: l.ward?.id || "",
          description: l.description || "",
          amenity_ids: l.amenities?.map((a) => a.id) || [],
          status: l.status || "available",
        });
        setImages(l.images || []);
      })
      .catch((err: unknown) => {
        setNotice(errMessage(err, "Không tải được tin đăng."));
      });
  }, [id, isEdit]);

  const set =
    (key: keyof ListingFormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setErrors({});
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  /**
   * Reverse-geocoded street guess from the map (Nominatim).
   * Autofills the address when empty; asks before overwriting one.
   * (No window.confirm inside the state updater: updaters must stay
   * pure - StrictMode calls them twice, which would double the dialog.)
   */
  function applyAddressGuess(street: string): void {
    const current = form.address.trim();
    if (current === "") {
      setForm((f) => ({ ...f, address: street }));
      return;
    }
    if (current === street) return;

    const wardName =
      wards.find((x) => String(x.id) === String(form.ward_id))?.name || "";
    const withWard =
      wardName && !street.includes(wardName) ? `${street}, ${wardName}` : street;

    if (
      window.confirm(
        `Địa chỉ trên bản đồ: "${withWard}".\nDùng địa chỉ này thay cho "${current}"?`
      )
    ) {
      setForm((f) => ({ ...f, address: withWard }));
    }
  }

  // Recentre the coordinate picker on the selected ward's centroid.
  const wardCenter = useMemo<[number, number] | undefined>(() => {
    const w = wards.find((x) => String(x.id) === String(form.ward_id));
    const lat = w?.latitude;
    const lng = w?.longitude;
    if (lat == null || lng == null) return undefined;
    return [lat, lng];
  }, [wards, form.ward_id]);

  function toggleAmenity(amenityId: number): void {
    setForm((f) => ({
      ...f,
      amenity_ids: f.amenity_ids.includes(amenityId)
        ? f.amenity_ids.filter((x) => x !== amenityId)
        : [...f.amenity_ids, amenityId],
    }));
  }

  /** "Viết mô tả giúp tôi" - POST /ai/description (Landlord). */
  async function generateDescription(): Promise<void> {
    setAiBusy(true);
    setNotice("");
    try {
      const { description } = await aiDescription({
        title: form.title || undefined,
        type: form.type || undefined,
        price: form.price === "" ? undefined : Number(form.price),
        area_m2: form.area_m2 === "" ? undefined : Number(form.area_m2),
        address: form.address || undefined,
        ward_id: form.ward_id || undefined,
        amenity_ids: form.amenity_ids.length ? form.amenity_ids : undefined,
      });
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

    const payload: ListingPayload & { status?: string } = {
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

    try {
      if (isEdit) {
        const updated = await updateListing(id, payload);
        // Upload newly picked images, if any.
        if (newFiles.length > 0) {
          await uploadImages(id, newFiles);
        }
        void navigate(route(ROUTES.ROOM_DETAIL, { id: updated.id }));
      } else {
        const created = await createListing(payload);
        // Jump to edit page to upload images for the new listing.
        if (newFiles.length > 0) {
          await uploadImages(created.id, newFiles);
        }
        void navigate(ROUTES.LANDLORD);
      }
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

  function handleFilePick(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files || []);
    if (isEdit && images.length + files.length > 5) {
      setNotice("Tin đăng chỉ có tối đa 5 ảnh.");
      e.target.value = "";
      return;
    }
    if (!isEdit && files.length > 5) {
      setNotice("Tối đa 5 ảnh mỗi tin.");
      e.target.value = "";
      return;
    }
    setNotice("");
    setNewFiles(files);
  }

  return {
    isEdit,
    wards,
    cities,
    amenities,
    form,
    set,
    setForm,
    images,
    newFiles,
    errors,
    busy,
    aiBusy,
    notice,
    wardCenter,
    applyAddressGuess,
    toggleAmenity,
    generateDescription,
    handleSubmit,
    handleDeleteImage,
    handleFilePick,
  };
}
