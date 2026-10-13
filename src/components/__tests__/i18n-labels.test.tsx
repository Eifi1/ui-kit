import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AmountInput } from "../amount-input";
import { CurrencySelect } from "../currency-select";
import { TwoFactorSetting, type TwoFactorSettingLabels } from "../../account/account-settings";
import { resolveDataTableLabels } from "../data-table-shared";
import { missingKitLabels } from "../../i18n/kit-labels";
import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";

/**
 * The places where the kit's own "no strings" rule leaked (audit 2026-09-22,
 * §i18n / string contract).
 *
 * The rule is that every user-facing string is a prop with an English default, so a
 * German app is German all the way down. These four were exceptions, and each one is
 * a different way of breaking the rule while appearing to keep it:
 *
 *  - 27 currency NAMES were data, not labels, so the one thing a consumer could not
 *    translate was the only English word in the row (`Euro`, `Swiss Franc`);
 *  - `placeholder` did double duty as the trigger's empty text AND the search box's
 *    placeholder, so a caller who named the field could not name the search, and
 *    whatever they wrote for one appeared verbatim in the other;
 *  - the pagination footer and the column-count heading were template literals
 *    around a translated word, which is untranslatable in the languages where the
 *    number moves;
 *  - `alt="QR"` was simply hardcoded.
 *
 * Each test here asserts a TRANSLATED value reaching the DOM, not merely that a prop
 * exists: the failure these replace was a prop that existed and was ignored.
 */

function Picker(props: Partial<React.ComponentProps<typeof CurrencySelect>>) {
  const [code, setCode] = useState("");
  return <CurrencySelect value={code} onChange={setCode} {...props} />;
}

const GERMAN_CURRENCIES = { EUR: "Euro", CHF: "Schweizer Franken", USD: "US-Dollar" };

describe("CurrencySelect strings", () => {
  it("renders a translated currency name from `currencyNames`", () => {
    render(<Picker currencyNames={GERMAN_CURRENCIES} />);
    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Schweizer Franken")).toBeInTheDocument();
    expect(screen.queryByText("Swiss Franc")).not.toBeInTheDocument();
  });

  it("keeps the English name for a code the override does not mention", () => {
    render(<Picker currencyNames={{ CHF: "Schweizer Franken" }} />);
    fireEvent.click(screen.getByRole("combobox"));

    // A consumer translating the eight currencies their app actually uses must not
    // lose the other nineteen.
    expect(screen.getByText("Japanese Yen")).toBeInTheDocument();
  });

  it("searches the TRANSLATED name, not the English one underneath it", () => {
    render(<Picker currencyNames={GERMAN_CURRENCIES} labels={{ search: "Währung suchen" }} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByPlaceholderText("Währung suchen"), {
      target: { value: "Franken" },
    });

    expect(screen.getByText("Schweizer Franken")).toBeInTheDocument();
    // The list is filtered, so an untranslated row is gone rather than merely absent
    // from view.
    expect(screen.queryByText("Japanese Yen")).not.toBeInTheDocument();
  });

  it("names the search box from `labels.search` instead of reusing `placeholder`", () => {
    render(<Picker placeholder="Währung" labels={{ search: "Währung suchen" }} />);
    // The empty trigger keeps saying what the FIELD is…
    expect(screen.getByRole("combobox")).toHaveTextContent("Währung");

    fireEvent.click(screen.getByRole("combobox"));
    // …and the search box says what TYPING there does, which is the distinction the
    // single `placeholder` could not make.
    expect(screen.getByPlaceholderText("Währung suchen")).toBeInTheDocument();
  });

  it("falls back to `labels.currency` for the empty trigger", () => {
    render(<Picker labels={{ currency: "Währung" }} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Währung");
  });

  it("still reads in English with no labels at all", () => {
    render(<Picker />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Currency");

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText("Search currency")).toBeInTheDocument();
    expect(screen.getByText("Swiss Franc")).toBeInTheDocument();
  });
});

describe("AmountInput currency names", () => {
  it("renders a translated currency name in the chip's picker", () => {
    render(
      <AmountInput
        value="12"
        onChange={() => {}}
        currency="EUR"
        onCurrencyChange={() => {}}
        currencyNames={GERMAN_CURRENCIES}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Currency: EUR" }));

    expect(screen.getByText("Schweizer Franken")).toBeInTheDocument();
    expect(screen.queryByText("Swiss Franc")).not.toBeInTheDocument();
  });
});

const TWO_FACTOR_LABELS: TwoFactorSettingLabels = {
  status: "Zwei-Faktor-Authentifizierung",
  enabledText: "an",
  disabledText: "aus",
  enable: "Einrichten",
  scanHint: "Scannen Sie diesen Code mit Ihrer Authenticator-App.",
  codeLabel: "Bestätigungscode",
  verify: "Prüfen und aktivieren",
  disableSection: "Abschalten",
  password: "Aktuelles Passwort",
  disable: "Abschalten",
};

describe("TwoFactorSetting strings", () => {
  const setup = { qrSvg: "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=", secret: "JBSW" };

  it("takes the QR image's alt text from `labels.qrAlt`", () => {
    render(
      <TwoFactorSetting
        enabled={false}
        setup={setup}
        onStartSetup={() => {}}
        onEnable={() => {}}
        onDisable={() => {}}
        labels={{ ...TWO_FACTOR_LABELS, qrAlt: "QR-Code für die Authenticator-App" }}
      />,
    );

    expect(screen.getByAltText("QR-Code für die Authenticator-App")).toBeInTheDocument();
  });

  it("falls back to English when the key is absent", () => {
    render(
      <TwoFactorSetting
        enabled={false}
        setup={setup}
        onStartSetup={() => {}}
        onEnable={() => {}}
        onDisable={() => {}}
        labels={TWO_FACTOR_LABELS}
      />,
    );

    expect(screen.getByAltText("QR code")).toBeInTheDocument();
  });
});

// `missingDataTableLabels` left in 0.35 for `missingKitLabels`, which checks every namespace,
// the table's among them; `resolveDataTableLabels` stayed as DataTable's own (round 0.35 R1).
describe("the table's labels, checked with missingKitLabels", () => {
  it("names every key a caller left English", () => {
    const missing = missingKitLabels({ dataTable: { columns: "Spalten", filter: "Filtern" } }, DEFAULT_UI_KIT_LABELS);

    expect(missing).not.toContain("dataTable.columns");
    expect(missing).not.toContain("dataTable.filter");
    // The nineteen lenkbank ships in a German UI today are all in here; these four
    // stand for them.
    expect(missing).toContain("dataTable.selectAllRows");
    expect(missing).toContain("dataTable.pageSize");
    expect(missing).toContain("dataTable.numberAbs");
    expect(missing).toContain("dataTable.pageRange");
  });

  it("reaches into `presets`, which is a Record and merges key by key", () => {
    const missing = missingKitLabels({ dataTable: { presets: { today: "Heute" } } }, DEFAULT_UI_KIT_LABELS);

    expect(missing).not.toContain("dataTable.presets.today");
    expect(missing).toContain("dataTable.presets.yesterday");
    // Never the container itself: "presets" as an answer tells a reader nothing about
    // which of the eleven are English.
    expect(missing).not.toContain("dataTable.presets");
  });

  it("DataTable derives the count from a translated `columns`", () => {
    // `columnsCount` is built from a translated `columns`, so an app that translated the
    // key that existed before the count does not get "Columns (4/9)" back in English.
    expect(resolveDataTableLabels({ columns: "Spalten" }).columnsCount(4, 9)).toBe("Spalten (4/9)");
  });
});
