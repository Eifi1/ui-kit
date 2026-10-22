import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { LanguageMenu } from "../topbar-controls";
import { AccountMenuLanguage } from "../account-menu-language";
import { TopBarActionMenu } from "../topbar-action-menu";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsFr } from "../../i18n/locales/fr";

/** 0.49 KIT-10: the trigger names the language, not only its flag. */
const SWISS = [
  { code: "de-CH", label: "Deutsch", country: "ch" },
  { code: "fr-CH", label: "Français", country: "ch" },
  { code: "it-CH", label: "Italiano", country: "ch" },
];

describe("LanguageMenu trigger (KIT-10)", () => {
  it("shows the flag and the language code in capitals by default, named with the current language", () => {
    render(<LanguageMenu options={SWISS} current="fr-CH" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Choose language, current: Français" });
    expect(trigger).toHaveTextContent("FR");
    expect(trigger.querySelector(".fi-ch")).not.toBeNull();
  });

  it("tells de-CH, fr-CH and it-CH apart without opening", () => {
    const codes = SWISS.map((o) => {
      const { unmount } = render(<LanguageMenu options={SWISS} current={o.code} onChange={() => {}} />);
      const text = screen.getByRole("button", { name: /current/ }).textContent;
      unmount();
      return text;
    });
    expect(codes).toEqual(["DE", "FR", "IT"]);
  });

  it('trigger="code" drops the flag, trigger="flag" the code', () => {
    const { rerender } = render(<LanguageMenu options={SWISS} current="it-CH" onChange={() => {}} trigger="code" />);
    let trigger = screen.getByRole("button", { name: /current: Italiano/ });
    expect(trigger).toHaveTextContent("IT");
    expect(trigger.querySelector(".fi")).toBeNull();
    rerender(<LanguageMenu options={SWISS} current="it-CH" onChange={() => {}} trigger="flag" />);
    trigger = screen.getByRole("button", { name: /current: Italiano/ });
    expect(trigger).toHaveTextContent("");
    expect(trigger.querySelector(".fi-ch")).not.toBeNull();
  });

  it("names the trigger in the provider's language", () => {
    const { unmount } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <LanguageMenu options={SWISS} current="de-CH" onChange={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Sprache wählen, aktuell: Deutsch" })).toBeInTheDocument();
    unmount();
    render(
      <UiKitProvider labels={uiKitLabelsFr()}>
        <LanguageMenu options={SWISS} current="fr-CH" onChange={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Choisir la langue, actuelle : Français" })).toBeInTheDocument();
  });

  it("falls back to the plain name and a globe when nothing matches", () => {
    render(<LanguageMenu options={SWISS} current="xx" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Language" });
    expect(trigger).toHaveTextContent("");
  });

  it("an explicit aria-label names the trigger as given", () => {
    render(<LanguageMenu options={SWISS} current="de-CH" onChange={() => {}} aria-label="Sprache" />);
    expect(screen.getByRole("button", { name: "Sprache" })).toHaveTextContent("DE");
  });
});

describe("AccountMenuLanguage row (KIT-10)", () => {
  it("shows the active language's code beside its flag, so Swiss languages differ", () => {
    render(
      <MemoryRouter>
        <TopBarActionMenu aria-label="Account" icon={<span>A</span>} entries={[]}>
          {(close) => <AccountMenuLanguage languages={SWISS} value="it-CH" onPick={() => {}} close={close} />}
        </TopBarActionMenu>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    const row = screen.getByRole("menuitem", { name: /Language/ });
    expect(row).toHaveTextContent("IT");
    expect(row).toHaveAccessibleName(/Italiano/);
    expect(row.querySelector(".fi-ch")).not.toBeNull();
  });
});
