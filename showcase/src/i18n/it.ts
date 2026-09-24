import { formatFileSize } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * Italian (Italy).
 *
 * Written against en.ts and the kit's `DEFAULT_*` labels key for key. Conventions a
 * reviewer should know:
 *
 *  1. REGISTER. "Tu", which is what current Italian software (and developer
 *     documentation) uses. Buttons are the short forms every Italian UI uses — Salva,
 *     Annulla, Chiudi, Cerca — and announcements address the user directly.
 *  2. APIs STAY ENGLISH. `TokenSet`, `PickerSheet`, `Recharts`, `hook`, `token`, and the
 *     loanwords Italian front-end work actually uses: `popover`, `tooltip`, `overlay`,
 *     `input`, `dropdown`.
 *  3. QUOTES are « » with no inner space, and the apostrophe is the typographic ’.
 *  4. PLURALS. Only 1 is singular ("1 riga", "0 righe", "2 righe"). Numbers go through
 *     `Intl.NumberFormat("it-IT")`, so a footer says "1.234".
 */
const num = new Intl.NumberFormat("it-IT");
const n = (value: number) => num.format(value);
const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const it: Dictionary = {
  tag: "it-IT",
  name: "Italiano",
  country: "it",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "In questa pagina",
    previous: "Precedente",
    next: "Successiva",
    notFoundTitle: "Pagina non trovata",
    notFoundHint: "Questo percorso non corrisponde a nessun componente del kit.",
    backToStart: "Torna alla panoramica",
    toggleTheme: "Cambia tema",
    palette: "Palette",
    language: "Lingua",
    renderedFrom: "Vetrina di @eifi1/ui-kit — generata da src/, non da dist/.",
    breadcrumb: "Percorso di navigazione",
    pagination: "Paginazione",
    sidebarStyle: "Stile della barra laterale",
    sidebarFlyout: "Pagine in un menu a comparsa",
    sidebarInline: "Pagine elencate nella barra",
    contentsPosition: "Posizione dell'indice",
    positionStart: "A sinistra",
    positionEnd: "A destra",
  },

  groups: {
    "Getting started": "Per iniziare",
    Foundations: "Fondamenti",
    Inputs: "Input",
    "Data display": "Visualizzazione dati",
    Overlays: "Overlay",
    // "Chrome" in the UI sense: the frame around the content, not the browser.
    "App chrome": "Struttura dell’app",
    API: "API",
  },

  pages: {
    overview: {
      title: "Panoramica",
      blurb:
        "Che cos’è @eifi1/ui-kit, i sei livelli su cui è costruito e come leggere una pagina di questa vetrina.",
    },
    foundations: {
      title: "Fondamenti",
      blurb:
        "I valori con cui ogni componente dipinge e la lingua che ogni componente parla. Nulla sotto questo livello ha un colore o una parola scritti nel codice.",
    },
    tokens: {
      title: "Token",
      blurb:
        "Ogni valore del TokenSet attivo, dal vivo. Cambia tema o palette nella barra in alto e guarda questa pagina cambiare: tutto ciò che resta fermo è scritto nel codice.",
    },
    palette: {
      title: "Generatore di palette",
      blurb:
        "Un colore del brand in ingresso, entrambi i temi in uscita — ogni rapporto di contrasto misurato anziché dichiarato, e ogni compromesso chiamato per nome.",
    },
    localisation: {
      title: "Localizzazione",
      blurb:
        "Ogni testo che il kit mostra, come un unico albero tipizzato — e il provider che consegna una traduzione a tutti i componenti in una volta.",
    },
    inputs: {
      title: "Input",
      blurb:
        "Ogni modo di acquisire un valore. Condividono una stessa anatomia — un’etichetta flottante, il valore, una riga di aiuto sotto — così un modulo si legge come un tutt’uno.",
    },
    fields: {
      title: "Campi di testo",
      blurb:
        "I campi di input e le costanti di classe con cui un’app compone i propri campi.",
    },
    choices: {
      title: "Casella di controllo, interruttore e cursore",
      blurb:
        "Scegliere invece di digitare: acceso o spento, uno fra pochi, un valore su una scala.",
    },
    numbers: {
      title: "Numeri e importi",
      blurb:
        "Lo stack numerico: un campo numerico con calcolatrice, un campo il cui valore è un numero, il campo importo con i suoi toni e il selettore di valuta.",
    },
    dropdowns: {
      title: "Menu a tendina e selettori",
      blurb:
        "Combobox, selezione multipla, selettori raggruppati e a foglio, e le primitive dei menu a tendina su cui si basano.",
    },
    dates: {
      title: "Date e ora",
      blurb:
        "Scegliere un momento a ogni scala: un giorno, un intervallo di giorni, un mese, un orario.",
    },
    "field-sync": {
      title: "Stato di sincronizzazione",
      blurb:
        "Stato di sincronizzazione di un campo legato a un database, salvato all'uscita dal campo: il colore del bordo e un'icona alla fine del campo indicano modificato, salvataggio, salvato o errore — passa sopra il simbolo d'errore per vederne il motivo.",
    },
    "signature-password": {
      title: "Firma e sicurezza della password",
      blurb:
        "Acquisire una firma con penna, dito o mouse — con il nome digitato come alternativa — e mostrare all’utente quanto è sicura la password che sta scegliendo.",
    },
    "data-display": {
      title: "Visualizzazione dati",
      blurb:
        "Mostrare valori invece di acquisirli: i mattoni di base, la tabella e i grafici.",
    },
    primitives: {
      title: "Primitive",
      blurb:
        "Pulsanti, schede, tab, banner, avatar — i pezzi con cui è costruito tutto il resto.",
    },
    "data-table": {
      title: "Tabella dati",
      blurb:
        "Il componente più grande del kit: ordinamento, filtri, selezione, paginazione, sincronizzazione con l’URL e le sue funzioni pure.",
    },
    charts: {
      title: "Grafici",
      blurb:
        "L’involucro dei grafici a tema sopra Recharts, il suo sistema di colori, il grafico a riquadri (treemap) e il grafico a serie con zoom condivisi dalle app.",
    },
    stats: {
      title: "Statistiche e sparkline",
      blurb:
        "Il riquadro KPI che ogni dashboard ripete — valore, variazione, tendenza — e la minuscola linea che sta in una cella di tabella.",
    },
    overlays: {
      title: "Overlay",
      blurb:
        "Tutto ciò che fluttua sopra la pagina, e l’unica temporizzazione che tutti condividono quando si chiudono.",
    },
    dialogs: {
      title: "Finestre di dialogo e popover",
      blurb:
        "Modale, dialogo a schermo intero, popover, menu al passaggio del mouse e tooltip — più la temporizzazione di chiusura condivisa.",
    },
    "tour-search-files": {
      title: "Tour, palette comandi e file",
      blurb:
        "Il tour guidato, la palette dei comandi, l’area di rilascio dei file e la riga scorrevole.",
    },
    "app-chrome": {
      title: "Struttura dell’app",
      blurb:
        "La cornice in cui vive un’app e i flussi che ogni app ripete: impostazioni, moduli a più passaggi, feedback.",
    },
    shell: {
      title: "Shell",
      blurb: "La cornice dell’app che stai guardando, smontata pezzo per pezzo.",
    },
    settings: {
      title: "Campi delle impostazioni",
      blurb:
        "Le righe delle impostazioni dell’account: tema, lingua, profilo, password e autenticazione a due fattori.",
    },
    wizard: {
      title: "Procedura guidata",
      blurb: "Il motore a più passaggi, la sua cornice e il passaggio di riepilogo.",
    },
    "feedback-compose": {
      title: "Feedback — scrittura",
      blurb: "Il modulo di segnalazione e il suo campo per gli allegati.",
    },
    "feedback-inbox": {
      title: "Feedback — posta in arrivo",
      blurb:
        "Il vocabolario di stati condiviso, le regole di transizione e le parti con cui si costruisce una casella di posta.",
    },
    "hooks-lib": {
      title: "Hook e lib",
      blurb:
        "Le esportazioni non visive: gli hook osservati dal vivo e le funzioni pure come input → output.",
    },
    api: {
      title: "API",
      blurb:
        "Ciò che resta togliendo i pixel: gli hook con cui sono costruiti i componenti e le funzioni pure e le costanti che un'app chiama direttamente.",
    },
    helpers: {
      title: "Funzioni e costanti",
      blurb:
        "Le funzioni e i dati dietro i campi, come input → risultato: il calcolo delle date di @eifi1/ui-kit/dates, il valutatore della calcolatrice, la tabella delle valute e le costanti di classe con cui si compone un campo personalizzato.",
    },
  },

  kit: {
    pageContents: { title: "In questa pagina" },
    common: {
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
    swipeableRow: {
      actions: "Azioni della riga",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, "it-IT"),
    },
    wizard: {
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
      placeholder: "Cerca…",
      empty: "Nessun risultato",
      loading: "Ricerca in corso…",
      dialog: "Ricerca",
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
  },
};
