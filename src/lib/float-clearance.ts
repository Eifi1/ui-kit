import { useEffect } from "react";

/**
 * The room the floating launchers take above the bottom nav, published as
 * `--app-float-clearance` on `<html>` so `AppShell` can pad `<main>` past them.
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

function publish() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const values = [...claims.values()];
  if (values.length === 0) root.style.removeProperty("--app-float-clearance");
  else root.style.setProperty("--app-float-clearance", values.length === 1 ? values[0] : `max(${values.join(", ")})`);
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
