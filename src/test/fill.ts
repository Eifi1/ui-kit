import type { UserEvent } from "@testing-library/user-event";

/**
 * Put `text` into `field` the way a paste or a password manager does: focus it, then one
 * change, rather than one render of the whole form per keystroke (refactor audit
 * 2026-10, TST-13 — register-form's suite took 12–15 s typing, 8 s pasting).
 *
 * For a test about the VALUE a form receives. A test about TYPING — a strength meter,
 * an input mask, a code field that cleans as you go, IME — still uses `user.type`.
 * Appends at the caret like a paste does; clear the field first to replace its value.
 */
export async function fill(user: UserEvent, field: HTMLElement, text: string): Promise<void> {
  await user.click(field);
  await user.paste(text);
}
