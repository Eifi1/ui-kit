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
      title: "Scelte",
      blurb:
        "Acceso o spento, uno fra pochi, un valore su una scala — e la scelta di un colore, di un’icona o di una scheda.",
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
    files: {
      title: "File",
      blurb:
        "Scegliere file: un pulsante che apre il selettore o la fotocamera, l’area di rilascio e i rifiuti segnalati dove l’utente sta guardando, mai come toast.",
    },
    "measured-grid": {
      title: "Inserimento tabella",
      blurb:
        "Inserire una tabella di misure: una griglia di celle da tastiera, un blocco incollato da un foglio di calcolo e la stessa tabella come testo — migliaia di righe, solo quelle visibili montate.",
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
      title: "Firma, password e conferma",
      blurb:
        "Acquisire una firma — e mostrarne una salvata —, indicare all’utente quanto è sicura la sua password e confermare un’azione distruttiva.",
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
    layout: {
      title: "Sezione espandibile e cornice dei dialoghi",
      blurb:
        "Una sezione che si richiude e la cornice intestazione-corpo-azioni che ogni finestra di dialogo ripete.",
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

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_IT,
};
