import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import { applyPersistedTheme, applyPersistedPalette } from "@eifi1/ui-kit";
import { Showcase } from "./showcase";
import { LOCALE_STORAGE_KEY, LocaleProvider, dictionaryFor } from "./i18n";
import { THEME_KEY, PALETTE_KEY } from "./stores";
import "./app.css";
// LanguageMenu's trigger and CurrencyFlag render `fi fi-xx` spans. Without this
// stylesheet they are empty boxes — and `flag-icons` is a hard dependency of the
// package that nothing inside the package imports, so every consumer has to
// discover this line for itself. The apps subset the file; a showcase can afford it.
import "flag-icons/css/flag-icons.min.css";

// Pre-hydration, at module scope, BEFORE createRoot — the no-flash boot the README
// describes. Resolve the persisted preference, put `.dark` on <html>, write the
// active preset's tokens inline. The first paint is already correct, so the page
// demonstrates the pattern by depending on it rather than by describing it.
const mode = applyPersistedTheme(THEME_KEY);
applyPersistedPalette(PALETTE_KEY, mode);

// The same no-flash boot, for the language. `LocaleProvider` sets `lang`/`dir` in an
// effect, which is one paint too late: between first paint and that effect the page is
// laid out left-to-right, so a reader who chose العربية watches the sidebar jump across
// the screen on every load. Direction is a LAYOUT property — flipping it after paint is
// not the cosmetic flash a wrong theme is.
//
// Guarded, and total: `dictionaryFor` answers English for null, for a stale code and for
// a full tag, and a blocked `localStorage` throws on READ rather than returning null
// (Safari private browsing, a partitioned webview). This runs before `createRoot`, so an
// unguarded throw here is a blank page rather than a lost preference.
try {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? "";
  const dict = dictionaryFor(stored);
  document.documentElement.lang = dict.tag;
  document.documentElement.dir = dict.dir;
} catch {
  // blocked or disabled — the provider's effect still applies the default
}

// HashRouter, not BrowserRouter. A router is not optional here: DataTable, useWizard,
// AppShell and TopBarActionMenu call useSearchParams/NavLink unconditionally and throw
// outside one. The hash costs nothing on a local dev server and is what makes a static
// GitHub Pages deploy serve deep links instead of 404ing.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      {/* Above everything, including AppShell: the provider owns `<html dir>`, and the
          whole frame — sidebar side, menu alignment, pager arrows — is laid out from it. */}
      <LocaleProvider>
        <Showcase />
      </LocaleProvider>
    </HashRouter>
  </React.StrictMode>,
);
