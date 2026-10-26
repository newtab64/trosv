/**
 * SPA route definitions - single source of truth (docs/reports/TECH-DEBT.md #5).
 *
 * Mọi path pattern định nghĩa ĐÚNG MỘT LẦN ở đây và dùng cho cả hai ngữ cảnh:
 * - <Route path={ROUTES.ROOM_DETAIL}> (định tuyến)
 * - <Link to={ROUTES.ROOM_DETAIL}> / navigate(route(...)) (điều hướng)
 * react-router chấp nhận cùng pattern "/x/:id" ở cả hai chỗ, nên không bao
 * giờ đổi route mà quên một phía nữa.
 */

export const ROUTES = {
  HOME: "/",
  ROOMS: "/rooms",
  ROOM_DETAIL: "/rooms/:id",
  MAP: "/map",
  STUDENT_PUBLIC: "/students/:id",
  LOGIN: "/login",
  REGISTER: "/register",
  MESSAGES: "/messages",
  CONVERSATION: "/messages/:id",
  PROFILE: "/profile",
  FAVORITES: "/favorites",
  AI_ROOMMATES: "/ai/roommates",
  AI_AREA_SUGGESTIONS: "/ai/area-suggestions",
  // KHÔNG phải route: key đặc biệt để tile trang Home mở floating AI chat
  // widget (AI_CHAT_OPEN_EVENT), không điều hướng.
  AI_CHAT: "/ai/chat",
  LANDLORD: "/landlord",
  LANDLORD_NEW: "/landlord/new",
  LANDLORD_EDIT: "/landlord/edit/:id",
} as const;

export type RoutePattern = string;

/**
 * Fill các segment ":param" của một pattern. Vi du:
 * route(ROUTES.ROOM_DETAIL, { id: 42 }) === "/rooms/42"
 */
export function route(
  pattern: RoutePattern,
  params: Record<string, string | number> = {}
): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(value)),
    pattern
  );
}
