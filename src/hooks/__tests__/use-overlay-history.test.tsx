import { StrictMode, useState } from "react";
import { act, render } from "@testing-library/react";
import { useOverlayHistory } from "../use-overlay-history";

/**
 * Refactor plan 2026-08-24, U-12.
 *
 * Nested overlays that close together leaked a history entry. A Modal and a
 * PickerSheet inside it each push a same-URL sentinel; when both unmount in one
 * commit the Modal's cleanup runs FIRST, finds the CURRENT sentinel is the picker's
 * rather than its own, and correctly declines to call `history.back()` — but it also
 * had no way to remove its now-buried entry. The picker's cleanup then popped,
 * landing on the Modal's dead sentinel.
 *
 * The user's next Back press consumed that dead entry: `handlePop` found an empty
 * stack and returned, so nothing visible happened. Back had to be pressed twice to
 * leave the page.
 */

const SENTINEL_KEY = "__hbUiOverlayHistory";

/** The overlay sentinel on the entry the browser is currently sitting on, if any. */
function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.[SENTINEL_KEY];
  return typeof id === "string" ? id : null;
}

/** jsdom fires popstate in a task, so every history traversal needs a flush.
 *
 * DRAINS the task queue rather than sleeping on the clock. This was
 * `setTimeout(r, 25)`, which is a bet that 25ms is long enough for whatever jsdom has
 * queued — true on an idle box and false when fifteen test files run at once, which is
 * how two different tests in this file failed intermittently during feedback-loop run
 * 37. Ten yields cost microseconds when there is nothing to do and take as long as they
 * need when there is, because each one lets the queue run to completion before the next.
 */
async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) {
      await new Promise((r) => setTimeout(r, 0));
    }
  });
}

/**
 * Press Back and wait for the navigation to ACTUALLY land.
 *
 * Every call site used to be `history.back()` followed by `setTimeout(25)`, which is a
 * bet that the machine is idle when the task queue drains — and on a loaded box it
 * loses. "never unwinds further than the entries it pushed" failed about one run in
 * three during feedback-loop run 37, always at its closing assertion, because the Back
 * had not been processed yet when the pathname was read. Nothing was wrong with the
 * hook.
 *
 * Awaiting `popstate` makes the wait exactly as long as it needs to be. The timeout is
 * only a backstop so a navigation that genuinely never happens fails as the caller's
 * own assertion a line later, rather than hanging the suite for its full timeout.
 */
async function back() {
  await act(async () => {
    const landed = new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        window.removeEventListener("popstate", done);
        resolve();
      }, 2000);
      window.addEventListener("popstate", done, { once: true });
    });
    window.history.back();
    await landed;
  });
}

function Overlay({ onClose }: { onClose?: () => void }) {
  useOverlayHistory(true, onClose ?? (() => {}));
  return null;
}

// The real composition: the sheet is a CHILD of the dialog, so both unmount in the
// same commit and React runs the dialog's cleanup first.
function Nested({ outer, inner, onCloseOuter, onCloseInner }: {
  outer: boolean;
  inner: boolean;
  onCloseOuter?: () => void;
  onCloseInner?: () => void;
}) {
  if (!outer) return null;
  return (
    <div>
      <Overlay onClose={onCloseOuter} />
      {inner ? <Overlay onClose={onCloseInner} /> : null}
    </div>
  );
}

beforeEach(async () => {
  // Start every test from a history entry with no sentinel on it.
  window.history.replaceState(null, "");
  await settle();
});

describe("useOverlayHistory", () => {
  it("pushes a sentinel while open and unwinds it on close", async () => {
    const view = render(<Nested outer inner={false} />);
    expect(liveSentinel()).not.toBeNull();
    view.unmount();
    await settle();
    expect(liveSentinel()).toBeNull();
  });

  it("closes the overlay when Back pops its entry", async () => {
    const onClose = vi.fn();
    render(<Nested outer inner={false} onCloseOuter={onClose} />);
    await back();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(liveSentinel()).toBeNull();
  });

  it("leaves no dead entry when nested overlays close together (U-12)", async () => {
    // Dialog opens, then the sheet inside it opens in a LATER commit (that ordering is
    // what makes the dialog's sentinel the buried one), then both unmount at once.
    const view = render(<Nested outer inner={false} />);
    const outerSentinel = liveSentinel();
    view.rerender(<Nested outer inner />);
    const innerSentinel = liveSentinel();
    expect(innerSentinel).not.toBe(outerSentinel);

    view.unmount();
    await settle();

    // Before the fix this was the DIALOG's sentinel — an entry no live overlay owned,
    // sitting between the user and the page they were on.
    expect(liveSentinel()).toBeNull();
  });

  it("does not leave a husk for the next overlay to sit on (U-12)", () => {
    // The user-visible half of the same defect. After the dialog+sheet close, the
    // leftover entry stays between the user and the page. Open one more overlay and
    // dismiss it with Back: we must land on the PAGE, not on the husk — otherwise the
    // next Back press is spent clearing something that is not on screen.
    return (async () => {
      const view = render(<Nested outer inner={false} />);
      view.rerender(<Nested outer inner />);
      view.unmount();
      await settle();

      const again = render(<Nested outer inner={false} />);
      await back();
      expect(liveSentinel()).toBeNull();
      again.unmount();
      await settle();
    })();
  });

  it("closes only the top overlay when Back pops the inner sentinel", async () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    const view = render(<Nested outer inner={false} onCloseOuter={onOuter} onCloseInner={onInner} />);
    view.rerender(<Nested outer inner onCloseOuter={onOuter} onCloseInner={onInner} />);
    await back();
    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
    // ...and we are back on the dialog's own sentinel, which it still owns.
    expect(liveSentinel()).not.toBeNull();
    view.unmount();
    await settle();
  });

  // ── a StrictMode remount (steering-design feedback #49) ────────────────────
  //
  // React remounts every effect in development: mount, clean up, mount again, in
  // one commit. `history.go()` lands a task later, so the cleanup's traversal used
  // to eat the entry the SECOND mount had just pushed — leaving the live overlay
  // with no entry of its own and the first one behind as a husk. Every dialog
  // anyone opened cost the user one dead Back press, and the position drifted a
  // further entry from the page on each open.
  function StrictHost({ open }: { open: boolean }) {
    return <StrictMode>{open ? <Overlay /> : null}</StrictMode>;
  }

  it("leaves nothing behind when a dialog is opened and dismissed under StrictMode", async () => {
    // A page of our own, so the depth below counts this test's entries and not
    // whatever an earlier one left forward of the cursor.
    window.history.pushState(null, "", "/strict");
    await settle();
    const view = render(<StrictHost open={false} />);
    const depth = window.history.length;

    view.rerender(<StrictHost open />);
    await settle();
    // One entry for the overlay, however many times its effect was remounted.
    expect(window.history.length).toBe(depth + 1);
    expect(liveSentinel()).not.toBeNull();

    view.rerender(<StrictHost open={false} />);
    await settle();
    // ...and back on the page's own entry, which is what Back has to be able to
    // leave from.
    expect(liveSentinel()).toBeNull();
    expect(window.location.pathname).toBe("/strict");
    view.unmount();
    await settle();
  });

  it("still closes on Back after a StrictMode remount", async () => {
    // The other half: the overlay that survives the remount must own the entry it
    // is standing on, or Back stops dismissing it and navigates the page instead.
    const onClose = vi.fn();
    function Host() {
      return (
        <StrictMode>
          <Overlay onClose={onClose} />
        </StrictMode>
      );
    }
    const view = render(<Host />);
    await settle();
    await back();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(liveSentinel()).toBeNull();
    view.unmount();
    await settle();
  });

  it("never unwinds further than the entries it pushed", async () => {
    // The expensive way this failed: a dead entry that a later push had already
    // destroyed was still counted into `history.go(-n)`, and the overshoot came
    // out of a real navigation. Stand one route deep and open and dismiss a
    // dialog several times over — the route beneath must still be there.
    window.history.pushState(null, "", "/second");
    await settle();
    const view = render(<StrictHost open={false} />);
    for (let round = 0; round < 4; round += 1) {
      view.rerender(<StrictHost open />);
      await settle();
      view.rerender(<StrictHost open={false} />);
      await settle();
      expect(window.location.pathname).toBe("/second");
    }
    view.unmount();
    await settle();
    // And one Back press still leaves the page, rather than being spent on a husk.
    await back();
    expect(window.location.pathname).not.toBe("/second");
  });

  it("cleans up an overlay whose entry a Back press already consumed", async () => {
    // The inner overlay is closed BY Back, so its entry is gone before its cleanup
    // runs. Nothing must be marked as owed for it.
    function Host() {
      const [inner, setInner] = useState(true);
      return (
        <div>
          <Overlay />
          {inner ? <Overlay onClose={() => setInner(false)} /> : null}
        </div>
      );
    }
    const view = render(<Host />);
    await back();
    view.unmount();
    await settle();
    expect(liveSentinel()).toBeNull();
  });
});
