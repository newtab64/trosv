import axios from "axios";
import { API_URL } from "@/config/env";
import { disconnectEcho } from "./echo";
import { TOKEN_KEY } from "@/constants/storage";

const USER_KEY = "user";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

/** Xoa toan bo phien (token + user) - dung cho 401 lan logout. */
export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  disconnectEcho();
};

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * 401 nay co phai "mat phien" that su khong? Chi khi request co mang
 * Authorization va khong phai chinh la /login (sai mat khau la 401 binh
 * thuong). Khong co token ma van goi API duoc bao ve (user stale trong
 * localStorage) KHONG duoc tinh la mat phien - neu khong, interceptor
 * tu redirect /login tai /login => reload vo han (bug da xay ra).
 */
function isSessionLoss(error: unknown): boolean {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    return false;
  }
  const url = error.config?.url ?? "";
  if (url.endsWith("/login")) {
    return false;
  }
  const headers = error.config?.headers as Record<string, unknown> | undefined;
  return Boolean(headers?.Authorization);
}

// 401 that su -> xoa phien + redirect login (tru khi dang o /login:
// redirect tai cho se tai lai trang vo han).
axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isSessionLoss(error)) {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

/** Thong bao loi gon nhat cho UI: message backend > loi validate dau tien > fallback. */
export function errMessage(err: unknown, fallback = "Có lỗi xảy ra."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.message) return data.message;
    const first = data?.errors && (Object.values(data.errors)[0] || [])[0];
    if (first) return first;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Map loi validate theo field tu response 422 ({} neu khong co). */
export function errFieldErrors(err: unknown): Record<string, string[]> {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.errors) return data.errors;
  }
  return {};
}

/** HTTP status cua loi axios (null neu khong phai axios error). */
export function errStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
}

interface ApiErrorShape {
  message?: string;
  errors?: Record<string, string[]>;
}

export default axiosClient;
