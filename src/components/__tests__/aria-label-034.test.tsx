import type { ReactElement, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";
import { CalculatorButton } from "../calculator";
import { MoneyField } from "../money-field";
import { NumberInput } from "../number-input";
import { IntegerField, NumberField } from "../number-field";
import { WizardStepper } from "../wizard-stepper";
import { Form } from "../../rhf/form";
import { RhfIntegerField, RhfMoneyField, RhfNumberField } from "../../rhf/fields";
import { OptionSwitcherMenu } from "../../shell/option-switcher-menu";
import { RoleSwitcher } from "../../shell/role-switcher";
import { TopBarActionMenu } from "../../shell/topbar-action-menu";
import { LanguageMenu, PaletteMenu, ThemeToggle } from "../../shell/topbar-controls";
import { PALETTES } from "../../theme/palette-presets";

/**
 * API-1 (refactor audit 2026-10): sixteen components took only the camelCase
 * `ariaLabel`, after 0.34 (Q2) made `aria-label` the accessible-name prop everywhere
 * else. Each now takes `aria-label`, which wins when both are given; `ariaLabel` keeps
 * working until 0.35 and is `@deprecated`.
 */

/** A name prop in either spelling, or both. */
type Name = { "aria-label"?: string; ariaLabel?: string };

function RhfHarness({ children }: { children: ReactNode }) {
  const form = useForm<{ amount: number | null; count: number | null }>({ defaultValues: { amount: 12, count: 3 } });
  return (
    <Form {...form}>
      <form>{children}</form>
    </Form>
  );
}

const noop = () => {};
const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

// Each component, rendered with a name, and the role its named element takes.
const CASES: Array<[string, (name: Name) => ReactElement, string]> = [
  ["AmountInput", (n) => <AmountInput value="1" onChange={noop} {...n} />, "textbox"],
  ["MoneyField", (n) => <MoneyField value={1} onCommit={noop} {...n} />, "textbox"],
  ["NumberInput", (n) => <NumberInput value="1" onChange={noop} {...n} />, "textbox"],
  ["NumberField", (n) => <NumberField value={1} onCommit={noop} {...n} />, "textbox"],
  ["IntegerField", (n) => <IntegerField value={1} onCommit={noop} {...n} />, "textbox"],
  ["CalculatorButton", (n) => <CalculatorButton value="1" onChange={noop} {...n} />, "button"],
  ["RhfNumberField", (n) => <RhfHarness><RhfNumberField name="count" {...n} /></RhfHarness>, "textbox"],
  ["RhfIntegerField", (n) => <RhfHarness><RhfIntegerField name="count" {...n} /></RhfHarness>, "textbox"],
  ["RhfMoneyField", (n) => <RhfHarness><RhfMoneyField name="amount" currency="CHF" {...n} /></RhfHarness>, "textbox"],
  ["WizardStepper", (n) => <WizardStepper steps={[{ key: "a", label: "Upload" }]} current="a" {...n} />, "list"],
  ["ThemeToggle", (n) => <ThemeToggle mode="light" onToggle={noop} {...n} />, "button"],
  ["PaletteMenu", (n) => <PaletteMenu palettes={PALETTES} activeId={PALETTES[0].id} mode="light" onSelect={noop} {...n} />, "button"],
  ["LanguageMenu", (n) => <LanguageMenu options={[{ code: "en", label: "English", country: "gb" }]} current="en" onChange={noop} {...n} />, "button"],
  ["RoleSwitcher", (n) => <RoleSwitcher roles={["admin", "viewer"]} value="admin" onChange={noop} {...n} />, "button"],
  // Required there: one of the two spellings, so each row passes the one it tests.
  [
    "OptionSwitcherMenu",
    (n) => <OptionSwitcherMenu icon={<span />} options={OPTIONS} value="a" onSelect={noop} {...(n as { "aria-label": string })} />,
    "button",
  ],
  [
    "TopBarActionMenu",
    (n) => (
      <MemoryRouter>
        <TopBarActionMenu icon={<span />} entries={[]} {...(n as { "aria-label": string })} />
      </MemoryRouter>
    ),
    "button",
  ],
];

describe("aria-label on the sixteen camelCase holdouts (API-1)", () => {
  it.each(CASES)("%s is named by aria-label", (_, view, role) => {
    render(view({ "aria-label": "Given name" }));
    expect(screen.getByRole(role, { name: "Given name" })).toBeInTheDocument();
  });

  it.each(CASES)("%s is still named by the deprecated ariaLabel", (_, view, role) => {
    render(view({ ariaLabel: "Old name" }));
    expect(screen.getByRole(role, { name: "Old name" })).toBeInTheDocument();
  });

  it.each(CASES)("%s takes aria-label over ariaLabel when both are given", (_, view, role) => {
    render(view({ "aria-label": "Given name", ariaLabel: "Old name" }));
    expect(screen.getByRole(role, { name: "Given name" })).toBeInTheDocument();
    expect(screen.queryByRole(role, { name: "Old name" })).toBeNull();
  });
});

describe("a required name stays required (API-1)", () => {
  it("OptionSwitcherMenu and TopBarActionMenu take either spelling, and refuse neither", () => {
    // Compile-time: `tsc --noEmit` fails if either directive below goes unused.
    const ok = [
      <OptionSwitcherMenu key="1" icon={null} options={OPTIONS} value="a" onSelect={noop} aria-label="Env" />,
      <OptionSwitcherMenu key="2" icon={null} options={OPTIONS} value="a" onSelect={noop} ariaLabel="Env" />,
      <TopBarActionMenu key="3" entries={[]} aria-label="Help" />,
      <TopBarActionMenu key="4" entries={[]} ariaLabel="Help" />,
      // @ts-expect-error — a menu with no name at all
      <OptionSwitcherMenu key="5" icon={null} options={OPTIONS} value="a" onSelect={noop} />,
      // @ts-expect-error — a menu with no name at all
      <TopBarActionMenu key="6" entries={[]} />,
    ];
    expect(ok).toHaveLength(6);
  });
});
