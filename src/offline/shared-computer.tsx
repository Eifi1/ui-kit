import { useState } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Checkbox } from "../components/checkbox";
import { readSessionStored, writeSessionStored } from "../lib/safe-storage";
import { DEFAULT_SHARED_COMPUTER_LABELS } from "./shared-computer-labels";

/**
 * "This is a shared computer" — a choice on the sign-in form that persists nothing
 * (docs/local-first-harmonization.md §1.5 D6, D7). When it is on, the app does not mount
 * the query persistence (`createQueryPersistence`): the cache lives in memory only.
 *
 * The choice itself is held in `sessionStorage`, so it outlives no tab. Where storage is
 * blocked, `isSharedComputer()` is `false` and `setSharedComputer` does nothing.
 */
export interface SharedComputerLabels {
  label: string;
  /** The one line under it: what the choice does. */
  hint: string;
}

// Defined in ./shared-computer-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_SHARED_COMPUTER_LABELS };

const KEY = "eifi1-shared-computer";

/** Whether this tab was signed in as on a shared computer. `false` when storage is unavailable. */
export function isSharedComputer(): boolean {
  return readSessionStored(KEY) === "1";
}

/** Records the choice for this tab; `false` forgets it. */
export function setSharedComputer(on: boolean): void {
  writeSessionStored(KEY, on ? "1" : null);
}

export interface SharedComputerChoiceProps {
  /** Controlled. Left out, the box starts from {@link isSharedComputer}. */
  checked?: boolean;
  /** Told after the choice is stored. */
  onCheckedChange?: (on: boolean) => void;
  disabled?: boolean;
  className?: string;
  labels?: LabelOverride<SharedComputerLabels>;
}

export function SharedComputerChoice({
  checked,
  onCheckedChange,
  disabled,
  className,
  labels: labelsProp,
}: SharedComputerChoiceProps) {
  const labels = useKitLabels("sharedComputer", DEFAULT_SHARED_COMPUTER_LABELS, labelsProp);
  const [own, setOwn] = useState(isSharedComputer);
  const on = checked ?? own;
  return (
    <Checkbox
      className={className}
      label={labels.label}
      description={labels.hint}
      checked={on}
      disabled={disabled}
      onCheckedChange={(next) => {
        setSharedComputer(next);
        setOwn(next);
        onCheckedChange?.(next);
      }}
    />
  );
}
