/**
 * The first element of `container` that the LAYOUT sees: past the `display: contents`
 * span a field's lock frame stays as while unlocked (LockFrame, refactor audit 2026-11-22
 * INP-4), which has no box and keeps the field at one place in the tree. A test about a
 * field's root box — its classes, its children — reads this, not `firstElementChild`.
 */
export function layoutRoot(container: Element): HTMLElement | null {
  let el = container.firstElementChild;
  while (el instanceof HTMLElement && el.classList.contains("contents")) el = el.firstElementChild;
  return el as HTMLElement | null;
}

/** `el`'s parent as the LAYOUT sees it: past any `display: contents` frame round it. */
export function layoutParent(el: Element): HTMLElement | null {
  let parent = el.parentElement;
  while (parent?.classList.contains("contents")) parent = parent.parentElement;
  return parent;
}
