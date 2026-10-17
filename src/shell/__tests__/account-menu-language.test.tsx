import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AccountMenuLanguage } from "../account-menu-language";
import { TopBarActionMenu } from "../topbar-action-menu";
import { UiKitProvider } from "../../i18n/kit-labels";

/** docs/top-bar-harmonization.md §2.3: keksdose's language sub-list in the account menu. */

const LANGS = [
  { code: "de-CH", label: "Deutsch", flag: <span aria-hidden data-flag="ch" /> },
  { code: "en", label: "English", flag: <span aria-hidden data-flag="gb" /> },
  { code: "fr", label: "Français" },
];

function Menu({ onPick = () => {}, value = "en" }: { onPick?: (code: string) => void; value?: string }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu aria-label="Account" icon={<span>A</span>} entries={[]}>
        {(close) => <AccountMenuLanguage languages={LANGS} value={value} onPick={onPick} close={close} />}
      </TopBarActionMenu>
    </MemoryRouter>
  );
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Account" }));
// Inside the menu HoverMenu makes the disclosure's header a menu row.
const languageRow = () => screen.getByRole("menuitem", { name: /Language/ });

describe("AccountMenuLanguage", () => {
  it("is a closed menu row with the globe, the name and the active flag", () => {
    const { container } = render(<Menu />);
    openMenu();
    expect(languageRow()).toHaveAttribute("aria-expanded", "false");
    expect(languageRow().querySelector('[data-flag="gb"]')).not.toBeNull();
    expect(container.ownerDocument.querySelector('[role="menuitemradio"]')).toBeNull();
  });

  it("opens onto one checked row per language, each with its flag", () => {
    render(<Menu />);
    openMenu();
    fireEvent.click(languageRow());
    const rows = screen.getAllByRole("menuitemradio");
    expect(rows.map((r) => r.textContent)).toEqual(["Deutsch", "English", "Français"]);
    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Deutsch" })).toHaveAttribute("aria-checked", "false");
    expect(rows[0].querySelector('[data-flag="ch"]')).not.toBeNull();
  });

  it("a pick calls onPick and closes the menu", () => {
    const onPick = vi.fn();
    render(<Menu onPick={onPick} />);
    openMenu();
    fireEvent.click(languageRow());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Deutsch" }));
    expect(onPick).toHaveBeenCalledWith("de-CH");
    expect(screen.queryByRole("menuitemradio", { name: "Deutsch" })).toBeNull();
    expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("aria-expanded", "false");
  });

  it("works without close: the sub-list folds, the pick still lands", () => {
    const onPick = vi.fn();
    render(
      <ul>
        <AccountMenuLanguage languages={LANGS} value="fr" onPick={onPick} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    fireEvent.click(screen.getByText("English"));
    expect(onPick).toHaveBeenCalledWith("en");
    expect(screen.getByRole("button", { name: /Language/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("names itself with topBar.language from the provider; `label` wins", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ topBar: { language: "Sprache" } }}>
        <ul>
          <AccountMenuLanguage languages={LANGS} value="en" onPick={() => {}} />
        </ul>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: /Sprache/ })).toBeInTheDocument();
    rerender(
      <ul>
        <AccountMenuLanguage languages={LANGS} value="en" onPick={() => {}} label="Lingua" />
      </ul>,
    );
    expect(screen.getByRole("button", { name: /Lingua/ })).toBeInTheDocument();
  });
});
