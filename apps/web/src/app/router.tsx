import { Suspense, lazy } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AppShell } from "@/components/shell";
import { PageFallback } from "@/app/PageFallback";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { ProtectedRoute } from "@/app/ProtectedRoute";

/* Route-level code splitting: each screen is its own chunk; Leaflet stays
   in the map chunk (see vite manualChunks) and is only pulled by the two
   screens that render one. */
const Home = lazy(() => import("@/pages/Home"));
const Search = lazy(() => import("@/pages/Search"));
const RoomDetail = lazy(() => import("@/pages/RoomDetail"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const Messages = lazy(() => import("@/pages/Messages"));
const ConversationDetail = lazy(() => import("@/pages/ConversationDetail"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/Profile"));
const StudentPublic = lazy(() => import("@/pages/StudentPublic"));
const AiRoommates = lazy(() => import("@/pages/AiRoommates"));
const AiAreaSuggestions = lazy(() => import("@/pages/AiAreaSuggestions"));
const LandlordDashboard = lazy(() => import("@/pages/LandlordDashboard"));
const LandlordForm = lazy(() => import("@/pages/LandlordForm"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/* AppShell renders <Outlet/> itself; the Suspense boundary lives inside
   the shell (see components/shell.tsx <Outlet/> wrapper). */
function ShellWithoutFooter() {
  return (
    <AppShell hideFooter screenSuspense={<Suspense fallback={<PageFallback />}><Outlet /></Suspense>} />
  );
}

function ShellWithFooter() {
  return (
    <AppShell screenSuspense={<Suspense fallback={<PageFallback />}><Outlet /></Suspense>} />
  );
}

export const router = createBrowserRouter([
  /* Standalone auth pages (Zillow pattern): no header, rail or footer —
     just the centered panel. */
  { path: ROUTES.LOGIN, element: <Login /> },
  { path: ROUTES.REGISTER, element: <Register /> },
  {
    /* Search, messages & AI pages have no footer (SPEC). */
    element: <ShellWithoutFooter />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: ROUTES.ROOMS, element: <Search /> },
      { path: "/map", element: <Navigate to={ROUTES.ROOMS} replace /> },
      /* Messages + thread render their own signed-out gate (SPEC) instead
         of a login redirect, so they stay outside ProtectedRoute. */
      {
        path: ROUTES.MESSAGES,
        element: <Messages />,
        children: [
          {
            index: true,
            element: (
              <div className="hidden h-full flex-col items-center justify-center p-8 text-center text-muted md:flex">
                <div className="max-w-xs">
                  <p className="font-semibold text-ink">Chưa chọn cuộc trò chuyện</p>
                  <p className="mt-1 text-sm">
                    Chọn một người trong danh sách bên trái để xem tin nhắn.
                  </p>
                </div>
              </div>
            ),
          },
          { path: ":id", element: <ConversationDetail /> },
        ],
      },
      {
        path: ROUTES.AI_ROOMMATES,
        element: (
          <ProtectedRoute roles={["student"]}>
            <AiRoommates />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.AI_AREA_SUGGESTIONS,
        element: (
          <ProtectedRoute roles={["student"]}>
            <AiAreaSuggestions />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    element: <ShellWithFooter />,
    errorElement: <ErrorBoundary />,
    children: [
      { path: ROUTES.HOME, element: <Home /> },
      { path: ROUTES.ROOM_DETAIL, element: <RoomDetail /> },
      { path: ROUTES.FAVORITES, element: <Favorites /> },
      {
        path: ROUTES.PROFILE,
        element: (
          <ProtectedRoute roles={["student", "landlord"]}>
            <Profile />
          </ProtectedRoute>
        ),
      },
      { path: ROUTES.STUDENT_PUBLIC, element: <StudentPublic /> },
      {
        path: ROUTES.LANDLORD,
        element: (
          <ProtectedRoute roles={["landlord"]}>
            <LandlordDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.LANDLORD_NEW,
        element: (
          <ProtectedRoute roles={["landlord"]}>
            <LandlordForm />
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.LANDLORD_EDIT,
        element: (
          <ProtectedRoute roles={["landlord"]}>
            <LandlordForm />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
