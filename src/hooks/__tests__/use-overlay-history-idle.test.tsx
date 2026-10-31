import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOverlayHistory } from "../use-overlay-history";

/**
 * With no overlay open, the page's own clicks and keystrokes cost the history hook
 * nothing (refactor audit 2026-10-30, INP-14).
 *
 * Its gesture listeners note what the address of the overlay's entry is as the user
 * acts (keksdose live #412, dev #584). They were added with the first overlay and never
 * removed, so after one dialog every click, keyup, change and input on the page — every
 * keystroke in every field — ran the note and scheduled a timer for a second one, for
 * the life of the page, with nothing to note.
 */

function Overlay() {
  useOverlayHistory(true, () => {});
  return null;
}

/** jsdom fires popstate in a task: let the unwind's traversal land. */
async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) await new Promise((r) => setTimeout(r, 0));
  });
}

afterEach(() => vi.restoreAllMocks());

describe("useOverlayHistory between overlays", () => {
  it("schedules nothing for a keystroke once the last overlay has closed", async () => {
    const { unmount } = render(<Overlay />);
    unmount();
    await settle();
    const timers = vi.spyOn(window, "setTimeout");
    fireEvent.keyUp(document.body, { key: "a" });
    fireEvent.input(document.body);
    fireEvent.click(document.body);
    expect(timers).not.toHaveBeenCalled();
  });

  it("still notes the gestures while one is open", async () => {
    const { unmount } = render(<Overlay />);
    const timers = vi.spyOn(window, "setTimeout");
    fireEvent.click(document.body);
    expect(timers).toHaveBeenCalledTimes(1);
    timers.mockRestore();
    unmount();
    await settle();
  });
});
