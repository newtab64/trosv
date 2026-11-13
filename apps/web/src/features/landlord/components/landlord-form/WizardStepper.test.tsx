import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WizardStepper } from "./WizardStepper";

describe("WizardStepper", () => {
  it("shows the four steps", () => {
    render(<WizardStepper current={0} />);
    for (const name of ["Vị trí", "Thông tin", "Ảnh", "Mô tả"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("marks completed steps with a check and the current step with aria-current", () => {
    const { container } = render(<WizardStepper current={2} />);
    expect(container.textContent.match(/✓/g)).toHaveLength(2);
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent("Ảnh");
  });

  it("makes completed steps buttons that jump back", () => {
    const onJump = vi.fn();
    render(<WizardStepper current={2} onJump={onJump} />);
    fireEvent.click(screen.getByRole("button", { name: /Vị trí/ }));
    expect(onJump).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("button", { name: /Mô tả/ })).toBeNull();
  });

  it("lets every step be clicked when jumping forward is allowed", () => {
    const onJump = vi.fn();
    render(<WizardStepper current={0} onJump={onJump} canJumpForward />);
    fireEvent.click(screen.getByRole("button", { name: /Mô tả/ }));
    expect(onJump).toHaveBeenCalledWith(3);
  });

  it("renders plain text when there is no onJump", () => {
    render(<WizardStepper current={2} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
