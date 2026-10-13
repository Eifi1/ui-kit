# Brief: adopt the `@eifi1/ui-kit` design system

Hand this to the new consuming repo's agent. The package is on npm and its full
contract is in its own README — canonically at
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
   Then install the peers. **Required:** `react` and `react-dom` (`>=19.2`),
   `react-router` (`>=7`; imported unconditionally, so a Router must be mounted),
   `recharts` (`>=3.8`; the main barrel re-exports the chart kit) and `lucide-react`.
   **Optional:** `sonner` (the kit's `toast` / `<Toaster>`), `react-hook-form` (only for
   `@eifi1/ui-kit/rhf`) and `modern-screenshot` (the feedback dialog's screenshot
   capture). `flag-icons` is a stylesheet your app imports if it renders flags. The
   README's "What you install alongside it" table has the ranges and the reasons.
   ```bash
   npm install react-router recharts lucide-react sonner
   ```

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
   it is written in**, and a path that points at nothing fails silently — keksdose
   and Kurvenschmiede (`../../node_modules/@eifi1/ui-kit/dist` from `src/app.css`)
   and kastlan (`../node_modules/@eifi1/ui-kit/src`) each count from their own file.
   Verify with `npm run build && grep -c 'pointer-events-auto' dist/assets/*.css` —
   `0` means the scan missed.

4. **Appearance stores: theme, palette, text size, contrast** — the factories let you
   use your own persistence keys:
   ```ts
   import { createContrastStore, createPaletteStore, createTextSizeStore, createThemeStore } from "@eifi1/ui-kit";
   export const { useTheme, useApplyTheme } = createThemeStore("<app>-theme");
   export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
     createPaletteStore("<app>-palette", useTheme);
   export const { useTextSizeStore, useApplyTextSize } = createTextSizeStore("<app>-text-size");
   export const { useContrastStore, useApplyContrast } = createContrastStore("<app>-contrast");
   ```
   Call `useApplyTheme()`, `useApplyPalette()`, `useApplyTextSize({ account })` and
   `useApplyContrast({ account })` once at the root (`account`: the signed-in user's
   saved `text_size` / `contrast`, which applies while this device has chosen nothing).
   `TextSizeSetting` and `ContrastSetting` are the settings controls. For no flash on
   load, apply all four before hydration:
   ```ts
   // main.tsx, at module scope, before createRoot
   const mode = applyPersistedTheme("<app>-theme");
   applyPersistedPalette("<app>-palette", mode);
   applyPersistedTextSize("<app>-text-size", { account: () => /* the persisted user's text_size */ null });
   applyPersistedContrast("<app>-contrast", { account: () => /* the persisted user's contrast */ null });
   ```
   A boot splash in `index.html` paints before any module runs: give it
   `TEXT_SIZE_INLINE_SCRIPT` and the two root rules (README → Styling → "Before the
   first paint"), and add the script's hash if you run a hash-based CSP.

5. **Labels: one provider, the shipped catalogues.** Every word the kit renders is a
   label with an English default, and the kit ships its own words in seven languages.
   Your app decides the language and hands the kit's catalogue to one provider at the
   root — no per-component label props:
   ```tsx
   import { formatLocaleOf, loadUiKitLabels, resolveLanguage, UiKitProvider } from "@eifi1/ui-kit";

   const code = resolveLanguage([storedChoice, user?.locale, ...navigator.languages], OFFERED);
   const labels = await loadUiKitLabels(code); // before the first render, beside your own i18n init

   <UiKitProvider labels={labels} locale={formatLocaleOf(code)}>
     <App />
   </UiKitProvider>
   ```
   `useUiKitLabels(code)` does the same from inside a render (it keeps the previous
   language through a switch). To change a few words, spread over the catalogue rather
   than copying it; a component's own `labels` prop still wins for one call site.
   README → i18n has the language registry and the precedence.

6. **Replace local primitives.** Swap your own `Button`/`Input`/`Select`/`Card`/
   `Modal`/dropdowns/etc. for the `@eifi1/ui-kit` exports and delete the local copies.
   Keep app-specific things local (your data formatting, domain selects, auth).

7. **Styling.** Paint with the role utilities — `text-muted`, `bg-surface`,
   `border-subtle`, `bg-danger-soft` — never `text-[var(--text-muted)]` and never a
   palette colour like `text-slate-500`. Use `large:` / `xlarge:` / `contrast:` where
   a layout must change at a larger text size or under More contrast,
   `truncate-until-large` (prose) or `truncate-until-large-words` (figures) instead of
   `truncate`, and named breakpoints (they scale with the text size; `min-[…]` does
   not). README → Styling lists every utility and the token it reads.

8. **Shell.** Build your app frame by composing `TopBar` + `AppShell` +
   `ThemeToggle`/`PaletteMenu`/`LanguageMenu` with your own nav items and app-owned
   menus (account, etc.). See the example at the end of the README.

9. **Tests.**
   - **The CSS-variable guard.** A `var(--x)` that nothing declares paints nothing,
     silently. One test file, such as `src/app/css-variables.test.ts`:
     ```ts
     import { expect, it } from "vitest";
     import { undeclaredCssVariables } from "@eifi1/ui-kit/testing";

     const sources = import.meta.glob<string>(
       ["/src/**/*.{ts,tsx,css}", "!/src/**/*.test.{ts,tsx}", "!/src/**/__tests__/**"],
       { query: "?raw", import: "default", eager: true },
     );

     it("reads no CSS variable that nothing declares", () => {
       expect(undeclaredCssVariables(sources)).toEqual([]);
     });
     ```
     Opt your stylesheet out of Vitest's CSS stub (`test: { css: { include:
     [/src\/app\.css/] } }`): the guard throws on an empty `.css` entry rather than
     pass over nothing. Options: `runtime` (a library's own variables),
     `checkFallbacks`, `refusePalette`. `--app-nav-h` exists only while `AppShell` is
     mounted: read it as `var(--app-nav-h,0px)`.
   - **Confirm dialogs.** The kit's confirm dialogs (`DangerConfirm`,
     `AdminActionConfirm`, `DeleteAccountSetting`'s confirmation) submit through the
     confirm button's `form` attribute, because the button sits in the dialog's footer
     outside the `<form>`. jsdom doesn't follow that attribute on a click, so in a test
     submit the form itself:
     `fireEvent.submit(screen.getByRole("dialog").querySelector("form")!)`. A real
     browser needs nothing (Kurvenschmiede's 0.30 adoption).

## Reference

| | |
|---|---|
| <https://github.com/Eifi1/ui-kit#readme> | Full wiring detail, the styling utilities, the colour and i18n contracts, and the complete generated export inventory. Also at `node_modules/@eifi1/ui-kit/README.md` once installed. |
| <https://eifi1.github.io/ui-kit/> | The kit rendered page by page, one component family per page, with the theme, palette, text-size, contrast and language switchers live. Equivalently `npm run dev:showcase` from a checkout. |
| <https://github.com/Eifi1/ui-kit/blob/main/docs/README.md> | The contracts the three apps build to (auth, settings, billing, colour roles, text size …), and each release's adoption notes. |
| <https://github.com/Eifi1/ui-kit/blob/main/CHANGELOG.md> | What changed, and the semver contract the package keeps below 1.0. |
| <https://github.com/Eifi1/ui-kit/issues> | Anything this brief does not cover, and anything that turns out to be wrong in it. |

Only the README ships inside the npm tarball, so the rest are URLs rather than paths.

## Definition of done

App builds and runs consuming `@eifi1/ui-kit`; the light/dark, palette, text-size and
contrast switches work with no flash on reload; the kit's words follow the app's language
through one `UiKitProvider`; the CSS-variable guard passes; this app's duplicated generic
primitives are deleted (domain-specific ones stay).
