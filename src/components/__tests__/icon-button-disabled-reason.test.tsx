import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";
import { IconButton } from "../ui";

/** keksdose's accounts-page hide/delete and budgets-page delete: a disabled icon
 *  action that can say why, to a keyboard and a screen reader too. */
describe("IconButton disabledReason", () => {
  it("stays focusable, keeps its name, swallows the click and is described by the reason", () => {
    const onClick = vi.fn();
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow}>
        <IconButton label="Delete" disabled disabledReason="The account still has bookings." onClick={onClick} stopPropagation>
          <Trash2 />
        </IconButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("The account still has bookings.");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("shows the reason, not the label, in the bubble — even with tooltip={false}", () => {
    render(
      <IconButton aria-label="Delete" tooltip={false} aria-describedby="own" disabledReason="Only budget">
        <Trash2 />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Only budget");
    const ids = button.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("own");
    expect(ids).toHaveLength(2);
  });

  it("does not submit its form", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <IconButton type="submit" label="Save" disabledReason="Read-only">
          <Trash2 />
        </IconButton>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is the ordinary labelled button with an empty reason", () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Delete" disabledReason="" onClick={onClick}>
        <Trash2 />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAttribute("aria-describedby");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();
  });
});
