import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Save } from "lucide-react";
import { Button, IconButton } from "../ui";
import { FormActions } from "../form-actions";
import { DEFAULT_WRITE_LOCK_LABELS, WriteLockProvider, useWriteLock } from "../write-lock";

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
