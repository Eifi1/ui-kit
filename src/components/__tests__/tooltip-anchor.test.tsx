import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { Check, Plus } from "lucide-react";
import { Tooltip } from "../tooltip";
import { IconButton } from "../icon-button";
import { Button } from "../button";
import { applyTextSize } from "../../theme/text-size";

/**
 * 0.58: the box round a tooltip's trigger. The wrapper is `span.relative.inline-flex`:
 *
 * - a block child inside a Tooltip started no line — keksdose's /prices cells read
 *   "CHF 1.95/lPaid this week" (dev #649) until each wrapped its Tooltip in a block span
 *   of its own (`text-xs text-muted` on it): `block` is that span, `className` on it;
 * - an IconButton's `className` lands on the `<button>` inside the wrapper, so a margin
 *   or `align-top` never reached the box the line sees — keksdose's band "+"
 *   (band-add-button.tsx) wrapped every IconButton in a span of its own:
 *   `wrapperClassName` is that box's classes, on IconButton and Button alike.
 *
 * Without the new props, `className` stays where it was on all three; nothing here moves
 * an app's styling.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
});

const wrapperOf = (el: HTMLElement) => el.parentElement!;

describe("Tooltip block (keksdose dev #649)", () => {
  it("puts the wrapper on a line of its own, the wrapper still hugging its child", () => {
    render(
      <p>
        <span>CHF 1.95/l</span>
        <Tooltip block label="2026-W44" className="text-xs text-muted" data-tour="paid">
          <span>Paid this week</span>
        </Tooltip>
      </p>,
    );
    const words = screen.getByText("Paid this week");
    const wrapper = wrapperOf(words);
    // The wrapper as without `block`: inline-flex, so the bubble stands over the words —
    // and the trigger, so the caller's attributes are its.
    expect(wrapper).toHaveClass("relative", "inline-flex");
    expect(wrapper).toHaveAttribute("data-tour", "paid");
    expect(wrapper).not.toHaveClass("text-xs");
    // …inside a block line, the box the layout sees, which takes the caller's classes:
    // the type sets the line's own height there.
    const line = wrapper.parentElement!;
    expect(line.tagName).toBe("SPAN");
    expect(line.className).toBe("block text-xs text-muted");
    expect(line.parentElement!.tagName).toBe("P");
  });

  it("keeps the line, and its classes, with a portalled bubble and with no label at all", () => {
    const { rerender } = render(
      <Tooltip block portal label="2026-W44" className="mt-1">
        <span>Paid this week</span>
      </Tooltip>,
    );
    expect(wrapperOf(screen.getByText("Paid this week")).parentElement!.className).toBe("block mt-1");
    // No label, no wrapper — but the line is layout, and stays.
    rerender(
      <Tooltip block label="" className="mt-1">
        <span>Paid this week</span>
      </Tooltip>,
    );
    expect(wrapperOf(screen.getByText("Paid this week")).className).toBe("block mt-1");
  });

  it("changes nothing without block", () => {
    const { container } = render(
      <Tooltip label="2026-W44">
        <span>Paid this week</span>
      </Tooltip>,
    );
    expect(container.firstElementChild).toHaveClass("relative", "inline-flex");
    expect(container.querySelector(".block")).toBeNull();
  });
});

describe("IconButton wrapperClassName", () => {
  it("goes on the label tooltip's wrapper; className stays on the button", () => {
    render(
      <IconButton label="Add" className="text-brand" wrapperClassName="-my-1 align-top">
        <Plus />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Add" });
    expect(button).toHaveClass("text-brand");
    expect(button).not.toHaveClass("align-top");
    expect(wrapperOf(button)).toHaveClass("relative", "inline-flex", "-my-1", "align-top");
  });

  it("goes on the button itself when nothing wraps it — no tooltip, or the label as text at Large", () => {
    const { rerender } = render(
      <IconButton label="Add" tooltip={false} wrapperClassName="align-top">
        <Plus />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Add" })).toHaveClass("align-top");
    act(() => applyTextSize("large"));
    rerender(
      <IconButton label="Add" wrapperClassName="align-top">
        <Plus />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Add" });
    // The label is drawn as text, so there is no tooltip and no wrapper.
    expect(button.querySelector('[data-slot="icon-button-label"]')).not.toBeNull();
    expect(button).toHaveClass("align-top");
  });

  it("goes on the badge's box when that is the outermost", () => {
    render(
      <IconButton aria-label="Synced" badge={<Check />} wrapperClassName="ms-auto">
        <Plus />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Synced" });
    expect(button).not.toHaveClass("ms-auto");
    expect(wrapperOf(button)).toHaveClass("ms-auto");
    expect(wrapperOf(button).querySelector('[data-slot="icon-button-badge"]')).not.toBeNull();
  });

  it("goes on the reason's frame while a reason shows", () => {
    render(
      <IconButton label="Delete" disabledReason="Has bookings" wrapperClassName="ms-auto">
        <Plus />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toHaveClass("ms-auto");
    expect(wrapperOf(button)).toHaveClass("ms-auto");
  });

  it("does the same on the link form", () => {
    render(
      <MemoryRouter>
        <IconButton href="/new" label="New" wrapperClassName="align-top">
          <Plus />
        </IconButton>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "New" });
    expect(link).not.toHaveClass("align-top");
    expect(wrapperOf(link)).toHaveClass("relative", "inline-flex", "align-top");
  });
});

describe("Button wrapperClassName", () => {
  it("goes on the button when nothing frames it", () => {
    render(
      <Button className="font-bold" wrapperClassName="ms-auto">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("font-bold", "ms-auto");
  });

  it("goes on the reason's frame while a reason shows, so a lock does not reflow the row", () => {
    render(
      <Button className="font-bold" disabledReason="Read-only budget" wrapperClassName="ms-auto">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("font-bold");
    expect(button).not.toHaveClass("ms-auto");
    expect(wrapperOf(button)).toHaveClass("ms-auto");
  });

  it("is the link's own on the link form", () => {
    render(
      <Button href="https://example.org" external wrapperClassName="ms-auto">
        Docs
      </Button>,
    );
    expect(screen.getByRole("link", { name: /Docs/ })).toHaveClass("ms-auto");
  });
});
