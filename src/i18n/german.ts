import { formatFileSize } from "./kit-labels";
import type { UiKitLabels } from "./kit-labels";

/**
 * The kit's German, formal ("Sie"), written in standard spelling with "ß" — the SOURCE
 * the public `de-CH` catalogue is derived from (via `swiss()`), not a catalogue itself.
 *
 * Internal on purpose: it lives outside `src/i18n/locales/` because every file there is
 * a public `@eifi1/ui-kit/i18n/<code>` subpath, and the kit ships ONE German — Swiss,
 * formal (0.18.0 removed `/i18n/de`, `/i18n/de-informal` and `/i18n/de-CH-informal`).
 * The text stays written with "ß" because `swiss()` respells at runtime, so a Swiss app
 * also gets an argument it passes in (a file name, a phrase to type) respelled; writing
 * "ss" here instead would change that behaviour for every function label.
 *
 * Counts and sizes are formatted with `numberLocale`'s digits; the words never change.
 */
export function germanLabels(numberLocale: string): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);
  // 0.30.0 — a throttled request (HTTP 429), as `englishRateLimited` in
  // src/auth/auth-errors.ts: no wait → "einen Moment", under a minute → seconds, else
  // minutes rounded up. kastlan's reviewed "auth.throttled" is the sentence without one.
  const wait = (seconds: number) =>
    seconds < 60 ? `${n(Math.ceil(seconds))} s` : `${n(Math.ceil(seconds / 60))} min`;
  const rateLimited = (seconds?: number) =>
    !seconds || seconds <= 0
      ? "Zu viele Versuche. Bitte warten Sie einen Moment und versuchen Sie es dann noch einmal."
      : `Zu viele Versuche. Versuchen Sie es in ${wait(seconds)} erneut.`;

  return {
    feedbackAttachment: {
      attachmentAdd: "Anhang hinzufügen",
      attachmentCapture: "Screenshot aufnehmen",
      attachmentPaste:
        "…oder einen Screenshot direkt aus der Zwischenablage einfügen — so lässt sich ein Ausschnitt zeigen statt der ganzen Seite.",
      attachmentRemove: "Anhang entfernen",
      attachmentList: "Anhänge",
      attachmentScreenshot: "Screenshot",
      attachmentRemoveFile: (name) => `${name} entfernen`,
      attachmentLimit: (max) =>
        max === 1
          ? `Höchstens ${n(max)} Anhang – entfernen Sie ihn, um einen weiteren hinzuzufügen.`
          : `Höchstens ${n(max)} Anhänge – entfernen Sie einen, um einen weiteren hinzuzufügen.`,
      attachmentUploading: "Wird hochgeladen…",
      attachmentUploadFailed: (name) => `„${name}“ konnte nicht hochgeladen werden`,
    },
    feedbackDialog: {
      title: "Feedback senden",
      category: "Kategorie",
      subject: "Betreff",
      body: "Was ist passiert?",
      bodyOptional: "Was ist passiert? (optional)",
      attachment: "Anhang",
      // keksdose's "Strg+Enter zum Senden"; Apple's ⌘ as `form.submitShortcut` writes it.
      submitHint: (apple) => (apple ? "⌘ Enter zum Senden" : "Strg+Enter zum Senden"),
      cancel: "Abbrechen",
      save: "Senden",
    },
    feedbackThread: {
      thread: "Kommentare",
      empty: "Noch keine Kommentare",
      loading: "Kommentare werden geladen…",
      // The reader's own messages. "Ich" rather than "Sie": it reads the same whether
      // the app addresses its users with "Sie" or "du", so neither has to override it.
      you: "Ich",
      staff: "Team",
      attachments: "Anhänge",
    },
    feedbackComposer: {
      field: "Kommentar schreiben",
      placeholder: "Kommentar schreiben…",
      send: "Senden",
      // German keyboards label the key "Strg".
      sendHint: (modifier) => `${modifier === "Ctrl" ? "Strg" : modifier} + Enter zum Senden`,
      // "Umschalt", the German key label, as in the table's sort hint.
      sendHintEnter: "Enter zum Senden, Umschalt + Enter für neue Zeile",
    },
    // 0.27.0 — keksdose's de-CH wording is the canon (docs/feedback-harmonization.md §4),
    // written here with "ß" like the rest of this source; `swiss()` makes it "grösser".
    feedbackStatus: {
      OPEN: "Offen",
      READY: "Bereit zur Umsetzung",
      IN_PROGRESS: "In Bearbeitung",
      IN_EVALUATION: "Zur Prüfung",
      NEEDS_LIVE_TEST: "Live testen",
      POSTPONED: "Zurückgestellt",
      DONE: "Erledigt",
      WONT_DO: "Wird nicht umgesetzt",
    },
    feedbackCategory: {
      CRASH: "Absturz",
      BUG: "Fehler",
      IDEA: "Idee",
      QUESTION: "Frage",
      OTHER: "Sonstiges",
    },
    feedbackToast: {
      submitted: "Danke für Ihr Feedback!",
      submitFailed: "Feedback konnte nicht gesendet werden",
      attachmentUnsupported: "Nur Bilder, PDF- oder Textdateien sind erlaubt",
      attachmentTooLarge: "Datei ist größer als 10 MB",
      attachmentTooMany: (count) =>
        count === 1
          ? "Es passt nur 1 Anhang – die übrigen wurden weggelassen."
          : `Es passen nur ${n(count)} Anhänge – die übrigen wurden weggelassen.`,
      captureFailed: "Screenshot konnte nicht aufgenommen werden",
      updateFailed: "Änderung konnte nicht gespeichert werden.",
      statusChanged: (status, title) => `Auf „${status}“ gesetzt: ${title}`,
      statusUndo: "Rückgängig",
      statusRestored: (status, title) => `Zurück auf „${status}“: ${title}`,
    },
    feedbackMenu: {
      trigger: "Feedback senden",
      myFeedback: "Mein Feedback",
      viewFeedback: "Feedback ansehen",
    },
    feedbackContext: {
      user: "Nutzer",
      attachUrl: "Aktuelle Seiten-URL anhängen",
    },
    feedbackPage: {
      title: "Feedback",
      myTitle: "Mein Feedback",
      columnId: "#",
      columnDate: "Datum",
      columnCategory: "Kategorie",
      columnSubject: "Betreff",
      columnUser: "Nutzer",
      columnEmail: "E-Mail",
      columnUrl: "URL",
      columnStatus: "Status",
      columnResolved: "Erledigt am",
      openPage: "Seite öffnen",
      empty: "Keine",
      deletedUser: "<gelöschter Nutzer>",
      // An id, not a count: printed as it is, like the "#" column.
      userFallback: (id) => `Nutzer #${id}`,
      environment: (environment) => String(environment ?? "").toUpperCase(),
      reworkChip: (count) => (count === 1 ? "Nacharbeit" : `Nacharbeit ×${n(count)}`),
      awaitingFilter: "Nur was auf Sie wartet",
      phoneActions: "Feedback-Aktionen",
    },
    feedbackDetail: {
      subject: "Betreff",
      body: "Beschreibung",
      edit: "Bearbeiten",
      editDescription: "Beschreibung bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      url: "URL",
      copyUrl: "URL kopieren",
      attachment: "Anhang",
      download: (name) => `${name} herunterladen`,
      downloadFailed: "Der Anhang konnte nicht heruntergeladen werden.",
      outcome: "Ergebnis",
      resolvedAt: (date) => `Erledigt am: ${date}`,
      outcomeAdd: "Ergebnis hinzufügen",
      outcomeUpdate: "Aktualisieren",
      outcomePlaceholder: "Was wurde umgesetzt, entschieden oder warum nicht.",
      rework: "Nacharbeit",
      openPage: "Seite öffnen",
      reworkTitle: "Zur Nacharbeit senden",
      reworkSend: "Nacharbeit senden",
      reworkPlaceholder: "Was muss noch angepasst werden? Neue Anforderungen oder Richtungswechsel.",
      reworkUploadFailed: "Die Datei konnte nicht hochgeladen werden. Die Nacharbeit wurde nicht gesendet.",
      status: "Status",
    },
    accountSettings: {
      profile: {
        title: "Profil",
        email: "E-Mail",
        role: "Rolle",
        memberSince: "Mitglied seit",
        displayName: "Anzeigename",
        save: "Speichern",
        firstName: "Vorname",
        lastName: "Nachname",
        nameRequired: "Geben Sie Vor- und Nachnamen ein.",
      },
      password: {
        title: "Passwort ändern",
        current: "Aktuelles Passwort",
        next: "Neues Passwort",
        confirm: "Neues Passwort bestätigen",
        submit: "Passwort ändern",
        tooShort: "Das neue Passwort ist zu kurz.",
        mismatch: "Die Passwörter stimmen nicht überein.",
      },
      twoFactor: {
        status: "Zwei-Faktor-Authentifizierung",
        enabledText: "Aktiv",
        disabledText: "Inaktiv",
        enable: "Zwei-Faktor-Authentifizierung einrichten",
        scanHint: "Diesen Code mit der Authenticator-App scannen und den angezeigten Code eingeben.",
        codeLabel: "Bestätigungscode",
        verify: "Bestätigen und aktivieren",
        disableSection: "Zwei-Faktor-Authentifizierung deaktivieren",
        password: "Aktuelles Passwort",
        disable: "Deaktivieren",
        qrAlt: "QR-Code für die Authenticator-App",
        secretHint: "Scannen nicht möglich? Stattdessen diesen Schlüssel in der App eingeben:",
        copySecret: "Schlüssel kopieren",
      },
      passkeys: {
        title: "Passkeys",
        description: "Mit Fingerabdruck, Gesichtserkennung oder Geräte-PIN statt Passwort anmelden.",
        descriptionAlongside: "Mit Fingerabdruck, Gesichtserkennung oder Geräte-PIN anmelden. Das Passwort funktioniert weiterhin.",
        empty: "Noch keine Passkeys",
        loading: "Passkeys werden geladen…",
        list: "Registrierte Passkeys",
        nameLabel: "Name (optional)",
        namePlaceholder: "z. B. Laptop, Handy",
        add: "Passkey hinzufügen",
        adding: "Warten auf das Gerät…",
        rename: "Umbenennen",
        renameItem: (name) => `${name} umbenennen`,
        renameField: (name) => `Neuer Name für ${name}`,
        save: "Speichern",
        cancel: "Abbrechen",
        delete: "Löschen",
        deleteItem: (name) => `${name} löschen`,
        deleteConfirm: (name) => `„${name}“ löschen? Eine Anmeldung damit ist dann nicht mehr möglich.`,
        confirmDelete: "Passkey löschen",
        created: (date) => `Hinzugefügt am ${date}`,
        lastUsed: (date) => `Zuletzt verwendet am ${date}`,
        neverUsed: "Noch nie verwendet",
      },
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
      opensInNewTab: "öffnet in einem neuen Tab",
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
      empty: "Keine Einträge",
      actions: "Aktionen",
      edit: "Bearbeiten",
      delete: "Löschen",
      booleanTrue: "Ja",
      booleanFalse: "Nein",
      booleanUnset: "Nicht festgelegt",
      sortBy: "Sortieren nach",
      sortDefault: "Standardreihenfolge",
      sortAscending: "Aufsteigend",
      sortDescending: "Absteigend",
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
    calendarHeatmap: {
      grid: "Tageswerte",
      day: (date, value) => `${date}: ${value}`,
      less: "Weniger",
      more: "Mehr",
      truncated: (count) =>
        `Die neuesten Tage werden angezeigt; ${n(count)} ${count === 1 ? "früherer Tag wird" : "frühere Tage werden"} nicht angezeigt.`,
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
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      today: "Heute",
      yearPanel: "Jahr wählen",
      earlierYears: "Frühere Jahre",
      laterYears: "Spätere Jahre",
      thisYear: "Dieses Jahr",
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
      acknowledge: "Ich habe gelesen, was dies bewirkt, und möchte fortfahren.",
      needsPhrase: (phrase) => `Geben Sie zur Bestätigung „${phrase}“ ein`,
      needsAcknowledge: "Setzen Sie zur Bestätigung das Häkchen",
      needsPassword: "Geben Sie zur Bestätigung Ihr Passwort ein",
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
    bulkActionBar: {
      selected: (count) => `${n(count)} ausgewählt`,
      clear: "Auswahl aufheben",
      cleared: "Auswahl aufgehoben",
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
    globalSearch: {
      trigger: "Suche",
      placeholder: "Suchen oder springen zu…",
      shortcut: (keys) => `Suche (${keys})`,
      suggestions: "Vorschläge",
      results: "Ergebnisse",
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
      points: "Diagrammwerte",
    },
    pieChart: {
      slices: "Diagrammsegmente",
      slice: (label, value, percent) => `${label}: ${value} (${percent})`,
      total: "Gesamt",
      empty: "Keine Daten",
      legend: "Kategorien",
    },
    confirmDialog: {
      confirm: "Bestätigen",
      cancel: "Abbrechen",
      typed: (text) => `Geben Sie zur Bestätigung „${text}“ ein`,
    },
    floatingPanel: {
      close: "Schließen",
      badge: (count) => `${n(count)} neu`,
    },
    copyButton: {
      copy: "Kopieren",
      copied: "Kopiert",
      failed: "Kopieren fehlgeschlagen",
      copiedAnnouncement: "In die Zwischenablage kopiert",
      failedAnnouncement: "Kopieren in die Zwischenablage fehlgeschlagen",
    },
    list: {
      unread: "Ungelesen",
      opensInNewTab: "öffnet in einem neuen Tab",
    },
    breadcrumbs: {
      label: "Brotkrümelnavigation",
      showAll: "Vollständigen Pfad anzeigen",
    },
    toast: {
      close: "Benachrichtigung schließen",
      notifications: "Benachrichtigungen",
      undo: "Rückgängig",
      redo: "Wiederholen",
    },
    form: {
      save: "Speichern",
      cancel: "Abbrechen",
      // German keyboards label the key "Strg"; Apple's ⌘ is the same everywhere.
      submitShortcut: (apple) => (apple ? "⌘ Enter" : "Strg+Enter"),
    },
    descriptionList: {
      empty: "—",
    },
    lineItems: {
      add: "Zeile hinzufügen",
      remove: (row) => `Zeile ${row} entfernen`,
      confirmRemove: (row) => `Zeile ${row} entfernen? Zum Bestätigen erneut drücken`,
      row: (row) => `Zeile ${row}`,
      cell: (column, row) => `${column}, Zeile ${row}`,
      totals: "Summe",
    },
    progressBar: {
      unlimited: "Unbegrenzt",
      overLimit: (amount) => `${amount} über dem Limit`,
    },
    signedAmount: {
      positive: (amount) => `plus ${amount}`,
      negative: (amount) => `minus ${amount}`,
    },
    errorBoundary: {
      title: "Etwas ist schiefgelaufen",
      message: "Dieser Teil der Seite konnte nicht angezeigt werden. Bitte erneut versuchen oder die Seite neu laden.",
      retry: "Erneut versuchen",
      details: "Fehlerdetails",
      reload: "Neu laden",
      updateTitle: "Eine neue Version ist verfügbar",
      updateMessage: "Ein Teil der App hat sich seit dem Laden dieser Seite geändert. Zum Aktualisieren die Seite neu laden.",
      offlineTitle: "Keine Internetverbindung",
      offlineMessage: "Diese Seite konnte ohne Verbindung nicht geladen werden. Nach dem Wiederherstellen der Verbindung die Seite neu laden.",
      copyReport: "Fehlerbericht kopieren",
      reported: "Der Fehler wurde automatisch gemeldet.",
      reportedAs: (reference) => `Gemeldet unter ${reference}`,
    },
    authedImage: {
      loading: "Bild wird geladen…",
      loadError: "Bild konnte nicht geladen werden",
      failedImage: (alt) => `${alt}: Bild konnte nicht geladen werden`,
    },
    imageGrid: {
      list: "Bilder",
      item: (index, count) => `Bild ${n(index)} von ${n(count)}`,
      actions: (name) => `Aktionen für ${name}`,
    },
    lightbox: {
      dialog: "Bildansicht",
      close: "Schließen",
      previous: "Vorheriges Bild",
      next: "Nächstes Bild",
      counter: (index, count) => `${n(index)} / ${n(count)}`,
      position: (index, count) => `Bild ${n(index)} von ${n(count)}`,
      download: "Herunterladen",
      zoom: "Zoomen",
      noPreview: "Für diese Datei ist keine Vorschau verfügbar",
      openInNewTab: "In neuem Tab öffnen",
    },
    writeLock: {
      // Impersonal, like the rest of this catalogue where it can be: an app that
      // addresses its users with "du" then has fewer keys to override.
      reason: "Nur zum Ansehen – Änderungen sind hier nicht möglich.",
    },
    accountState: {
      active: "Aktiv",
      inactive: "Inaktiv",
      invited: "Eingeladen",
      registered: "Registriert",
      unverified: "Nicht bestätigt",
      passwordChange: "Passwortänderung erforderlich",
      deletion: "Löschung beantragt",
      deletionOn: (date) => `Löschung am ${date}`,
    },
    shareCard: {
      dialogTitle: "Teilen",
      close: "Schließen",
      email: "E-Mail-Adresse",
      emailOptional: "E-Mail-Adresse (optional)",
      // example.com is reserved for examples (RFC 2606); a German-looking domain is
      // somebody's real one.
      emailPlaceholder: "name@example.com",
      invalidEmail: "Bitte eine vollständige E-Mail-Adresse eingeben.",
      role: "Rolle",
      roleOf: (name) => `Rolle von ${name}`,
      add: "Teilen",
      whoHasAccess: "Wer hat Zugriff",
      nobodyYet: "Bisher hat niemand sonst Zugriff.",
      pending: "Ausstehend",
      openInvite: "Offener Einladungslink",
      copyLink: "Link kopieren",
      team: "Team",
      teamHint: (name) => `Alle in ${name} erhalten Zugriff.`,
      remove: "Zugriff entfernen",
      removeConfirm: (name) => `Zugriff für ${name} entfernen?`,
      revokePending: "Einladung zurückziehen",
      revokePendingConfirm: (name) => `Einladung für ${name} zurückziehen?`,
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
      loading: "Wird geladen…",
    },
    reauthDialog: {
      title: "Identität bestätigen",
      description: "Zum Fortfahren das aktuelle Passwort eingeben.",
      password: "Aktuelles Passwort",
      submit: "Weiter",
      cancel: "Abbrechen",
    },
    serverWake: {
      slow: "Lädt noch – das dauert länger als sonst.",
      waking: (appName) =>
        `Der Server schläft ein, wenn ${appName ?? "die App"} gerade niemand benutzt. Die erste Anfrage nach einer Pause muss ihn erst wieder starten. Das kann einen Moment dauern – es geht nichts verloren, die Seite füllt sich von selbst.`,
    },
    // 0.28.0 — docs/legal-harmonization.md §4.3/§4.4: keksdose's reviewed de-CH wording,
    // and Kurvenschmiede's for the browser section and the beta notice. None of it needs
    // a "ß", so `swiss()` leaves it as the apps wrote it.
    legal: {
      navLabel: "Rechtliches",
      links: {
        impressum: "Impressum",
        privacy: "Datenschutz",
        terms: "Nutzungsbedingungen",
      },
      titles: {
        impressum: "Impressum",
        privacy: "Datenschutzerklärung",
        terms: "Nutzungsbedingungen",
      },
      backHome: "Zurück zur Startseite",
      accept: "Ich akzeptiere die {terms} und die {privacy}",
      notice: {
        beta: "Geschlossene Beta. Diese Texte sind noch nicht anwaltlich geprüft; das geschieht vor einem öffentlichen Start.",
        privacy:
          "Geschlossene Beta. Die rechtlichen Formulierungen unten sind noch nicht anwaltlich geprüft; das geschieht vor einem öffentlichen Start. Die technischen Angaben — was gespeichert wird, wo, und wer es lesen kann — beschreiben, was die Software heute tatsächlich tut, und sind ausdrücklich dazu da, daran überprüft zu werden.",
      },
      translation: {
        note: (o) =>
          `Dies ist eine Übersetzung zu Ihrer Information. Massgebend ist die Fassung auf ${o.bindingLanguage}.`,
        show: (o) => `Fassung auf ${o.bindingLanguage} anzeigen`,
      },
      sections: {
        impressum: {
          operator: {
            title: "Betreiber",
            body: (o) =>
              `${o.name}\n${o.postalCode} ${o.city}\n${o.country}\n\nDie vollständige Postanschrift wird auf Anfrage an alle Personen mit berechtigtem rechtlichem Interesse herausgegeben; wenden Sie sich dazu an die unten genannte Kontaktadresse.`,
          },
          contact: {
            title: "Kontakt",
            body: (o) => `E-Mail: ${o.email}`,
          },
          disclaimer: {
            title: "Haftung für Inhalte und Links",
            body: "Dies ist ein privates, nicht-kommerzielles Projekt, das im Rahmen einer geschlossenen Beta ohne Gewähr bereitgestellt wird. Für verlinkte externe Websites sind deren Betreiber verantwortlich; auf deren Inhalte haben wir keinen Einfluss.",
          },
        },
        privacy: {
          controller: {
            title: "Verantwortlicher",
            body: (o) =>
              `Verantwortlich für die Verarbeitung personenbezogener Daten in diesem Dienst ist:\n${o.name}\n${o.postalCode} ${o.city}, ${o.country}\nE-Mail: ${o.email}\n\nDie vollständige Postanschrift wird betroffenen Personen und Aufsichtsbehörden auf Anfrage mitgeteilt.`,
          },
          legal_basis: {
            title: "Rechtsgrundlage",
            body: "Da der Betreiber in der Schweiz ansässig ist, richtet sich die Verarbeitung nach dem Schweizer Datenschutzgesetz (DSG). Soweit die EU-Datenschutz-Grundverordnung (DSGVO) auf Sie anwendbar ist, stützen wir uns auf die Vertragserfüllung zur Bereitstellung des Dienstes (Art. 6 Abs. 1 lit. b DSGVO) und unser berechtigtes Interesse am Betrieb und an der Sicherheit des Dienstes (Art. 6 Abs. 1 lit. f DSGVO).",
          },
          browser: {
            title: "Was Ihr Browser speichert",
            lead: "Keine Cookies. Die App legt Folgendes im Speicher Ihres Browsers ab:",
            tail: "Nichts davon dient dazu, Sie zu verfolgen. Noch nicht gesendete Einträge werden an uns übermittelt, sobald das möglich ist; alles andere bleibt auf Ihrem Gerät. Das alles verschwindet, wenn Sie die Websitedaten löschen, und beim Abmelden werden die Anmeldetoken entfernt.",
          },
          rights: {
            title: "Ihre Rechte",
            lead: "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.",
            tail: "In der Schweiz können Sie sich an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden; in der EU können Sie sich bei Ihrer zuständigen Aufsichtsbehörde beschweren.",
          },
          contact: {
            title: "Kontakt zum Datenschutz",
            body: (o) => `Für Datenschutzanfragen wenden Sie sich an: ${o.email}`,
          },
        },
        terms: {
          warranty: {
            title: "Keine Gewährleistung",
            body: "Der Dienst wird im gesetzlich zulässigen Rahmen „wie besehen“ und „wie verfügbar“ ohne jegliche Gewährleistung bereitgestellt. Als Beta kann er Fehler enthalten, sich ändern oder jederzeit unterbrochen werden – bewahren Sie eigene Sicherungskopien wichtiger Daten auf.",
          },
          liability: {
            title: "Haftungsbeschränkung",
            body: "Soweit gesetzlich zulässig, haftet der Betreiber nicht für indirekte Schäden oder Folgeschäden, die aus der Nutzung oder Nichtnutzbarkeit des Dienstes entstehen. Eine Haftung, die gesetzlich nicht ausgeschlossen werden kann, bleibt unberührt.",
          },
          changes: {
            title: "Änderungen dieser Bedingungen",
            body: "Diese Bedingungen können im Zuge der Weiterentwicklung des Dienstes angepasst werden. Wesentliche Änderungen werden per E-Mail oder in der App angekündigt; die weitere Nutzung nach einer Änderung gilt als Zustimmung.",
          },
          language: {
            title: "Sprache",
            body: (o) =>
              `Diese Bedingungen sind auf ${o.bindingLanguage} verfasst. Übersetzungen in andere Sprachen dienen nur der Information; weicht eine Übersetzung ab, ist die Fassung auf ${o.bindingLanguage} massgebend.`,
          },
          law: {
            title: "Anwendbares Recht",
            body: (o) =>
              `Es gilt schweizerisches Recht unter Ausschluss des Kollisionsrechts. Soweit gesetzlich zulässig, ist Gerichtsstand ${o.city} (${o.region}), ${o.country}.`,
          },
        },
      },
    },
    // 0.29.0 — docs/auth-harmonization.md: keksdose's reviewed de-CH wording (auth.*,
    // verify_email, error.not_found_*, budget_share.join_*), kastlan's for the names and
    // the 2FA prompt; written fresh where neither app had the sentence. Formal "Sie".
    signIn: {
      email: "E-Mail",
      password: "Passwort",
      submit: "Anmelden",
      passkey: "Mit Passkey anmelden",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Noch kein Konto?",
      register: "Registrieren",
      invalidCredentials: "Die E-Mail-Adresse oder das Passwort ist falsch.",
      failed: "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
      passkeyFailed: "Passkey-Anmeldung fehlgeschlagen.",
      deactivatedHint: "Konto deaktiviert? Schreiben Sie an {contact}.",
      tagHint: (taggedAddress) =>
        `Mit ${taggedAddress} registriert? Verwenden Sie diese Adresse.`,
      twoFactorTitle: "Zwei-Faktor-Authentifizierung",
      twoFactorIntro: "Geben Sie den Code aus Ihrer Authenticator-App ein.",
      code: "2FA-Code",
      verify: "Bestätigen",
      codeInvalid: "Ungültiger 2FA-Code.",
      setPasswordTitle: "Neues Passwort vergeben",
      setPasswordIntro:
        "Für dieses Konto wurde ein neues Passwort angefordert. Vergeben Sie eines, dann geht es direkt weiter.",
      newPassword: "Neues Passwort",
      confirmPassword: "Neues Passwort wiederholen",
      passwordMismatch: "Die Passwörter stimmen nicht überein.",
      setPasswordSubmit: "Passwort vergeben und anmelden",
      setPasswordFailed: "Das Passwort konnte nicht vergeben werden.",
      expired: "Diese Anmeldung ist abgelaufen. Bitte melden Sie sich erneut an.",
      backToSignIn: "Zurück zur Anmeldung",
      // kastlan's backup-code words ("Backup-Code" — not keksdose's
      // "Wiederherstellungscode", which is the key of its end-to-end encryption).
      useRecoveryCode: "Backup-Code verwenden",
      useAuthenticatorCode: "Authenticator-App verwenden",
      recoveryCode: "Backup-Code",
      recoveryIntro:
        "Geben Sie einen der Backup-Codes ein, die Sie beim Einrichten der Zwei-Faktor-Authentifizierung gespeichert haben.",
      recoveryCodeHint: (length) =>
        `${n(length)} Buchstaben und Ziffern. Bindestriche und Leerzeichen spielen keine Rolle.`,
      recoveryCodeInvalid: "Dieser Backup-Code ist ungültig oder wurde schon verwendet.",
      rateLimited,
    },
    register: {
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail",
      emailTagUse: (address) => `${address} verwenden`,
      emailTagHint:
        "Viele Anbieter stellen name+kennung@… an dasselbe Postfach zu, damit Post von dieser App filter- und zuordenbar wird. Prüfen Sie vorher, ob Ihrer das tut: Angemeldet wird dann mit der markierten Adresse.",
      invitedEmailHint: "Die Adresse, an die Ihre Einladung gesendet wurde.",
      invitedTagNote: "Die markierte Adresse erhält eine eigene Bestätigungs-E-Mail.",
      password: "Passwort",
      confirmPassword: "Passwort wiederholen",
      passwordMismatch: "Die Passwörter stimmen nicht überein.",
      language: "Sprache",
      submit: "Registrieren",
      haveAccount: "Bereits registriert?",
      signIn: "Anmelden",
      emailTaken: "Ein Konto mit dieser E-Mail-Adresse existiert bereits.",
      registrationClosed:
        "Neue Konten gibt es nur auf Einladung. Bitten Sie den Betreiber, Ihre E-Mail-Adresse einzuladen.",
      invitationInvalid: "Dieser Einladungslink ist ungültig.",
      invitationExpired: "Diese Einladung ist abgelaufen. Bitten Sie um eine neue.",
      failed: "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
      rateLimited,
    },
    completeName: {
      title: "Namen vervollständigen",
      description:
        "Vor- und Nachname werden jetzt getrennt erfasst. Prüfen Sie, was eingetragen ist, und ergänzen Sie, was fehlt.",
      firstName: "Vorname",
      lastName: "Nachname",
      save: "Speichern",
      later: "Später",
      failed: "Ihr Name konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    },
    forgotPassword: {
      title: "Passwort vergessen",
      intro:
        "Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort vergeben können.",
      email: "E-Mail",
      submit: "Link anfordern",
      sent: (email) => `Falls es ein Konto zu ${email} gibt, ist der Link unterwegs.`,
      sentHint: "Der Link gilt eine Stunde und funktioniert genau einmal. Sehen Sie auch im Spam-Ordner nach.",
      backToSignIn: "Zurück zur Anmeldung",
      error: "Anfrage fehlgeschlagen. Bitte versuchen Sie es später noch einmal.",
      rateLimited,
    },
    resetPassword: {
      title: "Neues Passwort vergeben",
      checking: "Link wird geprüft…",
      intro: (email) => `Sie vergeben ein neues Passwort für ${email}.`,
      newPassword: "Neues Passwort",
      confirmPassword: "Neues Passwort wiederholen",
      mismatch: "Die Passwörter stimmen nicht überein.",
      submit: "Passwort speichern",
      failed: "Das Passwort konnte nicht geändert werden.",
      noToken: "Dieser Link ist unvollständig.",
      invalid: "Dieser Link ist ungültig oder abgelaufen.",
      invalidHint: "Links gelten eine Stunde und funktionieren nur einmal. Fordern Sie einfach einen neuen an.",
      requestNew: "Neuen Link anfordern",
      success: "Ihr Passwort ist geändert. Sie können sich jetzt damit anmelden.",
      sessionsEnded: "Angemeldete Geräte wurden abgemeldet – dort müssen Sie sich neu anmelden.",
      signIn: "Zur Anmeldung",
      rateLimited,
    },
    verifyEmail: {
      title: "E-Mail-Adresse bestätigen",
      verifying: "Wird bestätigt…",
      verified: "Ihre E-Mail-Adresse ist bestätigt.",
      continue: "Weiter",
      invalid: "Dieser Bestätigungslink ist ungültig",
      expired: "Dieser Bestätigungslink ist abgelaufen",
      noToken: "Diesem Link fehlt das Bestätigungs-Token.",
      invalidHint: "Der Link ist vermutlich abgelaufen oder wurde schon benutzt.",
      requestInApp: "Sie können in der App einen neuen anfordern.",
      requestHere: "Sie können hier einen neuen anfordern.",
      resend: "Erneut senden",
      resendIn: (seconds) => `In ${n(seconds)} s erneut senden`,
      resent: "Bestätigungs-E-Mail gesendet",
      resendError: "Bestätigungs-E-Mail konnte nicht gesendet werden",
      banner: "Bitte bestätigen Sie Ihre E-Mail-Adresse.",
      dismiss: "Später",
    },
    notFound: {
      title: "Seite nicht gefunden",
      body: "Diese Adresse gibt es (nicht mehr). Vielleicht ein Tippfehler – oder die Seite ist umgezogen.",
      home: "Zur Startseite",
      app: "Zurück zur App",
    },
    acceptInvitation: {
      title: "Einladung annehmen",
      // Not keksdose's "Trete bei…": first person, where this catalogue's progress
      // words are impersonal ("Wird geladen…").
      accepting: "Beitritt läuft…",
      accepted: "Einladung angenommen.",
      joined: (name) => `Sie sind ${name} beigetreten.`,
      continue: "Weiter",
      invalid: "Beitritt über diesen Link nicht möglich",
      expired: "Diese Einladung ist abgelaufen",
      noToken: "Diesem Link fehlt das Einladungs-Token.",
      askAgain: "Bitten Sie die Person, die Sie eingeladen hat, um eine neue Einladung.",
      signInFirst: "Melden Sie sich an, um diese Einladung anzunehmen",
      signInHint: "Verwenden Sie das Konto, an das die Einladung gesendet wurde.",
      signIn: "Anmelden",
      register: "Registrieren",
    },
    companySwitcher: {
      // "Unternehmen" (0.30), the word kastlan's admin strings use ("Aus dem Unternehmen
      // entfernen"), so one German word names a company across the kit.
      switchCompany: "Unternehmen wechseln",
      heading: "Unternehmen",
      current: (name) => `Unternehmen: ${name}`,
      currentMark: "(aktuell)",
      switching: "Unternehmen wird gewechselt…",
    },
    // 0.30.0 — docs/user-admin-harmonization.md: keksdose's reviewed de-CH for the admin
    // words (admin.users.*), Kurvenschmiede's for transfer, invitations and sessions,
    // kastlan's for "Unternehmen", the throttle and "Überall abmelden"; written fresh where
    // no app had the sentence. Formal "Sie". "Administratorrechte" rather than "der letzte
    // Administrator", which would give the reader a gender.
    emailChange: {
      title: "E-Mail-Adresse",
      current: "Aktuelle Adresse",
      newEmail: "Neue E-Mail-Adresse",
      password: "Aktuelles Passwort",
      passwordHint: "Mit Ihrer Adresse melden Sie sich an – deshalb braucht eine Änderung Ihr Passwort.",
      emailTagUse: (address) => `${address} verwenden`,
      emailTagHint:
        "Viele Anbieter stellen name+kennung@… an dasselbe Postfach zu, damit Post von dieser App filter- und zuordenbar wird. Prüfen Sie vorher, ob Ihrer das tut: Angemeldet wird dann mit der markierten Adresse.",
      submit: "E-Mail-Adresse ändern",
      sameAsCurrent: "Das ist bereits Ihre Adresse.",
      emailTaken: "Ein Konto mit dieser E-Mail-Adresse existiert bereits.",
      wrongPassword: "Das Passwort ist falsch.",
      pending: (newEmail) => `Bestätigen Sie den Link, den wir an ${newEmail} geschickt haben.`,
      pendingHint: (currentEmail) =>
        `Bis dahin melden Sie sich weiterhin mit ${currentEmail} an. Sehen Sie auch im Spam-Ordner nach.`,
      resend: "Link erneut senden",
      resent: "Wir haben den Link erneut gesendet.",
      cancel: "Änderung abbrechen",
      confirmed: (email) => `Ihre E-Mail-Adresse ist jetzt ${email}.`,
      passkeyNote:
        "Ihre Passkeys funktionieren weiterhin. Ihr Gerät zeigt sie eventuell noch unter der alten Adresse an.",
      rateLimited,
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
    },
    sessions: {
      title: "Sitzungen",
      description:
        "Auf einem Gerät angemeldet, das Sie nicht mehr nutzen oder dem Sie nicht trauen? Melden Sie sich überall ab.",
      signOutEverywhere: "Überall abmelden…",
      signOutEverywherePrompt:
        "Damit enden alle Sitzungen, auch diese: Sie werden auch auf diesem Gerät abgemeldet und melden sich hier neu an.",
      confirmSignOutEverywhere: "Überall abmelden",
      list: "Wo Sie angemeldet sind",
      loading: "Sitzungen werden geladen…",
      empty: "Keine Sitzungen vorhanden.",
      current: "Dieses Gerät",
      unknownDevice: "Unbekanntes Gerät",
      // A colon: `when` is either "vor 3 Stunden" or a date.
      lastActive: (when) => `Zuletzt aktiv: ${when}`,
      ip: (address) => `IP ${address}`,
      revoke: "Abmelden",
      // Starts with `revoke`, the button's visible text, for voice control.
      revokeItem: (device) => `Abmelden: ${device}`,
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
    },
    deleteAccount: {
      title: "Konto löschen",
      afterDays: (days) =>
        days === 1
          ? "Ihr Konto wird sofort deaktiviert und 1 Tag später endgültig gelöscht."
          : `Ihr Konto wird sofort deaktiviert und ${n(days)} Tage später endgültig gelöscht.`,
      operator: "Ihr Konto wird sofort deaktiviert und anschließend vom Betreiber endgültig gelöscht.",
      arm: "Konto löschen…",
      prompt: "Sie werden auf allen Geräten abgemeldet, und Ihr Konto kann nicht mehr verwendet werden.",
      handOver: (count) =>
        count === 1
          ? "1 Element, das andere sehen können, geht an einen Administrator über."
          : `${n(count)} Elemente, die andere sehen können, gehen an einen Administrator über.`,
      confirm: "Mein Konto löschen",
      done: "Ihr Konto ist deaktiviert. Sie werden abgemeldet.",
      wrongPassword: "Das Passwort ist falsch.",
      confirmationMismatch: "Das ist nicht die Adresse Ihres Kontos.",
      lastAdmin:
        "Ihr Konto ist das letzte mit Administratorrechten. Geben Sie zuerst einem anderen Konto Administratorrechte.",
      lastAdminOf: (companies) =>
        `Ihr Konto ist das letzte mit Administratorrechten bei ${companies}. Geben Sie dort zuerst einem anderen Konto Administratorrechte.`,
      // keksdose's "Haushalt".
      householdHasMembers:
        "Ihr Haushalt hat weitere Mitglieder, deshalb kann das Konto hier nicht gelöscht werden. Bitte schreiben Sie dem Betreiber.",
      rateLimited,
      failed: "Ihr Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
    },
    dataExport: {
      title: "Ihre Daten exportieren",
      description: "Laden Sie eine Kopie der Daten Ihres Kontos als JSON-Datei herunter.",
      download: "Meine Daten herunterladen",
      started: "Ihr Download hat begonnen.",
      saveAgain: "Nicht gestartet? Datei speichern",
      rateLimited: (seconds) =>
        seconds && seconds > 0
          ? `Sie haben Ihre Daten gerade erst exportiert. Versuchen Sie es in ${wait(seconds)} erneut.`
          : "Sie haben Ihre Daten gerade erst exportiert. Bitte versuchen Sie es in einer Minute erneut.",
      failed: "Der Export ist fehlgeschlagen. Bitte versuchen Sie es erneut.",
    },
    userRoster: {
      name: "Name",
      email: "E-Mail",
      role: "Rolle",
      state: "Status",
      created: "Erstellt",
      lastLogin: "Letzte Anmeldung",
      never: "Nie",
      actions: "Aktionen",
      actionsFor: (name) => `Aktionen für ${name}`,
    },
    roleSelect: {
      label: "Rolle",
      rolesLegend: "Rollen",
      roleOf: (name) => `Rolle von ${name}`,
      lockedLastAdmin: "Das letzte aktive Konto mit Administratorrechten behält diese Rolle.",
      lockedSelf: "Ihre eigene Rolle können Sie nicht ändern.",
      notForLastAdmin: "nicht für das letzte Administratorkonto",
      notForSelf: "nicht für Ihr eigenes Konto",
      unavailable: (role, reason) => `${role} (${reason})`,
    },
    reviewerScope: {
      languages: "Sprachen",
      hint: "Kreuzen Sie die Sprachen an, die diese Person prüft.",
      none: "Keine Sprache: Beim Speichern wird die Prüfrolle entzogen.",
      areas: "Beschränken auf",
      legalOnly: "Nur die rechtlichen Seiten",
      legalOnlyHint:
        "Impressum, Datenschutzerklärung und Nutzungsbedingungen – für eine Juristin oder einen Juristen statt für Muttersprachler.",
      failed: "Die Prüfrolle konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    },
    adminAction: {
      confirm: "Bestätigen",
      cancel: "Abbrechen",
      close: "Schließen",
      lastAdmin:
        "Dies ist das letzte aktive Konto mit Administratorrechten. Geben Sie zuerst einem anderen Konto Administratorrechte.",
      self: "Mit Ihrem eigenen Konto ist das nicht möglich.",
      confirmationMismatch:
        "Die Adresse passt nicht zu diesem Konto. Prüfen Sie, bei welchem Konto Sie sind.",
      otherCompanies:
        "Dieses Konto gehört auch zu anderen Unternehmen, deshalb kann nur der Plattformbetreiber das tun. Sie können es stattdessen aus diesem Unternehmen entfernen.",
      removeFromCompany: "Aus dem Unternehmen entfernen",
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
    },
    adminActionLog: {
      title: "Admin-Aktionen",
      empty: "Noch keine Admin-Aktionen.",
      loading: "Wird geladen…",
      // "durch", not "von": it takes the accusative, so `erased` ("ein gelöschtes Konto")
      // reads right both on its own and after it.
      by: (actor) => `durch ${actor}`,
      bySelf: "durch die Person selbst",
      automatic: "automatisch",
      erased: "ein gelöschtes Konto",
      filteredTo: (target) => `Nur ${target}`,
      showAll: "Alle Aktionen zeigen",
      filterBy: (target) => `Nur Aktionen zu ${target} zeigen`,
      actions: {
        deactivate: "Deaktiviert",
        reactivate: "Reaktiviert",
        role: "Rolle geändert",
        membership_remove: "Aus dem Unternehmen entfernt",
        password_change_require: "Neues Passwort verlangt",
        password_change_withdraw: "Passwortforderung zurückgenommen",
        mail_verification: "Bestätigungsmail gesendet",
        mail_reset: "Mail zum Zurücksetzen des Passworts gesendet",
        reviewer: "Prüfrolle geändert",
        invite: "Eingeladen",
        invite_resend: "Einladung erneut gesendet",
        invite_revoke: "Einladung zurückgezogen",
        transfer: "Arbeit übergeben",
        deletion_request: "Löschung beantragt",
        deletion_cancel: "Löschung aufgehoben",
        erase: "Konto endgültig gelöscht",
      },
    },
    transferOwnership: {
      title: (name) => `Arbeit von ${name} übergeben`,
      body: "Alles, was diesem Konto gehört, geht in einem Schritt an das gewählte Konto.",
      recipient: "Übergeben an",
      choose: "Konto wählen…",
      chooseFirst: "Wählen Sie, wer die Arbeit erhält",
      confirm: "Übergeben",
      customer: "Kundenkonto",
      deactivated: "deaktiviert",
      self: "dasselbe Konto",
      unavailable: (account, reason) => `${account} (${reason})`,
      noCandidates: "Kein anderes Konto kann sie erhalten.",
    },
    invitations: {
      email: "E-Mail-Adresse",
      invalidEmail: "Bitte eine vollständige E-Mail-Adresse eingeben.",
      role: "Rolle",
      scope: "Bereich",
      scopeNone: "Keiner",
      language: "Sprache der Einladung",
      note: "Notiz",
      invite: "Einladen",
      listTitle: "Einladungen",
      empty: "Noch niemand ist eingeladen.",
      loading: "Wird geladen…",
      status: { open: "Offen", accepted: "Angenommen", expired: "Abgelaufen", revoked: "Zurückgezogen" },
      sent: (date) => `Gesendet am ${date}`,
      // kastlan's "Gültig bis".
      expires: (date) => `Gültig bis ${date}`,
      invitedBy: (name) => `von ${name}`,
      resend: (email) => `${email} einen neuen Link senden`,
      copyLink: "Einladungslink kopieren",
      revoke: (email) => `Einladung an ${email} zurückziehen`,
      consoleHint:
        "Dieser Server verschickt keine Mails – sie werden ins Server-Log geschrieben. Kopieren Sie jeden Einladungslink hier und geben Sie ihn selbst weiter: Er wird nur einmal angezeigt.",
      linkReady: (email) => `Der Einladungslink für ${email}, nur dieses eine Mal angezeigt:`,
      notSent: (email) =>
        `${email} ist eingeladen, aber die Mail konnte nicht gesendet werden. Senden Sie sie erneut.`,
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
    },
    characterCount: {
      // "Zeichen" is the same in singular and plural.
      count: (used, max) => `${n(used)} von ${n(max)} Zeichen`,
      remaining: (left) => `Noch ${n(left)} Zeichen`,
      limitReached: "Zeichenlimit erreicht",
    },
    countrySelect: {
      country: "Land",
      search: "Land suchen",
      others: "Weitere Länder",
    },
    inlineEdit: {
      edit: (label) => `${label} bearbeiten`,
      failed: "Die Änderung konnte nicht gespeichert werden.",
      empty: "Leer",
    },
    ibanInput: {
      format: "Eine IBAN beginnt mit einem Ländercode aus zwei Buchstaben und zwei Prüfziffern.",
      country: (code) => `„${code}“ ist kein Ländercode einer IBAN.`,
      length: (actual, expected) =>
        `Eine IBAN aus diesem Land hat ${n(expected)} Zeichen – diese hat ${n(actual)}.`,
      checksum: "Die Prüfziffern stimmen nicht – vermutlich ist ein Zeichen falsch eingegeben.",
      qrRequired: "Dies ist eine reguläre IBAN. Eine QR-Rechnung braucht die QR-IBAN des Kontos.",
      qrNotAllowed:
        "Dies ist eine QR-IBAN, die nur Zahlungen mit QR-Rechnung empfängt. Geben Sie die reguläre IBAN des Kontos ein.",
    },
    phoneInput: {
      countryCode: "Ländervorwahl",
      other: "Andere",
    },
    signChip: {
      outflow: "Ausgabe",
      inflow: "Einnahme",
      direction: (current, next) => `Richtung: ${current} – zu ${next} wechseln`,
    },
    columnMapper: {
      paste: "Tabelle einfügen",
      pasteHint:
        "Die Zeilen aus einer Tabellenkalkulation kopieren und hier einfügen – oder eine CSV- oder Textdatei hier ablegen.",
      chooseFile: "Datei auswählen",
      readError: (name) => `„${name}“ konnte nicht gelesen werden`,
      headerRow: "Die erste Zeile enthält die Spaltennamen",
      summary: (columns, rows) =>
        `${n(columns)} ${columns === 1 ? "Spalte" : "Spalten"}, ${n(rows)} ${rows === 1 ? "Zeile" : "Zeilen"}`,
      // Fragments of the summary line ("3 Spalten, 120 Zeilen · durch Semikolons getrennt").
      separatorSemicolon: "durch Semikolons getrennt",
      separatorComma: "durch Kommas getrennt",
      separatorTab: "durch Tabulatoren getrennt",
      separatorSpace: "durch Leerzeichen getrennt",
      // The examples stay as written: they show the convention, not the reader's locale.
      decimalComma: "Dezimalkomma (1,5)",
      decimalPoint: "Dezimalpunkt (1.5)",
      unreadCount: (count) =>
        count === 1
          ? "1 Zeile konnte nicht gelesen werden"
          : `${n(count)} Zeilen konnten nicht gelesen werden`,
      // A line number is a position, not a count: unformatted, as `measuredGrid.lineError`.
      unreadLine: (line) => `Zeile ${line} konnte nicht gelesen werden`,
      unreadMore: (count) => `…und ${n(count)} weitere`,
      noRows: "Keine Zeile dieses Textes lässt sich als Tabellenzeile lesen.",
      table: "Spaltenzuordnung",
      columnN: (column) => `Spalte ${column}`,
      roleOf: (column) => `Was enthält die Spalte „${column}“?`,
      ignore: "Ignorieren",
      requiredRole: (role) => `${role} (erforderlich)`,
      requiredRoleShort: (role) => `${role} *`,
      previewOf: (shown, total) =>
        shown === 1
          ? `Die erste von ${n(total)} Zeilen`
          : `Die ersten ${n(shown)} von ${n(total)} Zeilen`,
      // `roles` arrives joined with "oder" ("Soll oder Haben").
      oneOf: (roles) => `entweder ${roles}`,
      missing: (roles) => `Noch erforderlich: ${roles}.`,
    },
    translationReview: {
      statusMissing: "Fehlt",
      statusUnreviewed: "Ungeprüft",
      statusChanged: "Seit der Prüfung geändert",
      statusNeedsChange: "Änderung nötig",
      statusApproved: "Bestätigt",
      statusFilter: "Status",
      all: "Alle",
      filterCount: (label, count) => `${label} · ${n(count)}`,
      source: "Texte",
      allSources: "Alle Texte",
      namespace: "Bereich",
      allNamespaces: "Alle Bereiche",
      search: "Schlüssel und Texte durchsuchen",
      placeholdersOnly: (count) => `Nur Platzhalter-Probleme (${n(count)})`,
      placeholderChip: "Platzhalter",
      key: "Schlüssel",
      statusColumn: "Status",
      empty: "Keine Texte passen zu diesen Filtern.",
      missingText: "Fehlt in dieser Sprache",
      progress: (approved, total) => `${n(approved)} von ${n(total)} bestätigt`,
      localeProgress: (approved, total) => `${n(approved)}/${n(total)}`,
      locales: "Sprachen",
      approve: "Bestätigen",
      flag: "Änderung nötig",
      suggest: "Übersetzung vorschlagen",
      reset: "Als ungeprüft markieren",
      cancel: "Abbrechen",
      approveSelected: "Auswahl bestätigen",
      resetSelected: "Auswahl als ungeprüft markieren",
      selectShown: "Alle angezeigten auswählen",
      changedSince: "Dieser Text wurde nach der Prüfung geändert. Bitte lesen Sie ihn noch einmal.",
      reviewedWording: "Wortlaut bei der Prüfung",
      reviewedReference: "Vorlage bei der Prüfung",
      placeholderMismatch: (reference, text) =>
        `Die Platzhalter weichen von der Vorlage ab – Vorlage: ${reference}; dieser Text: ${text}. Die App setzt dort Werte ein, deshalb müssen sie genau so bleiben.`,
      lastApproved: (name, date) => `Bestätigt von ${name} am ${date}`,
      lastFlagged: (name, date) => `Als änderungsbedürftig markiert von ${name} am ${date}`,
      // Dative, after "von": "Bestätigt von einem gelöschten Konto".
      erasedReviewer: "einem gelöschten Konto",
      suggestion: "Bessere Formulierung",
      translation: "Übersetzung",
      note: "Notiz (optional)",
      notePlaceholder: "Was falsch ist oder worauf zu achten ist",
      readOnly: "Sie können diese Sprache lesen, aber nicht prüfen.",
      scope: (areas) => `Ihre Prüfung ist beschränkt auf: ${areas}.`,
      exportCorrections: (count) => `Korrekturen exportieren (${n(count)})`,
      failed: "Das hat nicht geklappt. Bitte erneut versuchen.",
      approvedToast: (count) => (count === 1 ? "Text bestätigt" : `${n(count)} Texte bestätigt`),
      clearedToast: (count) => (count === 1 ? "Text als ungeprüft markiert" : `${n(count)} Texte als ungeprüft markiert`),
      groupCount: (unreviewed, total) => `${n(unreviewed)} ungeprüft / ${n(total)}`,
      approveGroup: (count) => `Ungeprüfte bestätigen (${n(count)})`,
      // The group's name quoted, as `columnMapper.roleOf`'s column: it is often a key
      // ("billing"), which unquoted would read as part of the sentence.
      confirmGroup: (count, group) =>
        count === 1
          ? `Den ungeprüften Text in „${group}“ bestätigen?`
          : `Alle ${n(count)} ungeprüften Texte in „${group}“ bestätigen – auch die nicht angezeigten?`,
    },
  };
}
