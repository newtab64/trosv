import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_FORM, type ListingFormState } from "../lib/listingFormModel";
import { useWizardSteps } from "./useWizardSteps";

const PLACE: ListingFormState = {
  ...EMPTY_FORM,
  latitude: 21,
  longitude: 105,
  ward_id: 10,
  address: "12 Đại Cồ Việt",
};
const FULL: ListingFormState = {
  ...PLACE,
  title: "Phòng gác lửng",
  price: "2500000",
  area_m2: "20",
};

function mount(form: ListingFormState, isEdit = false) {
  const setErrors = vi.fn();
  const hook = renderHook(() => useWizardSteps({ form, isEdit, setErrors }));
  return { ...hook, setErrors };
}

describe("useWizardSteps", () => {
  it("starts on the first step", () => {
    const { result } = mount(EMPTY_FORM);
    expect(result.current.step).toBe(0);
    expect(result.current.isLast).toBe(false);
  });

  it("stays put and reports the errors when the current step is invalid", () => {
    const { result, setErrors } = mount(EMPTY_FORM);
    let moved = true;
    act(() => {
      moved = result.current.next();
    });
    expect(moved).toBe(false);
    expect(result.current.step).toBe(0);
    expect(setErrors).toHaveBeenCalledWith(
      expect.objectContaining({ ward_id: ["Vui lòng chọn phường."] }),
    );
  });

  it("moves on and clears the errors when the step is valid", () => {
    const { result, setErrors } = mount(PLACE);
    let moved = false;
    act(() => {
      moved = result.current.next();
    });
    expect(moved).toBe(true);
    expect(result.current.step).toBe(1);
    expect(setErrors).toHaveBeenLastCalledWith({});
  });

  it("goes back without checking anything and never below the first step", () => {
    const { result } = mount(FULL);
    act(() => {
      result.current.jumpTo(2);
    });
    act(() => {
      result.current.back();
    });
    expect(result.current.step).toBe(1);
    act(() => {
      result.current.back();
      result.current.back();
    });
    expect(result.current.step).toBe(0);
  });

  it("when creating, goTo only goes to the current or an earlier step", () => {
    const { result } = mount(FULL);
    act(() => {
      result.current.jumpTo(2);
    });
    act(() => {
      result.current.goTo(3);
    });
    expect(result.current.step).toBe(2);
    act(() => {
      result.current.goTo(0);
    });
    expect(result.current.step).toBe(0);
  });

  it("when editing, goTo may jump forward too", () => {
    const { result } = mount(FULL, true);
    act(() => {
      result.current.goTo(3);
    });
    expect(result.current.step).toBe(3);
    expect(result.current.isLast).toBe(true);
  });

  it("jumpTo always moves", () => {
    const { result } = mount(EMPTY_FORM);
    act(() => {
      result.current.jumpTo(3);
    });
    expect(result.current.step).toBe(3);
  });

  it("does not go past the last step", () => {
    const { result } = mount(FULL);
    act(() => {
      result.current.jumpTo(3);
    });
    let moved = true;
    act(() => {
      moved = result.current.next();
    });
    expect(moved).toBe(false);
    expect(result.current.step).toBe(3);
  });

  it("clears the error messages when going back or clicking the stepper, so they do not drag the landlord back", () => {
    const { result, setErrors } = mount(FULL, true);
    act(() => {
      result.current.jumpTo(2);
    });
    setErrors.mockClear();
    act(() => {
      result.current.back();
    });
    expect(setErrors).toHaveBeenLastCalledWith({});
    setErrors.mockClear();
    act(() => {
      result.current.goTo(3);
    });
    expect(setErrors).toHaveBeenLastCalledWith({});
  });
});
