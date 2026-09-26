import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's words in Hungarian: every namespace of {@link UiKitLabels}, for
 * `<UiKitProvider labels={UI_KIT_LABELS_HU}>`.
 *
 * Self-contained on purpose — nothing but the kit's own `formatFileSize` — so it works
 * as a starting point to copy and adjust. Counts and sizes are formatted with
 * `hu-HU` digits; {@link uiKitLabelsHu} takes another number locale
 * (e.g. `"de-CH"` for 1’234) without touching the words.
 */
export function uiKitLabelsHu(numberLocale = "hu-HU"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);

  return {
    feedbackAttachment: {
      attachmentAdd: "Kép csatolása",
      attachmentCapture: "Képernyőkép készítése",
      attachmentPaste: "…vagy illesszen be egy képernyőképet a vágólapról.",
      attachmentRemove: "Melléklet eltávolítása",
    },
    measuredGrid: {
      view: "Táblázatnézet",
      cellsView: "Cellák",
      textView: "Szöveg",
      addRow: "Sor hozzáadása",
      removeRow: (row) => `Sor törlése: ${row}.`,
      clear: "Táblázat ürítése",
      pasteHint: "Illesszen be egy táblázatkezelőből másolt blokkot bármelyik cellába",
      cell: (column, row) => `${column}, ${row}. sor`,
      rowNumber: "Sor",
      rowActions: "Sorműveletek",
      keyboardHint:
        "A nyílbillentyűk a cellák között mozognak. Gépeléssel felülírja a cellát, F2-vel szerkeszti, Escape-pel visszavonja a szerkesztést. Az Enter lefelé lép, és a végén új sort ad hozzá.",
      lineError: (line) => `A(z) ${line}. sor nem olvasható`,
      points: (count) => `${count} pont`,
      problems: (count) => `${count} cella nem szám`,
    },
    pageContents: { title: "Ezen az oldalon" },
    common: {
      dismiss: "Bezárás",
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
      apply: "Alkalmaz",
      cancel: "Mégse",
      presets: "Gyors tartományok",
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
    bulkActionBar: {
      selected: (count) => `${n(count)} kijelölve`,
      clear: "Kijelölés törlése",
      cleared: "Kijelölés törölve",
    },
    swipeableRow: {
      actions: "Sorműveletek",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 MB").
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      dropzone: "Fájlfeltöltés",
      browse: "Tallózás",
      empty: "Húzzon ide egy fájlt",
      emptyMultiple: "Húzzon ide fájlokat",
      hint: (accept) => (accept ? `Elfogadott: ${accept}` : "Bármilyen fájltípus"),
      busy: "Feltöltés…",
      rejectedPick: (count) =>
        count === 1
          ? "A fájl nem lett hozzáadva"
          : `A(z) ${count} fájl közül egy sem lett hozzáadva`,
      // Each message opens with the quoted name, so no a/az has to agree with it, and
      // keeps numerals and the formatted size bare (convention 3).
      rejectedType: (name) => `„${name}”: nem támogatott fájltípus`,
      rejectedTypeOnly: (accept) => `Csak ${accept} fájl engedélyezett`,
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
      done: "Kész",
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
      clear: "Keresés törlése",
      submit: "Keresés",
      close: "Bezárás",
      placeholder: "Keresés…",
      empty: "Nincs találat",
      loading: "Keresés folyamatban…",
      dialog: "Keresés",
      error: "A keresés nem sikerült. Próbálja újra.",
    },
    globalSearch: {
      trigger: "Keresés",
      placeholder: "Keresés vagy ugrás…",
      shortcut: (keys) => `Keresés (${keys})`,
      suggestions: "Próbálja ki",
      results: "Találatok",
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
      points: "Diagramértékek",
    },
    confirmDialog: {
      confirm: "Megerősítés",
      cancel: "Mégse",
    },
    floatingPanel: {
      close: "Bezárás",
    },
    copyButton: {
      copy: "Másolás",
      copied: "Másolva",
      failed: "A másolás nem sikerült",
      copiedAnnouncement: "Vágólapra másolva",
      failedAnnouncement: "Nem sikerült a vágólapra másolni",
    },
    list: {
      unread: "Olvasatlan",
      opensInNewTab: "új lapon nyílik meg",
    },
    breadcrumbs: {
      label: "Morzsamenü",
      showAll: "Teljes útvonal megjelenítése",
    },
  };
}

export const UI_KIT_LABELS_HU: UiKitLabels = uiKitLabelsHu();
