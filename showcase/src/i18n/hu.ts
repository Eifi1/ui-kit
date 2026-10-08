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
      "Válasszon képernyőméretet: az oldal élőben jelenik meg ebben a szélességben – a keretben görgethet és kattinthat. A téma, a paletta és a nyelv a felső sávot követi.",
    phone: "Telefon",
    tablet: "Táblagép",
    desktop: "Asztali gép",
    previewShort: "Előnézet",
    allDevices: "Mind a három",
    previewExit: "Vissza az oldalra",
    searchPlaceholder: "Komponensek, példák vagy feladatok keresése…",
    searchComponents: "Komponensek",
    searchExamples: "Példák",
    searchNeeds: "Mire van szüksége?",
    searchPages: "Oldalak",
    // The "Server side" line under a kit page's title, and the search's server-kit group.
    serverSide: "Szerveroldal",
    searchServer: "Szervercsomag",
  },

  groups: {
    "Getting started": "Első lépések",
    Foundations: "Alapok",
    Inputs: "Bevitel",
    "Pickers & entry": "Választók és bevitel",
    "Data display": "Adatmegjelenítés",
    Charts: "Diagramok",
    // Hungarian UI writing has no settled loanword for "overlay"; "felugró elemek"
    // (pop-up elements) is what a Hungarian designer calls this group.
    Overlays: "Felugró elemek",
    "App chrome": "Alkalmazáskeret",
    API: "API",
    // "Csomag" (package), as this file names the kit elsewhere: server-kit IS a Python
    // package, and Hungarian has no settled loanword for "kit".
    "Server kit": "Szervercsomag",
  },

  groupShort: {
    "Getting started": "Kezdés",
    Foundations: "Alapok",
    "Pickers & entry": "Picker",
    "Data display": "Adatok",
    "App chrome": "Keret",
    Inputs: "Bevitel",
    Charts: "Ábrák",
    Overlays: "Felugró",
    "Server kit": "Szerver",
  },

  pages: {
    media: {
      title: "Képek és média",
      short: "Média",
      blurb:
        "A feltöltöttek megjelenítése: bélyegképrács műveletekkel és képaláírásokkal, a teljes képernyős nézegető billentyűkkel, húzással és nagyítással, valamint bejelentkezést igénylő képek.",
    },
    "pie-chart": {
      title: "Kördiagram",
      short: "Kör",
      blurb:
        "Egy egész részei gyűrűként vagy tortaként: jelmagyarázat-módok, kattintható és billentyűzettel elérhető szeletek, elrejtett összegek, az üres diagram, jobbról balra — és a jelmagyarázat önmagában.",
    },
    links: {
      title: "Hivatkozások",
      short: "Linkek",
      blurb:
        "A kit minden hivatkozása az alkalmazás saját routerén át, egyszer beállítva a providerben: a szöveges hivatkozás és tónusai, egy hivatkozásként működő gomb vagy műveleti kártya, és az alkalmazásból kivezető hivatkozások.",
    },
    "landing-demo": {
      title: "Kezdőlap és demó",
      short: "Kezdőlap",
      blurb:
        "A nyilvános kezdőlap és a kipróbálható demó: a fejléc három állapota, a kezdőlap szakaszai, a SEO-ellenőrzések, a visszatérés a legutóbb megnyitott oldalra, valamint a demó indítása, visszaszámlálása és vége.",
    },
    "user-admin": {
      title: "Felhasználókezelés",
      short: "Felhasználók",
      blurb:
        "A fiókok adminisztrátori oldala: a felhasználólista szerepkörökkel és állapotokkal, a négy adminisztrátori művelet a szerver által kért megerősítéssel, az auditnapló, a meghívók és a munka továbbadása.",
    },
    subscription: {
      title: "Előfizetés",
      short: "Számlázás",
      blurb:
        "Fizetés egy alkalmazásért: a csomagválasztó két pénznemben és két időszakkal, az előfizetés állapota, a bannerek a próbaidőtől a lejáratig, a csomagkorlát-értesítés, a csak olvasható zár a demóé mellett, a szolgáltató portálja és az impresszum kereskedelmi nyilatkozata.",
    },
    "auth-account": {
      title: "Bejelentkezés és fiókbiztonság",
      short: "Belépés",
      blurb:
        "Az alkalmazás előtti oldalak — egy keskeny bejelentkezés és egy széles jogi oldal — és a fiók biztonsága: QR-kóddal beállított kétlépcsős azonosítás, valamint hozzáadott, átnevezett és törölt passkey-k.",
    },
    formatting: {
      title: "Formázás és előjeles értékek",
      short: "Formázás",
      blurb:
        "Számok, pénzösszegek, százalékok, dátumok és relatív idők az olvasó nyelvén — bemenet → kimenet formában több nyelven — és az előjeles összeg és változás, amely magát színezi.",
    },
    "url-state": {
      title: "Állapot az URL-ben",
      short: "URL-állapot",
      blurb:
        "Egy érték, egy fül és egy nyitott párbeszédablak a címben tartva, hogy újratöltéskor megmaradjanak, és a Vissza visszavonja őket: a keresési paraméter hookok és a hivatkozásból nyíló párbeszédablak.",
    },
    overview: {
      title: "Áttekintés",
      short: "Áttekintés",
      blurb:
        "Mi az @eifi1/ui-kit, milyen nyolc rétegre épül, és hogyan érdemes olvasni ennek a bemutatónak egy oldalát.",
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
    "text-size": {
      title: "Szövegméret és kontraszt",
      short: "Szövegméret",
      blurb:
        "Normál, Nagy és Nagyon nagy egyetlen gyökérszintű skálán, a vele együtt mozduló töréspontokkal, a fokozott kontraszt lépcsőjével, a fiókszabállyal, amely mindkettőt átviszi egyik eszközről a másikra — és amit a komponensek Nagy méretnél tesznek.",
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
    "kit-review": {
      title: "A csomag ellenőrzése (élő)",
      short: "Ellenőrzés",
      blurb:
        "A csomag szövegei a keksdose minden nyelvén, a keksdose ellenőrzési adatbázisa alapján: ugyanazok a kit. sorok és ítéletek, mint a Fordítások oldalán, ahonnan ellenőrzési tokennel nyitható meg.",
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
    "month-view": {
      title: "Naptár havi nézet",
      short: "Havi nézet",
      blurb:
        "A naptár mint oldal: vonalazott hónap, minden nap eseményeivel a saját cellájában, az oldal saját fejléce, amely vezérli, és egy panel a kiválasztott naphoz.",
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
        "Választás listából gépelés helyett, és a bevitel összetettebb formái: mérési táblázat, a mező elhagyásakor mentett érték, aláírás, jelszó, lépésenkénti űrlap.",
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
        "Értékek megjelenítése bevitel helyett: az alapelemek, a visszajelzés és a folyamatjelzés, a listák, a fák és a táblázat.",
    },
    buttons: {
      title: "Gombok és felületek",
      short: "Gombok",
      blurb:
        "Gombok, gombcsoportok, ikongombok, kártyák, töltésjelzők és avatarok — a darabok, amelyekből minden más épül.",
    },
    "chips-toggles": {
      title: "Címkék és kapcsolók",
      short: "Címkék",
      blurb:
        "A címkék (chipek) és a címkemező, a kapcsolócsoport és a fülek — a kis vezérlők, amelyekkel néhány közül egy választható, vagy amelyek egy rövid listát tartanak.",
    },
    feedback: {
      title: "Visszajelzés és folyamat",
      short: "Folyamat",
      blurb:
        "Hol tart egy feladat, hogy úton van a tartalom, hogy itt nincs semmi, és hogy valamit el kell olvasni: folyamatjelzők és mérősávok, vázak, üres állapotok és értesítősávok.",
    },
    "description-list": {
      title: "Leíró lista és táblázat",
      short: "Listák, táblák",
      blurb:
        "Tények bármiféle gépezet nélkül elrendezve: fogalmak és részleteik listája, egy egyszerű statikus táblázat, valamint az elválasztó és a görgethető terület, amelyek a kettő között állnak.",
    },
    "lists-menus": {
      title: "Listák és menük",
      short: "Listák, menük",
      blurb:
        "A sor, amelyet minden alkalmazás kézzel rajzol meg — gomb, hivatkozás vagy rekord, mellette a műveleteivel —, egy menü sora, és a sáv, amely sorok kijelölésekor jelenik meg.",
    },
    "tree-view": {
      title: "Fanézet",
      short: "Fa",
      blurb:
        "Billentyűzettel bejárható hierarchia — egyetlen tabulátorállomás, nyilak a kinyitáshoz és becsukáshoz, gépelés közbeni ugrás — igény szerint betöltött gyermekekkel, kívülről vezérelve, jobbról balra, és a sora önmagában.",
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
    charts: {
      title: "Diagramok",
      blurb:
        "Értékek képekként: a témázott keret a Recharts fölött, a csempés diagram, a nagyítható adatsor-diagram oszlopaival és területeivel, valamint a KPI-csempe.",
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
    "series-chart-marks": {
      title: "Adatsor-diagram: oszlopok, területek és idő",
      short: "Oszlopok",
      blurb:
        "Ugyanaz a diagram oszlopokkal, területekkel és halmozással, kategóriák és valós idő felett, referenciavonalakkal, jelölőkkel, pontokkal és kattintásokkal — és egy jelmagyarázattal, amelynek színei nem változnak.",
    },
    stats: {
      title: "Mutatók és sparkline-ok",
      short: "Mutatók",
      blurb:
        "A KPI-csempe, amelyet minden irányítópult megismétel — érték, változás, trend —, és az apró vonal, amely elfér egy táblázatcellában.",
    },
    "calendar-heatmap": {
      title: "Naptár-hőtérkép",
      short: "Hőtérkép",
      blurb:
        "Napok árnyalt négyzetekként: egy év hetekben vagy egy hónap, kiválasztható nap, a skála fokozatai, felső határa és színe, a legutóbbi napokra vágott hosszú időszak, és jobbról balra.",
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
    "confirm-floating": {
      title: "Megerősítő párbeszéd és lebegő panel",
      short: "Megerősítés",
      blurb:
        "A window.confirm helyére lépő promise — tónusokkal, saját szavakkal és várakozási sorral — és a nem modális panel, amely egy lebegő gomb mögött dokkol a sarokban.",
    },
    "floating-actions": {
      title: "Lebegő műveletek",
      short: "Lebegő",
      blurb:
        "A sarokban lévő vezérlők: egy kiterjesztett gomb, amely állapotot jelez és változáskor felolvasásra kerül, a kit tooltipje egy lebegő gombon, valamint sarokkapcsolók, linkek és számlálók sávja.",
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
        "A keret, amelyben egy alkalmazás él, és a folyamatok, amelyeket minden alkalmazás megismétel: beállítások, fiókok, előfizetések, visszajelzés.",
    },
    "page-structure": {
      title: "Oldalfejléc és morzsanavigáció",
      short: "Oldalfejléc",
      blurb:
        "Egy oldal azon részei, amelyek nem a tartalma: a fejléc az útvonallal és a műveletekkel, a morzsanavigáció önmagában, valamint a szakaszcímke, a magyarázó szöveg és az állapotjelző pont.",
    },
    shell: {
      title: "Váz",
      short: "Váz",
      blurb: "Az alkalmazáskeret, amelyet éppen lát, darabjaira szedve.",
    },
    settings: {
      title: "Beállítások",
      short: "Beállítások",
      blurb:
        "A beállítások oldal és az adminisztrációs oldal ugyanazon a vázon: asztali gépen oldalsáv, telefonon lefúró lista, útvonalanként egy csoport, keresés, és a kártya, amelyet egy hivatkozás kiemel. A fiókbeállítások sorai: téma, nyelv, profil, jelszó és kétfaktoros hitelesítés.",
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
    "clipboard-timing": {
      title: "Vágólap és időzítés",
      short: "Vágólap",
      blurb:
        "Másolás, amely megmondja, sikerült-e, és várakozás, amíg a gépelés abbamarad: a másológomb és a hookja, valamint a késleltetett érték és visszahívás.",
    },
    helpers: {
      title: "Segédfüggvények és konstansok",
      short: "Segédfüggvények",
      blurb:
        "A beviteli mezők mögötti függvények és adatok, bemenet → eredmény formában: dátumszámítás a @eifi1/ui-kit/dates alútvonalról, a számológép kiértékelője, a pénznemtáblázat és az osztálykonstansok, amelyekből egyéni mező állítható össze.",
    },
    // The Server kit group (0.31): server-kit's modules, from its release's api.json.
    "server-kit": {
      title: "Szervercsomag",
      blurb:
        "Az alkalmazások backendjei mögötti Python-csomag: a szerződések, amelyeket ezek a komponensek követnek, kódként — minden modul szignatúrái és docstringjei, egyetlen server-kit kiadáshoz rögzítve.",
    },
    "server-auth": {
      title: "Bejelentkezés és fiók",
      short: "Belépés",
      blurb:
        "Regisztráció, bejelentkezés, egyszer használatos tokenek, munkamenet-claimek és a fiók átviteli formátumai — a bejelentkezési, regisztrációs és fiókoldalak szerveroldali fele.",
    },
    "server-user-admin": {
      title: "Felhasználókezelés",
      short: "Felhasználók",
      blurb:
        "A felhasználólista lekérdezése, a négy adminisztrátori művelet és megerősítési szintjeik, az auditbejegyzés, a kétlépcsős törlés és az adatexport.",
    },
    "server-settings": {
      title: "Beállítások és nyelv",
      short: "Beállítások",
      blurb:
        "Egyetlen szabály minden beállításokat küldő kéréstörzsre — a kihagyott mező megmarad, a null törli, az ismeretlen mezőt elutasítja — és a fiók egyetlen kanonikus nyelve.",
    },
    "server-demo": {
      title: "Demó",
      short: "Demó",
      blurb:
        "Az eldobható demófiók: a beállításai, az indítás előtti ellenőrzések sorrendje, az elutasítások és kódjaik, a csak olvasható mód szabálya és az egyetlen élettartama.",
    },
    "server-billing": {
      title: "Számlázás",
      short: "Számlázás",
      blurb:
        "A csomagok és korlátaik, az előfizetés helyzete a próbaidő és a béta dátumaival, a csak olvasható zár lejáratkor, valamint a Paddle és a Lemon Squeezy webhookjai: ellenőrzött aláírások, egységesített események, egyetlen dispatch.",
    },
    "server-mail": {
      title: "E-mail",
      short: "E-mail",
      blurb:
        "A fiók e-mailjei: a szövegek nyelvenként, egyetlen elrendezés, amely minden értéket escape-el, két küldési mód, amely soha nem dob kivételt — és a kiadás minta-e-mailjei, renderelve.",
    },
    "server-feedback": {
      title: "Visszajelzés és feltöltés",
      short: "Visszajelzés",
      blurb:
        "A visszajelzési szerződés tiszta függvényekként — sémák, állapotok, a PATCH-szabályok, átdolgozás, összeomlások rögzítése, törlés — és a mellékletek, amelyeket a bájtjaik alapján ítél meg.",
    },
    "server-limits": {
      title: "Korlátok, hibák és CORS",
      short: "Korlátok",
      blurb:
        "A csúszóablakos sebességkorlátozó és az, hogy kinek a címét számolja, a csomag minden elutasítása a szerződés szerinti státusszal megválaszolva, és CORS néhány további originre.",
    },
    "server-translation-review": {
      title: "Fordítások ellenőrzése",
      short: "Ellenőrzés",
      blurb:
        "A fordításellenőrzés átviteli formátumai, hogy ki mely kulcsokat és nyelveket ellenőrizheti, és az ellenőrzési tokenek, amelyekkel egy ellenőr megnyitja a csomag ellenőrző oldalát.",
    },
  },


  // The top-bar search's "What do you need?" rows, phrased as typed into a search box.
  // Formal register throughout, but these are noun phrases, so no "Ön" appears.
  needs: {
    media: [
      "feltöltött képek megjelenítése",
      "kép megnyitása teljes képernyőn",
      "képgaléria feliratokkal",
      "bejelentkezést igénylő kép betöltése",
      "PDF-melléklet előnézete",
    ],
    "pie-chart": [
      "egy összeg részeinek mutatása",
      "gyűrűdiagram",
      "kattintás egy szeletre",
      "jelmagyarázat diagram nélkül",
      "összegek elrejtése a diagramon",
    ],
    links: [
      "hivatkozás az alkalmazás egy másik oldalára",
      "saját router használata a kit hivatkozásaihoz",
      "új lapon nyíló hivatkozás",
      "navigáló gomb",
      "az aktuális oldal hivatkozásának kiemelése",
    ],
    "landing-demo": [
      "nyilvános kezdőlap készítése",
      "„Hozzáférés kérése” gomb hozzáadása",
      "oldalcím és leírás ellenőrzése keresőmotorokhoz",
      "az alkalmazás megnyitása ott, ahol a felhasználó abbahagyta",
      "demó munkamenet indítása",
      "a demó hátralévő idejének visszaszámlálása",
      "annak jelzése, hogy a demó véget ért",
    ],
    "user-admin": [
      "felhasználók listázása a szerepkörükkel",
      "fiók inaktiválása",
      "felhasználó szerepkörének módosítása",
      "valaki meghívása e-mailben",
      "annak megmutatása, ki mit tett egy fiókkal",
      "valaki munkájának átadása egy másik felhasználónak",
      "fordítási lektor nyelveinek beállítása",
    ],
    subscription: [
      "csomag választása",
      "árak CHF-ben és EUR-ban",
      "havi vagy éves számlázás",
      "az előfizetés állapotának megjelenítése",
      "banner a próbaidő végéről",
      "sikertelen fizetés bannere",
      "elérte a csomag korlátját",
      "csak olvasható mód az előfizetés lejárta után",
      "a számlázási portál megnyitása",
      "az előfizetés lemondása",
    ],
    "auth-account": [
      "bejelentkező oldal elrendezése",
      "kétlépcsős azonosítás beállítása QR-kóddal",
      "passkey-k kezelése",
      "felhasználási feltételek és adatvédelmi oldal",
      "a kétlépcsős titok megjelenítése másolás gombbal",
    ],
    formatting: [
      "pénzösszeg formázása a felhasználó nyelvén",
      "dátum „3 napja” formában",
      "százalék formázása",
      "pozitív vagy negatív összeg színesen",
      "változás mutatása az előző hónaphoz képest",
    ],
    "url-state": [
      "szűrő megtartása az URL-ben",
      "nyitott fül megjegyzése újratöltéskor",
      "párbeszédablak megnyitása hivatkozásból",
      "párbeszédablak bezárása a Vissza gombbal",
      "hivatkozás megosztása az aktuális nézetre",
    ],
    overview: [
      "első lépések a csomaggal",
      "a csomag felépítése",
      "a bemutató oldalak olvasása",
      "összehasonlítás a MUI-jal",
      "telepítés és beállítás",
    ],
    foundations: [
      "design tokenek áttekintése",
      "színek és témák",
      "a teljes csomag fordítása",
      "márkaszín paletta",
      "sötét mód",
      "nagyobb szöveg és több kontraszt",
    ],
    tokens: [
      "összes szín token",
      "váltás világos és sötét téma között",
      "színpaletta módosítása",
      "téma megőrzése újratöltés után",
      "térköz, lekerekítés és árnyék értékek",
      "szövegszínek és felületek",
      "beégetett értékek ellenőrzése",
    ],
    "text-size": [
      "a szöveg nagyítása",
      "nagy szöveg beállítása",
      "több kontraszt gyengénlátóknak",
      "magas kontrasztú mód",
      "a szöveggel együtt növő töréspontok",
      "telefonos elrendezés vizsgálata kódban",
      "a szövegméret kövesse a fiókot",
      "ikongomb címkéje szövegként",
      "sorműveletek menübe csukása",
    ],
    palette: [
      "paletta generálása márkaszínből",
      "színkontraszt ellenőrzése",
      "színek diagramokhoz",
      "akadálymentes színskála",
      "sötét mód színeinek származtatása",
      "egyedi téma egyetlen színből",
    ],
    localisation: [
      "felület fordítása",
      "nyelv váltása",
      "német fordítás",
      "svájci német helyesírás",
      "lefordítatlan feliratok keresése",
      "területi beállítás dátumokhoz és számokhoz",
      "feliratok átadása minden komponensnek",
    ],
    "kit-review": [
      "a csomag fordításainak ellenőrzése",
      "fordítás jóváhagyása",
      "alvó szerver felébresztése",
      "ellenőrzés megnyitása a keksdose-ból",
      "javítások exportálása",
    ],
    inputs: [
      "összes beviteli komponens",
      "űrlap készítése",
      "szöveg, szám vagy dátum bevitele",
      "űrlapmezők elrendezése",
      "érték kiválasztása",
    ],
    fields: [
      "szövegbevitel",
      "szövegmező lebegő címkével",
      "többsoros szöveg",
      "keresőmező",
      "segítő szöveg a mező alatt",
      "validációs hiba megjelenítése",
      "legördülő lista",
      "mező törlése",
      "egyedi mező készítése",
      "címke a mező fölött",
    ],
    forms: [
      "űrlap validálása",
      "react-hook-form használata",
      "hibaüzenetek a mezők alatt",
      "kötelező mezők",
      "űrlap beküldése",
      "címke összekötése a mezővel",
      "űrlap validációs sémával",
      "egy varázslólépés ellenőrzése",
    ],
    choices: [
      "beállítás be- és kikapcsolása",
      "jelölőnégyzet",
      "választás néhány lehetőség közül",
      "érték kiválasztása csúszkával",
      "szín kiválasztása",
      "ikon kiválasztása",
      "választás kártyák közül",
      "tartomány kiválasztása csúszkával",
      "műveletet indító kártya",
    ],
    numbers: [
      "pénzösszeg megadása",
      "szám megadása",
      "pénznem kiválasztása",
      "számológép a mezőben",
      "szám léptető gombokkal",
      "numerikus billentyűzet telefonon",
      "negatív összegek pirossal",
      "számformázás területi beállítás szerint",
    ],
    calendars: [
      "dátum kiválasztása",
      "dátumtartomány kiválasztása",
      "naptár",
      "előre beállított időszakok, pl. előző hónap",
      "választható dátumok korlátozása",
      "a hét első napja",
      "kezdő és záró dátum",
      "ugrás a mai napra",
    ],
    "month-view": [
      "havi naptár oldal",
      "események megjelenítése a naptárban",
      "tervező havi rács",
      "saját tartalom egy naptárnapban",
      "naptár saját fejléccel",
      "pöttyök a naptárnapokon",
    ],
    "month-time": [
      "hónap kiválasztása",
      "előző vagy következő hónap",
      "időpont megadása",
      "óra és perc kiválasztása",
      "havi elszámolási időszak",
      "időpont korlátozása egy sávra",
    ],
    files: [
      "fájl feltöltése",
      "fájlok behúzása",
      "fénykép készítése kamerával",
      "több fájl kiválasztása",
      "csak képek vagy PDF engedélyezése",
      "túl nagy fájlok elutasítása",
      "az elutasítás okának megjelenítése",
    ],
    pickers: [
      "választás listából",
      "rekord kiválasztása",
      "értéktáblázat bevitele",
      "mező mentése kilépéskor",
      "aláírás rögzítése",
      "jelszóerősség ellenőrzése",
      "többlépéses űrlap",
    ],
    comboboxes: [
      "hosszú lista szűrése gépeléssel",
      "javaslatok gépelés közben",
      "automatikus kiegészítés szerverről",
      "szabad szöveg javaslatokkal",
      "keresés gépelés közben",
      "új lehetőség létrehozása",
      "combobox",
    ],
    "entity-pickers": [
      "rekord kiválasztása azonosító alapján",
      "ügyfél vagy kapcsolattartó kiválasztása",
      "több rekord kiválasztása",
      "lehetőségek betöltése API-ból",
      "beágyazott választó táblázatban",
      "érvénytelen vagy hibás állapot",
      "kapcsolódó elem kiválasztása",
    ],
    "dropdown-parts": [
      "több lehetőség kiválasztása",
      "többszörös választás jelölőnégyzetekkel",
      "csoportosított lehetőségek",
      "összes kijelölése",
      "választó alsó panelként telefonon",
      "saját legördülő lista készítése",
      "legördülő lista szűrése gépeléssel",
    ],
    "measured-grid": [
      "mérési táblázat bevitele",
      "beillesztés táblázatkezelőből",
      "billentyűzettel kezelhető rács, mint az Excel",
      "több ezer sor",
      "virtualizált lista",
      "beillesztett szöveg sorokra bontása",
      "cellák szerkesztése nyilakkal",
    ],
    "field-sync": [
      "mező mentése elhagyáskor",
      "mentés folyamatban vagy mentve állapot",
      "sikertelen mentés jelzése",
      "automatikus mentés",
      "nem mentett változások jelzése",
      "adatbázishoz kötött mező",
    ],
    "signature-password": [
      "dokumentum aláírása",
      "aláírás rögzítése",
      "mentett aláírás megjelenítése",
      "jelszóerősség ellenőrzése",
      "megerősítés jelszóval",
      "megerősítés törlés előtt",
      "törlés megerősítése a név beírásával",
      "veszélyes művelet megerősítése",
    ],
    "data-display": [
      "adatok megjelenítése",
      "értékek megjelenítése",
      "táblázatok és listák",
      "folyamat és visszajelzés",
      "gombok és kártyák",
    ],
    buttons: [
      "gomb",
      "elsődleges és másodlagos gomb",
      "ikongomb",
      "gombcsoport",
      "kártya tároló",
      "töltésjelző",
      "felhasználói avatar monogrammal",
      "letiltott gomb",
      "állapotpötty az avataron",
    ],
    "chips-toggles": [
      "választás néhány lehetőség közül",
      "szegmentált vezérlő",
      "fülek",
      "címkék",
      "több címke megadása",
      "szűrő címkék",
      "váltás nézetek között",
      "címke eltávolítása",
    ],
    feedback: [
      "folyamat jelzése",
      "folyamatjelző sáv",
      "töltés közbeni helykitöltő",
      "skeleton töltés közben",
      "üres eredmény",
      "nincs találat üzenet",
      "értesítés a felhasználónak",
      "figyelmeztető vagy hiba sáv",
      "sikerüzenet",
      "százalékos mérő",
      "rövid megerősítés megjelenítése",
      "visszavonás törlés után",
      "toast",
    ],
    "description-list": [
      "kulcs–érték párok",
      "rekord részletei",
      "egyszerű statikus táblázat",
      "táblázat összesítő sorral",
      "elválasztó vonal",
      "görgethető terület",
      "számok jobbra igazítása táblázatban",
    ],
    "lists-menus": [
      "elemek listája",
      "kattintható listasor",
      "sor műveletekkel",
      "olvasatlan jelölés",
      "beérkező üzenetek listája",
      "pipával jelölt menüpont",
      "veszélyes menüpont",
      "több sor kijelölése",
      "tömeges műveletek a kijelölt sorokon",
      "kijelölési eszköztár",
    ],
    "tree-view": [
      "hierarchikus adatok",
      "mappafa",
      "csomópontok kinyitása és becsukása",
      "gyermekelemek betöltése igény szerint",
      "fa bejárása billentyűzettel",
      "egymásba ágyazott kategóriák",
      "szervezeti ábra listaként",
    ],
    "data-table": [
      "rendezhető táblázat",
      "táblázat rendezése",
      "táblázat sorainak szűrése",
      "sorok kijelölése",
      "sor kinyitása a részletekhez",
      "táblázat lapozással",
      "oszlopok elrejtése vagy átrendezése",
      "adatrács",
      "keresés táblázatban",
    ],
    "data-table-server": [
      "szerveroldali lapozás",
      "táblázatszűrők az URL-ben",
      "táblázat kártyákként telefonon",
      "húzással elérhető műveletek a sorokon",
      "sorok csoportosítása",
      "oldalak betöltése API-ból",
      "szűrt táblázat linkjének megosztása",
    ],
    "data-table-parts": [
      "lapozó vezérlők",
      "szűrő felugró ablak",
      "rendezési segédfüggvények",
      "sorok illesztése szűrőre",
      "táblázatfeliratok fordítása",
      "oldalméret választó",
    ],
    layout: [
      "szakasz becsukása",
      "harmonika",
      "több vagy kevesebb megjelenítése",
      "párbeszédablak fejléccel és műveletekkel",
      "kinyitható panel",
      "magasság animálása",
    ],
    charts: [
      "diagram rajzolása",
      "adatok vizualizálása",
      "diagramszínek",
      "irányítópult KPI-okkal",
      "vonal- vagy oszlopdiagram",
    ],
    "chart-shell": [
      "témához illő diagram",
      "diagram tooltip",
      "diagram jelmagyarázat",
      "színek adatsorokhoz",
      "Recharts használata a témával",
      "kör- vagy oszlopdiagram",
      "reszponzív diagram",
    ],
    "tile-chart": [
      "treemap",
      "részarányok az egészből",
      "lefúrás a diagramban",
      "kattintható csempék",
      "kiadások kategóriánként",
      "feliratok elhelyezése csempékben",
    ],
    "series-chart": [
      "diagram időbeli alakulásról",
      "nagyítás a diagramon",
      "vonaldiagram két tengellyel",
      "adatsorok ki-bekapcsolása a jelmagyarázatban",
      "több diagram közös nagyítással",
      "idősor",
      "mérések időben",
    ],
    "series-chart-marks": [
      "oszlopdiagram",
      "halmozott területdiagram",
      "referenciavonal vagy küszöb",
      "jelölők a diagramon",
      "kattintás a diagram egy pontjára",
      "diagram dátumokon",
      "állandó jelmagyarázat színek",
    ],
    stats: [
      "KPI csempe",
      "szám a változásával",
      "emelkedő vagy csökkenő trend",
      "sparkline táblázatcellában",
      "irányítópult számai",
      "apró vonaldiagram",
    ],
    "calendar-heatmap": [
      "hozzájárulási grafikon",
      "napi aktivitás",
      "kiadási naptár",
      "napok hőtérképe",
      "napok színezése érték szerint",
      "az év egy pillantásra",
    ],
    overlays: [
      "tartalom az oldal felett",
      "párbeszédablak megnyitása",
      "felugró ablak vagy menü",
      "tooltip",
      "parancspaletta",
    ],
    dialogs: [
      "modális párbeszédablak",
      "teljes képernyős párbeszédablak",
      "bezárás a háttérre kattintva",
      "bezárás animálása",
      "felugró ablak",
      "párbeszédablak telefonon",
    ],
    "confirm-floating": [
      "megerősítés törlés előtt",
      "megerősítő párbeszédablak",
      "window.confirm lecserélése",
      "biztos benne kérdés",
      "lebegő műveletgomb",
      "sarokba rögzített panel",
      "csevegő vagy súgó panel",
    ],
    "floating-actions": [
      "lebegő állapotjelző",
      "állapotváltozás felolvasása",
      "offline jelző",
      "tooltip lebegő gombon",
      "kapcsológombok a sarokban",
      "jelvény számlálóval",
      "lebegő eszköztár",
    ],
    popovers: [
      "tooltip rámutatáskor",
      "gombhoz rögzített felugró panel",
      "menü rámutatáskor",
      "legördülő menü",
      "felugró ablak elhelyezése egy elem mellett",
      "ikon magyarázata",
    ],
    tour: [
      "vezetett bemutató",
      "bevezető útmutató",
      "elem kiemelése",
      "lépésről lépésre bemutatás",
      "várakozás a felhasználó kattintására",
      "termékbemutató új felhasználóknak",
    ],
    "command-palette": [
      "parancspaletta",
      "globális keresés",
      "billentyűparancs a kereséshez",
      "ugrás egy oldalra",
      "elgépelést tűrő keresés",
      "gyorsműveletek menü",
      "keresési találatok szerverről",
    ],
    "swipeable-row": [
      "törlés sor elhúzásával",
      "műveletek előhúzása",
      "húzás telefonon",
      "archiválás húzással",
      "listasor műveletei",
    ],
    "app-chrome": [
      "alkalmazás elrendezése",
      "oldalsáv és felső sáv",
      "beállítások oldal",
      "előfizetési csomag választása",
      "felhasználói visszajelzés gyűjtése",
    ],
    "page-structure": [
      "oldalcím műveletekkel",
      "oldalfejléc",
      "morzsanavigáció",
      "morzsanavigáció telefonon",
      "kis nagybetűs szakaszcímke",
      "magyarázó szöveg egy mező alatt",
      "állapotjelző pont",
      "online jelző",
      "olvasatlan pont az avataron",
      "jelmagyarázat színe",
      "linkek tördelődő pirulákként",
    ],
    shell: [
      "alkalmazás elrendezése oldalsávval",
      "felső sáv",
      "navigációs menü",
      "alsó navigáció telefonon",
      "tartalomjegyzék",
      "témaváltó",
      "nyelvválasztó menü",
      "oldalsáv becsukása",
      "fiókmenü avatárral",
    ],
    settings: [
      "fiókbeállítások",
      "jelszó módosítása",
      "kétlépcsős azonosítás",
      "profil szerkesztése",
      "téma kiválasztása",
      "nyelv kiválasztása",
      "felhasználói beállítások",
      "beállítások oldal oldalsávval",
      "beállítások listaként telefonon",
      "közvetlen hivatkozás egy beállításra",
      "keresés a beállításokban",
      "adminisztrációs oldal ugyanabban az elrendezésben",
      "a fiók nyelvének követése",
    ],
    wizard: [
      "többlépéses űrlap",
      "lépésjelző",
      "varázsló ellenőrző lépéssel",
      "oda-vissza lépkedés a lépések között",
      "bevezető folyamat",
      "összegzés beküldés előtt",
    ],
    "feedback-compose": [
      "felhasználói visszajelzés gyűjtése",
      "hiba bejelentése",
      "képernyőkép csatolása",
      "visszajelző űrlap",
      "javaslat küldése",
    ],
    "feedback-inbox": [
      "visszajelzések kezelése",
      "visszajelzések státusz munkafolyamata",
      "hibajelentések osztályozása",
      "ügyfélszolgálati beérkező mappa",
      "bejelentés státuszának módosítása",
    ],
    api: [
      "hookok és segédfüggvények",
      "függvények felület nélkül",
      "segédfüggvények",
      "konstansok",
      "dátumkezelő segédfüggvények",
    ],
    "hooks-lib": [
      "reagálás a képernyőméretre",
      "media query hook",
      "felugró elem bezárása a vissza gombbal",
      "panel elhelyezése az indító elem mellett",
      "osztálynevek összefésülése",
      "telefon felismerése",
    ],
    "clipboard-timing": [
      "másolás vágólapra",
      "másolás gomb visszajelzéssel",
      "gépelés debounce",
      "várakozás, amíg a gépelés abbamarad",
      "keresési kérés késleltetése",
      "visszahívás throttle",
    ],
    helpers: [
      "dátumszámítás",
      "mai dátum ISO formátumban",
      "előre beállított időszakok",
      "matematikai kifejezés kiértékelése",
      "pénznemek listája",
      "utolsó teljes hónapok",
      "mező osztálynevek",
    ],
    // The Server kit group (0.31).
    "server-kit": [
      "a backend csomag dokumentációja",
      "a server-kit telepítése",
      "melyik server-kit kiadás van dokumentálva",
      "Python-szerződések a backendhez",
      "egy komponens szerveroldalának megkeresése",
    ],
    "server-auth": [
      "bejelentkezés ellenőrzése a szerveren",
      "regisztráció csak meghívóval",
      "jelszó-visszaállító token létrehozása",
      "munkamenet-token claimjei",
      "e-mail-cím normalizálása",
      "hitelesítési hibakódok",
    ],
    "server-user-admin": [
      "felhasználólista lekérdezése a szerveren",
      "adminisztrátori művelet megerősítési szintje",
      "adminisztrátori auditbejegyzés írása",
      "fiók törlése két lépésben",
      "felhasználó adatainak exportálása",
      "az utolsó adminisztrátor megtartása",
    ],
    "server-settings": [
      "beállítások módosítása mezők elvesztése nélkül",
      "beállítás törlése null értékkel",
      "ismeretlen mezők elutasítása a kéréstörzsben",
      "a fiók nyelvének tárolása",
      "az Accept-Language fejléc olvasása",
    ],
    "server-demo": [
      "demó munkamenet indítása",
      "a demófiók beállításai",
      "a demó csak olvashatóvá tétele",
      "a demó elutasítási kódjai",
      "régi demófelhasználók törlése",
    ],
    "server-billing": [
      "csomagkorlát ellenőrzése a szerveren",
      "webhook aláírásának ellenőrzése",
      "Paddle és Lemon Squeezy események kezelése",
      "rendben van-e az előfizetés",
      "a próbaidő és a béta záró dátuma",
      "írások elutasítása lejárt előfizetésnél",
      "csomagkatalógus árakkal",
    ],
    "server-mail": [
      "jelszó-visszaállító e-mail küldése",
      "a fiók e-mailjeinek előnézete",
      "e-mail-szövegek nyelvenként",
      "e-mail küldése Resenden keresztül",
      "e-mailek naplózása fejlesztés közben",
      "ügyfélszolgálati válaszcím",
    ],
    "server-feedback": [
      "visszajelzés validálása",
      "visszajelzések állapotszabályai",
      "összeomlás-jelentés rögzítése",
      "feltöltött fájl típusának ellenőrzése",
      "mellékletek méretének korlátozása",
      "törölt felhasználó visszajelzéseinek törlése",
    ],
    "server-limits": [
      "útvonal sebességkorlátozása",
      "kliens IP-címe proxy mögött",
      "Retry-After fejléc küldése",
      "a csomag hibáinak leképezése HTTP-státuszokra",
      "további CORS-origin engedélyezése",
      "hibaválasz kóddal",
    ],
    "server-translation-review": [
      "fordítások ellenőrzése API-n keresztül",
      "ellenőrzési token kiadása",
      "ki melyik nyelvet ellenőrizheti",
      "fordítási ítéletek",
      "a csomag fordítási kulcsai",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_HU,
};
