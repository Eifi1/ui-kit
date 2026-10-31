import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountMenuTextSize } from "../account-menu-text-size";
import { AccountMenuLanguage } from "../account-menu-language";
import { TopBarActionMenu } from "../topbar-action-menu";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { applyTextSize, type TextSize } from "../../theme/text-size";

/** keksdose live #426 (its `TextSizeRow`, account-menu.tsx): A− / A+ beside the language. */

function Menu({ value, onChange = () => {} }: { value?: TextSize; onChange?: (size: TextSize) => void }) {
  return (
    <MemoryRouter>
      <TopBarActionMenu aria-label="Account" icon={<span>A</span>} entries={[]}>
        {(close) => (
          <>
            <AccountMenuLanguage
              languages={[{ code: "en", label: "English" }]}
              value="en"
              onChange={() => {}}
              close={close}
            />
            <AccountMenuTextSize value={value} onChange={onChange} />
          </>
        )}
      </TopBarActionMenu>
    </MemoryRouter>
  );
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Account" }));
const smaller = () => screen.getByRole("menuitem", { name: "Smaller text" });
const larger = () => screen.getByRole("menuitem", { name: "Larger text" });

afterEach(() => document.documentElement.removeAttribute("data-text-size"));

describe("AccountMenuTextSize", () => {
  it("names the size in force in a live region, its two buttons menu rows", () => {
    render(<Menu value="large" />);
    openMenu();
    expect(screen.getByText("Text size")).toBeInTheDocument();
    const current = screen.getByText("Large");
    expect(current).toHaveAttribute("aria-live", "polite");
    expect(smaller()).toBeEnabled();
    expect(larger()).toBeEnabled();
  });

  it("steps one size down or up and keeps the menu open", () => {
    const onChange = vi.fn();
    render(<Menu value="large" onChange={onChange} />);
    openMenu();
    fireEvent.click(larger());
    expect(onChange).toHaveBeenLastCalledWith("xlarge");
    fireEvent.click(smaller());
    expect(onChange).toHaveBeenLastCalledWith("normal");
    expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("aria-expanded", "true");
  });

  it("still takes the deprecated `onPick` (0.52 → removed in 0.53)", () => {
    const onPick = vi.fn();
    render(
      <ul>
        <AccountMenuTextSize value="normal" onPick={onPick} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    expect(onPick).toHaveBeenCalledWith("large");
  });

  it("disables A− at Normal and A+ at Extra large", () => {
    const { rerender } = render(<Menu value="normal" />);
    openMenu();
    expect(smaller()).toBeDisabled();
    expect(larger()).toBeEnabled();
    rerender(<Menu value="xlarge" />);
    expect(smaller()).toBeEnabled();
    expect(larger()).toBeDisabled();
  });

  it("without `value`, follows the size on <html>", () => {
    const onChange = vi.fn();
    render(<Menu onChange={onChange} />);
    openMenu();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    act(() => applyTextSize("xlarge"));
    expect(screen.getByText("Extra large")).toBeInTheDocument();
    expect(larger()).toBeDisabled();
    fireEvent.click(smaller());
    expect(onChange).toHaveBeenCalledWith("large");
  });

  it("speaks the provider's language (de-CH: Swiss spelling)", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <Menu value="normal" />
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByRole("menuitem", { name: "Grössere Schrift" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Kleinere Schrift" })).toBeDisabled();
  });
});
