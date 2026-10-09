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
      "Scegli una dimensione di schermo: la pagina appare dal vivo a quella larghezza — scorri e fai clic nel riquadro. Tema, tavolozza e lingua seguono la barra in alto.",
    phone: "Telefono",
    tablet: "Tablet",
    desktop: "Desktop",
    previewShort: "Anteprima",
    allDevices: "Tutti e tre",
    previewExit: "Torna alla pagina",
    searchPlaceholder: "Cerca componenti, esempi o esigenze…",
    searchComponents: "Componenti",
    searchExamples: "Esempi",
    searchNeeds: "Di cosa hai bisogno?",
    searchPages: "Pagine",
    // The "Server side" line under a kit page's title, and the search's server-kit group.
    serverSide: "Lato server",
    searchServer: "Kit server",
  },

  groups: {
    "Getting started": "Per iniziare",
    Foundations: "Fondamenti",
    Inputs: "Input",
    "Pickers & entry": "Selettori e inserimento",
    "Data display": "Visualizzazione dati",
    Charts: "Grafici",
    Overlays: "Overlay",
    // "Chrome" in the UI sense: the frame around the content, not the browser.
    "App chrome": "Struttura dell’app",
    API: "API",
    "Server kit": "Kit server",
  },

  groupShort: {
    "Getting started": "Inizio",
    Foundations: "Token",
    "Pickers & entry": "Scelta",
    "Data display": "Dati",
    "App chrome": "Cornice",
    Inputs: "Input",
    Charts: "Grafici",
    Overlays: "Overlay",
    "Server kit": "Server",
  },

  pages: {
    media: {
      title: "Immagini e media",
      short: "Media",
      blurb:
        "Mostrare ciò che è stato caricato: una griglia di miniature con azioni e didascalie, il visualizzatore a schermo intero con tasti, swipe e zoom, e immagini che richiedono un recupero autenticato.",
    },
    "pie-chart": {
      title: "Grafico a torta",
      short: "Torta",
      blurb:
        "La quota di un totale come ciambella o torta: modalità della legenda, spicchi cliccabili e raggiungibili da tastiera, importi nascosti, il grafico vuoto, da destra a sinistra — e la legenda da sola.",
    },
    links: {
      title: "Link",
      short: "Link",
      blurb:
        "Ogni link del kit instradato dal router dell'app, impostato una volta sul provider: il link testuale e i suoi toni, un pulsante o una scheda azione che è un link, e i link che escono dall'app.",
    },
    "landing-demo": {
      title: "Pagina iniziale e demo",
      short: "Pagina iniziale",
      blurb:
        "La pagina iniziale pubblica e la demo da provare: l’intestazione nei suoi tre stati, le sezioni della pagina iniziale, i controlli SEO, il ritorno all’ultima pagina visitata, e l’avvio, il conto alla rovescia e la fine della demo.",
    },
    "user-admin": {
      title: "Amministrazione utenti",
      short: "Utenti",
      blurb:
        "Il lato amministrativo degli account: l’elenco utenti con ruoli e stati, le quattro azioni di amministrazione con la conferma richiesta dal server, il registro di audit, gli inviti, il passaggio del lavoro, e la colonna del piano e il cambio di piano da parte dell’operatore.",
    },
    subscription: {
      title: "Abbonamento",
      short: "Fatturazione",
      blurb:
        "Pagare un’app: la scelta del piano in due valute e su due periodi, lo stato dell’abbonamento, i banner dalla prova alla scadenza, l’avviso e il toast di limite del piano, il blocco di sola lettura e i tipi di blocco, il portale del fornitore, il ritorno dal checkout, la pagina di pagamento e l’avvertenza commerciale delle note legali.",
    },
    "auth-account": {
      title: "Accesso e sicurezza dell'account",
      short: "Accesso",
      blurb:
        "Le pagine prima dell'app — un accesso stretto e una pagina legale ampia — e la sicurezza dell'account: l'autenticazione a due fattori configurata da un codice QR, e passkey aggiunte, rinominate e rimosse.",
    },
    formatting: {
      title: "Formattazione e valori con segno",
      short: "Formattazione",
      blurb:
        "Numeri, importi, percentuali, date e tempi relativi nella lingua del lettore — come input → output in più lingue — e l'importo con segno e la variazione che si colorano da soli.",
    },
    "url-state": {
      title: "Stato nell'URL",
      short: "Stato URL",
      blurb:
        "Un valore, una scheda e una finestra di dialogo aperta conservati nell'indirizzo, così un ricaricamento li mantiene e Indietro li annulla: gli hook dei parametri di ricerca e la finestra che si apre da un link.",
    },
    overview: {
      title: "Panoramica",
      short: "Panoramica",
      blurb:
        "Che cos’è @eifi1/ui-kit, gli otto livelli su cui è costruito e come leggere una pagina di questa vetrina.",
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
    "colour-roles": {
      title: "Ruoli dei colori",
      short: "Ruoli",
      blurb:
        "Lo strato semantico sopra la tavolozza: ogni riempimento con il colore di primo piano che indica, ogni tono come testo, sfondo tenue e linea, le linee forti, il pannello incassato su una scheda, la regola dell’hover, le utility di ruolo che sostituiscono text-[var(--…)] e il test che trova una variabile che nulla dichiara.",
    },
    "text-size": {
      title: "Dimensione del testo e contrasto",
      short: "Testo",
      blurb:
        "Normale, Grande e Molto grande su un’unica scala alla radice, con i breakpoint che la seguono, il livello Aumentato del contrasto, la regola dell’account che porta entrambi da un dispositivo all’altro — e cosa fanno i componenti a Grande.",
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
    "kit-review": {
      title: "Revisione del kit (live)",
      short: "Revisione kit",
      blurb:
        "I testi del kit in ogni lingua che keksdose distribuisce, rivisti sul database di revisione di keksdose: le stesse righe kit. e gli stessi verdetti della sua pagina Traduzioni, aperta da lì con un token di revisione.",
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
    "month-view": {
      title: "Vista mensile del calendario",
      short: "Vista mese",
      blurb:
        "Il calendario come pagina: un mese a griglia con gli eventi di ogni giorno nella sua cella, un'intestazione della pagina che lo guida e un pannello per il giorno scelto.",
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
        "Scegliere da un elenco invece di digitare, e i tipi di inserimento più impegnativi: una tabella di misure, un campo salvato quando lo lasci, una firma, una password, un modulo a passaggi.",
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
        "Mostrare valori invece di acquisirli: i mattoni di base, riscontro e avanzamento, elenchi, alberi e la tabella.",
    },
    buttons: {
      title: "Pulsanti e superfici",
      short: "Pulsanti",
      blurb:
        "Pulsanti, gruppi di pulsanti, pulsanti a icona, schede, indicatori di caricamento e avatar — i pezzi con cui è costruito tutto il resto.",
    },
    "chips-toggles": {
      title: "Chip e interruttori",
      short: "Chip",
      blurb:
        "I chip e il campo a chip, il gruppo di interruttori e le tab — i piccoli controlli che scelgono uno fra pochi o contengono un breve elenco.",
    },
    feedback: {
      title: "Riscontro e avanzamento",
      short: "Avanzamento",
      blurb:
        "A che punto è un lavoro, che un contenuto sta arrivando, che qui non c’è nulla e che c’è qualcosa da leggere: barre di avanzamento e indicatori, skeleton, stati vuoti e banner.",
    },
    "description-list": {
      title: "Elenco descrittivo e tabella",
      short: "Elenchi e tabelle",
      blurb:
        "Fatti disposti senza alcun meccanismo: un elenco di termini e dettagli, una semplice tabella statica, e il separatore e l’area di scorrimento che stanno tra i due.",
    },
    "lists-menus": {
      title: "Elenchi e menu",
      short: "Elenchi e menu",
      blurb:
        "La riga che ogni app disegna a mano — un pulsante, un link o un record, con le sue azioni accanto —, la riga di un menu e la barra che compare quando si selezionano delle righe.",
    },
    "tree-view": {
      title: "Vista ad albero",
      short: "Albero",
      blurb:
        "Una gerarchia che percorri con la tastiera — una sola tappa di Tab, le frecce per aprire e chiudere, la ricerca mentre digiti — con figli caricati su richiesta, controllata dall’esterno, da destra a sinistra, e la sua riga da sola.",
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
    charts: {
      title: "Grafici",
      blurb:
        "I valori come immagini: l’involucro con tema sopra Recharts, il grafico a riquadri, il grafico a serie con zoom con le sue barre e aree, e il riquadro KPI.",
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
    "series-chart-marks": {
      title: "Grafico a serie: barre, aree e tempo",
      short: "Barre e aree",
      blurb:
        "Lo stesso grafico che disegna barre, aree e pile, su categorie e sul tempo reale, con linee di riferimento, marcatori, punti e clic — e una legenda i cui colori restano fermi.",
    },
    stats: {
      title: "Statistiche e sparkline",
      short: "Statistiche",
      blurb:
        "Il riquadro KPI che ogni dashboard ripete — valore, variazione, tendenza — e la minuscola linea che sta in una cella di tabella.",
    },
    "calendar-heatmap": {
      title: "Heatmap del calendario",
      short: "Heatmap",
      blurb:
        "I giorni come quadrati sfumati: un anno in settimane o un mese, un giorno selezionabile, i livelli, il massimo e il colore della scala, un periodo lungo ridotto agli ultimi giorni, e da destra a sinistra.",
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
    "confirm-floating": {
      title: "Dialogo di conferma e pannello flottante",
      short: "Conferma",
      blurb:
        "La promise che sostituisce window.confirm — con toni, parole proprie e una coda — e il pannello non modale ancorato in un angolo dietro un pulsante flottante.",
    },
    "floating-actions": {
      title: "Azioni fluttuanti",
      short: "Fluttuanti",
      blurb:
        "I controlli d'angolo: un pulsante esteso che segnala uno stato ed è annunciato quando cambia, il tooltip del kit su un pulsante fluttuante e una pillola di interruttori, link e contatori.",
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
        "La cornice in cui vive un’app e i flussi che ogni app ripete: impostazioni, account, abbonamenti, feedback.",
    },
    "page-structure": {
      title: "Intestazione di pagina e percorso",
      short: "Intestazione",
      blurb:
        "Le parti di una pagina che non sono il suo contenuto: l’intestazione con il percorso e le azioni, il percorso di navigazione da solo, e l’etichetta di sezione, la didascalia e il punto di stato.",
    },
    shell: {
      title: "Shell",
      short: "Shell",
      blurb: "La cornice dell’app che stai guardando, smontata pezzo per pezzo.",
    },
    settings: {
      title: "Impostazioni",
      short: "Impostazioni",
      blurb:
        "La pagina delle impostazioni e quella di amministrazione sulla stessa shell: la barra laterale su desktop, l’elenco con drill-down sul telefono, un gruppo per percorso, la ricerca e la scheda che un link mette in evidenza. Le righe delle impostazioni dell’account: tema, lingua, profilo, password e autenticazione a due fattori.",
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
    "clipboard-timing": {
      title: "Appunti e tempi",
      short: "Appunti",
      blurb:
        "Una copia che dice se è riuscita, e l’attesa finché non smetti di digitare: il pulsante di copia e il suo hook, e il valore e la callback con debounce.",
    },
    helpers: {
      title: "Funzioni e costanti",
      short: "Funzioni",
      blurb:
        "Le funzioni e i dati dietro i campi, come input → risultato: il calcolo delle date di @eifi1/ui-kit/dates, il valutatore della calcolatrice, la tabella delle valute e le costanti di classe con cui si compone un campo personalizzato.",
    },
    // The Server kit group (0.31): server-kit's modules, from its release's api.json.
    "server-kit": {
      title: "Kit server",
      blurb:
        "Il pacchetto Python dietro i backend delle app: i contratti che questi componenti seguono, sotto forma di codice — firme e docstring di ogni modulo, fissati su una release di server-kit.",
    },
    "server-auth": {
      title: "Accesso e account",
      short: "Accesso",
      blurb:
        "Registrazione, accesso, token monouso, claim di sessione e i formati di scambio dell’account — la metà server delle pagine di accesso, registrazione e account.",
    },
    "server-user-admin": {
      title: "Amministrazione utenti",
      short: "Utenti",
      blurb:
        "La query dell’elenco utenti, le quattro azioni di amministrazione e i loro livelli di conferma, la voce di audit, l’eliminazione in due fasi e l’esportazione dei dati.",
    },
    "server-settings": {
      title: "Impostazioni e lingua",
      short: "Impostazioni",
      blurb:
        "Una sola regola per ogni body di impostazioni — un campo omesso resta, null lo azzera, uno sconosciuto viene rifiutato — e l’unica lingua canonica dell’account.",
    },
    "server-demo": {
      title: "Demo",
      short: "Demo",
      blurb:
        "L’account demo usa e getta: le sue impostazioni, i controlli d’ingresso nel loro ordine, i rifiuti e i loro codici, la regola di sola lettura e la sua unica durata.",
    },
    "server-billing": {
      title: "Fatturazione",
      short: "Fatturazione",
      blurb:
        "I piani e i loro limiti, la posizione dell’abbonamento con le date della prova e della beta, il blocco di sola lettura alla scadenza, e i webhook di Paddle e Lemon Squeezy: firme verificate, eventi normalizzati, un solo dispatch.",
    },
    "server-mail": {
      title: "Email",
      short: "Email",
      blurb:
        "Le email dell’account: i testi per lingua, un unico layout che fa l’escape di ogni valore, due trasporti che non sollevano mai eccezioni — e le email di esempio della release, renderizzate.",
    },
    "server-feedback": {
      title: "Feedback e upload",
      short: "Feedback",
      blurb:
        "Il contratto del feedback come funzioni pure — schemi, stati, le regole del PATCH, rielaborazione, segnalazione degli arresti anomali, cancellazione — e allegati giudicati dai loro byte.",
    },
    "server-limits": {
      title: "Limiti, errori e CORS",
      short: "Limiti",
      blurb:
        "Il rate limiter a finestra scorrevole e di chi conta l’indirizzo, ogni rifiuto del kit restituito con lo stato del suo contratto, e CORS per qualche origine in più.",
    },
    "server-translation-review": {
      title: "Revisione delle traduzioni",
      short: "Revisione",
      blurb:
        "I formati di scambio della revisione delle traduzioni, chi può rivedere quali chiavi e lingue, e i token di revisione con cui un revisore apre la pagina di revisione del kit.",
    },
  },


  // The top-bar search's "Di cosa hai bisogno?" rows: a task in the reader's words, and
  // the page that does it. Phrased as typed into a search box — lower case, no full stop.
  needs: {
    media: [
      "mostrare le immagini caricate",
      "aprire un'immagine a schermo intero",
      "galleria di immagini con didascalie",
      "caricare un'immagine che richiede l'accesso",
      "anteprima di un allegato PDF",
    ],
    "pie-chart": [
      "mostrare quote di un totale",
      "grafico a ciambella",
      "cliccare su uno spicchio",
      "legenda senza grafico",
      "nascondere gli importi in un grafico",
    ],
    links: [
      "collegare un'altra pagina dell'app",
      "usare il mio router per i link del kit",
      "link che apre una nuova scheda",
      "un pulsante che naviga",
      "evidenziare il link della pagina corrente",
    ],
    "landing-demo": [
      "creare una pagina iniziale pubblica",
      "aggiungere un pulsante «Richiedi l’accesso»",
      "controllare titolo e descrizione per i motori di ricerca",
      "riaprire l’app dove l’utente l’aveva lasciata",
      "avviare una sessione demo",
      "conto alla rovescia della demo",
      "mostrare che la demo è finita",
    ],
    "user-admin": [
      "elencare gli utenti con i loro ruoli",
      "disattivare un account",
      "cambiare il ruolo di un utente",
      "invitare qualcuno via email",
      "mostrare chi ha fatto cosa su un account",
      "passare il lavoro di qualcuno a un altro utente",
      "impostare le lingue di un revisore delle traduzioni",
      "cambiare il piano di un utente",
    ],
    subscription: [
      "scegliere un piano",
      "prezzi in CHF ed EUR",
      "fatturazione mensile o annuale",
      "mostrare lo stato dell’abbonamento",
      "banner di fine prova",
      "banner di pagamento non riuscito",
      "limite del piano raggiunto",
      "sola lettura alla scadenza dell’abbonamento",
      "aprire il portale di fatturazione",
      "disdire l’abbonamento",
      "pagamento in elaborazione dopo il checkout",
      "servire la pagina di pagamento Paddle",
      "limite del piano come toast",
    ],
    "auth-account": [
      "layout della pagina di accesso",
      "configurare i due fattori con un codice QR",
      "gestire le passkey",
      "pagina di termini e privacy",
      "mostrare il segreto dei due fattori con un pulsante copia",
    ],
    formatting: [
      "formattare un importo nella lingua dell'utente",
      "mostrare una data come «3 giorni fa»",
      "formattare una percentuale",
      "importo positivo o negativo a colori",
      "mostrare la variazione rispetto al mese scorso",
    ],
    "url-state": [
      "tenere un filtro nell'URL",
      "ricordare la scheda aperta al ricaricamento",
      "aprire una finestra di dialogo da un link",
      "chiudere una finestra con Indietro",
      "condividere un link alla vista corrente",
    ],
    overview: [
      "iniziare con il kit",
      "come è organizzato il kit",
      "come leggere una pagina della vetrina",
      "confronto con MUI",
      "installare e configurare",
    ],
    foundations: [
      "vedere i design token",
      "colori e temi",
      "tradurre tutto il kit",
      "palette dei colori del brand",
      "tema scuro",
      "testo più grande e più contrasto",
    ],
    tokens: [
      "vedere tutti i token di colore",
      "passare dal tema chiaro a quello scuro",
      "cambiare la palette dei colori",
      "mantenere il tema dopo il ricaricamento",
      "valori di spaziatura, raggio e ombre",
      "colori del testo e superfici",
      "controllare cosa è scritto a mano",
    ],
    "colour-roles": [
      "colore del testo su un riempimento colorato",
      "il colore di testo giusto per un badge di avviso",
      "un pannello incassato visibile su una scheda",
      "colore di hover per una riga di elenco",
      "sostituire text-[var(--text-muted)] con una classe",
      "un bordo di avviso marcato",
      "trovare le variabili CSS che nulla dichiara",
    ],
    "text-size": [
      "ingrandire il testo",
      "impostazione per il testo grande",
      "più contrasto per chi vede poco",
      "modalità ad alto contrasto",
      "breakpoint che crescono con il testo",
      "verificare nel codice il layout da telefono",
      "far seguire la dimensione del testo all’account",
      "mostrare come testo l’etichetta di un pulsante icona",
      "raccogliere le azioni di riga in un menu",
    ],
    palette: [
      "generare una palette dal colore del brand",
      "verificare il contrasto dei colori",
      "colori per i grafici",
      "scala di colori accessibile",
      "ricavare i colori del tema scuro",
      "tema personalizzato da un solo colore",
    ],
    localisation: [
      "tradurre l’interfaccia",
      "cambiare lingua",
      "traduzione in tedesco",
      "ortografia svizzero-tedesca",
      "trovare le etichette non tradotte",
      "impostare la lingua per date e numeri",
      "passare le etichette a tutti i componenti",
    ],
    "kit-review": [
      "rivedere le traduzioni del kit",
      "approvare una traduzione",
      "svegliare un server addormentato",
      "aprire la revisione da keksdose",
      "esportare le correzioni",
    ],
    inputs: [
      "vedere tutti i componenti di input",
      "creare un modulo",
      "inserire testo, numeri o date",
      "layout dei campi di un modulo",
      "scegliere un valore",
    ],
    fields: [
      "scrivere del testo",
      "campo di testo con etichetta mobile",
      "testo su più righe",
      "casella di ricerca",
      "mostrare un suggerimento sotto il campo",
      "mostrare un errore di validazione",
      "menu a tendina",
      "svuotare un campo",
      "creare un campo personalizzato",
      "etichetta sopra il campo",
    ],
    forms: [
      "validare un modulo",
      "usare react-hook-form",
      "messaggi di errore sotto i campi",
      "campi obbligatori",
      "inviare un modulo",
      "collegare l’etichetta al suo input",
      "modulo con schema di validazione",
      "validare un passo della procedura guidata",
    ],
    choices: [
      "attivare o disattivare un’impostazione",
      "spuntare una casella",
      "scegliere tra poche opzioni",
      "scegliere un valore con uno slider",
      "scegliere un colore",
      "scegliere un’icona",
      "scegliere tra delle schede",
      "selezionare un intervallo con uno slider",
      "scheda che avvia un'azione",
    ],
    numbers: [
      "inserire un importo",
      "inserire un numero",
      "scegliere una valuta",
      "calcolatrice nel campo",
      "numero con pulsanti più e meno",
      "tastierino numerico sul telefono",
      "importi negativi in rosso",
      "formattare i numeri secondo la lingua",
    ],
    calendars: [
      "scegliere una data",
      "scegliere un intervallo di date",
      "calendario",
      "intervalli predefiniti come il mese scorso",
      "limitare le date selezionabili",
      "primo giorno della settimana",
      "scegliere data di inizio e di fine",
      "tornare a oggi",
    ],
    "month-view": [
      "pagina calendario mensile",
      "mostrare eventi in un calendario",
      "griglia mensile da agenda",
      "contenuto personalizzato in un giorno",
      "calendario con intestazione propria",
      "puntini sui giorni del calendario",
    ],
    "month-time": [
      "scegliere un mese",
      "passare al mese precedente o successivo",
      "inserire un orario",
      "scegliere ore e minuti",
      "periodo di fatturazione mensile",
      "limitare l’orario a una fascia",
    ],
    files: [
      "caricare un file",
      "trascinare i file",
      "scattare una foto con la fotocamera",
      "scegliere più file",
      "accettare solo immagini o PDF",
      "rifiutare i file troppo grandi",
      "spiegare perché un file è stato rifiutato",
    ],
    pickers: [
      "scegliere da un elenco",
      "scegliere un record",
      "inserire una tabella di valori",
      "salvare un campo quando si esce",
      "raccogliere una firma",
      "verificare la sicurezza della password",
      "modulo in più passaggi",
    ],
    comboboxes: [
      "filtrare un lungo elenco scrivendo",
      "suggerimenti durante la digitazione",
      "completamento automatico dal server",
      "testo libero con suggerimenti",
      "cercare mentre si scrive",
      "creare una nuova opzione",
      "combobox",
    ],
    "entity-pickers": [
      "scegliere un record per id",
      "scegliere un cliente o un contatto",
      "selezionare più record",
      "caricare le opzioni da un’API",
      "selettore dentro una tabella",
      "mostrare lo stato di errore",
      "scegliere un elemento collegato",
    ],
    "dropdown-parts": [
      "selezionare più opzioni",
      "selezione multipla con caselle",
      "opzioni raggruppate",
      "seleziona tutto",
      "selettore a pannello sul telefono",
      "creare il mio dropdown",
      "filtrare un dropdown scrivendo",
    ],
    "measured-grid": [
      "inserire una tabella di misure",
      "incollare da un foglio di calcolo",
      "griglia da tastiera come Excel",
      "migliaia di righe",
      "elenco virtualizzato",
      "trasformare il testo incollato in righe",
      "modificare le celle con le frecce",
    ],
    "field-sync": [
      "salvare un campo quando lo si lascia",
      "mostrare lo stato salvataggio o salvato",
      "mostrare che il salvataggio non è riuscito",
      "salvataggio automatico",
      "indicatore di modifiche non salvate",
      "campo collegato al database",
    ],
    "signature-password": [
      "firmare un documento",
      "raccogliere una firma",
      "mostrare una firma salvata",
      "verificare la sicurezza della password",
      "confermare con la password",
      "chiedere conferma prima di eliminare",
      "scrivere il nome per confermare l’eliminazione",
      "confermare un’azione pericolosa",
    ],
    "data-display": [
      "mostrare dati",
      "visualizzare valori",
      "tabelle ed elenchi",
      "avanzamento e feedback",
      "pulsanti e card",
    ],
    buttons: [
      "un pulsante",
      "pulsanti primari e secondari",
      "pulsante con icona",
      "gruppo di pulsanti",
      "contenitore card",
      "indicatore di caricamento",
      "avatar con le iniziali",
      "pulsante disabilitato",
      "punto di stato sull'avatar",
    ],
    "chips-toggles": [
      "scegliere tra poche opzioni",
      "controllo segmentato",
      "schede",
      "tag o chip",
      "inserire più tag",
      "chip di filtro",
      "passare da una vista all’altra",
      "rimuovere un tag",
    ],
    feedback: [
      "mostrare l’avanzamento",
      "barra di avanzamento",
      "segnaposto di caricamento",
      "skeleton durante il caricamento",
      "nessun risultato",
      "messaggio nessun elemento trovato",
      "avvisare l’utente",
      "banner di avviso o errore",
      "messaggio di conferma",
      "indicatore percentuale",
      "mostrare una breve conferma",
      "annullare dopo l’eliminazione",
      "toast",
    ],
    "description-list": [
      "mostrare coppie chiave e valore",
      "dettagli di un record",
      "tabella statica semplice",
      "tabella con riga dei totali",
      "linea divisoria",
      "area scorrevole",
      "allineare i numeri a destra in tabella",
    ],
    "lists-menus": [
      "elenco di elementi",
      "riga cliccabile",
      "riga con azioni",
      "indicatore non letto",
      "elenco della posta in arrivo",
      "voce di menu con spunta",
      "voce di menu pericolosa",
      "selezionare più righe",
      "azioni di gruppo sulle righe selezionate",
      "barra degli strumenti della selezione",
    ],
    "tree-view": [
      "mostrare dati gerarchici",
      "albero di cartelle",
      "espandere e comprimere i nodi",
      "caricare i figli su richiesta",
      "navigare un albero con la tastiera",
      "categorie annidate",
      "organigramma come elenco",
    ],
    "data-table": [
      "dati tabellari con ordinamento",
      "ordinare una tabella",
      "filtrare le righe",
      "selezionare le righe",
      "espandere una riga per i dettagli",
      "tabella con paginazione",
      "nascondere o riordinare le colonne",
      "griglia di dati",
      "cercare in una tabella",
    ],
    "data-table-server": [
      "paginazione lato server",
      "tenere i filtri della tabella nell’URL",
      "tabella come card sul telefono",
      "azioni con swipe sulle righe",
      "raggruppare le righe",
      "caricare le pagine da un’API",
      "condividere il link di una tabella filtrata",
    ],
    "data-table-parts": [
      "controlli di paginazione",
      "popover dei filtri",
      "funzioni di ordinamento",
      "confrontare le righe con un filtro",
      "tradurre le etichette della tabella",
      "scelta delle righe per pagina",
    ],
    layout: [
      "comprimere una sezione",
      "accordion",
      "mostra di più o di meno",
      "layout di dialogo con intestazione e azioni",
      "pannello espandibile",
      "animare l’altezza",
    ],
    charts: [
      "disegnare un grafico",
      "visualizzare i dati",
      "colori dei grafici",
      "dashboard con KPI",
      "grafico a linee o a barre",
    ],
    "chart-shell": [
      "grafico con il tema",
      "tooltip del grafico",
      "legenda del grafico",
      "colori delle serie",
      "usare Recharts con il tema",
      "grafico a torta o a barre",
      "grafico responsive",
    ],
    "tile-chart": [
      "treemap",
      "mostrare le quote di un totale",
      "approfondire un grafico",
      "riquadri cliccabili",
      "spese per categoria",
      "far stare le etichette nei riquadri",
    ],
    "series-chart": [
      "grafico nel tempo",
      "zoom su un grafico",
      "grafico a linee con due assi",
      "attivare o disattivare le serie dalla legenda",
      "più grafici con un solo zoom",
      "serie temporale",
      "misure nel tempo",
    ],
    "series-chart-marks": [
      "grafico a barre",
      "grafico ad aree sovrapposte",
      "linea di riferimento o soglia",
      "marcatori su un grafico",
      "cliccare un punto del grafico",
      "grafico per date",
      "colori della legenda stabili",
    ],
    stats: [
      "riquadro KPI",
      "mostrare un numero con la variazione",
      "tendenza in salita o in discesa",
      "sparkline in una cella",
      "cifre per la dashboard",
      "mini grafico a linee",
    ],
    "calendar-heatmap": [
      "grafico dei contributi",
      "attività per giorno",
      "calendario delle spese",
      "heatmap dei giorni",
      "colorare i giorni per valore",
      "l'anno a colpo d'occhio",
    ],
    overlays: [
      "mostrare qualcosa sopra la pagina",
      "aprire una finestra di dialogo",
      "popup o menu",
      "tooltip",
      "command palette",
    ],
    dialogs: [
      "aprire una finestra modale",
      "dialogo a schermo intero",
      "chiudere cliccando fuori",
      "animare la chiusura",
      "finestra popup",
      "dialogo sul telefono",
    ],
    "confirm-floating": [
      "chiedere conferma prima di eliminare",
      "dialogo di conferma",
      "sostituire window.confirm",
      "sei sicuro?",
      "pulsante di azione flottante",
      "pannello fissato in un angolo",
      "pannello di chat o di aiuto",
    ],
    "floating-actions": [
      "pillola di stato fluttuante",
      "annunciare un cambio di stato",
      "indicatore offline",
      "tooltip su un pulsante fluttuante",
      "interruttori in un angolo",
      "badge con un contatore",
      "barra degli strumenti fluttuante",
    ],
    popovers: [
      "mostrare un tooltip al passaggio del mouse",
      "popover ancorato a un pulsante",
      "menu al passaggio del mouse",
      "menu a tendina",
      "posizionare un popup vicino a un elemento",
      "spiegare un’icona",
    ],
    tour: [
      "tour guidato",
      "guida di benvenuto",
      "evidenziare un elemento",
      "introduzione passo passo",
      "aspettare il clic dell’utente",
      "tour del prodotto per nuovi utenti",
    ],
    "command-palette": [
      "command palette",
      "ricerca globale",
      "scorciatoia da tastiera per cercare",
      "andare a una pagina",
      "ricerca tollerante agli errori di battitura",
      "menu di azioni rapide",
      "risultati di ricerca dal server",
    ],
    "swipeable-row": [
      "scorrere una riga per eliminarla",
      "mostrare le azioni con uno swipe",
      "swipe sul telefono",
      "archiviare con uno swipe",
      "azioni sulle righe di un elenco",
    ],
    "app-chrome": [
      "layout dell’app",
      "barra laterale e barra superiore",
      "pagina delle impostazioni",
      "scegliere un piano di abbonamento",
      "raccogliere il feedback degli utenti",
    ],
    "page-structure": [
      "titolo di pagina con azioni",
      "intestazione di pagina",
      "percorso di navigazione",
      "percorso su telefono",
      "piccola etichetta di sezione in maiuscolo",
      "testo di aiuto sotto un campo",
      "punto di stato",
      "indicatore online",
      "punto non letto sull’avatar",
      "colore della legenda",
      "link come pillole che vanno a capo",
    ],
    shell: [
      "layout dell’app con barra laterale",
      "barra superiore",
      "menu di navigazione",
      "navigazione in basso sul telefono",
      "indice dei contenuti",
      "cambio del tema",
      "menu della lingua",
      "comprimere la barra laterale",
      "menu account con avatar",
    ],
    settings: [
      "impostazioni dell’account",
      "cambiare la password",
      "autenticazione a due fattori",
      "modificare il profilo",
      "scegliere il tema",
      "scegliere la lingua",
      "preferenze dell’utente",
      "creare una pagina delle impostazioni con barra laterale",
      "mostrare le impostazioni come elenco sul telefono",
      "link diretto a un’impostazione",
      "cercare nelle impostazioni",
      "pagina di amministrazione con lo stesso layout",
      "far seguire la lingua all’account",
    ],
    wizard: [
      "modulo in più passaggi",
      "stepper",
      "procedura guidata con riepilogo",
      "andare avanti e indietro tra i passaggi",
      "percorso di onboarding",
      "riepilogo prima dell’invio",
    ],
    "feedback-compose": [
      "raccogliere il feedback degli utenti",
      "segnalare un bug",
      "allegare uno screenshot",
      "modulo di feedback",
      "inviare un suggerimento",
    ],
    "feedback-inbox": [
      "gestire le segnalazioni",
      "flusso di stato delle segnalazioni",
      "smistare le segnalazioni di bug",
      "casella del supporto",
      "cambiare lo stato di una segnalazione",
    ],
    api: [
      "hook e funzioni di supporto",
      "funzioni senza interfaccia",
      "funzioni di utilità",
      "costanti",
      "funzioni per le date",
    ],
    "hooks-lib": [
      "reagire alle dimensioni dello schermo",
      "hook per media query",
      "chiudere un overlay con il tasto indietro",
      "posizionare un pannello accanto al suo pulsante",
      "unire i nomi delle classi",
      "riconoscere un telefono",
    ],
    "clipboard-timing": [
      "copiare negli appunti",
      "pulsante copia con conferma",
      "debounce della digitazione",
      "aspettare che l’utente smetta di scrivere",
      "ritardare una richiesta di ricerca",
      "limitare la frequenza di una callback",
    ],
    helpers: [
      "calcoli con le date",
      "data di oggi in formato ISO",
      "intervalli di date predefiniti",
      "calcolare un’espressione matematica",
      "elenco delle valute",
      "ultimi mesi completi",
      "classi dei campi",
    ],
    // The Server kit group (0.31).
    "server-kit": [
      "documentazione del pacchetto backend",
      "installare server-kit",
      "quale release di server-kit è documentata",
      "contratti Python per il backend",
      "trovare il lato server di un componente",
    ],
    "server-auth": [
      "verificare un accesso sul server",
      "registrazione solo su invito",
      "creare un token per reimpostare la password",
      "claim del token di sessione",
      "normalizzare un indirizzo email",
      "codici di errore dell’autenticazione",
    ],
    "server-user-admin": [
      "interrogare l’elenco utenti sul server",
      "livello di conferma di un’azione di amministrazione",
      "scrivere una voce di audit",
      "eliminare un account in due fasi",
      "esportare i dati di un utente",
      "non rimuovere mai l’ultimo amministratore",
    ],
    "server-settings": [
      "aggiornare le impostazioni senza perdere campi",
      "azzerare un’impostazione con null",
      "rifiutare i campi sconosciuti nel body",
      "salvare la lingua dell’account",
      "leggere l’header Accept-Language",
    ],
    "server-demo": [
      "avviare una sessione demo",
      "impostazioni dell’account demo",
      "rendere la demo di sola lettura",
      "codici di rifiuto della demo",
      "ripulire i vecchi utenti demo",
    ],
    "server-billing": [
      "controllare il limite del piano sul server",
      "verificare la firma di un webhook",
      "gestire gli eventi di Paddle e Lemon Squeezy",
      "l’abbonamento è in regola",
      "date di fine della prova e della beta",
      "rifiutare le scritture quando l’abbonamento scade",
      "catalogo dei piani con i prezzi",
    ],
    "server-mail": [
      "inviare l’email di reimpostazione della password",
      "anteprima delle email dell’account",
      "testi delle email per lingua",
      "inviare email tramite Resend",
      "registrare le email in sviluppo",
      "indirizzo di risposta del supporto",
    ],
    "server-feedback": [
      "validare una segnalazione",
      "regole di stato del feedback",
      "registrare un arresto anomalo",
      "controllare il tipo di un file caricato",
      "limitare la dimensione degli allegati",
      "cancellare il feedback di un utente eliminato",
    ],
    "server-limits": [
      "limitare la frequenza di una route",
      "IP del client dietro un proxy",
      "inviare l’header Retry-After",
      "mappare gli errori del kit sugli stati HTTP",
      "consentire un’origine CORS aggiuntiva",
      "risposta di errore con codice",
    ],
    "server-translation-review": [
      "rivedere le traduzioni tramite API",
      "emettere un token di revisione",
      "chi può rivedere quale lingua",
      "verdetti sulle traduzioni",
      "chiavi di traduzione del kit",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_IT,
};
