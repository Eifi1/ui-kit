import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Whether a key press belongs to an IME composition (Chinese, Japanese, Korean input):
 * `isComposing` while the composition is open, or `keyCode` 229, which is how Safari
 * reports the key that ENDED one — its keydown arrives after `compositionend`, with
 * `isComposing` already false (the note in `feedback-thread.tsx`). Takes a React event
 * or a native one.
 */
export function isComposing(e: KeyboardEvent | ReactKeyboardEvent): boolean {
  const native = "nativeEvent" in e ? e.nativeEvent : e;
  return native.isComposing || native.keyCode === 229;
}

/**
 * An Enter that confirms an IME composition rather than the field (round 0.34 Wave 2,
 * BUG-9). It picks the IME's candidate, so a list must not also take the highlighted
 * option and a field must not submit: every Enter branch in the combobox family returns
 * early on it. Typing 北京 with a pinyin IME is "beijing", then Enter — and that Enter
 * chose option 1, or created a category through `onSubmit` (keksdose's budget cells).
 */
export function isImeEnter(e: KeyboardEvent | ReactKeyboardEvent): boolean {
  return e.key === "Enter" && isComposing(e);
}
