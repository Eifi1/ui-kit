# @eifi1/ui-kit

[![npm](https://img.shields.io/npm/v/@eifi1/ui-kit)](https://www.npmjs.com/package/@eifi1/ui-kit)

The shared, app-agnostic design system for the sibling apps. Published to npm, so
consumers install it like any other dependency — no submodule, no token, no
`file:` path pointing into a neighbouring checkout.

```bash
npm install @eifi1/ui-kit
```

```ts
import { Button, DataTable } from "@eifi1/ui-kit";
import "@eifi1/ui-kit/tokens.css";
```

> Formerly `@hb/ui` in the `hb-ui` repository — `hb` was short for Household
> Books, a name none of the current consumers share. GitHub redirects the old
> repository URL, but the old package name is not published; update imports.

Ships compiled ESM plus type declarations, built one output file per source
module so consumers can still tree-shake it (see the `sideEffects` note in
`package.json` — a bundling build would pull recharts into every consumer's
entry chunk). Tailwind classes are emitted as-is; each app still compiles them
with its own Tailwind config.

## Install

```bash
npm install @eifi1/ui-kit
```

Versions are pinned in your lockfile like any dependency, so each app upgrades
when it chooses. To work on the design system and an app together, use
`npm link` or a workspace override rather than a `file:` path.

`@eifi1/ui-kit` needs these installed in the consuming app: `react`, `react-dom` (required
peers) and — only if you use the pieces that need them — `recharts` (the `chart`
kit), `sonner` (`FileDropzone`), `react-router` (`DataTable` URL-sync + `AppShell`).
It also pulls `clsx`, `tailwind-merge`, `lucide-react`, `zustand`, `flag-icons`.

## Wiring

### 1. Vite — dedupe shared singletons

The package is a linked source package, so its imports must resolve to the app's
single copy of these (two React/router/store instances break hooks and context):

```ts
// vite.config.ts
resolve: {
  dedupe: ["react", "react-dom", "zustand", "recharts", "sonner", "react-router"],
}
```

### 2. Tailwind (v4) — tokens + source scan

```css
/* app.css */
@import "tailwindcss";
@import "@eifi1/ui-kit/tokens.css";          /* design tokens, semantic utilities, chrome */
@source "../../node_modules/@eifi1/ui-kit/src"; /* keep the class names @eifi1/ui-kit uses */
```

### 3. Theme + palette stores (own persistence keys)

The stores are factories so each app namespaces its own `localStorage`:

```ts
import { createThemeStore, createPaletteStore } from "@eifi1/ui-kit";
export const { useTheme, useApplyTheme } = createThemeStore("myapp-theme");
export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
  createPaletteStore("myapp-palette", useTheme);
```

Call `useApplyTheme()` + `useApplyPalette()` once near the root. For a no-flash
first paint, apply the persisted theme class + token set before hydration (see
Keksdose's `main.tsx` for the pattern, using `applyTokenSet`/`presetById`).

## Tests

```bash
npm test          # vitest run
npm run test:watch
npm run typecheck
```

Vitest + jsdom, configured as a copy of the lead consumer's setup rather than a new
dialect — so a test can move between this package and an app unchanged. The suite pins
`TZ=Europe/Berlin`, which is load-bearing for `lib/dates.ts`: those helpers answer with
the LOCAL calendar day, and on a UTC runner a broken UTC implementation and a correct
local one agree.

Start where the return on a line of test is highest and no DOM is needed — `lib/`,
`theme/`, and the data-table's pure helpers. The house rule for a fix is that its
regression test is **run against the old code first and observed to fail there**;
a test written after the fix proves only that the fix is self-consistent.

## What's exported

- **Primitives / fields:** `cn`, `Button`, `Input`, `Select`, `Textarea`,
  `FloatingField`, `FieldLabel`, `Card`, `Spinner`, `EmptyState`, `Tabs`, plus the
  field-class constants (`FIELD_BASE`, `FIELD_TRIGGER`, `FLOATING_*`, …).
- **Inputs / dropdowns:** `NumberInput`, `AmountInput`, `Combobox`, `MultiSelect`,
  `CurrencySelect` (+ `CURRENCIES`, `getCurrency`, `CurrencyFlag`), dropdown
  primitives (`useDropdown`, `useDropdownSearch`, `DropdownPanel`,
  `DropdownSearchHeader`), `CalculatorButton`, the calc engine.
- **Overlays / misc:** `Modal` (+ `useBackdropClose`), `Popover`, `HoverMenu`,
  `Tooltip`, `AlertBanner`, `ToggleGroup`, `FileDropzone`, `GroupedPicker`,
  `MiniCalendar`, `WizardStepper` (a bare two-step indicator — not the wizard
  engine below), the `chart` kit.
- **Data table:** `DataTable` (+ `DataTableColumn`, `FilterState`, `SortState`,
  `ServerPagination`), `Pagination`, filter/sort helpers, `DataTableLabels`.
- **Theme:** `TokenSet`, `PalettePreset`, `DEFAULT_PRESET`, `ALTERNATIVE_PRESETS`,
  `PALETTES`, `presetById`, `applyTokenSet`,
  `PALETTE_HEX`, chart-colour helpers, and the store factories.
- **Shell:** `TopBar`, `AppShell` (+ `AppShellNavItem`), `ThemeToggle`,
  `PaletteMenu`, `LanguageMenu`, `TOPBAR_TRIGGER_CLASS`, `TOPBAR_MENU_ITEM_CLASS`.
- **Feedback:** `FeedbackDialog` (the compose form) and the inbox parts —
  `FeedbackStatus`/`FeedbackCategory` and their `*_META`/`*_ORDER` tables,
  `nextFeedbackStatus`, `visibleFeedbackStatuses`, `selectableFeedbackStatuses`,
  `feedbackCategoryRank`, `FeedbackStatusBadge`, `FeedbackStatusTransitions`,
  `FeedbackCategoryBadge`, `FeedbackNoteEditor`, `FeedbackDetail`,
  `FeedbackDetailSection`, `FeedbackProse`. The vocabulary, the transition policy
  and the look; each app still wires its own API, columns, strings and
  permissions — see the note at the top of `src/feedback/feedback-inbox.tsx`.
- **Wizard:** the multi-step engine (`useWizard`, `WizardContextProvider`,
  `useWizardContext`, `useRhfWizardStep`, `useWizardStepValidate`,
  `useWizardNextGate`, `requiredFieldsValidator`), the chrome around it
  (`StepperNav`, `WizardSummary`) and the parts its steps are built from
  (`WizardStep`, `WizardField`, `WizardSelectField`) — plus the types
  (`WizardStepConfig`, `UseWizardOptions`, `UseWizardReturn`, `StepStatus`,
  `ValidateResult`, `FieldErrors`, `SummarySection`, `SummaryItem`,
  `RequiredFieldSpec`) and the label table (`WizardLabels`,
  `DEFAULT_WIZARD_LABELS`, `resolveWizardLabels`). See [Wizard](#wizard) below.
- **Subpath:** date helpers at `@eifi1/ui-kit/dates`; stylesheet at `@eifi1/ui-kit/tokens.css`.

## Forms / refs

`Input`, `Select`, `Textarea` and `AmountInput` forward their `ref` to the
underlying DOM element, so they work directly with react-hook-form:
`<Input {...field} />` (from `Controller`/`register`) attaches RHF's ref, giving
focus-and-scroll-to-error for free.

## i18n

The package carries no translation catalog. Components with user-facing text take
**label props with English defaults** — pass your own translated strings:

```tsx
<MultiSelect allLabel={t("all")} searchLabel={t("search")} … />
<DataTable labels={{ columns: t("table.columns"), presets: { today: t("today") }, … }} … />
```

## Wizard

A multi-step form engine: a step machine with per-step validation gates, collected
data, `?step=` URL sync, and skip/cancel handling — with the chrome (step
indicator, nav bar, cancel confirmation) and a summary/review step on top.

```tsx
const wizard = useWizard<LeaseDraft>({
  steps: [
    { id: "unit", label: "Unit" },
    { id: "tenants", label: "Tenants", validate: () => draft.tenants.length > 0 },
    { id: "review", label: "Review" },
  ],
  onComplete: (data) => createLease(data),
  onCancel: () => navigate(".."),
});

<WizardContextProvider
  value={{
    registerStepValidate: wizard.registerStepValidate,
    setNextBlocked: wizard.setNextBlocked,
  }}
>
  <StepperNav wizard={wizard} title="New lease">
    <WizardStep>{/* the active step's fields */}</WizardStep>
  </StepperNav>
</WizardContextProvider>
```

A step gates forward navigation three ways, and `goNext` runs all of them:
its `validate` in the config above, `useWizardStepValidate(fn)` for a step that
checks by hand, and `useRhfWizardStep(form, onValid)` for a react-hook-form step
(which also reports its own inline messages). `useWizardNextGate(blocked)`
disables Next/Skip outright.

Like the rest of the package it resolves **no strings**: a step carries a `label`
node, and the chrome takes a `labels` object (`WizardLabels`, every key optional
over an English default) — the same split `DataTable` and `TourProvider` use. An
app with i18n wraps `useWizard`/`StepperNav`/`WizardSummary` once and maps its
own keys; see Kastlan's `shared/components/wizard/app-wizard.tsx`.

**Optional peers.** `react-hook-form` is needed only by `useRhfWizardStep`, and
only as a type. `react-router` backs the `?step=` sync in `useWizard`. `sonner`
carries the "fill in the required fields" toast and is imported dynamically, on
that failure path only — pass `onValidationFailed` to route it elsewhere.

## Shell

`TopBar`/`AppShell` are composable chrome. Feed `AppShell` your nav items and pass
a `TopBar` whose `actions` combine the shared controls (`ThemeToggle`,
`PaletteMenu`, `LanguageMenu`) with your own app-owned menus (account, etc.):

```tsx
<AppShell nav={nav} footer={<Footer/>} topBar={
  <TopBar brand={<Logo/>} actions={<>
    <ThemeToggle mode={mode} onToggle={toggle} />
    <PaletteMenu palettes={PALETTES} activeId={id} mode={mode} onSelect={setId} />
    <LanguageMenu options={langs} current={lang} onChange={setLang} />
    {/* app-owned menus */}
  </>} />
}>
  <Outlet />
</AppShell>
```
