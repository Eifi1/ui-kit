import { useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BulkActionBar } from "../bulk-action-bar";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";
import { flushMicrotasks } from "../../test/tasks";
import { DESKTOP_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * BulkActionBar leaving with the focus in it — Clear, or an action that empties the
 * selection — went inert and then unmounted, and the focus fell to `<body>` (refactor
 * audit 2026-10-30, DSP-15; keksdose's phone bar, where VoiceOver's cursor jumped to the
 * top). It now goes back where it came into the bar from, or to `returnFocusRef`.
 */

function Page({ withReturn = false }: { withReturn?: boolean }) {
  const [count, setCount] = useState(2);
  const select = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button">Row box</button>
      <button type="button" ref={select}>
        Select
      </button>
      <button type="button" onClick={() => setCount(0)}>
        Clear from outside
      </button>
      <BulkActionBar
        variant="sticky"
        count={count}
        onClear={() => setCount(0)}
        returnFocusRef={withReturn ? select : undefined}
      >
        <button type="button" onClick={() => setCount(0)}>
          Archive
        </button>
      </BulkActionBar>
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

/** Focus moves from `from` into the bar's `to`, then `to` is pressed. */
function enterAndPress(from: string, to: string) {
  act(() => button(from).focus());
  act(() => button(to).focus());
  fireEvent.click(button(to));
}

let restoreViewport: () => void = () => {};
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  restoreViewport();
});

describe.each([
  ["with its exit animation", false],
  ["under reduced motion (gone at once)", true],
])("BulkActionBar gives the focus back when it leaves (audit 2026-10-30 DSP-15), %s", (_, reduced) => {
  beforeEach(() => {
    restoreViewport = stubViewportWidth(DESKTOP_WIDTH, { reducedMotion: reduced });
  });

  it("Clear: back to the control the focus came from", () => {
    render(<Page />);
    enterAndPress("Row box", "Clear selection");
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(document.activeElement).toBe(button("Row box"));
  });

  it("an action that empties the selection: the same", () => {
    render(<Page />);
    enterAndPress("Row box", "Archive");
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(document.activeElement).toBe(button("Row box"));
  });

  it("returnFocusRef wins", () => {
    render(<Page withReturn />);
    enterAndPress("Row box", "Clear selection");
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(document.activeElement).toBe(button("Select"));
  });

  it("focus that left the bar for nothing is not the bar's: a later hide moves nothing (0.52 code review)", async () => {
    render(<Page withReturn />);
    act(() => button("Row box").focus());
    act(() => button("Clear selection").focus());
    // A click on the page's background: no element takes the focus.
    act(() => button("Clear selection").blur());
    await flushMicrotasks();
    // Much later the last row is unticked with the pointer — in Safari a click that
    // focuses nothing — and the bar leaves with the focus on <body>, not in it.
    fireEvent.click(button("Clear from outside"));
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(document.activeElement).toBe(document.body);
  });

  it("a bar that leaves without the focus in it moves nothing", () => {
    render(<Page withReturn />);
    act(() => button("Clear from outside").focus());
    fireEvent.click(button("Clear from outside"));
    act(() => vi.advanceTimersByTime(OVERLAY_EXIT_MS + 10));
    expect(document.activeElement).toBe(button("Clear from outside"));
  });
});

describe("BulkActionBar's panel is content or nothing (audit 2026-10-30 DUP-14)", () => {
  it("an empty-string panel draws no empty strip under the bar", () => {
    const { container } = render(
      <BulkActionBar variant="sticky" count={1} onClear={() => {}} panel="">
        <button type="button">Archive</button>
      </BulkActionBar>,
    );
    expect(container.querySelector("[data-bulk-action-bar-panel]")).toBeNull();
  });
});
