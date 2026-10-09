import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Save } from "lucide-react";
import { Button, IconButton } from "../ui";
import { FormActions } from "../form-actions";
import { COMMIT_EXCEPT_BILLING, DEFAULT_WRITE_LOCK_LABELS, WriteLockProvider, useWriteLock, writeLockFor } from "../write-lock";
import type { CommitScope, WriteLock, WriteLockHold } from "../write-lock";

/**
 * keksdose's read-only demo and Kurvenschmiede's viewer / customer locks: everything
 * renders, only the commit is locked — and the locked commit can say why.
 */

function Probe() {
  const lock = useWriteLock();
  return <output data-locked={String(lock.locked)}>{lock.reason}</output>;
}

describe("useWriteLock", () => {
  it("is unlocked with no provider", () => {
    render(<Probe />);
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("carries the provider's reason, or the default label without one", () => {
    const { rerender } = render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <Probe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Shared with you to read.");
    rerender(
      <WriteLockProvider locked>
        <Probe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(DEFAULT_WRITE_LOCK_LABELS.reason);
    rerender(
      <WriteLockProvider locked labels={{ reason: "Nur lesen." }}>
        <Probe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Nur lesen.");
  });

  it("has no reason while unlocked", () => {
    render(
      <WriteLockProvider locked={false} reason="Never shown">
        <Probe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("lets the inner provider win, both ways", () => {
    render(
      <WriteLockProvider locked reason="Viewer">
        <div data-testid="reopened">
          <WriteLockProvider locked={false}>
            <Probe />
          </WriteLockProvider>
        </div>
        <div data-testid="owner">
          <WriteLockProvider locked reason="Customer">
            <Probe />
          </WriteLockProvider>
        </div>
      </WriteLockProvider>,
    );
    expect(screen.getByTestId("reopened").querySelector("output")).toHaveAttribute("data-locked", "false");
    expect(screen.getByTestId("owner").querySelector("output")).toHaveTextContent("Customer");
  });
});

describe("Button commit", () => {
  it("is locked under a lock: focusable, described, click and submit swallowed", () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <form onSubmit={onSubmit}>
          <input aria-label="Name" />
          <Button type="submit" commit onClick={onClick}>
            Save
          </Button>
        </form>
      </WriteLockProvider>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Read-only demo.");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Read-only demo.");
    // Fields stay editable: only the commit is locked.
    expect(screen.getByRole("textbox", { name: "Name" })).toBeEnabled();
  });

  it("puts the lock's reason over its own disabledReason", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <Button commit disabledReason="Fill in a name first.">
          Save
        </Button>
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveAccessibleDescription("Read-only demo.");
  });

  it("is unchanged without commit, without a provider, or under an unlocked one", () => {
    const onClick = vi.fn();
    render(
      <>
        <WriteLockProvider locked reason="Read-only demo.">
          <Button onClick={onClick}>Export</Button>
        </WriteLockProvider>
        <Button commit onClick={onClick}>
          Bare
        </Button>
        <WriteLockProvider locked={false} reason="x">
          <Button commit onClick={onClick}>
            Open
          </Button>
        </WriteLockProvider>
      </>,
    );
    for (const name of ["Export", "Bare", "Open"]) {
      const button = screen.getByRole("button", { name });
      expect(button).not.toHaveAttribute("aria-disabled");
      expect(button).not.toHaveAttribute("aria-describedby");
      fireEvent.click(button);
    }
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("keeps its own disabledReason when unlocked", () => {
    render(
      <WriteLockProvider locked={false}>
        <Button commit disabledReason="Fill in a name first.">
          Save
        </Button>
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveAccessibleDescription("Fill in a name first.");
  });
});

describe("IconButton commit", () => {
  it("shows the lock's reason in place of its label and swallows the click", () => {
    const onClick = vi.fn();
    render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <IconButton label="Save" commit onClick={onClick}>
          <Save />
        </IconButton>
      </WriteLockProvider>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription("Shared with you to read.");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Shared with you to read.");
  });

  it("is the ordinary button without a lock", () => {
    render(
      <IconButton label="Save" commit>
        <Save />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("FormActions commit", () => {
  it("locks save and the data destructive action, not Cancel", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const onDelete = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <FormActions
          commit
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitDisabledReason="Own reason"
          destructive={{ label: "Delete", onClick: onDelete }}
        />
      </WriteLockProvider>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-disabled", "true");
    expect(save).toHaveAccessibleDescription("Read-only demo.");
    fireEvent.click(save);
    const del = screen.getByRole("button", { name: "Delete" });
    expect(del).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(del);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).not.toHaveAttribute("aria-disabled");
    fireEvent.click(cancel);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it("does nothing without commit, even under a lock", () => {
    const onSubmit = vi.fn();
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <FormActions onSubmit={onSubmit} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows the spinner, not the lock, while pending", () => {
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <FormActions commit pending onSubmit={() => {}} />
      </WriteLockProvider>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-busy", "true");
    expect(save).not.toHaveAccessibleDescription("Read-only demo.");
  });
});

/**
 * 0.33 (docs/billing-harmonization.md §12.36): a lock says its source, and a control can
 * be exempt from one. A lapsed plan still lets a reader remove access and change their
 * own settings (§3.3, §12.13), so those controls take `COMMIT_EXCEPT_BILLING`.
 */
const DEMO: WriteLockHold = { kind: "demo", reason: "Not possible in the demo." };
const BILLING: WriteLockHold = { kind: "billing", reason: "Your plan has ended." };

function ScopedProbe({ scope }: { scope?: CommitScope }) {
  const lock = useWriteLock(scope);
  return (
    <output data-locked={String(lock.locked)} data-kind={lock.kind ?? ""} data-holds={lock.holds.map((h) => h.kind ?? "?").join(",")}>
      {lock.reason}
    </output>
  );
}

describe("write lock sources (0.33)", () => {
  it("holds every locked source in the order given, the first one's reason and kind", () => {
    render(
      <WriteLockProvider locked reason="Not possible in the demo." holds={[DEMO, BILLING]}>
        <ScopedProbe />
      </WriteLockProvider>,
    );
    const out = screen.getByRole("status");
    expect(out).toHaveAttribute("data-holds", "demo,billing");
    expect(out).toHaveAttribute("data-kind", "demo");
    expect(out).toHaveTextContent("Not possible in the demo.");
  });

  it("a one-source provider names its kind; a hold without a reason takes the default label", () => {
    const { rerender } = render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <ScopedProbe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-holds", "billing");
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "billing");
    rerender(
      <WriteLockProvider locked holds={[{ kind: "access", reason: undefined }, BILLING]}>
        <ScopedProbe />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(DEFAULT_WRITE_LOCK_LABELS.reason);
  });

  it("{ except: ['billing'] } under billing alone is unlocked, and still sees the hold", () => {
    render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <ScopedProbe scope={COMMIT_EXCEPT_BILLING} />
      </WriteLockProvider>,
    );
    const out = screen.getByRole("status");
    expect(out).toHaveAttribute("data-locked", "false");
    expect(out).toBeEmptyDOMElement();
    expect(out).toHaveAttribute("data-holds", "billing");
  });

  it("under demo and billing together it is locked with the demo's reason, in either order", () => {
    const { rerender } = render(
      <WriteLockProvider locked holds={[DEMO, BILLING]}>
        <ScopedProbe scope={COMMIT_EXCEPT_BILLING} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "true");
    expect(screen.getByRole("status")).toHaveAttribute("data-kind", "demo");
    expect(screen.getByRole("status")).toHaveTextContent("Not possible in the demo.");
    rerender(
      <WriteLockProvider locked holds={[BILLING, DEMO]}>
        <ScopedProbe scope={COMMIT_EXCEPT_BILLING} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Not possible in the demo.");
  });

  it("never exempts a source without a kind, or of a kind the scope does not name", () => {
    const { rerender } = render(
      <WriteLockProvider locked reason="Shared with you to read.">
        <ScopedProbe scope={COMMIT_EXCEPT_BILLING} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "true");
    rerender(
      <WriteLockProvider locked kind="customer" reason="A customer account owns nothing.">
        <ScopedProbe scope={COMMIT_EXCEPT_BILLING} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("A customer account owns nothing.");
  });

  it("an inner locked={false} still reopens every source", () => {
    render(
      <WriteLockProvider locked holds={[DEMO, BILLING]}>
        <WriteLockProvider locked={false}>
          <ScopedProbe />
        </WriteLockProvider>
      </WriteLockProvider>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-locked", "false");
    expect(screen.getByRole("status")).toHaveAttribute("data-holds", "");
  });

  it("writeLockFor is pure: the lock itself for true, nothing for no commit, the first hold in scope", () => {
    const lock: WriteLock = { locked: true, reason: DEMO.reason, kind: "demo", holds: [DEMO, BILLING] };
    const before = JSON.stringify(lock);
    expect(writeLockFor(lock, true)).toBe(lock);
    expect(writeLockFor(lock, undefined)).toMatchObject({ locked: false, reason: undefined, kind: undefined });
    expect(writeLockFor(lock, false).holds).toBe(lock.holds);
    expect(writeLockFor(lock, { except: ["demo"] })).toMatchObject({ locked: true, reason: BILLING.reason, kind: "billing" });
    expect(writeLockFor(lock, { except: ["demo", "billing"] }).locked).toBe(false);
    // Nothing was written to the lock it was given.
    expect(JSON.stringify(lock)).toBe(before);
    // A hand-built lock with no holds is the one source it describes.
    const bare: WriteLock = { locked: true, reason: "Plan ended", kind: "billing", holds: [] };
    expect(writeLockFor(bare, COMMIT_EXCEPT_BILLING).locked).toBe(false);
    expect(writeLockFor(bare, { except: ["demo"] })).toBe(bare);
  });

  it("Button and IconButton with COMMIT_EXCEPT_BILLING: live under billing, locked under the demo", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <Button commit={COMMIT_EXCEPT_BILLING} onClick={onClick}>
          Sign out everywhere
        </Button>
        <IconButton label="Remove" commit={COMMIT_EXCEPT_BILLING} onClick={onClick}>
          <Save />
        </IconButton>
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Sign out everywhere" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClick).toHaveBeenCalledTimes(2);
    rerender(
      <WriteLockProvider locked holds={[DEMO, BILLING]}>
        <Button commit={COMMIT_EXCEPT_BILLING} onClick={onClick}>
          Sign out everywhere
        </Button>
        <IconButton label="Remove" commit={COMMIT_EXCEPT_BILLING} onClick={onClick}>
          <Save />
        </IconButton>
      </WriteLockProvider>,
    );
    for (const name of ["Sign out everywhere", "Remove"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAccessibleDescription("Not possible in the demo.");
      fireEvent.click(button);
    }
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("FormActions keeps an object scope while not pending (the `commit && !pending` trap)", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <WriteLockProvider locked kind="billing" reason="Your plan has ended.">
        <form>
          <textarea aria-label="Note" />
          <FormActions commit={COMMIT_EXCEPT_BILLING} onSubmit={onSubmit} submitShortcut="mod-enter" />
        </form>
      </WriteLockProvider>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).not.toHaveAttribute("aria-disabled");
    fireEvent.click(save);
    // The shortcut obeys the scope too.
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    rerender(
      <WriteLockProvider locked holds={[DEMO, BILLING]}>
        <form>
          <textarea aria-label="Note" />
          <FormActions commit={COMMIT_EXCEPT_BILLING} onSubmit={onSubmit} submitShortcut="mod-enter" />
        </form>
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveAccessibleDescription("Not possible in the demo.");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note" }), { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
