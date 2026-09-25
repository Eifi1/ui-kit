import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FloatingActionButton, FloatingPanel } from "../floating-panel";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose's assistant launcher and feedback page each built a corner button that opens
 * a panel beside the page. The contract here is the NON-modal one: the page stays
 * usable, focus is handed over and back rather than trapped, and Escape belongs to the
 * panel only while focus is in it.
 */

const fab = () => screen.getByRole("button", { name: "Assistant" });

function renderPanel(props: Partial<React.ComponentProps<typeof FloatingPanel>> = {}) {
  return render(
    <>
      <input aria-label="page field" />
      <FloatingPanel title="Ask the assistant" fabLabel="Assistant" fabIcon={<span>?</span>} {...props}>
        <input aria-label="Message" />
      </FloatingPanel>
    </>,
  );
}

describe("FloatingPanel", () => {
  it("opens from the FAB, wiring aria-expanded and aria-controls", () => {
    renderPanel();
    expect(fab()).toHaveAttribute("aria-expanded", "false");
    expect(fab()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(fab());
    const panel = screen.getByRole("dialog", { name: "Ask the assistant" });
    expect(fab()).toHaveAttribute("aria-expanded", "true");
    expect(fab()).toHaveAttribute("aria-controls", panel.id);
  });

  it("is not modal: no aria-modal, no scroll lock, the page stays reachable", () => {
    renderPanel({ defaultOpen: true });
    const panel = screen.getByRole("dialog");
    expect(panel).not.toHaveAttribute("aria-modal");
    expect(document.body.style.overflow).not.toBe("hidden");
    // Not hidden from the accessibility tree the way a modal hides the page.
    expect(screen.getByRole("textbox", { name: "page field" })).toBeInTheDocument();
    // And a Tab from the panel's last control is not wrapped back into it.
    const message = screen.getByRole("textbox", { name: "Message" });
    message.focus();
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    message.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("moves focus into the panel on open and back to the FAB on close", () => {
    renderPanel();
    fab().focus();
    fireEvent.click(fab());
    expect(screen.getByRole("dialog")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fab()).toHaveFocus();
  });

  it("focuses the caller's initialFocus target", () => {
    renderPanel({ initialFocus: () => document.querySelector<HTMLElement>("[aria-label='Message']") });
    fireEvent.click(fab());
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveFocus();
  });

  it("closes on Escape while focus is inside, and not from the page", () => {
    renderPanel({ defaultOpen: true });
    const pageField = screen.getByRole("textbox", { name: "page field" });
    fireEvent.keyDown(pageField, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const message = screen.getByRole("textbox", { name: "Message" });
    message.focus();
    fireEvent.keyDown(message, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fab()).toHaveFocus();
  });

  it("does not take focus when it renders open, nor steal it back when closed from the page", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <input aria-label="page field" />
          <button type="button" onClick={() => setOpen(false)}>
            close from page
          </button>
          <FloatingPanel open={open} onOpenChange={setOpen} title="Panel" fabLabel="Assistant" fabIcon="?">
            body
          </FloatingPanel>
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("dialog")).not.toHaveFocus();

    const pageField = screen.getByRole("textbox", { name: "page field" });
    pageField.focus();
    // Keyboard-activate the page's button without moving focus off the field.
    fireEvent.click(screen.getByRole("button", { name: "close from page" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(pageField).toHaveFocus();
  });

  it("works controlled: requests go through onOpenChange, the owner decides", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <FloatingPanel open={false} onOpenChange={onOpenChange} title="Panel" fabLabel="Assistant" fabIcon="?">
        body
      </FloatingPanel>,
    );
    fireEvent.click(fab());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <FloatingPanel open onOpenChange={onOpenChange} title="Panel" fabLabel="Assistant" fabIcon="?">
        body
      </FloatingPanel>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(fab());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("toggles uncontrolled from the FAB", () => {
    const onOpenChange = vi.fn();
    renderPanel({ onOpenChange });
    fireEvent.click(fab());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(fab());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  it("pins to a logical corner, clear of the nav and the safe area, and carries dir across the portal", () => {
    render(
      <div dir="rtl">
        <FloatingPanel defaultOpen corner="bottom-start" title="Panel" fabLabel="Assistant" fabIcon="?">
          body
        </FloatingPanel>
      </div>,
    );
    const button = fab();
    // Portalled to <body>, so the RTL has to be carried onto the portalled roots.
    expect(button.closest("[dir='rtl']")).toBe(button);
    expect(button.style.insetInlineStart).not.toBe("");
    expect(button.style.insetInlineEnd).toBe("");
    expect(button.style.bottom).toContain("--app-nav-h");
    expect(button.style.bottom).toContain("safe-area-inset-bottom");

    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("dir", "rtl");
    expect(panel).toHaveAttribute("data-corner", "bottom-start");
    expect(panel.className).toContain("md:start-[var(--fp-side)]");
    // Phone: a full-width sheet docked on the nav.
    expect(panel.className).toContain("inset-x-0");
    expect(panel.style.getPropertyValue("--fp-bottom")).toContain("--app-nav-h");
  });

  it("defaults to the bottom-end corner", () => {
    renderPanel({ defaultOpen: true });
    expect(fab().style.insetInlineEnd).not.toBe("");
    expect(screen.getByRole("dialog").className).toContain("md:end-[var(--fp-side)]");
  });

  it("takes its close label from the floatingPanel namespace", () => {
    render(
      <UiKitProvider labels={{ floatingPanel: { close: "Schließen" } }}>
        <FloatingPanel defaultOpen title="Panel" fabLabel="Assistant" fabIcon="?">
          body
        </FloatingPanel>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });
});

describe("FloatingActionButton", () => {
  it("is a named button in a corner, raised by offset", () => {
    const onClick = vi.fn();
    render(<FloatingActionButton label="New transaction" icon="+" offset="5rem" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "New transaction" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.style.bottom).toContain("5rem");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
