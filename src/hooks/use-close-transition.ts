import { useCallback, useEffect, useRef, useState } from "react";

/** How long the exit animation runs, in ms. Mirrors `.animate-sheet-out` in
 *  tokens.css — the sheet is the slower of the two, so it is what the unmount waits
 *  for. Exported so a test can advance a fake clock by the real number rather than
 *  by a copy of it. */
export const OVERLAY_EXIT_MS = 220;

/**
 * The state machine an exit animation needs, written once for every overlay in this
 * package (Keksdose live #320 rework: *"Recognized the opening transition. Choose
 * transition should be the same, only backwards"*).
 *
 * ## Why a hook and not a class on the panel
 *
 * An enter animation is free: the element mounts, the keyframes run. An exit is not —
 * by the time the state says "closed" the element is already gone, so something has to
 * hold it on screen for exactly as long as the animation lasts. That something cannot
 * be the caller (every caller would need the same timer) and it cannot be the panel's
 * markup. It is this: the overlay's own affordances call {@link requestClose} instead
 * of `onClose`, render the `-out` classes while `closing` is true, and the real
 * `onClose` — the one that unmounts them — fires when the animation has finished.
 *
 * ## What it deliberately does not do
 *
 * It does not intercept a close the CALLER decides on. A dialog that closes itself
 * after a successful save sets its own state and unmounts, with no exit animation, and
 * that is the right trade: making it otherwise would mean every overlay owning an
 * `open` prop and every caller waiting on a callback to learn when its own state took
 * effect. What is animated is what the user dismissed — the X, the backdrop, Escape,
 * the Back gesture — which is the motion the row was about.
 *
 * ## Reduced motion
 *
 * Closes immediately, without the delay. A user who has asked for no motion must not
 * be made to wait 220ms for an animation they are not being shown, and the `-out`
 * classes are never applied, so tokens.css needs no reduced-motion rule for them.
 */
export function useCloseTransition(
  onClose: () => void,
  ms: number = OVERLAY_EXIT_MS,
): { closing: boolean; requestClose: () => void } {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest-ref rather than a dependency: callers pass inline arrows, so a dependency
  // would hand every render a new `requestClose` — and this one is read once, by a
  // timer that has already been scheduled. Assigned in an effect, never during render
  // (`react-hooks/refs`), matching `use-long-press.ts` next door.
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });

  // One timer, ever. A second Escape while the panel is already leaving must not
  // schedule a second unmount — two `onClose` calls is a caller's state machine being
  // run twice, which is how a "close" ends up also discarding the row behind it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (timer.current) return;
    // Read at close time, not at mount: the setting can change under a long-lived
    // page, and `matchMedia` is absent in jsdom and in SSR — where "no animation" is
    // also the only correct answer, since nothing is painting.
    const reduced =
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || ms <= 0) {
      latest.current();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      // ⚠️ Reset BEFORE handing control back — reported from a phone within the hour
      // of the 0.4.52 deploy that first shipped this hook, against every table at once.
      // A panel that returns `null` while closed is still MOUNTED — `FullBleedDialog`
      // early-returns after its hooks, and DataTable renders it once and flips `open`
      // — so this state outlives the panel it describes. Left true, the NEXT open
      // rendered `animate-*-out` with `animation-fill-mode: forwards` on a sheet that
      // had only just arrived: it lowered itself off the screen in 220ms and stayed
      // there, invisible but still holding the backdrop's pointer events. Every table
      // on every phone, first open fine and every one after it not, until a route
      // change remounted the component.
      //
      // Batched with the `onClose` below, so a caller that unmounts on close still
      // renders exactly once and nothing flashes.
      setClosing(false);
      latest.current();
    }, ms);
  }, [ms]);

  return { closing, requestClose };
}
