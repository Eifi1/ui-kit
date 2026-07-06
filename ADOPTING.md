# Brief: adopt the `@hb/ui` design system

Hand this to the consuming repo's agent (e.g. `property-management`). It assumes
`keksdose` is checked out as a sibling, so this package is readable at
`../keksdose/packages/ui` and its full contract is in
`../keksdose/packages/ui/README.md`.

**Goal.** Consume the shared design system (`@hb/ui`) so future design-system
design changes flow in automatically, and replace this app's own generic UI
primitives with the shared ones. Keep this app's domain-specific pieces local.

## Steps

1. **Add the dependency** (path is relative to the package.json you add it to;
   `../../keksdose/...` is correct from an app at `<repo>/frontend`):
   ```jsonc
   "dependencies": { "@hb/ui": "file:../../keksdose/packages/ui" }
   ```
   Then install. Ensure these peers exist in your app: `react`, `react-dom`
   (required); `recharts` (only for the chart kit), `sonner` (only for
   `FileDropzone`), `react-router` (only for `DataTable` URL-sync / `AppShell`).

2. **Vite — dedupe.** `@hb/ui` ships raw source and is linked, so its imports must
   resolve to your app's single copy of these; two instances break hooks/context:
   ```ts
   resolve: { dedupe: ["react", "react-dom", "zustand", "recharts", "sonner", "react-router"] }
   ```

3. **Tailwind v4 — tokens + source scan** (in your main CSS, after
   `@import "tailwindcss";`):
   ```css
   @import "@hb/ui/tokens.css";
   @source "../../node_modules/@hb/ui/src";
   ```
   `@source` is required — Tailwind ignores `node_modules`, so without it the class
   names `@hb/ui`'s components use won't be generated.

4. **Theme + palette stores** — the factories let you use your own persistence
   keys:
   ```ts
   import { createThemeStore, createPaletteStore } from "@hb/ui";
   export const { useTheme, useApplyTheme } = createThemeStore("<app>-theme");
   export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
     createPaletteStore("<app>-palette", useTheme);
   ```
   Call `useApplyTheme()` + `useApplyPalette()` once at the root. For no flash on
   load, apply the persisted `.dark` class + token set before hydration — copy the
   pattern in `../keksdose/frontend/src/main.tsx` (uses `applyTokenSet` /
   `presetById` / `DEFAULT_PRESET`).

5. **Replace local primitives.** Swap your own `Button`/`Input`/`Select`/`Card`/
   `Modal`/dropdowns/etc. for the `@hb/ui` exports and delete the local copies.
   Keep app-specific things local (your data formatting, domain selects, auth).
   Components with user-facing text take **label props with English defaults** —
   pass your translated strings, e.g.
   `<MultiSelect allLabel={t("all")} searchLabel={t("search")} … />`,
   `<DataTable labels={{ columns: t("table.columns"), … }} … />`.

6. **Shell.** Build your app frame by composing `TopBar` + `AppShell` +
   `ThemeToggle`/`PaletteMenu`/`LanguageMenu` with your own nav items and app-owned
   menus (account, etc.). See the example at the end of the README.

## Reference

`../keksdose/packages/ui/README.md` — full wiring detail + the complete list
of exported components/theme/shell.

## Definition of done

App builds and runs consuming `@hb/ui`; the light/dark + palette switch works; this
app's duplicated generic primitives are deleted (domain-specific ones stay).
