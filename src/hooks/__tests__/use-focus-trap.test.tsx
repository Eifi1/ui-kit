import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useFocusTrap } from "../use-focus-trap";

/**
 * The cases here are the ones Modal's original inline copy did NOT handle, plus the
 * ones it did — because the hook replaced that copy and must not have lost anything.
 */

function Panel({
  active = true,
  restoreFocus = true,
  initialFocus,
  children,
}: {
  active?: boolean;
  restoreFocus?: boolean;
  initialFocus?: "container" | "first";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, restoreFocus, initialFocus });
  return (
    <div ref={ref} tabIndex={-1} data-testid="panel">
      {children}
    </div>
  );
}

describe("useFocusTrap", () => {
  it("focuses the container, not the first field, by default", () => {
    // Deliberate: focusing the first input pops the software keyboard on a phone the
    // moment a dialog opens, before the user has asked to type. Modal relies on this.
    render(
      <Panel>
        <input aria-label="first" />
      </Panel>,
    );
    expect(screen.getByTestId("panel")).toHaveFocus();
  });

  it('focuses the first tabbable when asked with initialFocus="first"', () => {
    render(
      <Panel initialFocus="first">
        <input aria-label="first" />
        <button>second</button>
      </Panel>,
    );
    expect(screen.getByLabelText("first")).toHaveFocus();
  });

  it("wraps Tab from the last tabbable back to the first", () => {
    render(
      <Panel>
        <button>one</button>
        <button>two</button>
      </Panel>,
    );
    const last = screen.getByRole("button", { name: "two" });
    last.focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "one" })).toHaveFocus();
  });

  it("wraps Shift+Tab from the first tabbable to the last", () => {
    render(
      <Panel>
        <button>one</button>
        <button>two</button>
      </Panel>,
    );
    screen.getByRole("button", { name: "one" }).focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "two" })).toHaveFocus();
  });

  it("keeps focus on the container when there is nothing tabbable inside", () => {
    render(
      <Panel>
        <p>nothing to focus</p>
      </Panel>,
    );
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(screen.getByTestId("panel")).toHaveFocus();
  });

  it("sees tabbables that appear AFTER the trap engaged", () => {
    // The case Modal's copy got wrong: it captured the list once on open, so a search
    // box that appears when options finish loading was never reachable by Tab.
    function Late() {
      const [shown, setShown] = useState(false);
      return (
        <Panel>
          <button onClick={() => setShown(true)}>reveal</button>
          {shown && <button>appeared</button>}
        </Panel>
      );
    }
    render(<Late />);
    fireEvent.click(screen.getByRole("button", { name: "reveal" }));

    // "appeared" is now last; Tab from it must wrap to "reveal".
    screen.getByRole("button", { name: "appeared" }).focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "reveal" })).toHaveFocus();
  });

  it("restores focus to the trigger when the trap unmounts", () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          {open && (
            <Panel>
              <button onClick={() => setOpen(false)}>close</button>
            </Panel>
          )}
        </>
      );
    }
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByTestId("panel")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(trigger).toHaveFocus();
  });

  it("does not throw when the element to restore to has left the DOM", () => {
    // A row's button opens a dialog; the row is filtered away while it is open.
    // Restoring to a detached node sends focus to <body> and the user loses their
    // place — the hook checks isConnected rather than calling .focus() blindly.
    function Host() {
      const [open, setOpen] = useState(false);
      const [triggerGone, setTriggerGone] = useState(false);
      return (
        <>
          {!triggerGone && <button onClick={() => setOpen(true)}>open</button>}
          {open && (
            <Panel>
              <button
                onClick={() => {
                  setTriggerGone(true);
                  setOpen(false);
                }}
              >
                close
              </button>
            </Panel>
          )}
        </>
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "open" }));
    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "close" })),
    ).not.toThrow();
  });

  it("does nothing while inactive", () => {
    render(
      <>
        <button>outside</button>
        <Panel active={false}>
          <button>inside</button>
        </Panel>
      </>,
    );
    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(outside).toHaveFocus();
  });

  it("only the innermost trap handles Tab when two are nested", () => {
    // A picker opened inside a dialog. Without the stack both traps act on one
    // keystroke and fight over where focus lands.
    render(
      <Panel>
        <button>outer-first</button>
        <Panel>
          <button>inner-one</button>
          <button>inner-two</button>
        </Panel>
      </Panel>,
    );
    const panels = screen.getAllByTestId("panel");
    const inner = panels[1];
    screen.getByRole("button", { name: "inner-two" }).focus();
    fireEvent.keyDown(inner, { key: "Tab" });
    expect(screen.getByRole("button", { name: "inner-one" })).toHaveFocus();
  });
});
