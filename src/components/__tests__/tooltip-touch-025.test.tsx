import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip, type TooltipTap } from "../tooltip";
import { IconButton } from "../ui";

/**
 * keksdose run 72, live #379: on a phone a tap on any Tooltip-wrapped IconButton — the
 * top-bar icons, the sync indicator, a row's actions — left its bubble up until the next
 * tap somewhere else. A tap fires an emulated `mouseenter` and focuses the button, and the
 * tooltip showed on both and hid only on `mouseleave` / `blur`. These pin the new rules:
 * a tap that activates something shows nothing, the keyboard still does, a desktop hover
 * is unchanged, and a tap that activates nothing (a disabled control, plain text) toggles
 * the bubble as its only answer.
 *
 * The tap is replayed in Chromium's order: pointer events first, then the compatibility
 * mouse events, focus at their `mousedown`.
 */

function tap(el: HTMLElement) {
  fireEvent.pointerEnter(el, { pointerType: "touch", buttons: 1 });
  fireEvent.pointerDown(el, { pointerType: "touch", buttons: 1 });
  fireEvent.pointerUp(el, { pointerType: "touch" });
  fireEvent.mouseEnter(el);
  fireEvent.mouseDown(el);
  if (el.matches("button:not(:disabled), input, a[href], [tabindex]")) act(() => el.focus());
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

/** A desktop click: the pointer arrives (hover), presses, focuses, releases. */
function mouseClick(el: HTMLElement) {
  fireEvent.pointerEnter(el, { pointerType: "mouse", buttons: 0 });
  fireEvent.mouseEnter(el);
  fireEvent.pointerDown(el, { pointerType: "mouse", buttons: 1 });
  fireEvent.mouseDown(el);
  act(() => el.focus());
  fireEvent.pointerUp(el, { pointerType: "mouse" });
  fireEvent.mouseUp(el);
  fireEvent.click(el);
}

/** A key press somewhere, which is what tells the page the keyboard is in use again. */
function pressTab() {
  fireEvent.keyDown(document.body, { key: "Tab" });
}

afterEach(() => {
  // The input note is the page's, so one test's tap must not leak into the next.
  pressTab();
  vi.restoreAllMocks();
});

describe("Tooltip — a tap leaves no bubble behind (live #379)", () => {
  it("IconButton (lazy label): a tap mounts no bubble; Tab to it does", () => {
    render(
      <>
        <IconButton label="Synced at 03:05 PM — Tap to sync now" onClick={() => {}}>
          <span>↻</span>
        </IconButton>
        <button type="button">Next</button>
      </>,
    );
    const button = screen.getByRole("button", { name: /Synced at/ });
    tap(button);
    expect(button).toHaveFocus();
    expect(screen.queryByRole("tooltip")).toBeNull();

    // Focus leaves and comes back by keyboard: the bubble is the keyboard's again.
    act(() => screen.getByRole("button", { name: "Next" }).focus());
    pressTab();
    act(() => button.focus());
    expect(screen.getByRole("tooltip")).toHaveTextContent("Synced at 03:05 PM — Tap to sync now");
  });

  it.each([
    ["in place", {}],
    ["lazy", { lazy: true }],
    ["portal", { portal: true }],
  ] as const)("%s: no bubble after a tap on a button", (_, props) => {
    render(
      <Tooltip label="Delete row" {...props}>
        <button type="button">x</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    tap(button);
    const bubble = screen.queryByRole("tooltip");
    // The always-mounted bubble is still there to describe the button — closed.
    if (bubble) expect(bubble.className.split(" ")).toContain("hidden");
    else expect(bubble).toBeNull();
  });

  it("a focus RETURNED by script after a tap (a closing dialog) shows nothing", () => {
    render(
      <>
        <Tooltip label="Settings" lazy>
          <button type="button">⚙</button>
        </Tooltip>
        <button type="button">Close dialog</button>
      </>,
    );
    const icon = screen.getByRole("button", { name: "⚙" });
    tap(screen.getByRole("button", { name: "Close dialog" }));
    act(() => icon.focus());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("the tap closes a bubble the keyboard had put up", () => {
    render(
      <Tooltip label="Archive" lazy>
        <button type="button">A</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    pressTab();
    act(() => button.focus());
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(button, { pointerType: "touch", buttons: 1 });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a pen press counts as a tap; a hovering pen still hovers", () => {
    render(
      <Tooltip label="Pin" lazy>
        <button type="button">P</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    fireEvent.pointerEnter(button, { pointerType: "pen", buttons: 0 });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(button, { pointerType: "pen", buttons: 1 });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a mouse after a tap (a hybrid laptop) hovers as ever", () => {
    render(
      <Tooltip label="Export" lazy>
        <button type="button">E</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    tap(button);
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(button, { pointerType: "mouse", buttons: 0 });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Export");
  });

  it("calls a caller's own pointer handlers too", () => {
    const onPointerDown = vi.fn();
    render(
      <Tooltip label="Hint" onPointerDown={onPointerDown}>
        <button type="button">h</button>
      </Tooltip>,
    );
    fireEvent.pointerDown(screen.getByRole("button"), { pointerType: "touch" });
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });
});

describe("Tooltip — mouse and keyboard", () => {
  it("in place: the closed bubble is display:none (the `hidden` class), the open one is shown", () => {
    render(
      <Tooltip label="Copy">
        <button type="button">c</button>
      </Tooltip>,
    );
    const bubble = screen.getByRole("tooltip");
    expect(bubble.className.split(" ")).toContain("hidden");
    fireEvent.mouseEnter(screen.getByRole("button"));
    expect(bubble.className.split(" ")).not.toContain("hidden");
    expect(bubble.className.split(" ")).toContain("opacity-100");
    fireEvent.mouseLeave(screen.getByRole("button"));
    expect(bubble.className.split(" ")).toContain("hidden");
  });

  it("a desktop click on a button does not hold the bubble once the pointer leaves", () => {
    // jsdom guesses `:focus-visible` from the file's event history; Chromium says false
    // for a clicked button, which is what this stands in for.
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" ? false : matches.call(this, selector);
    });
    render(
      <Tooltip label="Refresh">
        <button type="button">r</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    mouseClick(button);
    const bubble = screen.getByRole("tooltip");
    // Still hovered: up.
    expect(bubble.className.split(" ")).not.toContain("hidden");
    fireEvent.mouseLeave(button);
    expect(button).toHaveFocus();
    expect(bubble.className.split(" ")).toContain("hidden");
  });

  it("a text field clicked with the mouse keeps its bubble while focused (`:focus-visible`)", () => {
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" ? this.tagName === "INPUT" : matches.call(this, selector);
    });
    render(
      <Tooltip label="IBAN without spaces" lazy>
        <input aria-label="IBAN" />
      </Tooltip>,
    );
    const input = screen.getByRole("textbox");
    mouseClick(input);
    fireEvent.mouseLeave(input);
    expect(screen.getByRole("tooltip")).toHaveTextContent("IBAN without spaces");
  });

  it("a keyboard user's portalled bubble survives a mouse passing over", () => {
    render(
      <Tooltip label="Delete" portal>
        <button type="button">d</button>
      </Tooltip>,
    );
    const button = screen.getByRole("button");
    pressTab();
    act(() => button.focus());
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
    act(() => button.blur());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a press anywhere else closes an open bubble", () => {
    render(
      <>
        <Tooltip label="Rename" lazy>
          <button type="button">n</button>
        </Tooltip>
        <p>Elsewhere</p>
      </>,
    );
    pressTab();
    act(() => screen.getByRole("button").focus());
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Elsewhere"), { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("Tooltip — a tap that activates nothing toggles the bubble (`tap`)", () => {
  function setup(child: React.ReactNode, tapMode?: TooltipTap) {
    render(
      <>
        <Tooltip label="Read-only demo — saving is disabled." tap={tapMode} lazy>
          {child}
        </Tooltip>
        <p>Elsewhere</p>
      </>,
    );
  }

  it("aria-disabled (a write lock): first tap shows the reason, second hides it", () => {
    setup(
      <button type="button" aria-disabled="true">
        Save
      </button>,
    );
    const button = screen.getByRole("button");
    tap(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Read-only demo");
    tap(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("natively disabled: the tap shows it, a tap elsewhere hides it", () => {
    setup(
      <button type="button" disabled>
        Sync
      </button>,
    );
    tap(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Elsewhere"), { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("plain text (a truncated name, a badge): the tap shows it; Escape hides it", () => {
    setup(<span>Example Ltd</span>);
    tap(screen.getByText("Example Ltd"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("plain text inside a clickable DataTable row (`tr[tabindex]`) is the row: nothing", () => {
    render(
      <table>
        <tbody>
          <tr tabIndex={-1}>
            <td>
              <Tooltip label="Example Ltd, 000 Sample Street" lazy>
                <span>Example Ltd</span>
              </Tooltip>
            </td>
          </tr>
        </tbody>
      </table>,
    );
    tap(screen.getByText("Example Ltd"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a display-only grid cell (a CalendarHeatmap day, roving tabindex) shows its value on a tap", () => {
    render(
      <div role="grid" aria-label="Activity">
        <div role="row">
          {["2026-09-30", "2026-10-01"].map((iso, i) => (
            <Tooltip key={iso} label={`${iso}: 3 bookings`} portal role="none">
              <div role="gridcell" tabIndex={i === 0 ? 0 : -1} aria-label={iso} data-testid={iso} />
            </Tooltip>
          ))}
        </div>
      </div>,
    );
    // Both the cell that holds the roving tab stop and the one that does not.
    tap(screen.getByTestId("2026-09-30"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("2026-09-30: 3 bookings");
    tap(screen.getByTestId("2026-10-01"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("2026-10-01: 3 bookings");
  });

  it("a glyph inside a button is the button: nothing", () => {
    render(
      <button type="button">
        Undo
        <Tooltip label="Reverts the last booking" lazy>
          <span>↶</span>
        </Tooltip>
      </button>,
    );
    tap(screen.getByText("↶"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a scroll that starts on the trigger (pointercancel) is not a tap", () => {
    setup(<span>Example Ltd</span>);
    const text = screen.getByText("Example Ltd");
    fireEvent.pointerDown(text, { pointerType: "touch", buttons: 1 });
    fireEvent.pointerCancel(text, { pointerType: "touch" });
    fireEvent.pointerUp(text, { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it('tap="toggle": an enabled "?" whose click does nothing shows its explanation', () => {
    setup(
      <button type="button" aria-label="What is this?">
        ?
      </button>,
      "toggle",
    );
    tap(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it('tap="ignore": plain text shows nothing on a tap', () => {
    setup(<span>Example Ltd</span>, "ignore");
    tap(screen.getByText("Example Ltd"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
