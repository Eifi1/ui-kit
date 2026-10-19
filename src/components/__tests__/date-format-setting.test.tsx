import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateFormatSetting } from "../date-format-setting";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

describe("DateFormatSetting (0.46, keksdose's date format)", () => {
  it("labels each option by the date it produces, auto by the language's", () => {
    render(<DateFormatSetting value="auto" onChange={() => {}} language="en" />);
    const select = screen.getByRole("combobox", { name: "Date format" });
    expect([...(select as HTMLSelectElement).options].map((o) => [o.value, o.text])).toEqual([
      ["auto", "Follow language — 01 Aug 2026"],
      ["de-DE", "01.08.2026"],
      ["en-GB", "01/08/2026"],
      ["en-US", "08/01/2026"],
      ["sv-SE", "2026-08-01"],
    ]);
    expect(select).toHaveAccessibleDescription(/Independent of the interface language/);
  });

  it("hands the picked preference over", async () => {
    const onChange = vi.fn();
    render(<DateFormatSetting value="auto" onChange={onChange} language="en" />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "sv-SE");
    expect(onChange).toHaveBeenCalledWith("sv-SE");
  });

  it("speaks the provider's language and samples its shape; label and hint can be the app's or none", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <DateFormatSetting value="de-DE" onChange={() => {}} />
        <DateFormatSetting value="auto" onChange={() => {}} label="Datum" hint={null} />
      </UiKitProvider>,
    );
    const [kit, own] = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(kit).toHaveAccessibleName("Datumsformat");
    expect(kit.options[0].text).toMatch(/^Der Sprache folgen — 01\. Aug\.? 2026$/);
    expect(kit).toHaveValue("de-DE");
    expect(own).toHaveAccessibleName("Datum");
    expect(own).not.toHaveAccessibleDescription(/Datumsangaben/);
  });
});
