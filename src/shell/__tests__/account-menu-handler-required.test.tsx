import { describe, expect, it } from "vitest";
import type { AccountMenuLanguageProps } from "../account-menu-language";
import type { AccountMenuTextSizeProps } from "../account-menu-text-size";

/**
 * 0.52 code review, account-menu-language.tsx: renaming `onPick` to `onChange` (refactor
 * audit 2026-10-30, API-5) made both optional, so a row an app moved off `onPick` without
 * adding `onChange` — or with it misspelt — still compiled, and a pick did nothing. 0.53
 * removed `onPick`, and `onChange` is required; `tsc` reads the `@ts-expect-error` lines
 * below (a directive with no error under it fails the typecheck).
 */

const LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

describe("the account menu's rows require onChange", () => {
  it("refuses a row without `onChange`, a misspelt one, and the removed `onPick`, at build time", () => {
    // @ts-expect-error — no handler: a pick would only close the menu.
    const language: AccountMenuLanguageProps = { languages: LANGS, value: "en" };
    // @ts-expect-error — misspelt: `onChage` is no handler.
    const misspelt: AccountMenuLanguageProps = { languages: LANGS, value: "en", onChage: () => {} };
    // @ts-expect-error — `onPick` went in 0.53 (deprecated in 0.52): pass `onChange`.
    const picked: AccountMenuLanguageProps = { languages: LANGS, value: "en", onPick: () => {} };
    // @ts-expect-error — no handler: A− / A+ would change nothing.
    const textSize: AccountMenuTextSizeProps = { value: "normal" };
    expect([language, misspelt, picked, textSize]).toHaveLength(4);
  });
});
