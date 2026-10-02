/**
 * What floats over the bottom of the screen right now, so a notice that comes and goes
 * can sit above it instead of on it.
 *
 * kastlan 0.18: its offline pill is a `bottom-start` FloatingActionButton, and
 * `ServerWakeNotice` sits in the same corner — right after a break both show at once
 * (the photo outbox syncs while the first reads wake the server), one over the other.
 * The FAB's `offset` cannot help: the notice comes and goes, and on a phone it is
 * nearly as wide as the screen, so a FAB in EITHER corner can be under it.
 *
 * Measured, not declared: a FloatingActionButton registers its fixed element while it
 * is mounted, and a notice asks {@link clearanceAbove} for the height it has to clear —
 * whatever offset, `extended` label or `hidden` state the controls are in. A control
 * that is `hidden` measures 0 × 0 and is skipped, so kastlan's pill, which stays
 * mounted and hidden while there is nothing to report, costs the notice nothing.
 *
 * Internal: not exported from the barrel.
 */

const occupants = new Set<HTMLElement>();
const listeners = new Set<() => void>();
let observer: ResizeObserver | null = null;

function notify() {
  for (const listener of listeners) listener();
}

/** Track `element` until the returned function is called. Size changes — a label that
 *  grows, `hidden` toggling — notify the subscribers too. */
export function registerFloating(element: HTMLElement): () => void {
  occupants.add(element);
  if (observer === null && typeof ResizeObserver !== "undefined") observer = new ResizeObserver(notify);
  observer?.observe(element);
  notify();
  return () => {
    occupants.delete(element);
    observer?.unobserve(element);
    notify();
  };
}

/** Hear every registration, removal and size change. */
export function subscribeFloating(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The distance from the viewport's bottom edge to the top of the highest visible
 * floating control that shares a column with `element` — what `element` has to clear —
 * or `null` when nothing is under it.
 */
export function clearanceAbove(element: HTMLElement | null): number | null {
  if (!element) return null;
  const own = element.getBoundingClientRect();
  let top = Infinity;
  for (const other of occupants) {
    const box = other.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (box.right <= own.left || box.left >= own.right) continue;
    top = Math.min(top, box.top);
  }
  return top === Infinity ? null : Math.max(0, window.innerHeight - top);
}
