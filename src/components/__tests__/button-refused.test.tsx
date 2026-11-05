import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { WriteLockProvider } from "../write-lock";

/**
 * `refused` on Button and IconButton (0.52 code review 2026-10-31, held to 0.55): a
 * refused action stays where a keyboard and a screen reader can find it — focusable,
 * `aria-disabled`, every activation swallowed — and says why, in its own words through
 * the kit's bubble and description, or (`true`) through an `aria-describedby` that names
 * where the screen already says it.
 */
describe("Button refused", () => {
  it("is focusable, swallows the click and the keys, and is described by its words", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Button>Before</Button>
        <Button onClick={onClick} refused="Only the owner can delete it.">
          Delete
        </Button>
      </>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Only the owner can delete it.");
    // In the tab order: a Tab from the button before it lands here.
    screen.getByRole("button", { name: "Before" }).focus();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Only the owner can delete it.");
  });

  it("`true`: refused with the reason the screen already says, which its aria-describedby names", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <p id="plan">Your plan has ended — this budget is read-only.</p>
        <input aria-label="Amount" />
        <Button type="submit" refused aria-describedby="plan" onClick={onClick}>
          Save
        </Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Your plan has ended — this budget is read-only.");
    expect(button).toHaveClass("cursor-not-allowed", "opacity-50");
    // No bubble of its own: the words are the banner's.
    fireEvent.mouseEnter(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
    // Neither the button's own keys nor the field's Enter submit through it.
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "12{Enter}");
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("wins over `disabled`, so the button stays reachable", () => {
    render(
      <Button disabled refused>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("is an ordinary button for false, null, undefined and an empty string", () => {
    const onClick = vi.fn();
    for (const refused of [false, null, undefined, ""]) {
      const { unmount } = render(
        <Button onClick={onClick} refused={refused}>
          Save
        </Button>,
      );
      const button = screen.getByRole("button", { name: "Save" });
      expect(button).not.toHaveAttribute("aria-disabled");
      expect(button).not.toHaveAttribute("aria-describedby");
      fireEvent.click(button);
      unmount();
    }
    expect(onClick).toHaveBeenCalledTimes(4);
  });

  it("says its words over disabledReason's, and the lock's over both", () => {
    const { rerender } = render(
      <Button refused="Owner only" disabledReason="Not today">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Owner only");
    rerender(
      <Button refused disabledReason="Not today">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Not today");
    rerender(
      <WriteLockProvider locked reason="Read-only demo">
        <Button commit refused="Owner only">
          Delete
        </Button>
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Read-only demo");
  });

  it("is a button's state, not a link's", () => {
    // @ts-expect-error -- a link that explains why it cannot be followed is a refused button
    render(<Button href="/curves" refused="Owner only" />);
    // @ts-expect-error -- the same on the icon link
    render(<IconButton href="/curves" label="Open" refused />);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});

describe("IconButton refused", () => {
  it("keeps its name, shows the reason in place of the label, and opens no row", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow}>
        <IconButton label="Delete" refused="Only the owner can delete it." onClick={onClick} stopPropagation>
          <Trash2 />
        </IconButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Only the owner can delete it.");
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Only the owner can delete it.");
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("keeps a refused or pending press from the clickable row around it, without stopPropagation", async () => {
    // A natively disabled button gets no click at all, so the row never heard it; the
    // focusable refusal has to keep it from the row itself (Kurvenschmiede's 0.55
    // adoption: its owner-only delete opened the row).
    const user = userEvent.setup();
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow}>
        <IconButton label="Delete" refused="Only the owner can delete it.">
          <Trash2 />
        </IconButton>
        <Button refused>Archive</Button>
        <Button pending>Save</Button>
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await user.click(screen.getByRole("button", { name: /Save/ }));
    expect(onRow).not.toHaveBeenCalled();
  });

  it("`true`: keeps the label's bubble and swallows every activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <IconButton label="Next image" refused onClick={onClick}>
        <Trash2 />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Next image" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("aria-describedby");
    expect(button).toHaveClass("cursor-not-allowed", "opacity-50");
    await user.hover(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Next image");
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
