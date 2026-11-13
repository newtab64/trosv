import { Fragment } from "react";
import { cn } from "@/shared/lib/utils";
import { WIZARD_STEPS, type WizardStep } from "../../lib/wizardModel";

export interface WizardStepperProps {
  current: WizardStep;
  /** When given, completed steps become buttons that call it. */
  onJump?: (step: WizardStep) => void;
  /** Also lets the not-yet-reached steps be clicked (editing an existing listing). */
  canJumpForward?: boolean;
}

function StepItem(props: {
  index: WizardStep;
  name: string;
  state: "done" | "current" | "todo";
  onClick: (() => void) | undefined;
}) {
  const { index, name, state, onClick } = props;
  const body = (
    <>
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold",
          state === "done" && "border-plate bg-plate text-white",
          state === "current" && "border-plate bg-plate-tint text-plate",
          state === "todo" && "border-line-strong bg-card text-muted",
        )}
      >
        {state === "done" ? "✓" : index + 1}
      </span>
      {/* On a phone only the current step keeps its name, or the row is wider than the screen. */}
      <span className={state === "current" ? undefined : "hidden sm:inline"}>{name}</span>
    </>
  );
  const tone = { done: "text-ink", current: "text-plate", todo: "text-muted" }[state];
  const cls = cn("flex items-center gap-2 whitespace-nowrap text-sm font-semibold", tone);
  return (
    <li aria-current={state === "current" ? "step" : undefined} className="flex items-center">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Bước ${String(index + 1)}: ${name}`}
          className={cn(cls, "hover:underline")}
        >
          {body}
        </button>
      ) : (
        <span className={cls}>{body}</span>
      )}
    </li>
  );
}

/** The row of four numbered steps above the form card. */
export function WizardStepper({ current, onJump, canJumpForward = false }: WizardStepperProps) {
  return (
    <ol className="mb-5 flex items-center" aria-label="Các bước đăng tin">
      {WIZARD_STEPS.map((name, i) => {
        const index = i as WizardStep;
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const clickable = onJump && state !== "current" && (state === "done" || canJumpForward);
        return (
          <Fragment key={name}>
            <StepItem
              index={index}
              name={name}
              state={state}
              onClick={
                clickable
                  ? () => {
                      onJump(index);
                    }
                  : undefined
              }
            />
            {i < WIZARD_STEPS.length - 1 ? (
              <li
                aria-hidden
                className={cn(
                  "mx-2 h-0.5 min-w-3 flex-1",
                  state === "done" ? "bg-plate" : "bg-line-strong",
                )}
              />
            ) : null}
          </Fragment>
        );
      })}
    </ol>
  );
}
