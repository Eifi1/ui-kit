import { useState } from "react";
import { render, act } from "@testing-library/react";
import { useBodyScrollLock } from "../use-body-scroll-lock";
import { Modal } from "../../components/modal";

/**
 * Refactor plan 2026-08-24, U-3 (sev 4).
 *
 * Five places in this package lock background scrolling, all with the same
 * save-the-previous-value-and-restore-it idiom. Save/restore only composes if the
 * releases are strictly nested in reverse order, and React runs unmount cleanups
 * PARENT FIRST — the opposite of what the idiom needs. The result was a page left
 * permanently unscrollable with nothing on screen, recoverable only by reloading.
 */

function Locker({ children }: { children?: React.ReactNode }) {
  useBodyScrollLock(true);
  return <div>{children}</div>;
}

function Both({ outer, inner }: { outer: boolean; inner: boolean }) {
  if (!outer) return null;
  return <Locker>{inner ? <Locker /> : null}</Locker>;
}

function Siblings({ a, b }: { a: boolean; b: boolean }) {
  return (
    <>
      {a ? <Locker /> : null}
      {b ? <Locker /> : null}
    </>
  );
}

beforeEach(() => {
  document.body.style.overflow = "";
});

describe("useBodyScrollLock", () => {
  it("locks while mounted and restores the previous value on unmount", () => {
    const view = render(<Locker />);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores a NON-empty previous value, not just the empty one", () => {
    document.body.style.overflow = "clip";
    const view = render(<Locker />);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("clip");
  });

  it("leaves the page scrollable when nested lockers unmount together (U-3)", () => {
    // The order the real gesture produces, and the one the idiom cannot survive: the
    // outer locks FIRST (capturing ""), the inner opens in a LATER commit (capturing
    // "hidden"), and then both unmount in the same commit. React runs cleanups parent
    // first, so the outer restores "" and the inner then puts "hidden" back — with
    // nothing on screen. Only a reload gets the page scrolling again.
    //
    // Mounting both in ONE commit does not show it: effects run child-first there, so
    // the two captures are the other way round and the two errors cancel. The bug
    // needs the second commit, which is exactly what tapping the amount field does.
    const view = render(<Both outer inner={false} />);
    view.rerender(<Both outer inner />);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("leaves the page scrollable when both mount in one commit too", () => {
    const view = render(<Both outer inner />);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps the lock while another locker is still open (U-3)", () => {
    // The other direction, which needs SIBLING overlays — a nested one cannot outlive
    // its parent. Two are open, the first closes, the second stays: before the fix the
    // first one's restore put "" back and the background scrolled behind the overlay
    // that was still on screen.
    const view = render(<Siblings a b />);
    expect(document.body.style.overflow).toBe("hidden");
    view.rerender(<Siblings a={false} b />);
    expect(document.body.style.overflow).toBe("hidden");
    view.rerender(<Siblings a={false} b={false} />);
    expect(document.body.style.overflow).toBe("");
  });

  it("survives a locker toggling off and on again", () => {
    function Toggle() {
      const [on, setOn] = useState(true);
      useBodyScrollLock(on);
      return <button onClick={() => setOn((v) => !v)}>t</button>;
    }
    const view = render(<Toggle />);
    expect(document.body.style.overflow).toBe("hidden");
    act(() => {
      view.getByRole("button").click();
    });
    expect(document.body.style.overflow).toBe("");
    act(() => {
      view.getByRole("button").click();
    });
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Modal composed with a sheet (the reachable gesture, U-3)", () => {
  it("leaves the page scrollable after a dialog containing a sheet is saved", () => {
    // Open the transaction dialog, tap the amount — the numpad sheet opens on focus —
    // press Save. Dialog and sheet unmount in the same commit. Before the fix the
    // page was left `overflow: hidden` with no overlay on screen and no way back
    // except a reload.
    function Screen({ sheet }: { sheet: boolean }) {
      return <Modal onClose={() => {}}>{sheet ? <Locker /> : <div>form</div>}</Modal>;
    }
    const view = render(<Screen sheet={false} />); // dialog opens
    view.rerender(<Screen sheet />); // amount tapped, numpad sheet opens
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount(); // Save pressed: both unmount in one commit
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps the background locked while only the sheet closes", () => {
    function Screen({ sheet }: { sheet: boolean }) {
      return <Modal onClose={() => {}}>{sheet ? <Locker /> : <div>form</div>}</Modal>;
    }
    const view = render(<Screen sheet />);
    view.rerender(<Screen sheet={false} />);
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});

/**
 * Keksdose dev #561, from a 500px-wide DESKTOP window: *"remove the scroll bar to stop
 * horizontal resizing when opening edit tx and closing"*.
 *
 * Below `AppShell`'s md breakpoint the viewport is the scroll container, so hiding the
 * document's overflow removes its scrollbar — and where that scrollbar occupied layout
 * space, the page widens by its width for as long as the dialog is open, then snaps
 * back. Replacing exactly that width while locked is the fix.
 *
 * ⚠️ Invisible in a real browser here: headless Chromium uses OVERLAY scrollbars, so
 * `innerWidth - clientWidth` is 0 and nothing shifts — the bug only exists on classic
 * scrollbars (Windows, which is where it was reported from). jsdom cannot lay out
 * either, but the decision IS arithmetic on those two numbers, so it is testable by
 * stating them.
 */
describe("the scrollbar the lock takes away (dev #561)", () => {
  const withScrollbar = (px: number) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 500 - px,
    });
  };

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, "clientWidth");
    document.body.style.paddingRight = "";
  });

  it("replaces a classic scrollbar's width while locked, and gives it back", () => {
    withScrollbar(15);
    const { rerender } = render(<Both outer inner={false} />);
    expect(document.body.style.overflow).toBe("hidden");
    // The whole bug: without this the page is 15px wider for as long as the dialog is up.
    expect(document.body.style.paddingRight).toBe("15px");

    rerender(<Both outer={false} inner={false} />);
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
  });

  it("adds nothing where the scrollbar takes no space", () => {
    // Overlay scrollbars — macOS, most Linux, every phone — and any page that does not
    // scroll. Padding there would CREATE the gap this exists to prevent.
    withScrollbar(0);
    const { rerender } = render(<Both outer inner={false} />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.paddingRight).toBe("");
    rerender(<Both outer={false} inner={false} />);
    expect(document.body.style.paddingRight).toBe("");
  });

  it("keeps padding the consumer had already set", () => {
    document.body.style.paddingRight = "8px";
    withScrollbar(15);
    const { rerender } = render(<Both outer inner={false} />);
    expect(document.body.style.paddingRight).toBe("23px");
    rerender(<Both outer={false} inner={false} />);
    // Restored to the consumer's value, not blanked.
    expect(document.body.style.paddingRight).toBe("8px");
  });

  it("compensates once for nested locks, not once per lock", () => {
    // The numpad-inside-the-dialog gesture the counter above exists for. Two locks must
    // not stack two scrollbars' worth of padding.
    withScrollbar(15);
    const { rerender } = render(<Both outer inner />);
    expect(document.body.style.paddingRight).toBe("15px");
    rerender(<Both outer inner={false} />);
    expect(document.body.style.paddingRight).toBe("15px");
    rerender(<Both outer={false} inner={false} />);
    expect(document.body.style.paddingRight).toBe("");
  });
});
