import { cn } from "../lib/cn";

/** Compact step indicator for the import wizards. Past steps are plain, the
 * current one is highlighted, future ones muted. */
export function WizardStepper({
  steps,
  current,
  ariaLabel,
}: {
  steps: { key: string; label: string }[];
  current: string;
  ariaLabel?: string;
}) {
  const currentIndex = steps.findIndex((s) => s.key === current);
  return (
    // `flex-wrap`: the steps flow onto a second line rather than past the screen
    // (0.32.1, the 360 px Extra-large sweep; docs/text-size-harmonization.md §4).
    // "Upload — Map columns — Confirm" ran 22 px past a 360 px phone at Extra large.
    // Where the steps fit, they stay one row.
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label={ariaLabel}>
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-1">
          {i > 0 && <span className="w-4 border-t border-[var(--border)]" />}
          <span
            aria-current={step.key === current ? "step" : undefined}
            className={cn(
              "rounded-full px-2 py-0.5",
              i === currentIndex
                ? "bg-[var(--bg-inverse)] text-[var(--text-inverse)] font-medium"
                : i < currentIndex
                  ? "text-[var(--text-secondary)]"
                  : "text-[var(--text-placeholder)]",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
