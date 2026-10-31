import { fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { matchesHotkey, parseHotkey, useHotkey } from "../use-hotkey";

const press = (init: KeyboardEventInit, target: Element = document.body) =>
  fireEvent.keyDown(target, { bubbles: true, cancelable: true, ...init });

describe("parseHotkey / matchesHotkey", () => {
  it("reads Mod as Cmd on Apple and Ctrl elsewhere", () => {
    expect(parseHotkey("Mod+K", true)).toMatchObject({ meta: true, ctrl: false, key: "K" });
    expect(parseHotkey("Mod+K", false)).toMatchObject({ meta: false, ctrl: true, key: "K" });
    expect(parseHotkey("Ctrl++", false)).toMatchObject({ ctrl: true, key: "+" });
    expect(() => parseHotkey("Ctrl+", false)).not.toThrow();
    expect(() => parseHotkey("Shift", false)).toThrow();
  });

  it("matches modifiers exactly, keys case-insensitively, codes too", () => {
    const combo = parseHotkey("Ctrl+Shift+F", false);
    const ev = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    expect(matchesHotkey(ev({ key: "F", ctrlKey: true, shiftKey: true }), combo)).toBe(true);
    expect(matchesHotkey(ev({ key: "F", ctrlKey: true }), combo)).toBe(false);
    expect(matchesHotkey(ev({ key: "F", ctrlKey: true, shiftKey: true, altKey: true }), combo)).toBe(false);
    expect(matchesHotkey(ev({ key: "Escape" }), parseHotkey("Esc", false))).toBe(true);
    expect(matchesHotkey(ev({ key: "!", code: "Digit1", altKey: true }), parseHotkey("Alt+Digit1", false))).toBe(true);
    // A symbol typed with Shift still matches an unshifted combo.
    expect(matchesHotkey(ev({ key: "?", shiftKey: true }), parseHotkey("?", false))).toBe(true);
  });
});

describe("useHotkey", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("fires on the combo, prevents the default, and ignores repeats", () => {
    const handler = vi.fn();
    renderHook(() => useHotkey("Ctrl+Shift+F", handler));
    const notCancelled = press({ key: "F", ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(notCancelled).toBe(false);
    press({ key: "F", ctrlKey: true, shiftKey: true, repeat: true });
    press({ key: "F", ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("leaves plain keys to a text field, but a chord still fires there", () => {
    const plain = vi.fn();
    const chord = vi.fn();
    renderHook(() => {
      useHotkey("/", plain);
      useHotkey("Ctrl+K", chord);
    });
    const { getByRole } = render(<input aria-label="q" />);
    const input = getByRole("textbox");
    press({ key: "/" }, input);
    press({ key: "k", ctrlKey: true }, input);
    expect(plain).not.toHaveBeenCalled();
    expect(chord).toHaveBeenCalledTimes(1);
    press({ key: "/" });
    expect(plain).toHaveBeenCalledTimes(1);
  });

  it("allowInInputs: true fires in fields, 'never' blocks chords too", () => {
    const any = vi.fn();
    const never = vi.fn();
    renderHook(() => {
      useHotkey("Escape", any, { allowInInputs: true });
      useHotkey("Ctrl+K", never, { allowInInputs: "never" });
    });
    const { getByRole } = render(<textarea aria-label="t" />);
    press({ key: "Escape" }, getByRole("textbox"));
    press({ key: "k", ctrlKey: true }, getByRole("textbox"));
    expect(any).toHaveBeenCalledTimes(1);
    expect(never).not.toHaveBeenCalled();
  });

  it("respects enabled, preventDefault: false, arrays, the latest handler and a target ref", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h, on }) => useHotkey(["a", "b"], h, { enabled: on, preventDefault: false }), {
      initialProps: { h: first, on: false },
    });
    press({ key: "a" });
    expect(first).not.toHaveBeenCalled();
    rerender({ h: second, on: true });
    expect(press({ key: "b" })).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    const box = document.createElement("div");
    document.body.appendChild(box);
    const scoped = vi.fn();
    renderHook(() => useHotkey("x", scoped, { target: { current: box } }));
    press({ key: "x" });
    expect(scoped).not.toHaveBeenCalled();
    press({ key: "x" }, box);
    expect(scoped).toHaveBeenCalledTimes(1);
  });
});

/**
 * 0.52 code review, use-hotkey.ts: `useHotkey` became the kit's one shortcut reader in
 * 0.52 (refactor audit 2026-10-30, DUP-12), ⌘K included, and three of its readings were
 * found wrong there.
 */
describe("useHotkey — a held key, Space, and a non-Latin layout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("cancels a held chord's repeats as it cancelled the first press, and calls the handler once", () => {
    // The browser acts on every keydown it is left: a held Ctrl+K's repeats reached its
    // own Ctrl+K (the omnibox, the search bar) and took the focus out of the palette.
    const handler = vi.fn();
    renderHook(() => useHotkey("Ctrl+K", handler));
    expect(press({ key: "k", ctrlKey: true })).toBe(false);
    expect(press({ key: "k", ctrlKey: true, repeat: true })).toBe(false);
    expect(press({ key: "k", ctrlKey: true, repeat: true })).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("leaves a repeat alone where it left the first press: preventDefault off, typing in a field", () => {
    const loose = vi.fn();
    const plain = vi.fn();
    renderHook(() => {
      useHotkey("Ctrl+J", loose, { preventDefault: false });
      useHotkey("/", plain);
    });
    expect(press({ key: "j", ctrlKey: true, repeat: true })).toBe(true);
    const field = document.body.appendChild(document.createElement("input"));
    expect(press({ key: "/", repeat: true }, field)).toBe(true);
    expect(loose).not.toHaveBeenCalled();
    expect(plain).not.toHaveBeenCalled();
  });

  it("matches Shift exactly for Space, a named key: Shift+Space is the browser's page-up", () => {
    const ev = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    const space = parseHotkey("Space", false);
    const shiftSpace = parseHotkey("Shift+Space", false);
    expect(matchesHotkey(ev({ key: " ", code: "Space" }), space)).toBe(true);
    expect(matchesHotkey(ev({ key: " ", code: "Space", shiftKey: true }), space)).toBe(false);
    expect(matchesHotkey(ev({ key: " ", code: "Space", shiftKey: true }), shiftSpace)).toBe(true);
    expect(matchesHotkey(ev({ key: " ", code: "Space" }), shiftSpace)).toBe(false);
  });

  it("matches a letter chord by its physical key on a non-Latin layout, and by the letter on a Latin one", () => {
    const ev = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
    const ctrlK = parseHotkey("Ctrl+K", false);
    // Russian, Greek, Hebrew: the key under K types its own letter.
    expect(matchesHotkey(ev({ key: "л", code: "KeyK", ctrlKey: true }), ctrlK)).toBe(true);
    expect(matchesHotkey(ev({ key: "κ", code: "KeyK", ctrlKey: true }), ctrlK)).toBe(true);
    expect(matchesHotkey(ev({ key: "ל", code: "KeyK", ctrlKey: true }), ctrlK)).toBe(true);
    // Still a letter's rule: Shift exactly, and only the key under that letter.
    expect(matchesHotkey(ev({ key: "Л", code: "KeyK", ctrlKey: true, shiftKey: true }), ctrlK)).toBe(false);
    expect(matchesHotkey(ev({ key: "о", code: "KeyJ", ctrlKey: true }), ctrlK)).toBe(false);
    // A Latin layout's letter is where it types (Dvorak's K is on the key QWERTY calls V),
    // and its key under QWERTY's K types another letter, which is not this chord.
    expect(matchesHotkey(ev({ key: "k", code: "KeyV", ctrlKey: true }), ctrlK)).toBe(true);
    expect(matchesHotkey(ev({ key: "t", code: "KeyK", ctrlKey: true }), ctrlK)).toBe(false);
    // Turkish "ı" is a Latin letter: no stand-in.
    expect(matchesHotkey(ev({ key: "ı", code: "KeyK", ctrlKey: true }), ctrlK)).toBe(false);
  });
});
