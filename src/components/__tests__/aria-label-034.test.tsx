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
 * else. 0.34 added `aria-label` and deprecated `ariaLabel`; 0.35 removed it (round 0.35
 * R1), so `aria-label` is the one spelling.
 */

type Name = { "aria-label": string };

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
  [
    "RhfNumberField",
    (n) => (
      <RhfHarness>
        <RhfNumberField name="count" {...n} />
      </RhfHarness>
    ),
    "textbox",
  ],
  [
    "RhfIntegerField",
    (n) => (
      <RhfHarness>
        <RhfIntegerField name="count" {...n} />
      </RhfHarness>
    ),
    "textbox",
  ],
  [
    "RhfMoneyField",
    (n) => (
      <RhfHarness>
        <RhfMoneyField name="amount" currency="CHF" {...n} />
      </RhfHarness>
    ),
    "textbox",
  ],
  ["WizardStepper", (n) => <WizardStepper steps={[{ key: "a", label: "Upload" }]} current="a" {...n} />, "list"],
  ["ThemeToggle", (n) => <ThemeToggle mode="light" onToggle={noop} {...n} />, "button"],
  [
    "PaletteMenu",
    (n) => <PaletteMenu palettes={PALETTES} activeId={PALETTES[0].id} mode="light" onSelect={noop} {...n} />,
    "button",
  ],
  [
    "LanguageMenu",
    (n) => (
      <LanguageMenu options={[{ code: "en", label: "English", country: "gb" }]} current="en" onChange={noop} {...n} />
    ),
    "button",
  ],
  ["RoleSwitcher", (n) => <RoleSwitcher roles={["admin", "viewer"]} value="admin" onChange={noop} {...n} />, "button"],
  [
    "OptionSwitcherMenu",
    (n) => <OptionSwitcherMenu icon={<span />} options={OPTIONS} value="a" onSelect={noop} {...n} />,
    "button",
  ],
  [
    "TopBarActionMenu",
    (n) => (
      <MemoryRouter>
        <TopBarActionMenu icon={<span />} entries={[]} {...n} />
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

  it("takes no other spelling: the deprecated ariaLabel went in 0.35 (round 0.35 R1)", () => {
    // Compile-time: `tsc --noEmit` fails if a directive below goes unused — that is, if
    // one of the sixteen took `ariaLabel` again.
    const gone = [
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <AmountInput key="1" value="1" onChange={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <MoneyField key="2" value={1} onCommit={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <NumberInput key="3" value="1" onChange={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <NumberField key="4" value={1} onCommit={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <IntegerField key="5" value={1} onCommit={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <CalculatorButton key="6" value="1" onChange={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <RhfNumberField key="7" name="count" ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <RhfIntegerField key="8" name="count" ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <RhfMoneyField key="9" name="amount" currency="CHF" ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <WizardStepper key="10" steps={[]} current="a" ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <ThemeToggle key="11" mode="light" onToggle={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <PaletteMenu key="12" palettes={PALETTES} activeId="x" mode="light" onSelect={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <LanguageMenu key="13" options={[]} current="en" onChange={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <RoleSwitcher key="14" roles={["admin"]} value="admin" onChange={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <OptionSwitcherMenu key="15" icon={null} options={OPTIONS} value="a" onSelect={noop} ariaLabel="Old" />,
      // @ts-expect-error — `ariaLabel` is gone: pass `aria-label`.
      <TopBarActionMenu key="16" entries={[]} ariaLabel="Old" />,
    ];
    expect(gone).toHaveLength(16);
  });
});

describe("a required name stays required (API-1)", () => {
  it("OptionSwitcherMenu and TopBarActionMenu refuse a menu with no name", () => {
    // Compile-time: `tsc --noEmit` fails if either directive below goes unused.
    const ok = [
      <OptionSwitcherMenu key="1" icon={null} options={OPTIONS} value="a" onSelect={noop} aria-label="Env" />,
      <TopBarActionMenu key="2" entries={[]} aria-label="Help" />,
      // @ts-expect-error — a menu with no name at all
      <OptionSwitcherMenu key="3" icon={null} options={OPTIONS} value="a" onSelect={noop} />,
      // @ts-expect-error — a menu with no name at all
      <TopBarActionMenu key="4" entries={[]} />,
    ];
    expect(ok).toHaveLength(4);
  });
});
