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
    devicePreview: "Screen-size preview",
    previewHint:
      "The page at the three most common screen sizes, live: scroll and click inside each frame. Theme, palette and language follow the top bar.",
    phone: "Phone",
    tablet: "Tablet",
    desktop: "Desktop",
  },

  // Keyed by the English label in routes.tsx — the key is the identity of the group, the
  // value is what the sidebar shows. So English maps each label to itself.
  groups: {
    "Getting started": "Getting started",
    Foundations: "Foundations",
    Inputs: "Inputs",
    "Pickers & entry": "Pickers & entry",
    "Data display": "Data display",
    Overlays: "Overlays",
    "App chrome": "App chrome",
    API: "API",
  },

  // The bottom bar's short names, copied from each group's `shortLabel` in routes.tsx.
  groupShort: {
    "Getting started": "Start",
    Foundations: "Tokens",
    "Pickers & entry": "Pickers",
    "Data display": "Display",
    "App chrome": "Chrome",
  },

  // Copied verbatim from showcase/src/routes.tsx, keyed by slug. A group's overview
  // page is keyed by the GROUP's slug and carries the group's blurb; every other page
  // also carries its `short` title for the phone's row of page pills.
  pages: {
    overview: {
      title: "Overview",
      short: "Overview",
      blurb:
        "What @eifi1/ui-kit is, the seven layers it is built in, and how to read a page of this showcase.",
    },
    foundations: {
      title: "Foundations",
      blurb:
        "The values every component paints with, and the language every component speaks. Nothing below this layer hardcodes a colour or a word.",
    },
    tokens: {
      title: "Tokens",
      short: "Tokens",
      blurb:
        "Every value in the active TokenSet, live. Flip the theme or the palette in the top bar and watch this page move — anything that does not move is hardcoded.",
    },
    palette: {
      title: "Palette generator",
      short: "Palette",
      blurb:
        "One brand colour in, both themes out — with every contrast ratio measured rather than asserted, and the compromises named.",
    },
    localisation: {
      title: "Localisation",
      short: "Localisation",
      blurb:
        "Every string the kit renders, as one typed tree — and the provider that hands a translation to every component at once.",
    },
    inputs: {
      title: "Inputs",
      blurb:
        "Every way to type or set a value: text, choices, numbers, dates, files, and the form adapter around them. They share one anatomy — a floating label, the value, a helper line below — so a form reads as one thing.",
    },
    fields: {
      title: "Text fields",
      short: "Text",
      blurb: "Inputs, and the class constants an app composes its own fields from.",
    },
    forms: {
      title: "Forms (react-hook-form)",
      short: "Forms",
      blurb:
        "The react-hook-form adapter at @eifi1/ui-kit/rhf: a field's label, control, description and message wired to each other and to the form's state, with the messages only where the user can see them.",
    },
    choices: {
      title: "Choices",
      short: "Choices",
      blurb: "On or off, one of a few, a value on a scale — and picking a colour, an icon or a card.",
    },
    numbers: {
      title: "Numbers & money",
      short: "Numbers",
      blurb:
        "The numeric stack: a calculator-backed number field, a field whose value is a number, the money field and its tones, and the currency picker.",
    },
    calendars: {
      title: "Calendars & date pickers",
      short: "Calendars",
      blurb:
        "Picking a day or a range of days: the calendar itself, the date and range pickers built on it, their presets and bounds, and the first day of the week.",
    },
    "month-time": {
      title: "Month & time",
      short: "Month & time",
      blurb:
        "The coarser and the finer grain: a month picked on its own, in a field or between step buttons, and a time of day.",
    },
    files: {
      title: "Files",
      short: "Files",
      blurb:
        "Picking files: a button that opens the picker or the camera, the drop area, and refusals reported where the user is looking, never as a toast.",
    },
    pickers: {
      title: "Pickers & entry",
      blurb:
        "Choosing from a list rather than typing, and the heavier kinds of entry: a table of measurements, a field saved as you leave it, a signature, a password.",
    },
    comboboxes: {
      title: "Comboboxes",
      short: "Comboboxes",
      blurb:
        "Free text with suggestions: the combobox whose value is whatever was typed, and the autocomplete that searches as you type.",
    },
    "entity-pickers": {
      title: "Entity pickers",
      short: "Entities",
      blurb:
        "Picking a record by its id: inline and button-shaped pickers, static and loaded options, several at once, and the invalid, error and disabled states they share.",
    },
    "dropdown-parts": {
      title: "Dropdown parts",
      short: "Parts",
      blurb:
        "Multi-select, the grouped picker and the phone sheet — and the hooks and panel every dropdown in the kit is built from.",
    },
    "measured-grid": {
      title: "Table entry",
      short: "Table entry",
      blurb:
        "Typing a table of measurements: a keyboard grid of cells, a block pasted from a spreadsheet, and the same table as text — thousands of rows, only the visible ones mounted.",
    },
    "field-sync": {
      title: "Field sync state",
      short: "Sync state",
      blurb:
        "Sync state for a database-backed field, saved on blur: the frame's colour and an icon at the field's end say edited, saving, saved or failed — hover the error mark for the reason.",
    },
    "signature-password": {
      title: "Signature, password & confirmation",
      short: "Signature",
      blurb:
        "Capturing a signature — and showing a saved one — telling a user how strong their password is, and confirming a destructive action.",
    },
    "data-display": {
      title: "Data display",
      blurb:
        "Showing values rather than taking them: the building blocks, the table, and the charts.",
    },
    buttons: {
      title: "Buttons & surfaces",
      short: "Buttons",
      blurb:
        "Buttons, icon buttons, cards, spinners, empty states, avatars and banners — the pieces everything else is built from.",
    },
    "chips-toggles": {
      title: "Chips & toggles",
      short: "Chips",
      blurb:
        "Chips and the chip field, the toggle group, and tabs — the small controls that pick one of a few or hold a short list.",
    },
    "data-table": {
      title: "Data table",
      short: "Table",
      blurb:
        "The largest component in the kit, whole: sorting, filtering, selection and expansion, controlled from outside, short and unpaginated, filling a pane, and right-to-left.",
    },
    "data-table-server": {
      title: "Data table: server, URL & phone",
      short: "Server & phone",
      blurb:
        "The table when it does not own everything: the view kept in the address, the rows paged by a server, and the phone layout of cards, groups and swipe actions.",
    },
    "data-table-parts": {
      title: "Data table: parts & helpers",
      short: "Table parts",
      blurb:
        "What the table is assembled from, usable on its own: the pager, the filter popover, the label tree, and the pure sort, filter and URL helpers.",
    },
    "chart-shell": {
      title: "Chart shell",
      short: "Charts",
      blurb:
        "The themed chart shell over Recharts — container, tooltip and legend — and the colour system every chart in the kit draws from.",
    },
    "tile-chart": {
      title: "Tile chart",
      short: "Tiles",
      blurb:
        "The treemap: a share of a whole as tiles, with labels that fit, tiles you can click — and drilling down, through a bar chart as well as through tiles.",
    },
    "series-chart": {
      title: "Series chart",
      short: "Series",
      blurb:
        "The zoomable series chart the apps share: an axis per unit, a legend of switches, one zoom for a stack of charts, and the helpers underneath.",
    },
    stats: {
      title: "Stats & sparklines",
      short: "Stats",
      blurb:
        "The KPI tile every dashboard repeats — value, change, trend — and the tiny line that fits in a table cell.",
    },
    layout: {
      title: "Disclosure & dialog frame",
      short: "Disclosure",
      blurb: "A section that folds away, and the header-body-actions frame every dialog repeats.",
    },
    overlays: {
      title: "Overlays",
      blurb: "Everything that floats above the page, and the one timing they all share on the way out.",
    },
    dialogs: {
      title: "Dialogs",
      short: "Dialogs",
      blurb:
        "Modal and full-bleed dialog, the backdrop press that closes them, and the close-transition timing every overlay shares.",
    },
    popovers: {
      title: "Popovers, menus & tooltips",
      short: "Popovers",
      blurb:
        "The overlays anchored to a trigger: popover, hover menu and tooltip — flipped and clamped against the window, mirrored right-to-left, and the pure placement behind them.",
    },
    tour: {
      title: "Guided tour",
      short: "Tour",
      blurb:
        "A spotlight tour over the real page: steps that point at any element by selector, wait for a click, run code first, and survive a missing target.",
    },
    "command-palette": {
      title: "Command palette",
      short: "Commands",
      blurb:
        "The ⌘K palette: a searchable list of places and actions, opened by the shortcut anywhere on the page, with results that can arrive late.",
    },
    "swipeable-row": {
      title: "Swipeable row",
      short: "Swipe",
      blurb:
        "A list row that reveals its actions when dragged sideways — by finger or mouse, in stages, right-to-left — with the same actions reachable by keyboard.",
    },
    "app-chrome": {
      title: "App chrome",
      blurb:
        "The frame an app lives in and the flows every app repeats: settings, multi-step forms, feedback.",
    },
    shell: {
      title: "Shell",
      short: "Shell",
      blurb: "The app frame you are looking at, taken apart.",
    },
    settings: {
      title: "Settings fields",
      short: "Settings",
      blurb: "The account-settings rows: theme, language, profile, password and two-factor.",
    },
    wizard: {
      title: "Wizard",
      short: "Wizard",
      blurb: "The multi-step engine, its chrome and its review step.",
    },
    "feedback-compose": {
      title: "Feedback — compose",
      short: "Compose",
      blurb: "The report form and its attachment field.",
    },
    "feedback-inbox": {
      title: "Feedback — inbox",
      short: "Inbox",
      blurb:
        "The shared status vocabulary, the transition policy, and the parts an inbox is built from.",
    },
    api: {
      title: "API",
      blurb:
        "What is left when you take the pixels away: the hooks components are built from, and the pure helpers and constants an app calls directly.",
    },
    "hooks-lib": {
      title: "Hooks & lib",
      short: "Hooks",
      blurb: "The non-visual exports: hooks read live, and the pure helpers as input → output.",
    },
    helpers: {
      title: "Helpers & constants",
      short: "Helpers",
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
