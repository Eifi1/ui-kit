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
let previousPaddingRight = "";

/**
 * How much width the scrollbar of the DOCUMENT is currently taking.
 *
 * Zero on every platform with overlay scrollbars (macOS, most Linux, every phone) and
 * zero whenever the page does not scroll; ~15px on Windows with classic ones. Read
 * BEFORE `overflow: hidden` is applied, because applying it is what makes it vanish.
 */
function scrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function acquire(): void {
  if (lockCount === 0) {
    // ⚠️ Hiding the document's overflow REMOVES its scrollbar, and on a platform where
    // that scrollbar occupied layout space the page gets ~15px wider for as long as the
    // dialog is open — then snaps back on close. Keksdose dev #561 from a 500px-wide
    // desktop window: *"remove the scroll bar to stop horizontal resizing when opening
    // edit tx and closing"*.
    //
    // Replacing the width we are about to take away is the standard fix and the narrow
    // one. The alternatives both cost more than the bug: `scrollbar-gutter` on `html`
    // shrinks the initial containing block, so every `position: fixed` overlay stops
    // 15px short on each edge (measured, and documented in tokens.css), and moving the
    // scroll container to `main` below `md` stops a phone's URL bar collapsing. This
    // touches neither — only the element already being modified, only while locked.
    //
    // Note this fixes the DIALOG jump specifically. The separate page-to-page width
    // change, where one route scrolls and the next does not, is the open decision
    // recorded in tokens.css and is untouched here.
    const gap = scrollbarWidth();
    previousOverflow = document.body.style.overflow;
    previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (gap > 0) {
      // Added to whatever the body already had rather than assigned, so a consumer
      // that sets its own padding keeps it.
      const existing = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${existing + gap}px`;
    }
  }
  lockCount += 1;
}

function release(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
    previousOverflow = "";
    previousPaddingRight = "";
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
