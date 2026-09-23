import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import {
  AlertBanner,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Chip,
  ChipInput,
  EmptyState,
  FieldChevron,
  FieldHint,
  FieldLabel,
  FloatingField,
  IconButton,
  Input,
  LanguageSetting,
  SearchField,
  Select,
  Spinner,
  Tabs,
  Textarea,
  ThemeSetting,
  ToggleGroup,
  UserAvatar,
} from "../../index";
import type {
  AlertBannerProps,
  ButtonProps,
  CardProps,
  ChipInputProps,
  ChipProps,
  EmptyStateProps,
  FieldChevronProps,
  FieldHintProps,
  FieldLabelProps,
  FloatingFieldProps,
  IconButtonProps,
  InputProps,
  LanguageSettingProps,
  SearchFieldProps,
  SelectProps,
  SpinnerProps,
  TabsProps,
  TextareaProps,
  ThemeSettingProps,
  ToggleGroupProps,
  UserAvatarProps,
} from "../../index";

/**
 * Wave 4 of the 2026-09-22 audit, "Public API design": every component in this slice
 * must (1) name its own props type, (2) let an arbitrary attribute through to its root
 * element, and (3) answer to the DOM spelling of the accessible name.
 *
 * (2) is the one with a bug behind it rather than a preference. ~35 components took a
 * CLOSED prop list, so nothing arbitrary could reach them — and the first casualty was
 * this package's own guided tour, which anchors by `data-tour` and therefore could not
 * point at a ToggleGroup, a Card or an avatar. Keksdose's rule editor carries a comment
 * explaining that it wraps `ToggleGroup` in a bare `<div>` for exactly this reason. A
 * consumer should not have to invent a wrapper element to hang a test id on.
 *
 * (3) is three spellings for one idea: `ariaLabel` on thirteen components, the DOM
 * `aria-label` on the two comboboxes, `label` on SearchField and Tabs. The DOM spelling
 * wins because it is the one that arrives for free with (2) — but the old spellings
 * keep working, because three applications are shipping them today.
 */

/** Does an arbitrary attribute survive the trip to the DOM? */
function reaches(ui: React.ReactElement): boolean {
  const { container } = render(ui);
  return container.querySelector('[data-tour="anchor"]') !== null;
}

const TOGGLE_OPTIONS = [
  { value: "a" as const, label: "A" },
  { value: "b" as const, label: "B" },
];

const TABS = [{ id: "one" as const, label: "One" }];

describe("every component passes an arbitrary attribute to its root element", () => {
  it("Button", () => {
    expect(reaches(<Button data-tour="anchor">Go</Button>)).toBe(true);
  });

  it("IconButton", () => {
    expect(reaches(<IconButton data-tour="anchor" aria-label="Edit" />)).toBe(true);
  });

  it("Input", () => {
    expect(reaches(<Input data-tour="anchor" aria-label="Name" />)).toBe(true);
  });

  it("Select", () => {
    expect(reaches(<Select data-tour="anchor" aria-label="Pick" />)).toBe(true);
  });

  it("Textarea", () => {
    expect(reaches(<Textarea data-tour="anchor" aria-label="Notes" />)).toBe(true);
  });

  it("Card", () => {
    expect(reaches(<Card data-tour="anchor">body</Card>)).toBe(true);
  });

  it("Spinner", () => {
    expect(reaches(<Spinner data-tour="anchor" />)).toBe(true);
  });

  it("EmptyState", () => {
    expect(reaches(<EmptyState title="Nothing here" data-tour="anchor" />)).toBe(true);
  });

  it("FieldChevron", () => {
    expect(reaches(<FieldChevron data-tour="anchor" />)).toBe(true);
  });

  it("FieldLabel", () => {
    expect(reaches(<FieldLabel data-tour="anchor">Amount</FieldLabel>)).toBe(true);
  });

  it("FloatingField", () => {
    expect(
      reaches(
        <FloatingField label="Amount" data-tour="anchor">
          <input />
        </FloatingField>,
      ),
    ).toBe(true);
  });

  it("FieldHint", () => {
    expect(reaches(<FieldHint label="What this means" data-tour="anchor" />)).toBe(true);
  });

  it("Tabs", () => {
    expect(
      reaches(<Tabs tabs={TABS} active="one" onChange={vi.fn()} data-tour="anchor" />),
    ).toBe(true);
  });

  it("Chip", () => {
    expect(reaches(<Chip data-tour="anchor">alpha</Chip>)).toBe(true);
  });

  it("ChipInput", () => {
    expect(
      reaches(
        <ChipInput value={[]} onChange={vi.fn()} aria-label="Tags" data-tour="anchor" />,
      ),
    ).toBe(true);
  });

  it("ToggleGroup", () => {
    expect(
      reaches(
        <ToggleGroup
          value="a"
          onChange={vi.fn()}
          options={TOGGLE_OPTIONS}
          aria-label="Status"
          data-tour="anchor"
        />,
      ),
    ).toBe(true);
  });

  it("AlertBanner", () => {
    expect(reaches(<AlertBanner data-tour="anchor">Careful</AlertBanner>)).toBe(true);
  });

  it("UserAvatar", () => {
    expect(reaches(<UserAvatar name="Marcel Eifert" data-tour="anchor" />)).toBe(true);
  });

  it("SearchField", () => {
    expect(
      reaches(<SearchField value="" onChange={vi.fn()} label="Find" data-tour="anchor" />),
    ).toBe(true);
  });

  it("ThemeSetting", () => {
    expect(
      reaches(
        <ThemeSetting
          value="system"
          onChange={vi.fn()}
          label="Theme"
          optionLabels={{ system: "System", light: "Light", dark: "Dark" }}
          data-tour="anchor"
        />,
      ),
    ).toBe(true);
  });

  it("LanguageSetting", () => {
    expect(
      reaches(
        <LanguageSetting
          value="en"
          onChange={vi.fn()}
          label="Language"
          options={[{ code: "en", label: "English" }]}
          data-tour="anchor"
        />,
      ),
    ).toBe(true);
  });

  it("the Card sub-parts", () => {
    for (const Part of [
      CardHeader,
      CardTitle,
      CardDescription,
      CardAction,
      CardContent,
      CardFooter,
    ]) {
      expect(reaches(<Part data-tour="anchor" />)).toBe(true);
    }
  });
});

/**
 * The deprecated spellings still name the control, and the DOM spelling wins when both
 * are given — which is the whole migration path: a consumer moves one call site at a
 * time and the two spellings coexist on the way.
 */
describe("the accessible-name prop is the DOM spelling, with the old one still working", () => {
  it("ToggleGroup takes aria-label", () => {
    render(
      <ToggleGroup value="a" onChange={vi.fn()} options={TOGGLE_OPTIONS} aria-label="Status" />,
    );
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
  });

  it("ToggleGroup still takes the deprecated ariaLabel", () => {
    render(
      <ToggleGroup value="a" onChange={vi.fn()} options={TOGGLE_OPTIONS} ariaLabel="Status" />,
    );
    expect(screen.getByRole("radiogroup", { name: "Status" })).toBeInTheDocument();
  });

  it("ToggleGroup lets aria-label win over ariaLabel", () => {
    render(
      <ToggleGroup
        value="a"
        onChange={vi.fn()}
        options={TOGGLE_OPTIONS}
        ariaLabel="Old"
        aria-label="New"
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "New" })).toBeInTheDocument();
  });

  it("ChipInput takes aria-label, names the FIELD and not the wrapper", () => {
    // The name belongs on the text box a screen-reader user lands in, not on the
    // decorative box drawn around it — spreading the rest onto the root would have
    // named the wrong thing.
    render(<ChipInput value={[]} onChange={vi.fn()} aria-label="Tags" />);
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeInTheDocument();
  });

  it("ChipInput still takes the deprecated ariaLabel", () => {
    render(<ChipInput value={[]} onChange={vi.fn()} ariaLabel="Tags" />);
    expect(screen.getByRole("textbox", { name: "Tags" })).toBeInTheDocument();
  });

  it("ChipInput lets aria-label win over ariaLabel", () => {
    render(<ChipInput value={[]} onChange={vi.fn()} ariaLabel="Old" aria-label="New" />);
    expect(screen.getByRole("textbox", { name: "New" })).toBeInTheDocument();
  });

  it("Tabs takes aria-label", () => {
    render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} aria-label="Reports" />);
    expect(screen.getByRole("tablist", { name: "Reports" })).toBeInTheDocument();
  });

  it("Tabs still takes the deprecated label", () => {
    render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} label="Reports" />);
    expect(screen.getByRole("tablist", { name: "Reports" })).toBeInTheDocument();
  });

  it("Tabs lets aria-label win over label", () => {
    render(<Tabs tabs={TABS} active="one" onChange={vi.fn()} label="Old" aria-label="New" />);
    expect(screen.getByRole("tablist", { name: "New" })).toBeInTheDocument();
  });

  it("SearchField takes aria-label with no label at all", () => {
    render(<SearchField value="" onChange={vi.fn()} aria-label="Find a setting" />);
    const box = screen.getByRole("searchbox", { name: "Find a setting" });
    // The placeholder falls back to whichever spelling named the field, so a box named
    // only by `aria-label` still says what it is before anyone types in it.
    expect(box).toHaveAttribute("placeholder", "Find a setting");
  });

  it("SearchField still takes the deprecated label", () => {
    render(<SearchField value="" onChange={vi.fn()} label="Find a setting" />);
    expect(screen.getByRole("searchbox", { name: "Find a setting" })).toBeInTheDocument();
  });

  it("SearchField lets aria-label win over label", () => {
    render(<SearchField value="" onChange={vi.fn()} label="Old" aria-label="New" />);
    expect(screen.getByRole("searchbox", { name: "New" })).toBeInTheDocument();
  });
});

/**
 * The props types exist and are exported under the component's own name.
 *
 * Asserted by USING them: a consumer wrapping a kit component reaches for exactly this,
 * and five call sites across Keksdose and Kastlan currently reach for
 * `ComponentProps<typeof X>` instead because there was nothing to import. These
 * assignments are compile-time; `tsc --noEmit` is what actually runs them.
 */
describe("every component exports a props type named after it", () => {
  it("types are importable and structurally what a wrapper needs", () => {
    // No `data-tour` in this one: `data-*` is a JSX affordance rather than a member of
    // React's DOM prop types, so it belongs in the render assertions above, not in an
    // object literal a consumer would build.
    const button: ButtonProps = { variant: "ghost", children: "Go" };
    const iconButton: IconButtonProps = { size: "sm", "aria-label": "Edit" };
    const input: InputProps = { label: "Name" };
    const select: SelectProps = { label: "Pick" };
    const textarea: TextareaProps = { label: "Notes" };
    const card: CardProps = { flush: true, children: "body" };
    const spinner: SpinnerProps = { className: "size-4" };
    const emptyState: EmptyStateProps = { title: "Nothing" };
    const chevron: FieldChevronProps = { className: "right-2" };
    const fieldLabel: FieldLabelProps = { children: "Amount" };
    const floating: FloatingFieldProps = { label: "Amount", children: null };
    const fieldHint: FieldHintProps = { label: "What this means", side: "top" };
    const tabs: TabsProps<"one"> = { tabs: TABS, active: "one", onChange: () => {} };
    const chip: ChipProps = { children: "alpha", tone: "brand" };
    const chipInput: ChipInputProps = { value: [], onChange: () => {} };
    const toggle: ToggleGroupProps<"a" | "b"> = {
      value: "a",
      onChange: () => {},
      options: TOGGLE_OPTIONS,
    };
    const alert: AlertBannerProps = { tone: "warning", children: "Careful" };
    const avatar: UserAvatarProps = { name: "Marcel Eifert", size: "lg" };
    const searchField: SearchFieldProps = { value: "", onChange: () => {}, label: "Find" };
    const theme: ThemeSettingProps = {
      value: "dark",
      onChange: () => {},
      label: "Theme",
      optionLabels: { system: "System", light: "Light", dark: "Dark" },
    };
    const language: LanguageSettingProps = {
      value: "en",
      onChange: () => {},
      label: "Language",
      options: [],
    };

    // A DOM-forwarding component's props ARE the element's props, which is what lets a
    // consumer's wrapper take `...rest` of its own and hand it straight on.
    const asDivProps: ComponentPropsWithoutRef<"div"> = { ...card, children: null };

    expect([
      button,
      iconButton,
      input,
      select,
      textarea,
      card,
      spinner,
      emptyState,
      chevron,
      fieldLabel,
      floating,
      fieldHint,
      tabs,
      chip,
      chipInput,
      toggle,
      alert,
      avatar,
      searchField,
      theme,
      language,
      asDivProps,
    ]).toHaveLength(22);
  });
});
