import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "../modal";

/**
 * The draggable panel (dev#460) must not outlive the dialog.
 *
 * The first shape of this hung `pointermove`/`pointerup` on `window` from inside the
 * `pointerdown` handler and unhooked them from the `pointerup` handler — which means the
 * teardown only ever ran if the gesture ENDED. React knows nothing about a listener
 * added from an event handler, so a drag interrupted by an unmount left a live
 * `pointermove` on `window` for the life of the page, holding the panel's state and its
 * `setOffset` alive with it. That is not a hypothetical order of events: the feedback
 * composer is the one caller that turns dragging on, and it closes ITSELF on submit —
 * a Ctrl+Enter sent mid-drag unmounts the panel with the pointer still down. Every such
 * drag added another listener.
 *
 * So the assertion here is about teardown, not about what the panel looks like: after an
 * unmount there is nothing of the drag left on `window`, however the drag is wired.
 */
const POINTER_EVENTS = new Set([
  "pointermove",
  "pointerup",
  "pointercancel",
  "mousemove",
  "mouseup",
]);

/**
 * Records the drag-shaped listeners that reach `window` and forgets them again when
 * they are removed, so what is left at the end is exactly what leaked. Patched by hand
 * rather than with `vi.spyOn`, because `clearMocks` would restore the implementation
 * mid-test and the tracker would stop seeing removals.
 */
function trackWindowListeners() {
  let live: Array<[string, unknown]> = [];
  const realAdd = window.addEventListener;
  const realRemove = window.removeEventListener;

  window.addEventListener = function (this: Window, type: string, listener: never, options: never) {
    if (POINTER_EVENTS.has(type)) live.push([type, listener]);
    return realAdd.call(this, type, listener, options);
  } as typeof window.addEventListener;

  window.removeEventListener = function (
    this: Window,
    type: string,
    listener: never,
    options: never,
  ) {
    live = live.filter(([t, l]) => !(t === type && l === listener));
    return realRemove.call(this, type, listener, options);
  } as typeof window.removeEventListener;

  return {
    leaked: () => live.map(([type]) => type),
    restore: () => {
      window.addEventListener = realAdd;
      window.removeEventListener = realRemove;
    },
  };
}

describe("Modal — draggable panel", () => {
  let tracker: ReturnType<typeof trackWindowListeners> | null = null;

  afterEach(() => {
    tracker?.restore();
    tracker = null;
  });

  it("leaves nothing on window when a drag is interrupted by an unmount", () => {
    tracker = trackWindowListeners();
    const { unmount } = render(
      <Modal onClose={vi.fn()} draggable>
        <p>drag me</p>
      </Modal>,
    );

    // Press and hold on the panel's own chrome: the drag is now live.
    fireEvent.pointerDown(screen.getByRole("dialog"), { button: 0, clientX: 100, clientY: 100 });
    // …and the dialog goes away underneath it, the way the feedback composer does when
    // its submit succeeds. No `pointerup` is ever delivered.
    unmount();

    expect(tracker.leaked()).toEqual([]);
  });

  it("moves the panel with the pointer and stops when the pointer is released", () => {
    render(
      <Modal onClose={vi.fn()} draggable>
        <p>drag me</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog");

    fireEvent.pointerDown(panel, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(panel, { clientX: 130, clientY: 90 });
    expect(panel.style.transform).toBe("translate(30px, -10px)");

    fireEvent.pointerUp(panel);
    fireEvent.pointerMove(panel, { clientX: 400, clientY: 400 });
    // The offset survives the release (the panel stays where it was dropped); a move
    // after it is no longer a drag.
    expect(panel.style.transform).toBe("translate(30px, -10px)");
  });

  it("does not start a drag from a control inside the panel", () => {
    render(
      <Modal onClose={vi.fn()} draggable>
        <input aria-label="note" />
      </Modal>,
    );
    const panel = screen.getByRole("dialog");

    // Selecting text in a field is a gesture that belongs to the field.
    fireEvent.pointerDown(screen.getByLabelText("note"), { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(panel, { clientX: 130, clientY: 90 });
    expect(panel.style.transform).toBe("");
  });

  it("adds no drag handling at all unless `draggable` is set", () => {
    tracker = trackWindowListeners();
    render(
      <Modal onClose={vi.fn()}>
        <p>plain</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog");

    fireEvent.pointerDown(panel, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(panel, { clientX: 130, clientY: 90 });

    expect(panel.style.transform).toBe("");
    expect(tracker.leaked()).toEqual([]);
  });
});
