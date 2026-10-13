import { act, render, screen, within } from "@testing-library/react";
import { createRef, type ComponentRef } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, expectTypeOf, it } from "vitest";
import { StatTile } from "../stat-tile";
import { Modal } from "../modal";
import { DialogFrame } from "../dialog-frame";
import { CopyButton } from "../copy-button";
import { ContrastSetting, LanguageSetting, TextSizeSetting, ThemeSetting } from "../settings-fields";
import { DemoBanner } from "../../demo/demo-banner";
import { BillingBanner } from "../../billing/billing-banner";
import { PlanLimitNotice } from "../../billing/plan-limit-notice";
import type { AccessChoice } from "../../landing/access";

/**
 * Round 0.35 R4: the follow-up refs from phase C1 (refactor audit 2026-10, MOD-4 / API-2 /
 * API-3). 0.34 gave Card, EmptyState, PageHeader, every field and every picker a React 19
 * `ref` prop; these were left over because they pass their props on to ANOTHER kit
 * component rather than to an element. Each hands its `ref` to that component, so it lands
 * on the element the component's own ref is: the tile's Card, the banner's AlertBanner
 * frame, the dialog PANEL (not the backdrop), the copy button's `<button>` (not the tooltip
 * round it), the settings toggles' group. Modal is the one that needed more than a type:
 * its panel's own ref, which the focus trap holds, used to replace a caller's.
 */

const noop = () => {};
const ACCESS: AccessChoice = { kind: "request", email: "support@example.com", app: "Ada's Garden Planner" };
const T0 = Date.parse("2026-10-07T12:00:00Z");
const THEMES = { system: "System", light: "Light", dark: "Dark" };

describe("each hands its ref to the element its props land on (round 0.35 R4)", () => {
  it("StatTile: the tile — the Card's <div>, not the stretched link inside it", () => {
    const plain = createRef<HTMLDivElement>();
    const linked = createRef<HTMLDivElement>();
    render(
      <>
        <StatTile ref={plain} data-testid="plain" label="Revenue" value={1200} />
        <StatTile ref={linked} data-testid="linked" label="Rent" value={900} href="/rent" />
      </>,
    );
    expect(plain.current).toBe(screen.getByTestId("plain"));
    expect(plain.current).toHaveTextContent("Revenue");
    expect(linked.current).toBe(screen.getByTestId("linked"));
    expect(linked.current?.tagName).toBe("DIV");
    expect(linked.current).toContainElement(screen.getByRole("link", { name: "Rent" }));
  });

  it("DemoBanner: the AlertBanner strip's <div>", () => {
    const ref = createRef<HTMLDivElement>();
    render(<DemoBanner ref={ref} expiresAt={T0 + 3_600_000} now={() => T0} model="read-only" access={ACCESS} />);
    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toHaveAttribute("data-demo-model", "read-only");
  });

  it("BillingBanner: the banner's <div>, with an action and an × beside it too", () => {
    const strip = createRef<HTMLDivElement>();
    const box = createRef<HTMLDivElement>();
    render(
      <>
        <BillingBanner ref={strip} kind="trial-ending" daysLeft={5} actionHref="/settings/subscription" />
        <BillingBanner ref={box} kind="payment-failed" variant="box" onAction={noop} onDismiss={noop} />
      </>,
    );
    expect(strip.current).toHaveAttribute("data-billing-banner", "trial-ending");
    expect(strip.current?.tagName).toBe("DIV");
    expect(box.current).toHaveAttribute("data-billing-banner", "payment-failed");
    expect(box.current?.tagName).toBe("DIV");
    expect(box.current).toContainElement(screen.getByRole("button", { name: "Dismiss" }));
  });

  it("PlanLimitNotice: the notice's <div>, not its action link", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PlanLimitNotice ref={ref} mode="upgrade" href="/settings/subscription" dimension="beds" used={3} limit={3} />);
    expect(ref.current).toHaveAttribute("data-plan-limit-mode", "upgrade");
    expect(ref.current?.tagName).toBe("DIV");
    expect(ref.current).toContainElement(screen.getByRole("link"));
  });

  it("Modal: the panel, whose trap still puts focus on it", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Modal ref={ref} onClose={noop} aria-label="Edit payee">
        <input aria-label="Name" />
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Edit payee" });
    expect(ref.current).toBe(dialog);
    // The trap's opening focus goes through the panel's own ref: on the panel itself.
    expect(dialog).toHaveFocus();
  });

  it("Modal with `open`: no panel while closed, the panel once open", () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <Modal ref={ref} open={false} onClose={noop} aria-label="Edit payee">
        Body
      </Modal>,
    );
    expect(ref.current).toBeNull();
    rerender(
      <Modal ref={ref} open onClose={noop} aria-label="Edit payee">
        Body
      </Modal>,
    );
    expect(ref.current).toBe(screen.getByRole("dialog", { name: "Edit payee" }));
  });

  it("Modal with `urlParam`: the panel, through the URL-bound dialog", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MemoryRouter initialEntries={["/?edit"]}>
        <Modal ref={ref} urlParam="edit" onClose={noop} aria-label="Edit payee">
          Body
        </Modal>
      </MemoryRouter>,
    );
    expect(ref.current).toBe(screen.getByRole("dialog", { name: "Edit payee" }));
  });

  it("DialogFrame: the Modal's panel, which holds the frame's heading and actions", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DialogFrame ref={ref} title="Rename" onClose={noop} actions={<button type="button">Save</button>}>
        <input aria-label="Name" />
      </DialogFrame>,
    );
    const dialog = screen.getByRole("dialog", { name: "Rename" });
    expect(ref.current).toBe(dialog);
    expect(ref.current).toContainElement(screen.getByRole("heading", { name: "Rename" }));
    expect(ref.current).toContainElement(screen.getByRole("button", { name: "Save" }));
    expect(dialog).toHaveFocus();
  });

  it("CopyButton: the <button> in both variants, not the tooltip's wrapper", () => {
    const icon = createRef<HTMLButtonElement>();
    const label = createRef<HTMLButtonElement>();
    render(
      <>
        <CopyButton ref={icon} text="DE89 3704" label="Copy IBAN" />
        <CopyButton ref={label} variant="label" text="ABC" label="Copy code" />
      </>,
    );
    expect(icon.current).toBe(screen.getByRole("button", { name: "Copy IBAN" }));
    expect(icon.current?.tagName).toBe("BUTTON");
    expect(label.current).toBe(screen.getByRole("button", { name: "Copy code" }));
  });

  it("the settings toggles: the group, whose focus() lands on the checked option", () => {
    const theme = createRef<HTMLDivElement>();
    const textSize = createRef<HTMLDivElement>();
    const contrast = createRef<HTMLDivElement>();
    render(
      <>
        <ThemeSetting ref={theme} variant="toggle" aria-label="Theme" value="dark" onChange={noop} optionLabels={THEMES} />
        <TextSizeSetting ref={textSize} value="large" onChange={noop} />
        <ContrastSetting ref={contrast} value="more" onChange={noop} />
      </>,
    );
    expect(theme.current).toBe(screen.getByRole("radiogroup", { name: "Theme" }));
    expect(textSize.current).toBe(screen.getByRole("radiogroup", { name: "Text size" }));
    expect(contrast.current).toBe(screen.getByRole("radiogroup", { name: "Contrast" }));
    act(() => theme.current?.focus());
    expect(within(theme.current!).getByRole("radio", { name: "Dark" })).toHaveFocus();
    act(() => textSize.current?.focus());
    expect(within(textSize.current!).getByRole("radio", { name: "Large" })).toHaveFocus();
    act(() => contrast.current?.focus());
    expect(within(contrast.current!).getByRole("radio", { name: "More" })).toHaveFocus();
  });

  it("the settings selects: the <select>", () => {
    const theme = createRef<HTMLSelectElement>();
    const language = createRef<HTMLSelectElement>();
    render(
      <>
        <ThemeSetting ref={theme} label="Theme" value="light" onChange={noop} optionLabels={THEMES} />
        <LanguageSetting
          ref={language}
          label="Language"
          value="en"
          onChange={noop}
          options={[
            { code: "en", label: "English" },
            { code: "de-CH", label: "Deutsch (Schweiz)" },
          ]}
        />
      </>,
    );
    expect(theme.current).toBeInstanceOf(HTMLSelectElement);
    expect(theme.current).toHaveValue("light");
    expect(language.current).toBeInstanceOf(HTMLSelectElement);
    expect(language.current).toHaveValue("en");
  });
});

describe("types: ComponentRef<typeof X> is the element (checked by tsc)", () => {
  it("each is typed to where its ref lands", () => {
    expectTypeOf<ComponentRef<typeof StatTile>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof DemoBanner>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof BillingBanner>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof PlanLimitNotice>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof Modal>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof DialogFrame>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof CopyButton>>().toEqualTypeOf<HTMLButtonElement>();
    expectTypeOf<ComponentRef<typeof TextSizeSetting>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof ContrastSetting>>().toEqualTypeOf<HTMLDivElement>();
    expectTypeOf<ComponentRef<typeof LanguageSetting>>().toEqualTypeOf<HTMLSelectElement>();
    // The theme's root is the variant's: the toggle's group or the select's <select>.
    expectTypeOf<ComponentRef<typeof ThemeSetting>>().toEqualTypeOf<HTMLDivElement | HTMLSelectElement>();
  });

  it("still typed to the element: a panel's ref is not a button's", () => {
    // @ts-expect-error — Modal's ref is the panel <div>
    const modal: ComponentRef<typeof Modal> = document.createElement("button");
    // @ts-expect-error — CopyButton's ref is the <button>, not the tooltip's <span>
    const copy: ComponentRef<typeof CopyButton> = document.createElement("span");
    expect([modal, copy].every(Boolean)).toBe(true);
  });
});
