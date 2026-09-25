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
    "measured-grid": {
      title: "Táblázatbevitel",
      blurb:
        "Mérési táblázat bevitele: billentyűzettel kezelhető cellarács, táblázatkezelőből beillesztett blokk és ugyanaz a táblázat szövegként — több ezer sor, csak a láthatók jelennek meg.",
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

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_HU,
};
