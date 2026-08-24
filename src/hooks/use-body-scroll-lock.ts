import { useEffect } from "react";

/**
 * How many locks are currently held, and what `body.style.overflow` was before the
 * first of them. Module scope on purpose: the whole point is that the lockers do not
 * know about each other, so the only place they can agree is here.
 *
 * This used to be per-locker — each one saved the previous value and restored it on
 * cleanup — and five places in this package do that (Modal, PickerSheet,
 * NumberPadSheet, and the DataTable's row dialog and settings panel). Save/restore
 * composes only if the releases are strictly nested in reverse order of the
 * acquisitions, and React runs unmount cleanups PARENT FIRST, which is the opposite
 * of what the idiom needs.
 *
 * The gesture that broke it is an ordinary one: open the transaction dialog, tap the
 * amount — the numpad sheet opens on focus, in a later commit, capturing the
 * "hidden" the dialog had already set — then press Save. Both unmount together, the
 * dialog restores "" first, the sheet then puts "hidden" back, and the page is left
 * unscrollable with no overlay on screen. The only way out was a reload.
 *
 * A count has neither failure: the first acquire records the real previous value, the
 * last release restores it, and the order in between does not matter.
 */
let lockCount = 0;
let previousOverflow = "";

function acquire(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function release(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
}

/**
 * Lock background scrolling while `locked` is true, restoring the prior value once
 * the LAST holder releases. Composable with every other caller of this hook — see
 * the note above for why that has to be a property of the hook rather than of each
 * caller's discipline.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    acquire();
    return release;
  }, [locked]);
}
