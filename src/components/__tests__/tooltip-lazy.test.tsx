import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "../tooltip";

/**
 * keksdose F6: about seven sites outside any clipping container pinned `portal` only
 * because the always-mounted in-place bubble showed up in `getAllByRole("tooltip")`,
 * in an ancestor's `textContent` and in an ancestor's accessible name. `lazy` keeps the
 * bubble in place but mounts it only while it is up — these tests pin each of the
 * three leaks shut, and the three things the bubble must keep doing: describe its
 * trigger, close on Escape, and sit next to the trigger rather than on `<body>`.
 */

function pressEscape() {
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
}

describe("Tooltip lazy", () => {
  it("is not in the DOM until hovered, and leaves the trigger undescribed meanwhile", () => {
    render(
      <Tooltip label="Sort by date" lazy>
        <button type="button">Date</button>
      </Tooltip>,
    );
    expect(screen.queryAllByRole("tooltip", { hidden: true })).toHaveLength(0);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });

  it("keeps an ancestor's textContent and accessible name to the trigger's own", () => {
    // The shape F6 names: a toast / FlagBadge whose tooltip'd icon sits inside a button.
    render(
      <button type="button" data-testid="outer">
        Undo
        <Tooltip label="Reverts the last booking" lazy>
          <span>↶</span>
        </Tooltip>
      </button>,
    );
    const outer = screen.getByTestId("outer");
    expect(outer.textContent).toBe("Undo↶");
    expect(outer).toHaveAccessibleName("Undo↶");
  });

  it("is the default's contrast: without `lazy` the bubble leaks into both", () => {
    // Pins what `lazy` is FOR, so a later change to the default shows up here too.
    render(
      <button type="button" data-testid="outer">
        Undo
        <Tooltip label="Reverts the last booking">
          <span>↶</span>
        </Tooltip>
      </button>,
    );
    expect(screen.getByTestId("outer").textContent).toContain("Reverts the last booking");
  });

  it("mounts in place on hover and describes the trigger", () => {
    const { container } = render(
      <Tooltip label="Sort by date" lazy>
        <button type="button">Date</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button");
    fireEvent.mouseEnter(trigger.parentElement!);
    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveTextContent("Sort by date");
    // In place: a sibling of the trigger inside the wrapper, not a node on <body>.
    expect(container.contains(bubble)).toBe(true);
    expect(bubble.parentElement).toBe(trigger.parentElement);
    expect(bubble.className).toContain("absolute");
    expect(trigger).toHaveAttribute("aria-describedby", bubble.id);
    expect(trigger).toHaveAccessibleDescription("Sort by date");

    fireEvent.mouseLeave(trigger.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("mounts on focus, so a keyboard user's trigger is described", () => {
    render(
      <Tooltip label="Switch direction" lazy>
        <button type="button">⇄</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button");
    act(() => trigger.focus());
    expect(trigger).toHaveAccessibleDescription("Switch direction");
    act(() => trigger.blur());
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("appends to a description the caller already had", () => {
    render(
      <>
        <span id="fx-note">Estimated</span>
        <Tooltip label="At today's rate" lazy>
          <button type="button" aria-describedby="fx-note">
            12.00 EUR
          </button>
        </Tooltip>
      </>,
    );
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-describedby", "fx-note");
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(trigger).toHaveAccessibleDescription("Estimated At today's rate");
  });

  it("unmounts on Escape, and comes back on the next hover", () => {
    render(
      <Tooltip label="Sort by date" lazy>
        <button type="button">Date</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole("button").parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    pressEscape();
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Sort by date");
  });

  it("still redacts", () => {
    render(
      <Tooltip label="Jane Doe" lazy redact>
        <span>J.</span>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByText("J.").parentElement!);
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-private");
  });

  it("changes nothing for an explicit portal", () => {
    const { container } = render(
      <Tooltip label="Sort by date" lazy portal>
        <button type="button">Date</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    const bubble = screen.getByRole("tooltip");
    expect(container.contains(bubble)).toBe(false);
    expect(bubble.style.position).toBe("fixed");
  });

  it("still auto-portals inside a clipping container", () => {
    const { container } = render(
      <div data-clips>
        <Tooltip label="Sort by date" lazy>
          <button type="button">Date</button>
        </Tooltip>
      </div>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    const bubble = screen.getByRole("tooltip");
    expect(container.contains(bubble)).toBe(false);
    expect(bubble.style.position).toBe("fixed");
  });
});
