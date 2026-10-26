/*
  Typed axios response envelope. Every api/*.ts call goes through these
  helpers so trust-boundary data is cast in exactly one auditable place
  (an explicit type assertion with a runtime null check) while the rest
  of the app keeps full type safety.
*/

import type { AxiosResponse } from "axios";

export interface ApiEnvelope<T> {
  data: T;
  meta?: unknown;
}

/**
 * Extracts the backend envelope ({data, meta}) from an axios response.
 * The single place where untyped network JSON crosses into typed land.
 */
export function envelope<T>(res: AxiosResponse): ApiEnvelope<T> {
  const body = res.data as ApiEnvelope<T> | undefined;
  if (body == null) {
    throw new Error("Phản hồi rỗng từ máy chủ.");
  }
  return body;
}

/** Array response: data must be an array (defensive runtime check). */
export function envelopeArray<T>(res: AxiosResponse): ApiEnvelope<T[]> {
  const body = envelope<T[]>(res);
  if (!Array.isArray(body.data)) {
    throw new Error("Phản hồi không đúng định dạng (dự kiến danh sách).");
  }
  return body;
}

/** Response with pagination meta (listings, reviews, favorites). */
export interface PagedBody<T> {
  data: T[];
  meta: { current_page?: number; last_page?: number; per_page?: number; total?: number };
}

export function pagedEnvelope<T>(res: AxiosResponse): PagedBody<T> {
  const body = res.data as Partial<PagedBody<T>> | undefined;
  if (body == null || !Array.isArray(body.data)) {
    throw new Error("Phản hồi không đúng định dạng (danh sách có phân trang).");
  }
  return { data: body.data, meta: body.meta ?? {} };
}
