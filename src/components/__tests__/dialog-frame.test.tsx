import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DialogFrame } from "../dialog-frame";
import { UiKitProvider } from "../../i18n/kit-labels";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";

/**
 * The frame 34 dialogs across two apps were writing by hand. The load-bearing part is
 * the NAME: Keksdose shipped eight of twenty dialogs that announced as just "dialog",
 * and the package's own feedback dialog had none. Here the heading's id is generated,
 * so a framed dialog cannot be unnamed.
 */
describe("DialogFrame", () => {
  it("names the dialog by its heading and describes it by its description", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="New session" description="Pick a name you will recognise.">
        <p>Fields</p>
      </DialogFrame>,
    );
    const dialog = screen.getByRole("dialog", { name: "New session" });
    expect(dialog).toHaveAccessibleDescription("Pick a name you will recognise.");
    expect(screen.getByRole("heading", { level: 2, name: "New session" })).toBeInTheDocument();
  });

  it("adds a caller's own aria-describedby rather than trading the frame's for it", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="Delete" description="This cannot be undone." aria-describedby="extra">
        <p id="extra">Three rows reference it.</p>
      </DialogFrame>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "This cannot be undone. Three rows reference it.",
    );
  });

  it("gives two open instances different ids", () => {
    render(
      <>
        <DialogFrame onClose={vi.fn()} title="One">
          a
        </DialogFrame>
        <DialogFrame onClose={vi.fn()} title="Two">
          b
        </DialogFrame>
      </>,
    );
    expect(screen.getByRole("dialog", { name: "One" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Two" })).toBeInTheDocument();
  });

  it("takes the heading level from headingAs", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="Demo" headingAs="h4">
        x
      </DialogFrame>,
    );
    expect(screen.getByRole("heading", { level: 4, name: "Demo" })).toBeInTheDocument();
  });

  it("scrolls the body, not the panel, so heading and actions stay put", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="Tall" actions={<button type="button">Save</button>}>
        <p>Body</p>
      </DialogFrame>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.className).toContain("overflow-hidden");
    expect(panel.className).not.toContain("overflow-y-auto");
    expect(panel.className).toContain("max-h-full");
    const body = screen.getByText("Body").parentElement!;
    expect(body.className).toContain("overflow-y-auto");
    expect(screen.getByRole("button", { name: "Save" }).parentElement).not.toBe(body);
  });

  it("has no X unless asked, and labels it from the provider", () => {
    const { rerender } = render(
      <DialogFrame onClose={vi.fn()} title="T">
        x
      </DialogFrame>,
    );
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    rerender(
      <UiKitProvider labels={{ dialogFrame: { close: "Schließen" } }}>
        <DialogFrame onClose={vi.fn()} title="T" closeButton>
          x
        </DialogFrame>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("lets closeLabel override the provider", () => {
    render(
      <UiKitProvider labels={{ dialogFrame: { close: "Schließen" } }}>
        <DialogFrame onClose={vi.fn()} title="T" closeButton closeLabel="Dismiss">
          x
        </DialogFrame>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("closes from the X (reduced motion: at once)", () => {
    const onClose = vi.fn();
    render(
      <DialogFrame onClose={onClose} title="T" closeButton>
        x
      </DialogFrame>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("with motion", () => {
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

    it("hands actions the panel's ANIMATED close, the one Escape uses", () => {
      const onClose = vi.fn();
      render(
        <DialogFrame
          onClose={onClose}
          title="T"
          actions={(close) => (
            <button type="button" onClick={close}>
              Cancel
            </button>
          )}
        >
          x
        </DialogFrame>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("dialog").className).toContain("animate-sheet-out");
      expect(onClose).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("renders no body without children, and no rule over the actions then", () => {
    render(
      <DialogFrame
        onClose={vi.fn()}
        title="Unsynced changes"
        description="Three edits have not reached the server."
        actions={<button type="button">Sync now</button>}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Unsynced changes" });
    expect(dialog.querySelector(".overflow-y-auto")).toBeNull();
    const row = screen.getByRole("button", { name: "Sync now" }).parentElement!;
    expect(row.className).not.toContain("border-t");
    // Only header and actions under the panel.
    expect(row.previousElementSibling).toContainElement(screen.getByRole("heading", { name: "Unsynced changes" }));
  });

  it("treats a false body (a `cond && …` that did not hold) as no body", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="Nothing">
        {false}
      </DialogFrame>,
    );
    expect(screen.getByRole("dialog").querySelector(".overflow-y-auto")).toBeNull();
  });

  it("takes header classes and draws a divider under the header when asked", () => {
    render(
      <DialogFrame onClose={vi.fn()} title="Edit row" headerClassName="px-3" headerDivider bodyClassName="px-3">
        <p>Fields</p>
      </DialogFrame>,
    );
    const headerRow = screen.getByRole("heading", { name: "Edit row" }).parentElement!.parentElement!;
    expect(headerRow.className).toContain("border-b");
    expect(headerRow.className).toContain("px-3");
    expect(headerRow.className).not.toContain("px-4");
    expect(screen.getByText("Fields").parentElement!.className).toContain("pt-3");
  });
});
