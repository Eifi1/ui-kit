import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GlobalSearch, type GlobalSearchTriggerProps } from "../global-search";

/**
 * 0.52 code review, global-search.tsx: ⌘K is `useHotkey("Mod+K")` since 0.52 (refactor
 * audit 2026-10-30, DUP-12) — Cmd+K on Apple platforms, Ctrl+K elsewhere — and the
 * trigger still announced "Meta+K Control+K": one chord that did nothing on every
 * platform. And `shortcut={false}` still cancelled every Mod+K, its own and the browser's.
 */

function onPlatform(platform: string) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
}

afterEach(() => {
  vi.restoreAllMocks();
});

const pressCtrlK = () => {
  const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
};

describe("GlobalSearch — the shortcut it announces and the one it takes", () => {
  it("announces Meta+K on a Mac and Control+K elsewhere, to its own trigger and to a custom one", () => {
    for (const [platform, chord] of [
      ["MacIntel", "Meta+K"],
      ["Win32", "Control+K"],
    ] as const) {
      onPlatform(platform);
      let custom: GlobalSearchTriggerProps | null = null;
      const { unmount } = render(
        <MemoryRouter>
          <GlobalSearch entries={[]} />
          <GlobalSearch
            entries={[]}
            shortcut={false}
            trigger={(props) => {
              custom = props;
              return null;
            }}
          />
        </MemoryRouter>,
      );
      expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("aria-keyshortcuts", chord);
      expect(custom!.ariaKeyShortcuts).toBe(chord);
      unmount();
      vi.restoreAllMocks();
    }
  });

  it("leaves Mod+K to the browser with shortcut={false}", () => {
    onPlatform("Win32");
    render(
      <MemoryRouter>
        <GlobalSearch entries={[]} shortcut={false} />
      </MemoryRouter>,
    );
    expect(pressCtrlK().defaultPrevented).toBe(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
