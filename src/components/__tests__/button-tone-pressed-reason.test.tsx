import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button, IconButton } from "../ui";

describe("Button tone (keksdose's quiet links)", () => {
  it("draws a muted link in secondary text that darkens on hover", () => {
    render(
      <Button variant="link" tone="muted">
        Mark undone
      </Button>,
    );
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-[var(--text-secondary)]");
    expect(cls).toContain("hover:text-[var(--text-primary)]");
    expect(cls).not.toContain("text-[var(--brand)]");
  });

  it("turns a danger link red only on hover", () => {
    render(
      <Button variant="link" tone="danger">
        Remove split
      </Button>,
    );
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-[var(--text-secondary)]");
    expect(cls).toContain("hover:text-[var(--danger)]");
  });

  it("ignores a tone on a boxed variant", () => {
    render(<Button tone="muted">Save</Button>);
    expect(screen.getByRole("button").className).not.toContain("text-[var(--text-secondary)]");
  });
});

describe("Button pressed (lenkbank's All speeds toggle)", () => {
  it("is an ordinary button when left out", () => {
    render(<Button variant="link">All speeds</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("says off, and looks quiet, when false", () => {
    render(
      <Button variant="link" tone="muted" pressed={false}>
        All speeds
      </Button>,
    );
    const button = screen.getByRole("button", { pressed: false });
    expect(button.className).toContain("text-[var(--text-secondary)]");
  });

  it("says on, and wears the brand, when true — over the muted tone", () => {
    render(
      <Button variant="link" tone="muted" pressed>
        All speeds
      </Button>,
    );
    const button = screen.getByRole("button", { pressed: true });
    expect(button.className).toContain("text-[var(--brand)]");
    expect(button.className).toContain("font-medium");
    expect(button.className).not.toContain("text-[var(--text-secondary)]");
  });

  it("gives a boxed variant the quiet brand fill", () => {
    render(
      <Button variant="secondary" pressed>
        Bold
      </Button>,
    );
    expect(screen.getByRole("button", { pressed: true }).className).toContain("bg-[var(--brand-bg)]");
  });
});

describe("Button disabledReason (DangerConfirm's lockedReason, for any button)", () => {
  it("stays focusable, refuses the click and says why", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled disabledReason="The handover is signed.">
        Edit
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Edit" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("The handover is signed.");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not submit its form", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabledReason="Read-only demo">
          Save
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the reason in the kit tooltip, without describing the button twice", () => {
    render(
      <Button aria-describedby="own" disabledReason="Read-only demo">
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Read-only demo");
    const ids = button.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("own");
    expect(ids).toHaveLength(2);
  });

  it("is an ordinary button with an empty reason", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabledReason="">
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("aria-disabled");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

describe("IconButton label", () => {
  it("names the button and shows the same text as a kit tooltip", () => {
    render(
      <IconButton label="Delete">
        <svg />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
    // Visual only: the name is not repeated as the description.
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(button).not.toHaveAttribute("title");
  });

  it("lets an explicit aria-label win", () => {
    render(
      <IconButton label="Delete" aria-label="Delete the segment">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete the segment" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
  });

  it("opts out of the tooltip with tooltip={false}", () => {
    render(
      <IconButton label="Close" tooltip={false}>
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("passes tooltipPortal and tooltipSide through", () => {
    render(
      <IconButton label="Copy" tooltipPortal tooltipSide="bottom">
        <svg />
      </IconButton>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    expect(screen.getByRole("tooltip").parentElement).toBe(document.body);
  });

  it("renders the bare button without a label, as before", () => {
    const { container } = render(
      <IconButton aria-label="Edit">
        <svg />
      </IconButton>,
    );
    expect(container.firstElementChild?.tagName).toBe("BUTTON");
  });
});
