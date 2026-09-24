import { formatFileSize } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * German.
 *
 * The language the kit is actually shipped in — both consuming apps render a German UI —
 * so this is the dictionary that proves the contract against a real consumer rather than
 * in the abstract. Written against en.ts and the kit's `DEFAULT_*` labels key for key.
 *
 * Conventions a reviewer should know:
 *
 *  1. APIs STAY ENGLISH. `TokenSet`, `PickerSheet`, `Recharts`, `Hooks`, `Tokens` — a
 *     developer types those. The same goes for the loanwords German front-end work
 *     genuinely uses: `Overlay`, `Dropdown`, `Tooltip`, `Theme`, `Popover`.
 *  2. BUTTONS ARE INFINITIVES. Speichern, Abbrechen, Schließen, Erneut versuchen — never
 *     "Speichern Sie". A German UI labels an action; it does not address the user.
 *  3. PROSE AND ANNOUNCEMENTS SAY "SIE" — the standard register for a developer audience.
 *  4. QUOTES ARE „…“, written literally (low-opening, high-closing, no inner space).
 *  5. NUMBERS go through `Intl.NumberFormat("de-DE")`, so a footer says "1.234" rather
 *     than "1234"; counted nouns agree with their number ("1 Zeile", "2 Zeilen").
 *
 * German is also the LONGEST of the seven ("Nicht gespeicherte Änderungen" is 29
 * characters where English has 15), so it is the locale that breaks a layout first.
 */
const num = new Intl.NumberFormat("de-DE");
const n = (value: number) => num.format(value);

export const de: Dictionary = {
  tag: "de-DE",
  name: "Deutsch",
  country: "de",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "Auf dieser Seite",
    previous: "Zurück",
    next: "Weiter",
    notFoundTitle: "Seite nicht gefunden",
    notFoundHint: "Dieser Pfad gehört zu keiner Komponente des Kits.",
    backToStart: "Zurück zur Übersicht",
    toggleTheme: "Theme wechseln",
    palette: "Palette",
    language: "Sprache",
    renderedFrom: "@eifi1/ui-kit-Showcase — gerendert aus src/, nicht aus dist/.",
    // "Brotkrümelnavigation" is the literal calque; "Pfadnavigation" says the same in one
    // breath, and a screen reader says it before every path.
    breadcrumb: "Pfadnavigation",
    pagination: "Seitennavigation",
    sidebarStyle: "Seitenleisten-Stil",
    sidebarFlyout: "Seiten als Ausklappmenü",
    sidebarInline: "Seiten direkt aufgelistet",
    contentsPosition: "Position des Inhaltsverzeichnisses",
    positionStart: "Links",
    positionEnd: "Rechts",
  },

  groups: {
    "Getting started": "Erste Schritte",
    Foundations: "Grundlagen",
    Inputs: "Eingaben",
    "Data display": "Datenanzeige",
    // Kept English: "Overlay" is the word German front-end work uses for these.
    Overlays: "Overlays",
    // "Chrome" in the UI sense is the frame around the content, not the browser.
    "App chrome": "App-Rahmen",
    API: "API",
  },

  pages: {
    overview: {
      title: "Übersicht",
      blurb:
        "Was @eifi1/ui-kit ist, aus welchen sechs Schichten es besteht und wie Sie eine Seite dieses Showcase lesen.",
    },
    foundations: {
      title: "Grundlagen",
      blurb:
        "Die Werte, mit denen jede Komponente malt, und die Sprache, die jede Komponente spricht. Unterhalb dieser Schicht ist keine Farbe und kein Wort hart kodiert.",
    },
    tokens: {
      title: "Tokens",
      blurb:
        "Jeder Wert des aktiven TokenSet, live. Wechseln Sie oben in der Leiste Theme oder Palette und sehen Sie dieser Seite beim Umschalten zu — was sich nicht bewegt, ist hart kodiert.",
    },
    palette: {
      title: "Palettengenerator",
      blurb:
        "Eine Markenfarbe hinein, beide Themes heraus — jedes Kontrastverhältnis gemessen statt behauptet, und jeder Kompromiss beim Namen genannt.",
    },
    localisation: {
      title: "Lokalisierung",
      blurb:
        "Jeder Text, den das Kit rendert, als ein typisierter Baum — und der Provider, der eine Übersetzung an alle Komponenten zugleich weitergibt.",
    },
    inputs: {
      title: "Eingaben",
      blurb:
        "Jede Art, einen Wert zu erfassen. Alle teilen denselben Aufbau — schwebendes Label, Wert, Hilfezeile darunter —, sodass sich ein Formular wie aus einem Guss liest.",
    },
    fields: {
      title: "Textfelder",
      blurb:
        "Eingabefelder und die Klassenkonstanten, aus denen eine Anwendung ihre eigenen Felder zusammensetzt.",
    },
    choices: {
      title: "Checkbox, Schalter & Schieberegler",
      blurb: "Auswählen statt tippen: an/aus, eins aus wenigen und ein Wert auf einer Skala.",
    },
    numbers: {
      title: "Zahlen & Geld",
      blurb:
        "Der Zahlen-Baukasten: ein Zahlenfeld mit Rechner, ein Feld, dessen Wert eine Zahl ist, das Geldfeld mit seinen Tönen und die Währungsauswahl.",
    },
    dropdowns: {
      title: "Dropdowns & Picker",
      blurb:
        "Comboboxen, Mehrfachauswahl, gruppierte Picker und Sheet-Picker sowie die Dropdown-Primitiven darunter.",
    },
    dates: {
      title: "Datum & Uhrzeit",
      blurb:
        "Einen Zeitpunkt in jeder Körnung wählen: einen Tag, einen Zeitraum, einen Monat, eine Uhrzeit.",
    },
    "field-sync": {
      title: "Synchronisationsstatus",
      blurb:
        "Sync-Status eines datenbankgestützten Felds, gespeichert beim Verlassen: Rahmenfarbe und ein Symbol am Feldende zeigen geändert, speichert, gespeichert oder fehlgeschlagen — der Fehlergrund erscheint beim Überfahren des Fehlersymbols.",
    },
    "signature-password": {
      title: "Unterschrift & Passwortstärke",
      blurb:
        "Eine Unterschrift per Stift, Finger oder Maus erfassen — mit dem getippten Namen als Ausweichlösung — und zeigen, wie stark das gewählte Passwort ist.",
    },
    "data-display": {
      title: "Datenanzeige",
      blurb:
        "Werte zeigen statt erfassen: die Grundbausteine, die Tabelle und die Diagramme.",
    },
    primitives: {
      title: "Grundbausteine",
      blurb:
        "Buttons, Karten, Tabs, Banner, Avatare — die Teile, aus denen alles andere gebaut ist.",
    },
    "data-table": {
      title: "Datentabelle",
      blurb:
        "Die größte Komponente des Kits: Sortierung, Filter, Auswahl, Seitenaufteilung, URL-Abgleich und ihre reinen Hilfsfunktionen.",
    },
    charts: {
      title: "Diagramme",
      blurb:
        "Die Diagramm-Hülle im Theme des Kits auf Basis von Recharts, ihr Farbsystem, das Kacheldiagramm (Treemap) und das zoombare Reihendiagramm, das die Apps teilen.",
    },
    stats: {
      title: "Kennzahlen & Sparklines",
      blurb:
        "Die KPI-Kachel, die jedes Dashboard wiederholt — Wert, Veränderung, Trend — und die winzige Linie, die in eine Tabellenzelle passt.",
    },
    overlays: {
      title: "Overlays",
      blurb:
        "Alles, was über der Seite schwebt, und das eine Timing, das sie alle beim Schließen teilen.",
    },
    dialogs: {
      title: "Dialoge & Popover",
      blurb:
        "Modal, Vollbild-Dialog, Popover, Hover-Menü und Tooltip — dazu das gemeinsame Timing des Schließens.",
    },
    "tour-search-files": {
      title: "Tour, Befehlspalette & Dateien",
      blurb:
        "Die geführte Tour, die Befehlspalette, die Ablagefläche für Dateien und die wischbare Zeile.",
    },
    "app-chrome": {
      title: "App-Rahmen",
      blurb:
        "Der Rahmen, in dem eine App lebt, und die Abläufe, die jede App wiederholt: Einstellungen, mehrstufige Formulare, Feedback.",
    },
    shell: {
      title: "Grundgerüst",
      blurb: "Der Anwendungsrahmen, den Sie gerade vor sich haben, auseinandergenommen.",
    },
    settings: {
      title: "Einstellungsfelder",
      blurb:
        "Die Zeilen der Kontoeinstellungen: Theme, Sprache, Profil, Passwort und Zwei-Faktor-Authentifizierung.",
    },
    wizard: {
      title: "Assistent",
      blurb: "Die mehrstufige Engine, ihr Rahmen und ihr Prüfschritt.",
    },
    "feedback-compose": {
      title: "Feedback — Erfassen",
      blurb: "Das Meldeformular und sein Feld für Anhänge.",
    },
    "feedback-inbox": {
      title: "Feedback — Posteingang",
      blurb:
        "Das gemeinsame Statusvokabular, die Regeln für Statusübergänge und die Teile, aus denen ein Posteingang gebaut wird.",
    },
    "hooks-lib": {
      title: "Hooks & lib",
      blurb:
        "Die nicht sichtbaren Exporte: die Hooks live beobachtet, die reinen Hilfsfunktionen als Eingabe → Ausgabe.",
    },
    api: {
      title: "API",
      blurb:
        "Was übrig bleibt, wenn man die Pixel weglässt: die Hooks, aus denen die Komponenten gebaut sind, und die reinen Hilfsfunktionen und Konstanten, die eine App direkt aufruft.",
    },
    helpers: {
      title: "Hilfsfunktionen & Konstanten",
      blurb:
        "Die Funktionen und Daten hinter den Eingabefeldern, als Eingabe → Ergebnis: Datumsrechnung aus @eifi1/ui-kit/dates, der Auswerter des Rechners, die Währungstabelle und die Klassenkonstanten, aus denen ein eigenes Feld zusammengesetzt wird.",
    },
  },

  kit: {
    pageContents: { title: "Auf dieser Seite" },
    common: {
      close: "Schließen",
      clear: "Leeren",
      search: "Suchen",
      done: "Fertig",
      cancel: "Abbrechen",
      save: "Speichern",
      back: "Zurück",
      next: "Weiter",
      remove: "Entfernen",
      loading: "Wird geladen…",
      noResults: "Keine Ergebnisse",
      fieldValue: (field, value) => `${field}: ${value}`,
    },
    dataTable: {
      columns: "Spalten",
      selectAllRows: "Alle Zeilen auswählen",
      sortHint: "Klicken zum Sortieren · Umschalt-Klick für weitere Sortierung",
      filter: "Filter",
      close: "Schließen",
      selectRow: "Zeile auswählen",
      autoSize: "Spaltenbreiten anpassen",
      loading: "Wird geladen…",
      filters: "Filter",
      // Resets every active filter; "Alle löschen" would read as deleting the filters.
      clearAll: "Alle zurücksetzen",
      done: "Fertig",
      pageSize: "Zeilen pro Seite",
      // Sits among 10 / 25 / 50 counting "Zeilen", so the plural "Alle", not "Alles".
      pageSizeAll: "Alle",
      prevPage: "Vorherige Seite",
      nextPage: "Nächste Seite",
      clearFilter: "Filter zurücksetzen",
      filterPlaceholder: "Filtern…",
      selectFilter: "Auswählen",
      selectAll: "Alle",
      selectNone: "Keine",
      dateFrom: "Von",
      dateTo: "Bis",
      numberMin: "Min.",
      numberMax: "Max.",
      numberAbs: "Betrag",
      presets: {
        today: "Heute",
        yesterday: "Gestern",
        this_week: "Diese Woche",
        last_week: "Letzte Woche",
        last_7_days: "Letzte 7 Tage",
        last_30_days: "Letzte 30 Tage",
        this_month: "Dieser Monat",
        last_month: "Letzter Monat",
        last_3_months: "Letzte 3 Monate",
        ytd: "Seit Jahresbeginn",
        last_year: "Letztes Jahr",
      },
      table: "Datentabelle",
      filterResults: (shown, total) =>
        `${n(shown)} von ${n(total)} ${total === 1 ? "Zeile" : "Zeilen"}`,
      sortedAscending: (column) => `Sortiert nach ${column}, aufsteigend`,
      sortedDescending: (column) => `Sortiert nach ${column}, absteigend`,
      sortCleared: (column) => `Sortierung nach ${column} aufgehoben`,
      pageChanged: (page, totalPages) => `Seite ${n(page)} von ${n(totalPages)}`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Spalten (${n(visible)}/${n(total)})`,
    },
    miniCalendar: {
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      // Already formatted in the provider's locale ("Montag, 14. September 2026").
      day: (date) => date,
      chooseStart: "Startdatum wählen",
      chooseEnd: "Enddatum wählen",
      startSelected: (date) => `${date} als Startdatum gewählt. Wählen Sie jetzt ein Enddatum.`,
      rangeSelected: (from, to) =>
        `Zeitraum ${from} bis ${to} gewählt. Wählen Sie ein Startdatum, um neu zu beginnen.`,
    },
    datePicker: {
      panel: "Datum wählen",
      rangePanel: "Zeitraum wählen",
      clear: "Leeren",
      previousDay: "Vorheriger Tag",
      nextDay: "Nächster Tag",
      today: "Heute",
    },
    monthPicker: {
      previousYear: "Vorheriges Jahr",
      nextYear: "Nächstes Jahr",
      panel: "Monat wählen",
      month: (monthYear) => monthYear,
    },
    popover: {
      panel: "Aufklappfenster",
    },
    combobox: {
      search: "Suchen",
      noResults: "Keine Ergebnisse",
      clear: "Leeren",
      loading: "Wird geladen…",
      create: (query) => `„${query}“ anlegen`,
      selectedCount: (count) => `${n(count)} ausgewählt`,
    },
    multiSelect: {
      search: "Suchen",
      selectAll: "Alle auswählen",
      clear: "Leeren",
      all: "Alle",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "Taschenrechner öffnen",
      panel: "Taschenrechner",
      calculation: "Rechnung",
      backspace: "Rücktaste",
      clear: "Löschen",
      equals: "Ist gleich",
      done: "Fertig",
      plus: "Plus",
      minus: "Minus",
      times: "Mal",
      divide: "Geteilt durch",
      decimal: "Dezimaltrennzeichen",
    },
    currency: {
      currency: "Währung",
      search: "Währung suchen",
    },
    chipInput: {
      // The value is arbitrary user text, quoted as a citation, so the participle agrees
      // with the implied "Eintrag" whatever the chip says.
      added: (value) => `„${value}“ hinzugefügt`,
      removed: (value) => `„${value}“ entfernt`,
      remove: "Entfernen",
      // `von` governs the dative, visible only in the plural: "von 1 Eintrag", "von 2 Einträgen".
      atLimit: (max) => `Grenze von ${n(max)} ${max === 1 ? "Eintrag" : "Einträgen"} erreicht`,
      duplicate: (value) => `„${value}“ steht bereits in der Liste`,
    },
    fieldSync: {
      synced: "Gespeichert",
      edited: "Nicht gespeicherte Änderungen",
      pending: "Wird gespeichert…",
      error: "Speichern fehlgeschlagen",
      retry: "Erneut versuchen",
    },
    passwordReveal: {
      show: "Passwort anzeigen",
      hide: "Passwort verbergen",
    },
    appShell: {
      collapse: "Seitenleiste einklappen",
      expand: "Seitenleiste ausklappen",
      toggleGroup: (groupLabel) => `${groupLabel}: Seiten`,
    },
    topBar: {
      theme: "Theme wechseln",
      palette: "Darstellungsvorlage",
      language: "Sprache",
      switchRole: "Rolle wechseln",
      role: (value) => `Rolle: ${value}`,
    },
    pickerSheet: {
      close: "Schließen",
    },
    swipeableRow: {
      actions: "Zeilenaktionen",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, "de-DE"),
    },
    wizard: {
      cancel: "Abbrechen",
      back: "Zurück",
      next: "Weiter",
      skip: "Überspringen",
      finish: "Abschließen",
      submitting: "Wird erstellt…",
      steps: "Schritte",
      step: (current, total) => `Schritt ${n(current)} von ${n(total)}`,
      cancelTitle: "Formular verwerfen?",
      confirmCancel: "Ihre Eingaben gehen verloren.",
      cancelConfirmLabel: "Verwerfen",
      cancelDismissLabel: "Weiter bearbeiten",
      reviewTitle: "Überprüfen",
      edit: "Bearbeiten",
      missingRequired: "Bitte füllen Sie alle Pflichtfelder aus.",
      genericError: "Ein Fehler ist aufgetreten",
    },
    tour: {
      next: "Weiter",
      back: "Zurück",
      skip: "Überspringen",
      done: "Fertig",
      awaitClickHint: "Klicken Sie auf das hervorgehobene Element, um fortzufahren",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      placeholder: "Suchen…",
      empty: "Keine Ergebnisse",
      loading: "Wird gesucht…",
      dialog: "Suche",
    },
    sparkline: {
      rising: (first, last) => `Steigend von ${first} auf ${last}`,
      falling: (first, last) => `Fallend von ${first} auf ${last}`,
      flat: (value) => `Unverändert bei ${value}`,
      single: (value) => `Ein Wert: ${value}`,
      noData: "Keine Daten",
      named: (name, summary) => `${name}: ${summary}`,
    },
    statTile: {
      // `amount` arrives formatted and unsigned ("5 %", "1.200 €").
      increase: (amount) => `Um ${amount} gestiegen`,
      decrease: (amount) => `Um ${amount} gesunken`,
      unchanged: "Keine Veränderung",
      better: (change) => `${change} (besser)`,
      worse: (change) => `${change} (schlechter)`,
      noValue: "Keine Daten",
      loading: "Wird geladen…",
    },
    signaturePad: {
      label: "Unterschrift",
      instructions: "Unterschreiben Sie im Feld mit der Maus, dem Finger oder einem Stift.",
      typedFallbackHint: "Wenn Sie nicht zeichnen können, geben Sie stattdessen Ihren Namen ein.",
      empty: "Noch nichts gezeichnet",
      signed: "Unterschrift gezeichnet",
      undo: "Letzten Strich rückgängig machen",
      clear: "Leeren",
      save: "Unterschrift speichern",
      useTyped: "Stattdessen Namen eingeben",
      useDrawn: "Stattdessen zeichnen",
      typedName: "Vollständiger Name",
      cleared: "Unterschrift gelöscht",
      undone: "Letzter Strich entfernt",
    },
    passwordStrength: {
      tooShort: "Zu kurz",
      weak: "Schwach",
      fair: "Mittel",
      good: "Gut",
      strong: "Stark",
      announcement: (level) => `Passwortstärke: ${level}`,
      // "Zeichen" is the same in singular and plural. The English default does not
      // format these counts, so neither does this file.
      ruleLength: (minLength) => `Mindestens ${minLength} Zeichen`,
      ruleCase: "Groß- und Kleinbuchstaben",
      ruleDigit: "Eine Ziffer",
      ruleSymbol: "Ein Sonderzeichen",
      optional: (rule) => `${rule} (optional)`,
      met: "Erfüllt:",
      notMet: "Nicht erfüllt:",
      tooLong: (maxBytes) =>
        `Höchstens ${maxBytes} Zeichen (Buchstaben mit Akzent und Emojis zählen mehrfach).`,
    },
    seriesChart: {
      resetZoom: "Zoom zurücksetzen",
      zoomHint:
        "Zum Zoomen ziehen: Eine annähernd quadratische Auswahl zoomt beide Achsen, eine lange, schmale nur ihre eigene. Doppelklick setzt zurück.",
      empty: "Keine Daten",
      legend: "Datenreihen",
    },
  },
};

