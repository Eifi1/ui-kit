# Brief: adopt the `@eifi1/ui-kit` design system

Hand this to the consuming repo's agent (e.g. `property-management`). The package
is on npm and its full contract is in its own README — canonically at
<https://github.com/Eifi1/ui-kit#readme>, and on disk at
`node_modules/@eifi1/ui-kit/README.md` after `npm install`. **No sibling checkout is
needed for any step below**, which is the whole point of the move off the `file:`
submodule.

**Goal.** Consume the shared design system (`@eifi1/ui-kit`) so future design-system
design changes flow in automatically, and replace this app's own generic UI
primitives with the shared ones. Keep this app's domain-specific pieces local.

## Steps

1. **Add the dependency**:
   ```bash
   npm install @eifi1/ui-kit
   ```
   Then install. Ensure these peers exist in your app: `react`, `react-dom`
   (required); `recharts` (only for the chart kit), `sonner` (only for
   `FileDropzone`), `react-router` (only for `DataTable` URL-sync / `AppShell`).

2. **Vite — dedupe.** Your app and the package must share one copy of these;
   two instances break hooks and context:
   ```ts
   resolve: { dedupe: ["react", "react-dom", "zustand", "recharts", "sonner", "react-router"] }
   ```

3. **Tailwind v4 — tokens + source scan** (in your main CSS, after
   `@import "tailwindcss";`):
   ```css
   @import "@eifi1/ui-kit/tokens.css";
   @source "../../node_modules/@eifi1/ui-kit/dist";
   ```
   `@source` is required — Tailwind ignores `node_modules`, so without it the class
   names `@eifi1/ui-kit`'s components use won't be generated and every component
   renders unstyled with no error anywhere. **The path is relative to the CSS file
   it is written in**, and a path that points at nothing fails silently: two of the
   three existing consumers are in exactly that state, still pointing at
   `../../packages/ui/src` from before the npm migration. Verify with
   `npm run build && grep -c 'pointer-events-auto' dist/assets/*.css` — `0` means
   the scan missed.

4. **Theme + palette stores** — the factories let you use your own persistence
   keys:
   ```ts
   import { createThemeStore, createPaletteStore } from "@eifi1/ui-kit";
   export const { useTheme, useApplyTheme } = createThemeStore("<app>-theme");
   export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
     createPaletteStore("<app>-palette", useTheme);
   ```
   Call `useApplyTheme()` + `useApplyPalette()` once at the root. For no flash on
   load, apply the persisted `.dark` class + token set before hydration:
   ```ts
   // main.tsx, at module scope, before createRoot
   const mode = applyPersistedTheme("<app>-theme");
   applyPersistedPalette("<app>-palette", mode);
   ```

5. **Replace local primitives.** Swap your own `Button`/`Input`/`Select`/`Card`/
   `Modal`/dropdowns/etc. for the `@eifi1/ui-kit` exports and delete the local copies.
   Keep app-specific things local (your data formatting, domain selects, auth).
   Components with user-facing text take **label props with English defaults** —
   pass your translated strings, e.g.
   `<MultiSelect allLabel={t("all")} searchLabel={t("search")} … />`,
   `<DataTable labels={{ columns: t("table.columns"), … }} … />`.

6. **Shell.** Build your app frame by composing `TopBar` + `AppShell` +
   `ThemeToggle`/`PaletteMenu`/`LanguageMenu` with your own nav items and app-owned
   menus (account, etc.). See the example at the end of the README.

## Reference

| | |
|---|---|
| <https://github.com/Eifi1/ui-kit#readme> | Full wiring detail, the colour and i18n contracts, and the complete generated export inventory. Also at `node_modules/@eifi1/ui-kit/README.md` once installed. |
| <https://eifi1.github.io/ui-kit/> | Every component rendered on one page, with the theme, palette and language switchers live. Equivalently `npm run dev:showcase` from a checkout. |
| <https://github.com/Eifi1/ui-kit/blob/main/CHANGELOG.md> | What changed, and the semver contract the package keeps below 1.0. |
| <https://github.com/Eifi1/ui-kit/issues> | Anything this brief does not cover, and anything that turns out to be wrong in it. |

Only the README ships inside the npm tarball, so the rest are URLs rather than paths.

## Definition of done

App builds and runs consuming `@eifi1/ui-kit`; the light/dark + palette switch works; this
app's duplicated generic primitives are deleted (domain-specific ones stay).
