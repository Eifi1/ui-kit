import { useEffect, useRef } from "react";

/**
 * A key combination: modifiers and one key, joined by "+", case-insensitive —
 * `"Ctrl+Shift+F"`, `"Mod+K"`, `"Alt+ArrowUp"`, `"Escape"`, `"?"`.
 *
 * Modifiers: `Ctrl` (`Control`), `Meta` (`Cmd`, `Command`), `Shift`, `Alt` (`Option`),
 * and `Mod` — Cmd on Apple platforms, Ctrl everywhere else, the one to use for an
 * app shortcut. The key is `KeyboardEvent.key` ("f", "Enter", "ArrowUp", "/"), or a
 * `KeyboardEvent.code` ("KeyF", "Digit1") when the physical key is what matters.
 * Several combos: pass an array.
 */
export type Hotkey = string;

export interface UseHotkeyOptions {
  /** Off while `false` (default `true`). */
  enabled?: boolean;
  /** Call `preventDefault()` on a match (default `true`): Ctrl+Shift+F must not also
   *  open the browser's own dialog. */
  preventDefault?: boolean;
  /** Where to listen. Default `document`. A ref, an element, or `window`. */
  target?: EventTarget | null | { current: EventTarget | null };
  /**
   * Fire while the focus is in a text field, select or contenteditable too. Default
   * `false`: a shortcut must not steal the letters someone is typing. A combo with Ctrl,
   * Meta or Alt is not typing — those still fire unless this is `"never"`.
   */
  allowInInputs?: boolean | "never";
  /** `keydown` (default) or `keyup`. */
  event?: "keydown" | "keyup";
}

export interface ParsedHotkey {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

/** Whether this is an Apple platform, where `Mod` means Cmd. */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
}

/** Parse one combo. `apple` decides what `Mod` is. Throws on an empty key. */
export function parseHotkey(combo: Hotkey, apple = isApplePlatform()): ParsedHotkey {
  const parts = combo
    .split("+")
    .map((p) => p.trim())
    // "Ctrl++" is Ctrl and "+": an empty part after a "+" is the plus key itself.
    .map((p, i, all) => (p === "" && i === all.length - 1 ? "+" : p))
    .filter((p) => p !== "");
  const out: ParsedHotkey = { ctrl: false, meta: false, shift: false, alt: false, key: "" };
  for (const part of parts) {
    switch (part.toLowerCase()) {
      case "ctrl":
      case "control":
        out.ctrl = true;
        break;
      case "meta":
      case "cmd":
      case "command":
        out.meta = true;
        break;
      case "mod":
        if (apple) out.meta = true;
        else out.ctrl = true;
        break;
      case "shift":
        out.shift = true;
        break;
      case "alt":
      case "option":
        out.alt = true;
        break;
      default:
        out.key = part;
    }
  }
  if (!out.key) throw new Error(`useHotkey: "${combo}" names no key`);
  return out;
}

const KEY_ALIASES: Record<string, string> = {
  esc: "escape",
  space: " ",
  del: "delete",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
};

/** One letter of a script other than Latin: what a Russian, Greek or Hebrew layout's letter keys type. */
const NON_LATIN_LETTER = /^(?!\p{Script=Latin})\p{L}$/u;

/** Whether `e` is `combo` — every modifier as named (no more, no fewer), and the key. */
export function matchesHotkey(e: KeyboardEvent, combo: ParsedHotkey): boolean {
  if (e.ctrlKey !== combo.ctrl || e.metaKey !== combo.meta || e.altKey !== combo.alt) return false;
  const want = KEY_ALIASES[combo.key.toLowerCase()] ?? combo.key.toLowerCase();
  const key = (e.key ?? "").toLowerCase();
  const code = (e.code ?? "").toLowerCase();
  // On a non-Latin layout `key` is the local letter — Ctrl+K types "л" on a Russian one —
  // so a letter chord never fired there, ⌘K included (0.52 code review, use-hotkey.ts; the
  // hand-written ⌘K listener before 0.52 compared `key` alone and missed it too). The
  // physical key stands in for the letter there, and only there: a Latin layout's letter
  // is wherever it types (Dvorak's K is on QWERTY's V).
  const physical = /^[a-z]$/.test(want) && NON_LATIN_LETTER.test(e.key ?? "") && code === `key${want}`;
  if (key !== want && code !== want && !physical) return false;
  // Shift must match exactly for a letter or a named key; for a symbol it is how the
  // symbol is typed ("?" is Shift+/ on a US layout, a plain key on others), so an
  // unnamed Shift is not held against it. Space is a named key, not a symbol, though its
  // alias is one character: "Space" fired on Shift+Space, the browser's page-up, and
  // cancelled it (0.52 code review, use-hotkey.ts).
  const symbol = want.length === 1 && !/[a-z0-9 ]/.test(want);
  return symbol && !combo.shift ? true : e.shiftKey === combo.shift;
}

/** Is the focus somewhere that takes typed characters? */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "submit", "reset", "range", "color", "file", "image"].includes(target.type);
  }
  return false;
}

/**
 * Call `handler` when `combo` is pressed — kastlan's feedback button (Ctrl+Shift+F,
 * feedback-button:60) wired it by hand, and so will every next shortcut.
 *
 * - `Mod` is Cmd on a Mac and Ctrl elsewhere, read once per mount.
 * - Modifiers match EXACTLY: `"Ctrl+K"` does not fire on Ctrl+Shift+K.
 * - Typing in a field is left alone unless `allowInInputs`, except for a combo with
 *   Ctrl / Meta / Alt, which no one types as text.
 * - A key held down fires once, not on every repeat — and its repeats are cancelled as
 *   the first press was, or the browser acts on them.
 * - The newest `handler` is always called; changing it does not re-attach the listener.
 *
 * `useCommandKey` (the ⌘K palette hook) is this with `"Mod+K"` and `allowInInputs`
 * since 0.52, and FormActions' Ctrl/Cmd+Enter is {@link matchesHotkey} (refactor audit
 * 2026-10-30, DUP-12): one reading of a chord.
 */
export function useHotkey(
  combo: Hotkey | ReadonlyArray<Hotkey>,
  handler: (event: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const { enabled = true, preventDefault = true, target, allowInInputs = false, event = "keydown" } = options;
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  const key = typeof combo === "string" ? combo : combo.join("\u0000");
  const targetEl = target && "current" in target ? undefined : target;
  const targetRef = target && "current" in target ? target : undefined;

  useEffect(() => {
    if (!enabled) return;
    const node: EventTarget | null =
      targetRef?.current ?? targetEl ?? (typeof document === "undefined" ? null : document);
    if (!node) return;
    const apple = isApplePlatform();
    const parsed = key.split("\u0000").map((c) => parseHotkey(c, apple));
    const listener = (raw: Event) => {
      const e = raw as KeyboardEvent;
      const hit = parsed.find((p) => matchesHotkey(e, p));
      if (!hit) return;
      if (allowInInputs !== true && isTypingTarget(e.target)) {
        const chorded = hit.ctrl || hit.meta || hit.alt;
        if (allowInInputs === "never" || !chorded) return;
      }
      if (preventDefault) e.preventDefault();
      // A held key's repeats are cancelled like its first press, and call nothing. They
      // returned before the `preventDefault` once, so a held Ctrl+K's repeats reached the
      // browser's own Ctrl+K and took the focus out of the palette ⌘K had just opened
      // (0.52 code review, use-hotkey.ts; the hand-written ⌘K listener cancelled them).
      if (e.repeat) return;
      handlerRef.current(e);
    };
    node.addEventListener(event, listener);
    return () => node.removeEventListener(event, listener);
  }, [key, enabled, preventDefault, allowInInputs, event, targetEl, targetRef]);
}
