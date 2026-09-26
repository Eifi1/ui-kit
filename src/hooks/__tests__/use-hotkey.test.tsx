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
