import { formatFileSize } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * Hungarian.
 *
 * Written against en.ts and the kit's `DEFAULT_*` labels key for key. Conventions a
 * reviewer should know:
 *
 *  1. REGISTER. Formal "Ön" in announcements and prose ("Válassza ki…", "Kattintson…"),
 *     which is what Hungarian software addresses its user with; buttons are nouns of
 *     action — Mentés, Mégse, Bezárás, Tovább — never imperatives.
 *  2. NO PLURAL AFTER A NUMBER. Hungarian keeps the noun singular after a count
 *     ("5 sor", never "5 sorok"), so the counted messages need no branch.
 *  3. NO SUFFIX ON A NUMBER. A case ending on a numeral has to harmonise with how the
 *     number is PRONOUNCED (3-ból but 4-ből, 1000-ből but 100-ból), and so does the
 *     article before it (a 8 but az 5). Neither can be computed from digits without a
 *     spelled-out-numeral table, so every message is phrased to keep numerals bare:
 *     "12 / 137 sor", "3. oldal (összesen 14)", "legfeljebb 5 elem". A reviewer who
 *     finds "137 sorból 12" more natural is right — and it is wrong for 1000.
 *  4. QUOTES are „…” (low-9 opening, high-9 closing — not German's „…“).
 *  5. APIs STAY ENGLISH: `TokenSet`, `PickerSheet`, `Recharts`, `provider`; "hook"
 *     takes Hungarian inflection as developers write it ("hookok").
 *  6. NUMBERS go through `Intl.NumberFormat("hu-HU")`, which groups with a space.
 */
const num = new Intl.NumberFormat("hu-HU");
const n = (value: number) => num.format(value);

export const hu: Dictionary = {
  tag: "hu-HU",
  name: "Magyar",
  country: "hu",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "Ezen az oldalon",
    previous: "Előző",
    next: "Következő",
    notFoundTitle: "Nincs ilyen oldal",
    notFoundHint: "Ez az útvonal a csomag egyik komponenséhez sem tartozik.",
    backToStart: "Vissza az áttekintéshez",
    toggleTheme: "Téma váltása",
    palette: "Paletta",
    language: "Nyelv",
    renderedFrom: "@eifi1/ui-kit bemutató — a src/ mappából renderelve, nem a dist/ mappából.",
    breadcrumb: "Morzsanavigáció",
    pagination: "Lapozás",
    sidebarStyle: "Oldalsáv stílusa",
    sidebarFlyout: "Oldalak lenyíló menüben",
    sidebarInline: "Oldalak az oldalsávban",
    contentsPosition: "A tartalomjegyzék helye",
    positionStart: "Balra",
    positionEnd: "Jobbra",
  },

  groups: {
    "Getting started": "Első lépések",
    Foundations: "Alapok",
    Inputs: "Bevitel",
    "Data display": "Adatmegjelenítés",
    // Hungarian UI writing has no settled loanword for "overlay"; "felugró elemek"
    // (pop-up elements) is what a Hungarian designer calls this group.
    Overlays: "Felugró elemek",
    "App chrome": "Alkalmazáskeret",
    API: "API",
  },

  pages: {
    overview: {
      title: "Áttekintés",
      blurb:
        "Mi az @eifi1/ui-kit, milyen hat rétegre épül, és hogyan érdemes olvasni ennek a bemutatónak egy oldalát.",
    },
    foundations: {
      title: "Alapok",
      blurb:
        "Az értékek, amelyekkel minden komponens fest, és a nyelv, amelyet minden komponens beszél. E réteg alatt semmi sem tartalmaz beégetett színt vagy szöveget.",
    },
    tokens: {
      title: "Tokenek",
      blurb:
        "Az aktív TokenSet minden értéke, élőben. Váltson témát vagy palettát a felső sávban, és figyelje, ahogy az oldal változik — ami nem mozdul, az be van égetve a kódba.",
    },
    palette: {
      title: "Palettagenerátor",
      blurb:
        "Egy márkaszín be, mindkét téma ki — minden kontrasztarány mérve, nem kijelentve, és minden kompromisszum néven nevezve.",
    },
    localisation: {
      title: "Lokalizáció",
      blurb:
        "A csomag által megjelenített összes szöveg egyetlen típusos fában — és a provider, amely egyszerre adja át a fordítást minden komponensnek.",
    },
    inputs: {
      title: "Bevitel",
      blurb:
        "Egy érték bevitelének minden módja. Közös a felépítésük — lebegő címke, az érték, alatta egy súgósor —, így egy űrlap egységes egészként olvasható.",
    },
    fields: {
      title: "Szövegmezők",
      blurb:
        "Beviteli mezők, és azok az osztálykonstansok, amelyekből egy alkalmazás a saját mezőit összeállítja.",
    },
    choices: {
      title: "Választás",
      blurb:
        "Be vagy ki, egy a néhány közül, egy érték egy skálán — valamint szín, ikon vagy kártya kiválasztása.",
    },
    numbers: {
      title: "Számok és összegek",
      blurb:
        "A számkezelő elemek: számológéppel kiegészített számmező, szám értékű mező, összegmező a színárnyalataival és pénznemválasztó.",
    },
    dropdowns: {
      title: "Legördülő listák és választók",
      blurb:
        "Comboboxok, többszörös kijelölés, csoportosított és lap alapú választók, valamint az alattuk lévő legördülő primitívek.",
    },
    files: {
      title: "Fájlok",
      blurb:
        "Fájlok kiválasztása: egy gomb, amely a fájlválasztót vagy a kamerát nyitja meg, a fájlok behúzására szolgáló terület, és az elutasítások, amelyek ott jelennek meg, ahová a felhasználó éppen néz — soha nem felugró értesítésként.",
    },
    dates: {
      title: "Dátum és idő",
      blurb:
        "Időpont kiválasztása bármilyen léptékben: nap, időszak, hónap, napszak szerinti időpont.",
    },
    "field-sync": {
      title: "Mezők szinkronizálási állapota",
      blurb:
        "Adatbázishoz kötött mező szinkronizálási állapota, a mező elhagyásakor mentve: a keret színe és egy ikon a mező végén mutatja, hogy módosítva, mentés folyamatban, mentve vagy hiba — a hibajelre mutatva látszik az ok.",
    },
    "signature-password": {
      title: "Aláírás, jelszó és megerősítés",
      blurb:
        "Aláírás rögzítése — és egy mentett aláírás megjelenítése —, visszajelzés a jelszó erősségéről, valamint egy visszavonhatatlan művelet megerősítése.",
    },
    "data-display": {
      title: "Adatmegjelenítés",
      blurb:
        "Értékek megjelenítése bevitel helyett: az alapelemek, a táblázat és a diagramok.",
    },
    primitives: {
      title: "Alapelemek",
      blurb:
        "Gombok, kártyák, fülek, értesítősávok, avatarok — a darabok, amelyekből minden más épül.",
    },
    "data-table": {
      title: "Adattáblázat",
      blurb:
        "A csomag legnagyobb komponense: rendezés, szűrés, kijelölés, lapozás, URL-szinkronizálás és a tiszta segédfüggvényei.",
    },
    charts: {
      title: "Diagramok",
      blurb:
        "A Recharts fölé épülő témázott diagramkeret, a színrendszere, valamint az alkalmazások közös csempés diagramja (treemap) és nagyítható adatsor-diagramja.",
    },
    stats: {
      title: "Mutatók és sparkline-ok",
      blurb:
        "A KPI-csempe, amelyet minden irányítópult megismétel — érték, változás, trend —, és az apró vonal, amely elfér egy táblázatcellában.",
    },
    layout: {
      title: "Lenyíló szakasz és párbeszédkeret",
      blurb:
        "Egy összecsukható szakasz, és a fejléc–tartalom–műveletek keret, amelyet minden párbeszédablak megismétel.",
    },
    overlays: {
      title: "Felugró elemek",
      blurb:
        "Minden, ami az oldal fölött lebeg, és az az egy időzítés, amelyen bezáráskor mind osztoznak.",
    },
    dialogs: {
      title: "Párbeszédablakok és popoverek",
      blurb:
        "Modális ablak, teljes képernyős párbeszédablak, popover, rámutatásra nyíló menü és elemleírás — plusz a közös bezárási időzítés.",
    },
    "tour-search-files": {
      title: "Útmutató, parancspaletta és fájlok",
      blurb:
        "Az interaktív útmutató, a parancspaletta, a fájlfeltöltő terület és az elhúzható sor.",
    },
    "app-chrome": {
      title: "Alkalmazáskeret",
      blurb:
        "A keret, amelyben egy alkalmazás él, és a folyamatok, amelyeket minden alkalmazás megismétel: beállítások, többlépéses űrlapok, visszajelzés.",
    },
    shell: {
      title: "Váz",
      blurb: "Az alkalmazáskeret, amelyet éppen lát, darabjaira szedve.",
    },
    settings: {
      title: "Beállításmezők",
      blurb:
        "A fiókbeállítások sorai: téma, nyelv, profil, jelszó és kétfaktoros hitelesítés.",
    },
    wizard: {
      title: "Varázsló",
      blurb: "A többlépéses motor, a kerete és az áttekintő lépése.",
    },
    "feedback-compose": {
      title: "Visszajelzés — írás",
      blurb: "A bejelentő űrlap és a mellékletmezője.",
    },
    "feedback-inbox": {
      title: "Visszajelzés — beérkezett",
      blurb:
        "A közös állapotszókincs, az állapotváltási szabályok, és a részek, amelyekből egy beérkezett üzenetek nézet felépül.",
    },
    "hooks-lib": {
      title: "Hookok és lib",
      blurb:
        "A nem vizuális exportok: a hookok élőben, a tiszta segédfüggvények pedig bemenet → kimenet formában.",
    },
    api: {
      title: "API",
      blurb:
        "Ami a pixelek nélkül marad: a hookok, amelyekből a komponensek felépülnek, valamint a tiszta segédfüggvények és konstansok, amelyeket egy alkalmazás közvetlenül hív.",
    },
    helpers: {
      title: "Segédfüggvények és konstansok",
      blurb:
        "A beviteli mezők mögötti függvények és adatok, bemenet → eredmény formában: dátumszámítás a @eifi1/ui-kit/dates alútvonalról, a számológép kiértékelője, a pénznemtáblázat és az osztálykonstansok, amelyekből egyéni mező állítható össze.",
    },
  },

  kit: {
    pageContents: { title: "Ezen az oldalon" },
    common: {
      close: "Bezárás",
      clear: "Törlés",
      search: "Keresés",
      done: "Kész",
      cancel: "Mégse",
      save: "Mentés",
      back: "Vissza",
      next: "Tovább",
      remove: "Eltávolítás",
      loading: "Betöltés…",
      noResults: "Nincs találat",
      fieldValue: (field, value) => `${field}: ${value}`,
    },
    dataTable: {
      columns: "Oszlopok",
      selectAllRows: "Összes sor kijelölése",
      sortHint: "Kattintás: rendezés · Shift+kattintás: további rendezési szempont",
      filter: "Szűrés",
      close: "Bezárás",
      selectRow: "Sor kijelölése",
      autoSize: "Oszlopszélességek igazítása",
      loading: "Betöltés…",
      filters: "Szűrők",
      clearAll: "Összes törlése",
      done: "Kész",
      pageSize: "Sorok oldalanként",
      pageSizeAll: "Összes",
      prevPage: "Előző oldal",
      nextPage: "Következő oldal",
      clearFilter: "Szűrő törlése",
      filterPlaceholder: "Szűrés…",
      selectFilter: "Kiválasztás",
      selectAll: "Összes",
      selectNone: "Egyik sem",
      dateFrom: "Ettől",
      dateTo: "Eddig",
      numberMin: "Min.",
      numberMax: "Max.",
      numberAbs: "Abszolút érték",
      presets: {
        today: "Ma",
        yesterday: "Tegnap",
        this_week: "Ez a hét",
        last_week: "Előző hét",
        last_7_days: "Elmúlt 7 nap",
        last_30_days: "Elmúlt 30 nap",
        this_month: "Ez a hónap",
        last_month: "Előző hónap",
        last_3_months: "Elmúlt 3 hónap",
        ytd: "Év eleje óta",
        last_year: "Előző év",
      },
      table: "Adattáblázat",
      // See convention 3: "12 / 137 sor" keeps both numerals free of case endings.
      filterResults: (shown, total) => `${n(shown)} / ${n(total)} sor`,
      sortedAscending: (column) => `Rendezés: ${column}, növekvő`,
      sortedDescending: (column) => `Rendezés: ${column}, csökkenő`,
      sortCleared: (column) => `Rendezés megszüntetve: ${column}`,
      pageChanged: (page, totalPages) => `${n(page)}. oldal (összesen ${n(totalPages)})`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Oszlopok (${n(visible)}/${n(total)})`,
    },
    miniCalendar: {
      previousMonth: "Előző hónap",
      nextMonth: "Következő hónap",
      // Already formatted in the provider's locale ("2026. szeptember 14., hétfő").
      day: (date) => date,
      chooseStart: "Válassza ki a kezdő dátumot",
      chooseEnd: "Válassza ki a záró dátumot",
      startSelected: (date) => `Kezdő dátum: ${date}. Válassza ki a záró dátumot.`,
      rangeSelected: (from, to) =>
        `Kiválasztott időszak: ${from} – ${to}. Az újrakezdéshez válasszon kezdő dátumot.`,
    },
    monthPicker: {
      previousYear: "Előző év",
      nextYear: "Következő év",
      panel: "Hónap kiválasztása",
      month: (monthYear) => monthYear,
    },
    datePicker: {
      panel: "Dátum kiválasztása",
      rangePanel: "Időszak kiválasztása",
      clear: "Törlés",
      previousDay: "Előző nap",
      nextDay: "Következő nap",
      today: "Ma",
    },
    popover: {
      panel: "Felugró panel",
    },
    combobox: {
      search: "Keresés",
      noResults: "Nincs találat",
      clear: "Törlés",
      loading: "Betöltés…",
      create: (query) => `„${query}” létrehozása`,
      selectedCount: (count) => `${n(count)} kiválasztva`,
      loadError: "Az eredmények betöltése nem sikerült",
      // No plural after a numeral (convention 2).
      resultCount: (count) => `${n(count)} találat`,
      minChars: (count) => `Írjon be legalább ${n(count)} karaktert`,
    },
    multiSelect: {
      search: "Keresés",
      selectAll: "Összes kijelölése",
      clear: "Törlés",
      all: "Összes",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "Számológép megnyitása",
      panel: "Számológép",
      calculation: "Számítás",
      backspace: "Visszatörlés",
      clear: "Törlés",
      equals: "Egyenlő",
      done: "Kész",
      plus: "Plusz",
      minus: "Mínusz",
      times: "Szorozva",
      divide: "Osztva",
      decimal: "Tizedesjel",
    },
    currency: {
      currency: "Pénznem",
      search: "Pénznem keresése",
    },
    chipInput: {
      added: (value) => `„${value}” hozzáadva`,
      removed: (value) => `„${value}” eltávolítva`,
      remove: "Eltávolítás",
      // "legfeljebb N elem" — no article before the numeral (see convention 3).
      atLimit: (max) => `Elérte a korlátot: legfeljebb ${n(max)} elem adható meg`,
      duplicate: (value) => `„${value}” már szerepel a listában`,
    },
    swatchPicker: {
      none: "Nincs szín",
      mixed: "Vegyes: a kiválasztott elemek színe eltérő",
    },
    iconPicker: {
      none: "Nincs ikon",
      mixed: "Vegyes: a kiválasztott elemek ikonja eltérő",
      search: "Ikonok keresése",
      noResults: "Nincs megfelelő ikon",
      resultCount: (count) => `${n(count)} ikon`,
    },
    fieldSync: {
      synced: "Mentve",
      edited: "Nem mentett módosítások",
      pending: "Mentés…",
      error: "A mentés nem sikerült",
      retry: "Újra",
    },
    passwordReveal: {
      show: "Jelszó megjelenítése",
      hide: "Jelszó elrejtése",
    },
    dangerConfirm: {
      arm: "Törlés…",
      confirm: "Törlés",
      cancel: "Mégse",
      prompt: "Ez a művelet nem vonható vissza.",
      password: "Jelszó",
      // Phrase after a colon, so no article has to agree with it.
      phrase: (phrase) => `A megerősítéshez írja be: „${phrase}”`,
    },
    tabs: {
      add: "Lap hozzáadása",
      remove: (tab) => `${tab} eltávolítása`,
    },
    appShell: {
      collapse: "Oldalsáv összecsukása",
      expand: "Oldalsáv kibontása",
      toggleGroup: (groupLabel) => `${groupLabel}: oldalak`,
    },
    topBar: {
      theme: "Téma váltása",
      palette: "Megjelenési séma",
      language: "Nyelv",
      switchRole: "Szerepkör váltása",
      role: (value) => `Szerepkör: ${value}`,
    },
    pickerSheet: {
      close: "Bezárás",
    },
    dialogFrame: {
      close: "Bezárás",
    },
    swipeableRow: {
      actions: "Sorműveletek",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, "hu-HU"),
    },
    filePicker: {
      // Each message opens with the quoted name, so no a/az has to agree with it, and
      // keeps numerals and the formatted size bare (convention 3).
      rejectedType: (name) => `„${name}”: nem támogatott fájltípus`,
      rejectedSize: (name, maxSize) => `„${name}”: a fájl mérete legfeljebb ${maxSize} lehet`,
      rejectedCount: (name, maxFiles) =>
        `„${name}” nem lett hozzáadva: legfeljebb ${n(maxFiles)} fájl adható meg`,
      rejectedInvalid: (name) => `„${name}” itt nem használható`,
      rejectedMany: (count) => `${n(count)} fájl nem lett hozzáadva`,
      selected: (count, firstName) =>
        count === 1 ? `„${firstName}” kiválasztva` : `${n(count)} fájl kiválasztva`,
      remove: (name) => `„${name}” eltávolítása`,
      clearAll: "Összes fájl eltávolítása",
      removed: (name) => `„${name}” eltávolítva`,
      cleared: "Minden fájl eltávolítva",
    },
    wizard: {
      cancel: "Mégse",
      back: "Vissza",
      next: "Tovább",
      skip: "Kihagyás",
      finish: "Befejezés",
      submitting: "Létrehozás…",
      steps: "Lépések",
      // "2/5. lépés" — the ordinal dot sits after the fraction, as Hungarian writes it.
      step: (current, total) => `${n(current)}/${n(total)}. lépés`,
      cancelTitle: "Elveti az űrlapot?",
      confirmCancel: "A megadott adatok elvesznek.",
      cancelConfirmLabel: "Elvetés",
      cancelDismissLabel: "Szerkesztés folytatása",
      reviewTitle: "Áttekintés",
      edit: "Szerkesztés",
      missingRequired: "Kérjük, töltse ki az összes kötelező mezőt.",
      genericError: "Hiba történt",
    },
    tour: {
      next: "Tovább",
      back: "Vissza",
      skip: "Kihagyás",
      done: "Kész",
      awaitClickHint: "A folytatáshoz kattintson a kiemelt elemre",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      placeholder: "Keresés…",
      empty: "Nincs találat",
      loading: "Keresés folyamatban…",
      dialog: "Keresés",
    },
    sparkline: {
      // Numerals stay bare (see 3. above): "12-ről 40-re" would need vowel harmony.
      rising: (first, last) => `Emelkedik (első érték: ${first}, utolsó: ${last})`,
      falling: (first, last) => `Csökken (első érték: ${first}, utolsó: ${last})`,
      flat: (value) => `Változatlan: ${value}`,
      single: (value) => `Egyetlen érték: ${value}`,
      noData: "Nincs adat",
      named: (name, summary) => `${name}: ${summary}`,
    },
    statTile: {
      increase: (amount) => `Növekedés: ${amount}`,
      decrease: (amount) => `Csökkenés: ${amount}`,
      unchanged: "Nincs változás",
      better: (change) => `${change} (kedvező)`,
      worse: (change) => `${change} (kedvezőtlen)`,
      noValue: "Nincs adat",
      loading: "Betöltés…",
    },
    signaturePad: {
      label: "Aláírás",
      instructions: "Írja alá a mezőben egérrel, ujjal vagy tollal.",
      typedFallbackHint: "Ha nem tud rajzolni, írja be inkább a nevét.",
      empty: "Még nincs aláírás",
      signed: "Aláírás megrajzolva",
      undo: "Utolsó vonás visszavonása",
      clear: "Törlés",
      save: "Aláírás mentése",
      useTyped: "Név begépelése",
      useDrawn: "Aláírás rajzolása",
      typedName: "Teljes név",
      cleared: "Aláírás törölve",
      undone: "Utolsó vonás eltávolítva",
      viewEmpty: "Nincs aláírva",
      viewDrawn: "Kézzel írt aláírás",
      viewTyped: (name) => `Aláírva a begépelt névvel: ${name}`,
    },
    passwordStrength: {
      tooShort: "Túl rövid",
      weak: "Gyenge",
      fair: "Közepes",
      good: "Jó",
      strong: "Erős",
      announcement: (level) => `Jelszó erőssége: ${level}`,
      // Unformatted, as in the English default; no plural after a number.
      ruleLength: (minLength) => `Legalább ${minLength} karakter`,
      ruleCase: "Kis- és nagybetűk",
      ruleDigit: "Számjegy",
      ruleSymbol: "Speciális karakter",
      optional: (rule) => `${rule} (nem kötelező)`,
      met: "Teljesül:",
      notMet: "Nem teljesül:",
      tooLong: (maxBytes) =>
        `Legfeljebb ${maxBytes} karakter (az ékezetes betűk és az emojik egynél többnek számítanak).`,
    },
    seriesChart: {
      resetZoom: "Nagyítás visszaállítása",
      zoomHint:
        "Húzással nagyíthat: a nagyjából négyzetes kijelölés mindkét tengelyt nagyítja, a hosszú, keskeny csak a saját tengelyét. Dupla kattintással visszaállíthatja.",
      empty: "Nincs adat",
      legend: "Adatsorok",
    },
  },
};
