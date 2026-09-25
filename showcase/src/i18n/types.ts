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
  /** Every string the kit renders — handed to `<UiKitProvider>` whole. */
  kit: UiKitLabels;
}
