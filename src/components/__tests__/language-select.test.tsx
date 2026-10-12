import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelect } from "../language-select";
import { LanguageSetting } from "../settings-fields";
import { languageOptions, type KitLanguageCode } from "../../i18n/languages";

describe("LanguageSelect", () => {
  it("lists the offered codes by their own names, in the order given, each in its language", () => {
    render(<LanguageSelect label="Invitation language" codes={["fr", "de-CH", "zh"]} value="de-CH" onChange={() => {}} />);
    const select = screen.getByLabelText("Invitation language");
    const options = Array.from(select.querySelectorAll("option"));
    expect(options.map((o) => [o.value, o.textContent, o.getAttribute("lang")])).toEqual([
      ["fr", "Français", "fr-FR"],
      ["de-CH", "Deutsch", "de-CH"],
      ["zh", "简体中文", "zh-CN"],
    ]);
    expect(select).toHaveValue("de-CH");
  });

  it("offers all seven by default", () => {
    render(<LanguageSelect label="Language" value="en" onChange={() => {}} />);
    expect(screen.getAllByRole("option")).toHaveLength(7);
  });

  it("is controlled, and hands back the picked code", async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<string>("en");
      return (
        <LanguageSelect
          label="Invitation language"
          codes={["de-CH", "en", "it"]}
          value={value}
          onChange={(code: KitLanguageCode) => {
            setValue(code);
            onChange(code);
          }}
        />
      );
    }
    render(<Harness />);
    const select = screen.getByLabelText("Invitation language");
    await userEvent.selectOptions(select, "Italiano");
    expect(onChange).toHaveBeenCalledWith("it");
    expect(select).toHaveValue("it");
  });

  it("shows the offered code a tag resolves to, without writing it back", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LanguageSelect label="Language" codes={["de-CH", "en"]} value="de-AT" onChange={onChange} />,
    );
    const select = screen.getByLabelText("Language");
    expect(select).toHaveValue("de-CH");
    rerender(<LanguageSelect label="Language" codes={["de-CH", "en"]} value="en-US" onChange={onChange} />);
    expect(select).toHaveValue("en");
    // Nothing answers: the fallback resolveLanguage picks, de-CH when offered.
    rerender(<LanguageSelect label="Language" codes={["en", "de-CH"]} value="pt-BR" onChange={onChange} />);
    expect(select).toHaveValue("de-CH");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("takes the app's own option text, unmarked by language", () => {
    render(
      <LanguageSelect
        label="Reviewer language"
        codes={["hu", "es"]}
        value="hu"
        onChange={() => {}}
        optionLabel={(language) => language.englishName}
      />,
    );
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Hungarian", "Spanish"]);
    expect(options[0]).not.toHaveAttribute("lang");
  });

  it("reads like every kit field: hint caption and error described in order, Select props pass through", () => {
    render(
      <LanguageSelect
        label="Invitation language"
        value="fr"
        onChange={() => {}}
        hint="The mail goes out in this language"
        error="Choose a language"
        required
        name="locale"
      />,
    );
    const select = screen.getByLabelText("Invitation language");
    const hint = screen.getByText("The mail goes out in this language");
    const error = screen.getByText("Choose a language");
    expect(select).toHaveAttribute("aria-describedby", `${hint.id} ${error.id}`);
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toBeRequired();
    expect(select).toHaveAttribute("name", "locale");
  });
});

describe("LanguageSetting, built on LanguageSelect (refactor audit 2026-10, API-7)", () => {
  it("marks each option with its language and keeps the app's own row text (keksdose's 'Deutsch (Schweiz)')", () => {
    render(
      <LanguageSetting
        label="Language"
        value="de-CH"
        onChange={() => {}}
        options={[
          { code: "de-CH", label: "Deutsch (Schweiz)" },
          { code: "en", label: "English" },
          { code: "fr", label: "Français" },
        ]}
      />,
    );
    const options = Array.from(screen.getByLabelText("Language").querySelectorAll("option"));
    expect(options.map((o) => [o.value, o.textContent, o.getAttribute("lang")])).toEqual([
      ["de-CH", "Deutsch (Schweiz)", "de-CH"],
      ["en", "English", "en-GB"],
      ["fr", "Français", "fr-FR"],
    ]);
  });

  it("takes languageOptions' rows as they come (kastlan, Kurvenschmiede): the registry's names, each in its language", () => {
    render(<LanguageSetting label="Language" value="hu" onChange={() => {}} options={languageOptions(["it", "hu"])} />);
    const options = screen.getAllByRole("option");
    expect(options.map((o) => [o.textContent, o.getAttribute("lang")])).toEqual([
      ["Italiano", "it-IT"],
      ["Magyar", "hu-HU"],
    ]);
  });

  it("shows the row a stored tag resolves to, as LanguageSelect does, and hands back the picked code", async () => {
    const onChange = vi.fn();
    render(<LanguageSetting label="Language" value="de-AT" onChange={onChange} options={languageOptions(["en", "de-CH"])} />);
    const select = screen.getByLabelText("Language");
    expect(select).toHaveValue("de-CH");
    await userEvent.selectOptions(select, "English");
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("LanguageSelect: optionLang=\"own\" marks an app's own names that are still in each language", () => {
    render(
      <LanguageSelect
        label="Language"
        codes={["de-CH", "fr"]}
        value="fr"
        onChange={() => {}}
        optionLabel={(language) => (language.code === "de-CH" ? "Deutsch (Schweiz)" : language.nativeName)}
        optionLang="own"
      />,
    );
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("lang"))).toEqual(["de-CH", "fr-FR"]);
  });
});
