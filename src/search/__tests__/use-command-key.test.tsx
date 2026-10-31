import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCommandKey } from "../use-command-key";

/**
 * ⌘K is `useHotkey("Mod+K")` (refactor audit 2026-10-30, DUP-12). Hand-rolled, it took
 * Ctrl+K on a Mac too — a text field's kill-line there — fired on Ctrl+Shift+K and
 * Cmd+Alt+K, and opened again on every repeat of a held key.
 */

const press = (init: KeyboardEventInit, target: Element = document.body) =>
  fireEvent.keyDown(target, { bubbles: true, cancelable: true, ...init });

function onPlatform(platform: string) {
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("useCommandKey", () => {
  it("opens on Cmd+K on a Mac, and leaves Ctrl+K to the text field", () => {
    onPlatform("MacIntel");
    const onOpen = vi.fn();
    renderHook(() => useCommandKey(onOpen));
    expect(press({ key: "k", ctrlKey: true })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    expect(press({ key: "k", metaKey: true })).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens on Ctrl+K elsewhere, from inside a text field too", () => {
    onPlatform("Win32");
    const onOpen = vi.fn();
    renderHook(() => useCommandKey(onOpen));
    const field = document.body.appendChild(document.createElement("input"));
    press({ key: "K", ctrlKey: true }, field);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("is exactly the chord, and a held key opens once", () => {
    onPlatform("Win32");
    const onOpen = vi.fn();
    renderHook(() => useCommandKey(onOpen));
    press({ key: "K", ctrlKey: true, shiftKey: true });
    press({ key: "k", ctrlKey: true, altKey: true });
    press({ key: "k", ctrlKey: true, metaKey: true });
    press({ key: "k", ctrlKey: true, repeat: true });
    expect(onOpen).not.toHaveBeenCalled();
  });
});

/** 0.52 code review, use-hotkey.ts and global-search.tsx: what moving ⌘K onto `useHotkey` lost. */
describe("useCommandKey — a held key, a Russian layout, and the shortcut turned off", () => {
  it("cancels a held Ctrl+K's repeats, as the hand-written listener did, and opens once", () => {
    onPlatform("Win32");
    const onOpen = vi.fn();
    renderHook(() => useCommandKey(onOpen));
    expect(press({ key: "k", ctrlKey: true })).toBe(false);
    // Left to the browser, a repeat is ITS Ctrl+K: the focus goes to the omnibox.
    expect(press({ key: "k", ctrlKey: true, repeat: true })).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens on Ctrl+K on a Russian layout, where the key types л", () => {
    onPlatform("Win32");
    const onOpen = vi.fn();
    renderHook(() => useCommandKey(onOpen));
    press({ key: "л", code: "KeyK", ctrlKey: true });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("leaves Mod+K to the browser and to other handlers while turned off", () => {
    onPlatform("Win32");
    const onOpen = vi.fn();
    const { rerender } = renderHook(({ on }) => useCommandKey(onOpen, { enabled: on }), {
      initialProps: { on: false },
    });
    expect(press({ key: "k", ctrlKey: true })).toBe(true);
    expect(onOpen).not.toHaveBeenCalled();
    rerender({ on: true });
    expect(press({ key: "k", ctrlKey: true })).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
