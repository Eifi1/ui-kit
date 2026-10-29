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

## Compatibility with server-kit

The backend half, [`eifi1-server-kit`](https://github.com/Eifi1/server-kit), is a separate
package with its own version and changelog. **ui-kit 0.51 ↔ server-kit 0.20**: this release
is tested against server-kit 0.20.0's API export (the showcase's Server kit pages and the
vocabulary test, `showcase/src/__tests__/server-kit-vocabularies.test.ts`).

## Documentation

| | |
|---|---|
| [ADOPTING.md](https://github.com/Eifi1/ui-kit/blob/main/ADOPTING.md) | The brief for a new consuming app — hand it to that repo's agent |
| [CHANGELOG.md](https://github.com/Eifi1/ui-kit/blob/main/CHANGELOG.md) | Every release, and the semver contract this package keeps below 1.0 |
| [docs/](https://github.com/Eifi1/ui-kit/blob/main/docs/README.md) | The contracts the three apps build to, each release's adoption notes, the audits and plans |
| [CONTRIBUTING.md](https://github.com/Eifi1/ui-kit/blob/main/CONTRIBUTING.md) | Repo layout, the house rules, the tests, the showcase, the gates, how to cut a release |
| [Showcase](https://eifi1.github.io/ui-kit/) | The kit rendered page by page, deployed after every green CI run on `main` (see [Showcase](#showcase)) |
| [Issues](https://github.com/Eifi1/ui-kit/issues) | Bugs and requests |

The links are absolute because only this README is in the npm tarball — `files` ships
`dist`, `src`, `tokens.css` and `LICENSE`, so a reader who arrived from npmjs.com has none
of the others on disk and a relative link would be a 404.

Kurvenschmiede was called **lenkbank** until 2026-10-01 (repository `Eifi1/kurvenschmiede`,
formerly `Eifi1/lenkbank`). The changelog, older adoption notes and code comments that cite
its feedback ("lenkbank L2", "Lenkbank feedback #93") keep the name they were written with.

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
| `react`, `react-dom` | peer, `>=19.2` | The kit is components and hooks; two copies of React break hooks and context. 19.2 for `useEffectEvent`. |
| `react-router` | peer, `>=7` | Imported unconditionally by `DataTable`, `useTableState`, `AppShell` and `useWizard`. A Router has to be mounted even with `urlSync` off. |
| `recharts` | peer, `>=3.8` | The chart kit imports it statically, and the main barrel re-exports the chart kit, so `import { Button } from "@eifi1/ui-kit"` needs it installed too (required since 0.5.0). `@eifi1/ui-kit/chart` is about chunk size, not about avoiding the peer. 3.8 for `useXAxisInverseScale` (the zoom). |
| `lucide-react` | peer, `>=0.400.0 <2` | Icons, imported by name throughout the kit. **Yours to version.** |
| `sonner` | peer, `>=2`, **optional** | Under the kit's `toast` and `<Toaster>` (and through them `FileDropzone` and the wizard's "fill in the required fields" toast), reached only through `await import()`. Pass `onValidationFailed` to route the wizard's elsewhere. |
| `react-hook-form` | peer, `^7.55.0`, **optional** | Only `@eifi1/ui-kit/rhf` imports it; the main barrel does not (see "Forms / refs" below). |
| `modern-screenshot` | peer, `^4.7.0`, **optional** | The feedback dialog's "Capture screenshot" (`captureAppScreenshot`), reached only through `await import()`. Without it the capture rejects and the dialog toasts `feedbackToast.captureFailed`. |
| `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` | peer, `^5`, **optional** | Only `@eifi1/ui-kit/offline` imports them (0.45, the persisted query cache, `createQueryPersistence`); the main barrel does not. |
| `idb-keyval` | peer, `^6`, **optional** | The persisted cache's default IndexedDB store, in `@eifi1/ui-kit/offline` only. |
| `dexie` | peer, `^4`, **optional** | The sync engine's device copy, in `@eifi1/ui-kit/sync` only (0.46); `/offline` loads without it. |
| `@testing-library/react` | peer, `>=16`, **optional** | `rowMenuAction` in `@eifi1/ui-kit/testing/react` only (0.50), for an app's own tests; `@eifi1/ui-kit/testing` stays pure. |
| `clsx`, `tailwind-merge`, `zustand` | dependency | Small, imported directly, and the kit owns the version. Add `zustand` to Vite's `dedupe` (below) — the appearance stores are singletons. |
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

**Shipping only the flags you render.** `@eifi1/ui-kit/currencies` (0.34.1) is the
currency list as plain data — `CURRENCIES`, and `CURRENCY_COUNTRIES` (code → the lowercase
country flag-icons names the flag by: `CHF` → `"ch"`, `EUR` → `"eu"`). It imports nothing,
so a build script or a Vite plugin can import it in Node to generate a flag subset. Read
it there, never out of a file under `dist/`: those move between versions.

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

### 3. Appearance stores (own persistence keys)

The stores are factories so each app namespaces its own `localStorage`: theme, palette,
text size and contrast.

```ts
import { createContrastStore, createPaletteStore, createTextSizeStore, createThemeStore } from "@eifi1/ui-kit";
export const { useTheme, useApplyTheme } = createThemeStore("myapp-theme");
export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
  createPaletteStore("myapp-palette", useTheme);
export const { useTextSizeStore, useApplyTextSize } = createTextSizeStore("myapp-text-size");
export const { useContrastStore, useApplyContrast } = createContrastStore("myapp-contrast");
```

Call `useApplyTheme()`, `useApplyPalette()`, `useApplyTextSize({ account })` and
`useApplyContrast({ account })` once near the root; `account` is the signed-in user's
saved value, which applies while this device has no choice of its own. For a no-flash
first paint, apply all four **before** hydration — `applyPersistedTheme(key)` resolves the
stored preference, toggles `.dark` and returns the mode, which
`applyPersistedPalette(key, mode)` then uses:

```ts
// main.tsx, at module scope, before createRoot (readPersistedUser is the app's own)
const mode = applyPersistedTheme("myapp-theme");
applyPersistedPalette("myapp-palette", mode);
applyPersistedTextSize("myapp-text-size", { account: () => readPersistedUser()?.text_size });
applyPersistedContrast("myapp-contrast", { account: () => readPersistedUser()?.contrast });
```

Contrast and palette go in either order. A boot splash painted from `index.html` before any
module runs needs the text size even earlier: see "Before the first paint" under
[Styling](#styling). Worked example:
[`showcase/src/main.tsx`](https://github.com/Eifi1/ui-kit/blob/main/showcase/src/main.tsx).

**Reset this device's settings** (0.36, `docs/settings-harmonization.md` §11): the four
stores, `AppShell`'s sidebar key and `UiKitProvider`'s table prefix join a registry by
themselves; `DeviceResetSetting` (the last card of the appearance group) clears them all and
puts each back live. An app adds its own device keys, each with a reset that goes through its
own store:

```ts
registerDeviceSetting({ key: "myapp-lang", kind: "appearance", reset: () => setDeviceLanguage(null) });
```

### 4. Labels — one provider, the shipped catalogues

Load the kit's words with `await loadUiKitLabels(code)` before the first render and hand
them to ONE `<UiKitProvider labels={labels} locale={formatLocaleOf(code)}>` at the root;
every kit component then speaks the app's language. See [i18n](#i18n).

## Tokens

Everything the components paint with comes from `tokens.css`, so a consuming app
re-skins the kit by changing values rather than by forking components. The families:

| Family | Tokens | Set by |
|---|---|---|
| **Palette** | `--bg-page` `--bg-surface` `--bg-surface-2` `--border` `--text-primary` `--text-secondary` `--text-muted` `--brand` `--brand-hover` `--brand-contrast` `--money-income` `--money-expense` `--money-net` `--money-neutral` `--chart-1…9` | `applyTokenSet()`, written inline on `<html>` from the active `PalettePreset` (More contrast steps four of them; in light also the well and the four money colours) |
| **Derived** | `--text-placeholder` `--bg-hover` `--bg-active` `--bg-inverse` `--text-inverse` `--border-strong` `--brand-bg` `--brand-bg-hover` `--brand-muted`, and `--neutral` (`--text-muted` as a fill) | `color-mix()` or `var()` in `tokens.css`, from the layer above — so they follow the preset with no preset having to list them |
| **Semantic** | `--danger*` `--warning*` `--info*` `--success*` — each the colour, `-contrast`, `-border` and `-bg`; danger and warning also `-border-strong`, danger `-hover` — and `--status-synced/-pending/-edited/-error` | literals in `tokens.css`, per theme; in light under More contrast the four colours and `--status-edited` deepen for the darker well |
| **Categorical hues** | `--hue-blue` `--hue-indigo` `--hue-purple` `--hue-teal` `--hue-orange`, each with `-contrast`, `-border` and `-bg` | literals in `tokens.css`, per theme — values that mean only "a different value" (a status enum), at the semantic family's weight |
| **Fill foregrounds** | `<fill>-contrast`: the text ON a fill — `--brand-contrast`, `--money-income-contrast` … `--money-neutral-contrast`, `--neutral-contrast`, and each tone's and hue's `-contrast` | with their family; money is white in light and the page in dark |
| **Media** | `--media-ink` `--media-scrim` `--media-scrim-hover` | literals, the SAME in both themes: controls drawn on a photo or a camera picture, whose background is the picture, not the page |
| **Size and focus** | `--focus-ring-width` (2px, 3px at More contrast), `--text-micro` `--text-caption`, `--z-toast` | `tokens.css`; see [Styling](#styling) |

The semantic, hue and media families are deliberately **not** part of `TokenSet`: a
destructive action and a failed save are fixed meanings, and they should not change because
somebody picked a different appearance preset. The palette and what is derived from it
follow the preset.

To re-skin, override the tokens after importing the stylesheet:

```css
@import "@eifi1/ui-kit/tokens.css";

:root  { --brand: #0f766e; --brand-hover: #115e59; --brand-contrast: #fff; }
.dark  { --brand: #5eead4; --brand-hover: #99f6e4; --brand-contrast: #042f2e; }
```

`--brand-bg`, `--brand-bg-hover` and `--brand-muted` are derived from `--brand`, so the
soft brand chips (an active filter, a selected day) follow that override automatically.

`npm run check:tokens` fails if a component reaches for a raw Tailwind palette colour
instead of a token, or spells `[var(--role)]` where the role has a utility. How an app
writes a token is the next section.

## Styling

### How to write a colour

**Write the role utility: `text-muted`, not `text-[var(--text-muted)]`, and never
`text-slate-500`.** `tokens.css` turns the colour tokens into Tailwind utilities through an
`@theme inline` block, so a role is a class like any other, and variants and opacity work
on it: `hover:bg-hover`, `md:text-secondary`, `text-muted/60`. The name is the token's
name with the property's own prefix dropped (`--bg-surface` → `bg-surface`,
`--danger-border` → `border-danger`); a tone's wash is `-soft` (`bg-danger-soft`), and
`--border` is `subtle`.

The names are **property-scoped**: a text role makes a `text-*` utility and nothing else,
so `bg-muted` does not exist and a role cannot land on the wrong property by accident. An
app's own `--color-*` names (shadcn-style) do not collide with them. Keep `[var(--…)]` for a
role with no utility: the chart colours and `--status-*`. The ring offsets
(`ring-offset-surface`, `ring-offset-page`) and the money colours (`text-money-income`,
`bg-money-expense` …, the table below) are utilities since 0.34 and take variants, unlike
the plain money classes further down. The kit's own
markup follows this rule with no exceptions: `check:tokens` allows no `[var(--role)]` where
a utility exists.

An app guards the other direction — a `var(--x)` that nothing declares paints nothing — with
`undeclaredCssVariables` from `@eifi1/ui-kit/testing`; ADOPTING.md has the test.

<!-- BEGIN GENERATED: styling — node scripts/gen-styling-inventory.mjs -->

**116 role utilities over 72 tokens.** Find the token, then take the utility in
the column of the property you set. An empty cell is deliberate: the namespaces are
property-scoped, so `bg-muted` and `text-surface` do not exist.

Generated from `tokens.css` (its `@theme inline` block, variants and utilities) by
`node scripts/gen-styling-inventory.mjs`; `--check` fails on a stale block. Do not edit
between the markers.

| Token | `text-*` | `bg-*` | `border-*` `divide-*` | `ring-offset-*` | `ring-*` | `ring-*` (width) | `outline-*` | `outline-*` (width) | `fill-*` | `stroke-*` |
|---|---|---|---|---|---|---|---|---|---|---|
| `--focus-ring-width` |  |  |  |  |  | `ring-focus` |  | `outline-focus` |  |  |
| `--bg-page` |  | `bg-page` |  | `ring-offset-page` |  |  |  |  |  |  |
| `--bg-surface` |  | `bg-surface` |  | `ring-offset-surface` |  |  |  |  | `fill-surface` | `stroke-surface` |
| `--bg-surface-2` |  | `bg-surface-2` |  |  |  |  |  |  |  |  |
| `--border` |  |  | `border-subtle` |  | `ring-subtle` |  | `outline-subtle` |  | `fill-subtle` | `stroke-subtle` |
| `--text-primary` | `text-primary` |  |  |  |  |  |  |  | `fill-primary` | `stroke-primary` |
| `--text-secondary` | `text-secondary` |  |  |  |  |  |  |  | `fill-secondary` | `stroke-secondary` |
| `--text-muted` | `text-muted` |  |  |  |  |  |  |  | `fill-muted` | `stroke-muted` |
| `--brand` | `text-brand` | `bg-brand` | `border-brand` |  | `ring-brand` |  | `outline-brand` |  |  |  |
| `--brand-hover` |  | `bg-brand-hover` |  |  |  |  |  |  |  |  |
| `--brand-contrast` | `text-brand-contrast` |  |  |  | `ring-brand-contrast` |  |  |  |  |  |
| `--money-income` | `text-money-income` | `bg-money-income` |  |  |  |  |  |  |  |  |
| `--money-expense` | `text-money-expense` | `bg-money-expense` |  |  |  |  |  |  |  |  |
| `--money-net` | `text-money-net` | `bg-money-net` |  |  |  |  |  |  |  |  |
| `--money-neutral` | `text-money-neutral` | `bg-money-neutral` |  |  |  |  |  |  |  |  |
| `--text-placeholder` | `text-placeholder` |  |  |  |  |  |  |  |  |  |
| `--bg-hover` |  | `bg-hover` |  |  |  |  |  |  |  |  |
| `--bg-active` |  | `bg-active` |  |  |  |  |  |  |  |  |
| `--bg-inverse` |  | `bg-inverse` |  |  |  |  |  |  |  |  |
| `--text-inverse` | `text-inverse` |  |  |  |  |  |  |  |  |  |
| `--border-strong` |  |  | `border-strong` |  | `ring-strong` |  | `outline-strong` |  | `fill-strong` | `stroke-strong` |
| `--brand-bg` |  | `bg-brand-soft` |  |  |  |  |  |  |  |  |
| `--brand-bg-hover` |  | `bg-brand-soft-hover` |  |  |  |  |  |  |  |  |
| `--brand-muted` | `text-brand-muted` |  |  |  |  |  |  |  |  |  |
| `--money-income-contrast` | `text-money-income-contrast` |  |  |  |  |  |  |  |  |  |
| `--money-expense-contrast` | `text-money-expense-contrast` |  |  |  |  |  |  |  |  |  |
| `--money-net-contrast` | `text-money-net-contrast` |  |  |  |  |  |  |  |  |  |
| `--money-neutral-contrast` | `text-money-neutral-contrast` |  |  |  |  |  |  |  |  |  |
| `--neutral` |  | `bg-neutral` |  |  |  |  |  |  |  |  |
| `--neutral-contrast` | `text-neutral-contrast` |  |  |  |  |  |  |  |  |  |
| `--danger` | `text-danger` | `bg-danger` |  |  |  |  |  |  |  |  |
| `--danger-hover` |  | `bg-danger-hover` |  |  |  |  |  |  |  |  |
| `--danger-contrast` | `text-danger-contrast` |  |  |  |  |  |  |  |  |  |
| `--danger-border` |  |  | `border-danger` |  |  |  |  |  |  |  |
| `--danger-border-strong` |  |  | `border-danger-strong` |  | `ring-danger-strong` |  | `outline-danger-strong` |  |  |  |
| `--danger-bg` |  | `bg-danger-soft` |  |  |  |  |  |  |  |  |
| `--warning` | `text-warning` | `bg-warning` |  |  |  |  |  |  |  |  |
| `--warning-contrast` | `text-warning-contrast` |  |  |  |  |  |  |  |  |  |
| `--warning-border` |  |  | `border-warning` |  |  |  |  |  |  |  |
| `--warning-border-strong` |  |  | `border-warning-strong` |  | `ring-warning-strong` |  | `outline-warning-strong` |  |  |  |
| `--warning-bg` |  | `bg-warning-soft` |  |  |  |  |  |  |  |  |
| `--info` | `text-info` | `bg-info` |  |  |  |  |  |  |  |  |
| `--info-contrast` | `text-info-contrast` |  |  |  |  |  |  |  |  |  |
| `--info-border` |  |  | `border-info` |  |  |  |  |  |  |  |
| `--info-bg` |  | `bg-info-soft` |  |  |  |  |  |  |  |  |
| `--success` | `text-success` | `bg-success` |  |  |  |  |  |  |  |  |
| `--success-contrast` | `text-success-contrast` |  |  |  |  |  |  |  |  |  |
| `--success-border` |  |  | `border-success` |  |  |  |  |  |  |  |
| `--success-bg` |  | `bg-success-soft` |  |  |  |  |  |  |  |  |
| `--media-ink` | `text-media-ink` |  | `border-media-ink` |  | `ring-media-ink` |  |  |  |  |  |
| `--media-scrim` |  | `bg-media-scrim` |  |  |  |  |  |  |  |  |
| `--media-scrim-hover` |  | `bg-media-scrim-hover` |  | `ring-offset-media-scrim-hover` |  |  |  |  |  |  |
| `--hue-blue` | `text-hue-blue` | `bg-hue-blue` |  |  |  |  |  |  |  |  |
| `--hue-blue-contrast` | `text-hue-blue-contrast` |  |  |  |  |  |  |  |  |  |
| `--hue-blue-border` |  |  | `border-hue-blue` |  |  |  |  |  |  |  |
| `--hue-blue-bg` |  | `bg-hue-blue-soft` |  |  |  |  |  |  |  |  |
| `--hue-indigo` | `text-hue-indigo` | `bg-hue-indigo` |  |  |  |  |  |  |  |  |
| `--hue-indigo-contrast` | `text-hue-indigo-contrast` |  |  |  |  |  |  |  |  |  |
| `--hue-indigo-border` |  |  | `border-hue-indigo` |  |  |  |  |  |  |  |
| `--hue-indigo-bg` |  | `bg-hue-indigo-soft` |  |  |  |  |  |  |  |  |
| `--hue-purple` | `text-hue-purple` | `bg-hue-purple` |  |  |  |  |  |  |  |  |
| `--hue-purple-contrast` | `text-hue-purple-contrast` |  |  |  |  |  |  |  |  |  |
| `--hue-purple-border` |  |  | `border-hue-purple` |  |  |  |  |  |  |  |
| `--hue-purple-bg` |  | `bg-hue-purple-soft` |  |  |  |  |  |  |  |  |
| `--hue-teal` | `text-hue-teal` | `bg-hue-teal` |  |  |  |  |  |  |  |  |
| `--hue-teal-contrast` | `text-hue-teal-contrast` |  |  |  |  |  |  |  |  |  |
| `--hue-teal-border` |  |  | `border-hue-teal` |  |  |  |  |  |  |  |
| `--hue-teal-bg` |  | `bg-hue-teal-soft` |  |  |  |  |  |  |  |  |
| `--hue-orange` | `text-hue-orange` | `bg-hue-orange` |  |  |  |  |  |  |  |  |
| `--hue-orange-contrast` | `text-hue-orange-contrast` |  |  |  |  |  |  |  |  |  |
| `--hue-orange-border` |  |  | `border-hue-orange` |  |  |  |  |  |  |  |
| `--hue-orange-bg` |  | `bg-hue-orange-soft` |  |  |  |  |  |  |  |  |

Plain classes (unlayered, so they win over Tailwind's colour utilities and take **no** variants): `text-money-pos` (`--money-income`), `text-money-neg` (`--money-expense`), `text-money-pos-muted` (`--money-income`, opacity 0.72), `text-money-neg-muted` (`--money-expense`, opacity 0.72), `bg-money-pos` (`--money-income`), `bg-money-neg` (`--money-expense`).

Variants: `dark:` `sm:` `md:` `lg:` `xl:` `2xl:` `3xl:` `max-3xl:` `max-2xl:` `max-xl:` `max-lg:` `max-md:` `max-sm:` `large:` `xlarge:` `contrast:`.

Utilities: `truncate-until-large`, `truncate-until-large-words`.

Theme values: `text-micro` (font size 0.625rem), `text-caption` (font size 0.6875rem), `3xl:` (breakpoint, 150rem at Normal).

<!-- END GENERATED: styling -->

### Lint: the role utilities in an app

`@eifi1/ui-kit/eslint` (0.35) is `check:tokens`' role rule for an app's own markup: an ESLint
flat-config plugin whose `role-utilities` rule reports a `[var(--role)]` class wherever that
property has a utility for the role, and names it. It reads every string literal and
template-literal part, so a JSX `className`, a `cn()` / `clsx()` argument and a class constant
alike. Where one utility fits, `eslint --fix` writes it and keeps the variants and the opacity:
`hover:text-[var(--text-muted)]/70` → `hover:text-muted/70`. A token with no utility on that
property is left alone (`text-[var(--chart-1)]`, `--status-*`, `bg-[var(--border)]` as a
divider), and so are comments. The rule reads the table above, so a role that gains a utility is
flagged from the release that adds it.

```js
// eslint.config.js
import uiKit from "@eifi1/ui-kit/eslint";

export default defineConfig([ // or tseslint.config(…): either takes it
  // … the app's own entries, which say which files are linted …
  uiKit.configs.recommended,
]);
```

`configs.recommended` registers the plugin as `@eifi1/ui-kit` and turns
`@eifi1/ui-kit/role-utilities` on as an error for every linted file except tests
(`**/__tests__/**`, `*.test.*`, `*.spec.*`), which may name an old class to assert it is gone.
To scope it yourself, register the plugin and set the rule:
`{ files: ["src/**/*.tsx"], plugins: { "@eifi1/ui-kit": uiKit }, rules: { "@eifi1/ui-kit/role-utilities": "error" } }`.
It runs on ESLint 9 and 10 and imports no package of its own.

### Text size and More contrast

ONE scale on `<html>`: `data-text-size="normal" | "large" | "xlarge"` is 100 / 125 / 150 %
of the browser's own font size, so Normal keeps whatever the reader set in the browser,
and everything sized in rem (Tailwind's spacing and type) grows with it.
`data-contrast="more"` is More contrast, from the setting or from `prefers-contrast: more`
on "System"; it steps the colour tokens in JavaScript and widens `--focus-ring-width`. In
light it also darkens the well (`--bg-surface-2`, 10 % ink into the card) and deepens the
money, status, teal, orange and `--status-edited` colours and `--bg-active` so they keep
their contrast on it; dark keeps its well. A link button's and TextLink's brand reads
`--brand-muted` (the brand as text) under it, in both modes. The
stores in [Wiring](#wiring) put both attributes there; the attribute names are frozen.

- **`large:`** applies at Large AND Extra large, **`xlarge:`** only at Extra large, and
  **`contrast:`** under More contrast. Like `dark:`, they add no specificity, so
  `large:text-base` beats `text-sm` by order alone, and a size wins over a breakpoint:
  `max-sm:grid-cols-2 large:grid-cols-1` is one column on a phone at Large.
- **The breakpoints follow the text size.** A media query's rem is the browser's default,
  never `<html>`'s, so `tokens.css` redefines `sm` … `2xl` (and adds `3xl`, 150rem) as three
  queries each, scaled × 1, 1.25 and 1.5: `md:` is 48rem at Normal, 60rem at Large and 72rem
  at Extra large, so a tablet at Extra large gets the layout below `md:` instead of keeping
  the desktop shell. The `max-*` variants scale the same way. Arbitrary `min-[…]` /
  `max-[…]` media variants do **not** scale: use a name. `useBreakpoint` and
  `usePhoneLayout` answer the same questions in JavaScript, with the same numbers.
- **`truncate-until-large`** is `truncate` at Normal and wraps from Large up, breaking a
  word only where nothing else fits — for prose: a name, a title. At Large and Extra large
  nothing may cut its text. **`truncate-until-large-words`** is the same for a figure (an
  amount, a date, a count with its unit): it wraps only at spaces, so a number is never
  split in two; give its cell the room (`shrink-0`).
- `text-micro` and `text-caption` (0.625 and 0.6875 rem) are the two small sizes, in place
  of `text-[10px]` / `text-[11px]`, which did not grow with anything.

### Before the first paint

`applyPersistedTextSize` and `applyPersistedContrast` (Wiring, step 3) run before
`createRoot`, so the first frame has the right size. A boot splash painted from
`index.html` paints before any module runs, so it takes the inline form:
`TEXT_SIZE_INLINE_SCRIPT` is the same pre-paint as a function expression. Paste the
constant's value in place of `(function(k,a){…})`, with the root rules beside it, because
the app's stylesheet arrives after the splash paints:

```html
<style>html[data-text-size=large]{font-size:125%}html[data-text-size=xlarge]{font-size:150%}</style>
<script>
  (function(k,a){…})("myapp-text-size", function () {
    return JSON.parse(localStorage.getItem("myapp-auth")).state.user.text_size;
  });
</script>
```

It reads the frozen persisted format, never throws, and sets only `data-text-size`. Under
a hash-based Content Security Policy (`script-src 'sha256-…'`) it is a second inline
script with its own hash: add it to the policy, and recompute it whenever the storage key
or the account function changes.

## Colour

### Three systems, deliberately separate

A colour in this kit belongs to exactly one of three systems, and they are kept apart
because they answer different questions.

| System | Tokens | The question it answers |
|---|---|---|
| **Semantic UI** | `--danger*` `--warning*` `--info*` `--success*`, `--status-*` | *What does this mean?* Danger is red because every other interface the reader has used made it red. Fixed meanings, so they live in `tokens.css` and are **not** part of `TokenSet` — a destructive action must not change colour because somebody picked a different preset. |
| **Semantic data** | `--money-income` `--money-expense` `--money-net` `--money-neutral` | *Which direction is this number?* Never red/green: that pair is exactly the axis dichromacy collapses. Always paired with a `+`/`−` or an arrow at the call site, so colour is never the only signal. |
| **Categorical chart** | `--chart-1` … `--chart-8` (`--chart-9` repeats slot 1) | *Which series is this?* No meaning and no order — eight hues that must stay separable from each other: anyplot's "Imprint" set (0.49; Paul Tol's "Muted" is the `paul-tol` preset), the same in light and dark, CVD-safe across protan/deutan/tritan. `paletteFor(i)` returns the CSS var (cycling eight, series 1 always the green; `{ order: "cvd" }` for anyplot's CVD order), so a Recharts series is theme-aware for free. A hue under 3:1 on the ground gets a 1px ink edge on bars, areas and treemap tiles (`chartEdge`). |
| **Chart inks** | `--chart-ink` `--chart-muted` | The only chart colours that change with the theme. `CHART_ROLES`: total / baseline / outline in ink; other / rest / disabled and confidence bands in muted ink. |

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

The kit rendered page by page, one component family per page and grouped by layer, with the
theme, palette, text-size, contrast and language switchers live: <https://eifi1.github.io/ui-kit/>,
or `npm run dev:showcase` (http://localhost:4170) from a checkout. How it is built and
tested: [CONTRIBUTING.md → The showcase](https://github.com/Eifi1/ui-kit/blob/main/CONTRIBUTING.md#the-showcase).

## Tests

`npm run check` runs every gate locally (the pre-push hook) and CI runs the same script;
`npm test` is the suite alone (Vitest + jsdom, `TZ=Europe/Berlin`). The house rules, the
gates and failing-first: [CONTRIBUTING.md → Tests](https://github.com/Eifi1/ui-kit/blob/main/CONTRIBUTING.md#tests).

## What's exported

The full inventory, generated from the build rather than maintained by hand — the
hand-written version named 93 of 263 and had been advertising five deleted wizard exports
since 0.4.0. Regenerate it with `node scripts/gen-export-inventory.mjs` after a build.

Two names that read as something they are not: `WizardStepper` is a bare two-step
indicator and has nothing to do with the wizard engine below, and the feedback exports are
the vocabulary, the transition policy and the look only — each app still wires its own API,
columns, strings and permissions (see the note at the top of `src/feedback/feedback-inbox.tsx`).

<!-- BEGIN GENERATED: exports — node scripts/gen-export-inventory.mjs -->

**2194 names from 363 modules** — 1014 values and 1180 types. _Italic_ is a type-only export.

Generated from `dist/index.d.ts` by `node scripts/gen-export-inventory.mjs`; the count
is pinned by `src/__tests__/public-surface.test.ts`. Do not edit between the markers.

| Entry point | Names |
|---|---|
| `@eifi1/ui-kit` | 2194 |
| `@eifi1/ui-kit/chart` | 100 |
| `@eifi1/ui-kit/shell` | 119 |
| `@eifi1/ui-kit/data-table` | 56 |
| `@eifi1/ui-kit/wizard` | 25 |
| `@eifi1/ui-kit/tour` | 49 |
| `@eifi1/ui-kit/feedback` | 212 |
| `@eifi1/ui-kit/search` | 23 |
| `@eifi1/ui-kit/dates` | 22 |
| `@eifi1/ui-kit/table-text` | 14 |
| `@eifi1/ui-kit/currencies` | 3 |
| `@eifi1/ui-kit/eslint` | 1 |
| `@eifi1/ui-kit/testing` | 15 |
| `@eifi1/ui-kit/testing/react` | 2 |
| `@eifi1/ui-kit/rhf` | 48 |
| `@eifi1/ui-kit/offline` | 33 |
| `@eifi1/ui-kit/sync` | 38 |
| `@eifi1/ui-kit/sync/testing` | 3 |
| `@eifi1/ui-kit/push-worker` | 10 |

Everything below is reachable from the main `@eifi1/ui-kit` barrel. The subpaths are a
re-slicing of it, never a second API.

### lib — pure helpers

| Module | Exports |
|---|---|
| `lib/calc` | `commitExpression`, `evaluateExpression`, `formatResult`, `isBareAmount`, `looksLikeExpression`, `sanitizeLive`, `splitLeadingSign` |
| `lib/cn` | `cn` |
| `lib/logger` | `logger`, `setStoreLog` |
| `lib/format` | `currencyMinorDigits`, `EMPTY_FORMATTED_VALUE`, `formatDate`, `formatMoney`, `formatNumber`, `formatPercent`, `formatRelativeTime`, `roundToCurrency`, `toDate`, `useKitFormat`, _`DateInput`_, _`FormatDateOptions`_, _`FormatDateStyle`_, _`FormatDigits`_, _`FormatMoneyOptions`_, _`FormatNumberBaseOptions`_, _`FormatNumberOptions`_, _`FormatPercentOptions`_, _`FormatRelativeTimeOptions`_, _`FormattableNumber`_, _`KitFormat`_, _`RoundToCurrencyOptions`_ |
| `lib/safe-storage` | `readStored`, `writeStored` |
| `lib/download` | `filenameFromDisposition`, `saveBlob` |
| `lib/text-match` | `foldForSearch`, `rankMatch`, _`MatchRank`_ |
| `lib/qr-encode` | `encodeQr`, _`QrEncodeOptions`_, _`QrErrorCorrection`_, _`QrMatrix`_ |
| `lib/server-wake` | `attachServerWake`, `createServerWake`, `serverWake`, `watchReadsAnd`, `wrapFetch`, _`AxiosLikeInstance`_, _`ServerWakeAxiosConfig`_, _`ServerWakeFilter`_, _`ServerWakeOptions`_, _`ServerWakeRequest`_, _`ServerWakeStage`_, _`ServerWakeWatcher`_ |
| `lib/session-refresh` | `attachSessionRefresh`, `createSessionRefresh`, `isSignedOutStep`, `isTransientRefreshFailure`, _`SessionRefresh`_, _`SessionRefreshOptions`_, _`SessionRefreshOutcome`_, _`SessionRenewal`_ |
| `lib/person-name` | `formatPersonName`, `personInitials`, _`PersonName`_ |
| `lib/translation-review` | `DEFAULT_TRANSLATION_REVIEW_FILTER`, `DEFAULT_TRANSLATION_REVIEW_SWIPE`, `dropReviews`, `filterTranslationRows`, `flattenStrings`, `fromApiReview`, `groupTranslationRows`, `keyInArea`, `keyInAreas`, `keyNamespace`, `mergeReviews`, `placeholderMismatch`, `placeholderTokens`, `REVIEW_STATUSES`, `reviewAreaOf`, `reviewStatus`, `reviewUndo`, `reviewWrite`, `summariseRows`, `toApiWrite`, `TRANSLATION_REVIEW_SWIPE_ACTIONS`, `translationCorrections`, `translationReviewSwipePlan`, `translationRows`, `unreviewedRows`, _`ApiTranslationReview`_, _`ApiTranslationReviewsResponse`_, _`ApiTranslationReviewWrite`_, _`ReviewStatus`_, _`TranslationCorrection`_, _`TranslationReview`_, _`TranslationReviewFilter`_, _`TranslationReviewKey`_, _`TranslationReviewSwipeAction`_, _`TranslationReviewSwipeBinding`_, _`TranslationReviewUndo`_, _`TranslationReviewWrite`_, _`TranslationRow`_, _`TranslationRowGroup`_, _`TranslationRowsInput`_, _`TranslationSummary`_, _`TranslationVerdict`_ |
| `lib/countries` | `COUNTRY_CODES`, `countryName` |
| `lib/iban` | `compactIban`, `formatIban`, `IBAN_LENGTHS`, `ibanCheckDigits`, `ibanProblem`, `isQrIban`, `isValidIban`, _`IbanKind`_, _`IbanProblem`_ |
| `lib/isin` | `formatIsin`, `isinCheckDigit`, `isValidIsin` |
| `lib/phone` | `formatNationalPhone`, `formatPhone`, `isE164`, `parsePhone`, `PHONE_COUNTRIES`, `PHONE_DIAL_CODES`, _`ParsedPhone`_, _`PhoneCountry`_, _`PhoneCountryCode`_ |
| `lib/column-mapping` | `assignColumnRole`, `guessMapping`, `missingRoles`, `readMappedTable`, `readTextFile`, `roleOfColumn`, _`ColumnMapperResult`_, _`ColumnMapping`_, _`ColumnRole`_ |
| `lib/clipboard-minus` | `asciiMinusInNumbers` |
| `lib/document-title` | `DEFAULT_DOCUMENT_TITLE_FORMAT`, `formatDocumentTitle`, _`DocumentTitleParts`_ |
| `lib/status-tone` | `STATUS_KINDS`, `statusTone`, _`StatusKind`_, _`StatusTone`_ |
| `lib/date-format` | `DATE_FORMAT_PREFERENCES`, `dateFormatSample`, `dateFormatterFor`, `formatDateWithPreference`, `isDateFormatPreference`, `resolveDateFormat`, _`DateFormatOptions`_, _`DateFormatPreference`_, _`ResolvedDateFormat`_ |
| `lib/device-settings` | `deviceSettings`, `registerDeviceSetting`, `resetDeviceSettings`, _`DeviceSetting`_, _`DeviceSettingKind`_ |
| `lib/minus` | `formatWithMinus`, _`MinusStyle`_ |
| `lib/clipping` | `CLIPS_ATTRIBUTE` |
| `lib/chip-edge-snap` | `refreshChipEdges` |

### hooks

| Module | Exports |
|---|---|
| `hooks/use-media-query` | `useMediaQuery` |
| `hooks/use-body-scroll-lock` | `useBodyScrollLock` |
| `hooks/use-anchored-rect` | `useAnchoredRect`, _`AnchorRect`_ |
| `hooks/use-anchored-panel` | `anchoredPanelPlacement`, `readKeyboardInset`, `useAnchoredPanel`, `useVisualViewport`, _`AnchoredPanel`_, _`AnchoredPanelOptions`_, _`KeyboardInsetOptions`_, _`ViewportBox`_ |
| `hooks/use-dismiss` | `useEscapeKey`, `useOutsideClick` |
| `hooks/use-focus-trap` | `useFocusTrap`, _`FocusTrapOptions`_ |
| `hooks/use-announce` | `useAnnounce`, _`AnnounceRegionProps`_, _`UseAnnounceOptions`_, _`UseAnnounceReturn`_ |
| `hooks/use-overlay-history` | `useOverlayHistory` |
| `hooks/use-close-transition` | `OVERLAY_EXIT_MS`, `useCloseTransition` |
| `hooks/use-row-swipe` | `useRowSwipe`, _`RowSwipeOptions`_, _`RowSwipeReturn`_, _`SwipeStage`_ |
| `hooks/use-noindex` | `useNoIndex` |
| `hooks/use-document-title` | `useDocumentTitle` |
| `hooks/use-file-drop` | `dragHasFiles`, `useFileDrop`, _`FileDropProps`_, _`UseFileDropOptions`_, _`UseFileDropReturn`_ |
| `hooks/use-debounce` | `useDebounce`, `useDebouncedCallback`, _`DebouncedCallbackOptions`_, _`DebouncedFunction`_ |
| `hooks/use-search-param-state` | `useDialogParam`, `useSearchParamsState`, `useSearchParamState`, `useTabParam`, _`DialogParam`_, _`SearchParamField`_, _`SearchParamFields`_, _`SearchParamStateOptions`_, _`SearchParamsUpdate`_ |
| `hooks/use-copy-to-clipboard` | `copyToClipboard`, `useCopyToClipboard`, _`CopyState`_, _`UseCopyToClipboardOptions`_, _`UseCopyToClipboardReturn`_ |
| `hooks/use-hotkey` | `matchesHotkey`, `parseHotkey`, `useHotkey`, _`Hotkey`_, _`ParsedHotkey`_, _`UseHotkeyOptions`_ |
| `hooks/use-authed-src` | `useAuthedSrc`, _`AuthedFetcher`_, _`AuthedSrcStatus`_, _`UseAuthedSrcOptions`_, _`UseAuthedSrcResult`_ |
| `hooks/use-windowed-rows` | `useWindowedRows`, `WINDOWED_ROW_INDEX`, _`WindowedRows`_ |
| `hooks/use-breakpoint` | `BREAKPOINT_REM`, `breakpointQuery`, `remPx`, `useBreakpoint`, `usePhoneLayout`, `useRemPx`, _`Breakpoint`_, _`BreakpointVariant`_, _`RemLength`_ |
| `hooks/use-large-text` | `useCoarsePointer`, `useInlineFacts`, `useLargeText` |
| `hooks/use-file-picker` | `matchesAccept`, `useFilePicker`, _`FilePickerLabels`_, _`FileRejection`_, _`FileRejectionReason`_, _`FileScreenOptions`_, _`UseFilePickerOptions`_, _`UseFilePickerReturn`_ |

### theme, palettes, colour

| Module | Exports |
|---|---|
| `theme/color` | `contrast`, `deltaE`, `hexToOklch`, `luminance`, `oklchToHex`, `oklchToRgb`, `parseHex`, `rgbToOklch`, `simulateCvd`, `solveLightness`, `toHex`, _`CvdType`_, _`Oklch`_, _`Rgb`_ |
| `theme/palette-derive` | `auditChartRamp`, `auditPalette`, `deriveChartRamp`, `derivePalette`, `describe`, _`AnchorRole`_, _`ChartRampReport`_, _`ContrastCheck`_, _`ContrastReport`_, _`DerivedPalette`_, _`DeriveOptions`_, _`PaletteAnchors`_, _`SemanticTokens`_ |
| `theme/palette-presets` | `applyTokenSet`, `DEFAULT_PRESET`, `DERIVED_PRESETS`, `PALETTES`, `PAUL_TOL_PRESET`, `presetById`, _`PalettePreset`_, _`TokenSet`_ |
| `theme/theme-store` | `applyPersistedTheme`, `createThemeStore`, _`ThemeMode`_, _`ThemePreference`_, _`ThemeState`_, _`ThemeStore`_ |
| `theme/palette-store` | `applyPersistedPalette`, `createPaletteStore`, _`PaletteStore`_ |
| `theme/text-size` | `applyPersistedTextSize`, `applyTextSize`, `createTextSizeStore`, `isTextSize`, `readPersistedTextSize`, `readTextSize`, `resolveTextSize`, `TEXT_SCALE`, `TEXT_SIZE_INLINE_SCRIPT`, `TEXT_SIZES`, `useTextSize`, _`ApplyTextSizeOptions`_, _`PersistedAppearanceOptions`_, _`PersistedTextSize`_, _`TextSize`_, _`TextSizeInfo`_, _`TextSizeState`_, _`TextSizeStore`_ |
| `theme/contrast` | `applyContrast`, `applyPersistedContrast`, `CONTRAST_MODES`, `contrastLevel`, `createContrastStore`, `isContrastMode`, `prefersMoreContrast`, `readContrastLevel`, `readPersistedContrast`, `resolveContrastMode`, _`ApplyContrastOptions`_, _`ContrastLevel`_, _`ContrastMode`_, _`ContrastState`_, _`ContrastStore`_, _`PersistedContrast`_ |
| `theme/chart-palette` | `CHART_COLORS`, `CHART_INK_HEX`, `CHART_MUTED_HEX`, `CHART_ROLES`, `chartEdge`, `CVD_ORDER`, `EDGE_MIN_CONTRAST`, `HEATMAP_HEX`, `lerpHex`, `PALETTE_HEX`, `PALETTE_SIZE`, `paletteFor`, `textOn`, _`HeatStops`_, _`PaletteForOptions`_ |

### i18n

| Module | Exports |
|---|---|
| `i18n/kit-labels` | `DEFAULT_APP_SHELL_LABELS`, `DEFAULT_CALCULATOR_LABELS`, `DEFAULT_COMBOBOX_LABELS`, `DEFAULT_COMMON_LABELS`, `DEFAULT_CURRENCY_LABELS`, `DEFAULT_DATE_PICKER_LABELS`, `DEFAULT_FILE_LABELS`, `DEFAULT_MULTI_SELECT_LABELS`, `DEFAULT_PICKER_SHEET_LABELS`, `DEFAULT_SWIPEABLE_ROW_LABELS`, `DEFAULT_TOP_BAR_LABELS`, `formatFileSize`, `missingKitLabels`, `UiKitProvider`, `useKitChartTooltipPlacement`, `useKitDateFormatter`, `useKitDocumentTitle`, `useKitFileLabels`, `useKitLabelOverrides`, `useKitLabels`, `useKitLink`, `useKitLocale`, `useKitTableStorageKeyPrefix`, `useKitTimeZone`, `useKitWeekStart`, _`AppShellLabels`_, _`CalculatorLabels`_, _`ChartTooltipPlacement`_, _`ComboboxLabels`_, _`CommonLabels`_, _`CurrencyLabels`_, _`DatePickerLabels`_, _`FileLabels`_, _`KitDateFormatContext`_, _`KitDateFormatter`_, _`KitLinkComponent`_, _`KitLinkProps`_, _`LabelOverride`_, _`MultiSelectLabels`_, _`PickerSheetLabels`_, _`SwipeableRowLabels`_, _`TopBarLabels`_, _`UiKitLabelOverrides`_, _`UiKitLabels`_, _`UiKitProviderProps`_ |
| `i18n/defaults` | `DEFAULT_UI_KIT_LABELS` |
| `i18n/review` | `kitLabelStrings`, _`KitLabelStringsOptions`_ |
| `i18n/languages` | `formatLocaleOf`, `KIT_LANGUAGES`, `languageOptions`, `loadUiKitLabels`, `peekUiKitLabels`, `resolveLanguage`, `useUiKitLabels`, _`KitLanguage`_, _`KitLanguageCode`_ |
| `i18n/plurals` | `withAllPlurals`, _`PluralForms`_ |

### components

| Module | Exports |
|---|---|
| `components/button` | `Button`, _`ButtonLinkProps`_, _`ButtonProps`_ |
| `components/button-look` | `buttonClasses`, `TOUCH_TARGET_LARGE`, _`ButtonClassesOptions`_, _`ButtonSize`_, _`ButtonTone`_, _`ButtonVariant`_ |
| `components/icon-button` | `IconButton`, _`IconButtonGlyphSize`_, _`IconButtonLinkProps`_, _`IconButtonProps`_, _`IconButtonSize`_, _`IconButtonTone`_, _`IconButtonToneColor`_, _`IconButtonVariant`_ |
| `components/field-base` | `DEFAULT_CHARACTER_COUNT_LABELS`, `DEFAULT_PASSWORD_REVEAL_LABELS`, `FIELD_BASE`, `FIELD_DISPLAY`, `FIELD_FLOATING_PAD`, `FIELD_INVALID`, `FIELD_TOUCH_TEXT`, `FIELD_TRIGGER`, `FIELD_WRITABLE_LOOK`, `FieldChevron`, `FLOATING_INPUT_CLASS`, `FLOATING_LABEL_CLASS`, `FloatingField`, `Label`, _`CharacterCountLabels`_, _`FieldChevronProps`_, _`FloatingFieldProps`_, _`LabelProps`_, _`PasswordRevealLabels`_ |
| `components/input` | `Input`, _`InputProps`_ |
| `components/select` | `Select`, _`SelectProps`_ |
| `components/textarea` | `Textarea`, _`TextareaProps`_ |
| `components/card` | `Card`, `CardAction`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, _`CardActionProps`_, _`CardContentProps`_, _`CardDensity`_, _`CardDescriptionProps`_, _`CardFooterProps`_, _`CardHeaderProps`_, _`CardProps`_, _`CardTitleLevel`_, _`CardTitleProps`_, _`CardTone`_ |
| `components/spinner` | `Spinner`, _`SpinnerProps`_ |
| `components/empty-state` | `EmptyState`, _`EmptyStateProps`_ |
| `components/tabs` | `DEFAULT_TABS_LABELS`, `Tabs`, _`TabItem`_, _`TabsLabels`_, _`TabsProps`_ |
| `components/field-parts` | `CompactControls`, `DISABLED_REASON_LINE_CLASS`, `DisabledReasonLine`, `FieldHint`, `FieldLabel`, `FLOATING_LABEL_STATIC`, `useDisabledReasonLine`, _`DisabledReasonDisplay`_, _`FieldHintProps`_, _`FieldLabelProps`_ |
| `components/focus-ring` | `FOCUS_RING`, `FOCUS_RING_WIDTH` |
| `components/field` | `Field`, _`FieldControlProps`_, _`FieldLabelVisibility`_, _`FieldProps`_, _`FieldRenderMeta`_ |
| `components/search-field` | `SearchField`, _`SearchFieldProps`_ |
| `components/dropdown` | `DropdownPanel`, `DropdownSearchHeader`, `useDropdown`, `useDropdownSearch`, _`DropdownPanelProps`_, _`DropdownSearchHeaderProps`_ |
| `components/popover` | `DEFAULT_POPOVER_LABELS`, `Popover`, _`PopoverLabels`_, _`PopoverProps`_ |
| `components/help-popover` | `HelpPopover`, _`HelpPopoverProps`_ |
| `components/swipeable-row` | `SwipeableRow`, _`SwipeableRowProps`_, _`SwipeAction`_, _`SwipePaint`_, _`SwipeTone`_ |
| `components/calculator` | `CalculatorButton`, _`CalculatorButtonLabels`_ |
| `components/numpad-sheet` | `NumberPadSheet`, _`NumberPadSheetLabels`_ |
| `components/number-input` | `NumberInput`, `stepNumber`, _`NumberInputProps`_ |
| `components/currency-select` | `CURRENCIES`, `CurrencyFlag`, `currencyName`, `CurrencySelect`, `getCurrency`, _`CurrencyFlagProps`_, _`CurrencyOption`_, _`CurrencySelectProps`_ |
| `components/amount-input` | `AmountInput`, _`AmountInputProps`_ |
| `components/money-field` | `MoneyField`, _`MoneyFieldProps`_ |
| `components/combobox` | `Combobox`, _`ComboboxProps`_ |
| `components/picker-sheet` | `PickerSheet`, `SHEET_ROW_CLASS`, _`PickerSheetProps`_ |
| `components/entity-combobox` | `EntityCombobox`, _`EntityComboboxProps`_ |
| `components/multi-entity-combobox` | `MultiEntityCombobox`, _`MultiEntityComboboxProps`_ |
| `components/multi-select` | `MultiSelect`, _`MultiSelectOption`_, _`MultiSelectProps`_ |
| `components/tooltip` | `placeTooltip`, `Tooltip`, _`TooltipPlacement`_, _`TooltipProps`_, _`TooltipSide`_, _`TooltipSize`_, _`TooltipTap`_, _`TooltipViewport`_ |
| `components/user-avatar` | `avatarInitials`, `UserAvatar`, _`UserAvatarBadge`_, _`UserAvatarProps`_ |
| `components/settings-fields` | `ContrastSetting`, `LanguageSetting`, `TextSizeSetting`, `ThemeSetting`, _`ContrastSettingProps`_, _`LanguageSettingProps`_, _`TextSizeSettingProps`_, _`ThemeSettingProps`_, _`ThemeSettingSelectProps`_, _`ThemeSettingToggleProps`_ |
| `components/field-sync` | `DEFAULT_FIELD_SYNC_LABELS`, `FIELD_SYNC_FRAME`, `FIELD_SYNC_SAVED_MS`, `FieldSyncIndicator`, `FieldSyncRow`, `useFieldSync`, _`FieldSyncIndicatorProps`_, _`FieldSyncLabels`_, _`FieldSyncRowProps`_, _`FieldSyncState`_, _`UseFieldSyncOptions`_, _`UseFieldSyncReturn`_ |
| `components/month-picker` | `DEFAULT_MONTH_PICKER_LABELS`, `MonthPicker`, _`MonthPickerLabels`_, _`MonthPickerProps`_ |
| `components/checkbox` | `Checkbox`, _`CheckboxProps`_ |
| `components/switch` | `Switch`, _`SwitchProps`_, _`SwitchSize`_ |
| `components/slider` | `fromLogPosition`, `Slider`, `toLogPosition`, _`SliderMark`_, _`SliderProps`_ |
| `components/time-input` | `isTimeInRange`, `normalizeTime`, `TimeInput`, _`TimeInputProps`_ |
| `components/number-field` | `IntegerField`, `NumberField`, _`NumberFieldProps`_ |
| `components/sparkline` | `DEFAULT_SPARKLINE_LABELS`, `Sparkline`, `sparklineSummary`, _`SparklineLabels`_, _`SparklineProps`_, _`SparklineTone`_ |
| `components/stat-tile` | `DEFAULT_STAT_TILE_LABELS`, `StatTile`, `StatTileGrid`, _`StatTileDelta`_, _`StatTileGridProps`_, _`StatTileLabels`_, _`StatTileLinkProps`_, _`StatTileProps`_, _`StatTileSubValue`_, _`StatTileTone`_ |
| `components/signature-pad` | `DEFAULT_SIGNATURE_PAD_LABELS`, `SignaturePad`, `SignatureView`, _`SignatureDetail`_, _`SignaturePadHandle`_, _`SignaturePadLabels`_, _`SignaturePadProps`_, _`SignatureViewProps`_ |
| `components/password-strength` | `DEFAULT_PASSWORD_STRENGTH_LABELS`, `passwordByteLength`, `passwordRules`, `PasswordStrengthMeter`, `scorePassword`, _`PasswordRule`_, _`PasswordRuleId`_, _`PasswordScoreOptions`_, _`PasswordStrengthLabels`_, _`PasswordStrengthMeterProps`_, _`PasswordStrengthScore`_ |
| `components/page-contents` | `DEFAULT_PAGE_CONTENTS_LABELS`, `PageContents`, `PageContentsLayout`, `useScrollSpy`, _`PageContentsItem`_, _`PageContentsLabels`_, _`PageContentsLayoutProps`_, _`PageContentsProps`_, _`UseScrollSpyOptions`_ |
| `components/disclosure` | `Collapse`, `Disclosure`, _`CollapseProps`_, _`DisclosureProps`_, _`DisclosureTriggerProps`_ |
| `components/dialog-frame` | `DEFAULT_DIALOG_FRAME_LABELS`, `DialogFrame`, _`DialogFrameLabels`_, _`DialogFrameProps`_ |
| `components/danger-confirm` | `CurrentPasswordInput`, `DangerConfirm`, `DEFAULT_DANGER_CONFIRM_LABELS`, `TypedConfirmField`, `typedMatches`, _`CurrentPasswordInputLabels`_, _`CurrentPasswordInputProps`_, _`DangerConfirmLabels`_, _`DangerConfirmProps`_, _`DangerConfirmValues`_, _`DangerConsequence`_, _`TypedConfirmFieldLabels`_, _`TypedConfirmFieldProps`_, _`TypedMatch`_ |
| `components/reauth-dialog` | `DEFAULT_REAUTH_DIALOG_LABELS`, `ReauthDialog`, _`ReauthDialogLabels`_, _`ReauthDialogProps`_ |
| `components/confirm-dialog` | `ConfirmProvider`, `DEFAULT_CONFIRM_DIALOG_LABELS`, `useConfirm`, _`ConfirmDialogLabels`_, _`ConfirmFn`_, _`ConfirmOptions`_, _`ConfirmProviderProps`_, _`ConfirmTone`_ |
| `components/floating-panel` | `DEFAULT_FLOATING_PANEL_LABELS`, `FloatingAction`, `FloatingActionButton`, `FloatingActionGroup`, `FloatingPanel`, _`FloatingActionButtonProps`_, _`FloatingActionGroupProps`_, _`FloatingActionLinkProps`_, _`FloatingActionProps`_, _`FloatingCorner`_, _`FloatingPanelLabels`_, _`FloatingPanelProps`_ |
| `components/bulk-action-bar` | `BulkActionBar`, `DEFAULT_BULK_ACTION_BAR_LABELS`, _`BulkActionBarLabels`_, _`BulkActionBarProps`_, _`BulkActionBarVariant`_, _`ResponsiveBulkActionBarVariant`_ |
| `components/swatch-picker` | `DEFAULT_SWATCH_PICKER_LABELS`, `SwatchPicker`, _`SwatchOption`_, _`SwatchPickerLabels`_, _`SwatchPickerProps`_ |
| `components/icon-picker` | `DEFAULT_ICON_PICKER_LABELS`, `IconPicker`, _`IconOption`_, _`IconPickerLabels`_, _`IconPickerProps`_ |
| `components/choice-card` | `ActionCard`, `ChoiceCard`, `ChoiceCardGroup`, _`ActionCardIconTone`_, _`ActionCardLinkProps`_, _`ActionCardMetaTone`_, _`ActionCardProps`_, _`ChoiceCardGroupProps`_, _`ChoiceCardMultipleProps`_, _`ChoiceCardOption`_, _`ChoiceCardProps`_, _`ChoiceCardSingleProps`_, _`ChoiceCardType`_ |
| `components/autocomplete` | `Autocomplete`, _`AutocompleteProps`_ |
| `components/measured-grid` | `DEFAULT_MEASURED_GRID_LABELS`, `MeasuredGrid`, `useMeasuredRows`, _`MeasuredGridColumn`_, _`MeasuredGridLabels`_, _`MeasuredGridProps`_, _`MeasuredGridView`_, _`MeasuredRows`_, _`UseMeasuredRowsOptions`_ |
| `components/file-button` | `DEFAULT_FILE_PICKER_LABELS`, `FileButton`, _`FileButtonProps`_ |
| `components/chart` | `ChartContainer`, `ChartLegend`, `ChartLegendContent`, `ChartTooltip`, `ChartTooltipContent`, `useChart`, _`ChartConfig`_, _`ChartSeriesConfig`_ |
| `components/treemap` | `fitLabel`, `Treemap`, `TreemapCell`, _`TreemapCellProps`_, _`TreemapNode`_, _`TreemapProps`_ |
| `components/series-chart` | `resolveTooltipPlacement`, `SeriesChart`, `seriesLegendEntries`, `StaticSeriesChart`, _`SeriesChartAxis`_, _`SeriesChartHit`_, _`SeriesChartMarker`_, _`SeriesChartPoint`_, _`SeriesChartProps`_, _`SeriesChartReference`_, _`SeriesChartRow`_, _`SeriesChartSeries`_, _`SeriesChartSpan`_, _`SeriesChartTickValues`_, _`SeriesChartTone`_, _`SeriesChartTooltip`_, _`SeriesChartTooltipPlacement`_, _`SeriesChartType`_, _`SeriesChartX`_, _`SeriesChartXTick`_, _`SeriesChartXValue`_, _`SeriesLegendAxes`_ |
| `components/chart-height` | _`ChartHeight`_ |
| `components/chart-zoom-core` | `SharedXZoom`, _`ZoomAxes`_, _`ZoomAxesSetting`_, _`ZoomBinding`_, _`ZoomDrag`_, _`ZoomFitSeries`_, _`ZoomFitSource`_, _`ZoomRow`_, _`ZoomSelection`_, _`ZoomState`_, _`ZoomTarget`_ |
| `components/toggle-legend` | `LegendColumn`, `LegendGroup`, `StaticLegend`, `STEP_DASH`, `STROKE_PATTERNS`, `strokeDash`, `toggleHidden`, `ToggleLegend`, _`LegendEntry`_, _`StaticLegendProps`_, _`ToggleLegendProps`_ |
| `components/facing-pair` | `FACING_SIDES`, `facingAxes`, `facingBand`, `facingHeadingPad`, _`FacingSide`_ |
| `components/series-chart-labels` | `DEFAULT_SERIES_CHART_LABELS`, _`SeriesChartLabels`_ |
| `components/pie-chart` | `PieChart`, _`PieChartProps`_, _`PieChartSlice`_ |
| `components/pie-chart-labels` | `DEFAULT_PIE_CHART_LABELS`, _`PieChartLabels`_ |
| `components/qr-code` | `QrCode`, _`QrCodeProps`_ |
| `components/alert-banner` | `AlertBanner`, `alertFrameClass`, `toneFrameClass`, _`AlertBannerProps`_, _`AlertSize`_, _`AlertTone`_ |
| `components/toggle-group` | `ToggleGroup`, _`ToggleGroupBaseProps`_, _`ToggleGroupClearableProps`_, _`ToggleGroupProps`_, _`ToggleGroupRequiredProps`_, _`ToggleOption`_ |
| `components/nav-pills` | `NavPills`, _`NavPillItem`_, _`NavPillLinkProps`_, _`NavPillsCurrent`_, _`NavPillsProps`_ |
| `components/section-nav` | `SectionNav`, _`SectionNavProps`_ |
| `components/chip` | `Chip`, _`ChipHue`_, _`ChipLinkProps`_, _`ChipProps`_, _`ChipShape`_, _`ChipSize`_, _`ChipTone`_, _`ChipVariant`_ |
| `components/chip-input` | `ChipInput`, `DEFAULT_CHIP_INPUT_LABELS`, _`ChipInputLabels`_, _`ChipInputProps`_ |
| `components/wizard-stepper` | `WizardStepper` |
| `components/hover-menu` | `HoverMenu`, _`HoverMenuProps`_ |
| `components/modal` | `Modal`, `ModalCloseContext`, `useBackdropClose`, _`ModalProps`_ |
| `components/full-bleed-dialog` | `DIALOG_GUTTER`, `FullBleedDialog`, _`FullBleedDialogProps`_ |
| `components/grouped-picker` | `GroupedPicker`, _`GroupedPickerProps`_, _`PickerGroup`_ |
| `components/file-dropzone` | `FileDropzone`, _`FileDropzoneProps`_, _`FileDropzoneRejectionFeedback`_, _`FileDropzoneState`_ |
| `components/mini-calendar` | `DEFAULT_MINI_CALENDAR_LABELS`, `MiniCalendar`, _`MiniCalendarDayState`_, _`MiniCalendarLabels`_, _`MiniCalendarProps`_, _`WeekDay`_ |
| `components/calendar-heatmap` | `CalendarHeatmap`, `DEFAULT_CALENDAR_HEATMAP_LABELS`, `heatmapLevel`, `heatmapWindowEnd`, _`CalendarHeatmapDatum`_, _`CalendarHeatmapDay`_, _`CalendarHeatmapLabels`_, _`CalendarHeatmapProps`_ |
| `components/date-picker` | `DatePicker`, _`DatePickerProps`_ |
| `components/tree-view` | `TreeRow`, `TreeView`, _`TreeItemState`_, _`TreeNode`_, _`TreeRowProps`_, _`TreeViewProps`_ |
| `components/description-list` | `DEFAULT_DESCRIPTION_LIST_LABELS`, `DescriptionItem`, `DescriptionList`, _`DescriptionItemProps`_, _`DescriptionListColumns`_, _`DescriptionListDensity`_, _`DescriptionListLabels`_, _`DescriptionListLayout`_, _`DescriptionListProps`_ |
| `components/form-actions` | `DEFAULT_FORM_ACTIONS_LABELS`, `FormActions`, _`FormActionsAlign`_, _`FormActionsDestructive`_, _`FormActionsLabels`_, _`FormActionsPlacement`_, _`FormActionsProps`_, _`FormActionsStack`_, _`FormActionsStickyWithin`_, _`FormActionsSubmitProps`_, _`FormActionsSubmitShortcut`_, _`ResponsiveFormActionsPlacement`_ |
| `components/write-lock` | `COMMIT_EXCEPT_BILLING`, `COMMIT_EXCEPT_OFFLINE`, `DEFAULT_WRITE_LOCK_LABELS`, `OFFLINE_LOCK`, `useOfflineWriteLock`, `useWriteLock`, `writeLockFor`, `WriteLockProvider`, _`CommitScope`_, _`WriteLock`_, _`WriteLockHold`_, _`WriteLockKind`_, _`WriteLockLabels`_, _`WriteLockProviderProps`_ |
| `components/account-chips` | `ACCOUNT_STATE_TONES`, `AccountRoleChip`, `AccountStateChip`, `dateColumn`, `DateMark`, `DEFAULT_ACCOUNT_STATE_LABELS`, `RoleChip`, _`AccountRoleChipProps`_, _`AccountState`_, _`AccountStateChipProps`_, _`AccountStateLabels`_, _`DateColumnOptions`_, _`DateMarkProps`_, _`RoleChipProps`_, _`RoleDefinition`_, _`RoleVocabulary`_ |
| `components/server-wake` | `DEFAULT_SERVER_WAKE_LABELS`, `ServerWakeNotice`, `useServerWakeStage`, _`ServerWakeLabels`_, _`ServerWakeNoticeProps`_ |
| `components/share-card` | `DEFAULT_SHARE_CARD_LABELS`, `ShareCard`, `ShareDialog`, `SharePanel`, _`ShareAddRequest`_, _`ShareCandidate`_, _`ShareCardLabels`_, _`ShareCardProps`_, _`ShareDialogProps`_, _`ShareGrantee`_, _`SharePanelProps`_, _`SharePendingGrant`_, _`ShareRole`_ |
| `components/line-items` | `DEFAULT_LINE_ITEMS_LABELS`, `LineItems`, _`LineItemCellContext`_, _`LineItemsColumn`_, _`LineItemsFieldLabels`_, _`LineItemsLabels`_, _`LineItemsProps`_, _`LineItemsRemoveAlign`_, _`LineItemsRemovePlacement`_, _`LineItemsRowProps`_, _`LineItemsSummary`_, _`LineItemsSummaryTone`_ |
| `components/progress-bar` | `DEFAULT_PROGRESS_BAR_LABELS`, `ProgressBar`, _`ProgressBarLabels`_, _`ProgressBarProps`_, _`ProgressBarSegment`_, _`ProgressBarSize`_, _`ProgressBarTone`_ |
| `components/skeleton` | `Skeleton`, _`SkeletonProps`_, _`SkeletonShape`_ |
| `components/table-skeleton` | `TableSkeleton`, _`TableSkeletonProps`_ |
| `components/loading-state` | `LoadingState`, _`LoadingStateLabelVisibility`_, _`LoadingStateProps`_, _`LoadingStateSize`_ |
| `components/signed-amount` | `DEFAULT_SIGNED_AMOUNT_LABELS`, `Delta`, `SignedAmount`, `Tone`, `toneTextClass`, _`DeltaProps`_, _`GoodDirection`_, _`SignedAmountLabels`_, _`SignedAmountProps`_, _`SignedAmountTone`_, _`TextTone`_, _`ToneProps`_, _`VerdictPalette`_ |
| `components/error-boundary` | `crashFingerprint`, `DEFAULT_ERROR_BOUNDARY_LABELS`, `describeThrown`, `ErrorBoundary`, `formatCrashReport`, `isChunkLoadError`, _`CrashReport`_, _`CrashReportResult`_, _`ErrorBoundaryDetails`_, _`ErrorBoundaryFallbackProps`_, _`ErrorBoundaryLabels`_, _`ErrorBoundaryProps`_ |
| `components/copy-button` | `CopyButton`, `DEFAULT_COPY_BUTTON_LABELS`, _`CopyButtonLabels`_, _`CopyButtonProps`_ |
| `components/authed-image` | `AuthedImage`, `DEFAULT_AUTHED_IMAGE_LABELS`, _`AuthedImageLabels`_, _`AuthedImageProps`_ |
| `components/image-grid` | `DEFAULT_IMAGE_GRID_LABELS`, `ImageGrid`, `splitFileName`, _`ImageGridLabels`_, _`ImageGridProps`_ |
| `components/lightbox` | `DEFAULT_LIGHTBOX_LABELS`, `imageItemKind`, `Lightbox`, _`ImageItem`_, _`ImageItemKind`_, _`LightboxLabels`_, _`LightboxProps`_ |
| `components/button-group` | `ButtonGroup`, `ButtonGroupLink`, _`ButtonGroupLinkProps`_, _`ButtonGroupLinkRenderProps`_, _`ButtonGroupProps`_ |
| `components/table` | `NUMERIC_CELL_CLASS`, `Table`, `TableBody`, `TableCaption`, `TableCell`, `TableEmpty`, `TableFoot`, `TableHead`, `TableHeaderCell`, `TableRow`, _`TableAlign`_, _`TableBodyProps`_, _`TableCaptionProps`_, _`TableCellProps`_, _`TableDensity`_, _`TableEmptyProps`_, _`TableFootProps`_, _`TableHeaderCellProps`_, _`TableHeaderCellSize`_, _`TableHeaderCellWeight`_, _`TableHeadProps`_, _`TableLayout`_, _`TableProps`_, _`TableRowProps`_, _`TableRowVariant`_, _`TableVAlign`_ |
| `components/separator` | `Separator`, _`SeparatorProps`_ |
| `components/scroll-area` | `ScrollArea`, _`ScrollAreaProps`_ |
| `components/list` | `DEFAULT_LIST_LABELS`, `List`, `ListItem`, _`ListDensity`_, _`ListItemLinkProps`_, _`ListItemProps`_, _`ListItemTrailingTone`_, _`ListLabels`_, _`ListProps`_, _`ListSeparator`_ |
| `components/menu-item` | `MenuItem`, _`MenuItemLinkProps`_, _`MenuItemProps`_, _`MenuItemTone`_ |
| `components/text` | `Caption`, `CAPTION_CLASS`, `SECTION_LABEL_CLASS`, `SectionLabel`, _`CaptionProps`_, _`SectionLabelProps`_, _`SectionLabelSize`_, _`SectionLabelVariant`_ |
| `components/status-dot` | `StatusDot`, `statusDotColor`, _`StatusDotProps`_, _`StatusDotSize`_, _`StatusDotTone`_ |
| `components/page-header` | `PageHeader`, _`PageHeaderActionsAlign`_, _`PageHeaderMobileLayout`_, _`PageHeaderProps`_, _`PageHeaderSize`_ |
| `components/breadcrumbs` | `Breadcrumbs`, `DEFAULT_BREADCRUMBS_LABELS`, _`BreadcrumbItem`_, _`BreadcrumbLinkProps`_, _`BreadcrumbsLabels`_, _`BreadcrumbsProps`_ |
| `components/text-link` | `TextLink`, _`TextLinkCurrent`_, _`TextLinkProps`_, _`TextLinkRenderProps`_, _`TextLinkTone`_, _`TextLinkUnderline`_ |
| `components/toast` | `DEFAULT_TOAST_LABELS`, `toast`, `TOAST_ACTION_DURATION`, `Toaster`, `TOASTER_OFFSET_BOTTOM`, `TOASTER_OFFSET_TOP`, _`ToastAction`_, _`ToasterOffset`_, _`ToasterProps`_, _`ToastId`_, _`ToastLabels`_, _`ToastOptions`_, _`ToastPosition`_, _`ToastPromiseOptions`_, _`ToastRedoOptions`_, _`ToastSwipeDirection`_, _`ToastUndoOptions`_ |
| `components/translation-review` | `TranslationReviewPanel`, _`TranslationReviewGroupBy`_, _`TranslationReviewOrigin`_, _`TranslationReviewPanelProps`_, _`TranslationReviewSaveInfo`_ |
| `components/legal` | `DEFAULT_LEGAL_LABELS`, `LEGAL_HREFS`, `LegalFooter`, `LegalLayout`, `LegalLinks`, `legalOperatorText`, `LegalSection`, `useLegalLabels`, _`LegalDisclaimerSectionLabels`_, _`LegalFooterProps`_, _`LegalFramedSectionLabels`_, _`LegalInfoPageKey`_, _`LegalLabels`_, _`LegalLayoutProps`_, _`LegalLink`_, _`LegalLinksProps`_, _`LegalOperator`_, _`LegalOperatorSectionLabels`_, _`LegalOperatorText`_, _`LegalPageKey`_, _`LegalSectionProps`_, _`LegalTextSectionLabels`_ |
| `components/legal-page` | `LEGAL_SKELETON`, `LegalAcceptCheckbox`, `LegalKitSection`, `LegalPage`, _`LegalAcceptCheckboxProps`_, _`LegalDisclaimerVariant`_, _`LegalKitSectionKey`_, _`LegalKitSectionProps`_, _`LegalPageProps`_, _`LegalSectionOwner`_, _`LegalSkeletonEntry`_, _`LegalSkeletonPage`_ |
| `components/appearance-labels` | `DEFAULT_APPEARANCE_LABELS`, `useAppearanceLabels`, _`AppearanceLabels`_ |
| `components/date-format-setting` | `DateFormatSetting`, _`DateFormatSettingProps`_ |
| `components/row-actions` | `DEFAULT_ROW_ACTIONS_LABELS`, `ROW_ACTIONS_CELL_CLASS`, `ROW_ACTIONS_HEAD_CLASS`, `RowActions`, `rowActionsColumn`, `RowActionsHead`, _`RowAction`_, _`RowActionConfirm`_, _`RowActionList`_, _`RowActionsCollapse`_, _`RowActionsColumnOptions`_, _`RowActionsHeadProps`_, _`RowActionsLabels`_, _`RowActionsProps`_, _`RowActionsSize`_, _`RowActionTone`_ |
| `components/checkbox-group` | `CheckboxGroup`, _`CheckboxGroupLegendVisibility`_, _`CheckboxGroupOption`_, _`CheckboxGroupProps`_ |
| `components/one-time-code-input` | `OneTimeCodeInput`, _`OneTimeCodeInputProps`_ |
| `components/language-select` | `LanguageSelect`, _`LanguageSelectProps`_ |
| `components/tile-radio` | `TILE_SIZE`, `TileRadioGroup`, _`TileItem`_, _`TileRadioGroupProps`_, _`TileSize`_ |
| `components/inline-edit-field` | `DEFAULT_INLINE_EDIT_LABELS`, `InlineEditField`, _`InlineEditFieldProps`_, _`InlineEditLabels`_, _`InlineEditorProps`_ |
| `components/sign-chip` | `DEFAULT_SIGN_CHIP_LABELS`, `SignChip`, _`SignChipLabels`_, _`SignChipProps`_ |
| `components/country-select` | `CountrySelect`, `DEFAULT_COUNTRY_SELECT_LABELS`, _`CountrySelectLabels`_, _`CountrySelectProps`_ |
| `components/iban-input` | `DEFAULT_IBAN_INPUT_LABELS`, `IbanInput`, _`IbanInputLabels`_, _`IbanInputProps`_ |
| `components/phone-input` | `DEFAULT_PHONE_INPUT_LABELS`, `PhoneInput`, _`PhoneInputLabels`_, _`PhoneInputProps`_ |
| `components/field-strip` | `FieldStrip`, _`FieldStripIds`_, _`FieldStripProps`_ |
| `components/column-mapper` | `ColumnMapper`, `ColumnRoleTable`, `DEFAULT_COLUMN_MAPPER_LABELS`, _`ColumnMapperLabels`_, _`ColumnMapperProps`_, _`ColumnRoleTableBodyProps`_, _`ColumnRoleTableProps`_, _`ColumnRoleTableRowProps`_ |
| `components/data-table-labels` | `DEFAULT_DATA_TABLE_LABELS`, _`DataTableLabels`_ |
| `components/data-table-sort` | `decodeSorts`, `encodeSorts`, `nextSorts`, `normalizeSorts`, _`SortCycle`_, _`SortDir`_, _`SortState`_, _`SortStepOptions`_ |
| `components/data-table-filters` | `dateFilter`, `decodeFilterValue`, `decodeFilterValueOfType`, `defaultFilterState`, `encodeFilterValue`, `filterHref`, `isFilterActive`, `numberFilter`, `resolveFilter`, `rowMatches`, `selectFilter`, `textFilter`, _`ColumnFilter`_, _`FilterValue`_ |
| `components/data-table-pagination` | `PAGE_SIZE_OPTIONS`, `Pagination` |
| `components/data-table-filter-popover` | `FilterPopover` |
| `components/data-table` | `DataTable`, `DEFAULT_DATA_TABLE_SORT_LABELS`, _`DataTableCellProps`_, _`DataTableChrome`_, _`DataTableColumn`_, _`DataTableDensity`_, _`DataTableDesktopSwipeActions`_, _`DataTableHeadProps`_, _`DataTableProps`_, _`DataTableRowAction`_, _`DataTableSortLabels`_, _`FilterState`_, _`MobileSwipeActions`_, _`ServerPagination`_ |
| `components/data-table-row-actions` | `swipePlanRowActions` |
| `components/data-table-groups` | _`DataTableGroupBy`_, _`DataTableLoadMore`_ |
| `components/data-table-virtual` | _`DataTableVirtualize`_ |
| `components/data-table-cells` | `booleanColumn`, `BooleanMark`, _`BooleanColumnOptions`_, _`BooleanMarkProps`_ |
| `components/use-table-state` | `readTableUrlState`, `useTableUrlState`, _`TableUrlState`_, _`TableUrlStateProps`_, _`TableUrlSync`_, _`UseTableUrlStateOptions`_, _`UseTableUrlStateReturn`_ |
| `components/translation-review-editor` | `TranslationReviewEditor`, _`TranslationReviewEditorProps`_ |
| `components/translation-review-parts` | `REVIEW_STATUS_TONES`, `ReviewStatusChip`, `TranslationExportButton`, `TranslationLocaleTabs`, `TranslationProgress`, _`ReviewStatusChipProps`_, _`TranslationExportButtonProps`_, _`TranslationLocaleTab`_, _`TranslationLocaleTabsProps`_, _`TranslationProgressProps`_ |
| `components/translation-review-labels` | `DEFAULT_TRANSLATION_REVIEW_LABELS`, _`TranslationReviewLabels`_ |
| `components/inline-entity-combobox` | `InlineEntityCombobox`, _`InlineEntityComboboxProps`_ |
| `components/combobox-core` | _`ComboClearValue`_, _`ComboOption`_ |
| `components/series-chart-ticks` | _`TimeTickUnit`_ |
| `components/series-chart-budget` | _`SeriesChartAxisBudget`_ |
| `components/series-chart-axes` | `anchoredBand`, `AXIS_TICK_WIDTH`, `AXIS_TITLE_STRIP`, `axisBandWidth`, `mergeSeries`, `oneAxis`, `padBand`, `paddedDomain`, `seriesKey`, `soleSeriesColor`, `visibleSeries`, _`SeriesSource`_ |
| `components/date-field` | _`DateTriggerAttributes`_ |
| `components/date-range-picker` | `DateRangePicker`, _`DateRangeCommit`_, _`DateRangeDraftSummary`_, _`DateRangePickerPreset`_, _`DateRangePickerProps`_, _`DateRangeTriggerRenderProps`_ |

### shell

| Module | Exports |
|---|---|
| `shell/topbar-controls` | `LanguageMenu`, `PaletteMenu`, `ThemeToggle`, `TOPBAR_MENU_ITEM_CLASS`, `TOPBAR_TRIGGER_CLASS`, _`LanguageMenuTrigger`_, _`LanguageOption`_ |
| `shell/top-bar` | `TopBar`, _`TopBarProps`_ |
| `shell/app-shell` | `AppShell`, `DEFAULT_APP_SHELL_MORE_LABELS`, `DEFAULT_MOBILE_MAX_ITEMS`, `pickMobileBar`, `splitMobileBar`, _`AppShellMoreLabels`_, _`AppShellNavItem`_, _`AppShellProps`_, _`AppShellSidebarFooterItem`_, _`AppShellSubItem`_ |
| `shell/option-switcher-menu` | `OptionSwitcherMenu`, _`OptionSwitcherOption`_ |
| `shell/role-switcher` | `RoleSwitcher`, _`RoleSwitcherProps`_ |
| `shell/topbar-action-menu` | `TopBarActionMenu`, _`TopBarMenuEntry`_, _`TopBarMenuHeader`_ |
| `shell/top-bar-brand` | `TopBarBrand`, _`TopBarBrandProps`_ |
| `shell/auth-layout` | `AuthLayout`, _`AuthLayoutProps`_ |
| `shell/fill-height` | `FILL_HEIGHT_CLASS`, `FillHeight`, _`FillHeightProps`_ |
| `shell/admin-menu` | `adminMenuEntry`, `AdminMenuRow`, `AdminWaitingBadge`, `useAdminMenuEntry`, _`AdminMenuEntryOptions`_, _`AdminMenuRowProps`_, _`AdminWaitingBadgeProps`_, _`UseAdminMenuEntryOptions`_ |
| `shell/top-bar-actions` | `TOP_BAR_ACTION_ORDER`, `TopBarActions`, _`TopBarActionsProps`_ |
| `shell/account-menu-language` | `AccountMenuLanguage`, _`AccountMenuLanguageOption`_, _`AccountMenuLanguageProps`_ |
| `shell/account-menu-text-size` | `AccountMenuTextSize`, _`AccountMenuTextSizeProps`_ |
| `shell/tour-menu` | `TourMenu`, _`TourMenuProps`_, _`TourMenuTour`_ |
| `shell/sync-status-indicator` | `syncState`, `SyncStatusIndicator`, _`SyncState`_, _`SyncStatus`_, _`SyncStatusIndicatorProps`_, _`SyncStatusScope`_ |
| `shell/dev-menu` | `DEV_ORIGINAL_ROLE_KEY`, `DevMenu`, _`DevMenuProps`_, _`DevMenuSection`_ |
| `shell/dev-switchers` | `DevSwitchers`, _`DevSwitchersProps`_ |
| `shell/top-bar-parts-labels` | `DEFAULT_TOP_BAR_PARTS_LABELS`, `useTopBarPartsLabels`, _`DevSwitchersLabels`_, _`SyncStatusLabels`_, _`TopBarPartsLabels`_, _`TourMenuLabels`_ |
| `shell/company-switcher` | `CompanySwitcher`, `DEFAULT_COMPANY_SWITCHER_LABELS`, _`CompanySwitcherCompany`_, _`CompanySwitcherLabels`_, _`CompanySwitcherProps`_ |

### settings

| Module | Exports |
|---|---|
| `settings/settings-layout` | `SETTINGS_SEARCH_THRESHOLD`, `SettingsLayout`, _`SettingsDocumentTitleParts`_, _`SettingsLayoutProps`_, _`SettingsLayoutWidth`_ |
| `settings/use-settings-route` | `resolveSettingsLocation`, `SETTINGS_FROM_LIST_STATE`, `settingsFromListState`, `useSettingsRoute`, _`SettingsLayoutMode`_, _`SettingsLocation`_, _`SettingsLocationResult`_, _`SettingsLocationRules`_, _`SettingsRoute`_, _`UseSettingsRouteOptions`_ |
| `settings/use-settings-focus` | `SETTINGS_FOCUS_MS`, `SETTINGS_FOCUS_RING`, `useSettingsFocus` |
| `settings/settings-section` | `SettingsSection`, _`SettingsSectionProps`_ |
| `settings/settings-context` | `useSettingsLayout`, _`SettingsLayoutContextValue`_ |
| `settings/settings-heading` | `SettingsHeadingLevel`, `useSettingsHeadingLevel`, _`SettingsHeadingLevelProps`_, _`SettingsHeadingTag`_ |
| `settings/settings-catalogue` | `settingsHref`, `settingsSearchEntries`, `visibleSettingsEntries`, `visibleSettingsGroups`, _`SettingsEntry`_, _`SettingsGroup`_, _`SettingsSearchEntriesOptions`_ |
| `settings/settings-labels` | `DEFAULT_SETTINGS_LABELS`, `useSettingsLabels`, _`SettingsCoreGroup`_, _`SettingsGroupLabels`_, _`SettingsLabels`_ |
| `settings/device-reset-setting` | `DEFAULT_DEVICE_RESET_LABELS`, `DEVICE_RESET_ANCHOR`, `DeviceResetSetting`, _`DeviceResetLabels`_, _`DeviceResetSettingProps`_ |
| `settings/use-account-language` | `matchOfferedLanguage`, `resolveAccountLanguage`, `useAccountLanguage`, _`AccountLanguage`_, _`AccountLanguageSource`_, _`ResolveAccountLanguageInput`_, _`ResolvedAccountLanguage`_, _`UseAccountLanguageOptions`_ |
| `settings/use-account-appearance` | `resolveAccountAppearance`, `useAccountAppearance`, _`AccountAppearance`_, _`AccountAppearanceFields`_, _`AccountAppearancePatch`_, _`AppearanceSource`_, _`DeviceAppearance`_, _`ResolvedAccountAppearance`_, _`UseAccountAppearanceOptions`_ |

### landing

| Module | Exports |
|---|---|
| `landing/routing` | `clearLastVisitedPage`, `DEFAULT_LAST_VISITED_EXCLUDES`, `NEXT_PARAM`, `readLastVisitedPage`, `RedirectIfAuthed`, `RootEntry`, `safeNextPath`, `useLastVisitedPage`, _`LastVisitedPageOptions`_, _`PathPattern`_, _`RedirectIfAuthedProps`_, _`RootEntryProps`_, _`RoutingSession`_ |
| `landing/public-header` | `PublicHeader`, _`PublicHeaderBrand`_, _`PublicHeaderProps`_ |
| `landing/landing-labels` | `DEFAULT_LANDING_LABELS`, `useLandingLabels`, _`LandingLabels`_ |
| `landing/access` | `accessAction`, `useAccessAction`, _`AccessChoice`_, _`AccessLabels`_, _`AccessLink`_ |
| `landing/landing-actions` | `LandingActions`, _`LandingActionsProps`_, _`LandingSession`_ |
| `landing/landing-sections` | `CtaBand`, `FeatureRow`, `FeatureRows`, `Hero`, `PublicFooter`, `TrustStrip`, _`CtaBandProps`_, _`FeatureRowProps`_, _`FeatureRowsProps`_, _`HeroProps`_, _`PublicFooterProps`_, _`TrustItem`_, _`TrustStripProps`_ |
| `landing/page-seo` | `metaContent`, `seoCopyProblems`, `usePageSeo`, _`PageSeo`_, _`SeoCopy`_, _`SeoCopyLimits`_, _`SeoCopyProblem`_, _`SeoCopyProblemCode`_ |
| `landing/public-page` | `PublicPage`, _`PublicPageProps`_ |

### feedback

| Module | Exports |
|---|---|
| `feedback/feedback-attachment` | `DEFAULT_ATTACHMENT_ACCEPT`, `DEFAULT_FEEDBACK_ATTACHMENT_LABELS`, `DEFAULT_MAX_ATTACHMENT_BYTES`, `DEFAULT_MAX_ATTACHMENTS`, `FeedbackAttachmentField`, `pastedName`, _`FeedbackAttachmentError`_, _`FeedbackAttachmentErrorInfo`_, _`FeedbackAttachmentFieldLabels`_, _`FeedbackAttachmentFieldMultipleProps`_, _`FeedbackAttachmentFieldProps`_, _`FeedbackAttachmentFieldRefsProps`_, _`FeedbackAttachmentFieldSingleProps`_, _`FeedbackAttachmentRef`_, _`FeedbackAttachmentRefsError`_ |
| `feedback/feedback-dialog` | `DEFAULT_FEEDBACK_DIALOG_LABELS`, `FeedbackDialog`, _`FeedbackAttachmentLabels`_, _`FeedbackCategoryOption`_, _`FeedbackDialogLabels`_, _`FeedbackDialogMultipleProps`_, _`FeedbackDialogProps`_, _`FeedbackDialogSingleProps`_, _`FeedbackDialogTextLabels`_, _`FeedbackMultipleSubmission`_, _`FeedbackSubmission`_, _`FeedbackSubmitHint`_ |
| `feedback/feedback-inbox` | `FeedbackCategoryBadge`, `FeedbackDetail`, `FeedbackDetailSection`, `FeedbackNoteEditor`, `FeedbackProse`, `FeedbackStatusBadge`, `FeedbackStatusTransitions`, _`FeedbackNoteAttachment`_ |
| `feedback/feedback-thread` | `ChatComposer`, `DEFAULT_FEEDBACK_COMPOSER_LABELS`, `DEFAULT_FEEDBACK_THREAD_LABELS`, `FeedbackThread`, _`ChatComposerHandle`_, _`ChatComposerLabels`_, _`ChatComposerProps`_, _`ChatComposerSlotContext`_, _`FeedbackComposerAttachment`_, _`FeedbackComposerHandle`_, _`FeedbackComposerLabels`_, _`FeedbackComposerProps`_, _`FeedbackComposerSlotContext`_, _`FeedbackThreadAttachment`_, _`FeedbackThreadEvent`_, _`FeedbackThreadItem`_, _`FeedbackThreadLabels`_, _`FeedbackThreadMessage`_, _`FeedbackThreadProps`_ |
| `feedback/feedback-record` | `appendRework`, `attachmentName`, `FEEDBACK_ATTACHMENT_ACCEPT`, `FEEDBACK_AUTHOR_EDITABLE_STATUSES`, `FEEDBACK_AWAITING_STATUSES`, `FEEDBACK_COMMENT_MAX`, `FEEDBACK_DECIDED_STATUSES`, `FEEDBACK_PICKABLE_CATEGORIES`, `FEEDBACK_QUEUE_STATUSES`, `FEEDBACK_REPLY_MAX`, `FEEDBACK_REWORKABLE_STATUSES`, `feedbackAttachmentLine`, `feedbackReworkCount`, `isImageAttachment`, `replaceDescription`, `reworkCount`, `splitBodyAttachments`, `splitDescription`, _`FeedbackContext`_, _`FeedbackEnvironment`_, _`FeedbackRecord`_ |
| `feedback/feedback-labels` | `DEFAULT_FEEDBACK_CATEGORY_LABELS`, `DEFAULT_FEEDBACK_STATUS_LABELS`, `DEFAULT_FEEDBACK_TOAST_LABELS`, `useFeedbackCategoryLabels`, `useFeedbackStatusLabels`, `useFeedbackToastLabels`, _`FeedbackCategoryLabels`_, _`FeedbackStatusLabels`_, _`FeedbackToastLabels`_ |
| `feedback/feedback-status-undo` | `FEEDBACK_UNDO_DURATION`, `useFeedbackStatusUndo`, _`FeedbackStatusChange`_, _`FeedbackStatusMutate`_, _`FeedbackStatusPatch`_, _`FeedbackStatusRow`_, _`FeedbackStatusUndoOptions`_ |
| `feedback/feedback-swipe` | `DEFAULT_FEEDBACK_SWIPE`, `FEEDBACK_SWIPE_ACTIONS`, `feedbackSwipeOmitShown`, `feedbackSwipePlan`, _`FeedbackSwipeAction`_, _`FeedbackSwipeBinding`_, _`FeedbackSwipeOptions`_ |
| `feedback/feedback-menu` | `DEFAULT_FEEDBACK_MENU_LABELS`, `FeedbackMenu`, _`FeedbackMenuLabels`_, _`FeedbackMenuProps`_ |
| `feedback/feedback-context` | `DEFAULT_FEEDBACK_CONTEXT_LABELS`, `feedbackContext`, `FeedbackContextBox`, _`FeedbackContextBoxProps`_, _`FeedbackContextInput`_, _`FeedbackContextLabels`_, _`FeedbackSubmitter`_ |
| `feedback/feedback-capture` | `captureAppScreenshot`, _`CaptureAppScreenshotOptions`_ |
| `feedback/feedback-submit` | `useFeedbackSubmit`, _`FeedbackCreatePayload`_, _`FeedbackSubmit`_, _`UseFeedbackSubmitOptions`_ |
| `feedback/feedback-table` | `DEFAULT_FEEDBACK_PAGE_LABELS`, `FeedbackAwaitingToggle`, `feedbackColumns`, `FeedbackEmptyState`, `feedbackEnvironment`, `FeedbackMobileCard`, `feedbackMobileGroupBy`, `FeedbackSubject`, `feedbackSubmitter`, `feedbackSubmitterEmail`, `isFeedbackAwaiting`, `useFeedbackColumns`, `useFeedbackPageLabels`, `useFeedbackRenderDate`, _`FeedbackAwaitingToggleProps`_, _`FeedbackColumnsOptions`_, _`FeedbackEmptyStateProps`_, _`FeedbackMobileCardProps`_, _`FeedbackPageLabels`_, _`FeedbackRenderDate`_, _`FeedbackSubjectProps`_, _`FeedbackTableRow`_, _`UseFeedbackColumnsOptions`_ |
| `feedback/feedback-row-detail` | `DEFAULT_FEEDBACK_DETAIL_LABELS`, `feedbackAttachmentUrls`, `feedbackPageHref`, `feedbackPagePath`, `feedbackPageUrl`, `FeedbackReworkSection`, `feedbackRowAccess`, `FeedbackRowDetail`, `useFeedbackDetailLabels`, _`FeedbackDetailLabels`_, _`FeedbackDetailPatch`_, _`FeedbackDetailUpdate`_, _`FeedbackReworkSectionProps`_, _`FeedbackReworkSend`_, _`FeedbackRowAccess`_, _`FeedbackRowDetailProps`_, _`FeedbackUpload`_ |
| `feedback/feedback-crash` | `createCrashReporter`, _`CrashFiling`_, _`CrashReportCreate`_, _`CrashReporter`_, _`CrashReporterOptions`_, _`CrashReportResponse`_ |
| `feedback/feedback-public-switch` | `FeedbackPublicSwitch`, `feedbackPublicSwitchAllowed`, _`FeedbackPublicSwitchProps`_, _`FeedbackPublicSwitchRow`_, _`FeedbackPublicSwitchViewer`_ |
| `feedback/feedback-public-list` | `DEFAULT_FEEDBACK_PUBLIC_LABELS`, `FeedbackPublicDetail`, `FeedbackPublicList`, `useFeedbackPublicLabels`, _`FeedbackPublicDetailProps`_, _`FeedbackPublicLabels`_, _`FeedbackPublicListProps`_ |
| `feedback/feedback-public-types` | _`FeedbackComment`_, _`FeedbackEntryKind`_, _`FeedbackPublicListItem`_, _`FeedbackPublicRecord`_, _`FeedbackPublicSort`_, _`FeedbackReply`_, _`FeedbackVoteState`_ |
| `feedback/feedback-vote-button` | `DEFAULT_FEEDBACK_VOTE_LABELS`, `FeedbackVoteButton`, _`FeedbackVoteButtonProps`_, _`FeedbackVoteLabels`_ |
| `feedback/feedback-comment-thread` | `DEFAULT_FEEDBACK_COMMENTS_LABELS`, `FeedbackCommentThread`, _`FeedbackCommentsLabels`_, _`FeedbackCommentThreadProps`_ |
| `feedback/feedback-replies` | `DEFAULT_FEEDBACK_REPLIES_LABELS`, `FeedbackReplyComposer`, `feedbackReplyNudge`, `FeedbackReplyTimeline`, `useFeedbackRepliesLabels`, _`FeedbackRepliesLabels`_, _`FeedbackReplyComposerProps`_, _`FeedbackReplyTimelineProps`_ |
| `feedback/feedback-entry-file` | `FeedbackEntryFile`, `useFeedbackEntryUpload`, _`FeedbackEntryFileProps`_, _`FeedbackEntryUpload`_, _`FeedbackEntryUploadOptions`_, _`FeedbackEntryUploadState`_ |
| `feedback/feedback-vocabulary` | `FEEDBACK_CATEGORY_META`, `FEEDBACK_CATEGORY_ORDER`, `FEEDBACK_STATUS_META`, `FEEDBACK_STATUS_ORDER`, `feedbackCategoryRank`, `nextFeedbackStatus`, `selectableFeedbackStatuses`, `visibleFeedbackStatuses`, _`FeedbackCategory`_, _`FeedbackStatus`_ |

### wizard

| Module | Exports |
|---|---|
| `wizard/types` | `DEFAULT_WIZARD_LABELS`, _`FieldErrors`_, _`StepStatus`_, _`SummaryItem`_, _`SummarySection`_, _`UseWizardOptions`_, _`UseWizardReturn`_, _`ValidateResult`_, _`WizardFinishResult`_, _`WizardLabels`_, _`WizardStepConfig`_, _`WizardUrlSync`_ |
| `wizard/use-wizard` | `useWizard` |
| `wizard/wizard-context` | `useOptionalWizardContext`, `useWizardContext`, `useWizardNextGate`, `useWizardStepValidate`, `WizardContextProvider`, _`WizardContextValue`_ |
| `wizard/validation` | `requiredFieldsValidator`, _`RequiredFieldSpec`_ |
| `wizard/wizard-step` | `WizardStep`, _`WizardStepProps`_ |
| `wizard/wizard-summary` | `WizardSummary` |
| `wizard/stepper-nav` | `StepperNav` |

### tour

| Module | Exports |
|---|---|
| `tour/tour` | `DEFAULT_TOUR_LABELS`, `TourProvider`, `useTour`, `useTourOptional`, _`TourAt`_, _`TourCompletion`_, _`TourEngine`_, _`TourLabels`_, _`TourLauncher`_, _`TourPlacement`_, _`TourStart`_, _`TourStep`_, _`TourStepContext`_ |
| `tour/tour-catalogue` | `DEFAULT_TOUR_CATALOGUE_LABELS`, `TourCatalogue`, `TourCatalogueCard`, _`TourCatalogueCardProps`_, _`TourCatalogueLabels`_, _`TourCatalogueProps`_ |
| `tour/tour-info` | `doneCount`, `earnedPoints`, `isTourDone`, `isTourNew`, `isTourReset`, _`TourCompletions`_, _`TourGroup`_, _`TourInfo`_, _`TourUpdate`_ |
| `tour/use-tour-progress` | `completeTour`, `resetTourProgress`, `signOutTourProgress`, `useTourProgress`, _`TourProgress`_, _`TourProgressAccount`_, _`TourProgressAdopt`_, _`TourProgressBody`_, _`UseTourProgressOptions`_ |
| `tour/use-tour-url-sync` | `useTourCatalogueUrlState`, `useTourUrlSync`, _`TourCatalogueFilter`_, _`TourStateFilter`_, _`UseTourUrlSyncOptions`_ |
| `tour/tour-guide-button` | `DEFAULT_TOUR_GUIDE_LABELS`, `TourGuideButton`, _`TourGuideButtonProps`_, _`TourGuideLabels`_ |
| `tour/tour-gates` | `useTourGate`, `useTourGateRelease`, _`TourGateRelease`_ |

### search

| Module | Exports |
|---|---|
| `search/command-palette` | `CommandPalette`, `DEFAULT_COMMAND_PALETTE_LABELS`, _`CommandItem`_, _`CommandPaletteDensity`_, _`CommandPaletteLabels`_ |
| `search/search-index` | `createSearchIndex`, `matchEntries`, `normalizeSearchText`, `SEARCH_TIER_POINTS`, _`SearchEntry`_, _`SearchHit`_, _`SearchIndex`_, _`SearchIndexOptions`_, _`SearchMatchField`_ |
| `search/global-search` | `DEFAULT_GLOBAL_SEARCH_LABELS`, `GlobalSearch`, _`GlobalSearchLabels`_, _`GlobalSearchProps`_, _`GlobalSearchSource`_, _`GlobalSearchSourceGroup`_, _`GlobalSearchSuggestion`_, _`GlobalSearchTriggerProps`_ |
| `search/use-command-key` | `useCommandKey` |

### auth

| Module | Exports |
|---|---|
| `auth/sign-in-form` | `DEFAULT_SIGN_IN_LABELS`, `SignInForm`, _`SignInAction`_, _`SignInAnswer`_, _`SignInCodeValues`_, _`SignInCredentials`_, _`SignInFormProps`_, _`SignInLabels`_, _`SignInNewPasswordValues`_, _`SignInStep`_ |
| `auth/register-form` | `DEFAULT_REGISTER_LABELS`, `RegisterForm`, _`RegisterFormProps`_, _`RegisterLabels`_, _`RegisterValues`_ |
| `auth/complete-name-dialog` | `CompleteNameDialog`, `DEFAULT_COMPLETE_NAME_LABELS`, _`CompleteNameDialogProps`_, _`CompleteNameLabels`_, _`CompleteNameValues`_ |
| `auth/email-tag` | `taggedEmail` |
| `auth/auth-errors` | `authErrorCode`, `isAuthError`, `isBillingError`, `isRateLimited`, `retryAfterSeconds`, _`AccountErrorCode`_, _`AuthErrorCode`_, _`BillingErrorCode`_, _`DemoErrorCode`_, _`KitErrorCode`_ |
| `auth/forgot-password-form` | `DEFAULT_FORGOT_PASSWORD_LABELS`, `ForgotPasswordForm`, _`ForgotPasswordFormProps`_, _`ForgotPasswordLabels`_ |
| `auth/reset-password-form` | `DEFAULT_RESET_PASSWORD_LABELS`, `ResetPasswordForm`, _`ResetPasswordCheck`_, _`ResetPasswordFormProps`_, _`ResetPasswordLabels`_, _`ResetPasswordResult`_, _`ResetPasswordValues`_ |
| `auth/verify-email` | `DEFAULT_VERIFY_EMAIL_LABELS`, `EmailVerificationBanner`, `VerifyEmailStatus`, _`EmailVerificationBannerProps`_, _`VerifyEmailFailure`_, _`VerifyEmailLabels`_, _`VerifyEmailStatusProps`_ |
| `auth/not-found-page` | `DEFAULT_NOT_FOUND_LABELS`, `NotFoundPage`, _`NotFoundLabels`_, _`NotFoundPageProps`_ |
| `auth/accept-invitation` | `AcceptInvitation`, `DEFAULT_ACCEPT_INVITATION_LABELS`, _`AcceptInvitationFailure`_, _`AcceptInvitationLabels`_, _`AcceptInvitationProps`_, _`AcceptInvitationResult`_ |
| `auth/status-parts` | _`AuthHeadingLevel`_ |

### account

| Module | Exports |
|---|---|
| `account/account-settings` | `PasswordSetting`, `ProfileSetting`, `TwoFactorSetting`, _`PasswordSettingStrength`_, _`ProfileNameValues`_, _`ProfileSettingDisplayNameProps`_, _`ProfileSettingNamesProps`_, _`ProfileSettingProps`_, _`TwoFactorSetupData`_ |
| `account/passkeys-setting` | `PasskeysSetting`, _`PasskeyDataAttributes`_, _`PasskeyId`_, _`PasskeyItem`_, _`PasskeysSettingProps`_ |
| `account/email-change-setting` | `DEFAULT_EMAIL_CHANGE_LABELS`, `EmailChangeSetting`, _`EmailChangeAction`_, _`EmailChangeLabels`_, _`EmailChangeSettingProps`_, _`EmailChangeValues`_ |
| `account/sessions-setting` | `DEFAULT_SESSIONS_LABELS`, `SessionsSetting`, _`SessionId`_, _`SessionItem`_, _`SessionsAction`_, _`SessionsLabels`_, _`SessionsSettingProps`_ |
| `account/delete-account-setting` | `DEFAULT_DELETE_ACCOUNT_LABELS`, `DeleteAccountSetting`, _`DeleteAccountConsequence`_, _`DeleteAccountLabels`_, _`DeleteAccountSettingProps`_, _`DeleteAccountValues`_, _`DeletionMode`_ |
| `account/data-export-setting` | `DataExportSetting`, `DEFAULT_DATA_EXPORT_LABELS`, _`DataExportFile`_, _`DataExportLabels`_, _`DataExportSettingProps`_ |
| `account/account-settings-labels` | `DEFAULT_ACCOUNT_SETTINGS_LABELS`, _`AccountSettingsLabels`_, _`PasskeysSettingLabels`_, _`PasswordSettingLabels`_, _`ProfileSettingLabels`_, _`TwoFactorSettingLabels`_ |

### admin

| Module | Exports |
|---|---|
| `admin/user-roster` | `adminUserStates`, `DEFAULT_USER_ROSTER_LABELS`, `USER_ROSTER_SORT_KEYS`, `UserIdentityCell`, `userRosterColumns`, `userRosterSort`, `UserRowActions`, `useUserRosterColumns`, _`AdminUserStateFields`_, _`RoleEditing`_, _`RosterState`_, _`UserIdentityCellProps`_, _`UserRosterColumnsOptions`_, _`UserRosterLabels`_, _`UserRosterRow`_, _`UserRosterSortKey`_, _`UserRowAction`_, _`UserRowActionList`_, _`UserRowActionsProps`_ |
| `admin/role-select` | `DEFAULT_ROLE_SELECT_LABELS`, `RolesEditor`, `RoleSelect`, _`RoleLock`_, _`RoleLockCode`_, _`RolesEditorProps`_, _`RoleSelectLabels`_, _`RoleSelectProps`_ |
| `admin/reviewer-scope-editor` | `DEFAULT_REVIEWER_SCOPE_LABELS`, `ReviewerScopeEditor`, _`ReviewerScope`_, _`ReviewerScopeArea`_, _`ReviewerScopeEditorProps`_, _`ReviewerScopeLabels`_, _`ReviewerScopeLanguage`_ |
| `admin/admin-action-confirm` | `AdminActionConfirm`, `DEFAULT_ADMIN_ACTION_LABELS`, _`AdminActionConfirmProps`_, _`AdminActionConfirmValues`_, _`AdminActionLabels`_, _`AdminActionTarget`_, _`AdminConfirmLevel`_ |
| `admin/admin-action-log` | `ADMIN_ACTION_KINDS`, `AdminActionLog`, `DEFAULT_ADMIN_ACTION_LOG_LABELS`, _`AdminActionKind`_, _`AdminActionLogEntry`_, _`AdminActionLogLabels`_, _`AdminActionLogPaging`_, _`AdminActionLogProps`_, _`AdminGroupNoun`_, _`AdminGroupTarget`_, _`AdminOtherTarget`_ |
| `admin/transfer-ownership-dialog` | `DEFAULT_TRANSFER_OWNERSHIP_LABELS`, `TransferOwnershipDialog`, _`TransferCandidate`_, _`TransferOwnershipDialogProps`_, _`TransferOwnershipLabels`_, _`TransferUnavailable`_, _`TransferValues`_ |
| `admin/invitations-panel` | `DEFAULT_INVITATIONS_LABELS`, `InvitationsPanel`, _`InvitationDraft`_, _`InvitationRow`_, _`InvitationScope`_, _`InvitationSentAnswer`_, _`InvitationsLabels`_, _`InvitationsPanelProps`_, _`InvitationStatus`_ |
| `admin/admin-parts` | _`AdminPerson`_ |
| `admin/admin-area-labels` | `DEFAULT_ADMIN_AREA_LABELS`, `useAdminAreaLabels`, _`AdminAreaLabels`_, _`AdminSharedSection`_, _`AdminTileLabels`_ |
| `admin/admin-sections` | `ADMIN_SECTIONS`, `adminSectionOrder`, `adminSections`, _`AdminKeptSection`_, _`AdminOwnSection`_, _`AdminSectionDefinition`_, _`AdminSectionOrderOptions`_, _`AdminSectionPlace`_, _`AdminSectionsOptions`_ |
| `admin/admin-forbidden` | `AdminForbidden`, _`AdminForbiddenProps`_ |
| `admin/admin-overview` | `AdminOverview`, `adminWaitingCount`, `AttentionTile`, `DEFAULT_ADMIN_ATTENTION_HREFS`, _`AdminAttention`_, _`AdminAttentionTile`_, _`AdminExtraTile`_, _`AdminFeedbackTile`_, _`AdminFeedbackTileKey`_, _`AdminOverviewProps`_, _`AdminOwnTile`_, _`AttentionTileProps`_ |
| `admin/admin-tool-links` | `AdminToolLinks`, _`AdminToolLink`_, _`AdminToolLinksProps`_ |
| `admin/mail-test-card` | `DEFAULT_MAIL_TEST_CARD_LABELS`, `MAIL_TEST_ANCHOR`, `MailTestCard`, `maskMailAddress`, _`MailTestAnswer`_, _`MailTestCardLabels`_, _`MailTestCardProps`_ |
| `admin/plan-change` | `DEFAULT_PLAN_CHANGE_LABELS`, `PlanChangeConfirm`, `planColumn`, `usePlanChangeResult`, `usePlanColumn`, _`PlanChange`_, _`PlanChangeConfirmProps`_, _`PlanChangeLabels`_, _`PlanChangeLine`_, _`PlanChangeOutcome`_, _`PlanChangeResultOptions`_, _`PlanChangeTone`_, _`PlanColumnOptions`_, _`PlanColumnUsage`_ |

### billing

| Module | Exports |
|---|---|
| `billing/billing-labels` | `DEFAULT_BILLING_LABELS`, `SUBSCRIPTION_STATUSES`, `useBillingLabels`, _`BillingLabels`_, _`SubscriptionStatus`_ |
| `billing/plan-price` | `BILLING_INTERVALS`, `billingCurrencyFor`, `formatPlanPrice`, `minorToMajor`, `planPrice`, _`BillingCurrency`_, _`BillingInterval`_, _`PlanIntervalPrices`_, _`PlanPriceAnswer`_, _`PlanPrices`_ |
| `billing/plan-card` | `GrantWarningConfirm`, `PlanCard`, `PlanPicker`, `planRelation`, _`BillingPlan`_, _`GrantWarningConfirmProps`_, _`PlanCardProps`_, _`PlanChoice`_, _`PlanPickerProps`_, _`PlanRelation`_ |
| `billing/subscription-status-chip` | `SUBSCRIPTION_STATUS_TONES`, `SubscriptionStatusChip`, _`SubscriptionStatusChipProps`_ |
| `billing/billing-banner` | `BillingBanner`, _`BillingBannerKind`_, _`BillingBannerProps`_ |
| `billing/plan-limit-notice` | `planLimitMailto`, `PlanLimitNotice`, _`PlanLimitNoticeProps`_ |
| `billing/plan-limit` | `isPlanLimit`, _`PlanLimitRefusal`_ |
| `billing/billing-lock` | `combineWriteLocks`, `useBillingLockReason`, `useBillingWriteLock`, _`BillingLockReasonOptions`_, _`CombinedWriteLock`_, _`WriteLockSource`_ |
| `billing/billing-standing` | `billingDaysLeft`, `billingLockAt`, `isBillingReadOnly`, _`BillingStanding`_ |
| `billing/subscription-actions` | `SubscriptionActions`, _`SubscriptionActionsProps`_ |
| `billing/checkout-return` | `CHECKOUT_RETURN_PARAM`, `CHECKOUT_RETURN_VALUE`, `checkoutReturnUrl`, `isCheckoutReturn`, `withoutCheckoutReturn` |
| `billing/checkout-processing` | `checkoutFingerprint`, `checkoutLanded`, `noteCheckoutStarted`, `useCheckoutProcessing`, _`CheckoutOverview`_, _`CheckoutProcessingOptions`_ |
| `billing/pay-page` | `paddleLocale`, `PAY_PAGE_APPS`, `PAY_PAGE_LANG_PARAM`, `payPageUrl`, _`PaddleEnvironment`_, _`PayPageApp`_ |
| `billing/billing-overview` | `isPermanentGrant`, _`BillingOverview`_, _`BillingPortalAccess`_, _`PaidPrice`_, _`PlanSwitchPreview`_, _`PlanSwitchRequest`_, _`PortalRequest`_, _`PortalTarget`_, _`SubscriptionSource`_ |
| `billing/plan-limit-toast` | `usePlanLimitToast`, _`PlanLimitToastOptions`_ |
| `billing/plan-switch` | `PlanSwitchConfirm`, _`PlanSwitchConfirmProps`_, _`PlanSwitchSide`_ |
| `billing/cancel-subscription` | `CancelSubscriptionConfirm`, _`CancelSubscriptionConfirmProps`_ |
| `billing/provider-page` | `openProviderPage`, _`OpenProviderPageOptions`_, _`ProviderPageWay`_ |
| `billing/cancel-request` | `useCancelRequest`, _`CancelRequest`_, _`CancelRequested`_, _`CancelRequestView`_ |

### notifications

| Module | Exports |
|---|---|
| `notifications/notifications-labels` | `DEFAULT_NOTIFICATIONS_LABELS`, _`NotificationRegionLabels`_, _`NotificationsLabels`_ |
| `notifications/notification-types` | _`DigestCadence`_, _`NotificationChannel`_, _`NotificationSettingsPatch`_, _`NotificationSwitches`_, _`NotificationTypeEntry`_, _`NotificationTypeGroup`_, _`NotificationTypesValue`_, _`PushDeviceItem`_ |
| `notifications/notification-types-setting` | `NotificationTypesSetting`, _`NotificationTypesSettingProps`_ |
| `notifications/quiet-hours-setting` | `QuietHoursSetting`, _`QuietHoursSettingProps`_ |
| `notifications/notification-inbox` | `INBOX_BADGE_INTERVAL`, `NotificationInbox`, _`NotificationInboxAction`_, _`NotificationInboxItem`_, _`NotificationInboxProps`_ |
| `notifications/notification-bell` | `NotificationBell`, _`NotificationBellProps`_ |
| `notifications/device-zone-report` | `deviceTimeZone`, `useDeviceZoneReport`, _`DeviceZoneReportOptions`_ |
| `notifications/use-push-device` | `notifyPushSubscriptionChanged`, `PUSH_SUBSCRIPTION_CHANGED`, `PushDeviceError`, `pushSupported`, `usePushDevice`, _`PushDevice`_, _`PushDeviceErrorCode`_, _`PushPermission`_, _`PushSubscriptionInput`_, _`UsePushDeviceOptions`_ |
| `notifications/push-worker` | `handlePushSubscriptionChange`, `pushSubscriptionInput`, `resubscribeAfterChange`, _`PushReplaceInput`_, _`PushResubscribeOutcome`_, _`PushSubscriptionChangeEventLike`_, _`PushSubscriptionChangeOptions`_, _`PushWorkerScope`_ |
| `notifications/push-device-setting` | `PushDeviceSetting`, _`PushDeviceAction`_, _`PushDeviceSettingProps`_ |
| `notifications/push-devices-setting` | `describeUserAgent`, `PushDevicesSetting`, _`PushDevicesSettingProps`_ |
| `notifications/unsubscribe-panel` | `UnsubscribePanel`, `unsubscribeTokenType`, _`UnsubscribePanelProps`_ |
| `notifications/feedback-notification-types` | `DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS`, `useFeedbackNotificationTypes`, `useFeedbackNotificationTypesLabels`, _`FeedbackNotificationTypeId`_, _`FeedbackNotificationTypesLabels`_ |

### demo

| Module | Exports |
|---|---|
| `demo/demo-labels` | `DEFAULT_DEMO_LABELS`, `useDemoLabels`, _`DemoLabels`_ |
| `demo/demo-session` | `isDemoSession`, _`DemoModel`_, _`DemoSessionUser`_ |
| `demo/demo-countdown` | `DEMO_MINUTES_ONLY`, `DEMO_WARNING_MINUTES`, `demoCountdown`, `useDemoCountdown`, _`DemoCountdown`_, _`DemoCountdownOptions`_, _`DemoExpiry`_ |
| `demo/demo-start` | `DemoStart`, _`DemoStartProps`_ |
| `demo/demo-banner` | `DemoBanner`, _`DemoBannerProps`_ |
| `demo/demo-ended` | `DemoEnded`, _`DemoEndedProps`_ |

### root

| Module | Exports |
|---|---|
| `currencies` | `CURRENCY_COUNTRIES` |

<!-- END GENERATED: exports -->

## Forms / refs

Every field takes a `ref` — a React 19 ref prop, no `forwardRef` (since 0.34) — to the
element that takes focus: the `<input>` of `Input`, `NumberField`, `AmountInput`,
`ChipInput`…, the trigger button of a picker (`DatePicker`, `MonthPicker`, `MultiSelect`,
`CurrencySelect`, `CountrySelect`), and for `ToggleGroup` the group, whose `focus()` lands
on its checked option. So they work directly with react-hook-form:
`<Input {...field} />` (from `Controller`/`register`) attaches RHF's ref, giving
focus-and-scroll-to-error for free. A component that spreads its props onto an element
(`Card`, `EmptyState`, `PageHeader`, …) takes that element's `ref` too. For fields bound
to a react-hook-form form in one line each, see `@eifi1/ui-kit/rhf` below.

### react-hook-form — `@eifi1/ui-kit/rhf` (optional)

The react-hook-form adapter: `Form`, the bound fields (`RhfTextField`, `RhfNumberField`,
`RhfMoneyField`, `RhfDateField`, `RhfSelect`, `RhfCombobox`, `RhfCheckbox`, …) and
`RhfField` for a control of your own, and the only entry that needs `react-hook-form` (an
**optional** peer, `^7.55.0`). The main barrel does not import it, so apps without a form
library install nothing.

```tsx
import { Form, RhfField, RhfNumberField, RhfTextField } from "@eifi1/ui-kit/rhf";

<Form {...form}>
  <RhfTextField name="title" label="Title" required rules={{ required: "Give it a title." }} />
  <RhfNumberField name="amount" label="Amount" unit="EUR" hint="Net of VAT." />
  <RhfField name="street" label="Street" render={({ field, invalid }) => (
    <AddressAutocomplete {...field} invalid={invalid} />
  )} />
</Form>
```

Each bound field is a label, the control, a hint and the form's message wired to each
other: the control's `aria-describedby` names only the hint and message actually rendered
(merged after the control's own), `aria-invalid` and `invalid` come from the field state,
and `field.ref` reaches the focusable element, so a failed submit focuses the first field
in error. The message is the form's own; the kit adds no text. The shadcn scaffold the
adapter started as (`FormField`, `FormItem`, `FormLabel`, `FormControl`,
`FormDescription`, `FormMessage`, `useFormField`) left the public surface in 0.35.

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

**The kit renders only labels; it ships seven catalogues; the app decides the language.**
Every string the kit renders is a key in one typed tree, `UiKitLabels`, with an English
default. The kit's own words come translated into seven languages (see "Shipped
catalogues" below). What it does not do is choose: there is no locale detection and no
`t()` for the app's own words. The app picks the language and hands the kit's words to
every component at once:

```tsx
import { formatLocaleOf, loadUiKitLabels, UiKitProvider } from "@eifi1/ui-kit";

const labels = await loadUiKitLabels("de-CH"); // a shipped catalogue — or your own UiKitLabels, or any part of one

<UiKitProvider labels={labels} locale={formatLocaleOf("de-CH")}>
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

**Reviewing the kit's words in an app.** A missing key is a machine's question; whether
a sentence reads right is a person's. `kitLabelStrings(labels)` turns a label tree into
`key → text` rows for an app's translation review (keksdose's /translations): string
labels under their dot path, function labels called with fixed samples — text arguments
as `{{name}}` placeholders, counts as 1 and 3 — under a key that names the sample
(`combobox.resultCount(3)`, `shareCard.removeConfirm(name)`). The keys never depend on
the locale, so `kitLabelStrings(UI_KIT_LABELS_DE_CH)` and the reference
`kitLabelStrings(DEFAULT_UI_KIT_LABELS)` join one to one. Pass the tree the app gives
`UiKitProvider`, overrides included. The kit's own test keeps every catalogue on the
reference's keys and placeholders.

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

### Shipped catalogues

The kit's own words come translated, one standalone subpath per language, so an app
bundles only the language it imports: `@eifi1/ui-kit/i18n/<code>` exports
`UI_KIT_LABELS_<CODE>` and a factory `uiKitLabels<Code>(numberLocale)` that keeps the words
and changes only how counts and file sizes are written. Codes: `de-CH`, `fr`, `it`, `es`,
`hu`, `zh`, and `en` (factory only — the constant is `DEFAULT_UI_KIT_LABELS`).

Every catalogue addresses the reader formally: German "Sie", French "vous", Italian "Lei",
Spanish "usted", Hungarian "Ön" (Italian and Spanish since 0.19.0). An app that says "du",
"tu" or "tú" overrides the few sentences that address the reader in its own provider; the
kit does not ship a second register.

There is ONE German: `de-CH`, Swiss Standard German, with "ss" for every "ß" —
`uiKitLabelsDeCh("de-DE")` keeps that text and writes German digits.

```tsx
import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";

<UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">…</UiKitProvider>
```

### Language registry

The kit's seven languages, and the three questions every app asked about them on its own
(docs/i18n-harmonization.md, H2): `KIT_LANGUAGES` (code, native and English name, the
`Intl` tag it formats in, the flag-icons country), `resolveLanguage(candidates, offered,
fallback?)`, `formatLocaleOf(code)` and `loadUiKitLabels(code)`. An app offers a subset
and keeps its own i18n library for its own words:

```tsx
import { formatLocaleOf, languageOptions, loadUiKitLabels, resolveLanguage, type KitLanguageCode } from "@eifi1/ui-kit";

const OFFERED: KitLanguageCode[] = ["de-CH", "en", "fr", "it"];
// Precedence (H5): chosen on this device → the account's → the browser's list → de-CH.
const code = resolveLanguage([localStorage.getItem("myapp-lang"), user?.locale, ...navigator.languages], OFFERED);
await i18n.init({ lng: code, supportedLngs: OFFERED, fallbackLng: "de-CH" }); // the app's words
const labels = await loadUiKitLabels(code); // the kit's, fetched on demand, grouped like the language
document.documentElement.lang = formatLocaleOf(code); // "en-GB", not "en"

<UiKitProvider labels={labels} locale={formatLocaleOf(code)}>
  <LanguageMenu options={languageOptions(OFFERED)} current={code} onChange={switchLanguage} />
</UiKitProvider>
```

Every German (`de`, `de-AT`, a stored `de-informal`) resolves to `de-CH`; every Chinese
(`zh-TW`, `zh-Hant`) to `zh`, which is **Simplified** — there is no Traditional catalogue.
Other regional tags take their base language (`fr-CA` → `fr`), and a candidate the app
does not offer passes to the next. Each language formats like its home — `de-CH`, `en-GB`,
`es-ES`, `fr-FR`, `it-IT`, `hu-HU`, `zh-CN` — whatever the reader's region; a tag of a
language the kit does not ship (`sv-SE` for ISO dates) formats as itself. The loader is
asynchronous only: a synchronous one would have to bundle all seven catalogues into every
app. A provider that renders every frame reads what has arrived with
`peekUiKitLabels(code)`, or takes `useUiKitLabels(code)`, which loads on first use and
keeps the previous language's catalogue through a switch until the next one is in.
`withAllPlurals(catalogue, lng)` fills the plural categories CLDR gives a language (French,
Italian and Spanish `many`) from each `key_other`, so a catalogue written with English's
`_one`/`_other` never falls back to another language for a million. `languageOptions` feeds `LanguageMenu` (which draws `fi fi-<country>` — the app loads
the flag CSS) and `LanguageSetting` (a native select: names only).

### The worked example

`showcase/src/i18n/` runs the whole showcase in seven locales — English, German, French,
Italian, Spanish, Hungarian and Chinese — and it is deliberately **not** an i18n library: a
dictionary in context, a hook to read it, and ONE `<UiKitProvider labels={dict.kit}
locale={dict.tag}>` at the root. Each dictionary's `kit` is the shipped catalogue,
imported the way an app imports it (`@eifi1/ui-kit/i18n/de-CH`), and typed as the full
`UiKitLabels`; the Localisation page shows the tree and the per-language completeness
live. The long explanatory prose on each page is *not* translated: it is developer
documentation about the kit's internals. The chrome, the navigation and every component
label are.

### Right-to-left

The kit lays itself out right-to-left since 0.7.0. Components use logical utilities
(`ms-*`, `pe-*`, `end-*`, `text-start`) and `rtl:` where a glyph or a reversed row has to
flip, so they follow `dir="rtl"` on any ancestor with no prop. What CSS cannot do is done
in JavaScript, from the nearest `[dir]`: arrow keys (← is "next" in RTL), the data
table's column resize, a row's swipe panel, tooltips and portalled panels (which take
their anchor's direction), the treemap's and the chart's labels. About forty physical
classes remain, several of them deliberate: a calculator's right-aligned digits, a tooltip
side that JavaScript has already resolved for the direction. Two things to know:

- Since 0.7.0 the kit emits logical classes, so an app's physical override (`pr-4` on a
  field) ADDS a side instead of replacing one: override with the logical name (`pe-4`).
- None of the showcase's seven locales is right-to-left; the kit's RTL tests run in jsdom.
  Check an Arabic or Hebrew screen in a browser before shipping one.

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

Like the rest of the package, its words are labels: a step carries a `label` node (the
app's own words), and the chrome reads `wizard.*` from `UiKitProvider` — so a shipped
catalogue translates it — with a `labels` prop (`WizardLabels`, every key optional) to
override a few, the same split `DataTable` and `TourProvider` use.

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
