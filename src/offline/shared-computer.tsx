import { useState } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Checkbox } from "../components/checkbox";
import { readSessionStored, readStored, removeStored, writeSessionStored, writeStored } from "../lib/safe-storage";
import { DEFAULT_SHARED_COMPUTER_LABELS } from "./shared-computer-labels";

/**
 * "This is a shared computer" — a choice on the sign-in form that persists nothing
 * (docs/local-first-harmonization.md §1.5 D6, D7). When it is on, the app does not mount
 * the query persistence (`createQueryPersistence`): the cache lives in memory only.
 *
 * The choice must live exactly as long as the session it governs. By default it is held in
 * `sessionStorage`, which fits a session that ends with the tab. An app whose session
 * outlives the tab (a refresh token in `localStorage`: kastlan) passes `storage: "local"`
 * and calls `setSharedComputer(false)` at every end of that session (logout, a failed
 * refresh), beside removing the token. `isSharedComputer()` reads both places, so a choice
 * made in either keeps the cache in memory. Where storage is blocked, `isSharedComputer()`
 * is `false` and `setSharedComputer` does nothing.
 */
export interface SharedComputerLabels {
  label: string;
  /** The one line under it: what the choice does. */
  hint: string;
}

// Defined in ./shared-computer-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_SHARED_COMPUTER_LABELS };

const KEY = "eifi1-shared-computer";

/** Where the choice is held: `"session"` (this tab, the default) or `"local"` (as long as
 *  a session kept in `localStorage`, until `setSharedComputer(false)`). */
export type SharedComputerStorage = "session" | "local";

/** Whether this session was signed in as on a shared computer, the choice held in either
 *  place. `false` when storage is unavailable. */
export function isSharedComputer(): boolean {
  return readSessionStored(KEY) === "1" || readStored(KEY) === "1";
}

/** Records the choice in `options.storage` (default `"session"`), and only there; `false`
 *  forgets it in both places. */
export function setSharedComputer(on: boolean, options: { storage?: SharedComputerStorage } = {}): void {
  const local = options.storage === "local";
  writeSessionStored(KEY, on && !local ? "1" : null);
  if (on && local) writeStored(KEY, "1");
  else removeStored(KEY);
}

export interface SharedComputerChoiceProps {
  /** Controlled. Left out, the box starts from {@link isSharedComputer}. */
  checked?: boolean;
  /** Told after the choice is stored. */
  onCheckedChange?: (on: boolean) => void;
  /** Where the choice is stored: see {@link setSharedComputer}. Default `"session"`. */
  storage?: SharedComputerStorage;
  disabled?: boolean;
  className?: string;
  labels?: LabelOverride<SharedComputerLabels>;
}

export function SharedComputerChoice({
  checked,
  onCheckedChange,
  storage,
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
        setSharedComputer(next, { storage });
        setOwn(next);
        onCheckedChange?.(next);
      }}
    />
  );
}
