import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/shared/types/api";
import { AppShell } from "./shell";

const mockAuth = vi.hoisted(() => ({
  user: null as User | null,
  logout: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/features/messaging/hooks/useUnreadCount", () => ({
  useUnreadCount: () => ({ unreadCount: 0 }),
}));

vi.mock("@/features/ai/components/AiChatWidget", () => ({
  AiChatWidget: () => null,
}));

const STUDENT_USER: User = {
  id: 1,
  name: "Student",
  email: "student@test.com",
  role: "student",
};

const LANDLORD_USER: User = {
  id: 2,
  name: "Landlord",
  email: "host@test.com",
  role: "landlord",
};

describe("MobileNavigation in AppShell", () => {
  beforeEach(() => {
    mockAuth.user = null;
    vi.clearAllMocks();
  });

  const getMobileNav = () => within(screen.getByTestId("mobile-nav-content"));

  it("renders mobile navigation button and opens guest menu", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell />
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole("button", { name: "Menu điều hướng" });
    expect(menuButton).toBeInTheDocument();

    fireEvent.click(menuButton);

    const roomLink = getMobileNav().getByRole("link", { name: "Tìm phòng" });
    expect(roomLink).toBeInTheDocument();
    expect(roomLink).toHaveAttribute("href", "/rooms");
  });

  it("shows student-specific AI navigation options", () => {
    mockAuth.user = STUDENT_USER;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu điều hướng" }));

    expect(getMobileNav().getByRole("link", { name: "Tìm phòng" })).toBeInTheDocument();
    expect(getMobileNav().getByRole("link", { name: "Tìm bạn cùng phòng" })).toHaveAttribute(
      "href",
      "/ai/roommates",
    );
    expect(getMobileNav().getByRole("link", { name: "Gợi ý khu vực" })).toHaveAttribute(
      "href",
      "/ai/area-suggestions",
    );
  });

  it("shows landlord-specific management options", () => {
    mockAuth.user = LANDLORD_USER;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu điều hướng" }));

    expect(getMobileNav().getByRole("link", { name: "Xem phòng" })).toBeInTheDocument();
    expect(getMobileNav().getByRole("link", { name: "Quản lý tin đăng" })).toHaveAttribute(
      "href",
      "/landlord",
    );
    expect(getMobileNav().getByRole("link", { name: "Đăng tin mới" })).toHaveAttribute(
      "href",
      "/landlord/new",
    );
  });
});
