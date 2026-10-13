import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsLayout } from "../../settings/settings-layout";
import { DEFAULT_SETTINGS_LABELS, useSettingsLabels, type SettingsLabels } from "../../settings/settings-labels";
import { InvitationsPanel } from "../../admin/invitations-panel";
import { useKitLabels } from "../../i18n/kit-labels";
import {
  ContrastSetting,
  TextSizeSetting,
  type ThemeSettingProps,
  type ThemeSettingSelectProps,
} from "../settings-fields";
import type { AmountInputProps } from "../amount-input";
import type { NumberInputProps } from "../number-input";
import { Combobox } from "../combobox";
import { InlineEntityCombobox } from "../inline-entity-combobox";
import { ChipInput } from "../chip-input";

/**
 * Types that said less than the code (refactor audit 2026-10, API-9). Most of this is
 * checked by `tsc --noEmit`, not at run time: each block below failed to compile before.
 */

const noop = () => {};

describe("labels props take what the merge takes: a partial at every depth", () => {
  it("compiles a nested partial on the components whose labels hold records", () => {
    // SettingsLayout's `groups` is a record of five groups of two strings each; one
    // group's title is a whole override. `Partial<SettingsLabels>` wanted all five.
    const layout = (
      <SettingsLayout
        groups={[]}
        entries={[]}
        basePath="/settings"
        renderGroup={() => null}
        labels={{ groups: { security: { title: "Sicherheit" } } }}
      />
    );
    const invitations = <InvitationsPanel invitations={[]} labels={{ status: { open: "Offen" } }} />;
    const size = <TextSizeSetting value="normal" onChange={noop} labels={{ textSizes: { large: "Gross" } }} />;
    const contrast = <ContrastSetting value="system" onChange={noop} labels={{ contrastModes: { more: "Mehr" } }} />;
    const typo = (
      <SettingsLayout
        groups={[]}
        entries={[]}
        basePath="/settings"
        renderGroup={() => null}
        // @ts-expect-error — not a key of a group's labels
        labels={{ groups: { security: { titel: "Sicherheit" } } }}
      />
    );
    expect([layout, invitations, size, contrast, typo]).toHaveLength(5);
  });

  it("merges the nested partial onto the other keys, through useKitLabels' own prop", () => {
    let fromHook: SettingsLabels | undefined;
    let fromKit: SettingsLabels | undefined;
    function Probe() {
      fromHook = useSettingsLabels({ groups: { security: { title: "Sicherheit" } } });
      fromKit = useKitLabels("settings", DEFAULT_SETTINGS_LABELS, { groups: { data: { help: "Deine Daten." } } });
      return null;
    }
    render(<Probe />);
    expect(fromHook?.groups.security).toEqual({ title: "Sicherheit", help: DEFAULT_SETTINGS_LABELS.groups.security.help });
    expect(fromHook?.groups.account).toEqual(DEFAULT_SETTINGS_LABELS.groups.account);
    expect(fromKit?.groups.data).toEqual({ title: DEFAULT_SETTINGS_LABELS.groups.data.title, help: "Deine Daten." });
  });
});

describe("Props types say what the component takes", () => {
  it("ThemeSettingProps is the union ThemeSetting takes; the Select half is ThemeSettingSelectProps", () => {
    const optionLabels = { system: "System", light: "Light", dark: "Dark" };
    const toggle: ThemeSettingProps = { variant: "toggle", value: "dark", onChange: noop, optionLabels };
    const select: ThemeSettingSelectProps = { value: "system", onChange: noop, label: "Theme", optionLabels };
    const either: ThemeSettingProps = select;
    expect([toggle, either]).toHaveLength(2);
  });

  it("AmountInputProps and NumberInputProps are exported", () => {
    const amount: AmountInputProps = { value: "12.50", onChange: noop, currency: "CHF" };
    const number: NumberInputProps = { value: "3", onChange: noop };
    expect([amount.value, number.value]).toEqual(["12.50", "3"]);
  });
});

describe("label is the visible label: a ReactNode on the combobox family and ChipInput", () => {
  const visible = (
    <>
      Payee <abbr title="required">*</abbr>
    </>
  );

  it("Combobox", () => {
    render(<Combobox value="" onChange={noop} options={["Migros"]} label={visible} />);
    expect(screen.getByRole("combobox", { name: /Payee/ })).toBeInTheDocument();
    expect(screen.getByTitle("required")).toBeInTheDocument();
  });

  it("InlineEntityCombobox", () => {
    render(<InlineEntityCombobox value={null} onChange={noop} options={[{ value: 1, label: "Migros" }]} label={visible} />);
    expect(screen.getByRole("combobox", { name: /Payee/ })).toBeInTheDocument();
  });

  it("ChipInput", () => {
    render(<ChipInput value={[]} onChange={noop} label={visible} />);
    expect(screen.getByRole("textbox", { name: /Payee/ })).toBeInTheDocument();
  });
});
