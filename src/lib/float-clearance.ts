import { useEffect } from "react";

/**
 * The room the floating launchers take above the bottom nav, published as
 * `--app-float-clearance` on `<html>` so `AppShell` can pad `<main>` past them, and with
 * the nav included as `--kit-floating-inset` (0.49 KIT-11, below).
 *
 * keksdose dev#612 (UX-1.3, "the help button covers content"): the shell padded `<main>`
 * for the nav plus 1.5rem, so on a phone the last row of every page ended under the help
 * launcher — and on /transactions under the action group below it, exactly where the
 * row's amount is. keksdose patched it with its own `--help-launcher-clearance` and an
 * unlayered app.css rule. Here every kit launcher (`FloatingActionButton`, so
 * `FloatingPanel`'s too, and `FloatingActionGroup`) declares its own room while it is
 * mounted and shown, and the shell takes the largest.
 *
 * Declared, not measured: a launcher knows its `offset` and its 3rem height exactly, as
 * CSS lengths, and the variable then follows the nav and the text size by itself. A
 * `hidden` launcher keeps its claim: the room is its own while it is mounted, so the page
 * does not change length as it hides and shows (keksdose's launcher steps aside while an
 * editor covers its corner). Unmount it to give the room back.
 *
 * Internal: not exported from the barrel.
 */

const claims = new Map<symbol, string>();

/**
 * 0.49 KIT-11: `--kit-floating-inset` is the same room measured from the screen's bottom
 * edge — the phone's bottom nav (`--app-nav-h`, 0px from `md` up) or the home indicator,
 * whichever is taller, plus `--app-float-clearance` — so a page's own fixed or sticky
 * footer, or its last row, can clear the launchers with one length at every width.
 * Unset while no launcher is mounted, like `--app-float-clearance`: write
 * `var(--kit-floating-inset, var(--app-nav-h, 0px))`.
 */
const NAV_OR_HOME_INDICATOR = "max(var(--app-nav-h, 0px), env(safe-area-inset-bottom, 0px))";

function publish() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const values = [...claims.values()];
  if (values.length === 0) {
    root.style.removeProperty("--app-float-clearance");
    root.style.removeProperty("--kit-floating-inset");
    return;
  }
  root.style.setProperty("--app-float-clearance", values.length === 1 ? values[0] : `max(${values.join(", ")})`);
  root.style.setProperty("--kit-floating-inset", `calc(${NAV_OR_HOME_INDICATOR} + var(--app-float-clearance))`);
}

/** Claim `value` (a CSS length: the launcher's top edge above the nav, plus a gap) until
 *  the returned function is called. */
export function claimFloatClearance(value: string): () => void {
  const key = Symbol("float-clearance");
  claims.set(key, value);
  publish();
  return () => {
    claims.delete(key);
    publish();
  };
}

/**
 * A launcher at `offset` above the nav claims its 3rem height plus a 0.5rem gap while
 * mounted (`extra`: what its frame adds, the group's 1px borders).
 */
export function useFloatClearance(offset: string, extra?: string): void {
  useEffect(() => {
    return claimFloatClearance(`calc(${offset} + 3.5rem${extra ? ` + ${extra}` : ""})`);
  }, [offset, extra]);
}
