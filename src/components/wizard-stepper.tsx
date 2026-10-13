import { cn } from "../lib/cn";

/** Compact step indicator for the import wizards. Past steps are plain, the
 * current one is highlighted, future ones muted. */
export function WizardStepper({
  steps,
  current,
  "aria-label": ariaLabelAttr,
  ariaLabel,
}: {
  steps: { key: string; label: string }[];
  current: string;
  /** Names the list of steps ("Import steps"). */
  "aria-label"?: string;
  /** @deprecated 0.34 — use `aria-label`; removed in 0.35 (refactor audit 2026-10, API-1).
   *  Names the steps only when `aria-label` is absent. */
  ariaLabel?: string;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);
  return (
    // `flex-wrap`: the steps flow onto a second line rather than past the screen
    // (0.32.1, the 360 px Extra-large sweep; docs/text-size-harmonization.md §4).
    // "Upload — Map columns — Confirm" ran 22 px past a 360 px phone at Extra large.
    // Where the steps fit, they stay one row.
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label={ariaLabelAttr ?? ariaLabel}>
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-1">
          {i > 0 && <span className="w-4 border-t border-subtle" />}
          <span
            aria-current={step.key === current ? "step" : undefined}
            className={cn(
              "rounded-full px-2 py-0.5",
              i === currentIndex
                ? "bg-inverse text-inverse font-medium"
                : i < currentIndex
                  ? "text-secondary"
                  : "text-placeholder",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
