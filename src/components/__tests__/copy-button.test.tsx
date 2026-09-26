import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../copy-button";
import { UiKitProvider } from "../../i18n/kit-labels";

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
    // The name does not change under the focus; the tooltip carries the state.
    expect(button).toHaveAccessibleName("Copy IBAN");
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
