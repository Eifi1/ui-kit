import { StrictMode, useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { firstTabStop, tabStops, useFocusTrap } from "../use-focus-trap";
import type { FocusTrapOptions } from "../use-focus-trap";

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
  initialFocus?: FocusTrapOptions["initialFocus"];
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

/** A field the app autofocuses on purpose — keksdose's create card and its amount. */
function Amount() {
  // eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test
  return <input aria-label="amount" autoFocus />;
}

/** A trigger, and a panel that mounts with an autofocused field in it. */
function AutofocusHost() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      {open && (
        <Panel>
          <Amount />
          <button onClick={() => setOpen(false)}>close</button>
        </Panel>
      )}
    </>
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

  it("leaves a child the app autofocused where it is, instead of taking the container", () => {
    // 0.33.1, keksdose live #402. React honours `autoFocus` while it commits and the
    // trap engages in an effect after that, so focusing the container there took focus
    // off the field the instant it got it — and on a phone the numpad with it.
    render(
      <Panel>
        <input aria-label="note" />
        <Amount />
      </Panel>,
    );
    expect(screen.getByLabelText("amount")).toHaveFocus();
  });

  it('…and instead of the first tabbable with initialFocus="first"', () => {
    render(
      <Panel initialFocus="first">
        <button>first</button>
        <Amount />
      </Panel>,
    );
    expect(screen.getByLabelText("amount")).toHaveFocus();
  });

  it("still follows a function initialFocus over an autofocused child", () => {
    // A thunk is the caller naming the element outright — PickerSheet's search box,
    // CommandPalette's field — so it wins over anything a child did first.
    render(
      <Panel initialFocus={() => screen.getByRole("button", { name: "save" })}>
        <Amount />
        <button>save</button>
      </Panel>,
    );
    expect(screen.getByRole("button", { name: "save" })).toHaveFocus();
  });

  it("gives focus back to the opener after an autofocused open, not to the field", () => {
    // The opener used to be read in the trap's effect — after React had autofocused the
    // field — so closing "restored" focus into the panel that was closing, which had
    // left the DOM by then, and focus fell to <body>.
    render(<AutofocusHost />);
    const trigger = screen.getByRole("button", { name: "open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByLabelText("amount")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(trigger).toHaveFocus();
  });

  it("holds both under StrictMode's second effect", () => {
    // StrictMode runs the cleanup and the effect once more straight after mounting, and
    // React does not autofocus again for that run. A cleanup that gave focus back to the
    // opener there would leave the field for good; an opener read in either effect
    // would be the field itself.
    render(
      <StrictMode>
        <AutofocusHost />
      </StrictMode>,
    );
    const trigger = screen.getByRole("button", { name: "open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByLabelText("amount")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(trigger).toHaveFocus();
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

  // Round 0.34 BUG-4: a roving grid — one cell at tabIndex 0, the rest at -1 — ends the
  // panel, as in the calendar popover and the picker sheet. The -1 cells are no stops.
  function RovingPanel() {
    return (
      <Panel>
        <button>prev</button>
        <button>next</button>
        <button tabIndex={0}>day 6</button>
        <button tabIndex={-1}>day 7</button>
        <a href="#x" tabIndex={-1}>
          more
        </a>
        <input aria-label="skipped field" tabIndex={-1} />
      </Panel>
    );
  }

  it("wraps Tab from the last REAL stop, past controls taken out of the tab order", () => {
    render(<RovingPanel />);
    screen.getByRole("button", { name: "day 6" }).focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "prev" })).toHaveFocus();
  });

  it("wraps Shift+Tab from the first stop onto the last real one, not a -1 control", () => {
    render(<RovingPanel />);
    screen.getByRole("button", { name: "prev" }).focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "day 6" })).toHaveFocus();
  });

  it("does not count controls inside something hidden or inert", () => {
    render(
      <Panel>
        <button>one</button>
        <button>two</button>
        <div hidden>
          <button>in hidden</button>
        </div>
        <div inert>
          <button>in inert</button>
        </div>
      </Panel>,
    );
    screen.getByRole("button", { name: "two" }).focus();
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "one" })).toHaveFocus();
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
    expect(() => fireEvent.click(screen.getByRole("button", { name: "close" }))).not.toThrow();
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

describe("tabStops / firstTabStop", () => {
  // The trap's reading of "a Tab lands here", for a part that walks Tab without a trap —
  // the tour's field + card ring (refactor audit 2026-10-30, DUP-9).
  it("lists what a Tab reaches, the element itself first, and nothing taken out of the order", () => {
    const { container } = render(
      <div>
        <div data-testid="field">
          <button type="button" tabIndex={-1}>
            Cell
          </button>
          <div hidden>
            <button type="button">Hidden</button>
          </div>
          <div inert>
            <button type="button">Inert</button>
          </div>
          <button type="button" disabled>
            Disabled
          </button>
          <input aria-label="Amount" />
          <a href="#more">More</a>
        </div>
      </div>,
    );
    const field = screen.getByTestId("field");
    // A focusable container (a roving widget's root): itself first.
    field.tabIndex = 0;
    const amount = screen.getByRole("textbox", { name: "Amount" });
    const more = screen.getByRole("link", { name: "More" });
    expect(tabStops(field)).toEqual([field, amount, more]);
    expect(firstTabStop(container.querySelector("[hidden]")!)).toBeNull();
    field.removeAttribute("tabindex");
    expect(firstTabStop(field)).toBe(amount);
  });
});
