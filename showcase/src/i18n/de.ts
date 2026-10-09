import { UI_KIT_LABELS_DE_CH } from "@eifi1/ui-kit/i18n/de-CH";
import type { Dictionary } from "./types";

/**
 * German — Swiss Standard German, formal, the kit's one German (`@eifi1/ui-kit/i18n/de-CH`).
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
 *  2. BUTTONS ARE INFINITIVES. Speichern, Abbrechen, Schliessen, Erneut versuchen — never
 *     "Speichern Sie". A German UI labels an action; it does not address the user.
 *  3. PROSE AND ANNOUNCEMENTS SAY "SIE" — the standard register for a developer audience.
 *  4. QUOTES ARE „…“, written literally (low-opening, high-closing, no inner space).
 *  5. NUMBERS go through `Intl.NumberFormat("de-CH")`, so a footer says "1’234" rather
 *     than "1234"; counted nouns agree with their number ("1 Zeile", "2 Zeilen").
 *  6. SWISS SPELLING: "ss" for every "ß" (Schliessen, Grösse), as in the kit's catalogue,
 *     so the showcase's own words and the components' words never disagree.
 *
 * German is also the LONGEST of the seven ("Nicht gespeicherte Änderungen" is 29
 * characters where English has 15), so it is the locale that breaks a layout first.
 */

export const de: Dictionary = {
  tag: "de-CH",
  name: "Deutsch",
  country: "ch",
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
    devicePreview: "Vorschau in Bildschirmgrössen",
    previewHint:
      "Wählen Sie eine Bildschirmgrösse: Die Seite erscheint live in dieser Breite – im Rahmen kann gescrollt und geklickt werden. Design, Palette und Sprache folgen der oberen Leiste.",
    phone: "Smartphone",
    tablet: "Tablet",
    desktop: "Desktop",
    previewShort: "Vorschau",
    allDevices: "Alle drei",
    previewExit: "Zurück zur Seite",
    searchPlaceholder: "Komponenten, Beispiele oder Anliegen suchen…",
    searchComponents: "Komponenten",
    searchExamples: "Beispiele",
    searchNeeds: "Was brauchen Sie?",
    searchPages: "Seiten",
    // The "Server side" line under a kit page's title, and the search's server-kit group.
    serverSide: "Serverseite",
    searchServer: "Server-Kit",
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
    "Server kit": "Server-Kit",
  },

  groupShort: {
    "Getting started": "Start",
    Foundations: "Tokens",
    "Pickers & entry": "Picker",
    "Data display": "Anzeige",
    "App chrome": "Layout",
    Inputs: "Felder",
    Charts: "Charts",
    Overlays: "Popups",
    "Server kit": "Server",
  },

  pages: {
    media: {
      title: "Bilder & Medien",
      short: "Medien",
      blurb:
        "Hochgeladenes zeigen: ein Raster von Vorschaubildern mit Aktionen und Bildunterschriften, der Vollbild-Betrachter mit Tasten, Wischen und Zoom, und Bilder, die nur angemeldet geladen werden können.",
    },
    "pie-chart": {
      title: "Kreisdiagramm",
      short: "Kreis",
      blurb:
        "Anteile an einem Ganzen als Ring oder Kreis: Legendenarten, Segmente zum Anklicken und per Tastatur, verborgene Beträge, das leere Diagramm, rechts-nach-links — und die Legende für sich.",
    },
    links: {
      title: "Links",
      short: "Links",
      blurb:
        "Jeder Link des Kits über den Router der App, einmal am Provider gesetzt: der Textlink und seine Töne, ein Button oder eine Aktionskarte als Link, und Links, die die App verlassen.",
    },
    "landing-demo": {
      title: "Startseite & Demo",
      short: "Startseite",
      blurb:
        "Die öffentliche Startseite und die Demo zum Ausprobieren: die Kopfzeile in ihren drei Zuständen, die Abschnitte der Startseite, die SEO-Prüfungen, die Rückkehr zur zuletzt besuchten Seite sowie Start, Countdown und Ende der Demo.",
    },
    "user-admin": {
      title: "Benutzerverwaltung",
      short: "Benutzer",
      blurb:
        "Die Admin-Seite der Konten: die Benutzerliste mit Rollen und Status, die vier Admin-Aktionen mit der Bestätigung, die der Server verlangt, das Audit-Log, Einladungen, das Übergeben von Arbeit sowie die Tarifspalte und der Tarifwechsel durch den Betreiber.",
    },
    subscription: {
      title: "Abonnement",
      short: "Abrechnung",
      blurb:
        "Für eine App bezahlen: die Tarifauswahl in zwei Währungen und zwei Abrechnungszeiträumen, der Status des Abonnements, die Banner von der Testphase bis zum Ablauf, Hinweis und Toast zum Tariflimit, die Nur-Lesen-Sperre und die Arten von Sperren, das Portal des Anbieters, der Rückweg aus dem Checkout, die Bezahlseite und der kommerzielle Hinweis im Impressum.",
    },
    "auth-account": {
      title: "Anmeldung & Kontosicherheit",
      short: "Anmeldung",
      blurb:
        "Die Seiten vor der App — eine schmale Anmeldung und eine breite Rechtsseite — und die Sicherheit des Kontos: Zwei-Faktor per QR-Code eingerichtet, Passkeys hinzugefügt, umbenannt und entfernt.",
    },
    formatting: {
      title: "Formatierung & Beträge mit Vorzeichen",
      short: "Formatierung",
      blurb:
        "Zahlen, Geld, Prozente, Datumsangaben und relative Zeiten in der Sprache des Lesers — als Eingabe → Ausgabe in mehreren Sprachen — und der Betrag mit Vorzeichen und die Veränderung, die sich selbst einfärben.",
    },
    "url-state": {
      title: "Zustand in der URL",
      short: "URL-Zustand",
      blurb:
        "Ein Wert, ein Tab und ein offener Dialog in der Adresse gehalten, sodass ein Neuladen sie behält und Zurück sie rückgängig macht: die Suchparameter-Hooks und der Dialog, der sich über einen Link öffnet.",
    },
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
    "colour-roles": {
      title: "Farbrollen",
      short: "Rollen",
      blurb:
        "Die semantische Schicht über der Palette: jede Füllfarbe mit der Vordergrundfarbe, die sie nennt, jeder Farbton als Text, Fläche und Linie, die kräftigen Linien, die eingelassene Fläche auf einer Karte, die Hover-Regel, die Rollen-Utilities, die text-[var(--…)] ersetzen, und der Test, der eine Variable findet, die nichts deklariert.",
    },
    "text-size": {
      title: "Textgrösse & Kontrast",
      short: "Textgrösse",
      blurb:
        "Normal, Gross und Sehr gross über eine einzige Skala am Wurzelelement, mit den Breakpoints, die mit ihr wandern, der Stufe „Mehr“ beim Kontrast, der Kontoregel, die beides von Gerät zu Gerät mitnimmt — und was die Komponenten bei Gross tun.",
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
    "kit-review": {
      title: "Kit-Prüfung (live)",
      short: "Kit-Prüfung",
      blurb:
        "Die Texte des Kits in jeder Sprache, die keksdose ausliefert, geprüft gegen die Prüfdatenbank von keksdose: dieselben kit.-Zeilen und Urteile wie auf seiner Übersetzungsseite, von dort mit einem Prüf-Token geöffnet.",
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
    "month-view": {
      title: "Kalender-Monatsansicht",
      short: "Monatsansicht",
      blurb:
        "Der Kalender als Seite: ein linierter Monat mit den Terminen jedes Tages in seiner Zelle, eine eigene Kopfzeile der Seite, die ihn steuert, und ein Bereich für den gewählten Tag.",
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
        "Aus einer Liste wählen statt tippen, und die aufwendigeren Arten der Erfassung: eine Messtabelle, ein Feld, das beim Verlassen speichert, eine Unterschrift, ein Passwort, ein Formular in Schritten.",
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
    "lists-menus": {
      title: "Listen & Menüs",
      short: "Listen & Menüs",
      blurb:
        "Die Zeile, die jede App von Hand zeichnet — eine Schaltfläche, ein Link oder ein Datensatz, mit ihren Aktionen daneben —, die Zeile eines Menüs und die Leiste, die eine Auswahl von Zeilen einblendet.",
    },
    "tree-view": {
      title: "Baumansicht",
      short: "Baum",
      blurb:
        "Eine Hierarchie, die man mit der Tastatur durchläuft — ein einziger Tab-Stopp, Pfeiltasten zum Auf- und Zuklappen, Sprung per Tippen — mit nachgeladenen Kindknoten, von aussen gesteuert, von rechts nach links und mit ihrer Zeile für sich allein.",
    },
    "data-table": {
      title: "Datentabelle",
      short: "Tabelle",
      blurb:
        "Die grösste Komponente des Kits, vollständig: Sortierung, Filter, Auswahl und Aufklappen, von aussen gesteuert, kurz und ohne Seitenaufteilung, in einem begrenzten Bereich und von rechts nach links.",
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
    "calendar-heatmap": {
      title: "Kalender-Heatmap",
      short: "Heatmap",
      blurb:
        "Tage als schattierte Quadrate: ein Jahr in Wochen oder ein Monat, ein auswählbarer Tag, Stufen, Obergrenze und Farbe der Skala, ein langer Zeitraum auf die letzten Tage gekürzt, und von rechts nach links.",
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
        "Alles, was über der Seite schwebt, und das eine Timing, das sie alle beim Schliessen teilen.",
    },
    dialogs: {
      title: "Dialoge",
      short: "Dialoge",
      blurb:
        "Modal und Vollbild-Dialog, der Klick auf den Hintergrund, der sie schliesst, und das Timing des Schliessens, das alle Overlays teilen.",
    },
    "confirm-floating": {
      title: "Bestätigungsdialog & schwebendes Panel",
      short: "Bestätigen",
      blurb:
        "Das Promise, das window.confirm ersetzt — mit Abstufungen von gefährlich bis neutral, eigenen Worten und einer Warteschlange — und das nicht-modale Panel, das hinter einem schwebenden Button in einer Ecke andockt.",
    },
    "floating-actions": {
      title: "Schwebende Aktionen",
      short: "Schwebend",
      blurb:
        "Die Bedienelemente in der Ecke: ein erweiterter Button, der einen Status meldet und bei Änderungen angesagt wird, der Kit-Tooltip an einem schwebenden Button und eine Leiste aus Eck-Schaltern, Links und Zählern.",
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
        "Der Rahmen, in dem eine App lebt, und die Abläufe, die jede App wiederholt: Einstellungen, Konten, Abonnements, Feedback.",
    },
    "page-structure": {
      title: "Seitenkopf & Pfadnavigation",
      short: "Seitenkopf",
      blurb:
        "Die Teile einer Seite, die nicht ihr Inhalt sind: der Kopf mit Pfad und Aktionen, die Pfadnavigation für sich allein sowie Abschnittsbezeichnung, Hinweiszeile und Statuspunkt.",
    },
    shell: {
      title: "Grundgerüst",
      short: "Grundgerüst",
      blurb: "Der Anwendungsrahmen, den Sie gerade vor sich haben, auseinandergenommen.",
    },
    settings: {
      title: "Einstellungen",
      short: "Einstellungen",
      blurb:
        "Die Einstellungsseite und die Admin-Seite auf einem gemeinsamen Grundgerüst: die Seitenleiste auf dem Desktop, die Drilldown-Liste auf dem Smartphone, eine Gruppe pro Pfad, die Suche und die Karte, die ein Link hervorhebt. Die Zeilen der Kontoeinstellungen: Theme, Sprache, Profil, Passwort und Zwei-Faktor-Authentifizierung.",
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
    // The Server kit group (0.31): server-kit's modules, from its release's api.json.
    "server-kit": {
      title: "Server-Kit",
      blurb:
        "Das Python-Paket hinter den Backends der Apps: die Verträge, die diese Komponenten sprechen, als Code — Signaturen und Docstrings jedes Moduls, festgelegt auf ein Release von server-kit.",
    },
    "server-auth": {
      title: "Anmeldung & Konto",
      short: "Anmeldung",
      blurb:
        "Registrierung, Anmeldung, Einmal-Tokens, Sitzungs-Claims und die Übertragungsformate des Kontos — die Serverhälfte der Seiten für Anmeldung, Registrierung und Konto.",
    },
    "server-user-admin": {
      title: "Benutzerverwaltung",
      short: "Benutzer",
      blurb:
        "Die Abfrage der Benutzerliste, die vier Admin-Aktionen und ihre Bestätigungsstufen, der Audit-Eintrag, das Löschen in zwei Stufen und der Datenexport.",
    },
    "server-settings": {
      title: "Einstellungen & Sprache",
      short: "Einstellungen",
      blurb:
        "Eine Regel für jeden Body mit Einstellungen — Weggelassenes bleibt, null leert, Unbekanntes wird abgelehnt — und die eine kanonische Sprache des Kontos.",
    },
    "server-demo": {
      title: "Demo",
      short: "Demo",
      blurb:
        "Das Wegwerf-Demokonto: seine Einstellungen, die Prüfungen vor dem Start in fester Reihenfolge, die Ablehnungen und ihre Codes, die Nur-Lesen-Regel und seine eine Lebensdauer.",
    },
    "server-billing": {
      title: "Abrechnung",
      short: "Abrechnung",
      blurb:
        "Tarife und ihre Limits, der Stand des Abonnements mit den Daten der Testphase und der Beta, die Nur-Lesen-Sperre bei Ablauf und die Webhooks von Paddle und Lemon Squeezy: Signaturen geprüft, Ereignisse vereinheitlicht, ein Dispatch.",
    },
    "server-mail": {
      title: "E-Mail",
      short: "E-Mail",
      blurb:
        "E-Mails zum Konto: die Texte pro Sprache, ein einziges Layout, das jeden Wert escapt, zwei Transporte, die nie eine Ausnahme werfen — und die Beispiel-E-Mails des Releases, gerendert.",
    },
    "server-feedback": {
      title: "Feedback & Uploads",
      short: "Feedback",
      blurb:
        "Der Feedback-Vertrag als reine Funktionen — Schemas, Status, die PATCH-Regeln, Nacharbeit, Absturzmeldungen, Löschung — und Anhänge, beurteilt nach ihren Bytes.",
    },
    "server-limits": {
      title: "Limits, Fehler & CORS",
      short: "Limits",
      blurb:
        "Der Rate-Limiter mit gleitendem Fenster und wessen Adresse er zählt, jede Ablehnung des Kits mit ihrem Status aus dem Vertrag beantwortet, und CORS für einige zusätzliche Origins.",
    },
    "server-translation-review": {
      title: "Übersetzungsprüfung",
      short: "Prüfung",
      blurb:
        "Die Übertragungsformate der Übersetzungsprüfung, wer welche Schlüssel und Sprachen prüfen darf, und die Prüf-Tokens, mit denen ein Prüfer die Prüfseite des Kits öffnet.",
    },
  },


  // The top-bar search's „Was brauchen Sie?“ rows, in the words a German reader types:
  // infinitives and plain nouns, no „Sie“ — a search phrase, not a sentence.
  needs: {
    media: [
      "hochgeladene Bilder anzeigen",
      "Bild im Vollbild öffnen",
      "Bildergalerie mit Beschriftung",
      "Bild nur mit Anmeldung laden",
      "PDF-Anhang in der Vorschau",
    ],
    "pie-chart": [
      "Anteile an einer Summe zeigen",
      "Ringdiagramm",
      "auf ein Segment klicken",
      "Legende ohne Diagramm",
      "Beträge im Diagramm verbergen",
    ],
    links: [
      "auf eine andere Seite der App verlinken",
      "eigenen Router für Kit-Links nutzen",
      "Link in neuem Tab öffnen",
      "Button, der navigiert",
      "Link der aktuellen Seite hervorheben",
    ],
    "landing-demo": [
      "öffentliche Startseite bauen",
      "Button „Zugang anfragen“ einbauen",
      "Seitentitel und Beschreibung für Suchmaschinen prüfen",
      "App dort öffnen, wo der Nutzer aufgehört hat",
      "Demo-Sitzung starten",
      "verbleibende Demo-Zeit herunterzählen",
      "zeigen, dass die Demo beendet ist",
    ],
    "user-admin": [
      "Benutzer mit ihren Rollen auflisten",
      "ein Konto deaktivieren",
      "die Rolle eines Benutzers ändern",
      "jemanden per E-Mail einladen",
      "zeigen, wer was an einem Konto getan hat",
      "die Arbeit einer Person an jemand anderen übergeben",
      "die Sprachen eines Übersetzungsprüfers festlegen",
      "den Tarif eines Benutzers ändern",
    ],
    subscription: [
      "einen Tarif wählen",
      "Preise in CHF und EUR",
      "monatlich oder jährlich abrechnen",
      "den Status des Abonnements anzeigen",
      "Banner zum Ende der Testphase",
      "Banner bei fehlgeschlagener Zahlung",
      "Tariflimit erreicht",
      "nur lesen nach Ablauf des Abonnements",
      "das Abrechnungsportal öffnen",
      "das Abonnement kündigen",
      "Zahlung wird nach dem Checkout verarbeitet",
      "die Paddle-Bezahlseite ausliefern",
      "Tariflimit als Toast",
    ],
    "auth-account": [
      "Layout der Anmeldeseite",
      "Zwei-Faktor per QR-Code einrichten",
      "Passkeys verwalten",
      "Seite für AGB und Datenschutz",
      "Zwei-Faktor-Schlüssel mit Kopierknopf zeigen",
    ],
    formatting: [
      "Geldbetrag im Gebietsschema formatieren",
      "Datum als „vor 3 Tagen“",
      "Prozent formatieren",
      "positiven oder negativen Betrag farbig zeigen",
      "Veränderung zum Vormonat zeigen",
    ],
    "url-state": [
      "Filter in der URL behalten",
      "offenen Tab beim Neuladen merken",
      "Dialog über einen Link öffnen",
      "Dialog mit Zurück schliessen",
      "Link auf die aktuelle Ansicht teilen",
    ],
    overview: [
      "Einstieg ins Kit",
      "wie das Kit aufgebaut ist",
      "eine Showcase-Seite lesen",
      "Vergleich mit MUI",
      "installieren und einrichten",
    ],
    foundations: [
      "Design-Tokens ansehen",
      "Farben und Themes",
      "das ganze Kit übersetzen",
      "Farbpalette der Marke",
      "Dark Mode",
      "grössere Schrift und mehr Kontrast",
    ],
    tokens: [
      "alle Farb-Tokens ansehen",
      "zwischen hellem und dunklem Theme wechseln",
      "Farbpalette ändern",
      "Theme nach dem Neuladen behalten",
      "Abstände, Radien und Schatten",
      "Textfarben und Flächen",
      "fest eingetragene Werte finden",
    ],
    "colour-roles": [
      "Textfarbe auf einer farbigen Fläche",
      "die richtige Textfarbe für ein Warn-Badge",
      "eingelassene Fläche, die auf einer Karte sichtbar ist",
      "Hover-Farbe für eine Listenzeile",
      "text-[var(--text-muted)] durch eine Klasse ersetzen",
      "kräftiger Warnrahmen",
      "CSS-Variablen finden, die nichts deklariert",
    ],
    "text-size": [
      "Text vergrössern",
      "Einstellung für grosse Schrift",
      "mehr Kontrast bei Sehschwäche",
      "Modus mit hohem Kontrast",
      "Breakpoints, die mit der Schrift wachsen",
      "im Code auf das Smartphone-Layout prüfen",
      "die Textgrösse dem Konto folgen lassen",
      "die Beschriftung eines Icon-Buttons als Text zeigen",
      "Zeilenaktionen in ein Menü falten",
    ],
    palette: [
      "Palette aus einer Markenfarbe erzeugen",
      "Farbkontrast prüfen",
      "Farben für Diagramme",
      "barrierefreie Farbabstufung",
      "Farben für den Dark Mode ableiten",
      "eigenes Theme aus einer Farbe",
    ],
    localisation: [
      "Oberfläche übersetzen",
      "Sprache wechseln",
      "deutsche Übersetzung",
      "Schweizer Rechtschreibung",
      "nicht übersetzte Texte finden",
      "Gebietsschema für Datum und Zahlen",
      "Beschriftungen für alle Komponenten",
    ],
    "kit-review": [
      "Übersetzungen des Kits prüfen",
      "Übersetzung freigeben",
      "schlafenden Server aufwecken",
      "Prüfung aus keksdose öffnen",
      "Korrekturen exportieren",
    ],
    inputs: [
      "alle Eingabekomponenten ansehen",
      "Formular bauen",
      "Text, Zahlen oder Datum eingeben",
      "Layout von Formularfeldern",
      "Wert auswählen",
    ],
    fields: [
      "Text eingeben",
      "Textfeld mit schwebendem Label",
      "mehrzeiliger Text",
      "Suchfeld",
      "Hinweis unter einem Feld",
      "Validierungsfehler anzeigen",
      "Dropdown-Auswahl",
      "Feld leeren",
      "eigenes Feld bauen",
      "Beschriftung über dem Feld",
    ],
    forms: [
      "Formular validieren",
      "react-hook-form verwenden",
      "Fehlermeldungen unter Feldern",
      "Pflichtfelder",
      "Formular absenden",
      "Label mit Eingabefeld verknüpfen",
      "Formular mit Validierungsschema",
      "einen Wizard-Schritt prüfen",
    ],
    choices: [
      "Einstellung ein- oder ausschalten",
      "Checkbox ankreuzen",
      "eine von wenigen Optionen wählen",
      "Wert mit Schieberegler wählen",
      "Farbe auswählen",
      "Icon auswählen",
      "zwischen Karten wählen",
      "Bereich mit Schieberegler wählen",
      "Karte, die eine Aktion auslöst",
    ],
    numbers: [
      "Geldbetrag eingeben",
      "Zahl eingeben",
      "Währung wählen",
      "Taschenrechner im Feld",
      "Zahl mit Plus- und Minus-Tasten",
      "Ziffernblock auf dem Smartphone",
      "negative Beträge in Rot",
      "Zahlen nach Gebietsschema formatieren",
    ],
    calendars: [
      "Datum auswählen",
      "Datumsbereich auswählen",
      "Kalender",
      "Zeitraum-Vorlagen wie letzter Monat",
      "wählbare Tage einschränken",
      "erster Tag der Woche",
      "Von- und Bis-Datum wählen",
      "zu heute springen",
    ],
    "month-view": [
      "Monatskalender als Seite",
      "Termine im Kalender anzeigen",
      "Planer-Monatsraster",
      "eigener Inhalt in einem Kalendertag",
      "Kalender mit eigener Kopfzeile",
      "Punkte an Kalendertagen",
    ],
    "month-time": [
      "Monat auswählen",
      "zum vorigen oder nächsten Monat",
      "Uhrzeit eingeben",
      "Stunden und Minuten wählen",
      "Abrechnungszeitraum nach Monat",
      "Uhrzeit auf einen Bereich begrenzen",
    ],
    files: [
      "Datei hochladen",
      "Dateien per Drag-and-drop",
      "Foto mit der Kamera aufnehmen",
      "mehrere Dateien auswählen",
      "nur Bilder oder PDFs erlauben",
      "zu grosse Dateien ablehnen",
      "zeigen, warum eine Datei abgelehnt wurde",
    ],
    pickers: [
      "aus einer Liste wählen",
      "Datensatz auswählen",
      "Tabelle mit Werten eingeben",
      "Feld beim Verlassen speichern",
      "Unterschrift erfassen",
      "Passwortstärke prüfen",
      "mehrstufiges Formular",
    ],
    comboboxes: [
      "lange Liste durch Tippen filtern",
      "Vorschläge beim Tippen",
      "Autovervollständigung vom Server",
      "Freitext mit Vorschlägen",
      "Suche beim Tippen",
      "neue Option anlegen",
      "Combobox",
    ],
    "entity-pickers": [
      "Datensatz per ID auswählen",
      "Kunde oder Kontakt wählen",
      "mehrere Datensätze auswählen",
      "Optionen aus einer API laden",
      "Auswahl direkt in der Tabelle",
      "ungültigen Zustand oder Fehler zeigen",
      "verknüpften Eintrag wählen",
    ],
    "dropdown-parts": [
      "mehrere Optionen auswählen",
      "Mehrfachauswahl mit Checkboxen",
      "gruppierte Optionen",
      "alle auswählen",
      "Auswahl als Bottom Sheet auf dem Smartphone",
      "eigenes Dropdown bauen",
      "Dropdown durch Tippen filtern",
    ],
    "measured-grid": [
      "Tabelle mit Messwerten eingeben",
      "aus einer Tabellenkalkulation einfügen",
      "Tastatur-Raster wie in Excel",
      "Tausende von Zeilen",
      "virtualisierte Liste",
      "eingefügten Text in Zeilen zerlegen",
      "Zellen mit Pfeiltasten bearbeiten",
    ],
    "field-sync": [
      "Feld beim Verlassen speichern",
      "Status speichert oder gespeichert",
      "fehlgeschlagenes Speichern anzeigen",
      "automatisch speichern",
      "Hinweis auf ungespeicherte Änderungen",
      "Feld direkt aus der Datenbank",
    ],
    "signature-password": [
      "Dokument unterschreiben",
      "Unterschrift erfassen",
      "gespeicherte Unterschrift anzeigen",
      "Passwortstärke prüfen",
      "mit Passwort bestätigen",
      "vor dem Löschen wichtiger Daten nachfragen",
      "Namen eintippen, um das Löschen zu bestätigen",
      "gefährliche Aktion bestätigen",
    ],
    "data-display": [
      "Daten anzeigen",
      "Werte darstellen",
      "Tabellen und Listen",
      "Fortschritt und Rückmeldung",
      "Buttons und Karten",
    ],
    buttons: [
      "Button",
      "primäre und sekundäre Buttons",
      "Icon-Button",
      "Gruppe von Buttons",
      "Karte als Container",
      "Ladeanzeige",
      "Avatar mit Initialen",
      "deaktivierter Button",
      "Statuspunkt am Avatar",
    ],
    "chips-toggles": [
      "eine von wenigen Optionen wählen",
      "Segmented Control",
      "Tabs",
      "Tags oder Chips",
      "mehrere Tags eingeben",
      "Filter-Chips",
      "zwischen Ansichten umschalten",
      "Tag entfernen",
    ],
    feedback: [
      "Fortschritt anzeigen",
      "Fortschrittsbalken",
      "Platzhalter beim Laden",
      "Skeleton während des Ladens",
      "leeres Ergebnis",
      "Meldung „nichts gefunden“",
      "Nutzer benachrichtigen",
      "Warn- oder Fehlerbanner",
      "Erfolgsmeldung",
      "Prozentanzeige",
      "kurze Bestätigung anzeigen",
      "Rückgängig nach dem Löschen",
      "Toast",
    ],
    "description-list": [
      "Schlüssel-Wert-Paare anzeigen",
      "Details eines Datensatzes",
      "einfache statische Tabelle",
      "Tabelle mit Summenzeile",
      "Trennlinie",
      "scrollbarer Bereich",
      "Zahlen in der Tabelle rechtsbündig",
    ],
    "lists-menus": [
      "Liste von Einträgen",
      "klickbare Listenzeile",
      "Zeile mit Aktionen",
      "Ungelesen-Markierung",
      "Posteingang als Liste",
      "Menüeintrag mit Häkchen",
      "gefährlicher Menüeintrag",
      "mehrere Zeilen auswählen",
      "Sammelaktionen für ausgewählte Zeilen",
      "Auswahl-Werkzeugleiste",
    ],
    "tree-view": [
      "hierarchische Daten anzeigen",
      "Ordnerbaum",
      "Knoten auf- und zuklappen",
      "Unterelemente bei Bedarf laden",
      "Baum mit der Tastatur bedienen",
      "verschachtelte Kategorien",
      "Organigramm als Liste",
    ],
    "data-table": [
      "sortierbare Tabellendaten",
      "Tabelle sortieren",
      "Tabellenzeilen filtern",
      "Zeilen auswählen",
      "Zeile für Details aufklappen",
      "Tabelle mit Seitenaufteilung",
      "Spalten ausblenden oder umsortieren",
      "Datentabelle",
      "in einer Tabelle suchen",
    ],
    "data-table-server": [
      "serverseitige Paginierung",
      "Tabellenfilter in der URL behalten",
      "Tabelle als Karten auf dem Smartphone",
      "Wischaktionen auf Tabellenzeilen",
      "Zeilen gruppieren",
      "Seiten aus einer API laden",
      "Link zur gefilterten Tabelle teilen",
    ],
    "data-table-parts": [
      "Seitennavigation",
      "Filter-Popover",
      "Hilfsfunktionen zum Sortieren",
      "Zeilen gegen einen Filter prüfen",
      "Tabellenbeschriftungen übersetzen",
      "Auswahl der Seitengrösse",
    ],
    layout: [
      "Abschnitt einklappen",
      "Akkordeon",
      "mehr oder weniger anzeigen",
      "Dialog-Layout mit Kopfzeile und Aktionen",
      "aufklappbares Panel",
      "Höhe animieren",
    ],
    charts: [
      "Diagramm zeichnen",
      "Daten visualisieren",
      "Diagrammfarben",
      "Dashboard mit KPIs",
      "Linien- oder Balkendiagramm",
    ],
    "chart-shell": [
      "Diagramm im Theme",
      "Tooltip im Diagramm",
      "Diagrammlegende",
      "Farben für Datenreihen",
      "Recharts mit dem Theme nutzen",
      "Kreis- oder Balkendiagramm",
      "responsives Diagramm",
    ],
    "tile-chart": [
      "Treemap",
      "Anteile an einer Summe zeigen",
      "Drilldown in ein Diagramm",
      "anklickbare Kacheln",
      "Ausgaben nach Kategorie",
      "Beschriftungen in Kacheln einpassen",
    ],
    "series-chart": [
      "Verlauf über die Zeit darstellen",
      "in ein Diagramm zoomen",
      "Liniendiagramm mit zwei Achsen",
      "Datenreihen in der Legende ein- und ausblenden",
      "mehrere Diagramme mit gemeinsamem Zoom",
      "Zeitreihe",
      "Messwerte im Zeitverlauf",
    ],
    "series-chart-marks": [
      "Balkendiagramm",
      "gestapeltes Flächendiagramm",
      "Referenzlinie oder Schwellenwert",
      "Markierungen im Diagramm",
      "Punkt im Diagramm anklicken",
      "Diagramm über Datumswerte",
      "stabile Legendenfarben",
    ],
    stats: [
      "KPI-Kachel",
      "Zahl mit Veränderung anzeigen",
      "Trend nach oben oder unten",
      "Sparkline in einer Tabellenzelle",
      "Kennzahlen im Dashboard",
      "kleines Liniendiagramm",
    ],
    "calendar-heatmap": [
      "Beitragsdiagramm",
      "Aktivität pro Tag",
      "Ausgabenkalender",
      "Heatmap der Tage",
      "Tage nach Wert einfärben",
      "Jahr auf einen Blick",
    ],
    overlays: [
      "etwas über der Seite anzeigen",
      "Dialog öffnen",
      "Popup oder Menü",
      "Tooltip",
      "Befehlspalette",
    ],
    dialogs: [
      "modalen Dialog öffnen",
      "Vollbild-Dialog",
      "beim Klick auf den Hintergrund schliessen",
      "Schliessen animieren",
      "Popup-Fenster",
      "Dialog auf dem Smartphone",
    ],
    "confirm-floating": [
      "vor dem Löschen nachfragen",
      "Bestätigungsdialog",
      "window.confirm ersetzen",
      "Sicherheitsabfrage",
      "schwebender Aktionsbutton",
      "Panel in einer Ecke angedockt",
      "Chat- oder Hilfe-Panel",
    ],
    "floating-actions": [
      "schwebende Status-Pille",
      "Statusänderung ansagen",
      "Offline-Anzeige",
      "Tooltip an schwebendem Button",
      "Umschalter in einer Ecke",
      "Badge mit Zähler",
      "schwebende Werkzeugleiste",
    ],
    popovers: [
      "Tooltip beim Überfahren",
      "Popover an einem Button",
      "Menü beim Überfahren",
      "Dropdown-Menü",
      "Popup neben einem Element positionieren",
      "Icon erklären",
    ],
    tour: [
      "geführte Tour",
      "Onboarding-Rundgang",
      "Element hervorheben",
      "Schritt-für-Schritt-Einführung",
      "auf einen Klick des Nutzers warten",
      "Produkttour für neue Nutzer",
    ],
    "command-palette": [
      "Befehlspalette",
      "globale Suche",
      "Tastenkürzel für die Suche",
      "zu einer Seite springen",
      "fehlertolerante Suche",
      "Schnellaktionen",
      "Suchergebnisse vom Server",
    ],
    "swipeable-row": [
      "Zeile zum Löschen wischen",
      "Aktionen durch Wischen einblenden",
      "Wischen auf dem Smartphone",
      "durch Wischen archivieren",
      "Aktionen für Listenzeilen",
    ],
    "app-chrome": [
      "App-Layout",
      "Seitenleiste und obere Leiste",
      "Einstellungsseite",
      "einen Abonnement-Tarif wählen",
      "Feedback von Nutzern sammeln",
    ],
    "page-structure": [
      "Seitentitel mit Aktionen",
      "Seitenkopf",
      "Pfadnavigation",
      "Pfadnavigation auf dem Handy",
      "kleine Abschnittsüberschrift in Grossbuchstaben",
      "Hinweistext unter einem Feld",
      "Statuspunkt",
      "Online-Anzeige",
      "Ungelesen-Punkt am Avatar",
      "Legendenfarbe",
      "Links als umbrechende Pillen",
    ],
    shell: [
      "App-Layout mit Seitenleiste",
      "obere Leiste",
      "Navigationsmenü",
      "untere Navigation auf dem Smartphone",
      "Inhaltsverzeichnis",
      "Theme umschalten",
      "Sprachmenü",
      "Seitenleiste einklappen",
      "Kontomenü mit Avatar",
    ],
    settings: [
      "Kontoeinstellungen",
      "Passwort ändern",
      "Zwei-Faktor-Authentifizierung",
      "Profil bearbeiten",
      "Theme wählen",
      "Sprache wählen",
      "Benutzereinstellungen",
      "Einstellungsseite mit Seitenleiste bauen",
      "Einstellungen auf dem Smartphone als Liste zeigen",
      "direkt auf eine Einstellung verlinken",
      "Einstellungen durchsuchen",
      "Admin-Seite im selben Layout",
      "Sprache dem Konto folgen lassen",
    ],
    wizard: [
      "mehrstufiges Formular",
      "Stepper",
      "Assistent mit Prüfschritt",
      "zwischen Schritten vor und zurück",
      "Onboarding-Ablauf",
      "Zusammenfassung vor dem Absenden",
    ],
    "feedback-compose": [
      "Feedback von Nutzern sammeln",
      "Fehler melden",
      "Screenshot anhängen",
      "Feedback-Formular",
      "Vorschlag senden",
    ],
    "feedback-inbox": [
      "Feedback-Meldungen verwalten",
      "Status-Workflow für Feedback",
      "Fehlermeldungen sichten",
      "Support-Posteingang",
      "Status einer Meldung ändern",
    ],
    api: [
      "Hooks und Hilfsfunktionen",
      "Funktionen ohne Oberfläche",
      "Utility-Funktionen",
      "Konstanten",
      "Datums-Hilfsfunktionen",
    ],
    "hooks-lib": [
      "auf Bildschirmgrösse reagieren",
      "Hook für Media Queries",
      "Overlay mit der Zurück-Taste schliessen",
      "Panel neben dem Auslöser positionieren",
      "Klassennamen zusammenführen",
      "Smartphone erkennen",
    ],
    "clipboard-timing": [
      "in die Zwischenablage kopieren",
      "Kopier-Button mit Bestätigung",
      "Eingabe entprellen",
      "warten, bis der Nutzer aufhört zu tippen",
      "Suchanfrage verzögern",
      "Callback drosseln",
    ],
    helpers: [
      "mit Datumswerten rechnen",
      "heutiges Datum als ISO",
      "Zeitraum-Vorlagen",
      "mathematischen Ausdruck auswerten",
      "Liste der Währungen",
      "letzte volle Monate",
      "Klassennamen für Felder",
    ],
    // The Server kit group (0.31).
    "server-kit": [
      "Doku zum Backend-Paket",
      "server-kit installieren",
      "welches server-kit-Release dokumentiert ist",
      "Python-Verträge für das Backend",
      "Serverseite einer Komponente finden",
    ],
    "server-auth": [
      "Anmeldung auf dem Server prüfen",
      "Registrierung nur mit Einladung",
      "Token zum Zurücksetzen des Passworts erzeugen",
      "Claims des Sitzungs-Tokens",
      "E-Mail-Adresse normalisieren",
      "Fehlercodes der Anmeldung",
    ],
    "server-user-admin": [
      "Benutzerliste auf dem Server abfragen",
      "Bestätigungsstufe einer Admin-Aktion",
      "Audit-Eintrag einer Admin-Aktion schreiben",
      "Konto in zwei Stufen löschen",
      "Daten eines Benutzers exportieren",
      "nie den letzten Admin entfernen",
    ],
    "server-settings": [
      "Einstellungen patchen, ohne Felder zu verlieren",
      "Einstellung mit null leeren",
      "unbekannte Felder im Body ablehnen",
      "Sprache des Kontos speichern",
      "Accept-Language-Header lesen",
    ],
    "server-demo": [
      "Demo-Sitzung starten",
      "Einstellungen des Demokontos",
      "Demo schreibgeschützt machen",
      "Ablehnungscodes der Demo",
      "alte Demo-Benutzer aufräumen",
    ],
    "server-billing": [
      "Tariflimit auf dem Server prüfen",
      "Webhook-Signatur prüfen",
      "Ereignisse von Paddle und Lemon Squeezy verarbeiten",
      "ist das Abonnement in Ordnung",
      "Enddaten von Testphase und Beta",
      "Schreibzugriffe nach Ablauf des Abonnements ablehnen",
      "Tarifkatalog mit Preisen",
    ],
    "server-mail": [
      "E-Mail zum Zurücksetzen des Passworts senden",
      "Konto-E-Mails in der Vorschau",
      "E-Mail-Texte pro Sprache",
      "E-Mail über Resend senden",
      "E-Mails in der Entwicklung protokollieren",
      "Support-Adresse als Antwortadresse",
    ],
    "server-feedback": [
      "Feedback-Meldung validieren",
      "Statusregeln für Feedback",
      "Absturzbericht erfassen",
      "Typ einer hochgeladenen Datei prüfen",
      "Grösse von Anhängen begrenzen",
      "Feedback eines gelöschten Benutzers löschen",
    ],
    "server-limits": [
      "Rate-Limit für eine Route",
      "Client-IP hinter einem Proxy",
      "Retry-After-Header senden",
      "Kit-Fehler auf HTTP-Status abbilden",
      "zusätzlichen CORS-Origin erlauben",
      "Fehlerantwort mit Code",
    ],
    "server-translation-review": [
      "Übersetzungen über die API prüfen",
      "Prüf-Token ausstellen",
      "wer welche Sprache prüfen darf",
      "Urteile der Übersetzungsprüfung",
      "Übersetzungsschlüssel des Kits",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_DE_CH,
};
