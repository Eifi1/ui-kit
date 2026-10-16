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
  // 0.30.0 — a throttled request (HTTP 429), as `englishRateLimited` in
  // src/auth/auth-errors.ts: no wait → "un momento", under a minute → seconds, else
  // minutes rounded up. kastlan's reviewed "auth.throttled" is the sentence without one.
  const wait = (seconds: number) =>
    seconds < 60 ? `${n(Math.ceil(seconds))} s` : `${n(Math.ceil(seconds / 60))} min`;
  const rateLimited = (seconds?: number) =>
    !seconds || seconds <= 0
      ? "Troppi tentativi. Attenda un momento e riprovi."
      : `Troppi tentativi. Riprovi tra ${wait(seconds)}.`;
  // 0.32.0 — when a trial or a grant ends, as `inDays` in src/billing/billing-labels.ts:
  // 0 (or less) is today, 1 tomorrow.
  const inDays = (days: number) =>
    days <= 0 ? "oggi" : days === 1 ? "domani" : `tra ${n(days)} ${plural(days, "giorno", "giorni")}`;

  return {
    feedbackAttachment: {
      attachmentAdd: "Aggiungi allegato",
      attachmentCapture: "Cattura schermata",
      attachmentPaste:
        "…oppure incolli uno screenshot direttamente dagli appunti, così può mostrare solo un dettaglio invece dell’intera pagina.",
      attachmentRemove: "Rimuovi allegato",
      attachmentList: "Allegati",
      attachmentScreenshot: "Screenshot",
      attachmentRemoveFile: (name) => `Rimuovi ${name}`,
      attachmentLimit: (max) =>
        max === 1
          ? `Massimo ${n(max)} allegato: lo rimuova per aggiungerne un altro.`
          : `Massimo ${n(max)} allegati: ne rimuova uno per aggiungerne un altro.`,
      attachmentUploading: "Caricamento…",
      attachmentUploadFailed: (name) => `Impossibile caricare «${name}»`,
    },
    feedbackDialog: {
      title: "Invia feedback",
      category: "Categoria",
      subject: "Oggetto",
      body: "Cosa è successo?",
      bodyOptional: "Cosa è successo? (facoltativo)",
      attachment: "Allegato",
      submitHint: (apple) => (apple ? "⌘ Invio per inviare" : "Ctrl+Invio per inviare"),
      cancel: "Annulla",
      save: "Invia",
      publicNotice: "Le altre persone vedranno il titolo e il testo (mai i Suoi screenshot o file).",
    },
    feedbackThread: {
      thread: "Commenti",
      empty: "Ancora nessun commento",
      loading: "Caricamento dei commenti…",
      you: "Lei",
      staff: "Team",
      attachments: "Allegati",
    },
    feedbackComposer: {
      field: "Scriva un commento",
      placeholder: "Scriva un commento…",
      send: "Invia",
      sendHint: (modifier) => `${modifier} + Invio per inviare`,
      sendHintEnter: "Invio per inviare, Maiusc + Invio per andare a capo",
    },
    // 0.27.0. "Feedback" stays, as `feedbackDialog`; "rielaborazione" for rework.
    feedbackStatus: {
      OPEN: "Aperto",
      READY: "Pronto da implementare",
      IN_PROGRESS: "In corso",
      IN_EVALUATION: "In valutazione",
      NEEDS_LIVE_TEST: "Da testare in produzione",
      POSTPONED: "Rimandato",
      DONE: "Completato",
      WONT_DO: "Non verrà fatto",
    },
    feedbackCategory: {
      CRASH: "Arresto anomalo",
      BUG: "Errore",
      IDEA: "Idea",
      QUESTION: "Domanda",
      OTHER: "Altro",
    },
    feedbackToast: {
      submitted: "Grazie per il feedback!",
      submitFailed: "Impossibile inviare il feedback",
      attachmentUnsupported: "Sono consentiti solo immagini, PDF o file di testo",
      attachmentTooLarge: "Il file supera i 10 MB",
      attachmentTooMany: (count) =>
        count === 1
          ? "C’è posto solo per 1 allegato: gli altri sono stati esclusi."
          : `C’è posto solo per ${n(count)} allegati: gli altri sono stati esclusi.`,
      captureFailed: "Impossibile catturare lo screenshot",
      updateFailed: "Non è stato possibile salvare la modifica.",
      statusChanged: (status, title) => `Impostato su «${status}»: ${title}`,
      statusUndo: "Annulla",
      statusRestored: (status, title) => `Tornato a «${status}»: ${title}`,
      commentFailed: "Non è stato possibile pubblicare il commento.",
      voteFailed: "Non è stato possibile salvare il Suo voto.",
      replyFailed: "Non è stato possibile inviare la risposta.",
    },
    feedbackMenu: {
      trigger: "Invia feedback",
      myFeedback: "I miei feedback",
      viewFeedback: "Visualizza feedback",
      allFeedback: "Tutti i feedback",
    },
    // 0.38.0 — docs/feedback-harmonization.md §9: the public pages and the two feedback
    // notification types. "Segnalazione" for one report; formal "Lei", as elsewhere.
    feedbackPublic: {
      title: "Tutti i feedback",
      sort: "Ordina",
      sortNewest: "Più recenti",
      sortVotes: "Più richiesti",
      sortUpdated: "Aggiornati di recente",
      search: "Cerca nei titoli",
      columnVotes: "Voti",
      total: (count) => (count === 1 ? "1 segnalazione" : `${n(count)} segnalazioni`),
      comments: (count) => (count === 1 ? "1 commento" : `${n(count)} commenti`),
      votes: (count) => (count === 1 ? "1 voto" : `${n(count)} voti`),
      anonymous: "Una persona",
      filedBy: (name) => `Da ${name}`,
      body: "Descrizione",
      conversation: "Risposte e commenti",
      loading: "Caricamento…",
      empty: "Ancora nessuna segnalazione",
      visibleToOthers: "Visibile agli altri",
      visibleHint: "Le altre persone vedono il titolo e il testo, mai i Suoi screenshot o file.",
      visibleLocked: "Solo finché la segnalazione è ancora aperta.",
      page: (page) => `Pagina ${n(page)}`,
    },
    feedbackNotificationTypes: {
      answered: "Risposte alle Sue segnalazioni",
      answeredDescription: "Quando una segnalazione che ha scritto o commentato riceve una risposta.",
      comment: "Commenti sulle segnalazioni che segue",
      commentDescription: "Quando qualcuno commenta una segnalazione che ha scritto o commentato.",
    },
    feedbackContext: {
      user: "Utente",
      attachUrl: "Allega l’URL della pagina corrente",
    },
    feedbackPage: {
      title: "Feedback",
      myTitle: "I miei feedback",
      columnId: "#",
      columnDate: "Data",
      columnCategory: "Categoria",
      columnSubject: "Oggetto",
      columnUser: "Utente",
      columnEmail: "Email",
      columnUrl: "URL",
      columnStatus: "Stato",
      columnResolved: "Risolto il",
      openPage: "Apri pagina",
      empty: "Nessuno",
      deletedUser: "<utente eliminato>",
      // An id, not a count: printed as it is, like the "#" column.
      userFallback: (id) => `utente #${id}`,
      environment: (environment) => String(environment ?? "").toUpperCase(),
      reworkChip: (count) => (count === 1 ? "Rielaborazione" : `Rielaborazione ×${n(count)}`),
      awaitingFilter: "Solo ciò che attende Lei",
      phoneActions: "Azioni sul feedback",
    },
    feedbackDetail: {
      subject: "Oggetto",
      body: "Descrizione",
      edit: "Modifica",
      editDescription: "Modifica descrizione",
      save: "Salva",
      cancel: "Annulla",
      url: "URL",
      copyUrl: "Copia URL",
      attachment: "Allegato",
      download: (name) => `Scarica ${name}`,
      downloadFailed: "Non è stato possibile scaricare l’allegato.",
      outcome: "Esito",
      replies: "Risposte",
      resolvedAt: (date) => `Risolto il ${date}`,
      outcomeAdd: "Aggiungi esito",
      outcomeUpdate: "Aggiorna",
      outcomePlaceholder: "Cosa è stato fatto o deciso, oppure perché non verrà affrontato.",
      rework: "Rielaborazione",
      openPage: "Apri pagina",
      reworkTitle: "Rimanda in rielaborazione",
      reworkSend: "Richiedi rielaborazione",
      reworkPlaceholder: "Cosa va ancora perfezionato? Eventuali nuovi vincoli o cambi di direzione.",
      reworkUploadFailed:
        "Non è stato possibile caricare il file. La richiesta di rielaborazione non è stata inviata.",
      status: "Stato",
      note: "Nota",
    },
    // 0.38.0 — docs/feedback-harmonization.md §9.15: the vote, the comment thread, the replies.
    feedbackVote: {
      vote: "Lo voglio anch’io",
      own: "La Sua segnalazione",
    },
    feedbackComments: {
      comments: "Commenti",
      empty: "Ancora nessun commento",
      hidden: "Nascosto da un amministratore",
      hide: "Nascondi",
      unhide: "Mostra",
      delete: "Elimina",
      deleteTitle: "Eliminare questo commento?",
      deleteBody: "Verrà rimosso per tutti. L’operazione non può essere annullata.",
      field: "Scrivi un commento",
      placeholder: "Scriva un commento…",
      send: "Commenta",
    },
    feedbackReplies: {
      replies: "Risposte",
      empty: "Ancora nessuna risposta",
      admin: "Admin",
      statusChanged: "Stato cambiato in",
      field: "Scrivi una risposta",
      placeholder: "Scriva una risposta…",
      reply: "Rispondi",
      status: "Stato con la risposta",
      noChange: "Nessuna modifica",
      nudge: "Chi ha inviato la segnalazione non è stato avvisato. Aggiunga una risposta.",
    },
    accountSettings: {
      profile: {
        title: "Profilo",
        email: "Email",
        role: "Ruolo",
        memberSince: "Membro dal",
        displayName: "Nome visualizzato",
        save: "Salva",
        firstName: "Nome",
        lastName: "Cognome",
        nameRequired: "Inserisca sia il nome sia il cognome.",
      },
      password: {
        title: "Cambia password",
        current: "Password attuale",
        next: "Nuova password",
        confirm: "Conferma la nuova password",
        submit: "Cambia password",
        tooShort: "La nuova password è troppo corta.",
        mismatch: "Le password non coincidono.",
        wrongPassword: "La password non è corretta.",
      },
      twoFactor: {
        status: "Autenticazione a due fattori",
        enabledText: "Attiva",
        disabledText: "Non attiva",
        enable: "Configura l’autenticazione a due fattori",
        scanHint:
          "Scansioni questo codice con la Sua app di autenticazione, poi inserisca il codice che mostra.",
        codeLabel: "Codice di verifica",
        verify: "Verifica e attiva",
        disableSection: "Disattiva l’autenticazione a due fattori",
        password: "Password attuale",
        disable: "Disattiva",
        qrAlt: "Codice QR per la Sua app di autenticazione",
        secretHint: "Non riesce a scansionarlo? Inserisca invece questa chiave nell’app:",
        copySecret: "Copia chiave",
        // 0.31.0: the card's title; the state ("Attiva") stands beside it.
        title: "Autenticazione a due fattori",
      },
      passkeys: {
        title: "Passkey",
        description: "Acceda con impronta, volto o PIN del dispositivo invece che con una password.",
        descriptionAlongside: "Acceda con impronta, volto o PIN del dispositivo. La Sua password continua a funzionare.",
        empty: "Ancora nessuna passkey",
        loading: "Caricamento delle passkey…",
        list: "Le Sue passkey",
        nameLabel: "Nome (facoltativo)",
        namePlaceholder: "ad es. Portatile, Telefono",
        add: "Aggiungi passkey",
        adding: "In attesa del dispositivo…",
        rename: "Rinomina",
        renameItem: (name) => `Rinomina ${name}`,
        renameField: (name) => `Nuovo nome per ${name}`,
        save: "Salva",
        cancel: "Annulla",
        delete: "Elimina",
        deleteItem: (name) => `Elimina ${name}`,
        deleteConfirm: (name) => `Eliminare «${name}»? Non potrà più essere usata per accedere.`,
        confirmDelete: "Elimina passkey",
        created: (date) => `Aggiunta il ${date}`,
        lastUsed: (date) => `Ultimo uso: ${date}`,
        neverUsed: "Mai usata",
      },
    },
    measuredGrid: {
      view: "Vista tabella",
      cellsView: "Celle",
      textView: "Testo",
      addRow: "Aggiungi riga",
      removeRow: (row) => `Rimuovi riga ${row}`,
      clear: "Svuota tabella",
      pasteHint: "Incolli un blocco da un foglio di calcolo in qualsiasi cella",
      cell: (column, row) => `${column}, riga ${row}`,
      rowNumber: "Riga",
      rowActions: "Azioni riga",
      keyboardHint:
        "I tasti freccia spostano tra le celle. Digiti per sostituire una cella, F2 per modificarla, Esc per annullare la modifica. Invio scende e aggiunge una riga alla fine.",
      lineError: (line) => `Impossibile leggere la riga ${line}`,
      points: (count) => (count === 1 ? "1 punto" : `${n(count)} punti`),
      problems: (count) =>
        count === 1 ? "1 cella non è un numero" : `${n(count)} celle non sono numeri`,
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
      opensInNewTab: "si apre in una nuova scheda",
      aboutField: (field) => `Informazioni su «${field}»`,
      help: "Aiuto",
    },
    dataTable: {
      columns: "Colonne",
      selectAllRows: "Seleziona tutte le righe",
      sortHint: "Faccia clic per ordinare · Maiusc+clic per aggiungere un ordinamento",
      filter: "Filtra",
      close: "Chiudi",
      selectRow: "Seleziona riga",
      selectRows: "Seleziona righe",
      cancelSelection: "Annulla",
      rowDetails: "Dettagli",
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
      filterColumn: (column, active) => (active ? `Filtra ${column} (attivo)` : `Filtra ${column}`),
      empty: "Nessuna voce",
      actions: "Azioni",
      edit: "Modifica",
      delete: "Elimina",
      booleanTrue: "Sì",
      booleanFalse: "No",
      booleanUnset: "Non impostato",
      sortBy: "Ordina per",
      sortDefault: "Ordine predefinito",
      sortAscending: "Crescente",
      sortDescending: "Decrescente",
    },
    miniCalendar: {
      previousMonth: "Mese precedente",
      nextMonth: "Mese successivo",
      // Already formatted in the provider's locale ("lunedì 14 settembre 2026").
      day: (date) => date,
      chooseStart: "Scelga una data di inizio",
      chooseEnd: "Scelga una data di fine",
      // "Data" is feminine and the formatted day cannot agree with a participle, so the
      // date follows a label instead of being the subject.
      startSelected: (date) => `Data di inizio: ${date}. Scelga una data di fine.`,
      rangeSelected: (from, to) =>
        `Periodo selezionato: da ${from} a ${to}. Scelga una data di inizio per ricominciare.`,
    },
    monthPicker: {
      previousYear: "Anno precedente",
      nextYear: "Anno successivo",
      panel: "Scegli un mese",
      month: (monthYear) => monthYear,
      previousMonth: "Mese precedente",
      nextMonth: "Mese successivo",
      today: "Oggi",
      yearPanel: "Scegli un anno",
      earlierYears: "Anni precedenti",
      laterYears: "Anni successivi",
      thisYear: "Quest’anno",
    },
    calendarHeatmap: {
      grid: "Valori giornalieri",
      day: (date, value) => `${date}: ${value}`,
      less: "Meno",
      more: "Più",
      truncated: (count) =>
        `Vengono mostrati i giorni più recenti; ${count === 1 ? "1 giorno precedente non è mostrato" : `${n(count)} giorni precedenti non sono mostrati`}.`,
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
      minChars: (count) => `Digiti almeno ${n(count)} ${plural(count, "carattere", "caratteri")}`,
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
      phrase: (phrase) => `Digiti «${phrase}» per confermare`,
      acknowledge: "Ho letto cosa comporta questa operazione e desidero continuare.",
      needsPhrase: (phrase) => `Digiti «${phrase}» per confermare`,
      needsAcknowledge: "Spunti la casella per confermare",
      needsPassword: "Inserisca la password per confermare",
    },
    tabs: {
      add: "Aggiungi scheda",
      remove: (tab) => `Rimuovi ${tab}`,
      more: "Altre schede",
      backToFirst: "Torna alla prima scheda",
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
      done: "Fine",
    },
    dialogFrame: {
      close: "Chiudi",
    },
    bulkActionBar: {
      selected: (count) => `${n(count)} ${count === 1 ? "selezionato" : "selezionati"}`,
      clear: "Annulla selezione",
      cleared: "Selezione annullata",
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
      empty: "Trascini qui un file",
      emptyMultiple: "Trascini qui i file",
      hint: (accept) => (accept ? `Accettati: ${accept}` : "Qualsiasi tipo di file"),
      busy: "Caricamento…",
      rejectedPick: (count) =>
        count === 1 ? "Il file non è stato aggiunto" : `Nessuno dei ${n(count)} file è stato aggiunto`,
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
      missingRequired: "Compili tutti i campi obbligatori.",
      genericError: "Si è verificato un errore",
    },
    tour: {
      next: "Avanti",
      back: "Indietro",
      skip: "Salta",
      done: "Fine",
      awaitClickHint: "Faccia clic sull’elemento evidenziato per continuare",
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
      error: "Ricerca non riuscita. Riprovi.",
    },
    globalSearch: {
      trigger: "Cerca",
      placeholder: "Cerca o vai a…",
      shortcut: (keys) => `Cerca (${keys})`,
      suggestions: "Provi",
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
      instructions: "Firmi nel riquadro con il mouse, il dito o una penna.",
      typedFallbackHint: "Se non può disegnare, scriva invece il Suo nome.",
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
        `Almeno ${n(minLength)} ${plural(minLength, "carattere", "caratteri")}`,
      ruleCase: "Maiuscole e minuscole",
      ruleDigit: "Un numero",
      ruleSymbol: "Un simbolo",
      optional: (rule) => `${rule} (facoltativo)`,
      met: "Soddisfatto:",
      notMet: "Non soddisfatto:",
      tooLong: (maxBytes) =>
        `Al massimo ${n(maxBytes)} ${plural(maxBytes, "carattere", "caratteri")} (le lettere accentate e le emoji contano più di uno).`,
    },
    seriesChart: {
      resetZoom: "Reimposta zoom",
      zoomHint:
        "Trascini per ingrandire: una selezione più o meno quadrata ingrandisce entrambi gli assi, una lunga e sottile solo il proprio. Faccia doppio clic per ripristinare.",
      empty: "Nessun dato",
      legend: "Serie",
      points: "Valori del grafico",
    },
    pieChart: {
      slices: "Settori del grafico",
      slice: (label, value, percent) => `${label}: ${value} (${percent})`,
      total: "Totale",
      empty: "Nessun dato",
      legend: "Categorie",
    },
    confirmDialog: {
      confirm: "Conferma",
      cancel: "Annulla",
      typed: (text) => `Digiti «${text}» per confermare`,
    },
    floatingPanel: {
      close: "Chiudi",
      badge: (count) => `${n(count)} ${plural(count, "nuovo", "nuovi")}`,
    },
    copyButton: {
      copy: "Copia",
      copied: "Copiato",
      failed: "Copia non riuscita",
      copiedAnnouncement: "Copiato negli appunti",
      failedAnnouncement: "Impossibile copiare negli appunti",
    },
    list: {
      unread: "Non letto",
      opensInNewTab: "si apre in una nuova scheda",
    },
    breadcrumbs: {
      label: "Percorso di navigazione",
      showAll: "Mostra percorso completo",
    },
    toast: {
      close: "Chiudi notifica",
      notifications: "Notifiche",
      undo: "Annulla",
      redo: "Ripeti",
    },
    form: {
      save: "Salva",
      cancel: "Annulla",
      submitShortcut: (apple) => (apple ? "⌘ Invio" : "Ctrl+Invio"),
    },
    descriptionList: {
      empty: "—",
    },
    lineItems: {
      add: "Aggiungi riga",
      remove: (row) => `Rimuovi riga ${row}`,
      confirmRemove: (row) => `Rimuovere la riga ${row}? Prema di nuovo per confermare`,
      row: (row) => `Riga ${row}`,
      cell: (column, row) => `${column}, riga ${row}`,
      totals: "Totale",
    },
    progressBar: {
      unlimited: "Illimitato",
      overLimit: (amount) => `${amount} oltre il limite`,
    },
    signedAmount: {
      positive: (amount) => `più ${amount}`,
      negative: (amount) => `meno ${amount}`,
    },
    errorBoundary: {
      title: "Si è verificato un errore",
      message: "Impossibile mostrare questa parte della pagina. Riprovi o ricarichi la pagina.",
      retry: "Riprova",
      details: "Dettagli dell’errore",
      reload: "Ricarica",
      updateTitle: "È disponibile una nuova versione",
      updateMessage: "Una parte dell’app è cambiata da quando questa pagina è stata caricata. Ricarichi per ottenere la nuova versione.",
      offlineTitle: "Nessuna connessione",
      offlineMessage: "Impossibile caricare questa pagina senza connessione. Si riconnetta, poi ricarichi la pagina.",
      copyReport: "Copia il rapporto di errore",
      reported: "L’errore è stato segnalato automaticamente.",
      reportedAs: (reference) => `Segnalato con riferimento ${reference}`,
    },
    authedImage: {
      loading: "Caricamento immagine…",
      loadError: "Impossibile caricare l’immagine",
      failedImage: (alt) => `${alt}: impossibile caricare l’immagine`,
    },
    imageGrid: {
      list: "Immagini",
      item: (index, count) => `Immagine ${n(index)} di ${n(count)}`,
      actions: (name) => `Azioni per ${name}`,
    },
    lightbox: {
      dialog: "Visualizzatore immagini",
      close: "Chiudi",
      previous: "Immagine precedente",
      next: "Immagine successiva",
      counter: (index, count) => `${n(index)} / ${n(count)}`,
      position: (index, count) => `Immagine ${n(index)} di ${n(count)}`,
      download: "Scarica",
      zoom: "Ingrandisci",
      noPreview: "Nessuna anteprima disponibile per questo file",
      openInNewTab: "Apri in una nuova scheda",
    },
    writeLock: {
      reason: "Può visualizzarlo, ma non modificarlo.",
    },
    accountState: {
      // Agreeing with "account" (masculine): the chip is the state of an account.
      active: "Attivo",
      inactive: "Non attivo",
      invited: "Invitato",
      registered: "Registrato",
      unverified: "Non verificato",
      passwordChange: "Deve cambiare la password",
      deletion: "Eliminazione richiesta",
      deletionOn: (date) => `Eliminazione il ${date}`,
    },
    shareCard: {
      dialogTitle: "Condividi",
      close: "Chiudi",
      email: "Indirizzo email",
      emailOptional: "Indirizzo email (facoltativo)",
      // example.com is reserved for examples (RFC 2606); a localised domain is real.
      emailPlaceholder: "nome@example.com",
      invalidEmail: "Inserisca un indirizzo email completo.",
      role: "Ruolo",
      roleOf: (name) => `Ruolo di ${name}`,
      add: "Condividi",
      whoHasAccess: "Chi ha accesso",
      nobodyYet: "Nessun altro ha ancora accesso.",
      pending: "In attesa",
      openInvite: "Link di invito aperto",
      copyLink: "Copia link",
      team: "Team",
      teamHint: (name) => `Tutti i membri di ${name} avranno accesso.`,
      remove: "Rimuovi accesso",
      removeConfirm: (name) => `Rimuovere l’accesso di ${name}?`,
      revokePending: "Ritira invito",
      revokePendingConfirm: (name) => `Ritirare l’invito per ${name}?`,
      failed: "Non ha funzionato. Riprovi.",
      loading: "Caricamento…",
    },
    reauthDialog: {
      title: "Confermi la Sua identità",
      description: "Inserisca la password attuale per continuare.",
      password: "Password attuale",
      submit: "Continua",
      cancel: "Annulla",
    },
    // 0.35: keksdose's reviewed Italian (its `boot.slow` / `boot.waking`), which is canon.
    serverWake: {
      slow: "Sta ancora caricando: ci vuole più del solito.",
      waking: (appName) =>
        `Il server si addormenta quando nessuno usa ${appName ?? "l’app"}, perciò la prima richiesta dopo una pausa deve prima riavviarlo. Può volerci un momento: non va perso nulla, la pagina si riempie da sola.`,
    },
    // 0.28.0 — docs/legal-harmonization.md §4.3/§4.4: keksdose's reviewed Italian, and
    // Kurvenschmiede's for the browser section and the beta notice; formal, "Lei" and
    // "Suo" capitalised, like the rest of this catalogue.
    legal: {
      navLabel: "Note legali",
      links: {
        impressum: "Impressum",
        privacy: "Privacy",
        terms: "Condizioni d’uso",
      },
      titles: {
        impressum: "Impressum",
        privacy: "Informativa sulla privacy",
        terms: "Condizioni d’uso",
      },
      backHome: "Torna alla pagina iniziale",
      // The elided article stays glued to the link: "e l’Informativa", no space (§4.4).
      accept: "Accetto le {terms} e l’{privacy}",
      notice: {
        beta: "Beta chiusa. Questi testi non sono ancora stati verificati da un avvocato e lo saranno prima di un lancio pubblico.",
        privacy:
          "Beta chiusa. Le formulazioni legali qui sotto non sono ancora state verificate da un avvocato; lo saranno prima di un lancio pubblico. Le descrizioni tecniche — cosa viene memorizzato, dove e chi può leggerlo — descrivono ciò che il software fa davvero oggi e sono pensate per essere verificate rispetto a esso.",
      },
      translation: {
        note: (o) =>
          `Questa è una traduzione fornita per Sua comodità. Fa fede la versione in ${o.bindingLanguage}.`,
        show: (o) => `Mostra la versione in ${o.bindingLanguage}`,
      },
      sections: {
        impressum: {
          operator: {
            title: "Gestore",
            body: (o) =>
              `${o.name}\n${o.postalCode} ${o.city}\n${o.country}\n\nL’indirizzo postale completo viene fornito su richiesta a chiunque abbia un legittimo interesse giuridico; scriva all’indirizzo di contatto qui sotto.`,
          },
          contact: {
            title: "Contatto",
            body: (o) => `Email: ${o.email}`,
          },
          disclaimer: {
            title: "Responsabilità per contenuti e link",
            body: "Questo è un progetto privato e non commerciale, offerto nell’ambito di una beta chiusa, senza garanzia. I siti esterni a cui rimandiamo sono di responsabilità dei rispettivi gestori; non abbiamo alcun controllo sui loro contenuti.",
            // 0.32.0 — the commercial variant (docs/billing-harmonization.md §8). "Piano"
            // and "abbonamento" as the `billing` namespace.
            commercial:
              "Questo è un servizio commerciale. I piani a pagamento sono venduti dal nostro rivenditore, che agisce in qualità di Merchant of Record: vende l’abbonamento in nome proprio, incassa il pagamento, emette la fattura e gestisce l’IVA, e all’acquisto si applicano le sue condizioni di vendita. Ci impegniamo affinché i contenuti di questo servizio siano corretti, ma non possiamo garantire che siano completi o aggiornati. I siti esterni a cui rimandiamo sono di responsabilità dei rispettivi gestori; non abbiamo alcun controllo sui loro contenuti.",
          },
        },
        privacy: {
          controller: {
            title: "Titolare del trattamento",
            // "Titolare", as the title says: in the GDPR's Italian the "responsabile del
            // trattamento" is the processor (Art. 28), not the controller.
            body: (o) =>
              `Il titolare del trattamento dei dati personali in questo servizio è:\n${o.name}\n${o.postalCode} ${o.city}, ${o.country}\nEmail: ${o.email}\n\nL’indirizzo postale completo viene fornito su richiesta agli interessati e alle autorità di controllo.`,
          },
          legal_basis: {
            title: "Base giuridica",
            body: "Poiché il gestore risiede in Svizzera, il trattamento è disciplinato dalla Legge federale svizzera sulla protezione dei dati (LPD). Dove il Regolamento generale sulla protezione dei dati dell’UE (GDPR) si applica a Lei, ci basiamo sull’esecuzione di un contratto per fornire il servizio (art. 6, par. 1, lett. b GDPR) e sul nostro legittimo interesse a gestirlo e proteggerlo (art. 6, par. 1, lett. f GDPR).",
          },
          browser: {
            title: "Che cosa salva il Suo browser",
            lead: "Nessun cookie. L’app salva quanto segue nella memoria del Suo browser:",
            tail: "Niente di tutto ciò viene usato per tracciarLa. Le voci in attesa di invio ci vengono trasmesse non appena possibile; tutto il resto rimane sul Suo dispositivo. Tutto questo scompare quando cancella i dati del sito, e uscendo dall’account vengono rimossi i token di accesso.",
          },
          rights: {
            title: "I Suoi diritti",
            lead: "Ha diritto di accesso, rettifica, cancellazione, limitazione, portabilità dei dati e opposizione.",
            tail: "Se si trova in Svizzera può rivolgersi all’Incaricato federale della protezione dei dati e della trasparenza (IFPDT); se si trova nell’UE può presentare reclamo alla Sua autorità di controllo locale.",
          },
          contact: {
            title: "Contatto per la protezione dei dati",
            body: (o) => `Per qualsiasi richiesta sulla privacy, si rivolga a: ${o.email}`,
          },
        },
        terms: {
          warranty: {
            title: "Nessuna garanzia",
            body: "Il servizio è fornito «così com’è» e «come disponibile», senza garanzie di alcun tipo nei limiti consentiti dalla legge. Come beta può contenere errori, cambiare o essere interrotto in qualsiasi momento: conservi copie di backup dei dati importanti.",
          },
          liability: {
            title: "Limitazione di responsabilità",
            body: "Nei limiti consentiti dalla legge applicabile, il gestore non è responsabile per danni indiretti o consequenziali derivanti dall’uso o dall’impossibilità di usare il servizio. Nulla di quanto qui previsto limita la responsabilità che non può essere limitata per legge.",
          },
          changes: {
            title: "Modifiche a queste condizioni",
            body: "Queste condizioni possono essere aggiornate con l’evoluzione del servizio. Le modifiche sostanziali saranno annunciate via email o nell’app; l’uso continuato dopo una modifica ne implica l’accettazione.",
          },
          language: {
            title: "Lingua",
            body: (o) =>
              `Le presenti condizioni sono redatte in ${o.bindingLanguage}. Le traduzioni in altre lingue sono fornite solo per comodità; in caso di divergenza prevale la versione in ${o.bindingLanguage}.`,
          },
          law: {
            title: "Legge applicabile",
            body: (o) =>
              `Queste condizioni sono disciplinate dal diritto svizzero, con esclusione delle norme sui conflitti di legge. Nei limiti consentiti dalla legge, il foro competente è ${o.city} (${o.region}), ${o.country}.`,
          },
        },
      },
    },
    // 0.29.0 — docs/auth-harmonization.md: keksdose's reviewed Italian (auth.*,
    // verify_email, error.not_found_*, budget_share.join_*), kastlan's for the names and
    // the 2FA prompt; written fresh where neither app had the sentence. Formal, "Lei" and
    // "Suo" capitalised; headings addressed formally ("Scelga", not keksdose's "Scegli").
    signIn: {
      email: "Email",
      password: "Password",
      submit: "Accedi",
      passkey: "Accedi con una passkey",
      forgotPassword: "Password dimenticata?",
      noAccount: "Non ha ancora un account?",
      register: "Crea account",
      invalidCredentials: "L’indirizzo email o la password non sono corretti.",
      failed: "Accesso non riuscito. Riprovi.",
      passkeyFailed: "Accesso con passkey non riuscito.",
      deactivatedHint: "Account disattivato? Scriva a {contact}.",
      // "Account creato con…" rather than "Si è registrato con…", which needs a gender.
      tagHint: (taggedAddress) => `Account creato con ${taggedAddress}? Usi quell’indirizzo.`,
      twoFactorTitle: "Autenticazione a due fattori",
      twoFactorIntro: "Inserisca il codice mostrato dalla Sua app di autenticazione.",
      code: "Codice 2FA",
      verify: "Verifica",
      codeInvalid: "Codice 2FA non valido.",
      setPasswordTitle: "Scelga una nuova password",
      setPasswordIntro:
        "Per questo account è stata richiesta una nuova password. Ne scelga una e accederà subito.",
      newPassword: "Nuova password",
      confirmPassword: "Ripeti la nuova password",
      passwordMismatch: "Le password non coincidono.",
      setPasswordSubmit: "Imposta la password e accedi",
      setPasswordFailed: "Impossibile impostare la password.",
      expired: "Questo accesso è scaduto. Acceda di nuovo.",
      backToSignIn: "Torna all’accesso",
      // kastlan's backup-code words ("codice di riserva" — not keksdose's "codice di
      // recupero", which is the key of its end-to-end encryption).
      useRecoveryCode: "Usa un codice di riserva",
      useAuthenticatorCode: "Usa la Sua app di autenticazione",
      recoveryCode: "Codice di riserva",
      recoveryIntro:
        "Inserisca uno dei codici di riserva che ha salvato quando ha attivato l’autenticazione a due fattori.",
      recoveryCodeHint: (length) => `${n(length)} lettere e cifre. Trattini e spazi non contano.`,
      recoveryCodeInvalid: "Questo codice di riserva non è valido o è già stato usato.",
      rateLimited,
      // 0.31.0: the same words as `landing.requestAccess`.
      requestAccess: "Richiedi l’accesso",
    },
    register: {
      firstName: "Nome",
      lastName: "Cognome",
      email: "Email",
      emailTagUse: (address) => `Usa ${address}`,
      emailTagHint:
        "Molti provider recapitano nome+tag@… nella stessa casella, così la posta di questa app è filtrabile e riconoscibile. Verifichi che il Suo lo faccia prima di farci affidamento: accederebbe con l’indirizzo con il tag.",
      invitedEmailHint: "L’indirizzo a cui è stato inviato il Suo invito.",
      invitedTagNote: "L’indirizzo con il tag riceve una propria email di conferma.",
      password: "Password",
      confirmPassword: "Ripeti la password",
      passwordMismatch: "Le password non coincidono.",
      language: "Lingua",
      submit: "Crea account",
      haveAccount: "Ha già un account?",
      signIn: "Accedi",
      emailTaken: "Esiste già un account con questo indirizzo email.",
      registrationClosed:
        "I nuovi account si creano solo su invito. Chieda al gestore di invitare il Suo indirizzo email.",
      invitationInvalid: "Questo link di invito non è valido.",
      invitationExpired: "Questo invito è scaduto. Ne chieda uno nuovo.",
      failed: "Registrazione non riuscita. Riprovi.",
      rateLimited,
    },
    completeName: {
      title: "Completi il Suo nome",
      description:
        "Nome e cognome ora vengono richiesti separatamente. Controlli quanto è già compilato e aggiunga ciò che manca.",
      firstName: "Nome",
      lastName: "Cognome",
      save: "Salva",
      later: "Più tardi",
      failed: "Impossibile salvare il Suo nome. Riprovi.",
    },
    forgotPassword: {
      title: "Password dimenticata",
      intro:
        "Inserisca l’indirizzo email del Suo account. Le invieremo un link per scegliere una nuova password.",
      email: "Email",
      submit: "Invia il link",
      sent: (email) => `Se esiste un account per ${email}, il link è in arrivo.`,
      sentHint: "Il link è valido per un’ora e funziona una sola volta. Controlli anche la cartella spam.",
      backToSignIn: "Torna all’accesso",
      error: "Richiesta non riuscita. Riprovi più tardi.",
      rateLimited,
    },
    resetPassword: {
      title: "Scelga una nuova password",
      checking: "Verifica del link…",
      intro: (email) => `Sta impostando una nuova password per ${email}.`,
      newPassword: "Nuova password",
      confirmPassword: "Ripeti la nuova password",
      mismatch: "Le password non coincidono.",
      submit: "Salva password",
      failed: "Impossibile cambiare la password.",
      noToken: "Questo link è incompleto.",
      invalid: "Questo link non è valido o è scaduto.",
      invalidHint:
        "I link sono validi per un’ora e funzionano una sola volta. Ne richieda semplicemente uno nuovo.",
      requestNew: "Richiedi un nuovo link",
      success: "La Sua password è stata cambiata. Ora può accedere con quella.",
      sessionsEnded: "I dispositivi connessi sono stati disconnessi: lì dovrà accedere di nuovo.",
      signIn: "Vai all’accesso",
      rateLimited,
    },
    verifyEmail: {
      title: "Confermi il Suo indirizzo email",
      verifying: "Conferma in corso…",
      verified: "Il Suo indirizzo email è confermato.",
      continue: "Continua",
      invalid: "Questo link di conferma non è valido",
      expired: "Questo link di conferma è scaduto",
      noToken: "A questo link manca il token di conferma.",
      invalidHint: "Il link potrebbe essere scaduto o già stato usato.",
      requestInApp: "Può richiederne uno nuovo dall’app.",
      requestHere: "Può richiederne uno nuovo qui.",
      resend: "Invia di nuovo",
      resendIn: (seconds) => `Invia di nuovo tra ${n(seconds)} s`,
      resent: "Email di conferma inviata",
      resendError: "Impossibile inviare l’email di conferma",
      rateLimited,
      banner: "Confermi il Suo indirizzo email.",
      dismiss: "Non ora",
    },
    notFound: {
      title: "Pagina non trovata",
      body: "Questo indirizzo non esiste (più). Forse è un errore di battitura, oppure la pagina è stata spostata.",
      home: "Vai alla pagina iniziale",
      app: "Torna all’app",
    },
    acceptInvitation: {
      title: "Accetta l’invito",
      accepting: "Adesione in corso…",
      accepted: "Invito accettato.",
      // "Ora fa parte di…" rather than "Si è unito/a a…", which needs a gender.
      joined: (name) => `Ora fa parte di ${name}.`,
      continue: "Continua",
      invalid: "Impossibile unirsi con questo link",
      expired: "Questo invito è scaduto",
      noToken: "A questo link manca il token di invito.",
      askAgain: "Chieda a chi ha inviato l’invito di mandarne uno nuovo.",
      signInFirst: "Acceda per accettare questo invito",
      signInHint: "Usi l’account a cui è stato inviato l’invito.",
      signIn: "Accedi",
      register: "Crea account",
    },
    companySwitcher: {
      switchCompany: "Cambia azienda",
      heading: "Aziende",
      current: (name) => `Azienda: ${name}`,
      currentMark: "(attuale)",
      switching: "Cambio azienda in corso…",
    },
    // 0.30.0 — docs/user-admin-harmonization.md: keksdose's reviewed Italian for the admin
    // words (admin.users.*), Kurvenschmiede's for transfer, invitations and sessions,
    // kastlan's for the company, the throttle and "Esci ovunque"; written fresh where no
    // app had the sentence. "Lei", and phrased so that no sentence about the reader needs
    // a gender ("disconnesso/a").
    emailChange: {
      title: "Indirizzo email",
      current: "Indirizzo attuale",
      newEmail: "Nuovo indirizzo email",
      password: "Password attuale",
      passwordHint: "Accede con il Suo indirizzo, quindi per cambiarlo serve la password.",
      emailTagUse: (address) => `Usa ${address}`,
      emailTagHint:
        "Molti provider recapitano nome+tag@… nella stessa casella, così la posta di questa app è filtrabile e riconoscibile. Verifichi che il Suo lo faccia prima di farci affidamento: accederebbe con l’indirizzo con il tag.",
      submit: "Cambia indirizzo email",
      sameAsCurrent: "Questo è già il Suo indirizzo.",
      emailTaken: "Esiste già un account con questo indirizzo email.",
      wrongPassword: "La password non è corretta.",
      pending: (newEmail) => `Confermi il link che abbiamo inviato a ${newEmail}.`,
      pendingHint: (currentEmail) =>
        `Fino ad allora continua ad accedere con ${currentEmail}. Controlli anche la cartella spam.`,
      resend: "Invia di nuovo il link",
      resent: "Abbiamo inviato di nuovo il link.",
      cancel: "Annulla la modifica",
      confirmed: (email) => `Il Suo indirizzo email ora è ${email}.`,
      passkeyNote:
        "Le Sue passkey continuano a funzionare. Il Suo dispositivo potrebbe ancora mostrarle con il vecchio indirizzo.",
      rateLimited,
      failed: "Non ha funzionato. Riprovi.",
    },
    // 0.36.0 — docs/notifications-harmonization.md §4.2: the notification cards. The push
    // and device words follow keksdose's reviewed Italian.
    notifications: {
      typesTitle: "Avvisami per",
      typesDescription: "Scelga di cosa essere avvisato, e come.",
      byEmail: "Per e-mail",
      emailUnverified: "Confermi il Suo indirizzo per riceverle.",
      digestCadence: "Frequenza",
      digestWeekly: "Settimanale",
      digestMonthly: "Mensile",
      typesLoading: "Caricamento delle impostazioni di notifica…",
      typesEmpty: "Non ci sono notifiche per questo account.",
      quietTitle: "Ore di silenzio",
      quietDescription: (inbox) =>
        inbox
          ? "Nessuna notifica push in questa fascia oraria. Arrivano comunque nella Sua casella."
          : "Nessuna notifica push in questa fascia oraria.",
      quietFrom: "Dalle",
      quietUntil: "Alle",
      quietIncomplete:
        "Imposti sia l’ora di inizio sia quella di fine. Le ore di silenzio valgono solo quando sono impostate entrambe.",
      timeZone: "Fuso orario",
      deviceZone: (zone) => `Questo dispositivo è nel fuso ${zone}.`,
      useDeviceZone: "Usa questo",
      regions: {
        Africa: "Africa",
        America: "Americhe",
        Antarctica: "Antartide",
        Arctic: "Artide",
        Asia: "Asia",
        Atlantic: "Atlantico",
        Australia: "Australia",
        Europe: "Europa",
        Indian: "Oceano Indiano",
        Pacific: "Pacifico",
      },
      pushTitle: "Notifiche push",
      pushDescription: "Notifiche su questo dispositivo, anche quando l’app è chiusa.",
      unsupported: "Questo browser non supporta le notifiche push.",
      iosInstall: (app) =>
        `Su iPhone o iPad aggiunga prima ${app} alla schermata Home: iOS recapita le notifiche solo all’app installata.`,
      notConfigured: "Le notifiche push non sono configurate su questo server.",
      blocked: "Le notifiche sono bloccate nelle impostazioni di questo browser.",
      on: "Le notifiche sono attive per questo dispositivo.",
      off: "Le notifiche sono disattivate per questo dispositivo.",
      otherAccount:
        "Questo browser riceve le notifiche di un altro account. Le attivi qui per riceverle sull’account con cui ha effettuato l’accesso.",
      enable: "Attiva notifiche",
      disable: "Disattiva",
      sendTest: "Invia un test",
      enableFailed: "Impossibile attivare le notifiche.",
      noServiceWorker: "Impossibile raggiungere il service worker dell’app. Ricarichi la pagina e riprovi.",
      pushTimeout: "Il servizio push del browser non ha risposto. Controlli la connessione e riprovi.",
      testSent: (count) => `Test inviato a ${n(count)} ${plural(count, "dispositivo", "dispositivi")}`,
      testNone: "Nessun dispositivo ha accettato il test. Attivi prima le notifiche per questo dispositivo.",
      testFailed: "Impossibile inviare la notifica di prova.",
      explainerTitle: "Attivare le notifiche?",
      explainerBody: (app) =>
        `${app} invia notifiche solo per ciò che sceglie Lei, e può disattivarle in qualsiasi momento.`,
      explainerHint: "Il browser Le chiederà poi il permesso.",
      explainerContinue: "Continua",
      devicesTitle: "Dispositivi di notifica",
      devicesDescription:
        "Tutti i dispositivi che ricevono notifiche push per il Suo account. Rimuova quelli che non usa più.",
      devicesLoading: "Caricamento dei dispositivi…",
      devicesEmpty: "Nessun dispositivo riceve ancora notifiche.",
      unknownDevice: "Dispositivo sconosciuto",
      thisDevice: "Questo dispositivo",
      added: (date) => `Aggiunto il ${date}`,
      lastDelivery: (date) => `Ultimo recapito il ${date}`,
      noDelivery: "Ancora nessun recapito",
      failures: (count) => `${n(count)} ${plural(count, "recapito fallito", "recapiti falliti")} di fila`,
      remove: "Rimuovi",
      // Starts with `remove`, the button's visible text, for voice control.
      removeItem: (device) => `Rimuovi ${device}`,
      removePrompt: "Smettere di inviare notifiche a questo dispositivo?",
      unsubscribeTitle: "Notifiche via e-mail",
      unsubscribeAbout: (type) => `Riceve e-mail su: ${type}.`,
      unsubscribeGeneric: "Riceve e-mail di notifica.",
      stopThese: "Non ricevere più queste e-mail",
      stopAll: (app) => `Non ricevere più e-mail di notifica da ${app}`,
      stoppedThese: "Fatto. Non riceverà più queste e-mail.",
      stoppedAll: (app) => `Fatto. Non riceverà più e-mail di notifica da ${app}.`,
      accountMail: "Le e-mail sul Suo account continuano ad arrivare.",
      turnBackOn: "Può riattivarle in qualsiasi momento nelle impostazioni.",
      openSettings: "Apri le impostazioni",
      invalidLink: "Questo link non funziona più. Può disattivare le e-mail nelle impostazioni.",
      failed: "Non ha funzionato. Riprovi.",
    },
    sessions: {
      title: "Sessioni",
      description:
        "Ha effettuato l’accesso su un dispositivo che non usa più o di cui non si fida? Esca ovunque.",
      signOutEverywhere: "Esci ovunque…",
      signOutEverywherePrompt:
        "Tutte le sessioni terminano, compresa questa: anche questo dispositivo verrà disconnesso e dovrà accedere di nuovo da qui.",
      confirmSignOutEverywhere: "Esci ovunque",
      list: "Dove ha effettuato l’accesso",
      loading: "Caricamento delle sessioni…",
      empty: "Nessuna sessione da mostrare.",
      current: "Questo dispositivo",
      unknownDevice: "Dispositivo sconosciuto",
      // A colon: `when` is either "3 ore fa" or a date.
      lastActive: (when) => `Ultima attività: ${when}`,
      ip: (address) => `IP ${address}`,
      revoke: "Disconnetti",
      // Starts with `revoke`, the button's visible text, for voice control.
      revokeItem: (device) => `Disconnetti ${device}`,
      failed: "Non ha funzionato. Riprovi.",
    },
    deleteAccount: {
      title: "Elimina account",
      afterDays: (days) =>
        `Il Suo account viene disattivato subito ed eliminato definitivamente ${n(days)} ${plural(days, "giorno", "giorni")} dopo.`,
      operator: "Il Suo account viene disattivato subito, poi il gestore lo eliminerà definitivamente.",
      arm: "Elimina account…",
      prompt: "Tutte le Sue sessioni terminano, su ogni dispositivo, e il Suo account non potrà più essere usato.",
      handOver: (count) =>
        count === 1
          ? "1 elemento visibile ad altri passerà a un amministratore."
          : `${n(count)} elementi visibili ad altri passeranno a un amministratore.`,
      confirm: "Elimina il mio account",
      done: "Il Suo account è disattivato. Disconnessione in corso.",
      wrongPassword: "La password non è corretta.",
      confirmationMismatch: "Questo non è l’indirizzo del Suo account.",
      lastAdmin: "Il Suo è l’ultimo account amministratore. Renda prima amministratore qualcun altro.",
      lastAdminOf: (companies) =>
        `Il Suo è l’ultimo account amministratore di ${companies}. Lì renda prima amministratore qualcun altro.`,
      // keksdose's "famiglia".
      householdHasMembers:
        "La Sua famiglia ha altri membri, quindi l’account non può essere eliminato qui. Scriva al gestore.",
      rateLimited,
      failed: "Impossibile eliminare il Suo account. Riprovi.",
    },
    dataExport: {
      title: "Esporta i Suoi dati",
      description: "Scarichi una copia dei dati del Suo account come file JSON.",
      download: "Scarica i miei dati",
      started: "Il download è iniziato.",
      saveAgain: "Non è partito? Salva il file",
      rateLimited: (seconds) =>
        seconds && seconds > 0
          ? `Ha appena esportato i Suoi dati. Riprovi tra ${wait(seconds)}.`
          : "Ha appena esportato i Suoi dati. Riprovi tra un minuto.",
      failed: "Esportazione non riuscita. Riprovi.",
    },
    userRoster: {
      name: "Nome",
      email: "Email",
      role: "Ruolo",
      state: "Stato",
      created: "Creato il",
      lastLogin: "Ultimo accesso",
      never: "Mai",
      actions: "Azioni",
      actionsFor: (name) => `Azioni per ${name}`,
    },
    roleSelect: {
      label: "Ruolo",
      rolesLegend: "Ruoli",
      roleOf: (name) => `Ruolo di ${name}`,
      lockedLastAdmin: "L’ultimo account amministratore attivo mantiene questo ruolo.",
      lockedSelf: "Non può cambiare il Suo ruolo.",
      notForLastAdmin: "non per l’ultimo amministratore",
      notForSelf: "non per il Suo account",
      unavailable: (role, reason) => `${role} (${reason})`,
    },
    reviewerScope: {
      languages: "Lingue",
      hint: "Spunti le lingue che questa persona rivede.",
      none: "Nessuna lingua: salvando si toglie il ruolo di revisore.",
      areas: "Limita a",
      legalOnly: "Solo le pagine legali",
      legalOnlyHint:
        "Impressum, informativa sulla privacy e condizioni d’uso: per un giurista più che per un madrelingua.",
      failed: "Impossibile salvare il ruolo di revisore. Riprovi.",
    },
    adminAction: {
      confirm: "Conferma",
      cancel: "Annulla",
      close: "Chiudi",
      lastAdmin:
        "Questo è l’ultimo account amministratore attivo. Renda prima amministratore qualcun altro.",
      self: "Non può farlo sul Suo account.",
      confirmationMismatch:
        "L’indirizzo non corrisponde a questo account. Controlli su quale account si trova.",
      otherCompanies:
        "Questo account appartiene anche ad altre aziende, quindi solo il gestore della piattaforma può farlo. Può invece rimuoverlo da questa azienda.",
      removeFromCompany: "Rimuovi dall’azienda",
      failed: "Non ha funzionato. Riprovi.",
    },
    adminActionLog: {
      title: "Azioni di amministrazione",
      empty: "Ancora nessuna azione di amministrazione.",
      loading: "Caricamento…",
      by: (actor) => `da ${actor}`,
      bySelf: "dall’utente stesso",
      automatic: "automaticamente",
      erased: "un account cancellato",
      filteredTo: (target) => `Solo ${target}`,
      showAll: "Mostra tutte le azioni",
      filterBy: (target) => `Mostra solo le azioni su ${target}`,
      // Agreeing with "account" (masculine), like `accountState`.
      actions: {
        deactivate: "Disattivato",
        reactivate: "Riattivato",
        role: "Ruolo cambiato",
        password_change_require: "Nuova password richiesta",
        password_change_withdraw: "Richiesta di nuova password ritirata",
        mail_verification: "Email di conferma inviata",
        mail_reset: "Email di reimpostazione password inviata",
        reviewer: "Ambito di revisione cambiato",
        invite: "Invitato",
        invite_resend: "Invito inviato di nuovo",
        invite_revoke: "Invito ritirato",
        transfer: "Lavoro passato ad altri",
        deletion_request: "Eliminazione richiesta",
        deletion_cancel: "Eliminazione annullata",
        erase: "Account cancellato",
        plan: "Piano modificato",
      },
      // 0.34 (§11.5): whole phrases per noun. The group's own agree with the noun
      // ("Azienda creata"; Kurvenschmiede's "il team" is masculine, never "squadra"), a
      // member's with "account", as `actions` do. `budget` is keksdose's; `company` keeps
      // `actions.membership_remove`'s string.
      groupActions: {
        group: {
          group_create: "Gruppo creato",
          group_rename: "Gruppo rinominato",
          group_delete: "Gruppo eliminato",
          membership_add: "Aggiunto al gruppo",
          membership_role: "Ruolo nel gruppo cambiato",
          membership_remove: "Rimosso dal gruppo",
          deleted: "un gruppo eliminato",
        },
        team: {
          group_create: "Team creato",
          group_rename: "Team rinominato",
          group_delete: "Team eliminato",
          membership_add: "Aggiunto al team",
          membership_role: "Ruolo nel team cambiato",
          membership_remove: "Rimosso dal team",
          deleted: "un team eliminato",
        },
        company: {
          group_create: "Azienda creata",
          group_rename: "Azienda rinominata",
          group_delete: "Azienda eliminata",
          membership_add: "Aggiunto all’azienda",
          membership_role: "Ruolo nell’azienda cambiato",
          membership_remove: "Rimosso dall’azienda",
          deleted: "un’azienda eliminata",
        },
        budget: {
          group_create: "Budget creato",
          group_rename: "Budget rinominato",
          group_delete: "Budget eliminato",
          membership_add: "Aggiunto al budget",
          membership_role: "Ruolo nel budget cambiato",
          membership_remove: "Rimosso dal budget",
          deleted: "un budget eliminato",
        },
      },
    },
    transferOwnership: {
      title: (name) => `Passa il lavoro di ${name}`,
      body: "Tutto ciò che possiede questo account passa all’account scelto, in un solo passo.",
      recipient: "Passalo a",
      choose: "Scelga un account…",
      chooseFirst: "Scelga chi riceve il lavoro",
      confirm: "Passa il lavoro",
      customer: "cliente",
      deactivated: "disattivato",
      self: "lo stesso account",
      unavailable: (account, reason) => `${account} (${reason})`,
      noCandidates: "Nessun altro account può riceverlo.",
    },
    invitations: {
      email: "Indirizzo email",
      invalidEmail: "Inserisca un indirizzo email completo.",
      role: "Ruolo",
      scope: "Ambito",
      scopeNone: "Nessuno",
      language: "Lingua dell’invito",
      note: "Nota",
      invite: "Invita",
      listTitle: "Inviti",
      empty: "Non è ancora stato invitato nessuno.",
      loading: "Caricamento…",
      // Agreeing with "invito" (masculine).
      status: { open: "Aperto", accepted: "Accettato", expired: "Scaduto", revoked: "Ritirato" },
      sent: (date) => `Inviato il ${date}`,
      // kastlan's "Valido fino al".
      expires: (date) => `Valido fino al ${date}`,
      invitedBy: (name) => `da ${name}`,
      resend: (email) => `Invia a ${email} un nuovo link`,
      copyLink: "Copia link di invito",
      revoke: (email) => `Ritira l’invito per ${email}`,
      consoleHint:
        "Questo server non invia email: vengono scritte nel log del server. Copi qui ogni link di invito e lo inoltri Lei stesso: viene mostrato una sola volta.",
      linkReady: (email) => `Il link di invito per ${email}, mostrato solo questa volta:`,
      notSent: (email) => `${email} è invitato, ma non è stato possibile inviare l’email. La reinvii.`,
      failed: "Non ha funzionato. Riprovi.",
    },
    characterCount: {
      count: (used, max) => `${n(used)} di ${n(max)} ${plural(max, "carattere", "caratteri")}`,
      remaining: (left) =>
        left === 1 ? "Resta 1 carattere" : `Restano ${n(left)} caratteri`,
      limitReached: "Limite di caratteri raggiunto",
    },
    countrySelect: {
      country: "Paese",
      search: "Cerca paese",
      others: "Altri paesi",
    },
    inlineEdit: {
      edit: (label) => `Modifica ${label}`,
      failed: "Non è stato possibile salvare la modifica.",
      empty: "Vuoto",
    },
    ibanInput: {
      format: "Un IBAN inizia con un codice paese di due lettere e due cifre di controllo.",
      country: (code) => `«${code}» non è il codice paese di un IBAN.`,
      length: (actual, expected) =>
        `Un IBAN di questo paese ha ${n(expected)} caratteri, questo ne ha ${n(actual)}.`,
      checksum: "Le cifre di controllo non corrispondono: probabilmente un carattere è stato digitato male.",
      qrRequired: "Questo è un IBAN normale. Una QR-fattura richiede il QR-IBAN del conto.",
      qrNotAllowed:
        "Questo è un QR-IBAN, che riceve solo pagamenti con QR-fattura. Inserisca l’IBAN normale del conto.",
    },
    phoneInput: {
      countryCode: "Prefisso internazionale",
      other: "Altro",
    },
    signChip: {
      outflow: "Uscita",
      inflow: "Entrata",
      // "premere per…": an instruction without a tu imperative, as the kit's Italian is formal.
      direction: (current, next) => `Direzione: ${current} – premere per passare a ${next}`,
      switchTo: (next) => `Passa a ${next}`,
    },
    columnMapper: {
      paste: "Incolla una tabella",
      pasteHint:
        "Copi le righe da un foglio di calcolo e le incolli qui, oppure trascini un file CSV o di testo.",
      chooseFile: "Scegli un file",
      readError: (name) => `Impossibile leggere «${name}»`,
      headerRow: "La prima riga contiene i nomi delle colonne",
      summary: (columns, rows) =>
        `${n(columns)} ${plural(columns, "colonna", "colonne")}, ${n(rows)} ${plural(rows, "riga", "righe")}`,
      // Fragments of the summary line. "Separato da…" would have to agree with a noun the
      // line does not name, so the separator is stated as a value.
      separatorSemicolon: "separatore: punto e virgola",
      separatorComma: "separatore: virgola",
      separatorTab: "separatore: tabulazione",
      separatorSpace: "separatore: spazio",
      // The examples stay as written: they show the convention, not the reader's locale.
      decimalComma: "virgola decimale (1,5)",
      decimalPoint: "punto decimale (1.5)",
      unreadCount: (count) =>
        count === 1 ? "Impossibile leggere 1 riga" : `Impossibile leggere ${n(count)} righe`,
      unreadLine: (line) => `Impossibile leggere la riga ${line}`,
      unreadMore: (count) => (count === 1 ? "…e un’altra" : `…e altre ${n(count)}`),
      noRows: "Nessuna riga di questo testo si può leggere come riga della tabella.",
      table: "Colonne e relativi ruoli",
      columnN: (column) => `Colonna ${column}`,
      roleOf: (column) => `Che cosa contiene la colonna «${column}»?`,
      ignore: "Ignora",
      requiredRole: (role) => `${role} (obbligatorio)`,
      requiredRoleShort: (role) => `${role} *`,
      previewOf: (shown, total) =>
        shown === 1
          ? `La prima di ${n(total)} righe`
          : `Le prime ${n(shown)} di ${n(total)} righe`,
      // `roles` arrives joined with "o" ("Dare o Avere").
      oneOf: (roles) => `${roles} (a scelta)`,
      // A participle phrase: no verb to agree with however many roles follow.
      missing: (roles) => `Ancora da assegnare: ${roles}.`,
    },
    translationReview: {
      statusMissing: "Mancante",
      statusUnreviewed: "Non rivisto",
      statusChanged: "Modificato dopo la revisione",
      statusNeedsChange: "Da modificare",
      statusApproved: "Approvato",
      statusFilter: "Stato",
      all: "Tutti",
      filterCount: (label, count) => `${label} · ${n(count)}`,
      source: "Testi",
      allSources: "Tutti i testi",
      namespace: "Area",
      allNamespaces: "Tutte le aree",
      search: "Cerca nelle chiavi e nei testi",
      placeholdersOnly: (count) => `Solo problemi di segnaposto (${n(count)})`,
      placeholderChip: "Segnaposto",
      key: "Chiave",
      statusColumn: "Stato",
      empty: "Nessun testo corrisponde a questi filtri.",
      missingText: "Mancante in questa lingua",
      progress: (approved, total) => `${n(approved)} di ${n(total)} ${plural(approved, "approvato", "approvati")}`,
      localeProgress: (approved, total) => `${n(approved)}/${n(total)}`,
      locales: "Lingue",
      approve: "Approva",
      flag: "Da modificare",
      suggest: "Proponi una traduzione",
      reset: "Segna come non rivisto",
      cancel: "Annulla",
      approveSelected: "Approva i selezionati",
      resetSelected: "Segna i selezionati come non rivisti",
      selectShown: "Seleziona tutti quelli mostrati",
      changedSince: "Questo testo è stato modificato dopo la revisione. Lo rilegga, per favore.",
      reviewedWording: "Formulazione al momento della revisione",
      reviewedReference: "Riferimento al momento della revisione",
      placeholderMismatch: (reference, text) =>
        `I segnaposto differiscono dal riferimento — riferimento: ${reference}; questo testo: ${text}. L’app vi inserisce dei valori, quindi devono restare esattamente come sono.`,
      lastApproved: (name, date) => `Approvato da ${name} il ${date}`,
      lastFlagged: (name, date) => `Segnato da modificare da ${name} il ${date}`,
      erasedReviewer: "un account eliminato",
      suggestion: "Formulazione migliore",
      translation: "Traduzione",
      note: "Nota (facoltativa)",
      notePlaceholder: "Cosa non va, o di cosa tenere conto",
      readOnly: "Può leggere questa lingua, ma non rivederla.",
      scope: (areas) => `La Sua revisione è limitata a: ${areas}.`,
      exportCorrections: (count) => `Esporta le correzioni (${n(count)})`,
      failed: "Non ha funzionato. Riprovi.",
      approvedToast: (count) => (count === 1 ? "Testo approvato" : `${n(count)} testi approvati`),
      clearedToast: (count) => (count === 1 ? "Testo segnato come non rivisto" : `${n(count)} testi segnati come non rivisti`),
      groupCount: (unreviewed, total) =>
        `${n(unreviewed)} ${plural(unreviewed, "non rivisto", "non rivisti")} / ${n(total)}`,
      approveGroup: (count) => `Approva i non rivisti (${n(count)})`,
      confirmGroup: (count, group) =>
        count === 1
          ? `Approvare il testo non rivisto in «${group}»?`
          : `Approvare tutti i ${n(count)} testi non rivisti in «${group}», compresi quelli non visibili sullo schermo?`,
    },
    // 0.31.0 — docs/settings-harmonization.md §4.3 and docs/landing-demo-harmonization.md
    // §4–§5: the settings shell, the landing page's generic words and the demo. The help
    // lines name things as `accountSettings`, `sessions` and `dataExport` do. "Lei", and
    // no sentence about the reader needs a gender ("avvisato/a").
    settings: {
      title: "Impostazioni",
      search: "Cerca nelle impostazioni",
      searchPlaceholder: "Cerca nelle impostazioni…",
      results: "Impostazioni corrispondenti",
      noMatches: (query) => `Nessuna impostazione corrisponde a «${query}».`,
      // As `commandPalette.clear`.
      clearSearch: "Cancella ricerca",
      back: "Torna alle impostazioni",
      sections: "Sezioni delle impostazioni",
      matchCount: (count) => `${n(count)} ${plural(count, "risultato", "risultati")}`,
      groups: {
        appearance: {
          title: "Aspetto",
          help: "Lingua, tema e aspetto dell’app su questo dispositivo.",
        },
        account: {
          title: "Account",
          help: "Il Suo profilo e il Suo indirizzo email.",
        },
        security: {
          title: "Sicurezza",
          help: "Come accede, e su quali dispositivi la sessione è aperta.",
        },
        notifications: {
          title: "Notifiche",
          help: "Quali notifiche riceve, quando e su quali dispositivi.",
        },
        data: {
          title: "Dati",
          help: "Esporti i Suoi dati o li elimini insieme al Suo account.",
        },
      },
    },
    landing: {
      signIn: "Accedi",
      requestAccess: "Richiedi l’accesso",
      getStarted: "Inizia",
      tryDemo: "Prova la demo",
      openApp: "Apri l’app",
      continueDemo: "Continua la demo",
      beta: "Beta",
      // Plain text: a mail's subject and body lines, never HTML.
      accessSubject: (app) => (app ? `Accesso a ${app}` : "Richiesta di accesso"),
      accessName: "Nome:",
      accessCompany: "Azienda:",
      accessUse: "Uso previsto:",
    },
    demo: {
      starting: "Avvio della demo…",
      rateLimited: (minutes) =>
        minutes
          ? `Troppe demo da questa rete. Riprovi tra ${n(minutes)} min.`
          : "Troppe demo da questa rete. Riprovi più tardi.",
      capacity: "La demo è al completo in questo momento. Riprovi più tardi.",
      unavailable: "La demo non è disponibile in questo momento.",
      failed: "Impossibile avviare la demo. Riprovi.",
      // As `legal.backHome`.
      backToStart: "Torna alla pagina iniziale",
      // "ancora" rather than "mancano", which would have to agree with the count.
      hoursLeft: (hours, minutes) => `Demo · ancora ${n(hours)} h ${n(minutes)} min`,
      minutesLeft: (minutes) => `Demo · ancora ${n(minutes)} min`,
      badge: "Demo",
      readOnly: "Sta guardando dati di esempio. Non è possibile apportare modifiche.",
      sandbox: "Quello che crea viene eliminato al termine della demo.",
      details: "Dettagli della demo",
      writeLocked: "Non è possibile nella demo.",
      endedTitle: "La demo è terminata",
      endedReadOnly: "I dati di esempio vengono reimpostati regolarmente.",
      endedSandbox:
        "I dati di esempio vengono reimpostati regolarmente; quello che ha creato nella demo viene eliminato.",
      restart: "Avvia una nuova demo",
    },
    // 0.32.0 — docs/billing-harmonization.md §7, §10 and §12.24: "piano" is what is bought
    // (Free, Pro), "abbonamento" the standing arrangement and the settings group;
    // "disdire", the word for ending a contract. "Lei" in sentences, the imperative on
    // buttons, as everywhere in this catalogue.
    billing: {
      group: "Abbonamento",
      plans: "Piani",
      interval: "Periodo di fatturazione",
      yearly: "Annuale",
      monthly: "Mensile",
      // As `currency.currency`.
      currency: "Valuta",
      perYear: "all’anno",
      perMonth: "al mese",
      vatIncluded: "IVA inclusa",
      free: "Gratuito",
      notOffered: "Non disponibile per questo periodo di fatturazione",
      // As `progressBar.unlimited`.
      unlimited: "Illimitato",
      limits: "Limiti",
      features: "Incluso",
      current: "Piano attuale",
      choose: (plan) => `Scegli ${plan}`,
      upgrade: (plan) => `Passa a ${plan}`,
      // "Passare a" either way: Italian has no plain verb for a downgrade.
      downgrade: (plan) => `Passa a ${plan}`,
      isCurrent: "Questo è il Suo piano attuale.",
      pickFirst: "Scelga prima un piano.",
      // Agreeing with "abbonamento"; "scaduto", as `invitations.status.expired`.
      status: {
        trialing: "In prova",
        active: "Attivo",
        past_due: "Pagamento in ritardo",
        canceled: "Disdetto",
        expired: "Scaduto",
        comped: "In omaggio",
      },
      trialEnding: (days) =>
        `Il Suo periodo di prova termina ${inDays(days)}. In seguito potrà ancora vedere tutto, ma per apportare modifiche servirà un piano.`,
      grantEnding: (days) =>
        `Il Suo accesso gratuito termina ${inDays(days)}. In seguito potrà ancora vedere tutto, ma per apportare modifiche servirà un piano.`,
      paymentFailed:
        "Il Suo ultimo pagamento non è andato a buon fine. Aggiorni il metodo di pagamento per mantenere il Suo piano.",
      planEnded:
        "Il Suo piano è terminato. Può ancora vedere ed esportare tutto; scelga un piano per apportare di nuovo modifiche.",
      // Never why: the owner's payment status is the owner's personal data (§12.6).
      guestReadOnly: (item) =>
        item
          ? `«${item}» per ora è in sola lettura; il proprietario può rimuovere questa limitazione.`
          : "Per ora è in sola lettura; il proprietario può rimuovere questa limitazione.",
      processing:
        "Il Suo pagamento è in elaborazione. Il Suo piano inizia non appena viene confermato; questa pagina si aggiorna da sola.",
      choosePlan: "Scegli un piano",
      updatePayment: "Aggiorna il metodo di pagamento",
      checkAgain: "Verifica di nuovo",
      lockReason: "Il Suo piano è terminato. Scelga un piano per apportare di nuovo modifiche.",
      // As `characterCount.limitReached` ("Limite di caratteri raggiunto").
      limitReached: "Limite del piano raggiunto",
      limitUpgrade: "Per aggiungerne altri, scelga un piano con un limite più alto.",
      limitContact: "Per aggiungerne altri, ci chieda un limite più alto.",
      askForMore: "Chiedi di più",
      // Both figures arrive formatted; "di", as `characterCount.count`.
      usage: (used, limit) => `${used} di ${limit}`,
      contactSubject: (dimension) => `Limite del piano: ${dimension}`,
      // The toast's figure line (§14.11) and the plan change's over-limit lines (§14.12).
      limitUsageLine: (dimension, used, limit) => `${dimension}: ${used} di ${limit}`,
      manage: "Pagamento e fatture",
      cancel: "Disdici l’abbonamento",
      // §14.5: no customer at the provider yet, so no portal to open.
      notAtProvider:
        "Ancora niente da gestire. Pagamenti e fatture compariranno qui quando avrà un piano a pagamento.",
      // §14.4: the pay page's lines, built into its bundle. "Lei".
      payOpening: "Apertura del pagamento sicuro…",
      payNothing: "Qui non c’è nulla da pagare. Per scegliere un piano, torni all’app.",
      payFailed: "Non è stato possibile aprire il pagamento. Torni indietro e riprovi tra un momento.",
      payBack: "Il pagamento è stato chiuso. Può tornare indietro, oppure ricaricare questa pagina per riaprirlo.",
      payDone: "Pagamento completato. Può chiudere questa pagina.",
      // 0.39 (§15.2.10): PlanSwitchConfirm.
      switchTitle: "Cambia piano",
      switchFromTo: (from, to) => `Da ${from} a ${to}`,
      switchChargedNow: "Addebitato ora",
      switchCredited: "Accreditato sui prossimi addebiti",
      switchNextCharge: (date) => `Prossimo addebito il ${date}`,
      switchConfirm: "Cambia piano",
      waitingChanges: (count) =>
        `${n(count)} ${plural(count, "modifica in attesa", "modifiche in attesa")} di un piano`,
      // "Scarta", as `wizard.cancelConfirmLabel`.
      discardWaiting: "Scarta le modifiche in attesa",
      notConfigured: "I pagamenti non sono ancora configurati. Riprovi più tardi.",
      disabled: "Gli abbonamenti non sono disponibili qui.",
      // §14.2: server-kit 0.7's refusals. "Pagamento e fatture", as `manage`. "Lei".
      providerUnavailable: "Il fornitore dei pagamenti non è raggiungibile al momento. Riprovi tra un momento.",
      alreadySubscribed: "Ha già un abbonamento. Cambi piano qui sopra.",
      planNotSold:
        "Questo piano non è disponibile per questo periodo di fatturazione o questa valuta. Ne scelga un altro.",
      // 0.39 (§15.2.10): the plan switch's refusals.
      notSubscribed: "Non c’è nessun abbonamento attivo da modificare. Scelga un piano per abbonarsi.",
      planUnchanged: "Questo è già il Suo piano. Scelga un altro piano o un altro periodo di fatturazione.",
    },
    // 0.33.0 — docs/billing-harmonization.md §14.12: the operator's plan parts, "piano" as
    // in `billing`. "Lei" in sentences, the imperative on the title and the button.
    planChange: {
      column: "Piano",
      title: "Cambia piano",
      confirm: "Cambia piano",
      plan: "Piano",
      current: (plan) => `Piano attuale: ${plan}`,
      keepsItems: "Un piano più piccolo blocca solo la creazione di nuovi elementi; non viene eliminato nulla.",
      until: "Gratuito fino al",
      untilHint: "Lasci vuoto per nessuna scadenza. Una beta in corso mantiene la propria scadenza.",
      needsChange: "Scelga un altro piano o una data di fine.",
      changed: (from, to) => `Piano cambiato da ${from} a ${to}.`,
      set: (to) => `Piano impostato su ${to}.`,
      keptBeta: "La beta mantiene la sua scadenza; è cambiato solo il piano.",
      untilDone: (date) => `Gratuito fino al ${date}.`,
      overLimit: "Oltre il limite del nuovo piano: non viene rimosso nulla, i nuovi elementi sono bloccati.",
      // Figures formatted; "di", as `billing.usage`. The app's word follows the limit,
      // in its form (0.33.1): "1 di 1 budget", "1 di 5 budget".
      usageOf: (used, limit, dimension) => `${used} di ${limit} ${dimension}`,
    },
    // 0.32.0 — docs/text-size-harmonization.md §6: the text-size and contrast settings in
    // the "Aspetto" group.
    appearance: {
      textSize: "Dimensione del testo",
      textSizeHelp: "Lettere più grandi e un layout che fa loro spazio.",
      textSizes: { normal: "Normale", large: "Grande", xlarge: "Molto grande" },
      contrast: "Contrasto",
      contrastHelp:
        "Il contrasto aumentato scurisce i testi tenui e le linee e ispessisce i riquadri di focus. «Sistema» segue l’impostazione di questo dispositivo.",
      contrastModes: { system: "Sistema", standard: "Standard", more: "Aumentato" },
      saveFailed: "Non è stato possibile salvarlo nel Suo account. Su questo dispositivo vale comunque.",
    },
    // 0.36.0 — docs/settings-harmonization.md §11.3: resetting this device's settings, the
    // last card of "Aspetto". "Lei", capitalised as the rest of the catalogue.
    deviceReset: {
      title: "Ripristina questo dispositivo",
      description:
        "Riporta ai valori predefiniti l’aspetto di questo dispositivo e il modo in cui sono state lasciate le sue tabelle e i suoi pannelli. Il Suo account, i Suoi dati e il Suo accesso restano invariati.",
      action: "Ripristina le impostazioni di questo dispositivo",
      confirmTitle: "Ripristinare le impostazioni di questo dispositivo?",
      confirmBody:
        "Tema, colori, dimensione del testo, contrasto e lingua tornano qui ai valori predefiniti, e tabelle e pannelli si aprono come la prima volta. Se il Suo account ha una lingua, una dimensione del testo o un contrasto, questo dispositivo torna a seguirli. Il Suo account e i Suoi altri dispositivi restano come sono.",
      confirmAction: "Ripristina",
      done: "Le impostazioni di questo dispositivo sono tornate ai valori predefiniti.",
      keywords: "ripristina predefiniti dispositivo reimposta aspetto tabelle layout",
    },
    rowActions: {
      actions: "Azioni",
      actionsFor: (name) => `Azioni per ${name}`,
    },
    appShellMore: {
      more: "Altro",
      moreTitle: "Altre pagine",
    },
  };
}

export const UI_KIT_LABELS_IT: UiKitLabels = uiKitLabelsIt();
