import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's words in Italian: every namespace of {@link UiKitLabels}, for
 * `<UiKitProvider labels={UI_KIT_LABELS_IT}>`.
 *
 * Self-contained on purpose — nothing but the kit's own `formatFileSize` — so it works
 * as a starting point to copy and adjust. Counts and sizes are formatted with
 * `it-IT` digits; {@link uiKitLabelsIt} takes another number locale
 * (e.g. `"de-CH"` for 1’234) without touching the words.
 */
export function uiKitLabelsIt(numberLocale = "it-IT"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

  return {
    feedbackAttachment: {
      attachmentAdd: "Allega immagine",
      attachmentCapture: "Cattura schermata",
      attachmentPaste: "…oppure incolla uno screenshot dagli appunti.",
      attachmentRemove: "Rimuovi allegato",
    },
    measuredGrid: {
      view: "Vista tabella",
      cellsView: "Celle",
      textView: "Testo",
      addRow: "Aggiungi riga",
      removeRow: (row) => `Rimuovi riga ${row}`,
      clear: "Svuota tabella",
      pasteHint: "Incolla un blocco da un foglio di calcolo in qualsiasi cella",
      cell: (column, row) => `${column}, riga ${row}`,
      rowNumber: "Riga",
      rowActions: "Azioni riga",
      keyboardHint:
        "I tasti freccia spostano tra le celle. Digita per sostituire una cella, F2 per modificarla, Esc per annullare la modifica. Invio scende e aggiunge una riga alla fine.",
      lineError: (line) => `Impossibile leggere la riga ${line}`,
      points: (count) => (count === 1 ? "1 punto" : `${count} punti`),
      problems: (count) =>
        count === 1 ? "1 cella non è un numero" : `${count} celle non sono numeri`,
    },
    pageContents: { title: "In questa pagina" },
    common: {
      dismiss: "Chiudi",
      close: "Chiudi",
      clear: "Cancella",
      search: "Cerca",
      done: "Fine",
      cancel: "Annulla",
      save: "Salva",
      back: "Indietro",
      next: "Avanti",
      remove: "Rimuovi",
      loading: "Caricamento…",
      noResults: "Nessun risultato",
      fieldValue: (field, value) => `${field}: ${value}`,
    },
    dataTable: {
      columns: "Colonne",
      selectAllRows: "Seleziona tutte le righe",
      sortHint: "Fai clic per ordinare · Maiusc+clic per aggiungere un ordinamento",
      filter: "Filtra",
      close: "Chiudi",
      selectRow: "Seleziona riga",
      autoSize: "Adatta larghezza colonne",
      loading: "Caricamento…",
      filters: "Filtri",
      clearAll: "Cancella tutto",
      done: "Fine",
      pageSize: "Righe per pagina",
      pageSizeAll: "Tutte",
      prevPage: "Pagina precedente",
      nextPage: "Pagina successiva",
      clearFilter: "Cancella filtro",
      filterPlaceholder: "Filtra…",
      selectFilter: "Seleziona",
      selectAll: "Tutti",
      selectNone: "Nessuno",
      dateFrom: "Dal",
      dateTo: "Al",
      numberMin: "Min",
      numberMax: "Max",
      numberAbs: "Valore assoluto",
      presets: {
        today: "Oggi",
        yesterday: "Ieri",
        this_week: "Questa settimana",
        last_week: "Settimana scorsa",
        last_7_days: "Ultimi 7 giorni",
        last_30_days: "Ultimi 30 giorni",
        this_month: "Questo mese",
        last_month: "Mese scorso",
        last_3_months: "Ultimi 3 mesi",
        ytd: "Da inizio anno",
        last_year: "Anno scorso",
      },
      table: "Tabella dati",
      filterResults: (shown, total) =>
        `${n(shown)} di ${n(total)} ${plural(total, "riga", "righe")}`,
      sortedAscending: (column) => `Ordinato per ${column}, crescente`,
      sortedDescending: (column) => `Ordinato per ${column}, decrescente`,
      sortCleared: (column) => `Ordinamento per ${column} rimosso`,
      pageChanged: (page, totalPages) => `Pagina ${n(page)} di ${n(totalPages)}`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Colonne (${n(visible)}/${n(total)})`,
    },
    miniCalendar: {
      previousMonth: "Mese precedente",
      nextMonth: "Mese successivo",
      // Already formatted in the provider's locale ("lunedì 14 settembre 2026").
      day: (date) => date,
      chooseStart: "Scegli una data di inizio",
      chooseEnd: "Scegli una data di fine",
      // "Data" is feminine and the formatted day cannot agree with a participle, so the
      // date follows a label instead of being the subject.
      startSelected: (date) => `Data di inizio: ${date}. Scegli una data di fine.`,
      rangeSelected: (from, to) =>
        `Periodo selezionato: da ${from} a ${to}. Scegli una data di inizio per ricominciare.`,
    },
    monthPicker: {
      previousYear: "Anno precedente",
      nextYear: "Anno successivo",
      panel: "Scegli un mese",
      month: (monthYear) => monthYear,
    },
    datePicker: {
      apply: "Applica",
      cancel: "Annulla",
      presets: "Intervalli rapidi",
      panel: "Scegli una data",
      rangePanel: "Scegli un intervallo di date",
      clear: "Cancella",
      previousDay: "Giorno precedente",
      nextDay: "Giorno successivo",
      today: "Oggi",
    },
    popover: {
      panel: "Finestra a comparsa",
    },
    combobox: {
      search: "Cerca",
      noResults: "Nessun risultato",
      clear: "Cancella",
      loading: "Caricamento…",
      create: (query) => `Crea «${query}»`,
      selectedCount: (count) => `${n(count)} ${plural(count, "selezionato", "selezionati")}`,
      loadError: "Impossibile caricare i risultati",
      resultCount: (count) => `${n(count)} ${plural(count, "risultato", "risultati")}`,
      minChars: (count) => `Digita almeno ${n(count)} ${plural(count, "carattere", "caratteri")}`,
    },
    multiSelect: {
      search: "Cerca",
      selectAll: "Seleziona tutto",
      clear: "Cancella",
      all: "Tutti",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "Apri calcolatrice",
      panel: "Calcolatrice",
      calculation: "Calcolo",
      backspace: "Cancella ultimo carattere",
      clear: "Azzera",
      equals: "Uguale",
      done: "Fine",
      plus: "Più",
      minus: "Meno",
      times: "Per",
      divide: "Diviso",
      decimal: "Separatore decimale",
    },
    currency: {
      currency: "Valuta",
      search: "Cerca valuta",
    },
    chipInput: {
      // The quoted value is a citation; the participle agrees with the implied
      // "elemento" whatever the chip says.
      added: (value) => `«${value}» aggiunto`,
      removed: (value) => `«${value}» rimosso`,
      remove: "Rimuovi",
      atLimit: (max) => `Limite di ${n(max)} ${plural(max, "elemento", "elementi")} raggiunto`,
      duplicate: (value) => `«${value}» è già nell’elenco`,
    },
    swatchPicker: {
      none: "Nessun colore",
      mixed: "Misto: gli elementi selezionati hanno colori diversi",
    },
    iconPicker: {
      none: "Nessuna icona",
      mixed: "Misto: gli elementi selezionati hanno icone diverse",
      search: "Cerca icone",
      noResults: "Nessuna icona corrispondente",
      resultCount: (count) => `${n(count)} ${plural(count, "icona", "icone")}`,
    },
    fieldSync: {
      synced: "Salvato",
      edited: "Modifiche non salvate",
      pending: "Salvataggio…",
      error: "Impossibile salvare",
      retry: "Riprova",
    },
    passwordReveal: {
      show: "Mostra password",
      hide: "Nascondi password",
    },
    dangerConfirm: {
      arm: "Elimina…",
      confirm: "Elimina",
      cancel: "Annulla",
      prompt: "Questa operazione non può essere annullata.",
      password: "Password",
      phrase: (phrase) => `Digita «${phrase}» per confermare`,
    },
    tabs: {
      add: "Aggiungi scheda",
      remove: (tab) => `Rimuovi ${tab}`,
    },
    appShell: {
      collapse: "Comprimi barra laterale",
      expand: "Espandi barra laterale",
      toggleGroup: (groupLabel) => `${groupLabel}: pagine`,
    },
    topBar: {
      theme: "Cambia tema",
      palette: "Preset di aspetto",
      language: "Lingua",
      switchRole: "Cambia ruolo",
      role: (value) => `Ruolo: ${value}`,
    },
    pickerSheet: {
      close: "Chiudi",
    },
    dialogFrame: {
      close: "Chiudi",
    },
    swipeableRow: {
      actions: "Azioni della riga",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      dropzone: "Caricamento file",
      browse: "Sfoglia",
      empty: "Trascina qui un file",
      emptyMultiple: "Trascina qui i file",
      hint: (accept) => (accept ? `Accettati: ${accept}` : "Qualsiasi tipo di file"),
      busy: "Caricamento…",
      rejectedPick: (count) =>
        count === 1 ? "Il file non è stato aggiunto" : `Nessuno dei ${count} file è stato aggiunto`,
      // "file" is invariable in Italian ("1 file", "3 file"); only the verb agrees.
      rejectedType: (name) => `Il tipo di file di «${name}» non è supportato`,
      rejectedTypeOnly: (accept) => `Solo file ${accept}`,
      rejectedSize: (name, maxSize) => `«${name}» supera ${maxSize}`,
      rejectedCount: (name, maxFiles) =>
        `«${name}» non è stato aggiunto: al massimo ${n(maxFiles)} file`,
      rejectedInvalid: (name) => `«${name}» non può essere usato qui`,
      rejectedMany: (count) =>
        count === 1 ? "1 file non è stato aggiunto" : `${n(count)} file non sono stati aggiunti`,
      selected: (count, firstName) =>
        count === 1 ? `«${firstName}» selezionato` : `${n(count)} file selezionati`,
      remove: (name) => `Rimuovi «${name}»`,
      clearAll: "Rimuovi tutti i file",
      removed: (name) => `«${name}» rimosso`,
      cleared: "Tutti i file rimossi",
    },
    wizard: {
      done: "Fine",
      cancel: "Annulla",
      back: "Indietro",
      next: "Avanti",
      skip: "Salta",
      finish: "Fine",
      submitting: "Creazione in corso…",
      steps: "Passaggi",
      step: (current, total) => `Passaggio ${n(current)} di ${n(total)}`,
      cancelTitle: "Scartare questo modulo?",
      confirmCancel: "I dati inseriti andranno persi.",
      cancelConfirmLabel: "Scarta",
      cancelDismissLabel: "Continua a modificare",
      reviewTitle: "Riepilogo",
      edit: "Modifica",
      missingRequired: "Compila tutti i campi obbligatori.",
      genericError: "Si è verificato un errore",
    },
    tour: {
      next: "Avanti",
      back: "Indietro",
      skip: "Salta",
      done: "Fine",
      awaitClickHint: "Fai clic sull’elemento evidenziato per continuare",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      clear: "Cancella ricerca",
      submit: "Cerca",
      close: "Chiudi",
      placeholder: "Cerca…",
      empty: "Nessun risultato",
      loading: "Ricerca in corso…",
      dialog: "Ricerca",
      error: "Ricerca non riuscita. Riprova.",
    },
    globalSearch: {
      trigger: "Cerca",
      placeholder: "Cerca o vai a…",
      shortcut: (keys) => `Cerca (${keys})`,
      suggestions: "Prova",
      results: "Risultati",
    },
    sparkline: {
      rising: (first, last) => `In aumento da ${first} a ${last}`,
      falling: (first, last) => `In calo da ${first} a ${last}`,
      flat: (value) => `Stabile a ${value}`,
      single: (value) => `Un solo valore: ${value}`,
      noData: "Nessun dato",
      named: (name, summary) => `${name}: ${summary}`,
    },
    statTile: {
      increase: (amount) => `In aumento di ${amount}`,
      decrease: (amount) => `In calo di ${amount}`,
      unchanged: "Nessuna variazione",
      better: (change) => `${change} (favorevole)`,
      worse: (change) => `${change} (sfavorevole)`,
      noValue: "Nessun dato",
      loading: "Caricamento…",
    },
    signaturePad: {
      label: "Firma",
      instructions: "Firma nel riquadro con il mouse, il dito o una penna.",
      typedFallbackHint: "Se non puoi disegnare, scrivi invece il tuo nome.",
      empty: "Ancora nessun tratto",
      signed: "Firma tracciata",
      undo: "Annulla l’ultimo tratto",
      clear: "Cancella",
      save: "Salva firma",
      useTyped: "Scrivi il nome",
      useDrawn: "Disegna la firma",
      typedName: "Nome e cognome",
      cleared: "Firma cancellata",
      undone: "Ultimo tratto rimosso",
      viewEmpty: "Non firmato",
      viewDrawn: "Firma autografa",
      viewTyped: (name) => `Firmato con il nome digitato ${name}`,
    },
    passwordStrength: {
      // Agrees with "password" (feminine in Italian).
      tooShort: "Troppo corta",
      weak: "Debole",
      fair: "Discreta",
      good: "Buona",
      strong: "Forte",
      announcement: (level) => `Sicurezza della password: ${level}`,
      // Unformatted, as in the English default.
      ruleLength: (minLength) =>
        `Almeno ${minLength} ${plural(minLength, "carattere", "caratteri")}`,
      ruleCase: "Maiuscole e minuscole",
      ruleDigit: "Un numero",
      ruleSymbol: "Un simbolo",
      optional: (rule) => `${rule} (facoltativo)`,
      met: "Soddisfatto:",
      notMet: "Non soddisfatto:",
      tooLong: (maxBytes) =>
        `Al massimo ${maxBytes} ${plural(maxBytes, "carattere", "caratteri")} (le lettere accentate e le emoji contano più di uno).`,
    },
    seriesChart: {
      resetZoom: "Reimposta zoom",
      zoomHint:
        "Trascina per ingrandire: una selezione più o meno quadrata ingrandisce entrambi gli assi, una lunga e sottile solo il proprio. Fai doppio clic per ripristinare.",
      empty: "Nessun dato",
      legend: "Serie",
    },
    confirmDialog: {
      confirm: "Conferma",
      cancel: "Annulla",
    },
    floatingPanel: {
      close: "Chiudi",
    },
    copyButton: {
      copy: "Copia",
      copied: "Copiato",
      failed: "Copia non riuscita",
      copiedAnnouncement: "Copiato negli appunti",
      failedAnnouncement: "Impossibile copiare negli appunti",
    },
  };
}

export const UI_KIT_LABELS_IT: UiKitLabels = uiKitLabelsIt();
