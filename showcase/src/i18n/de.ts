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
    "Pickers & entry": "Picker & Erfassung",
    "Data display": "Datenanzeige",
    Charts: "Diagramme",
    // Kept English: "Overlay" is the word German front-end work uses for these.
    Overlays: "Overlays",
    // "Chrome" in the UI sense is the frame around the content, not the browser.
    "App chrome": "App-Rahmen",
    API: "API",
  },

  groupShort: {
    "Getting started": "Start",
    Foundations: "Tokens",
    "Pickers & entry": "Picker",
    "Data display": "Anzeige",
    "App chrome": "Rahmen",
  },

  pages: {
    overview: {
      title: "Übersicht",
      short: "Übersicht",
      blurb:
        "Was @eifi1/ui-kit ist, aus welchen acht Schichten es besteht und wie Sie eine Seite dieses Showcase lesen.",
    },
    foundations: {
      title: "Grundlagen",
      blurb:
        "Die Werte, mit denen jede Komponente malt, und die Sprache, die jede Komponente spricht. Unterhalb dieser Schicht ist keine Farbe und kein Wort hart kodiert.",
    },
    tokens: {
      title: "Tokens",
      short: "Tokens",
      blurb:
        "Jeder Wert des aktiven TokenSet, live. Wechseln Sie oben in der Leiste Theme oder Palette und sehen Sie dieser Seite beim Umschalten zu — was sich nicht bewegt, ist hart kodiert.",
    },
    palette: {
      title: "Palettengenerator",
      short: "Palette",
      blurb:
        "Eine Markenfarbe hinein, beide Themes heraus — jedes Kontrastverhältnis gemessen statt behauptet, und jeder Kompromiss beim Namen genannt.",
    },
    localisation: {
      title: "Lokalisierung",
      short: "Lokalisierung",
      blurb:
        "Jeder Text, den das Kit rendert, als ein typisierter Baum — und der Provider, der eine Übersetzung an alle Komponenten zugleich weitergibt.",
    },
    inputs: {
      title: "Eingaben",
      blurb:
        "Jede Art, einen Wert einzutippen oder einzustellen: Text, Auswahl, Zahlen, Daten, Dateien und der Formular-Adapter darum herum. Alle teilen denselben Aufbau — schwebendes Label, Wert, Hilfezeile darunter —, sodass sich ein Formular wie aus einem Guss liest.",
    },
    fields: {
      title: "Textfelder",
      short: "Text",
      blurb:
        "Eingabefelder und die Klassenkonstanten, aus denen eine Anwendung ihre eigenen Felder zusammensetzt.",
    },
    forms: {
      title: "Formulare (react-hook-form)",
      short: "Formulare",
      blurb:
        "Der react-hook-form-Adapter unter @eifi1/ui-kit/rhf: Label, Steuerelement, Beschreibung und Meldung eines Felds, miteinander und mit dem Formularzustand verbunden — und Meldungen nur dort, wo der Nutzer sie sieht.",
    },
    choices: {
      title: "Auswahl",
      short: "Auswahl",
      blurb:
        "An oder aus, eins aus wenigen, ein Wert auf einer Skala — und die Wahl einer Farbe, eines Symbols oder einer Karte.",
    },
    numbers: {
      title: "Zahlen & Geld",
      short: "Zahlen",
      blurb:
        "Der Zahlen-Baukasten: ein Zahlenfeld mit Rechner, ein Feld, dessen Wert eine Zahl ist, das Geldfeld mit seinen Tönen und die Währungsauswahl.",
    },
    calendars: {
      title: "Kalender & Datumsauswahl",
      short: "Kalender",
      blurb:
        "Einen Tag oder einen Zeitraum wählen: der Kalender selbst, die darauf gebauten Datums- und Zeitraum-Picker, ihre Vorgaben und Grenzen sowie der erste Tag der Woche.",
    },
    "month-time": {
      title: "Monat & Uhrzeit",
      short: "Monat & Zeit",
      blurb:
        "Die gröbere und die feinere Körnung: ein Monat für sich, im Feld oder zwischen Schritt-Buttons, und eine Uhrzeit.",
    },
    files: {
      title: "Dateien",
      short: "Dateien",
      blurb:
        "Dateien auswählen: eine Schaltfläche, die den Dateidialog oder die Kamera öffnet, die Ablagefläche und Ablehnungen, die dort gemeldet werden, wo der Nutzer gerade hinschaut — nie als Toast.",
    },
    pickers: {
      title: "Picker & Erfassung",
      blurb:
        "Aus einer Liste wählen statt tippen, und die aufwendigeren Arten der Erfassung: eine Messtabelle, ein Feld, das beim Verlassen speichert, eine Unterschrift, ein Passwort.",
    },
    comboboxes: {
      title: "Comboboxen",
      short: "Comboboxen",
      blurb:
        "Freitext mit Vorschlägen: die Combobox, deren Wert das Getippte ist, und die Autovervollständigung, die schon beim Tippen sucht.",
    },
    "entity-pickers": {
      title: "Datensatz-Picker",
      short: "Datensätze",
      blurb:
        "Einen Datensatz über seine ID wählen: Picker in Feld- und in Button-Form, statische und nachgeladene Optionen, mehrere auf einmal sowie die gemeinsamen Zustände ungültig, Fehler und deaktiviert.",
    },
    "dropdown-parts": {
      title: "Dropdown-Bausteine",
      short: "Bausteine",
      blurb:
        "Mehrfachauswahl, der gruppierte Picker und das Smartphone-Sheet — und die Hooks und das Panel, aus denen jedes Dropdown des Kits gebaut ist.",
    },
    "measured-grid": {
      title: "Tabelleneingabe",
      short: "Tabelleneingabe",
      blurb:
        "Eine Messtabelle eingeben: ein Zellenraster für die Tastatur, ein aus einer Tabellenkalkulation eingefügter Block und dieselbe Tabelle als Text — Tausende Zeilen, nur die sichtbaren gerendert.",
    },
    "field-sync": {
      title: "Synchronisationsstatus",
      short: "Sync-Status",
      blurb:
        "Sync-Status eines datenbankgestützten Felds, gespeichert beim Verlassen: Rahmenfarbe und ein Symbol am Feldende zeigen geändert, speichert, gespeichert oder fehlgeschlagen — der Fehlergrund erscheint beim Überfahren des Fehlersymbols.",
    },
    "signature-password": {
      title: "Unterschrift, Passwort & Bestätigung",
      short: "Unterschrift",
      blurb:
        "Eine Unterschrift erfassen — und eine gespeicherte anzeigen —, zeigen, wie stark ein Passwort ist, und eine unwiderrufliche Aktion bestätigen lassen.",
    },
    "data-display": {
      title: "Datenanzeige",
      blurb:
        "Werte zeigen statt erfassen: die Grundbausteine, Rückmeldung und Fortschritt, Listen, Bäume und die Tabelle.",
    },
    buttons: {
      title: "Buttons & Flächen",
      short: "Buttons",
      blurb:
        "Buttons, Button-Gruppen, Icon-Buttons, Karten, Ladeanzeigen und Avatare — die Teile, aus denen alles andere gebaut ist.",
    },
    "chips-toggles": {
      title: "Chips & Umschalter",
      short: "Chips",
      blurb:
        "Chips und das Chip-Feld, die Umschaltgruppe und Tabs — die kleinen Bedienelemente, die eins aus wenigen wählen oder eine kurze Liste halten.",
    },
    feedback: {
      title: "Rückmeldung & Fortschritt",
      short: "Rückmeldung",
      blurb:
        "Wie weit eine Aufgabe ist, dass Inhalte unterwegs sind, dass hier nichts ist und dass etwas gelesen werden muss: Fortschrittsbalken und Messanzeigen, Platzhalter, Leerzustände und Banner.",
    },
    "description-list": {
      title: "Beschreibungsliste & Tabelle",
      short: "Listen & Tabellen",
      blurb:
        "Fakten ohne jede Mechanik angeordnet: eine Liste aus Begriffen und Angaben, eine schlichte statische Tabelle sowie Trennlinie und Scrollbereich, die zwischen beiden stehen.",
    },
    "tree-view": {
      title: "Baumansicht",
      short: "Baum",
      blurb:
        "Eine Hierarchie, die man mit der Tastatur durchläuft — ein einziger Tab-Stopp, Pfeiltasten zum Auf- und Zuklappen, Sprung per Tippen — mit nachgeladenen Kindknoten, von außen gesteuert, von rechts nach links und mit ihrer Zeile für sich allein.",
    },
    "data-table": {
      title: "Datentabelle",
      short: "Tabelle",
      blurb:
        "Die größte Komponente des Kits, vollständig: Sortierung, Filter, Auswahl und Aufklappen, von außen gesteuert, kurz und ohne Seitenaufteilung, in einem begrenzten Bereich und von rechts nach links.",
    },
    "data-table-server": {
      title: "Datentabelle: Server, URL & Smartphone",
      short: "Server & Mobil",
      blurb:
        "Die Tabelle, wenn ihr nicht alles selbst gehört: die Ansicht in der Adresse, die Zeilen seitenweise vom Server und das Smartphone-Layout aus Karten, Gruppen und Wischaktionen.",
    },
    "data-table-parts": {
      title: "Datentabelle: Bausteine & Hilfsfunktionen",
      short: "Tabellenteile",
      blurb:
        "Woraus die Tabelle zusammengesetzt ist, auch einzeln nutzbar: die Seitennavigation, das Filter-Popover, der Label-Baum und die reinen Hilfsfunktionen für Sortierung, Filter und URL.",
    },
    charts: {
      title: "Diagramme",
      blurb:
        "Werte als Bilder: die Hülle im Theme über Recharts, das Kacheldiagramm, das zoombare Reihendiagramm mit seinen Balken und Flächen und die KPI-Kachel.",
    },
    "chart-shell": {
      title: "Diagramm-Hülle",
      short: "Diagramme",
      blurb:
        "Die Diagramm-Hülle im Theme des Kits auf Basis von Recharts — Container, Tooltip und Legende — und das Farbsystem, aus dem jedes Diagramm des Kits schöpft.",
    },
    "tile-chart": {
      title: "Kacheldiagramm",
      short: "Kacheln",
      blurb:
        "Die Treemap: Anteile an einem Ganzen als Kacheln, mit passenden Beschriftungen und anklickbaren Kacheln — und der Drilldown, per Balkendiagramm wie per Kacheln.",
    },
    "series-chart": {
      title: "Reihendiagramm",
      short: "Reihen",
      blurb:
        "Das zoombare Reihendiagramm, das die Apps teilen: eine Achse pro Einheit, eine Legende aus Schaltern, ein Zoom für einen ganzen Stapel Diagramme und die Hilfsfunktionen darunter.",
    },
    "series-chart-marks": {
      title: "Reihendiagramm: Balken, Flächen & Zeit",
      short: "Balken & Flächen",
      blurb:
        "Dasselbe Diagramm mit Balken, Flächen und Stapeln, über Kategorien und echter Zeit, mit Referenzlinien, Markierungen, Punkten und Klicks — und einer Legende, deren Farben stehen bleiben.",
    },
    stats: {
      title: "Kennzahlen & Sparklines",
      short: "Kennzahlen",
      blurb:
        "Die KPI-Kachel, die jedes Dashboard wiederholt — Wert, Veränderung, Trend — und die winzige Linie, die in eine Tabellenzelle passt.",
    },
    layout: {
      title: "Aufklappbereich & Dialograhmen",
      short: "Aufklappen",
      blurb:
        "Ein Abschnitt, der sich einklappen lässt, und der Rahmen aus Kopf, Inhalt und Aktionen, den jeder Dialog wiederholt.",
    },
    overlays: {
      title: "Overlays",
      blurb:
        "Alles, was über der Seite schwebt, und das eine Timing, das sie alle beim Schließen teilen.",
    },
    dialogs: {
      title: "Dialoge",
      short: "Dialoge",
      blurb:
        "Modal und Vollbild-Dialog, der Klick auf den Hintergrund, der sie schließt, und das Timing des Schließens, das alle Overlays teilen.",
    },
    "confirm-floating": {
      title: "Bestätigungsdialog & schwebendes Panel",
      short: "Bestätigen",
      blurb:
        "Das Promise, das window.confirm ersetzt — mit Abstufungen von gefährlich bis neutral, eigenen Worten und einer Warteschlange — und das nicht-modale Panel, das hinter einem schwebenden Button in einer Ecke andockt.",
    },
    popovers: {
      title: "Popover, Menüs & Tooltips",
      short: "Popover",
      blurb:
        "Die Overlays, die an einem Auslöser hängen: Popover, Hover-Menü und Tooltip — am Fensterrand umgeklappt und eingegrenzt, für Rechts-nach-links gespiegelt — und die reine Positionsberechnung dahinter.",
    },
    tour: {
      title: "Geführte Tour",
      short: "Tour",
      blurb:
        "Eine Spotlight-Tour über die echte Seite: Schritte, die per Selektor auf jedes Element zeigen, auf einen Klick warten, vorher Code ausführen und ein fehlendes Ziel überstehen.",
    },
    "command-palette": {
      title: "Befehlspalette",
      short: "Befehle",
      blurb:
        "Die ⌘K-Palette: eine durchsuchbare Liste von Orten und Aktionen, per Tastenkürzel überall auf der Seite geöffnet, mit Ergebnissen, die auch später eintreffen dürfen.",
    },
    "swipeable-row": {
      title: "Wischbare Zeile",
      short: "Wischen",
      blurb:
        "Eine Listenzeile, die ihre Aktionen zeigt, wenn man sie zur Seite zieht — mit Finger oder Maus, in Stufen, von rechts nach links — und dieselben Aktionen per Tastatur erreichbar.",
    },
    "app-chrome": {
      title: "App-Rahmen",
      blurb:
        "Der Rahmen, in dem eine App lebt, und die Abläufe, die jede App wiederholt: Einstellungen, mehrstufige Formulare, Feedback.",
    },
    shell: {
      title: "Grundgerüst",
      short: "Grundgerüst",
      blurb: "Der Anwendungsrahmen, den Sie gerade vor sich haben, auseinandergenommen.",
    },
    settings: {
      title: "Einstellungsfelder",
      short: "Einstellungen",
      blurb:
        "Die Zeilen der Kontoeinstellungen: Theme, Sprache, Profil, Passwort und Zwei-Faktor-Authentifizierung.",
    },
    wizard: {
      title: "Assistent",
      short: "Assistent",
      blurb: "Die mehrstufige Engine, ihr Rahmen und ihr Prüfschritt.",
    },
    "feedback-compose": {
      title: "Feedback — Erfassen",
      short: "Erfassen",
      blurb: "Das Meldeformular und sein Feld für Anhänge.",
    },
    "feedback-inbox": {
      title: "Feedback — Posteingang",
      short: "Posteingang",
      blurb:
        "Das gemeinsame Statusvokabular, die Regeln für Statusübergänge und die Teile, aus denen ein Posteingang gebaut wird.",
    },
    api: {
      title: "API",
      blurb:
        "Was übrig bleibt, wenn man die Pixel weglässt: die Hooks, aus denen die Komponenten gebaut sind, und die reinen Hilfsfunktionen und Konstanten, die eine App direkt aufruft.",
    },
    "hooks-lib": {
      title: "Hooks & lib",
      short: "Hooks",
      blurb:
        "Die nicht sichtbaren Exporte: die Hooks live beobachtet, die reinen Hilfsfunktionen als Eingabe → Ausgabe.",
    },
    "clipboard-timing": {
      title: "Zwischenablage & Timing",
      short: "Zwischenablage",
      blurb:
        "Kopieren, das sagt, ob es geklappt hat, und Warten, bis das Tippen aufhört: der Kopier-Button und sein Hook sowie der entprellte Wert und Callback.",
    },
    helpers: {
      title: "Hilfsfunktionen & Konstanten",
      short: "Hilfsfunktionen",
      blurb:
        "Die Funktionen und Daten hinter den Eingabefeldern, als Eingabe → Ergebnis: Datumsrechnung aus @eifi1/ui-kit/dates, der Auswerter des Rechners, die Währungstabelle und die Klassenkonstanten, aus denen ein eigenes Feld zusammengesetzt wird.",
    },
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_DE,
};
