import { UI_KIT_LABELS_HU } from "@eifi1/ui-kit/i18n/hu";
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
    devicePreview: "Előnézet képernyőméretekben",
    previewHint:
      "Az oldal a három leggyakoribb képernyőméretben, élőben: mindegyik keretben görgethet és kattinthat. A téma, a paletta és a nyelv a felső sávot követi.",
    phone: "Telefon",
    tablet: "Táblagép",
    desktop: "Asztali gép",
  },

  groups: {
    "Getting started": "Első lépések",
    Foundations: "Alapok",
    Inputs: "Bevitel",
    "Pickers & entry": "Választók és bevitel",
    "Data display": "Adatmegjelenítés",
    // Hungarian UI writing has no settled loanword for "overlay"; "felugró elemek"
    // (pop-up elements) is what a Hungarian designer calls this group.
    Overlays: "Felugró elemek",
    "App chrome": "Alkalmazáskeret",
    API: "API",
  },

  groupShort: {
    "Getting started": "Kezdés",
    Foundations: "Tokenek",
    "Pickers & entry": "Választók",
    "Data display": "Adatok",
    "App chrome": "Keret",
  },

  pages: {
    overview: {
      title: "Áttekintés",
      short: "Áttekintés",
      blurb:
        "Mi az @eifi1/ui-kit, milyen hét rétegre épül, és hogyan érdemes olvasni ennek a bemutatónak egy oldalát.",
    },
    foundations: {
      title: "Alapok",
      blurb:
        "Az értékek, amelyekkel minden komponens fest, és a nyelv, amelyet minden komponens beszél. E réteg alatt semmi sem tartalmaz beégetett színt vagy szöveget.",
    },
    tokens: {
      title: "Tokenek",
      short: "Tokenek",
      blurb:
        "Az aktív TokenSet minden értéke, élőben. Váltson témát vagy palettát a felső sávban, és figyelje, ahogy az oldal változik — ami nem mozdul, az be van égetve a kódba.",
    },
    palette: {
      title: "Palettagenerátor",
      short: "Paletta",
      blurb:
        "Egy márkaszín be, mindkét téma ki — minden kontrasztarány mérve, nem kijelentve, és minden kompromisszum néven nevezve.",
    },
    localisation: {
      title: "Lokalizáció",
      short: "Lokalizáció",
      blurb:
        "A csomag által megjelenített összes szöveg egyetlen típusos fában — és a provider, amely egyszerre adja át a fordítást minden komponensnek.",
    },
    inputs: {
      title: "Bevitel",
      blurb:
        "Egy érték begépelésének vagy beállításának minden módja: szöveg, választás, számok, dátumok, fájlok és a köréjük épülő űrlapadapter. Közös a felépítésük — lebegő címke, az érték, alatta egy súgósor —, így egy űrlap egységes egészként olvasható.",
    },
    fields: {
      title: "Szövegmezők",
      short: "Szöveg",
      blurb:
        "Beviteli mezők, és azok az osztálykonstansok, amelyekből egy alkalmazás a saját mezőit összeállítja.",
    },
    forms: {
      title: "Űrlapok (react-hook-form)",
      short: "Űrlapok",
      blurb:
        "A react-hook-form adapter a @eifi1/ui-kit/rhf alútvonalon: egy mező címkéje, vezérlője, leírása és üzenete egymással és az űrlap állapotával összekötve — üzenet csak ott, ahol a felhasználó látja.",
    },
    choices: {
      title: "Választás",
      short: "Választás",
      blurb:
        "Be vagy ki, egy a néhány közül, egy érték egy skálán — valamint szín, ikon vagy kártya kiválasztása.",
    },
    numbers: {
      title: "Számok és összegek",
      short: "Számok",
      blurb:
        "A számkezelő elemek: számológéppel kiegészített számmező, szám értékű mező, összegmező a színárnyalataival és pénznemválasztó.",
    },
    calendars: {
      title: "Naptárak és dátumválasztók",
      short: "Naptárak",
      blurb:
        "Egy nap vagy időszak kiválasztása: maga a naptár, a rá épülő dátum- és időszakválasztók, azok előbeállításai és határai, valamint a hét első napja.",
    },
    "month-time": {
      title: "Hónap és időpont",
      short: "Hónap, idő",
      blurb:
        "A durvább és a finomabb lépték: önmagában kiválasztott hónap mezőben vagy léptetőgombok között, valamint egy napszak szerinti időpont.",
    },
    files: {
      title: "Fájlok",
      short: "Fájlok",
      blurb:
        "Fájlok kiválasztása: egy gomb, amely a fájlválasztót vagy a kamerát nyitja meg, a fájlok behúzására szolgáló terület, és az elutasítások, amelyek ott jelennek meg, ahová a felhasználó éppen néz — soha nem felugró értesítésként.",
    },
    pickers: {
      title: "Választók és bevitel",
      blurb:
        "Választás listából gépelés helyett, és a bevitel összetettebb formái: mérési táblázat, a mező elhagyásakor mentett érték, aláírás, jelszó.",
    },
    comboboxes: {
      title: "Comboboxok",
      short: "Comboboxok",
      blurb:
        "Szabad szöveg javaslatokkal: a combobox, amelynek értéke az, amit begépeltek, és az automatikus kiegészítés, amely már gépelés közben keres.",
    },
    "entity-pickers": {
      title: "Entitásválasztók",
      short: "Entitások",
      blurb:
        "Rekord kiválasztása azonosító alapján: mező és gomb formájú választók, statikus és betöltött opciók, egyszerre több érték, valamint a közös érvénytelen, hibás és letiltott állapotok.",
    },
    "dropdown-parts": {
      title: "Legördülő építőelemek",
      short: "Építőelemek",
      blurb:
        "Többszörös kijelölés, csoportosított választó és a telefonos lap — valamint a hookok és a panel, amelyekből a csomag minden legördülő listája épül.",
    },
    "measured-grid": {
      title: "Táblázatbevitel",
      short: "Táblázatbevitel",
      blurb:
        "Mérési táblázat bevitele: billentyűzettel kezelhető cellarács, táblázatkezelőből beillesztett blokk és ugyanaz a táblázat szövegként — több ezer sor, csak a láthatók jelennek meg.",
    },
    "field-sync": {
      title: "Mezők szinkronizálási állapota",
      short: "Szinkron",
      blurb:
        "Adatbázishoz kötött mező szinkronizálási állapota, a mező elhagyásakor mentve: a keret színe és egy ikon a mező végén mutatja, hogy módosítva, mentés folyamatban, mentve vagy hiba — a hibajelre mutatva látszik az ok.",
    },
    "signature-password": {
      title: "Aláírás, jelszó és megerősítés",
      short: "Aláírás",
      blurb:
        "Aláírás rögzítése — és egy mentett aláírás megjelenítése —, visszajelzés a jelszó erősségéről, valamint egy visszavonhatatlan művelet megerősítése.",
    },
    "data-display": {
      title: "Adatmegjelenítés",
      blurb:
        "Értékek megjelenítése bevitel helyett: az alapelemek, a táblázat és a diagramok.",
    },
    buttons: {
      title: "Gombok és felületek",
      short: "Gombok",
      blurb:
        "Gombok, ikongombok, kártyák, töltésjelzők, üres állapotok, avatarok és értesítősávok — a darabok, amelyekből minden más épül.",
    },
    "chips-toggles": {
      title: "Címkék és kapcsolók",
      short: "Címkék",
      blurb:
        "A címkék (chipek) és a címkemező, a kapcsolócsoport és a fülek — a kis vezérlők, amelyekkel néhány közül egy választható, vagy amelyek egy rövid listát tartanak.",
    },
    "data-table": {
      title: "Adattáblázat",
      short: "Táblázat",
      blurb:
        "A csomag legnagyobb komponense, teljes egészében: rendezés, szűrés, kijelölés és kibontás, kívülről vezérelve, rövid táblázat lapozás nélkül, egy panel kitöltése és jobbról balra írás.",
    },
    "data-table-server": {
      title: "Adattáblázat: szerver, URL és telefon",
      short: "Szerver, telefon",
      blurb:
        "A táblázat, amikor nem minden az övé: a nézet a címsorban, a sorokat a szerver lapozza, és a telefonos elrendezés kártyákkal, csoportokkal és elhúzható műveletekkel.",
    },
    "data-table-parts": {
      title: "Adattáblázat: építőelemek és segédfüggvények",
      short: "Táblázatelemek",
      blurb:
        "Amiből a táblázat összeáll, külön is használható formában: a lapozó, a szűrő popover, a címkék fája, valamint a rendezés, szűrés és URL tiszta segédfüggvényei.",
    },
    "chart-shell": {
      title: "Diagramkeret",
      short: "Diagramok",
      blurb:
        "A Recharts fölé épülő témázott diagramkeret — tároló, elemleírás és jelmagyarázat —, és a színrendszer, amelyből a csomag minden diagramja merít.",
    },
    "tile-chart": {
      title: "Csempés diagram",
      short: "Csempék",
      blurb:
        "A treemap: egy egész részei csempékként, elférő feliratokkal és kattintható csempékkel — és a lefúrás, oszlopdiagramon éppúgy, mint csempéken át.",
    },
    "series-chart": {
      title: "Adatsor-diagram",
      short: "Adatsorok",
      blurb:
        "Az alkalmazások közös, nagyítható adatsor-diagramja: mértékegységenként egy tengely, kapcsolókból álló jelmagyarázat, egyetlen nagyítás diagramok egész sorára, és az alattuk lévő segédfüggvények.",
    },
    stats: {
      title: "Mutatók és sparkline-ok",
      short: "Mutatók",
      blurb:
        "A KPI-csempe, amelyet minden irányítópult megismétel — érték, változás, trend —, és az apró vonal, amely elfér egy táblázatcellában.",
    },
    layout: {
      title: "Lenyíló szakasz és párbeszédkeret",
      short: "Lenyíló",
      blurb:
        "Egy összecsukható szakasz, és a fejléc–tartalom–műveletek keret, amelyet minden párbeszédablak megismétel.",
    },
    overlays: {
      title: "Felugró elemek",
      blurb:
        "Minden, ami az oldal fölött lebeg, és az az egy időzítés, amelyen bezáráskor mind osztoznak.",
    },
    dialogs: {
      title: "Párbeszédablakok",
      short: "Párbeszéd",
      blurb:
        "A modális és a teljes képernyős párbeszédablak, a háttérre kattintás, amely bezárja őket, és a bezárási időzítés, amelyen minden felugró elem osztozik.",
    },
    popovers: {
      title: "Popoverek, menük és elemleírások",
      short: "Popoverek",
      blurb:
        "Egy kiváltó elemhez horgonyzott felugró elemek: popover, rámutatásra nyíló menü és elemleírás — az ablak szélén átfordítva és beszorítva, jobbról balra tükrözve —, és a mögöttük álló tiszta elhelyezési számítás.",
    },
    tour: {
      title: "Interaktív útmutató",
      short: "Útmutató",
      blurb:
        "Reflektoros bemutató a valódi oldalon: lépések, amelyek szelektorral bármely elemre mutatnak, kattintásra várnak, előbb kódot futtatnak, és egy hiányzó célt is túlélnek.",
    },
    "command-palette": {
      title: "Parancspaletta",
      short: "Parancsok",
      blurb:
        "A ⌘K paletta: helyek és műveletek kereshető listája, amely az oldal bármely pontjáról megnyílik a billentyűparanccsal, és amelynek találatai később is megérkezhetnek.",
    },
    "swipeable-row": {
      title: "Elhúzható sor",
      short: "Elhúzás",
      blurb:
        "Listasor, amely oldalra húzva megmutatja a műveleteit — ujjal vagy egérrel, fokozatosan, jobbról balra is —, és ugyanezek a műveletek billentyűzettel is elérhetők.",
    },
    "app-chrome": {
      title: "Alkalmazáskeret",
      blurb:
        "A keret, amelyben egy alkalmazás él, és a folyamatok, amelyeket minden alkalmazás megismétel: beállítások, többlépéses űrlapok, visszajelzés.",
    },
    shell: {
      title: "Váz",
      short: "Váz",
      blurb: "Az alkalmazáskeret, amelyet éppen lát, darabjaira szedve.",
    },
    settings: {
      title: "Beállításmezők",
      short: "Beállítások",
      blurb:
        "A fiókbeállítások sorai: téma, nyelv, profil, jelszó és kétfaktoros hitelesítés.",
    },
    wizard: {
      title: "Varázsló",
      short: "Varázsló",
      blurb: "A többlépéses motor, a kerete és az áttekintő lépése.",
    },
    "feedback-compose": {
      title: "Visszajelzés — írás",
      short: "Írás",
      blurb: "A bejelentő űrlap és a mellékletmezője.",
    },
    "feedback-inbox": {
      title: "Visszajelzés — beérkezett",
      short: "Beérkezett",
      blurb:
        "A közös állapotszókincs, az állapotváltási szabályok, és a részek, amelyekből egy beérkezett üzenetek nézet felépül.",
    },
    api: {
      title: "API",
      blurb:
        "Ami a pixelek nélkül marad: a hookok, amelyekből a komponensek felépülnek, valamint a tiszta segédfüggvények és konstansok, amelyeket egy alkalmazás közvetlenül hív.",
    },
    "hooks-lib": {
      title: "Hookok és lib",
      short: "Hookok",
      blurb:
        "A nem vizuális exportok: a hookok élőben, a tiszta segédfüggvények pedig bemenet → kimenet formában.",
    },
    helpers: {
      title: "Segédfüggvények és konstansok",
      short: "Segédfüggvények",
      blurb:
        "A beviteli mezők mögötti függvények és adatok, bemenet → eredmény formában: dátumszámítás a @eifi1/ui-kit/dates alútvonalról, a számológép kiértékelője, a pénznemtáblázat és az osztálykonstansok, amelyekből egyéni mező állítható össze.",
    },
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_HU,
};
