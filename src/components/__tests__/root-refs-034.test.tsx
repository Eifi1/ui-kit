import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ComponentProps, type ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../card";
import { EmptyState } from "../empty-state";
import { FloatingField, Label } from "../field-base";
import { Spinner } from "../spinner";
import { Tabs } from "../tabs";
import { LoadingState } from "../loading-state";
import { DescriptionItem, DescriptionList } from "../description-list";
import { PageHeader } from "../page-header";
import { Collapse, Disclosure } from "../disclosure";
import { StatTileGrid } from "../stat-tile";
import { Separator } from "../separator";
import { ButtonGroup } from "../button-group";
import { StatusDot } from "../status-dot";
import { Breadcrumbs } from "../breadcrumbs";
import { SectionLabel, Caption } from "../text";
import { ProgressBar } from "../progress-bar";
import { NavPills } from "../nav-pills";
import { AlertBanner } from "../alert-banner";
import { DropdownPanel, DropdownSearchHeader } from "../dropdown";
import { Popover } from "../popover";
import { PickerSheet } from "../picker-sheet";
import { HoverMenu } from "../hover-menu";
import { FullBleedDialog } from "../full-bleed-dialog";
import { GroupedPicker } from "../grouped-picker";
import { FormActions } from "../form-actions";
import { AppShell } from "../../shell/app-shell";
import { AuthLayout } from "../../shell/auth-layout";
import { TopBar } from "../../shell/top-bar";
import { BulkActionBar } from "../bulk-action-bar";
import { CalendarHeatmap } from "../calendar-heatmap";
import { CurrencyFlag } from "../currency-option-list";
import { DangerConfirm } from "../danger-confirm";
import { FieldHint, FieldLabel } from "../field-parts";
import { FileDropzone } from "../file-dropzone";
import { IconPicker } from "../icon-picker";
import { ImageGrid } from "../image-grid";
import { LineItems } from "../line-items";
import { MeasuredGrid } from "../measured-grid";
import { MiniCalendar } from "../mini-calendar";
import { PageContents, PageContentsLayout } from "../page-contents";
import { PasswordStrengthMeter } from "../password-strength";
import { PieChart } from "../pie-chart";
import { QrCode } from "../qr-code";
import { SignatureView } from "../signature-pad";
import { Delta, SignedAmount, Tone } from "../signed-amount";
import { Sparkline } from "../sparkline";
import { SwatchPicker } from "../swatch-picker";
import { TreeRow, TreeView } from "../tree-view";
import { UserAvatar } from "../user-avatar";
import { AcceptInvitation } from "../../auth/accept-invitation";
import { ForgotPasswordForm } from "../../auth/forgot-password-form";
import { NotFoundPage } from "../../auth/not-found-page";
import { RegisterForm } from "../../auth/register-form";
import { ResetPasswordForm } from "../../auth/reset-password-form";
import { SignInForm } from "../../auth/sign-in-form";
import { VerifyEmailStatus } from "../../auth/verify-email";
import { SubscriptionActions } from "../../billing/subscription-actions";
import { DemoEnded } from "../../demo/demo-ended";
import { DemoStart } from "../../demo/demo-start";
import { LandingActions } from "../../landing/landing-actions";
import { CtaBand, FeatureRow, FeatureRows, Hero, TrustStrip } from "../../landing/landing-sections";

/**
 * API-2 (refactor audit 2026-10, round 0.34 Wave 3): Skeleton's 0.33.1 fix, for every
 * component that spreads its props onto an element. Under React 19 `ref` is a prop, so
 * `{...rest}` already carried it there; only the TYPE (`ComponentPropsWithoutRef`) kept
 * an app from passing one — keksdose wrapped a Card in a `<div ref>` only to scroll it
 * into view (admin-actions-panel). Where a component holds a ref of its own on the same
 * element (Tabs' strip, a panel's outside-click and focus trap, FormActions' shortcut
 * scope, AppShell's nav height) the two are merged, so neither loses the element; a
 * picker's ref is its trigger, as on MultiSelect and CountrySelect.
 */

const noop = () => {};

/** Renders `element(ref)` and answers what the ref was handed. */
function refTarget(element: (ref: (el: Element | null) => void) => ReactElement) {
  let target: Element | null = null;
  render(element((el) => (target = el)));
  return target as Element | null;
}

describe("the root element's ref (API-2)", () => {
  it.each<[string, (ref: (el: Element | null) => void) => ReactElement]>([
    ["Card", (ref) => <Card ref={ref} data-testid="root">x</Card>],
    ["CardHeader", (ref) => <CardHeader ref={ref} data-testid="root" />],
    ["CardTitle", (ref) => <CardTitle ref={ref} data-testid="root" as="h2">Title</CardTitle>],
    ["CardDescription", (ref) => <CardDescription ref={ref} data-testid="root" />],
    ["CardAction", (ref) => <CardAction ref={ref} data-testid="root" />],
    ["CardContent", (ref) => <CardContent ref={ref} data-testid="root" />],
    ["CardFooter", (ref) => <CardFooter ref={ref} data-testid="root" />],
    ["Spinner", (ref) => <Spinner ref={ref} data-testid="root" />],
    ["Spinner, labelled", (ref) => <Spinner ref={ref} data-testid="root" showLabel />],
    ["EmptyState", (ref) => <EmptyState ref={ref} data-testid="root" title="Nothing yet" />],
    ["EmptyState, inline", (ref) => <EmptyState ref={ref} data-testid="root" title="Nothing" variant="inline" />],
    ["Label", (ref) => <Label ref={ref} data-testid="root">Name</Label>],
    ["FloatingField", (ref) => <FloatingField ref={ref} data-testid="root"><input /></FloatingField>],
    ["LoadingState", (ref) => <LoadingState ref={ref} data-testid="root" />],
    ["DescriptionList", (ref) => <DescriptionList ref={ref} data-testid="root" />],
    ["DescriptionItem", (ref) => <DescriptionList><DescriptionItem ref={ref} data-testid="root" term="Rent">1200</DescriptionItem></DescriptionList>],
    ["PageHeader", (ref) => <PageHeader ref={ref} data-testid="root" title="Budget" />],
    ["Disclosure", (ref) => <Disclosure ref={ref} data-testid="root" title="More">Body</Disclosure>],
    ["Collapse", (ref) => <Collapse ref={ref} data-testid="root" open>Body</Collapse>],
    ["StatTileGrid", (ref) => <StatTileGrid ref={ref} data-testid="root" />],
    ["Separator", (ref) => <Separator ref={ref} data-testid="root" />],
    ["ButtonGroup", (ref) => <ButtonGroup ref={ref} data-testid="root" />],
    ["StatusDot", (ref) => <StatusDot ref={ref} data-testid="root" />],
    ["Breadcrumbs", (ref) => <Breadcrumbs ref={ref} data-testid="root" items={[{ label: "Home", href: "/" }, { label: "Budget" }]} />],
    ["SectionLabel", (ref) => <SectionLabel ref={ref} data-testid="root" as="h2">Rent</SectionLabel>],
    ["Caption", (ref) => <Caption ref={ref} data-testid="root" as="span">Note</Caption>],
    ["ProgressBar", (ref) => <ProgressBar ref={ref} data-testid="root" value={3} max={10} label="Used" />],
    ["NavPills", (ref) => <NavPills ref={ref} data-testid="root" items={[{ value: "a", label: "A" }]} current="a" />],
    ["AuthLayout", (ref) => <AuthLayout ref={ref} data-testid="root">Form</AuthLayout>],
    ["TopBar", (ref) => <TopBar ref={ref} data-testid="root" brand="Acme" />],
    ["SignedAmount", (ref) => <SignedAmount ref={ref} data-testid="root" value={-12} />],
    ["UserAvatar", (ref) => <UserAvatar ref={ref} data-testid="root" name="Ada Lovelace" />],
    [
      "DropdownSearchHeader",
      (ref) => <DropdownSearchHeader ref={ref} data-testid="root" query="" onQueryChange={noop} inputRef={createRef()} />,
    ],
  ])("%s hands its ref to the element its props land on", (_, element) => {
    const target = refTarget(element);
    expect(target).not.toBeNull();
    expect(target).toBe(screen.getByTestId("root"));
  });

  it("AlertBanner's ref is its frame, whichever element that is (Ref<HTMLElement>)", () => {
    const box = createRef<HTMLElement>();
    const link = createRef<HTMLElement>();
    const button = createRef<HTMLElement>();
    const split = createRef<HTMLElement>();
    render(
      <>
        <AlertBanner ref={box} data-testid="box">Saved</AlertBanner>
        <AlertBanner ref={link} data-testid="link" href="/budget">Over budget</AlertBanner>
        <AlertBanner ref={button} data-testid="button" onClick={noop}>Retry</AlertBanner>
        <AlertBanner ref={split} data-testid="split" onClick={noop} onDismiss={noop}>Trial ends</AlertBanner>
      </>,
    );
    expect(box.current).toBe(screen.getByTestId("box"));
    expect(box.current?.tagName).toBe("DIV");
    expect(link.current?.tagName).toBe("A");
    expect(link.current).toBe(screen.getByTestId("link"));
    expect(button.current?.tagName).toBe("BUTTON");
    expect(split.current).toBe(screen.getByTestId("split"));
    expect(split.current?.tagName).toBe("DIV");
  });
});

describe("a caller's ref beside the component's own (API-2, merged)", () => {
  it("Tabs: the strip, which still scrolls the open tab into view", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tabs
        ref={ref}
        tabs={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ]}
        active="b"
        onChange={noop}
        aria-label="Reports"
      />,
    );
    expect(ref.current).toBe(screen.getByRole("tablist", { name: "Reports" }));
    // The strip's own ref still works: its arrow keys move between the tabs it holds.
    fireEvent.keyDown(screen.getByRole("tab", { name: "B" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "A" })).toHaveFocus();
  });

  it("DropdownPanel: the panel, and the caller's `panelRef` still gets it", () => {
    const ref = createRef<HTMLDivElement>();
    const panelRef = createRef<HTMLDivElement>();
    render(
      <DropdownPanel ref={ref} panelRef={panelRef} data-testid="panel">
        <li>One</li>
      </DropdownPanel>,
    );
    expect(ref.current).toBe(screen.getByTestId("panel"));
    expect(panelRef.current).toBe(screen.getByTestId("panel"));
  });

  it("Popover: the panel, and a click inside it is still inside", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Popover ref={ref} data-testid="panel" trigger={({ toggle, ref: t }) => <button type="button" ref={t} onClick={toggle}>Open</button>}>
        {() => <button type="button">Inside</button>}
      </Popover>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(ref.current).toBe(screen.getByTestId("panel"));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Inside" }));
    expect(screen.getByTestId("panel")).toBeInTheDocument();
  });

  it("PickerSheet: the sheet, whose trap still puts focus in its search box", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PickerSheet ref={ref} data-testid="sheet" open onClose={noop} query="" onQueryChange={noop} title="Currency">
        <li>CHF</li>
      </PickerSheet>,
    );
    expect(ref.current).toBe(screen.getByTestId("sheet"));
    // The trap's opening focus, through the sheet's own ref: its search box.
    expect(document.activeElement?.tagName).toBe("INPUT");
    expect(ref.current).toContainElement(document.activeElement as HTMLElement);
  });

  it("HoverMenu: the wrapper, outside which a click still closes the menu", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <>
        <HoverMenu
          ref={ref}
          data-testid="wrapper"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              Menu
            </button>
          )}
        >
          {() => <button type="button">Rename</button>}
        </HoverMenu>
        <button type="button">Elsewhere</button>
      </>,
    );
    expect(ref.current).toBe(screen.getByTestId("wrapper"));
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    // The wrapper's own ref is what the outside click is measured against.
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("menuitem", { name: "Rename" })).toBeNull();
  });

  it("FullBleedDialog: the dialog, whose trap still holds focus", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <FullBleedDialog ref={ref} open onClose={noop} closeLabel="Close" aria-label="Pick">
        <button type="button">Inside</button>
      </FullBleedDialog>,
    );
    expect(ref.current).toBe(screen.getByRole("dialog", { name: "Pick" }));
    expect(ref.current).toContainElement(document.activeElement as HTMLElement);
  });

  it("GroupedPicker: the trigger, as every picker's ref is", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <GroupedPicker
        ref={ref}
        aria-label="Category"
        groups={[{ key: "food", label: "Food", items: [{ key: "bread", label: "Bread" }] }]}
        buttonLabel="Pick"
        selected={null}
        onSelect={noop}
      />,
    );
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "Category" }));
    // The core's own trigger ref still anchors and opens the list.
    fireEvent.click(ref.current!);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("FormActions: the row, and Ctrl+Enter still finds the form it submits", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const ref = createRef<HTMLDivElement>();
    render(
      <form onSubmit={onSubmit}>
        <input aria-label="Payee" />
        <FormActions ref={ref} submitShortcut="mod-enter" />
      </form>,
    );
    expect(ref.current).toHaveAttribute("data-slot", "form-actions");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Payee" }), { key: "Enter", ctrlKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("AppShell: the shell's root, which still carries the nav height", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MemoryRouter>
        <AppShell ref={ref} nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />}>
          <div />
        </AppShell>
      </MemoryRouter>,
    );
    expect(ref.current).toHaveAttribute("data-app-shell");
    expect(ref.current?.style.getPropertyValue("--app-nav-h")).not.toBe("");
  });
});

describe("types: every component that spreads its props takes a ref (checked by tsc)", () => {
  it("ComponentProps<typeof X>['ref'] is the element's ref", () => {
    const refs = [
      ((r: ComponentProps<typeof Card>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CardHeader>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CardTitle>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof CardDescription>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CardAction>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CardContent>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CardFooter>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Spinner>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof EmptyState>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Label>["ref"]) => r)(createRef<HTMLLabelElement>()),
      ((r: ComponentProps<typeof FloatingField>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof LoadingState>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof DescriptionList>["ref"]) => r)(createRef<HTMLDListElement>()),
      ((r: ComponentProps<typeof DescriptionItem>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof PageHeader>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Disclosure>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Collapse>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof StatTileGrid>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Separator>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof ButtonGroup>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof StatusDot>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof Breadcrumbs>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof SectionLabel>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof Caption>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof ProgressBar>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof NavPills>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof AlertBanner>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof Tabs>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof DropdownPanel>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof DropdownSearchHeader>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Popover>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof PickerSheet>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof HoverMenu>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof FullBleedDialog>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof GroupedPicker>["ref"]) => r)(createRef<HTMLButtonElement>()),
      ((r: ComponentProps<typeof FormActions>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof AppShell>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof AuthLayout>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof TopBar>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof BulkActionBar>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CalendarHeatmap>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof CurrencyFlag>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof DangerConfirm>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof FieldLabel>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof FieldHint>["ref"]) => r)(createRef<HTMLButtonElement>()),
      ((r: ComponentProps<typeof FileDropzone>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof IconPicker>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof ImageGrid>["ref"]) => r)(createRef<HTMLUListElement>()),
      ((r: ComponentProps<typeof LineItems>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof MeasuredGrid>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof MiniCalendar>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof PageContents>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof PageContentsLayout>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof PasswordStrengthMeter>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof PieChart>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof QrCode>["ref"]) => r)(createRef<SVGSVGElement>()),
      ((r: ComponentProps<typeof SignatureView>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof Tone>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof SignedAmount>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof Delta>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof Sparkline>["ref"]) => r)(createRef<SVGSVGElement>()),
      ((r: ComponentProps<typeof SwatchPicker>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof TreeRow>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof TreeView>["ref"]) => r)(createRef<HTMLUListElement>()),
      ((r: ComponentProps<typeof UserAvatar>["ref"]) => r)(createRef<HTMLSpanElement>()),
      ((r: ComponentProps<typeof AcceptInvitation>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof ForgotPasswordForm>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof NotFoundPage>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof RegisterForm>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof ResetPasswordForm>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof SignInForm>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof VerifyEmailStatus>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof SubscriptionActions>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof DemoEnded>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof DemoStart>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof LandingActions>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof Hero>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof FeatureRows>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof FeatureRow>["ref"]) => r)(createRef<HTMLDivElement>()),
      ((r: ComponentProps<typeof TrustStrip>["ref"]) => r)(createRef<HTMLElement>()),
      ((r: ComponentProps<typeof CtaBand>["ref"]) => r)(createRef<HTMLElement>()),
    ];
    // Still typed to the element: a <div>'s ref is not a <span>'s.
    // @ts-expect-error — Card's root is a <div>
    const wrong: ComponentProps<typeof Card>["ref"] = createRef<HTMLSpanElement>();
    expect([...refs, wrong].every(Boolean)).toBe(true);
  });
});
