import api from "./axiosClient";
import { envelope, pagedEnvelope } from "./envelope";
import type { Listing, ListingPayload } from "@/types/api";
import type { Paged } from "./listingApi";

// API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng"
export function getMyListings(page = 1, status = ""): Promise<Paged<Listing>> {
  return api
    .get("/my/listings", { params: { page, status: status || undefined } })
    .then((r) => {
      const body = pagedEnvelope<Listing>(r);
      return { data: body.data, meta: body.meta };
    });
}

export const createListing = (payload: ListingPayload): Promise<Listing> =>
  api.post("/listings", payload).then((r) => envelope<Listing>(r).data);

export const updateListing = (
  id: number,
  payload: Partial<ListingPayload>
): Promise<Listing> =>
  api.put(`/listings/${id}`, payload).then((r) => envelope<Listing>(r).data);

export const deleteListing = (id: number): Promise<unknown> =>
  api.delete(`/listings/${id}`);

export function uploadImages(listingId: number, files: File[]): Promise<Listing> {
  const form = new FormData();
  files.forEach((f) => { form.append("images[]", f); });
  return api
    .post(`/listings/${listingId}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => envelope<Listing>(r).data);
}

export const deleteImage = (listingId: number, imageId: number): Promise<unknown> =>
  api.delete(`/listings/${listingId}/images/${imageId}`);
