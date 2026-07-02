# @hb/ui

The shared design system extracted from **household-books** (the lead app). It is
the single live source: HB consumes it directly, so design changes here flow into
every consumer. Domain-free — no app data models, currency/formatting, auth,
budgets, or i18n catalog.

Ships **raw TypeScript/TSX** (no build step); each consuming app compiles it with
its own Vite + Tailwind. Changes are picked up live.

## Install (sibling repo)

```jsonc
// package.json
"dependencies": {
  "@hb/ui": "file:../../household-books/packages/ui"
}
```

`@hb/ui` needs these installed in the consuming app: `react`, `react-dom` (required
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
@import "@hb/ui/tokens.css";          /* design tokens, semantic utilities, chrome */
@source "../../node_modules/@hb/ui/src"; /* keep the class names @hb/ui uses */
```

### 3. Theme + palette stores (own persistence keys)

The stores are factories so each app namespaces its own `localStorage`:

```ts
import { createThemeStore, createPaletteStore } from "@hb/ui";
export const { useTheme, useApplyTheme } = createThemeStore("myapp-theme");
export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
  createPaletteStore("myapp-palette", useTheme);
```

Call `useApplyTheme()` + `useApplyPalette()` once near the root. For a no-flash
first paint, apply the persisted theme class + token set before hydration (see
household-books' `main.tsx` for the pattern, using `applyTokenSet`/`presetById`).

## What's exported

- **Primitives / fields:** `cn`, `Button`, `Input`, `Select`, `Textarea`,
  `FloatingField`, `FieldLabel`, `Card`, `Spinner`, `EmptyState`, `Tabs`, plus the
  field-class constants (`FIELD_BASE`, `FIELD_TRIGGER`, `FLOATING_*`, …).
- **Inputs / dropdowns:** `NumberInput`, `AmountInput`, `Combobox`, `MultiSelect`,
  `CurrencySelect` (+ `CURRENCIES`, `getCurrency`, `CurrencyFlag`), dropdown
  primitives (`useDropdown`, `useDropdownSearch`, `DropdownPanel`,
  `DropdownSearchHeader`), `CalculatorButton`, the calc engine.
- **Overlays / misc:** `Modal` (+ `useBackdropClose`), `Popover`, `HoverMenu`,
  `Tooltip`, `AlertBanner`, `ToggleGroup`, `WizardStepper`, `FileDropzone`,
  `GroupedPicker`, `MiniCalendar`, the `chart` kit.
- **Data table:** `DataTable` (+ `DataTableColumn`, `FilterState`, `SortState`,
  `ServerPagination`), `Pagination`, filter/sort helpers, `DataTableLabels`.
- **Theme:** `TokenSet`, `PalettePreset`, `DEFAULT_PRESET`, `ALTERNATIVE_PRESETS`,
  `PALETTES`, `presetById`, `applyTokenSet`, `clearTokenSet`, `TOKEN_VARS`,
  `PALETTE_HEX`, chart-colour helpers, and the store factories.
- **Shell:** `TopBar`, `AppShell` (+ `AppShellNavItem`), `ThemeToggle`,
  `PaletteMenu`, `LanguageMenu`, `TOPBAR_TRIGGER_CLASS`, `TOPBAR_MENU_ITEM_CLASS`.
- **Subpath:** date helpers at `@hb/ui/dates`; stylesheet at `@hb/ui/tokens.css`.

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
