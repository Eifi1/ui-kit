import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Disclosure } from "../disclosure";

/**
 * The 0.9 audit's three Disclosure asks: lenkbank's result rows (the whole row, figure
 * included, one button with the figure in its name, and the chevron right after the
 * label), keksdose's budget-mobile-list (`controls` as an IDREF list, possibly empty),
 * and keksdose's "Upcoming" leading row (trigger-only over a table's rows).
 */
describe("Disclosure trailingInTrigger", () => {
  it("puts the trailing figure inside the button and its name", () => {
    const onOpenChange = vi.fn();
    render(
      <Disclosure
        variant="bare"
        title="Net profit"
        trailing={<span>1,234.50</span>}
        trailingInTrigger
        onOpenChange={onOpenChange}
      >
        <p>formula</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Net profit 1,234.50" });
    // The figure is the button's own content, so a click on it is a click on the row.
    fireEvent.click(screen.getByText("1,234.50"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("aria-expanded", "true");
    // No stretched overlay: nothing sits beside the button.
    expect(button.className).not.toContain("after:absolute");
    expect(button.parentElement!.className).not.toContain("relative flex");
  });

  it("keeps trailing a sibling by default", () => {
    render(
      <Disclosure title="Details" trailing={<button type="button">Edit</button>}>
        <p>body</p>
      </Disclosure>,
    );
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("puts a card's chevron after the in-trigger trailing, inside the button", () => {
    render(
      <Disclosure title="Details" trailing={<span>3</span>} trailingInTrigger>
        <p>body</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Details 3" });
    const last = button.lastElementChild!;
    expect(last.tagName.toLowerCase()).toBe("svg");
  });
});

describe("Disclosure chevronPosition after-title", () => {
  it("draws the chevron right after the title text, not leading and not at the end", () => {
    render(
      <Disclosure
        variant="bare"
        chevronPosition="after-title"
        title="Net profit"
        trailing={<span>1,234.50</span>}
        trailingInTrigger
      >
        <p>formula</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: /Net profit/ });
    const title = screen.getByText("Net profit");
    // The title's next sibling is the chevron; the button's first child is not one.
    expect(title.nextElementSibling?.tagName.toLowerCase()).toBe("svg");
    expect(button.firstElementChild!.tagName.toLowerCase()).not.toBe("svg");
    expect(button.querySelectorAll("svg")).toHaveLength(1);
    // Turns over like the end chevron (down → up), not the leading one's quarter turn.
    const chevron = title.nextElementSibling!;
    expect(chevron.getAttribute("class")).not.toContain("-rotate-90");
    fireEvent.click(button);
    expect(chevron.getAttribute("class")).toContain("rotate-180");
  });

  it("leaves start the leading chevron", () => {
    render(
      <Disclosure variant="bare" chevronPosition="start" title="More">
        <p>body</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "More" });
    expect(button.firstElementChild!.tagName.toLowerCase()).toBe("svg");
  });
});

describe("Disclosure controls", () => {
  it("takes a space-separated IDREF list", () => {
    render(<Disclosure variant="bare" title="Food" open onOpenChange={() => {}} controls="row-1 row-2" />);
    expect(screen.getByRole("button", { name: "Food" })).toHaveAttribute("aria-controls", "row-1 row-2");
  });

  it("with an empty string, is trigger-only with no aria-controls, and still toggles", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Disclosure variant="bare" title="Upcoming" open={false} onOpenChange={onOpenChange} controls="">
        <p>not rendered</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Upcoming" });
    expect(button).not.toHaveAttribute("aria-controls");
    expect(screen.queryByText("not rendered")).toBeNull();
    // No Collapse of its own.
    expect(container.querySelectorAll("[inert]")).toHaveLength(0);
    fireEvent.click(button);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
