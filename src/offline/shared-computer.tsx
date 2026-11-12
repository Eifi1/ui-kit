import { useState } from "react";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Checkbox } from "../components/checkbox";
import { readSessionStored, readStored, removeStored, writeSessionStored, writeStored } from "../lib/safe-storage";
import { DEFAULT_SHARED_COMPUTER_LABELS } from "./shared-computer-labels";

/**
 * "This is a shared computer" — a choice on the sign-in form that persists nothing
 * (docs/local-first-harmonization.md §1.5 D6, D7). Its place is `SignInForm`'s
 * `afterPasswordContent` (0.60): under the password, before "Sign in". When it is on, the
 * app does not mount the query persistence (`createQueryPersistence`): the cache lives in
 * memory only.
 *
 * **On a shared computer the SESSION ends with the tab** (0.61, Marcel 2026-11-12;
 * keksdose's finding). With the box ticked, the app keeps the sign-in itself — its access
 * and refresh tokens — in `sessionStorage`, and the choice there too (`storage: "session"`,
 * the default). Otherwise a closed tab on a library PC leaves a session the next visitor
 * simply opens: "no copy of your data stays" would be true and beside the point, with a
 * refresh token good for weeks in `localStorage`. Unticked, the app keeps its session where
 * it always did. The same goes for anything else the session unlocks on the device (keksdose's
 * private-mode keys): in memory or `sessionStorage` while the box is ticked, never on disk.
 *
 * The choice must live exactly as long as the session it governs, so with the rule above
 * it is `"session"`. `storage: "local"` remains only for an app that cannot yet move its
 * session out of `localStorage` (kastlan's and Kurvenschmiede's before their 0.61
 * adoption): it then calls `setSharedComputer(false)` at every end of that session (logout,
 * a failed refresh), beside removing the token — and the closed-tab gap stays until it
 * moves. `isSharedComputer()` reads both places, so a choice made in either keeps the cache
 * in memory. Where storage is blocked, `isSharedComputer()` is `false` and
 * `setSharedComputer` does nothing.
 */
export interface SharedComputerLabels {
  label: string;
  /** The one line under it: what the choice does. */
  hint: string;
  /** 0.62: {@link useSharedComputerIdleSignOut}'s toast, a minute before it signs out. */
  idleWarning: string;
  /** 0.62: that toast's button, which keeps the session (any input does too). */
  staySignedIn: string;
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
  /** Where the choice is stored: see {@link setSharedComputer}. Default `"session"`, and
   *  keep it so: on a shared computer the session itself ends with the tab (0.61). */
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
