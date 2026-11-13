import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ListingFormState } from "../lib/listingFormModel";
import { validateStep, WIZARD_STEPS, type WizardStep } from "../lib/wizardModel";

const LAST: WizardStep = (WIZARD_STEPS.length - 1) as WizardStep;

/**
 * Which wizard step is showing. `next` checks only the current step and shows its errors;
 * `back` never checks. `goTo` is for clicking the stepper (earlier steps only, any step
 * when editing); `jumpTo` moves unconditionally, e.g. to the step with a server error.
 */
export function useWizardSteps(args: {
  form: ListingFormState;
  isEdit: boolean;
  setErrors: Dispatch<SetStateAction<Record<string, string[]>>>;
}) {
  const { form, isEdit, setErrors } = args;
  const [step, setStep] = useState<WizardStep>(0);

  /** Returns whether the wizard moved on. */
  function next(): boolean {
    if (step === LAST) return false;
    const errors = validateStep(step, form);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return false;
    setStep((step + 1) as WizardStep);
    return true;
  }

  function back(): void {
    setStep((s) => (s > 0 ? ((s - 1) as WizardStep) : s));
  }

  function goTo(target: WizardStep): void {
    if (isEdit || target <= step) setStep(target);
  }

  function jumpTo(target: WizardStep): void {
    setStep(target);
  }

  return { step, isLast: step === LAST, next, back, goTo, jumpTo };
}
