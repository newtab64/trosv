/**
 * Single source of truth for env-derived configuration.
 *
 * Previously the VITE_API_URL fallback literal ("http://localhost:8000/api")
 * was duplicated in axiosClient and api/echo - import from here so a change
 * of base URL only touches this file.
 */

export const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/** API origin without the /api suffix (for /broadcasting/auth, signed assets). */
export const API_BASE: string = API_URL.replace(/\/api\/?$/, "");

export const REVERB: {
  key: string;
  host: string;
  port: number;
  scheme: string;
} = {
  key: import.meta.env.VITE_REVERB_APP_KEY || "my-app-key",
  host: import.meta.env.VITE_REVERB_HOST || "localhost",
  port: Number(import.meta.env.VITE_REVERB_PORT || 8080),
  scheme: import.meta.env.VITE_REVERB_SCHEME || "http",
};
