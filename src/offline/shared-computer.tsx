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
 * **Where a shared session lives: two paths** (0.61, revised in 0.62; Marcel 2026-11-12 and
 * 2026-11-13). Unticked, the app keeps its session where it always did. Ticked:
 * - **Default: the tab's storage, with the server's short life.** The app keeps the sign-in
 *   (its tokens and the profile) in `sessionStorage`, so a reload keeps the session, a phone's
 *   background reload included (Marcel: signing out on every reload "wäre nicht gut",
 *   Kurvenschmiede). Chrome and Firefox bring a closed tab back WITH its sessionStorage
 *   (Ctrl+Shift+T, "Continue where you left off"; keksdose's test in Chromium 156), so a
 *   reopened tab can still hold the session: the server's limit ends it (15 minutes idle,
 *   4 hours at most, below), and every sign-out ends it on the server.
 * - **Stricter: page memory.** The app keeps the sign-in, anything else the session unlocks
 *   (keksdose's private-mode keys) and the person's traces in the page's memory only, a
 *   Map-backed `Storage` (the kit's `createMemoryStorage()`), as keksdose's `shared-session.ts`
 *   does. A reopened tab then holds nothing; the price is that a reload lands on the sign-in.
 * Either way the tab's storage may hold markers that are not the person's data: this choice
 * (`storage: "session"`, the default), an app's page-mode marker.
 *
 * Both paths rest on the same layers (0.62, Marcel 2026-11-12 and 2026-11-13):
 * - the sign-in sends `shared_device: true` (`isSharedComputer()`), and the server gives that
 *   session a short life (server-kit 0.27's `SessionPolicy`: 15 minutes idle, 4 hours at
 *   most, a 5-minute access token; docs/auth-harmonization.md §5.1, §6.2);
 * - every sign-out, shared or not, drops this device's push (`dropPushSubscription`), then
 *   ends the session on the server (`DELETE /auth/sessions/current`), then drops the tokens
 *   (auth §6.3);
 * - {@link useSharedComputerIdleSignOut} signs an abandoned tab out after 15 minutes without
 *   input;
 * - no push while the box is ticked (`PushDeviceSetting` refuses it): a subscription belongs
 *   to the browser, not to the tab or the sign-in.
 *
 * `storage: "local"` remains only for an app that cannot yet move its session out of
 * `localStorage`: it then calls `setSharedComputer(false)` at every end of that session
 * (logout, a failed refresh), beside removing the token, and the gap stays until it moves.
 * `isSharedComputer()` reads both places, so a choice made in either keeps the cache in
 * memory. Where storage is blocked, `isSharedComputer()` is `false` and `setSharedComputer`
 * does nothing.
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
   *  keep it so: a marker in the tab, beside the session it governs (the tab's storage or page
   *  memory, as the app chose)
   *  (0.62; `sessionStorage` comes back with a reopened tab, so it is no place for tokens). */
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
