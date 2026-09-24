import { DEFAULT_UI_KIT_LABELS } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * The reference dictionary.
 *
 * English is the language every string in this repository was written in, so this file
 * is a TRANSCRIPTION, not a translation: the page titles and blurbs are copied verbatim
 * out of `routes.tsx`, the group names map to themselves, and every `kit` label repeats
 * the kit's own `DEFAULT_*` value. Switching to English therefore has to be a no-op on
 * screen — if any page moves when you pick English, this file has drifted from the
 * source it was copied from, and that is the bug, not a wording preference.
 *
 * It is also the shape the other six dictionaries are written against. `Dictionary` has
 * no optional fields on purpose (see types.ts): a translator cannot quietly omit a key
 * and ship English through a hole, because `tsc` refuses the file. Only `groups` and
 * `pages` are open records — they are keyed by data that changes (sidebar labels, route
 * slugs), so those two are looked up tolerantly at runtime and fall back to here.
 */
export const en: Dictionary = {
  // The full BCP-47 tag, not the menu code: `en` alone formats dates as 9/22/2026 and
  // the flag beside this entry is `gb`. Every `Intl` formatter on the page reads this,
  // and so does <html lang>. The menu addresses the locale by its primary subtag ("en").
  tag: "en-GB",
  name: "English",
  country: "gb",
  dir: "ltr",

  chrome: {
    // The package name is the product name here; it is not translated in any language.
    brand: "@eifi1/ui-kit",
    onThisPage: "On this page",
    previous: "Previous",
    next: "Next",
    notFoundTitle: "No such page",
    notFoundHint: "That path does not match any component in the kit.",
    // Names the first page in the sidebar, which is the Getting started overview.
    backToStart: "Back to the overview",
    toggleTheme: "Toggle theme",
    palette: "Palette",
    language: "Language",
    // The whole footer line. Kept as one sentence rather than assembled from fragments:
    // a sentence split across three props is a sentence no translator can reorder, and
    // word order is exactly what moves between these seven languages.
    renderedFrom: "@eifi1/ui-kit showcase — rendered from src/, not dist/.",
    // Accessible names for the two <nav> landmarks on a page. Never rendered as text,
    // always read aloud, which is why they are translated at all.
    breadcrumb: "Breadcrumb",
    pagination: "Pagination",
    sidebarStyle: "Sidebar style",
    sidebarFlyout: "Pages in a flyout",
    sidebarInline: "Pages listed inline",
    contentsPosition: "Contents position",
    positionStart: "Left",
    positionEnd: "Right",
  },

  // Keyed by the English label in routes.tsx — the key is the identity of the group, the
  // value is what the sidebar shows. So English maps each label to itself.
  groups: {
    "Getting started": "Getting started",
    Foundations: "Foundations",
    Inputs: "Inputs",
    "Data display": "Data display",
    Overlays: "Overlays",
    "App chrome": "App chrome",
    API: "API",
  },

  // Copied verbatim from showcase/src/routes.tsx, keyed by slug. A group's overview
  // page is keyed by the GROUP's slug and carries the group's blurb.
  pages: {
    overview: {
      title: "Overview",
      blurb:
        "What @eifi1/ui-kit is, the six layers it is built in, and how to read a page of this showcase.",
    },
    foundations: {
      title: "Foundations",
      blurb:
        "The values every component paints with, and the language every component speaks. Nothing below this layer hardcodes a colour or a word.",
    },
    tokens: {
      title: "Tokens",
      blurb:
        "Every value in the active TokenSet, live. Flip the theme or the palette in the top bar and watch this page move — anything that does not move is hardcoded.",
    },
    palette: {
      title: "Palette generator",
      blurb:
        "One brand colour in, both themes out — with every contrast ratio measured rather than asserted, and the compromises named.",
    },
    localisation: {
      title: "Localisation",
      blurb:
        "Every string the kit renders, as one typed tree — and the provider that hands a translation to every component at once.",
    },
    inputs: {
      title: "Inputs",
      blurb:
        "Every way to capture a value. They share one anatomy — a floating label, the value, a helper line below — so a form reads as one thing.",
    },
    fields: {
      title: "Text fields",
      blurb: "Inputs, and the class constants an app composes its own fields from.",
    },
    choices: {
      title: "Choices",
      blurb: "On or off, one of a few, a value on a scale — and picking a colour, an icon or a card.",
    },
    numbers: {
      title: "Numbers & money",
      blurb:
        "The numeric stack: a calculator-backed number field, a field whose value is a number, the money field and its tones, and the currency picker.",
    },
    dropdowns: {
      title: "Dropdowns & pickers",
      blurb:
        "Comboboxes, multi-select, grouped and sheet pickers, and the dropdown primitives underneath them.",
    },
    files: {
      title: "Files",
      blurb:
        "Picking files: a button that opens the picker or the camera, the drop area, and refusals reported where the user is looking, never as a toast.",
    },
    dates: {
      title: "Dates & time",
      blurb:
        "Picking a point in time at every grain: a day, a range of days, a month, a time of day.",
    },
    "field-sync": {
      title: "Field sync state",
      blurb:
        "Sync state for a database-backed field, saved on blur: the frame's colour and an icon at the field's end say edited, saving, saved or failed — hover the error mark for the reason.",
    },
    "signature-password": {
      title: "Signature, password & confirmation",
      blurb:
        "Capturing a signature — and showing a saved one — telling a user how strong their password is, and confirming a destructive action.",
    },
    "data-display": {
      title: "Data display",
      blurb:
        "Showing values rather than taking them: the building blocks, the table, and the charts.",
    },
    primitives: {
      title: "Primitives",
      blurb: "Buttons, cards, tabs, banners, avatars — the pieces everything else is built from.",
    },
    "data-table": {
      title: "Data table",
      blurb:
        "The largest component in the kit: sorting, filtering, selection, pagination, URL sync and its pure helpers.",
    },
    charts: {
      title: "Charts",
      blurb:
        "The themed chart shell over Recharts, its colour system, the tile chart (treemap) and the zoomable series chart the apps share.",
    },
    stats: {
      title: "Stats & sparklines",
      blurb:
        "The KPI tile every dashboard repeats — value, change, trend — and the tiny line that fits in a table cell.",
    },
    layout: {
      title: "Disclosure & dialog frame",
      blurb: "A section that folds away, and the header-body-actions frame every dialog repeats.",
    },
    overlays: {
      title: "Overlays",
      blurb: "Everything that floats above the page, and the one timing they all share on the way out.",
    },
    dialogs: {
      title: "Dialogs & popovers",
      blurb:
        "Modal, full-bleed dialog, popover, hover menu and tooltip — plus the shared close-transition timing.",
    },
    "tour-search-files": {
      title: "Tour, palette & files",
      blurb: "The guided tour, the command palette, the dropzone and the swipeable row.",
    },
    "app-chrome": {
      title: "App chrome",
      blurb:
        "The frame an app lives in and the flows every app repeats: settings, multi-step forms, feedback.",
    },
    shell: {
      title: "Shell",
      blurb: "The app frame you are looking at, taken apart.",
    },
    settings: {
      title: "Settings fields",
      blurb: "The account-settings rows: theme, language, profile, password and two-factor.",
    },
    wizard: {
      title: "Wizard",
      blurb: "The multi-step engine, its chrome and its review step.",
    },
    "feedback-compose": {
      title: "Feedback — compose",
      blurb: "The report form and its attachment field.",
    },
    "feedback-inbox": {
      title: "Feedback — inbox",
      blurb:
        "The shared status vocabulary, the transition policy, and the parts an inbox is built from.",
    },
    "hooks-lib": {
      title: "Hooks & lib",
      blurb: "The non-visual exports: hooks read live, and the pure helpers as input → output.",
    },
    api: {
      title: "API",
      blurb:
        "What is left when you take the pixels away: the hooks components are built from, and the pure helpers and constants an app calls directly.",
    },
    helpers: {
      title: "Helpers & constants",
      blurb:
        "The functions and data behind the inputs, shown as input → output: date arithmetic at @eifi1/ui-kit/dates, the calculator's evaluator, the currency table, and the class constants a custom field is composed from.",
    },
  },

  /**
   * The kit's own English, verbatim. English is the language the defaults are written
   * in, so the reference dictionary IS the defaults — passing them back through the
   * provider changes nothing on screen, which is the point: if picking English moves
   * anything, something has drifted. The other six dictionaries spell out every key.
   */
  kit: DEFAULT_UI_KIT_LABELS,
};
