/**
 * The showcase's own translation layer.
 *
 * It exists to prove the kit's central i18n claim. `@eifi1/ui-kit` ships no catalogue and
 * resolves no strings: every string it renders is a key of `UiKitLabels` with an English
 * default, and an app hands its translation to every component at once through
 * `<UiKitProvider labels locale>`.
 *
 * So this is a demonstration, not a product: the showcase translates its own chrome AND
 * supplies the kit's complete label tree in every language, which is exactly what a
 * consuming app has to do. `kit` is typed as the FULL `UiKitLabels`, not a partial, so a
 * dictionary with one kit key missing does not compile.
 *
 * NOT translated: the long explanatory prose on each page. That is developer
 * documentation about the kit's internals — several thousand lines of it — and
 * translating it would be a large amount of work that teaches nothing about the i18n
 * contract. The chrome, the navigation and every component label ARE translated, because
 * those are the parts a real app would have to translate.
 */

import type { UiKitLabels } from "@eifi1/ui-kit";

/**
 * Every page slug in routes.tsx — overview pages (a group's own slug) included. Spelled
 * out because the registry types its slugs as `string`; the dictionary test fails when
 * this list and `PAGES` disagree, so a page added there shows up here as a test failure
 * and then, through `needs`, as a compile error in all seven dictionaries.
 */
export type PageSlug =
  | "overview"
  | "foundations"
  | "tokens"
  | "palette"
  | "localisation"
  | "inputs"
  | "fields"
  | "forms"
  | "choices"
  | "numbers"
  | "calendars"
  | "month-view"
  | "month-time"
  | "files"
  | "pickers"
  | "comboboxes"
  | "entity-pickers"
  | "dropdown-parts"
  | "measured-grid"
  | "field-sync"
  | "signature-password"
  | "data-display"
  | "buttons"
  | "chips-toggles"
  | "feedback"
  | "description-list"
  | "tree-view"
  | "lists-menus"
  | "data-table"
  | "data-table-server"
  | "data-table-parts"
  | "layout"
  | "charts"
  | "chart-shell"
  | "tile-chart"
  | "series-chart"
  | "series-chart-marks"
  | "stats"
  | "calendar-heatmap"
  | "overlays"
  | "dialogs"
  | "confirm-floating"
  | "floating-actions"
  | "popovers"
  | "tour"
  | "command-palette"
  | "swipeable-row"
  | "app-chrome"
  | "shell"
  | "page-structure"
  | "settings"
  | "wizard"
  | "feedback-compose"
  | "feedback-inbox"
  | "api"
  | "hooks-lib"
  | "clipboard-timing"
  | "helpers";

export interface Dictionary {
  /** BCP-47 tag, used for `lang` and for every `Intl` formatter on the page. */
  tag: string;
  /** Endonym — the language's name in itself, which is what a language menu must show. */
  name: string;
  /** ISO-3166 alpha-2 for the flag. Deliberately NOT the language code (en → gb). */
  country: string;
  /** Writing direction. All seven current locales are left-to-right; the field stays
   *  because the chrome is built to flip, and a right-to-left locale is one entry away. */
  dir: "ltr" | "rtl";
  chrome: {
    brand: string;
    onThisPage: string;
    previous: string;
    next: string;
    notFoundTitle: string;
    notFoundHint: string;
    backToStart: string;
    toggleTheme: string;
    palette: string;
    language: string;
    renderedFrom: string;
    breadcrumb: string;
    pagination: string;
    /** The top-bar control that switches how the sidebar shows a group's pages. */
    sidebarStyle: string;
    sidebarFlyout: string;
    sidebarInline: string;
    /** The top-bar menu that puts the page's contents rail on the left or right. */
    contentsPosition: string;
    positionStart: string;
    positionEnd: string;
    /** The top-bar control that shows the page at three screen sizes side by side. */
    devicePreview: string;
    previewHint: string;
    phone: string;
    tablet: string;
    desktop: string;
    /** The top-bar search's placeholder: what can be found, in a few words. */
    searchPlaceholder: string;
    /** The search's result groups. `searchNeeds` is a question — the group lists plain
     *  descriptions of a task ("ask before deleting") and the page that does it. */
    searchComponents: string;
    searchExamples: string;
    searchNeeds: string;
    searchPages: string;
  };
  /** Sidebar group names, keyed by the English label in routes.tsx. */
  groups: Record<string, string>;
  /** The phone bottom bar's shorter group names, keyed like `groups` — one entry for
   *  each group that has a `shortLabel` in routes.tsx ("App chrome" → "Chrome"). */
  groupShort: Record<string, string>;
  /**
   * Page titles and blurbs, keyed by slug. A missing key falls back to English.
   *
   * `short` is the title on the phone's row of page pills, which wraps and so grows a
   * line for every long title in the group. Every page has one; a group's overview page
   * (keyed by the group's slug) has none, because it is never a pill — the bottom bar
   * links to it. Optional in the type for that reason only; the dictionary test checks
   * that no page is missing it.
   */
  pages: Record<string, { title: string; short?: string; blurb: string }>;
  /**
   * What a reader might NEED, in their own words, per page — "ask before deleting",
   * "pick a date range" — for the top-bar search, which otherwise only finds a page by
   * the names of its components. Keyed by {@link PageSlug}, so a dictionary that leaves
   * a page out does not compile; the dictionary test ties the union to routes.tsx.
   *
   * Written as a reader would type them: short, lower case, the task rather than the
   * component ("show a loading placeholder", not "Skeleton"). Each language phrases them
   * natively — a German reader types "Datumsbereich", not a word-for-word "Datum Bereich".
   */
  needs: Record<PageSlug, readonly string[]>;
  /** Every string the kit renders — handed to `<UiKitProvider>` whole. */
  kit: UiKitLabels;
}
