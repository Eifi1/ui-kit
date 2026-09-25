import { UI_KIT_LABELS_DE } from "@eifi1/ui-kit/i18n/de";
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
    devicePreview: "Vorschau in Bildschirmgrößen",
    previewHint:
      "Die Seite in den drei häufigsten Bildschirmgrößen, live: In jedem Rahmen kann gescrollt und geklickt werden. Design, Palette und Sprache folgen der oberen Leiste.",
    phone: "Smartphone",
    tablet: "Tablet",
    desktop: "Desktop",
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
      title: "Auswahl",
      blurb:
        "An oder aus, eins aus wenigen, ein Wert auf einer Skala — und die Wahl einer Farbe, eines Symbols oder einer Karte.",
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
    files: {
      title: "Dateien",
      blurb:
        "Dateien auswählen: eine Schaltfläche, die den Dateidialog oder die Kamera öffnet, die Ablagefläche und Ablehnungen, die dort gemeldet werden, wo der Nutzer gerade hinschaut — nie als Toast.",
    },
    "measured-grid": {
      title: "Tabelleneingabe",
      blurb:
        "Eine Messtabelle eingeben: ein Zellenraster für die Tastatur, ein aus einer Tabellenkalkulation eingefügter Block und dieselbe Tabelle als Text — Tausende Zeilen, nur die sichtbaren gerendert.",
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
      title: "Unterschrift, Passwort & Bestätigung",
      blurb:
        "Eine Unterschrift erfassen — und eine gespeicherte anzeigen —, zeigen, wie stark ein Passwort ist, und eine unwiderrufliche Aktion bestätigen lassen.",
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
    layout: {
      title: "Aufklappbereich & Dialograhmen",
      blurb:
        "Ein Abschnitt, der sich einklappen lässt, und der Rahmen aus Kopf, Inhalt und Aktionen, den jeder Dialog wiederholt.",
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

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_DE,
};
