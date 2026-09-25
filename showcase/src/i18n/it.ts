import { UI_KIT_LABELS_IT } from "@eifi1/ui-kit/i18n/it";
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
    devicePreview: "Anteprima per dimensioni dello schermo",
    previewHint:
      "La pagina nelle tre dimensioni di schermo più comuni, dal vivo: scorri e fai clic in ogni riquadro. Tema, tavolozza e lingua seguono la barra in alto.",
    phone: "Telefono",
    tablet: "Tablet",
    desktop: "Desktop",
  },

  groups: {
    "Getting started": "Per iniziare",
    Foundations: "Fondamenti",
    Inputs: "Input",
    "Pickers & entry": "Selettori e inserimento",
    "Data display": "Visualizzazione dati",
    Overlays: "Overlay",
    // "Chrome" in the UI sense: the frame around the content, not the browser.
    "App chrome": "Struttura dell’app",
    API: "API",
  },

  groupShort: {
    "Getting started": "Inizio",
    Foundations: "Token",
    "Pickers & entry": "Selettori",
    "Data display": "Dati",
    "App chrome": "Struttura",
  },

  pages: {
    overview: {
      title: "Panoramica",
      short: "Panoramica",
      blurb:
        "Che cos’è @eifi1/ui-kit, i sette livelli su cui è costruito e come leggere una pagina di questa vetrina.",
    },
    foundations: {
      title: "Fondamenti",
      blurb:
        "I valori con cui ogni componente dipinge e la lingua che ogni componente parla. Nulla sotto questo livello ha un colore o una parola scritti nel codice.",
    },
    tokens: {
      title: "Token",
      short: "Token",
      blurb:
        "Ogni valore del TokenSet attivo, dal vivo. Cambia tema o palette nella barra in alto e guarda questa pagina cambiare: tutto ciò che resta fermo è scritto nel codice.",
    },
    palette: {
      title: "Generatore di palette",
      short: "Palette",
      blurb:
        "Un colore del brand in ingresso, entrambi i temi in uscita — ogni rapporto di contrasto misurato anziché dichiarato, e ogni compromesso chiamato per nome.",
    },
    localisation: {
      title: "Localizzazione",
      short: "Localizzazione",
      blurb:
        "Ogni testo che il kit mostra, come un unico albero tipizzato — e il provider che consegna una traduzione a tutti i componenti in una volta.",
    },
    inputs: {
      title: "Input",
      blurb:
        "Ogni modo di digitare o impostare un valore: testo, scelte, numeri, date, file e l’adattatore per i moduli che li avvolge. Condividono una stessa anatomia — un’etichetta flottante, il valore, una riga di aiuto sotto — così un modulo si legge come un tutt’uno.",
    },
    fields: {
      title: "Campi di testo",
      short: "Testo",
      blurb:
        "I campi di input e le costanti di classe con cui un’app compone i propri campi.",
    },
    forms: {
      title: "Moduli (react-hook-form)",
      short: "Moduli",
      blurb:
        "L’adattatore react-hook-form di @eifi1/ui-kit/rhf: etichetta, controllo, descrizione e messaggio di un campo collegati tra loro e allo stato del modulo, con i messaggi solo dove l’utente li può vedere.",
    },
    choices: {
      title: "Scelte",
      short: "Scelte",
      blurb:
        "Acceso o spento, uno fra pochi, un valore su una scala — e la scelta di un colore, di un’icona o di una scheda.",
    },
    numbers: {
      title: "Numeri e importi",
      short: "Numeri",
      blurb:
        "Lo stack numerico: un campo numerico con calcolatrice, un campo il cui valore è un numero, il campo importo con i suoi toni e il selettore di valuta.",
    },
    calendars: {
      title: "Calendari e selettori di date",
      short: "Calendari",
      blurb:
        "Scegliere un giorno o un intervallo di giorni: il calendario stesso, i selettori di data e di intervallo costruiti su di esso, le loro scorciatoie e i loro limiti, e il primo giorno della settimana.",
    },
    "month-time": {
      title: "Mese e ora",
      short: "Mese e ora",
      blurb:
        "La scala più ampia e quella più fine: un mese scelto da solo, in un campo o tra pulsanti di avanzamento, e un orario.",
    },
    files: {
      title: "File",
      short: "File",
      blurb:
        "Scegliere file: un pulsante che apre il selettore o la fotocamera, l’area di rilascio e i rifiuti segnalati dove l’utente sta guardando, mai come toast.",
    },
    pickers: {
      title: "Selettori e inserimento",
      blurb:
        "Scegliere da un elenco invece di digitare, e i tipi di inserimento più impegnativi: una tabella di misure, un campo salvato quando lo lasci, una firma, una password.",
    },
    comboboxes: {
      title: "Combobox",
      short: "Combobox",
      blurb:
        "Testo libero con suggerimenti: la combobox il cui valore è ciò che è stato digitato, e il completamento automatico che cerca mentre scrivi.",
    },
    "entity-pickers": {
      title: "Selettori di entità",
      short: "Entità",
      blurb:
        "Scegliere un record tramite il suo id: selettori a forma di campo o di pulsante, opzioni statiche o caricate, più valori insieme, e gli stati non valido, errore e disabilitato che condividono.",
    },
    "dropdown-parts": {
      title: "Componenti dei dropdown",
      short: "Componenti",
      blurb:
        "La selezione multipla, il selettore raggruppato e il foglio per telefono — e gli hook e il pannello con cui è costruito ogni dropdown del kit.",
    },
    "measured-grid": {
      title: "Inserimento tabella",
      short: "Tabella",
      blurb:
        "Inserire una tabella di misure: una griglia di celle da tastiera, un blocco incollato da un foglio di calcolo e la stessa tabella come testo — migliaia di righe, solo quelle visibili montate.",
    },
    "field-sync": {
      title: "Stato di sincronizzazione",
      short: "Sincronizzazione",
      blurb:
        "Stato di sincronizzazione di un campo legato a un database, salvato all'uscita dal campo: il colore del bordo e un'icona alla fine del campo indicano modificato, salvataggio, salvato o errore — passa sopra il simbolo d'errore per vederne il motivo.",
    },
    "signature-password": {
      title: "Firma, password e conferma",
      short: "Firma",
      blurb:
        "Acquisire una firma — e mostrarne una salvata —, indicare all’utente quanto è sicura la sua password e confermare un’azione distruttiva.",
    },
    "data-display": {
      title: "Visualizzazione dati",
      blurb:
        "Mostrare valori invece di acquisirli: i mattoni di base, la tabella e i grafici.",
    },
    buttons: {
      title: "Pulsanti e superfici",
      short: "Pulsanti",
      blurb:
        "Pulsanti, pulsanti a icona, schede, indicatori di caricamento, stati vuoti, avatar e banner — i pezzi con cui è costruito tutto il resto.",
    },
    "chips-toggles": {
      title: "Chip e interruttori",
      short: "Chip",
      blurb:
        "I chip e il campo a chip, il gruppo di interruttori e le tab — i piccoli controlli che scelgono uno fra pochi o contengono un breve elenco.",
    },
    "data-table": {
      title: "Tabella dati",
      short: "Tabella",
      blurb:
        "Il componente più grande del kit, per intero: ordinamento, filtri, selezione ed espansione, controllo dall’esterno, tabella corta senza paginazione, riempimento di un riquadro e da destra a sinistra.",
    },
    "data-table-server": {
      title: "Tabella dati: server, URL e telefono",
      short: "Server e telefono",
      blurb:
        "La tabella quando non possiede tutto: la vista conservata nell’indirizzo, le righe paginate da un server e il layout per telefono con schede, gruppi e azioni a scorrimento.",
    },
    "data-table-parts": {
      title: "Tabella dati: componenti e funzioni",
      short: "Parti tabella",
      blurb:
        "Ciò di cui è fatta la tabella, utilizzabile da solo: la paginazione, il popover dei filtri, l’albero delle etichette e le funzioni pure per ordinamento, filtri e URL.",
    },
    "chart-shell": {
      title: "Involucro dei grafici",
      short: "Grafici",
      blurb:
        "L’involucro dei grafici a tema sopra Recharts — contenitore, tooltip e legenda — e il sistema di colori da cui attinge ogni grafico del kit.",
    },
    "tile-chart": {
      title: "Grafico a riquadri",
      short: "Riquadri",
      blurb:
        "La treemap: le parti di un tutto come riquadri, con etichette che ci stanno e riquadri cliccabili — e il drill-down, con un grafico a barre come con i riquadri.",
    },
    "series-chart": {
      title: "Grafico a serie",
      short: "Serie",
      blurb:
        "Il grafico a serie con zoom condiviso dalle app: un asse per unità, una legenda di interruttori, un solo zoom per una pila di grafici e le funzioni sottostanti.",
    },
    stats: {
      title: "Statistiche e sparkline",
      short: "Statistiche",
      blurb:
        "Il riquadro KPI che ogni dashboard ripete — valore, variazione, tendenza — e la minuscola linea che sta in una cella di tabella.",
    },
    layout: {
      title: "Sezione espandibile e cornice dei dialoghi",
      short: "Espandibile",
      blurb:
        "Una sezione che si richiude e la cornice intestazione-corpo-azioni che ogni finestra di dialogo ripete.",
    },
    overlays: {
      title: "Overlay",
      blurb:
        "Tutto ciò che fluttua sopra la pagina, e l’unica temporizzazione che tutti condividono quando si chiudono.",
    },
    dialogs: {
      title: "Finestre di dialogo",
      short: "Dialoghi",
      blurb:
        "La modale e il dialogo a schermo intero, il clic sullo sfondo che li chiude e la temporizzazione di chiusura condivisa da tutti gli overlay.",
    },
    popovers: {
      title: "Popover, menu e tooltip",
      short: "Popover",
      blurb:
        "Gli overlay ancorati a un elemento: popover, menu al passaggio del mouse e tooltip — capovolti e contenuti nella finestra, specchiati da destra a sinistra — e il posizionamento puro che li regge.",
    },
    tour: {
      title: "Tour guidato",
      short: "Tour",
      blurb:
        "Un tour con riflettore sulla pagina vera: passaggi che indicano qualsiasi elemento tramite selettore, attendono un clic, eseguono codice prima e sopravvivono a un bersaglio mancante.",
    },
    "command-palette": {
      title: "Palette dei comandi",
      short: "Comandi",
      blurb:
        "La palette ⌘K: un elenco di luoghi e azioni in cui cercare, aperto dalla scorciatoia ovunque nella pagina, con risultati che possono arrivare in ritardo.",
    },
    "swipeable-row": {
      title: "Riga scorrevole",
      short: "Scorrimento",
      blurb:
        "Una riga di elenco che mostra le sue azioni quando la trascini di lato — con il dito o il mouse, a livelli, da destra a sinistra — con le stesse azioni raggiungibili da tastiera.",
    },
    "app-chrome": {
      title: "Struttura dell’app",
      blurb:
        "La cornice in cui vive un’app e i flussi che ogni app ripete: impostazioni, moduli a più passaggi, feedback.",
    },
    shell: {
      title: "Shell",
      short: "Shell",
      blurb: "La cornice dell’app che stai guardando, smontata pezzo per pezzo.",
    },
    settings: {
      title: "Campi delle impostazioni",
      short: "Impostazioni",
      blurb:
        "Le righe delle impostazioni dell’account: tema, lingua, profilo, password e autenticazione a due fattori.",
    },
    wizard: {
      title: "Procedura guidata",
      short: "Procedura",
      blurb: "Il motore a più passaggi, la sua cornice e il passaggio di riepilogo.",
    },
    "feedback-compose": {
      title: "Feedback — scrittura",
      short: "Scrittura",
      blurb: "Il modulo di segnalazione e il suo campo per gli allegati.",
    },
    "feedback-inbox": {
      title: "Feedback — posta in arrivo",
      short: "In arrivo",
      blurb:
        "Il vocabolario di stati condiviso, le regole di transizione e le parti con cui si costruisce una casella di posta.",
    },
    api: {
      title: "API",
      blurb:
        "Ciò che resta togliendo i pixel: gli hook con cui sono costruiti i componenti e le funzioni pure e le costanti che un'app chiama direttamente.",
    },
    "hooks-lib": {
      title: "Hook e lib",
      short: "Hook",
      blurb:
        "Le esportazioni non visive: gli hook osservati dal vivo e le funzioni pure come input → output.",
    },
    helpers: {
      title: "Funzioni e costanti",
      short: "Funzioni",
      blurb:
        "Le funzioni e i dati dietro i campi, come input → risultato: il calcolo delle date di @eifi1/ui-kit/dates, il valutatore della calcolatrice, la tabella delle valute e le costanti di classe con cui si compone un campo personalizzato.",
    },
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_IT,
};
