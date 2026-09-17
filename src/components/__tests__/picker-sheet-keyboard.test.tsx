import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PickerSheet } from "../picker-sheet";

/**
 * Keksdose live #328 — *"Opened select and keyboard on mobile. When the keyboard
 * overlays the entries I cannot scroll past them … to see also the last entries.
 * Happens when browsing the account select."*
 *
 * The sheet focuses its own search box the moment it opens, so on a phone the keyboard
 * is always up while it is being used. Android shrinks the VISUAL viewport for the
 * keyboard and leaves the layout viewport alone — and `fixed inset-0` is the layout
 * viewport, so the sheet kept its full height with its bottom behind the keys. The
 * list inside is `flex-1 overflow-y-auto`, so it sized itself to that hidden height
 * too: it reached the end of its own scroll while rows were still under the keyboard.
 *
 * ⚠️ jsdom has no `visualViewport` and lays nothing out, so this cannot show the rows.
 * What it holds is the rule that decides: the sheet takes the visible box when one is
 * reported, and is left exactly as it was when there is nothing to correct.
 */
const setViewport = (height: number | null, offsetTop = 0) => {
  if (height === null) {
    Reflect.deleteProperty(window, "visualViewport");
    return;
  }
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      height,
      offsetTop,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
};

const sheet = (props: Partial<Parameters<typeof PickerSheet>[0]> = {}) => (
  <PickerSheet open onClose={() => {}} title="Account" query="" onQueryChange={() => {}} {...props}>
    <button type="button">Wallet</button>
  </PickerSheet>
);

afterEach(() => {
  setViewport(null);
});

describe("PickerSheet and the on-screen keyboard (live #328)", () => {
  it("ends where the keyboard begins", () => {
    // 816px of screen, ~330px of keyboard — his phone, roughly.
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 816 });
    setViewport(486);
    render(sheet());
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.height).toBe("486px");
    // `inset-0` still sets `bottom: 0`, which would fight the height and win; the
    // override is part of the fix, not tidiness.
    expect(dialog.style.bottom).toBe("auto");
  });

  it("follows the viewport when it is panned under the keyboard", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 816 });
    setViewport(486, 120);
    render(sheet());
    expect(screen.getByRole("dialog").style.top).toBe("120px");
  });

  it("leaves the sheet alone when no keyboard is taking a bite", () => {
    // The desktop case, the closed-keyboard case, and jsdom's own: a sheet that is
    // already the size of the screen must not be pinned to a measured height, or it
    // stops responding to rotation and to the keyboard closing again.
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 816 });
    setViewport(816);
    render(sheet());
    expect(screen.getByRole("dialog").style.height).toBe("");
  });

  it("leaves the sheet alone where visualViewport does not exist", () => {
    setViewport(null);
    render(sheet());
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.height).toBe("");
    expect(dialog.className).toContain("inset-0");
  });
});
