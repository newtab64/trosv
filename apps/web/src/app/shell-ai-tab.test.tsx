import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_CHAT_OPEN_EVENT } from "@/shared/constants/events";
import type { User } from "@/shared/types/api";
import { AppShell } from "./shell";

const auth = vi.hoisted(() => ({ user: null as User | null, logout: vi.fn() }));
vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/features/messaging/hooks/useUnreadCount", () => ({ useUnreadCount: () => 0 }));
vi.mock("@/features/ai/components/AiChatWidget", () => ({ AiChatWidget: () => null }));

const student = { id: 1, name: "SV", email: "sv@example.com", role: "student" } as User;
const landlord = { id: 2, name: "CN", email: "cn@example.com", role: "landlord" } as User;

function renderAt(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
    </MemoryRouter>,
  );
}

const rail = () => within(screen.getByRole("navigation", { name: "Điều hướng nhanh" }));

describe("AI tab in the bottom tab bar / icon rail", () => {
  beforeEach(() => {
    auth.user = null;
  });

  it("students get an AI tab that opens a sheet with every AI feature", () => {
    auth.user = student;
    renderAt();
    fireEvent.click(rail().getByRole("button", { name: "Gợi ý AI" }));
    const sheet = within(screen.getByRole("dialog", { name: "Gợi ý AI" }));
    expect(sheet.getByRole("link", { name: /Bạn cùng phòng/ })).toHaveAttribute(
      "href",
      "/ai/roommates",
    );
    expect(sheet.getByRole("link", { name: /Khu vực phù hợp/ })).toHaveAttribute(
      "href",
      "/ai/area-suggestions",
    );
    expect(sheet.getByRole("button", { name: /Trợ lý chat AI/ })).toBeInTheDocument();
  });

  it("the chat entry opens the floating AI chat and closes the sheet", () => {
    auth.user = student;
    renderAt();
    const opened = vi.fn();
    window.addEventListener(AI_CHAT_OPEN_EVENT, opened);
    fireEvent.click(rail().getByRole("button", { name: "Gợi ý AI" }));
    fireEvent.click(screen.getByRole("button", { name: /Trợ lý chat AI/ }));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "Gợi ý AI" })).toBeNull();
    window.removeEventListener(AI_CHAT_OPEN_EVENT, opened);
  });

  it("guests see the AI tab too, so they discover the features", () => {
    renderAt();
    expect(rail().getByRole("button", { name: "Gợi ý AI" })).toBeInTheDocument();
  });

  it("landlords do not get the student AI tab", () => {
    auth.user = landlord;
    renderAt();
    expect(rail().queryByRole("button", { name: "Gợi ý AI" })).toBeNull();
  });

  it("the tab is marked current on an AI page", () => {
    auth.user = student;
    renderAt("/ai/roommates");
    expect(rail().getByRole("button", { name: "Gợi ý AI" })).toHaveAttribute("data-active", "true");
  });
});
