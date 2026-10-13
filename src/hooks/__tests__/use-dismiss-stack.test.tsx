import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { claimEscape, runOwnKeyDown, takeEscape, useDismissLayer, useEscapeKey } from "../use-dismiss";

/**
 * Round 0.34 Wave 2, DUP-1: the Escape stack itself. Every overlay test in the kit goes
 * through it; these pin its rules without a dialog in the way.
 */

/** A layer with an element of its own: `onKeyDown` is where it takes the key when focus
 *  is inside it, as Modal's panel and the pickers' search boxes do. */
function Layer({
  name,
  onEscape,
  ownKeyDown,
  children,
}: {
  name: string;
  onEscape: () => void;
  ownKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  children?: ReactNode;
}) {
  const layer = useDismissLayer(true, onEscape);
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a test layer: its onKeyDown is the Escape boundary
    <div
      data-testid={name}
      onKeyDown={(e) => {
        runOwnKeyDown(e, ownKeyDown, layer);
        takeEscape(e);
      }}
    >
      <input aria-label={`${name} field`} />
      {children}
    </div>
  );
}

const escape = (el: Element | Document = document.body) => fireEvent.keyDown(el, { key: "Escape" });

describe("useDismissLayer", () => {
  it("hands Escape to the layer opened last, one press each", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    function Host() {
      const [innerOpen, setInnerOpen] = useState(false);
      return (
        <Layer name="outer" onEscape={outer}>
          <button type="button" onClick={() => setInnerOpen(true)}>
            open inner
          </button>
          {innerOpen && <Layer name="inner" onEscape={inner} />}
        </Layer>
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "open inner" }));
    // Focus in the OUTER layer: its element is on the key's path, the inner one is not —
    // the inner one is still the one on top.
    escape(screen.getByLabelText("outer field"));
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("reaches the top layer from the page, where no layer's element is on the path", () => {
    const onEscape = vi.fn();
    render(<Layer name="only" onEscape={onEscape} />);
    escape();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("stops the key at the layer that took it, and marks it consumed", () => {
    const outside = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- an app's own panel around the layer
      <div onKeyDown={(e) => outside(e.defaultPrevented)}>
        <Layer name="only" onEscape={() => {}} />
      </div>,
    );
    escape(screen.getByLabelText("only field"));
    expect(outside).not.toHaveBeenCalled();
  });

  it("does nothing once the layer has closed", () => {
    const onEscape = vi.fn();
    function Host() {
      const [open, setOpen] = useState(true);
      useDismissLayer(open, () => {
        onEscape();
        setOpen(false);
      });
      return null;
    }
    render(<Host />);
    escape();
    escape();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("leaves an Escape inside an IME composition alone", () => {
    const onEscape = vi.fn();
    render(<Layer name="only" onEscape={onEscape} />);
    fireEvent.keyDown(screen.getByLabelText("only field"), { key: "Escape", isComposing: true });
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("reads the handler live", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Layer name="only" onEscape={first} />);
    rerender(<Layer name="only" onEscape={second} />);
    escape();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("claims", () => {
  it("claimEscape: the key is the claimant's, and no layer is handed it", () => {
    const onEscape = vi.fn();
    render(
      <Layer name="dialog" onEscape={onEscape}>
        <input
          aria-label="draft"
          onKeyDown={(e) => {
            if (e.key === "Escape") claimEscape(e);
          }}
        />
      </Layer>,
    );
    const draft = screen.getByLabelText("draft");
    const event = new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      draft.dispatchEvent(event);
    });
    expect(onEscape).not.toHaveBeenCalled();
    // Prevented as well, for a handler further out that checks it.
    expect(event.defaultPrevented).toBe(true);
  });

  it("a bare preventDefault claims nothing", () => {
    const onEscape = vi.fn();
    render(
      <Layer name="dialog" onEscape={onEscape}>
        <input aria-label="search" onKeyDown={(e) => e.key === "Escape" && e.preventDefault()} />
      </Layer>,
    );
    escape(screen.getByLabelText("search"));
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("the owner's own handler claims with preventDefault, through runOwnKeyDown", () => {
    const onEscape = vi.fn();
    render(<Layer name="dialog" onEscape={onEscape} ownKeyDown={(e) => e.key === "Escape" && e.preventDefault()} />);
    escape(screen.getByLabelText("dialog field"));
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("the owner's handler hears Escape only while its own layer is on top (0.34.1, KS)", () => {
    // A tooltip over the dialog, focus on the dialog: the tooltip's press, and the
    // owner's handler — which would have claimed it — is not asked until the next one.
    const own = vi.fn();
    const dialog = vi.fn();
    const tooltip = vi.fn();
    function Tip({ onEscape }: { onEscape: () => void }) {
      useDismissLayer(true, onEscape);
      return null;
    }
    function Host() {
      // Opened after the dialog, as a tooltip is: layers opened in one commit stack
      // child first.
      const [tip, setTip] = useState(false);
      return (
        <Layer
          name="dialog"
          onEscape={dialog}
          ownKeyDown={(e) => {
            if (e.key !== "Escape") return;
            own();
            e.preventDefault();
          }}
        >
          <button type="button" onClick={() => setTip(true)}>
            show tip
          </button>
          {tip && (
            <Tip
              onEscape={() => {
                tooltip();
                setTip(false);
              }}
            />
          )}
        </Layer>
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "show tip" }));
    escape(screen.getByLabelText("dialog field"));
    expect(tooltip).toHaveBeenCalledTimes(1);
    expect(own).not.toHaveBeenCalled();

    escape(screen.getByLabelText("dialog field"));
    expect(own).toHaveBeenCalledTimes(1);
    // Its preventDefault is still the owner's claim.
    expect(dialog).not.toHaveBeenCalled();
  });

  it("a claim also holds the layers ABOVE a claimant that is not in them", () => {
    // A ChipInput clearing its draft while a tooltip shows elsewhere: the Escape was the
    // draft's, and nothing closes.
    const tooltip = vi.fn();
    function Tip() {
      useDismissLayer(true, tooltip);
      return null;
    }
    render(
      <>
        <input aria-label="draft" onKeyDown={(e) => e.key === "Escape" && claimEscape(e)} />
        <Tip />
      </>,
    );
    escape(screen.getByLabelText("draft"));
    expect(tooltip).not.toHaveBeenCalled();
  });
});

describe("useEscapeKey", () => {
  it("is a layer: only the topmost of two hears the key", () => {
    const first = vi.fn();
    const second = vi.fn();
    function A() {
      useEscapeKey(first);
      return null;
    }
    function B() {
      useEscapeKey(second);
      return null;
    }
    const { rerender } = render(<A />);
    rerender(
      <>
        <A />
        <B />
      </>,
    );
    escape();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("is off while not enabled", () => {
    const handler = vi.fn();
    function A() {
      useEscapeKey(handler, false);
      return null;
    }
    render(<A />);
    escape();
    expect(handler).not.toHaveBeenCalled();
  });
});
