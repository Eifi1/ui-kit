import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../copy-button";
import { UiKitProvider } from "../../i18n/kit-labels";
import { applyTextSize } from "../../theme/text-size";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as { clipboard?: unknown }).clipboard;
  delete (document as { execCommand?: unknown }).execCommand;
  vi.useRealTimers();
});

async function click(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}

describe("CopyButton", () => {
  it("icon variant: stable name, copies, announces politely, shows copied", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const onCopied = vi.fn();
    render(<CopyButton text="DE89 3704" label="Copy IBAN" onCopied={onCopied} />);
    const button = screen.getByRole("button", { name: "Copy IBAN" });
    await click(button);
    expect(writeText).toHaveBeenCalledWith("DE89 3704");
    expect(onCopied).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("data-state", "copied");
    // The name does not change under the focus; the tooltip carries the state. It is
    // IconButton's own, mounted while the pointer is on the button (0.52, DSP-21).
    expect(button).toHaveAccessibleName("Copy IBAN");
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Copied");
    act(() => vi.advanceTimersByTime(60));
    expect(screen.getByRole("status")).toHaveTextContent("Copied to clipboard");
    act(() => vi.advanceTimersByTime(2000));
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("a failed copy is a failure, announced assertively — never 'Copied'", async () => {
    vi.useFakeTimers();
    setClipboard(undefined); // no Clipboard API and no execCommand: nothing can copy
    const onCopied = vi.fn();
    render(<CopyButton variant="label" text="x" onCopied={onCopied} />);
    const button = screen.getByRole("button", { name: "Copy" });
    await click(button);
    expect(onCopied).toHaveBeenCalledWith(false);
    expect(button).toHaveTextContent("Couldn’t copy");
    expect(button).not.toHaveTextContent("Copied");
    act(() => vi.advanceTimersByTime(60));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t copy to the clipboard");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("reads a function `text` at click time", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    let value = "one";
    render(<CopyButton variant="label" text={() => value} />);
    value = "two";
    await click(screen.getByRole("button"));
    expect(writeText).toHaveBeenCalledWith("two");
  });

  it("takes its words from the copyButton namespace", async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    render(
      <UiKitProvider labels={{ copyButton: { copy: "Kopieren", copied: "Kopiert" } }}>
        <CopyButton variant="label" text="x" />
      </UiKitProvider>,
    );
    const button = screen.getByRole("button", { name: "Kopieren" });
    await click(button);
    expect(button).toHaveTextContent("Kopiert");
  });

  it("live regions exist before the first message (so readers subscribe)", () => {
    render(<CopyButton text="x" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });
});

describe("CopyButton size, tone and stopPropagation (keksdose C27)", () => {
  it("forwards an explicit size to the label variant, and none by default", () => {
    const { rerender } = render(<CopyButton text="x" variant="label" label="Copy" />);
    const plain = screen.getByRole("button").className;
    rerender(<CopyButton text="x" variant="label" label="Copy" size="sm" />);
    expect(screen.getByRole("button").className).not.toBe(plain);
    expect(screen.getByRole("button").className).toContain("text-xs");
  });

  it("passes tone to the icon variant", () => {
    const { rerender } = render(<CopyButton text="x" label="Copy" />);
    const plain = screen.getByRole("button", { name: "Copy" }).className;
    rerender(<CopyButton text="x" label="Copy" tone="muted" />);
    expect(screen.getByRole("button", { name: "Copy" }).className).not.toBe(plain);
  });

  it("keeps the click from reaching a clickable row", () => {
    for (const variant of ["icon", "label"] as const) {
      const row = vi.fn();
      const { unmount } = render(
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div onClick={row}>
          <CopyButton text="x" label="Copy" variant={variant} stopPropagation />
        </div>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      expect(row).not.toHaveBeenCalled();
      unmount();
    }
  });
});

describe("CopyButton leaves portalling to the Tooltip (keksdose E0)", () => {
  it("does not mount its bubble in place inside a data-clips scroller", () => {
    const { container } = render(
      <div data-clips="">
        <CopyButton text="x" label="Copy IBAN" />
      </div>,
    );
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });
});

// Refactor audit 2026-10-30, DSP-21: the icon variant wrapped IconButton in a Tooltip of
// its own, which cloned `aria-describedby` onto the button — "Copy, button, Copy" — and
// never showed its words at Large, as every labelled IconButton does. IconButton names
// itself now: `label` for the bubble and the Large text, `aria-label` for the name.
describe("CopyButton's icon variant is a labelled IconButton", () => {
  afterEach(() => {
    act(() => applyTextSize("normal"));
  });

  it("is not described by its own name", async () => {
    vi.useFakeTimers();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    render(<CopyButton text="x" label="Copy IBAN" />);
    const button = screen.getByRole("button", { name: "Copy IBAN" });
    expect(button).not.toHaveAttribute("aria-describedby");
    await click(button);
    expect(button).toHaveAccessibleName("Copy IBAN");
    expect(button).not.toHaveAttribute("aria-describedby");
  });

  it("shows its words as text at Large, the result included", async () => {
    vi.useFakeTimers();
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    act(() => applyTextSize("large"));
    render(<CopyButton text="x" label="Copy IBAN" />);
    const button = screen.getByRole("button", { name: "Copy IBAN" });
    expect(button.querySelector("[data-slot=icon-button-label]")).toHaveTextContent("Copy IBAN");
    await click(button);
    expect(button.querySelector("[data-slot=icon-button-label]")).toHaveTextContent("Copied");
    expect(button).toHaveAccessibleName("Copy IBAN");
  });
});
