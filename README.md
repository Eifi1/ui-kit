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

## Documentation

| | |
|---|---|
| [ADOPTING.md](https://github.com/Eifi1/ui-kit/blob/main/ADOPTING.md) | The brief for a new consuming app — hand it to that repo's agent |
| [MIGRATING.md](https://github.com/Eifi1/ui-kit/blob/main/MIGRATING.md) | Moving an app off the old `@hb/ui` submodule onto the npm package |
| [CHANGELOG.md](https://github.com/Eifi1/ui-kit/blob/main/CHANGELOG.md) | Every release, and the semver contract this package keeps below 1.0 |
| [CONTRIBUTING.md](https://github.com/Eifi1/ui-kit/blob/main/CONTRIBUTING.md) | Repo layout, the house rules, the gates, how to cut a release |
| [Issues](https://github.com/Eifi1/ui-kit/issues) | Bugs and requests |

The links are absolute because only this README is in the npm tarball — `files` ships
`dist`, `src`, `tokens.css` and `LICENSE`, so a reader who arrived from npmjs.com has none
of the others on disk and a relative link would be a 404.

A rendered catalogue of every component, with the theme, palette and language switchers
live, deploys to <https://eifi1.github.io/ui-kit/> on every push to `main`. It needs one
manual repo setting to go live, named at the top of `.github/workflows/pages.yml`; until
then, `npm run dev:showcase` from a checkout is the same page.

## Install

```bash
npm install @eifi1/ui-kit
```

Versions are pinned in your lockfile like any dependency, so each app upgrades
when it chooses. To work on the design system and an app together, use
`npm link` or a workspace override rather than a `file:` path.

### What you install alongside it

| Package | Declared as | Why |
|---|---|---|
| `react`, `react-dom` | peer, `>=19` | The kit is components and hooks; two copies of React break hooks and context. |
| `react-router` | peer, `>=7` | Imported unconditionally by `DataTable`, `useTableState`, `AppShell` and `useWizard`. A Router has to be mounted even with `urlSync` off. |
| `recharts` | peer, `>=3` | `@eifi1/ui-kit/chart` imports it statically. Only that subpath needs it — the main barrel no longer reaches it. |
| `lucide-react` | peer, `>=0.400.0 <2` | Icons, in 33 modules. **Yours to version.** |
| `sonner` | peer, `>=2`, **optional** | `FileDropzone` and the wizard's "fill in the required fields" toast, reached only through `await import()`. Pass `onValidationFailed` to route it elsewhere. |
| `clsx`, `tailwind-merge`, `zustand` | dependency | Small, imported directly, and the kit owns the version. Add `zustand` to Vite's `dedupe` (below) — the theme and palette stores are singletons. |
| `flag-icons` | **nothing — you supply the stylesheet** | See below. |

**`lucide-react` is a peer from 0.5.0, not a dependency.** All three consumers already
declared it themselves, so a hard dependency here bought each of them a second copy of the
icon set — and `^0.511.0` on a 0.x package is a *patch* pin, which held them on 0.511.x
while the line moved to 1.x. The range is wide on purpose: the kit imports named icon
components and nothing else, and that has been stable across the whole span. *Migration:*
none if you already depend on it; otherwise `npm install lucide-react`.

**`flag-icons` is a host contract, not a dependency.** `CurrencyFlag`, `CurrencySelect`
(and `AmountInput`'s currency picker, which uses it) and `LanguageMenu` render flags as
class names — `<span class="fi fi-ch">` — and nothing in the package imports a stylesheet.
The app provides it:

```bash
npm install flag-icons
```

```ts
// main.tsx, once, next to your other global CSS
import "flag-icons/css/flag-icons.min.css";
```

Without it those flags are empty boxes: no error, no warning, just missing glyphs in the
currency picker and the language menu. It was a 5.6 MB hard dependency through 0.4.x —
installed into every consumer and imported by nothing — so it may still be in your tree
transitively after upgrading. Depend on it explicitly if you render any of the three.

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
@import "@eifi1/ui-kit/tokens.css";           /* design tokens, semantic utilities, chrome */
@source "../../node_modules/@eifi1/ui-kit/dist"; /* keep the class names @eifi1/ui-kit uses */
```

**Get this path right, and check it.** Tailwind never scans `node_modules`, so without
`@source` none of the kit's class names are generated and the components render
*unstyled* — laid out, interactive, and completely unpainted. Nothing errors, so it
looks like a broken design system rather than a missing line. The path is relative to
**the CSS file it is written in**, not to the project root; count the `../` from there.

To verify in ten seconds: build, then grep the emitted CSS for a class only this
package uses.

```bash
npm run build && grep -c 'pointer-events-auto' dist/assets/*.css   # 0 means the scan missed
```

Scanning `dist` is the recommended path: it is published by every version. From
v0.5.0 the tarball also ships `src`, so `@source ".../@eifi1/ui-kit/src"` works too and
scans the original TSX rather than transpiled output — but it is not present in
v0.4.x, and an `@source` pointing at a directory that does not exist fails silently.

### 3. Theme + palette stores (own persistence keys)

The stores are factories so each app namespaces its own `localStorage`:

```ts
import { createThemeStore, createPaletteStore } from "@eifi1/ui-kit";
export const { useTheme, useApplyTheme } = createThemeStore("myapp-theme");
export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
  createPaletteStore("myapp-palette", useTheme);
```

Call `useApplyTheme()` + `useApplyPalette()` once near the root. For a no-flash
first paint, apply the persisted theme class + token set **before** hydration —
`applyPersistedTheme(key)` resolves the stored preference, toggles `.dark` and
returns the mode, which `applyPersistedPalette(key, mode)` then uses:

```ts
// main.tsx, at module scope, before createRoot
const mode = applyPersistedTheme("myapp-theme");
applyPersistedPalette("myapp-palette", mode);
```

Worked example: [`showcase/src/main.tsx`](showcase/src/main.tsx).

## Tokens

Everything the components paint with comes from `tokens.css`, so a consuming app
re-skins the kit by changing values rather than by forking components. Three layers:

| Layer | Tokens | Set by |
|---|---|---|
| **Palette** | `--bg-page` `--bg-surface` `--bg-surface-2` `--border` `--text-primary` `--text-secondary` `--text-muted` `--brand` `--brand-hover` `--brand-contrast` `--money-income` `--money-expense` `--money-net` `--money-neutral` `--chart-1…9` | `applyTokenSet()`, written inline on `<html>` from the active `PalettePreset` |
| **Derived** | `--text-placeholder` `--bg-hover` `--bg-active` `--bg-inverse` `--text-inverse` `--border-strong` `--brand-bg` `--brand-bg-hover` `--brand-muted` | `color-mix()` in `tokens.css`, from the layer above — so they follow the preset with no preset having to list them |
| **Semantic** | `--danger*` `--warning*` `--info*`, and `--status-synced/-pending/-edited/-error` | literals in `tokens.css`, per theme |

The semantic layer is deliberately **not** part of `TokenSet`: a destructive action and a
failed save are fixed meanings, and they should not change because somebody picked a
different appearance preset. Everything else does follow the preset.

To re-skin, override the tokens after importing the stylesheet:

```css
@import "@eifi1/ui-kit/tokens.css";

:root  { --brand: #0f766e; --brand-hover: #115e59; --brand-contrast: #fff; }
.dark  { --brand: #5eead4; --brand-hover: #99f6e4; --brand-contrast: #042f2e; }
```

`--brand-bg`, `--brand-bg-hover` and `--brand-muted` are derived from `--brand`, so the
soft brand chips (an active filter, a selected day) follow that override automatically.

`npm run check:tokens` fails if a component reaches for a raw Tailwind palette colour
instead of a token. It is a ratchet: when the count drops, lower the budget in the same
commit.

## Colour

### Three systems, deliberately separate

A colour in this kit belongs to exactly one of three systems, and they are kept apart
because they answer different questions.

| System | Tokens | The question it answers |
|---|---|---|
| **Semantic UI** | `--danger*` `--warning*` `--info*` `--success*`, `--status-*` | *What does this mean?* Danger is red because every other interface the reader has used made it red. Fixed meanings, so they live in `tokens.css` and are **not** part of `TokenSet` — a destructive action must not change colour because somebody picked a different preset. |
| **Semantic data** | `--money-income` `--money-expense` `--money-net` `--money-neutral` | *Which direction is this number?* Never red/green: that pair is exactly the axis dichromacy collapses. Always paired with a `+`/`−` or an arrow at the call site, so colour is never the only signal. |
| **Categorical chart** | `--chart-1` … `--chart-9` | *Which series is this?* No meaning and no order — nine hues that must stay separable from each other. Paul Tol's "Muted" set, CVD-safe across protan/deutan/tritan. `paletteFor(i)` returns the CSS var, so a Recharts series is theme-aware for free. |

Optimising a set for one of these makes it worse at the others. A UI colour needs contrast
against one known surface and carries a fixed meaning; a chart colour needs to stay
separable from eight unknown siblings at roughly equal salience with no implied order.
That is why `derivePalette` leaves the chart ramp alone unless you ask for
`deriveChartRamp` explicitly.

One consequence to know about: the `chart` array it returns is **empty, not absent**. A
caller who hands the result straight to `applyTokenSet` keeps whatever `--chart-1…9` were
already on the element — deliberate, because clearing them would leave charts unpainted,
but it means a derived palette applied over another preset is a *mix* until you supply a
ramp of your own.

### Deriving a palette

```ts
import { derivePalette, auditPalette, auditChartRamp } from "@eifi1/ui-kit";

const { tokens, semantic, audit, warnings } = derivePalette({
  anchors: { brand: "#4f46e5", danger: "#b91c1c" },  // brand required; the rest optional
  mode: "light",
});
```

`brand` is required and `accent`, `danger`, `warning`, `success` and `info` are optional
hard points. Pinned hues are honoured exactly; the rest are placed away from the brand and
from each other, each within its own narrow licence to move — enough to get out of the
brand's way, not enough to stop meaning what it means. If a role cannot get far enough,
that is a `warnings` entry, not a silent compromise.

Everything is **solved to a target and then measured**. Text is solved against the *worst*
of the three surfaces (`--bg-page`, `--bg-surface`, `--bg-surface-2`) — 10:1 primary, 7:1
secondary, 4.6:1 muted by default — because solving against `--bg-surface` alone is the
mistake that makes a muted label fail on the page background it also sits on. The brand
keeps the hue and chroma you asked for and moves only in lightness, and only as far as the
3:1 that WCAG 1.4.11 asks of a control boundary.

It exists because the presets this package shipped were assembled by eye and annotated with
the ratios they were *believed* to hold — `tokens.css` recorded "7.0:1 and 4.8:1",
`palette-presets.ts` recorded "2.67:1 … lifted they clear it at 3.30:1" — and nothing
computed any of them. A comment is not a test. The audit found four of the nine default
light chart hues below 3:1.

`auditPalette(tokens, semantic)` and `auditChartRamp(colors, surfaces)` measure a palette
instead of trusting it, and run in CI over everything the package ships. The ramp report
gives pairwise collisions under normal vision *and* each of the three dichromacies, every
series below 3:1 against a surface it may be drawn on, and the worst of each.

The colour maths (`src/theme/color.ts`: sRGB ↔ OKLab ↔ OKLCH, WCAG contrast, gamut
clipping, dichromat simulation, OKLab ΔE) is dependency-free, and OKLCH rather than HSL
because HSL's "lightness" is not lightness — `hsl(60 100% 50%)` and `hsl(240 100% 50%)`
claim the same 50% and differ about twelvefold in apparent brightness.

### The categorical trade-off, measured

**At a single lightness, the most categorical series that can satisfy both the 3:1 fill
contrast of WCAG 1.4.11 and the dichromat separation floor is four.** Searched exhaustively
over starting hue and lightness:

| Series | Best separation | Both satisfiable |
|---|---|---|
| 4 | 0.065 | yes |
| 5 | 0.041 | no |
| 9 | 0.015 | no |

The floor is 0.05 in OKLab, calibrated rather than chosen: Paul Tol's "Muted" set — known
to work — bottoms out at 0.059 light and 0.032 in the lightened dark variant, and a
threshold above that would fail a palette that is known good, which is worse than no check
at all.

The reason is structural. Dichromacy collapses the red-green axis, so hue alone stops
distinguishing colours past a handful, and the only channel left is **lightness** — the
very thing a uniform-contrast ramp holds constant. Tol's set varies lightness deliberately
and pays for it in contrast; that is not an oversight in their palette, it is the only
currency left. Above four series `deriveChartRamp` varies lightness too, in a three-step
cycle so adjacent series differ in lightness as well as hue, and reports what it gave up.

Two honest caveats. That bound describes the **problem**, not a guarantee about
`deriveChartRamp`: it fixes lightness and starts the hue wheel at the brand's own hue
rather than searching for the best start, so it reaches the bound only where the brand
happens to sit well — sweeping 72 brand hues against the default light surfaces, **7 of 72
produced a passing 4-series ramp** (12 of 72 on dark), and none passed at 5 or 9. Read the
report it returns; do not assume a pass. And `deriveChartRamp` is offered, not used by
default: evenly spaced hues at one lightness are a reasonable generic answer, and Tol's set
is a better specific one, because it was optimised against real confusion lines rather than
derived from a formula.

## Showcase

Every component in the package, rendered on one page, with the theme and palette
switchers live:

```bash
npm run dev:showcase
```

and open **http://localhost:4170**.

The port is harmonised with the sibling apps rather than left on Vite's default, so the
showcase can run next to whatever you are testing it against:

| Port | What |
|---|---|
| **4170** | **this showcase** (`dev:showcase`) |
| **4171** | this showcase, built (`preview:showcase`) |
| 4173 | keksdose frontend (backend 8000) |
| 4175 | lenkbank frontend (backend 8001) |
| 5173 | kastlan frontend (Vite's default) |

`strictPort` is on: a collision fails loudly instead of silently moving to another port
and printing a URL that is not the one documented here. For a throwaway instance that
must not take the port your editor's build task wants:

```bash
SHOWCASE_PORT=4199 npm run dev:showcase
```

It renders **`src/`, not `dist/`** — no build step first, and an edit to a component
is on screen on save. It is also the package's broadest test: `npm test` mounts the
whole page under jsdom, so a component that throws on mount fails CI, and `tsc`
covers it, so an export renamed out of the barrel is a compile error rather than a
demo that quietly disappears.

```
showcase/
  index.html
  vite.config.ts        # root; aliases @eifi1/ui-kit → ../src
  alias.ts              # that alias, shared with the root vitest.config.ts
  src/
    main.tsx            # the pre-hydration no-flash boot, as a worked example
    app.css             # tailwind + tokens.css + the @source scan
    stores.ts           # createThemeStore / createPaletteStore, showcase keys
    showcase.tsx        # the AppShell frame + the SECTIONS registry
    sections/*.tsx      # one file per section
```

Adding a component to the kit means adding it to a section — that is how the page
stays true. `npm run build:showcase` produces a static site; CI builds it on every
push and asserts the emitted CSS actually contains the kit's utility classes, which
is the only automated check that the documented Tailwind `@source` step works.

## Tests

```bash
npm test          # vitest run
npm run test:watch
npm run typecheck
npm run check     # everything CI runs; the pre-push hook runs it and blocks on failure
```

Local first: `npm run check` is the full gate, on your machine, before anything is pushed;
CI calls the same script and only confirms. See CONTRIBUTING.md → "The gates".

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

The full inventory, generated from the build rather than maintained by hand — the
hand-written version named 93 of 263 and had been advertising five deleted wizard exports
since 0.4.0. Regenerate it with `node scripts/gen-export-inventory.mjs` after a build.

Two names that read as something they are not: `WizardStepper` is a bare two-step
indicator and has nothing to do with the wizard engine below, and the feedback exports are
the vocabulary, the transition policy and the look only — each app still wires its own API,
columns, strings and permissions (see the note at the top of `src/feedback/feedback-inbox.tsx`).

<!-- BEGIN GENERATED: exports — node scripts/gen-export-inventory.mjs -->

**705 names from 120 modules** — 368 values and 337 types. _Italic_ is a type-only export.

Generated from `dist/index.d.ts` by `node scripts/gen-export-inventory.mjs`; the count
is pinned by `src/__tests__/public-surface.test.ts`. Do not edit between the markers.

| Entry point | Names |
|---|---|
| `@eifi1/ui-kit` | 705 |
| `@eifi1/ui-kit/chart` | 93 |
| `@eifi1/ui-kit/shell` | 18 |
| `@eifi1/ui-kit/data-table` | 32 |
| `@eifi1/ui-kit/wizard` | 21 |
| `@eifi1/ui-kit/tour` | 7 |
| `@eifi1/ui-kit/feedback` | 29 |
| `@eifi1/ui-kit/search` | 5 |
| `@eifi1/ui-kit/dates` | 20 |
| `@eifi1/ui-kit/table-text` | 8 |
| `@eifi1/ui-kit/rhf` | 13 |

Everything below is reachable from the main `@eifi1/ui-kit` barrel. The subpaths are a
re-slicing of it, never a second API.

### lib — pure helpers

| Module | Exports |
|---|---|
| `lib/calc` | `commitExpression`, `evaluateExpression`, `formatResult`, `isBareAmount`, `looksLikeExpression`, `sanitizeLive`, `splitLeadingSign` |
| `lib/cn` | `cn` |
| `lib/logger` | `logger`, `setStoreLog` |

### hooks

| Module | Exports |
|---|---|
| `hooks/use-media-query` | `useMediaQuery` |
| `hooks/use-body-scroll-lock` | `useBodyScrollLock` |
| `hooks/use-anchored-rect` | `useAnchoredRect`, _`AnchorRect`_ |
| `hooks/use-anchored-panel` | `anchoredPanelPlacement`, `useAnchoredPanel`, `useVisualViewport`, _`AnchoredPanel`_, _`AnchoredPanelOptions`_, _`ViewportBox`_ |
| `hooks/use-dismiss` | `useEscapeKey`, `useOutsideClick` |
| `hooks/use-focus-trap` | `useFocusTrap`, _`FocusTrapOptions`_ |
| `hooks/use-announce` | `useAnnounce`, _`AnnounceRegionProps`_, _`UseAnnounceOptions`_, _`UseAnnounceReturn`_ |
| `hooks/use-overlay-history` | `useOverlayHistory` |
| `hooks/use-close-transition` | `OVERLAY_EXIT_MS`, `useCloseTransition` |
| `hooks/use-row-swipe` | `useRowSwipe`, _`RowSwipeOptions`_, _`RowSwipeReturn`_, _`SwipeStage`_ |
| `hooks/use-file-drop` | `dragHasFiles`, `useFileDrop`, _`FileDropProps`_, _`UseFileDropOptions`_, _`UseFileDropReturn`_ |
| `hooks/use-debounce` | `useDebounce`, `useDebouncedCallback`, _`DebouncedCallbackOptions`_, _`DebouncedFunction`_ |
| `hooks/use-copy-to-clipboard` | `copyToClipboard`, `useCopyToClipboard`, _`CopyState`_, _`UseCopyToClipboardOptions`_, _`UseCopyToClipboardReturn`_ |
| `hooks/use-windowed-rows` | `useWindowedRows`, _`WindowedRows`_ |

### theme, palettes, colour

| Module | Exports |
|---|---|
| `theme/chart-palette` | `CHART_COLORS`, `HEATMAP_HEX`, `lerpHex`, `PALETTE_HEX`, `paletteFor`, `textOn`, _`HeatStops`_ |
| `theme/color` | `contrast`, `deltaE`, `hexToOklch`, `luminance`, `oklchToHex`, `oklchToRgb`, `parseHex`, `rgbToOklch`, `simulateCvd`, `solveLightness`, `toHex`, _`CvdType`_, _`Oklch`_, _`Rgb`_ |
| `theme/palette-derive` | `auditChartRamp`, `auditPalette`, `deriveChartRamp`, `derivePalette`, `describe`, _`AnchorRole`_, _`ChartRampReport`_, _`ContrastCheck`_, _`ContrastReport`_, _`DerivedPalette`_, _`DeriveOptions`_, _`PaletteAnchors`_, _`SemanticTokens`_ |
| `theme/palette-presets` | `ALTERNATIVE_PRESETS`, `applyTokenSet`, `DEFAULT_PRESET`, `DERIVED_PRESETS`, `IMPRINT_PRESET`, `PALETTES`, `presetById`, _`PalettePreset`_, _`TokenSet`_ |
| `theme/theme-store` | `applyPersistedTheme`, `createThemeStore`, _`ThemeMode`_, _`ThemePreference`_, _`ThemeState`_, _`ThemeStore`_ |
| `theme/palette-store` | `applyPersistedPalette`, `createPaletteStore`, _`PaletteStore`_ |

### components

| Module | Exports |
|---|---|
| `components/ui` | `Button`, `buttonClasses`, `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, `DEFAULT_PASSWORD_REVEAL_LABELS`, `DEFAULT_TABS_LABELS`, `EmptyState`, `FIELD_BASE`, `FIELD_DISPLAY`, `FIELD_FLOATING_PAD`, `FIELD_INVALID`, `FIELD_TRIGGER`, `FIELD_WRITABLE_LOOK`, `FieldChevron`, `FieldHint`, `FieldLabel`, `FLOATING_INPUT_CLASS`, `FLOATING_LABEL_CLASS`, `FLOATING_LABEL_STATIC`, `FloatingField`, `IconButton`, `Input`, `Label`, `PHONE_QUERY`, `resolvePasswordRevealLabels`, `Select`, `Spinner`, `Tabs`, `Textarea`, _`ButtonClassesOptions`_, _`ButtonProps`_, _`ButtonSize`_, _`ButtonVariant`_, _`CardActionProps`_, _`CardContentProps`_, _`CardDescriptionProps`_, _`CardFooterProps`_, _`CardHeaderProps`_, _`CardProps`_, _`CardTitleProps`_, _`EmptyStateProps`_, _`FieldChevronProps`_, _`FieldHintProps`_, _`FieldLabelProps`_, _`FloatingFieldProps`_, _`IconButtonProps`_, _`IconButtonSize`_, _`InputProps`_, _`LabelProps`_, _`PasswordRevealLabels`_, _`SelectProps`_, _`SpinnerProps`_, _`TabItem`_, _`TabsLabels`_, _`TabsProps`_, _`TextareaProps`_ |
| `components/search-field` | `SearchField`, _`SearchFieldProps`_ |
| `components/dropdown` | `DropdownPanel`, `DropdownSearchHeader`, `useDropdown`, `useDropdownSearch`, _`DropdownPanelProps`_, _`DropdownSearchHeaderProps`_ |
| `components/popover` | `DEFAULT_POPOVER_LABELS`, `Popover`, _`PopoverLabels`_, _`PopoverProps`_ |
| `components/swipeable-row` | `SwipeableRow`, _`SwipeableRowProps`_, _`SwipeAction`_ |
| `components/calculator` | `CalculatorButton`, _`CalculatorButtonLabels`_ |
| `components/numpad-sheet` | `NumberPadSheet`, _`NumberPadSheetLabels`_ |
| `components/number-input` | `NumberInput`, `stepNumber` |
| `components/currency-select` | `CURRENCIES`, `CurrencyFlag`, `currencyName`, `CurrencySelect`, `getCurrency`, _`CurrencyFlagProps`_, _`CurrencyOption`_, _`CurrencySelectProps`_ |
| `components/amount-input` | `AmountInput` |
| `components/combobox` | `Combobox`, `InlineEntityCombobox`, _`ComboboxProps`_, _`InlineEntityComboboxProps`_ |
| `components/picker-sheet` | `PickerSheet`, `SHEET_ROW_CLASS`, _`PickerSheetProps`_ |
| `components/entity-combobox` | `EntityCombobox`, _`EntityComboboxProps`_ |
| `components/multi-entity-combobox` | `MultiEntityCombobox`, _`MultiEntityComboboxProps`_ |
| `components/multi-select` | `MultiSelect`, _`MultiSelectOption`_, _`MultiSelectProps`_ |
| `components/tooltip` | `placeTooltip`, `Tooltip`, _`TooltipPlacement`_, _`TooltipProps`_, _`TooltipSide`_, _`TooltipSize`_, _`TooltipViewport`_ |
| `components/user-avatar` | `avatarInitials`, `UserAvatar`, _`UserAvatarProps`_ |
| `components/settings-fields` | `LanguageSetting`, `ThemeSetting`, _`LanguageSettingProps`_, _`ThemeSettingProps`_ |
| `components/field-sync` | `DEFAULT_FIELD_SYNC_LABELS`, `FIELD_SYNC_FRAME`, `FIELD_SYNC_SAVED_MS`, `FieldSyncIndicator`, `FieldSyncRow`, `resolveFieldSyncLabels`, `useFieldSync`, _`FieldSyncIndicatorProps`_, _`FieldSyncLabels`_, _`FieldSyncRowProps`_, _`FieldSyncState`_, _`UseFieldSyncOptions`_, _`UseFieldSyncReturn`_ |
| `components/month-picker` | `DEFAULT_MONTH_PICKER_LABELS`, `MonthPicker`, _`MonthPickerLabels`_, _`MonthPickerProps`_ |
| `components/checkbox` | `Checkbox`, _`CheckboxProps`_ |
| `components/switch` | `Switch`, _`SwitchProps`_, _`SwitchSize`_ |
| `components/slider` | `fromLogPosition`, `Slider`, `toLogPosition`, _`SliderMark`_, _`SliderProps`_ |
| `components/time-input` | `isTimeInRange`, `normalizeTime`, `TimeInput`, _`TimeInputProps`_ |
| `components/number-field` | `NumberField`, _`NumberFieldProps`_ |
| `components/sparkline` | `DEFAULT_SPARKLINE_LABELS`, `Sparkline`, `sparklineSummary`, _`SparklineLabels`_, _`SparklineProps`_, _`SparklineTone`_ |
| `components/stat-tile` | `DEFAULT_STAT_TILE_LABELS`, `StatTile`, `StatTileGrid`, _`StatTileDelta`_, _`StatTileGridProps`_, _`StatTileLabels`_, _`StatTileLinkProps`_, _`StatTileProps`_, _`StatTileSubValue`_, _`StatTileTone`_ |
| `components/signature-pad` | `DEFAULT_SIGNATURE_PAD_LABELS`, `SignaturePad`, `SignatureView`, _`SignatureDetail`_, _`SignaturePadHandle`_, _`SignaturePadLabels`_, _`SignaturePadProps`_, _`SignatureViewProps`_ |
| `components/password-strength` | `DEFAULT_PASSWORD_STRENGTH_LABELS`, `passwordByteLength`, `passwordRules`, `PasswordStrengthMeter`, `scorePassword`, _`PasswordRule`_, _`PasswordRuleId`_, _`PasswordScoreOptions`_, _`PasswordStrengthLabels`_, _`PasswordStrengthMeterProps`_, _`PasswordStrengthScore`_ |
| `components/page-contents` | `DEFAULT_PAGE_CONTENTS_LABELS`, `PageContents`, `PageContentsLayout`, `useScrollSpy`, _`PageContentsItem`_, _`PageContentsLabels`_, _`PageContentsLayoutProps`_, _`PageContentsProps`_, _`UseScrollSpyOptions`_ |
| `components/disclosure` | `Collapse`, `Disclosure`, _`CollapseProps`_, _`DisclosureProps`_, _`DisclosureTriggerProps`_ |
| `components/dialog-frame` | `DEFAULT_DIALOG_FRAME_LABELS`, `DialogFrame`, _`DialogFrameLabels`_, _`DialogFrameProps`_ |
| `components/danger-confirm` | `DangerConfirm`, `DEFAULT_DANGER_CONFIRM_LABELS`, _`DangerConfirmLabels`_, _`DangerConfirmProps`_ |
| `components/confirm-dialog` | `ConfirmProvider`, `DEFAULT_CONFIRM_DIALOG_LABELS`, `useConfirm`, _`ConfirmDialogLabels`_, _`ConfirmFn`_, _`ConfirmOptions`_, _`ConfirmProviderProps`_, _`ConfirmTone`_ |
| `components/floating-panel` | `DEFAULT_FLOATING_PANEL_LABELS`, `FloatingActionButton`, `FloatingPanel`, _`FloatingActionButtonProps`_, _`FloatingCorner`_, _`FloatingPanelLabels`_, _`FloatingPanelProps`_ |
| `components/swatch-picker` | `DEFAULT_SWATCH_PICKER_LABELS`, `SwatchPicker`, _`SwatchOption`_, _`SwatchPickerLabels`_, _`SwatchPickerProps`_ |
| `components/icon-picker` | `DEFAULT_ICON_PICKER_LABELS`, `IconPicker`, _`IconOption`_, _`IconPickerLabels`_, _`IconPickerProps`_ |
| `components/choice-card` | `ChoiceCard`, `ChoiceCardGroup`, _`ChoiceCardGroupProps`_, _`ChoiceCardMultipleProps`_, _`ChoiceCardOption`_, _`ChoiceCardProps`_, _`ChoiceCardSingleProps`_, _`ChoiceCardType`_ |
| `components/autocomplete` | `Autocomplete`, _`AutocompleteProps`_ |
| `components/measured-grid` | `DEFAULT_MEASURED_GRID_LABELS`, `MeasuredGrid`, `useMeasuredRows`, _`MeasuredGridColumn`_, _`MeasuredGridLabels`_, _`MeasuredGridProps`_, _`MeasuredGridView`_, _`MeasuredRows`_, _`UseMeasuredRowsOptions`_ |
| `components/file-button` | `DEFAULT_FILE_PICKER_LABELS`, `FileButton`, `matchesAccept`, `useFilePicker`, _`FileButtonProps`_, _`FilePickerLabels`_, _`FileRejection`_, _`FileRejectionReason`_, _`FileScreenOptions`_, _`UseFilePickerOptions`_, _`UseFilePickerReturn`_ |
| `components/treemap` | `fitLabel`, `Treemap`, `TreemapCell`, _`TreemapCellProps`_, _`TreemapNode`_, _`TreemapProps`_ |
| `components/series-chart` | `anchoredBand`, `AXIS_TICK_WIDTH`, `AXIS_TITLE_STRIP`, `axisBandWidth`, `mergeSeries`, `oneAxis`, `padBand`, `paddedDomain`, `SeriesChart`, `seriesKey`, `seriesLegendEntries`, `soleSeriesColor`, `StaticSeriesChart`, `visibleSeries`, _`SeriesChartAxis`_, _`SeriesChartHit`_, _`SeriesChartMarker`_, _`SeriesChartPoint`_, _`SeriesChartProps`_, _`SeriesChartReference`_, _`SeriesChartRow`_, _`SeriesChartSeries`_, _`SeriesChartSpan`_, _`SeriesChartTickValues`_, _`SeriesChartTone`_, _`SeriesChartTooltip`_, _`SeriesChartType`_, _`SeriesChartX`_, _`SeriesChartXTick`_, _`SeriesChartXValue`_, _`SeriesSource`_ |
| `components/chart-zoom` | `axisExtent`, `DEFAULT_Y_AXIS`, `defaultZoomAxes`, `fitXToY`, `fitYToX`, `NO_ZOOM`, `selectionFromDrag`, `SharedXZoom`, `withChartZoom`, `ZOOM_MIN_DRAG`, `ZOOM_SQUARE_ENOUGH`, `zoomAfter`, `zoomAxesFor`, `zoomDomains`, _`ZoomAxes`_, _`ZoomAxesSetting`_, _`ZoomBinding`_, _`ZoomDrag`_, _`ZoomFitSeries`_, _`ZoomFitSource`_, _`ZoomRow`_, _`ZoomSelection`_, _`ZoomState`_, _`ZoomTarget`_ |
| `components/toggle-legend` | `LegendColumn`, `LegendGroup`, `STEP_DASH`, `STROKE_PATTERNS`, `strokeDash`, `toggleHidden`, `ToggleLegend`, _`LegendEntry`_, _`ToggleLegendProps`_ |
| `components/facing-pair` | `FACING_SIDES`, `facingAxes`, `facingBand`, `facingHeadingPad`, _`FacingSide`_ |
| `components/series-chart-labels` | `DEFAULT_SERIES_CHART_LABELS`, _`SeriesChartLabels`_ |
| `components/account-settings` | `PasswordSetting`, `ProfileSetting`, `TwoFactorSetting`, _`PasswordSettingLabels`_, _`ProfileSettingLabels`_, _`TwoFactorSettingLabels`_ |
| `components/alert-banner` | `AlertBanner`, `alertFrameClass`, `toneFrameClass`, _`AlertBannerProps`_, _`AlertTone`_ |
| `components/toggle-group` | `ToggleGroup`, _`ToggleGroupBaseProps`_, _`ToggleGroupClearableProps`_, _`ToggleGroupProps`_, _`ToggleGroupRequiredProps`_, _`ToggleOption`_ |
| `components/chip` | `Chip`, `ChipInput`, `DEFAULT_CHIP_INPUT_LABELS`, `resolveChipInputLabels`, _`ChipInputLabels`_, _`ChipInputProps`_, _`ChipLinkProps`_, _`ChipProps`_, _`ChipShape`_, _`ChipSize`_, _`ChipTone`_, _`ChipVariant`_ |
| `components/wizard-stepper` | `WizardStepper` |
| `components/hover-menu` | `HoverMenu`, _`HoverMenuProps`_ |
| `components/modal` | `Modal`, `ModalCloseContext`, `useBackdropClose`, _`ModalProps`_ |
| `components/full-bleed-dialog` | `FullBleedDialog`, _`FullBleedDialogProps`_ |
| `components/grouped-picker` | `GroupedPicker`, _`GroupedPickerProps`_, _`PickerGroup`_ |
| `components/file-dropzone` | `FileDropzone`, _`FileDropzoneProps`_, _`FileDropzoneRejectionFeedback`_, _`FileDropzoneState`_ |
| `components/mini-calendar` | `DEFAULT_MINI_CALENDAR_LABELS`, `MiniCalendar`, _`MiniCalendarLabels`_, _`MiniCalendarProps`_, _`WeekDay`_ |
| `components/date-picker` | `DatePicker`, `DateRangePicker`, _`DatePickerProps`_, _`DateRangeCommit`_, _`DateRangePickerPreset`_, _`DateRangePickerProps`_ |
| `components/tree-view` | `TreeRow`, `TreeView`, _`TreeItemState`_, _`TreeNode`_, _`TreeRowProps`_, _`TreeViewProps`_ |
| `components/chart` | `ChartContainer`, `ChartLegend`, `ChartLegendContent`, `ChartTooltip`, `ChartTooltipContent`, `useChart`, _`ChartConfig`_, _`ChartSeriesConfig`_ |
| `components/description-list` | `DescriptionItem`, `DescriptionList`, _`DescriptionItemProps`_, _`DescriptionListDensity`_, _`DescriptionListLayout`_, _`DescriptionListProps`_ |
| `components/progress-bar` | `ProgressBar`, _`ProgressBarProps`_, _`ProgressBarSize`_, _`ProgressBarTone`_ |
| `components/skeleton` | `Skeleton`, _`SkeletonProps`_, _`SkeletonShape`_ |
| `components/copy-button` | `CopyButton`, `DEFAULT_COPY_BUTTON_LABELS`, _`CopyButtonLabels`_, _`CopyButtonProps`_ |
| `components/button-group` | `ButtonGroup`, _`ButtonGroupProps`_ |
| `components/table` | `NUMERIC_CELL_CLASS`, `Table`, `TableBody`, `TableCaption`, `TableCell`, `TableFoot`, `TableHead`, `TableHeaderCell`, `TableRow`, _`TableAlign`_, _`TableBodyProps`_, _`TableCaptionProps`_, _`TableCellProps`_, _`TableDensity`_, _`TableFootProps`_, _`TableHeaderCellProps`_, _`TableHeadProps`_, _`TableProps`_, _`TableRowProps`_ |
| `components/separator` | `Separator`, _`SeparatorProps`_ |
| `components/scroll-area` | `ScrollArea`, _`ScrollAreaProps`_ |
| `components/data-table-labels` | `DEFAULT_DATA_TABLE_LABELS`, `missingDataTableLabels`, `resolveDataTableLabels`, _`DataTableLabels`_ |
| `components/data-table-sort` | `decodeSorts`, `encodeSorts`, `nextSorts`, `normalizeSorts`, _`SortCycle`_, _`SortDir`_, _`SortState`_, _`SortStepOptions`_ |
| `components/data-table-filters` | `decodeFilterValue`, `decodeFilterValueOfType`, `defaultFilterState`, `encodeFilterValue`, `isFilterActive`, `resolveFilter`, `rowMatches`, _`ColumnFilter`_, _`FilterValue`_ |
| `components/data-table` | `DataTable`, _`DataTableChrome`_, _`DataTableColumn`_, _`DataTableDensity`_, _`DataTableProps`_, _`FilterState`_, _`MobileSwipeActions`_, _`ServerPagination`_ |
| `components/data-table-pagination` | `PAGE_SIZE_OPTIONS`, `Pagination` |
| `components/data-table-filter-popover` | `FilterPopover` |
| `components/combobox-core` | _`ComboClearValue`_, _`ComboOption`_ |
| `components/series-chart-ticks` | _`TimeTickUnit`_ |

### shell

| Module | Exports |
|---|---|
| `shell/topbar-controls` | `LanguageMenu`, `PaletteMenu`, `ThemeToggle`, `TOPBAR_MENU_ITEM_CLASS`, `TOPBAR_TRIGGER_CLASS`, _`LanguageOption`_ |
| `shell/top-bar` | `TopBar`, _`TopBarProps`_ |
| `shell/app-shell` | `AppShell`, _`AppShellNavItem`_, _`AppShellProps`_, _`AppShellSubItem`_ |
| `shell/option-switcher-menu` | `OptionSwitcherMenu`, _`OptionSwitcherOption`_ |
| `shell/role-switcher` | `RoleSwitcher`, _`RoleSwitcherProps`_ |
| `shell/topbar-action-menu` | `TopBarActionMenu`, _`TopBarMenuEntry`_ |

### feedback

| Module | Exports |
|---|---|
| `feedback/feedback-attachment` | `DEFAULT_ATTACHMENT_ACCEPT`, `DEFAULT_FEEDBACK_ATTACHMENT_LABELS`, `DEFAULT_MAX_ATTACHMENT_BYTES`, `FeedbackAttachmentField`, `pastedName`, _`FeedbackAttachmentFieldLabels`_ |
| `feedback/feedback-dialog` | `FeedbackDialog`, _`FeedbackAttachmentLabels`_, _`FeedbackCategoryOption`_, _`FeedbackDialogLabels`_, _`FeedbackSubmission`_ |
| `feedback/feedback-inbox` | `FEEDBACK_CATEGORY_META`, `FEEDBACK_CATEGORY_ORDER`, `FEEDBACK_STATUS_META`, `FEEDBACK_STATUS_ORDER`, `FeedbackCategoryBadge`, `feedbackCategoryRank`, `FeedbackDetail`, `FeedbackDetailSection`, `FeedbackNoteEditor`, `FeedbackProse`, `FeedbackStatusBadge`, `FeedbackStatusTransitions`, `nextFeedbackStatus`, `selectableFeedbackStatuses`, `visibleFeedbackStatuses`, _`FeedbackCategory`_, _`FeedbackNoteAttachment`_, _`FeedbackStatus`_ |

### wizard

| Module | Exports |
|---|---|
| `wizard/types` | `DEFAULT_WIZARD_LABELS`, `resolveWizardLabels`, _`FieldErrors`_, _`StepStatus`_, _`SummaryItem`_, _`SummarySection`_, _`UseWizardOptions`_, _`UseWizardReturn`_, _`ValidateResult`_, _`WizardLabels`_, _`WizardStepConfig`_, _`WizardUrlSync`_ |
| `wizard/use-wizard` | `useWizard` |
| `wizard/wizard-context` | `useWizardContext`, `WizardContextProvider`, _`WizardContextValue`_ |
| `wizard/validation` | `requiredFieldsValidator`, _`RequiredFieldSpec`_ |
| `wizard/wizard-step` | `WizardStep` |
| `wizard/wizard-summary` | `WizardSummary` |
| `wizard/stepper-nav` | `StepperNav` |

### tour

| Module | Exports |
|---|---|
| `tour/tour` | `DEFAULT_TOUR_LABELS`, `TourProvider`, `useTour`, `useTourOptional`, _`TourLabels`_, _`TourPlacement`_, _`TourStep`_ |

### search

| Module | Exports |
|---|---|
| `search/command-palette` | `CommandPalette`, `DEFAULT_COMMAND_PALETTE_LABELS`, `useCommandKey`, _`CommandItem`_, _`CommandPaletteLabels`_ |

### i18n

| Module | Exports |
|---|---|
| `i18n/kit-labels` | `DEFAULT_APP_SHELL_LABELS`, `DEFAULT_CALCULATOR_LABELS`, `DEFAULT_COMBOBOX_LABELS`, `DEFAULT_COMMON_LABELS`, `DEFAULT_CURRENCY_LABELS`, `DEFAULT_DATE_PICKER_LABELS`, `DEFAULT_FILE_LABELS`, `DEFAULT_MULTI_SELECT_LABELS`, `DEFAULT_PICKER_SHEET_LABELS`, `DEFAULT_SWIPEABLE_ROW_LABELS`, `DEFAULT_TOP_BAR_LABELS`, `formatFileSize`, `missingKitLabels`, `UiKitProvider`, `useKitFileLabels`, `useKitLabelOverrides`, `useKitLabels`, `useKitLocale`, `useKitWeekStart`, _`AppShellLabels`_, _`CalculatorLabels`_, _`ComboboxLabels`_, _`CommonLabels`_, _`CurrencyLabels`_, _`DatePickerLabels`_, _`FileLabels`_, _`MultiSelectLabels`_, _`PickerSheetLabels`_, _`SwipeableRowLabels`_, _`TopBarLabels`_, _`UiKitLabelOverrides`_, _`UiKitLabels`_, _`UiKitProviderProps`_ |
| `i18n/defaults` | `DEFAULT_UI_KIT_LABELS` |

<!-- END GENERATED: exports -->

## Forms / refs

`Input`, `Select`, `Textarea` and `AmountInput` forward their `ref` to the
underlying DOM element, so they work directly with react-hook-form:
`<Input {...field} />` (from `Controller`/`register`) attaches RHF's ref, giving
focus-and-scroll-to-error for free. For the full `FormField`/`FormControl` scaffolding,
see `@eifi1/ui-kit/rhf` below.

### react-hook-form — `@eifi1/ui-kit/rhf` (optional)

A thin adapter in shadcn's `form.tsx` shape, and the only entry that needs
`react-hook-form` (an **optional** peer, `^7.55.0`). The main barrel does not import it,
so apps without a form library install nothing.

```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@eifi1/ui-kit/rhf";

<Form {...form}>
  <FormField control={form.control} name="amount" render={({ field }) => (
    <FormItem>
      <FormLabel required>Amount</FormLabel>
      <FormControl>
        <NumberField value={field.value} onCommit={field.onChange} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )} />
</Form>
```

`FormControl` gives its one child `id`, `aria-describedby` (only the description and
message actually rendered, merged after the child's own) and `aria-invalid` — which every
kit field now also PAINTS from, so no extra `invalid` prop is needed. `FormMessage` shows
the form's own message; the kit adds no text. `useFormField()` exposes the ids and field
state for custom parts.

### Pasted and imported tables — `@eifi1/ui-kit/table-text`

Pure functions over strings (no React, nothing to install): one lexer for a table pasted
out of a spreadsheet or read from a CSV, with the comma decided by a named rule rather
than a guess.

- `parseTable(text, { decimal, columns?, headerLines? })` → `{ rows, header, decimalComma, skipped }`
  - `decimal: "whole-text"` — a **file**: separator and decimal mark decided once for the
    whole text, and reported back as `decimalComma`.
  - `decimal: "per-line"` — a **paste**: each line read on its own evidence.
  - `columns` slices extra columns off and reports shorter lines; `skipped` holds 1-based
    line numbers as they stand in the text.
- `parseRows(text, width)` — the paste door: `{ rows }`, or `{ error: line }` naming the
  first unreadable line (never a silent empty table).
- `splitRow(line)`, `cellNumber(cell)`, `isCellNumber(cell)` — a single cell's comma is
  always a decimal mark.

Not handled, on purpose: thousands separators (reported, not guessed), quoted fields,
empty cells held open as holes.

## i18n

**The kit resolves no strings.** It carries no translation catalogue, no locale detection
and no `t()`. Every string it renders is a key in one typed tree, `UiKitLabels`, with an
English default — and the app hands its translation to every component at once:

```tsx
import { UiKitProvider } from "@eifi1/ui-kit";

<UiKitProvider labels={de} locale="de-DE">   {/* de: UiKitLabels, or any part of it */}
  <App />
</UiKitProvider>
```

Precedence is fixed: **a component's own prop > the provider > the English default.** So
one table can still say `labels={{ table: "Transactions" }}` inside a German app, and a
component outside any provider behaves exactly as it always did.

The tree is namespaced by component and addressed by dot path — `dataTable.pageSize`,
`miniCalendar.previousMonth`, `datePicker.today`, `appShell.collapse`,
`common.fieldValue` — and `DEFAULT_UI_KIT_LABELS` is the whole English reference in one
object. Write the translation against its type and `tsc` refuses a missing key; for a
translation built at runtime, assert in the app's own test:

```ts
expect(missingKitLabels(de, DEFAULT_UI_KIT_LABELS)).toEqual([]);
```

The provider's `locale` reaches every `Intl` formatter in the kit that is not handed a
`locale` prop of its own: calendar month and weekday names, day numbers, the data table's
counts, file sizes.

**Why a provider, when every component already took a `labels` prop.** Because a prop has
to be passed at every call site, under a different name per component (`labels`,
`calendarLabels`, `passwordLabels`, `clearLabel`, `ariaLabel` …), and one forgotten prop is
one English word in a German UI that nothing reports. Worse, a component NESTED inside
another — the calendar inside the data table's date filter, the popover inside the date
picker — could not be reached from the outer call site at all. The per-component props
still work and still win; they are now the exception rather than the mechanism.

**A label that interpolates a value is a function of that value, never a template.** Word
order, pluralisation and where the number goes are the translator's business, and a string
with a `{count}` hole in it decides all three on their behalf:

```ts
// UiKitLabels["dataTable"]
pageChanged: (page: number, totalPages: number) => string;
// UiKitLabels["common"] — even "Label: value" is not universal punctuation
fieldValue: (field: string, value: string) => string;
```

### The worked example

`showcase/src/i18n/` runs the whole showcase in seven locales — English, German, French,
Italian, Spanish, Hungarian and Chinese — and it is deliberately **not** an i18n library: a
dictionary in context, a hook to read it, and ONE `<UiKitProvider labels={dict.kit}
locale={dict.tag}>` at the root. Each dictionary's `kit` is typed as the full
`UiKitLabels`, so a translation with a hole does not compile; the Localisation page shows
the tree and the per-language completeness live. The long explanatory prose on each page is
*not* translated: it is developer documentation about the kit's internals. The chrome, the
navigation and every component label are.

### Right-to-left is partial

Newer components (the sidebar's inline groups, the date range band, the month picker, the
checkbox, switch and slider) use logical properties (`ms-*`, `pe-*`, `text-start`) and
flip correctly under `dir="rtl"`. The older ones still carry roughly 130 physical-direction
utilities plus pointer maths (column resize, row swipe) that assume left-to-right —
`docs/module-audit-2026-09-22.md` §10 has the site-by-site detail. None of the showcase's
seven locales is right-to-left, so nothing exercises it today; plan around that before
shipping Arabic or Hebrew.

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

A step gates forward navigation two ways, and `goNext` runs both: its `validate`
in the config above, and `useWizardStepValidate(fn)` for a step that checks by
hand. `useWizardNextGate(blocked)` disables Next/Skip outright.

Like the rest of the package it resolves **no strings**: a step carries a `label`
node, and the chrome takes a `labels` object (`WizardLabels`, every key optional
over an English default) — the same split `DataTable` and `TourProvider` use. An
app with i18n wraps `useWizard`/`StepperNav`/`WizardSummary` once and maps its
own keys; see Kastlan's `shared/components/wizard/app-wizard.tsx`.

**Peers.** `react-router` backs the `?step=` sync in `useWizard` — and is imported
unconditionally, so a wizard needs a Router mounted even if you never read the
step from the URL. `sonner` carries the "fill in the required fields" toast and is
imported dynamically, on that failure path only — pass `onValidationFailed` to
route it elsewhere.

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
