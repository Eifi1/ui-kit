import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Collapse, Disclosure } from "../disclosure";
import { TOPBAR_MENU_ITEM_CLASS } from "../../shell/topbar-controls";

/**
 * The disclosure both apps had hand-written (Lenkbank's `CollapsibleCard`, ten
 * importers; three separate copies in Keksdose). What these pin is the part a copy
 * drops first: the header says whether it is open and what it controls, a shut body
 * is unmounted (six of Lenkbank's bodies fetch), and the fold waits for its own
 * movement — and only when there is a movement to wait for.
 */

const header = () => screen.getByRole("button", { name: /Details/ });

describe("Disclosure", () => {
  it("starts shut, with the body unmounted and the header saying so", () => {
    render(
      <Disclosure title="Details" hint="What is inside">
        <p>Body</p>
      </Disclosure>,
    );
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body")).toBeNull();
    // aria-controls resolves to a real element even while shut: the fold is always
    // rendered, only its CHILDREN come and go.
    const controls = header().getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it("opens and shuts on click, and the shut fold is inert", () => {
    render(
      <Disclosure title="Details">
        <p>Body</p>
      </Disclosure>,
    );
    fireEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body")).toBeInTheDocument();
    const fold = document.getElementById(header().getAttribute("aria-controls")!)!;
    expect(fold).not.toHaveAttribute("inert");
    expect(fold.style.gridTemplateRows).toBe("1fr");

    // jsdom has no matchMedia, which reads as reduced motion: the body goes on the
    // same click that shut it.
    fireEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body")).toBeNull();
    expect(fold).toHaveAttribute("inert");
    expect(fold.style.gridTemplateRows).toBe("0fr");
    expect(fold.style.visibility).toBe("hidden");
  });

  it("honours defaultOpen", () => {
    render(
      <Disclosure title="Details" defaultOpen>
        <p>Body</p>
      </Disclosure>,
    );
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("is controlled when `open` is passed — the caller's state is the only state", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Disclosure title="Details" open={false} onOpenChange={onOpenChange}>
        <p>Body</p>
      </Disclosure>,
    );
    fireEvent.click(header());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Nothing happened yet: the caller has not said so.
    expect(header()).toHaveAttribute("aria-expanded", "false");
    rerender(
      <Disclosure title="Details" open onOpenChange={onOpenChange}>
        <p>Body</p>
      </Disclosure>,
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("serves a one-open-at-a-time set without an accordion component", () => {
    function Set() {
      const [open, setOpen] = useState<string | null>("a");
      return (
        <>
          {["a", "b"].map((k) => (
            <Disclosure key={k} title={`Details ${k}`} open={open === k} onOpenChange={(o) => setOpen(o ? k : null)}>
              <p>Body {k}</p>
            </Disclosure>
          ))}
        </>
      );
    }
    render(<Set />);
    fireEvent.click(screen.getByRole("button", { name: "Details b" }));
    expect(screen.queryByText("Body a")).toBeNull();
    expect(screen.getByText("Body b")).toBeInTheDocument();
  });

  it("wraps the header in a heading when asked", () => {
    render(
      <Disclosure title="Details" headingAs="h3">
        <p>Body</p>
      </Disclosure>,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Details" })).toContainElement(header());
  });

  it("keeps the body mounted when asked, still inert", () => {
    render(
      <Disclosure title="Details" keepMounted>
        <input aria-label="Draft" defaultValue="half-typed" />
      </Disclosure>,
    );
    const field = screen.getByLabelText("Draft");
    expect(field.closest("[inert]")).not.toBeNull();
  });

  it("asks for a token-coloured focus ring on its header, in both variants", () => {
    render(
      <>
        <Disclosure title="Details card">x</Disclosure>
        <Disclosure title="Details bare" variant="bare">
          x
        </Disclosure>
      </>,
    );
    for (const b of screen.getAllByRole("button")) {
      expect(b.className).toMatch(/focus-visible:ring-\[var\(--[a-z-]+\)\]/);
    }
  });
});

describe("Collapse, with motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("holds the children for the length of the fold, then unmounts them", () => {
    const { rerender } = render(
      <Collapse open>
        <p>Body</p>
      </Collapse>,
    );
    rerender(
      <Collapse open={false}>
        <p>Body</p>
      </Collapse>,
    );
    // Still there, the track already heading for 0fr: the children have to survive
    // the movement that hides them.
    expect(screen.getByText("Body")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText("Body")).toBeNull();
  });

  it("re-opening mid-fold keeps the children", () => {
    const view = (open: boolean) => (
      <Collapse open={open}>
        <p>Body</p>
      </Collapse>
    );
    const { rerender } = render(view(true));
    rerender(view(false));
    act(() => void vi.advanceTimersByTime(100));
    rerender(view(true));
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("trigger-only: aria-controls points at the caller's element and no body is rendered", () => {
    function TableWithHiddenRows() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Disclosure variant="bare" title="Details: 3 hidden" controls="hidden-rows" open={open} onOpenChange={setOpen} />
          <table>
            <tbody id="hidden-rows">{open && <tr><td>Old savings</td></tr>}</tbody>
          </table>
        </>
      );
    }
    const { container } = render(<TableWithHiddenRows />);
    expect(header()).toHaveAttribute("aria-controls", "hidden-rows");
    expect(container.querySelector("[inert]")).toBeNull();
    fireEvent.click(header());
    expect(header()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Old savings")).toBeInTheDocument();
  });

  it("trigger-only card keeps its lower corners round when open", () => {
    render(<Disclosure title="Details" controls="elsewhere" open />);
    expect(header().className).not.toContain("rounded-b-none");
  });

  it("puts `trailing` beside the header button, not inside it, and it takes its own clicks", () => {
    const onAction = vi.fn();
    render(
      <Disclosure
        title="Details"
        headingAs="h3"
        trailing={
          <button type="button" onClick={onAction}>
            Edit
          </button>
        }
      >
        <p>Body</p>
      </Disclosure>,
    );
    const edit = screen.getByRole("button", { name: "Edit" });
    expect(header()).not.toContainElement(edit);
    expect(screen.getByRole("heading", { level: 3 })).not.toContainElement(edit);
    expect(header()).toHaveAccessibleName("Details");
    fireEvent.click(edit);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(header()).toHaveAttribute("aria-expanded", "false");
    // The header is stretched over the row, and the ring moves with it.
    expect(header().className).toContain("after:absolute");
    expect(header().className).toMatch(/focus-visible:after:ring-\[var\(--[a-z-]+\)\]/);
    fireEvent.click(header());
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("Disclosure triggerProps", () => {
  it("puts aria-label, id and data-* on the header button, not the wrapper", () => {
    const { container } = render(
      <Disclosure
        title="Food"
        triggerProps={{ "aria-label": "Expand group Food", id: "g-food", "data-testid": "food-toggle" }}
      >
        <p>Body</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Expand group Food" });
    expect(button).toHaveAttribute("id", "g-food");
    expect(button).toBe(screen.getByTestId("food-toggle"));
    expect(container.firstElementChild).not.toHaveAttribute("id");
  });

  it("as a function of open, renames the toggle when it turns", () => {
    render(
      <Disclosure title="Food" triggerProps={(open) => ({ "aria-label": `${open ? "Collapse" : "Expand"} group Food` })}>
        <p>Body</p>
      </Disclosure>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Expand group Food" }));
    expect(screen.getByRole("button", { name: "Collapse group Food" })).toHaveAttribute("aria-expanded", "true");
  });

  it("cannot take over what the disclosure owns", () => {
    const onOpenChange = vi.fn();
    render(
      <Disclosure
        title="Details"
        controls="rows"
        onOpenChange={onOpenChange}
        // Not in the type; a caller casting past it still cannot break the wiring.
        triggerProps={{ "aria-expanded": true, "aria-controls": "elsewhere", type: "submit" } as never}
      />,
    );
    const button = header();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "rows");
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("Disclosure variant=menu", () => {
  it("wears the top-bar menu row's classes, with an inset ring and nothing of bare's", () => {
    render(
      <Disclosure variant="menu" title="Language">
        <p>body</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Language" });
    const classes = button.className.split(/\s+/);
    for (const cls of TOPBAR_MENU_ITEM_CLASS.split(/\s+/)) expect(classes).toContain(cls);
    expect(classes).toContain("focus-visible:ring-inset");
    expect(classes).not.toContain("font-medium");
    expect(classes).not.toContain("rounded-sm");
    expect(classes).not.toContain("hover:text-[var(--text-primary)]");
    expect(classes).not.toContain("gap-2");
  });

  it("puts the chevron at the end by default, and still honours chevronPosition", () => {
    const { rerender } = render(<Disclosure variant="menu" title="Language" />);
    const button = screen.getByRole("button", { name: "Language" });
    expect(button.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    rerender(<Disclosure variant="menu" chevronPosition="start" title="Language" />);
    expect(screen.getByRole("button", { name: "Language" }).firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });

  it("gives the body no padding or spacing of its own", () => {
    render(
      <Disclosure variant="menu" title="Language" defaultOpen>
        <p>Deutsch</p>
      </Disclosure>,
    );
    const body = screen.getByText("Deutsch").parentElement!;
    expect(body.className).not.toMatch(/\bpt-2\b|\bspace-y-2\b/);
  });

  it("leaves bare's chevron at the start by default", () => {
    render(<Disclosure variant="bare" title="More" />);
    expect(screen.getByRole("button", { name: "More" }).firstElementChild?.tagName.toLowerCase()).toBe("svg");
  });
});
