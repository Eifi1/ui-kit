import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "../tooltip";
import { hasClippingAncestor } from "../../lib/clipping";

/**
 * kastlan (0.9 audit): every Tooltip inside a scroll container had to be given
 * `portal` by hand, and the ones that were not either widened the container
 * (keksdose dev#488's phantom scroll) or were clipped by it. With `portal` left out the
 * tooltip now finds a clipping ancestor itself. jsdom computes no Tailwind, so the
 * containers here say `overflow` inline.
 */
describe("Tooltip portals itself inside a clipping container", () => {
  it("keeps the in-place bubble outside any container", () => {
    render(
      <Tooltip label="Delete">
        <button type="button">x</button>
      </Tooltip>,
    );
    // Always mounted, next to the trigger — what a plain render test has always found.
    const bubble = screen.getByRole("tooltip");
    expect(bubble.parentElement).toBe(screen.getByRole("button").parentElement);
  });

  it("portals from mount when an ancestor scrolls — no bubble inside it to widen it", () => {
    render(
      <div data-testid="scroller" style={{ overflowX: "auto" }}>
        <Tooltip label="Delete">
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger.parentElement!);
    const bubble = screen.getByRole("tooltip");
    expect(screen.getByTestId("scroller")).not.toContainElement(bubble);
    expect(bubble.style.position).toBe("fixed");
    expect(trigger).toHaveAttribute("aria-describedby", bubble.id);
    fireEvent.mouseLeave(trigger.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("checks again on open, without remounting the trigger", () => {
    const { rerender } = render(
      <div data-testid="box">
        <Tooltip label="Delete">
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    const trigger = screen.getByRole("button");
    trigger.focus();
    // The container starts scrolling after the tooltip mounted (a table that grew).
    rerender(
      <div data-testid="box" style={{ overflowY: "auto" }}>
        <Tooltip label="Delete">
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByTestId("box")).not.toContainElement(screen.getByRole("tooltip"));
    // Same node, still focused: only the bubble moved.
    expect(screen.getByRole("button")).toBe(trigger);
    expect(trigger).toHaveFocus();
  });

  it("closes the portalled bubble on Escape", () => {
    render(
      <div style={{ overflow: "hidden" }}>
        <Tooltip label="Delete">
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("stays in place under `portal={false}`, even in a scroller", () => {
    render(
      <div data-testid="scroller" style={{ overflow: "auto" }}>
        <Tooltip label="Delete" portal={false}>
          <button type="button">x</button>
        </Tooltip>
      </div>,
    );
    expect(screen.getByTestId("scroller")).toContainElement(screen.getByRole("tooltip"));
  });

  it("keeps `portal` exactly as it was: nothing mounted until hovered", () => {
    render(
      <Tooltip label="Delete" portal>
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    expect(screen.getByRole("tooltip").parentElement).toBe(document.body);
  });
});

describe("hasClippingAncestor", () => {
  it("ignores body and html, whose overflow belongs to the viewport", () => {
    document.body.style.overflow = "hidden";
    const el = document.createElement("span");
    document.body.appendChild(el);
    try {
      expect(hasClippingAncestor(el)).toBe(false);
    } finally {
      el.remove();
      document.body.style.overflow = "";
    }
  });
});
