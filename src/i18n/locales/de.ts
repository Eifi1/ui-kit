import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's words in German: every namespace of {@link UiKitLabels}, for
 * `<UiKitProvider labels={UI_KIT_LABELS_DE}>`.
 *
 * Self-contained on purpose — nothing but the kit's own `formatFileSize` — so it works
 * as a starting point to copy and adjust. Counts and sizes are formatted with
 * `de-DE` digits; {@link uiKitLabelsDe} takes another number locale
 * (e.g. `"de-CH"` for 1’234) without touching the words.
 */
export function uiKitLabelsDe(numberLocale = "de-DE"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);

  return {
    feedbackAttachment: {
      attachmentAdd: "Bild anhängen",
      attachmentCapture: "Screenshot aufnehmen",
      attachmentPaste: "…oder einen Screenshot aus der Zwischenablage einfügen.",
      attachmentRemove: "Anhang entfernen",
    },
    measuredGrid: {
      view: "Tabellenansicht",
      cellsView: "Zellen",
      textView: "Text",
      addRow: "Zeile hinzufügen",
      removeRow: (row) => `Zeile ${row} entfernen`,
      clear: "Tabelle leeren",
      pasteHint: "Einen Block aus einer Tabellenkalkulation in eine beliebige Zelle einfügen",
      cell: (column, row) => `${column}, Zeile ${row}`,
      rowNumber: "Zeile",
      rowActions: "Zeilenaktionen",
      keyboardHint:
        "Pfeiltasten wechseln zwischen Zellen. Tippen ersetzt eine Zelle, F2 bearbeitet sie, Escape macht die Bearbeitung rückgängig. Enter geht nach unten und fügt am Ende eine Zeile hinzu.",
      lineError: (line) => `Zeile ${line} konnte nicht gelesen werden`,
      points: (count) => (count === 1 ? "1 Punkt" : `${count} Punkte`),
      problems: (count) =>
        count === 1 ? "1 Zelle ist keine Zahl" : `${count} Zellen sind keine Zahlen`,
    },
    pageContents: { title: "Auf dieser Seite" },
    common: {
      dismiss: "Schließen",
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
      apply: "Übernehmen",
      cancel: "Abbrechen",
      presets: "Schnellauswahl",
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
      loadError: "Ergebnisse konnten nicht geladen werden",
      resultCount: (count) => `${n(count)} ${count === 1 ? "Ergebnis" : "Ergebnisse"}`,
      // "Zeichen" is the same in singular and plural.
      minChars: (count) => `Mindestens ${n(count)} Zeichen eingeben`,
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
    swatchPicker: {
      none: "Keine Farbe",
      mixed: "Gemischt: Die ausgewählten Elemente haben unterschiedliche Farben",
    },
    iconPicker: {
      none: "Kein Symbol",
      mixed: "Gemischt: Die ausgewählten Elemente haben unterschiedliche Symbole",
      search: "Symbole suchen",
      noResults: "Keine passenden Symbole",
      resultCount: (count) => `${n(count)} ${count === 1 ? "Symbol" : "Symbole"}`,
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
    dangerConfirm: {
      arm: "Löschen…",
      confirm: "Löschen",
      cancel: "Abbrechen",
      prompt: "Dies kann nicht rückgängig gemacht werden.",
      password: "Passwort",
      phrase: (phrase) => `Geben Sie zur Bestätigung „${phrase}“ ein`,
    },
    tabs: {
      // "Tab" is what German UIs say; "Registerkarte" reads like a 1990s manual.
      add: "Tab hinzufügen",
      remove: (tab) => `${tab} entfernen`,
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
    dialogFrame: {
      close: "Schließen",
    },
    swipeableRow: {
      actions: "Zeilenaktionen",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      dropzone: "Datei-Upload",
      browse: "Durchsuchen",
      empty: "Datei hier ablegen",
      emptyMultiple: "Dateien hier ablegen",
      hint: (accept) => (accept ? `Erlaubt: ${accept}` : "Beliebiger Dateityp"),
      busy: "Wird hochgeladen…",
      rejectedPick: (count) =>
        count === 1
          ? "Die Datei wurde nicht hinzugefügt"
          : `Keine der ${count} Dateien wurde hinzugefügt`,
      rejectedType: (name) => `„${name}“ hat einen nicht unterstützten Dateityp`,
      rejectedTypeOnly: (accept) => `Nur ${accept}-Dateien`,
      rejectedSize: (name, maxSize) => `„${name}“ ist größer als ${maxSize}`,
      rejectedCount: (name, maxFiles) =>
        `„${name}“ wurde nicht hinzugefügt: höchstens ${n(maxFiles)} ${maxFiles === 1 ? "Datei" : "Dateien"}`,
      rejectedInvalid: (name) => `„${name}“ kann hier nicht verwendet werden`,
      rejectedMany: (count) =>
        count === 1
          ? "1 Datei wurde nicht hinzugefügt"
          : `${n(count)} Dateien wurden nicht hinzugefügt`,
      selected: (count, firstName) =>
        count === 1 ? `„${firstName}“ ausgewählt` : `${n(count)} Dateien ausgewählt`,
      remove: (name) => `„${name}“ entfernen`,
      clearAll: "Alle Dateien entfernen",
      removed: (name) => `„${name}“ entfernt`,
      cleared: "Alle Dateien entfernt",
    },
    wizard: {
      done: "Fertig",
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
      clear: "Suche löschen",
      submit: "Suchen",
      close: "Schließen",
      placeholder: "Suchen…",
      empty: "Keine Ergebnisse",
      loading: "Wird gesucht…",
      dialog: "Suche",
      error: "Die Suche ist fehlgeschlagen. Bitte erneut versuchen.",
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
      viewEmpty: "Nicht unterschrieben",
      viewDrawn: "Handschriftliche Unterschrift",
      viewTyped: (name) => `Unterschrieben mit dem eingegebenen Namen ${name}`,
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
    confirmDialog: {
      confirm: "Bestätigen",
      cancel: "Abbrechen",
    },
    floatingPanel: {
      close: "Schließen",
    },
    copyButton: {
      copy: "Kopieren",
      copied: "Kopiert",
      failed: "Kopieren fehlgeschlagen",
      copiedAnnouncement: "In die Zwischenablage kopiert",
      failedAnnouncement: "Kopieren in die Zwischenablage fehlgeschlagen",
    },
  };
}

export const UI_KIT_LABELS_DE: UiKitLabels = uiKitLabelsDe();
