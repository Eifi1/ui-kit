import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { returnFocus } from "../focus-left";

/**
 * The kit's one focus-restore rule (0.52 code review 2026-10-31, held to 0.55): the trap,
 * the popovers and menus, the drawers, the phone sheets, the tour, AlertBanner's × and
 * the Treemap read it. Here the rule on its own; each overlay's case is in its own suite
 * (focus-return-rule.test.tsx, use-focus-trap.test.tsx).
 */
function Page() {
  return (
    <>
      <button type="button">Opener</button>
      <button type="button" disabled>
        Disabled
      </button>
      <button type="button">Fallback</button>
      <div data-testid="panel">
        <button type="button">Inside</button>
      </div>
      <input aria-label="Elsewhere" />
      <svg>
        <g data-testid="tile" tabIndex={-1} />
      </svg>
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("returnFocus", () => {
  it("gives a lost focus to the opener", () => {
    render(<Page />);
    expect(document.activeElement).toBe(document.body);
    expect(returnFocus({ opener: button("Opener"), fallback: [button("Fallback")] })).toBe(true);
    expect(button("Opener")).toHaveFocus();
  });

  it("gives it to the first fallback that takes it when the opener has left or refuses it", () => {
    render(<Page />);
    const gone = document.createElement("button");
    expect(returnFocus({ opener: gone, fallback: [button("Disabled"), button("Fallback")] })).toBe(true);
    expect(button("Fallback")).toHaveFocus();

    button("Fallback").blur();
    expect(returnFocus({ opener: button("Disabled"), fallback: [null, undefined, button("Opener")] })).toBe(true);
    expect(button("Opener")).toHaveFocus();
  });

  it("treats a focus on a removed node as lost", () => {
    render(<Page />);
    const leaving = document.createElement("button");
    document.body.append(leaving);
    leaving.focus();
    leaving.remove();
    expect(returnFocus({ opener: button("Opener") })).toBe(true);
    expect(button("Opener")).toHaveFocus();
  });

  it("leaves a focus that went somewhere real, the user's or the app's", () => {
    render(<Page />);
    const elsewhere = screen.getByRole("textbox", { name: "Elsewhere" });
    elsewhere.focus();
    expect(returnFocus({ opener: button("Opener") })).toBe(false);
    expect(elsewhere).toHaveFocus();
  });

  it("moves a focus still inside what is closing", () => {
    render(<Page />);
    button("Inside").focus();
    expect(returnFocus({ opener: button("Opener"), closing: screen.getByTestId("panel") })).toBe(true);
    expect(button("Opener")).toHaveFocus();
  });

  it("never sends the focus to <body>, and blurs nothing when no one can take it", () => {
    render(<Page />);
    const gone = document.createElement("button");
    expect(returnFocus({ opener: document.body, fallback: [gone, document.documentElement] })).toBe(false);
    expect(document.activeElement).toBe(document.body);

    button("Inside").focus();
    expect(returnFocus({ opener: gone, closing: screen.getByTestId("panel") })).toBe(false);
    // Not blurred to <body> by the rule: the panel's own removal is what drops it.
    expect(button("Inside")).toHaveFocus();
  });

  it("takes an SVG element — a chart's tile — as a place to give it", () => {
    render(<Page />);
    expect(returnFocus({ fallback: [screen.getByTestId("tile")] })).toBe(true);
    expect(screen.getByTestId("tile")).toHaveFocus();
  });
});
