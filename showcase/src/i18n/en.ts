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
    searchPlaceholder: "Search components, examples, or what you need…",
    searchComponents: "Components",
    searchExamples: "Examples",
    searchNeeds: "What do you need?",
    searchPages: "Pages",
  },

  // Keyed by the English label in routes.tsx — the key is the identity of the group, the
  // value is what the sidebar shows. So English maps each label to itself.
  groups: {
    "Getting started": "Getting started",
    Foundations: "Foundations",
    Inputs: "Inputs",
    "Pickers & entry": "Pickers & entry",
    "Data display": "Data display",
    Charts: "Charts",
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
        "What @eifi1/ui-kit is, the eight layers it is built in, and how to read a page of this showcase.",
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
    "month-view": {
      title: "Calendar month view",
      short: "Month view",
      blurb:
        "The calendar as a page: a ruled month with each day's events drawn in its cell, a header of the page's own driving it, and a panel for the day that is picked.",
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
        "Showing values rather than taking them: the building blocks, feedback and progress, lists, trees and the table.",
    },
    buttons: {
      title: "Buttons & surfaces",
      short: "Buttons",
      blurb:
        "Buttons, button groups, icon buttons, cards, spinners and avatars — the pieces everything else is built from.",
    },
    "chips-toggles": {
      title: "Chips & toggles",
      short: "Chips",
      blurb:
        "Chips and the chip field, the toggle group, and tabs — the small controls that pick one of a few or hold a short list.",
    },
    feedback: {
      title: "Feedback & progress",
      short: "Feedback",
      blurb:
        "How far a job has got, that content is on its way, that there is nothing here, and that something needs reading: progress bars and meters, skeletons, empty states and banners.",
    },
    "description-list": {
      title: "Description list & table",
      short: "Lists & tables",
      blurb:
        "Facts laid out without any machinery: a list of terms and details, a plain static table, and the separator and scroll area that sit between them.",
    },
    "lists-menus": {
      title: "Lists & menus",
      short: "Lists & menus",
      blurb:
        "The row every app draws by hand — a button, a link or a record, with its actions beside it — the row of a menu, and the bar a selection of rows brings up.",
    },
    "tree-view": {
      title: "Tree view",
      short: "Tree",
      blurb:
        "A hierarchy walked with the keyboard — one Tab stop, arrows to open and close, type-ahead — with children loaded on demand, controlled from outside, right-to-left, and its row on its own.",
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
    charts: {
      title: "Charts",
      blurb:
        "Values as pictures: the themed shell over Recharts, the tile chart, the zoomable series chart with its bars and areas, and the KPI tile.",
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
    "series-chart-marks": {
      title: "Series chart: bars, areas & time",
      short: "Bars & areas",
      blurb:
        "The same chart drawing bars, areas and stacks, over categories and real time, with reference lines, markers, dots and clicks — and a legend whose colours hold still.",
    },
    stats: {
      title: "Stats & sparklines",
      short: "Stats",
      blurb:
        "The KPI tile every dashboard repeats — value, change, trend — and the tiny line that fits in a table cell.",
    },
    "calendar-heatmap": {
      title: "Calendar heatmap",
      short: "Heatmap",
      blurb:
        "Days as shaded squares: a year of weeks or one month, a day that can be picked, the scale's steps, top and colour, a long window cut to its latest days, and right-to-left.",
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
    "confirm-floating": {
      title: "Confirm dialog & floating panel",
      short: "Confirm",
      blurb:
        "The promise that replaces window.confirm — with tones, its own words and a queue — and the non-modal panel docked in a corner behind a floating button.",
    },
    "floating-actions": {
      title: "Floating actions",
      short: "Floating",
      blurb:
        "The corner controls: an extended button that reports a status and is announced when it changes, the kit tooltip on a floating button, and a pill of corner toggles, links and counts.",
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
    "page-structure": {
      title: "Page header & breadcrumbs",
      short: "Page header",
      blurb:
        "The parts of a page that are not its content: the header with its trail and actions, the breadcrumbs on their own, and the section label, caption and status dot.",
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
    "clipboard-timing": {
      title: "Clipboard & timing",
      short: "Clipboard",
      blurb:
        "Copying that says whether it worked, and waiting until the typing stops: the copy button and its hook, and the debounced value and callback.",
    },
    helpers: {
      title: "Helpers & constants",
      short: "Helpers",
      blurb:
        "The functions and data behind the inputs, shown as input → output: date arithmetic at @eifi1/ui-kit/dates, the calculator's evaluator, the currency table, and the class constants a custom field is composed from.",
    },
  },


  // The top-bar search's "What do you need?" rows: a task in the reader's words, and the
  // page that does it. Phrased as typed into a search box — lower case, no full stop.
  needs: {
    overview: [
      "get started with the kit",
      "how the kit is organised",
      "how to read a showcase page",
      "compare with MUI",
      "install and set up",
    ],
    foundations: [
      "see the design tokens",
      "colours and themes",
      "translate the whole kit",
      "brand colour palette",
      "dark mode",
    ],
    tokens: [
      "see every colour token",
      "switch between light and dark theme",
      "change the colour palette",
      "keep the theme after a reload",
      "spacing, radius and shadow values",
      "text colours and surfaces",
      "check what is hardcoded",
    ],
    palette: [
      "generate a palette from a brand colour",
      "check colour contrast",
      "colours for charts",
      "accessible colour ramp",
      "derive dark mode colours",
      "custom theme from one colour",
    ],
    localisation: [
      "translate the interface",
      "change the language",
      "German translation",
      "informal German with du",
      "Swiss German spelling",
      "find untranslated labels",
      "set the locale for dates and numbers",
      "provide labels to every component",
    ],
    inputs: [
      "see every input component",
      "build a form",
      "enter text, numbers or dates",
      "form field layout",
      "pick a value",
    ],
    fields: [
      "type text",
      "text field with a floating label",
      "multi-line text",
      "search box",
      "show a hint below a field",
      "show a validation error",
      "dropdown select",
      "clear a field",
      "build a custom field",
      "label above the field",
    ],
    forms: [
      "validate a form",
      "use react-hook-form",
      "show error messages under fields",
      "required fields",
      "submit a form",
      "wire a label to its input",
      "form with validation schema",
      "validate one wizard step",
    ],
    choices: [
      "turn a setting on or off",
      "tick a checkbox",
      "choose one of a few options",
      "pick a value on a slider",
      "pick a colour",
      "choose an icon",
      "choose between cards",
      "select a range with a slider",
      "card that starts an action",
    ],
    numbers: [
      "enter a money amount",
      "enter a number",
      "choose a currency",
      "calculator in a field",
      "number with step buttons",
      "number pad on a phone",
      "negative amounts in red",
      "format numbers by locale",
    ],
    calendars: [
      "pick a date",
      "pick a date range",
      "calendar",
      "date range presets like last month",
      "limit selectable dates",
      "first day of the week",
      "choose from and to dates",
      "jump to today",
    ],
    "month-view": [
      "month calendar page",
      "show events on a calendar",
      "planner month grid",
      "custom content in a calendar day",
      "calendar with its own header",
      "dots on calendar days",
    ],
    "month-time": [
      "pick a month",
      "step to the previous or next month",
      "enter a time of day",
      "choose hours and minutes",
      "billing period by month",
      "restrict time to a range",
    ],
    files: [
      "upload a file",
      "drag and drop files",
      "take a photo with the camera",
      "pick several files",
      "only allow images or PDFs",
      "reject files that are too large",
      "show why a file was refused",
    ],
    pickers: [
      "choose from a list",
      "pick a record",
      "enter a table of values",
      "save a field on blur",
      "capture a signature",
      "check password strength",
    ],
    comboboxes: [
      "type to filter a long list",
      "suggestions while typing",
      "autocomplete from a server",
      "free text with suggestions",
      "search as you type",
      "create a new option",
      "combobox",
    ],
    "entity-pickers": [
      "pick a record by id",
      "choose a customer or contact",
      "select several records",
      "load options from an API",
      "inline picker in a table",
      "show the invalid or error state",
      "pick a related item",
    ],
    "dropdown-parts": [
      "select several options",
      "multi-select with checkboxes",
      "grouped options",
      "select all",
      "picker as a bottom sheet on phones",
      "build my own dropdown",
      "filter a dropdown by typing",
    ],
    "measured-grid": [
      "enter a table of measurements",
      "paste from a spreadsheet",
      "keyboard grid like Excel",
      "thousands of rows",
      "virtualised list",
      "parse pasted text into rows",
      "edit cells with arrow keys",
    ],
    "field-sync": [
      "save a field when leaving it",
      "show saving or saved state",
      "show that saving failed",
      "autosave",
      "unsaved changes indicator",
      "field backed by the database",
    ],
    "signature-password": [
      "sign a document",
      "capture a signature",
      "show a saved signature",
      "check password strength",
      "confirm with a password",
      "ask before deleting something important",
      "type the name to confirm a deletion",
      "confirm a dangerous action",
    ],
    "data-display": [
      "show data",
      "display values",
      "tables and lists",
      "progress and feedback",
      "buttons and cards",
    ],
    buttons: [
      "a button",
      "primary and secondary buttons",
      "icon button",
      "group of buttons",
      "card container",
      "loading spinner",
      "user avatar with initials",
      "disabled button",
      "status dot on an avatar",
    ],
    "chips-toggles": [
      "choose one of a few options",
      "segmented control",
      "tabs",
      "tags or chips",
      "enter several tags",
      "filter chips",
      "toggle between views",
      "remove a tag",
    ],
    feedback: [
      "show progress",
      "progress bar",
      "loading placeholder",
      "skeleton while loading",
      "empty result",
      "nothing found message",
      "notify the user",
      "warning or error banner",
      "success message",
      "percentage meter",
      "show a short confirmation",
      "undo after delete",
      "toast",
    ],
    "description-list": [
      "show key and value pairs",
      "details of a record",
      "simple static table",
      "table with a total row",
      "divider line",
      "scrollable area",
      "right-align numbers in a table",
    ],
    "lists-menus": [
      "list of items",
      "clickable list row",
      "row with actions",
      "unread marker",
      "inbox list",
      "menu item with a check mark",
      "danger item in a menu",
      "select several rows",
      "bulk actions on selected rows",
      "selection toolbar",
    ],
    "tree-view": [
      "show hierarchical data",
      "folder tree",
      "expand and collapse nodes",
      "load children on demand",
      "navigate a tree with the keyboard",
      "nested categories",
      "org chart as a list",
    ],
    "data-table": [
      "tabular data with sorting",
      "sort a table",
      "filter table rows",
      "select rows",
      "expand a row for details",
      "table with pagination",
      "hide or reorder columns",
      "data grid",
      "search in a table",
    ],
    "data-table-server": [
      "server-side pagination",
      "keep table filters in the URL",
      "table on a phone as cards",
      "swipe actions on table rows",
      "group rows",
      "load pages from an API",
      "share a filtered table link",
    ],
    "data-table-parts": [
      "pagination controls",
      "filter popover",
      "sort helpers",
      "match rows against a filter",
      "translate the table labels",
      "page size selector",
    ],
    layout: [
      "collapse a section",
      "accordion",
      "show more or less",
      "dialog layout with header and actions",
      "expandable panel",
      "animate height",
    ],
    charts: [
      "draw a chart",
      "visualise data",
      "chart colours",
      "dashboard with KPIs",
      "line or bar chart",
    ],
    "chart-shell": [
      "themed chart",
      "chart tooltip",
      "chart legend",
      "colours for chart series",
      "use Recharts with the theme",
      "pie or bar chart",
      "responsive chart",
    ],
    "tile-chart": [
      "treemap",
      "show shares of a total",
      "drill down into a chart",
      "clickable tiles",
      "spending by category",
      "fit labels in tiles",
    ],
    "series-chart": [
      "show a chart over time",
      "zoom into a chart",
      "line chart with two axes",
      "toggle series in the legend",
      "several charts with one zoom",
      "time series",
      "measurements over time",
    ],
    "series-chart-marks": [
      "bar chart",
      "stacked area chart",
      "reference line or threshold",
      "markers on a chart",
      "click a point in a chart",
      "chart over dates",
      "stable legend colours",
    ],
    stats: [
      "KPI tile",
      "show a number with its change",
      "trend up or down",
      "sparkline in a table cell",
      "dashboard figures",
      "tiny line chart",
    ],
    "calendar-heatmap": [
      "contribution graph",
      "activity per day",
      "spending calendar",
      "heatmap of days",
      "shade days by value",
      "year at a glance",
    ],
    overlays: [
      "show something on top of the page",
      "open a dialog",
      "popup or menu",
      "tooltip",
      "command palette",
    ],
    dialogs: [
      "open a modal dialog",
      "full-screen dialog",
      "close on backdrop click",
      "animate closing",
      "popup window",
      "dialog on a phone",
    ],
    "confirm-floating": [
      "ask before deleting",
      "confirm dialog",
      "replace window.confirm",
      "are you sure prompt",
      "floating action button",
      "panel docked in a corner",
      "chat or help panel",
    ],
    "floating-actions": [
      "floating status pill",
      "announce a status change",
      "offline indicator",
      "tooltip on a floating button",
      "toggle buttons in a corner",
      "badge with a count",
      "floating toolbar",
    ],
    popovers: [
      "show a tooltip on hover",
      "popover anchored to a button",
      "menu on hover",
      "dropdown menu",
      "position a popup near an element",
      "explain an icon",
    ],
    tour: [
      "guided tour",
      "onboarding walkthrough",
      "highlight an element",
      "step-by-step introduction",
      "wait for the user to click",
      "product tour for new users",
    ],
    "command-palette": [
      "command palette",
      "global search",
      "keyboard shortcut to search",
      "jump to a page",
      "search with typo tolerance",
      "quick actions menu",
      "search results from a server",
    ],
    "swipeable-row": [
      "swipe a row to delete",
      "reveal actions by swiping",
      "swipe on a phone",
      "archive by swiping",
      "list row actions",
    ],
    "app-chrome": [
      "app layout",
      "sidebar and top bar",
      "settings page",
      "multi-step form",
      "collect user feedback",
    ],
    "page-structure": [
      "page title with actions",
      "page header",
      "breadcrumb trail",
      "breadcrumbs on a phone",
      "small uppercase section label",
      "caption text",
      "status dot",
      "online indicator",
      "unread badge on an avatar",
      "legend swatch",
      "links as wrapping pills",
    ],
    shell: [
      "app layout with sidebar",
      "top bar",
      "navigation menu",
      "bottom navigation on phones",
      "table of contents",
      "theme toggle",
      "language menu",
      "collapse the sidebar",
      "account menu with avatar",
    ],
    settings: [
      "account settings",
      "change the password",
      "two-factor authentication",
      "edit the profile",
      "choose the theme",
      "choose the language",
      "user preferences",
    ],
    wizard: [
      "multi-step form",
      "stepper",
      "wizard with a review step",
      "go back and forth between steps",
      "onboarding flow",
      "summary before submitting",
    ],
    "feedback-compose": [
      "collect user feedback",
      "report a bug",
      "attach a screenshot",
      "feedback form",
      "send a suggestion",
    ],
    "feedback-inbox": [
      "manage feedback reports",
      "feedback status workflow",
      "triage bug reports",
      "support inbox",
      "change a report's status",
    ],
    api: [
      "hooks and helpers",
      "functions without UI",
      "utility functions",
      "constants",
      "date helpers",
    ],
    "hooks-lib": [
      "react to screen size",
      "media query hook",
      "close an overlay with the back button",
      "position a panel next to a trigger",
      "merge class names",
      "detect a phone",
    ],
    "clipboard-timing": [
      "copy to clipboard",
      "copy button with confirmation",
      "debounce typing",
      "wait until the user stops typing",
      "delay a search request",
      "throttle a callback",
    ],
    helpers: [
      "date arithmetic",
      "today's date as ISO",
      "date range presets",
      "evaluate a math expression",
      "list of currencies",
      "last full months",
      "field class names",
    ],
  },


  /**
   * The kit's own English, verbatim. English is the language the defaults are written
   * in, so the reference dictionary IS the defaults — passing them back through the
   * provider changes nothing on screen, which is the point: if picking English moves
   * anything, something has drifted. The other six dictionaries spell out every key.
   */
  kit: DEFAULT_UI_KIT_LABELS,
};
