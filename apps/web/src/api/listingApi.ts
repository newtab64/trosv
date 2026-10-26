import api from "./axiosClient";
import { envelope, envelopeArray, pagedEnvelope } from "./envelope";
import type {
  Amenity,
  City,
  Listing,
  ListingPayload,
  ListingQuery,
  Review,
  ReviewPayload,
  School,
  Ward,
  PaginationMeta,
} from "@/types/api";

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Typing lives at the boundary; see envelope.ts. */
function toPaged<T>(res: { data: T[]; meta: { current_page?: number; last_page?: number; per_page?: number; total?: number } }): Paged<T> {
  return { data: res.data, meta: res.meta };
}

// API_CONTRACT §4 - "Duyệt tin đăng"
export function getListings(params: ListingQuery): Promise<Paged<Listing>> {
  return api.get("/listings", { params }).then((r) => toPaged(pagedEnvelope<Listing>(r)));
}

export const getListing = (id: number): Promise<Listing> =>
  api.get(`/listings/${id}`).then((r) => envelope<Listing>(r).data);

export function getListingReviews(id: number, page = 1): Promise<Paged<Review>> {
  return api
    .get(`/listings/${id}/reviews`, { params: { page } })
    .then((r) => toPaged(pagedEnvelope<Review>(r)));
}

// API_CONTRACT §4 - "Đánh giá (sinh viên)"
export const createReview = (
  listingId: number,
  payload: ReviewPayload
): Promise<Review> =>
  api.post(`/listings/${listingId}/reviews`, payload).then((r) => envelope<Review>(r).data);

// API_CONTRACT §4 - "Dữ liệu tham chiếu"
// Cascade: chọn Tỉnh/TP trước, rồi ward/trường lọc theo city_id (tùy chọn).
export const getCities = (): Promise<City[]> =>
  api.get("/cities").then((r) => envelopeArray<City>(r).data);

export const getWards = (cityId?: number | null): Promise<Ward[]> =>
  api
    .get("/wards", { params: cityId ? { city_id: cityId } : {} })
    .then((r) => envelopeArray<Ward>(r).data);

export const getSchools = (cityId?: number | null): Promise<School[]> =>
  api
    .get("/schools", { params: cityId ? { city_id: cityId } : {} })
    .then((r) => envelopeArray<School>(r).data);

export const getAmenities = (): Promise<Amenity[]> =>
  api.get("/amenities").then((r) => envelopeArray<Amenity>(r).data);

// Chủ nhà: tao/cap nhat tin (dung chung payload type voi landlordApi).
export type { ListingPayload };
