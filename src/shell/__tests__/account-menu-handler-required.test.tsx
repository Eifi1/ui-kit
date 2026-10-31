import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountMenuLanguage, type AccountMenuLanguageProps } from "../account-menu-language";
import { AccountMenuTextSize, type AccountMenuTextSizeProps } from "../account-menu-text-size";

/**
 * 0.52 code review, account-menu-language.tsx: renaming `onPick` to `onChange` (refactor
 * audit 2026-10-30, API-5) made both optional, so a row an app moved off `onPick` without
 * adding `onChange` — or with it misspelt — still compiled, and a pick did nothing. One of
 * the two is required now; `tsc` reads the `@ts-expect-error` lines below (a directive
 * with no error under it fails the typecheck), and the rows still work with either.
 */

const LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

describe("the account menu's rows require a handler", () => {
  it("refuses a row with neither `onChange` nor `onPick`, at build time", () => {
    // @ts-expect-error — no handler: a pick would only close the menu.
    const language: AccountMenuLanguageProps = { languages: LANGS, value: "en" };
    // @ts-expect-error — misspelt: `onChage` is no handler.
    const misspelt: AccountMenuLanguageProps = { languages: LANGS, value: "en", onChage: () => {} };
    // @ts-expect-error — no handler: A− / A+ would change nothing.
    const textSize: AccountMenuTextSizeProps = { value: "normal" };
    expect([language, misspelt, textSize]).toHaveLength(3);
  });

  it("takes `onChange`, the deprecated `onPick`, or both — `onChange` answering", () => {
    const onChange = vi.fn();
    const onPick = vi.fn();
    render(
      <ul>
        <AccountMenuLanguage languages={LANGS} value="en" onChange={onChange} onPick={onPick} />
        <AccountMenuTextSize value="normal" onPick={onPick} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    fireEvent.click(screen.getByText("Français"));
    expect(onChange).toHaveBeenCalledWith("fr");
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(onPick).toHaveBeenCalledWith("large");
  });
});
