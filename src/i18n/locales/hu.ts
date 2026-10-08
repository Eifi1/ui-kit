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
  // 0.30.0 — a throttled request (HTTP 429), as `englishRateLimited` in
  // src/auth/auth-errors.ts: no wait → "egy kicsit", under a minute → seconds, else
  // minutes rounded up. The numeral stays bare before its unit ("30 mp múlva").
  const wait = (seconds: number) =>
    seconds < 60 ? `${n(Math.ceil(seconds))} mp` : `${n(Math.ceil(seconds / 60))} perc`;
  const rateLimited = (seconds?: number) =>
    !seconds || seconds <= 0
      ? "Túl sok próbálkozás. Várjon egy kicsit, majd próbálja újra."
      : `Túl sok próbálkozás. Próbálja újra ${wait(seconds)} múlva.`;
  // 0.32.0 — when a trial or a grant ends, as `inDays` in src/billing/billing-labels.ts:
  // 0 (or less) is today, 1 tomorrow. The numeral stays bare ("5 nap múlva").
  const inDays = (days: number) => (days <= 0 ? "ma" : days === 1 ? "holnap" : `${n(days)} nap múlva`);

  return {
    feedbackAttachment: {
      attachmentAdd: "Melléklet hozzáadása",
      attachmentCapture: "Képernyőkép készítése",
      attachmentPaste:
        "…vagy illesszen be egy képernyőképet közvetlenül a vágólapról – így elég egy részletet megmutatnia az egész oldal helyett.",
      attachmentRemove: "Melléklet eltávolítása",
      attachmentList: "Mellékletek",
      attachmentScreenshot: "Képernyőkép",
      attachmentRemoveFile: (name) => `${name} eltávolítása`,
      attachmentLimit: (max) =>
        max === 1
          ? `Legfeljebb ${n(max)} melléklet – egy újabbhoz távolítsa el.`
          : `Legfeljebb ${n(max)} melléklet – egy újabbhoz távolítson el egyet.`,
      attachmentUploading: "Feltöltés…",
      // Opens with the quoted name, as `filePicker`'s refusals: no a/az has to agree with it.
      attachmentUploadFailed: (name) => `„${name}”: a feltöltés nem sikerült`,
    },
    feedbackDialog: {
      title: "Visszajelzés küldése",
      category: "Kategória",
      subject: "Tárgy",
      body: "Mi történt?",
      bodyOptional: "Mi történt? (nem kötelező)",
      attachment: "Melléklet",
      submitHint: (apple) => (apple ? "⌘ Enter a küldéshez" : "Ctrl+Enter a küldéshez"),
      cancel: "Mégse",
      save: "Küldés",
    },
    feedbackThread: {
      thread: "Hozzászólások",
      empty: "Még nincs hozzászólás",
      loading: "Hozzászólások betöltése…",
      you: "Ön",
      staff: "Csapat",
      attachments: "Mellékletek",
    },
    feedbackComposer: {
      field: "Hozzászólás írása",
      placeholder: "Hozzászólás írása…",
      send: "Küldés",
      sendHint: (modifier) => `${modifier} + Enter a küldéshez`,
      sendHintEnter: "Enter: küldés, Shift + Enter: új sor",
    },
    // 0.27.0. "Visszajelzés" for feedback, as `feedbackDialog`; "átdolgozás" for rework.
    // A noun after a number stays singular in Hungarian, so the counts need no plural.
    feedbackStatus: {
      OPEN: "Nyitott",
      READY: "Megvalósításra kész",
      IN_PROGRESS: "Folyamatban",
      IN_EVALUATION: "Értékelés alatt",
      NEEDS_LIVE_TEST: "Élesben tesztelendő",
      POSTPONED: "Elhalasztva",
      DONE: "Kész",
      WONT_DO: "Nem valósul meg",
    },
    feedbackCategory: {
      CRASH: "Összeomlás",
      BUG: "Hiba",
      IDEA: "Ötlet",
      QUESTION: "Kérdés",
      OTHER: "Egyéb",
    },
    feedbackToast: {
      submitted: "Köszönjük a visszajelzését!",
      submitFailed: "A visszajelzést nem sikerült elküldeni",
      attachmentUnsupported: "Csak képek, PDF- és szöveges fájlok engedélyezettek",
      attachmentTooLarge: "A fájl nagyobb 10 MB-nál",
      attachmentTooMany: (count) => `Csak ${n(count)} melléklet fér el – a többi kimaradt.`,
      captureFailed: "Nem sikerült képernyőképet készíteni",
      updateFailed: "A módosítást nem sikerült menteni.",
      statusChanged: (status, title) => `„${status}” állapotra állítva: ${title}`,
      statusUndo: "Visszavonás",
      statusRestored: (status, title) => `Vissza „${status}” állapotra: ${title}`,
    },
    feedbackMenu: {
      trigger: "Visszajelzés küldése",
      myFeedback: "Visszajelzéseim",
      viewFeedback: "Visszajelzések megtekintése",
    },
    feedbackContext: {
      user: "Felhasználó",
      attachUrl: "Az aktuális oldal URL-jének csatolása",
    },
    feedbackPage: {
      title: "Visszajelzések",
      myTitle: "Visszajelzéseim",
      columnId: "#",
      columnDate: "Dátum",
      columnCategory: "Kategória",
      columnSubject: "Tárgy",
      columnUser: "Felhasználó",
      columnEmail: "E-mail",
      columnUrl: "URL",
      columnStatus: "Állapot",
      columnResolved: "Lezárva",
      openPage: "Oldal megnyitása",
      empty: "Nincs",
      deletedUser: "<törölt felhasználó>",
      // An id, not a count: printed as it is, like the "#" column.
      userFallback: (id) => `felhasználó #${id}`,
      environment: (environment) => String(environment ?? "").toUpperCase(),
      reworkChip: (count) => (count === 1 ? "Átdolgozás" : `Átdolgozás ×${n(count)}`),
      awaitingFilter: "Csak ami Önre vár",
      phoneActions: "Visszajelzés-műveletek",
    },
    feedbackDetail: {
      subject: "Tárgy",
      body: "Leírás",
      edit: "Szerkesztés",
      editDescription: "Leírás szerkesztése",
      save: "Mentés",
      cancel: "Mégse",
      url: "URL",
      copyUrl: "URL másolása",
      attachment: "Melléklet",
      download: (name) => `${name} letöltése`,
      downloadFailed: "A mellékletet nem sikerült letölteni.",
      outcome: "Eredmény",
      resolvedAt: (date) => `Lezárva: ${date}`,
      outcomeAdd: "Eredmény hozzáadása",
      outcomeUpdate: "Frissítés",
      outcomePlaceholder: "Mi készült el, mi a döntés, vagy miért nem valósul meg.",
      rework: "Átdolgozás",
      openPage: "Oldal megnyitása",
      reworkTitle: "Visszaküldés átdolgozásra",
      reworkSend: "Átdolgozás kérése",
      reworkPlaceholder: "Min kell még finomítani? Új feltételek vagy irányváltás.",
      reworkUploadFailed: "A fájlt nem sikerült feltölteni. Az átdolgozási kérés nem ment el.",
      status: "Állapot",
    },
    accountSettings: {
      profile: {
        title: "Profil",
        email: "E-mail",
        role: "Szerepkör",
        memberSince: "Regisztráció dátuma",
        displayName: "Megjelenített név",
        save: "Mentés",
        firstName: "Keresztnév",
        lastName: "Vezetéknév",
        nameRequired: "Adja meg a keresztnevet és a vezetéknevet is.",
      },
      password: {
        title: "Jelszó módosítása",
        current: "Jelenlegi jelszó",
        next: "Új jelszó",
        confirm: "Új jelszó megerősítése",
        submit: "Jelszó módosítása",
        tooShort: "Az új jelszó túl rövid.",
        mismatch: "A jelszavak nem egyeznek.",
      },
      twoFactor: {
        status: "Kétlépcsős azonosítás",
        enabledText: "Bekapcsolva",
        disabledText: "Kikapcsolva",
        enable: "Kétlépcsős azonosítás beállítása",
        scanHint: "Olvassa be ezt a kódot a hitelesítő alkalmazással, majd adja meg a megjelenő kódot.",
        codeLabel: "Ellenőrző kód",
        verify: "Ellenőrzés és bekapcsolás",
        disableSection: "Kétlépcsős azonosítás kikapcsolása",
        password: "Jelenlegi jelszó",
        disable: "Kikapcsolás",
        qrAlt: "QR-kód a hitelesítő alkalmazáshoz",
        secretHint: "Nem sikerül beolvasni? Adja meg inkább ezt a kulcsot az alkalmazásban:",
        copySecret: "Kulcs másolása",
        // 0.31.0: the card's title; the state ("Bekapcsolva") stands beside it.
        title: "Kétlépcsős azonosítás",
      },
      passkeys: {
        title: "Hozzáférési kulcsok",
        description:
          "Jelentkezzen be ujjlenyomattal, arcfelismeréssel vagy az eszköz PIN-kódjával jelszó helyett.",
        descriptionAlongside:
          "Jelentkezzen be ujjlenyomattal, arcfelismeréssel vagy az eszköz PIN-kódjával. A jelszava továbbra is működik.",
        empty: "Még nincs hozzáférési kulcs",
        loading: "Hozzáférési kulcsok betöltése…",
        list: "Az Ön hozzáférési kulcsai",
        nameLabel: "Név (nem kötelező)",
        namePlaceholder: "pl. Laptop, Telefon",
        add: "Hozzáférési kulcs hozzáadása",
        adding: "Várakozás az eszközre…",
        rename: "Átnevezés",
        renameItem: (name) => `${name} átnevezése`,
        renameField: (name) => `${name} új neve`,
        save: "Mentés",
        cancel: "Mégse",
        delete: "Törlés",
        deleteItem: (name) => `${name} törlése`,
        deleteConfirm: (name) => `Törli ezt: „${name}”? Ezzel többé nem lehet bejelentkezni.`,
        confirmDelete: "Hozzáférési kulcs törlése",
        created: (date) => `Hozzáadva: ${date}`,
        lastUsed: (date) => `Utoljára használva: ${date}`,
        neverUsed: "Még nem használt",
      },
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
      opensInNewTab: "új lapon nyílik meg",
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
      empty: "Nincsenek bejegyzések",
      actions: "Műveletek",
      edit: "Szerkesztés",
      delete: "Törlés",
      booleanTrue: "Igen",
      booleanFalse: "Nem",
      booleanUnset: "Nincs megadva",
      sortBy: "Rendezés alapja",
      sortDefault: "Alapértelmezett sorrend",
      sortAscending: "Növekvő",
      sortDescending: "Csökkenő",
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
      previousMonth: "Előző hónap",
      nextMonth: "Következő hónap",
      today: "Ma",
      yearPanel: "Év kiválasztása",
      earlierYears: "Korábbi évek",
      laterYears: "Későbbi évek",
      thisYear: "Ez az év",
    },
    calendarHeatmap: {
      grid: "Napi értékek",
      day: (date, value) => `${date}: ${value}`,
      less: "Kevesebb",
      more: "Több",
      truncated: (count) =>
        `A legutóbbi napok láthatók; ${n(count)} korábbi nap nem látható.`,
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
      acknowledge: "Elolvastam, mit eredményez ez a művelet, és folytatni szeretném.",
      needsPhrase: (phrase) => `A megerősítéshez írja be: „${phrase}”`,
      needsAcknowledge: "A megerősítéshez jelölje be a négyzetet",
      needsPassword: "A megerősítéshez adja meg a jelszavát",
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
    pieChart: {
      slices: "Diagramszeletek",
      slice: (label, value, percent) => `${label}: ${value} (${percent})`,
      total: "Összesen",
      empty: "Nincs adat",
      legend: "Kategóriák",
    },
    confirmDialog: {
      confirm: "Megerősítés",
      cancel: "Mégse",
      typed: (text) => `A megerősítéshez írja be: „${text}”`,
    },
    floatingPanel: {
      close: "Bezárás",
      badge: (count) => `${n(count)} új`,
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
    toast: {
      close: "Értesítés bezárása",
      notifications: "Értesítések",
      undo: "Visszavonás",
      redo: "Újra",
    },
    form: {
      save: "Mentés",
      cancel: "Mégse",
      submitShortcut: (apple) => (apple ? "⌘ Enter" : "Ctrl+Enter"),
    },
    descriptionList: {
      empty: "—",
    },
    lineItems: {
      add: "Sor hozzáadása",
      remove: (row) => `${row}. sor eltávolítása`,
      confirmRemove: (row) => `Eltávolítja a(z) ${row}. sort? A megerősítéshez nyomja meg újra`,
      row: (row) => `${row}. sor`,
      cell: (column, row) => `${column}, ${row}. sor`,
      totals: "Összesen",
    },
    progressBar: {
      unlimited: "Korlátlan",
      overLimit: (amount) => `${amount} a korlát felett`,
    },
    signedAmount: {
      positive: (amount) => `plusz ${amount}`,
      negative: (amount) => `mínusz ${amount}`,
    },
    errorBoundary: {
      title: "Hiba történt",
      message: "Az oldal ezen része nem jeleníthető meg. Próbálja újra, vagy töltse be újra az oldalt.",
      retry: "Újrapróbálás",
      details: "Hiba részletei",
      reload: "Újratöltés",
      updateTitle: "Új verzió érhető el",
      updateMessage: "Az alkalmazás egy része megváltozott az oldal betöltése óta. Az új verzióhoz töltse be újra az oldalt.",
      offlineTitle: "Nincs internetkapcsolat",
      offlineMessage: "Az oldal kapcsolat nélkül nem tölthető be. A kapcsolat helyreállása után töltse be újra az oldalt.",
      copyReport: "Hibajelentés másolása",
      reported: "A hibát automatikusan jelentettük.",
      reportedAs: (reference) => `Bejelentés azonosítója: ${reference}`,
    },
    authedImage: {
      loading: "Kép betöltése…",
      loadError: "A képet nem sikerült betölteni",
      failedImage: (alt) => `${alt}: a képet nem sikerült betölteni`,
    },
    imageGrid: {
      list: "Képek",
      item: (index, count) => `${n(index)}. kép / ${n(count)}`,
      actions: (name) => `Műveletek: ${name}`,
    },
    lightbox: {
      dialog: "Képnézegető",
      close: "Bezárás",
      previous: "Előző kép",
      next: "Következő kép",
      counter: (index, count) => `${n(index)} / ${n(count)}`,
      position: (index, count) => `${n(index)}. kép / ${n(count)}`,
      download: "Letöltés",
      zoom: "Nagyítás",
      noPreview: "Ehhez a fájlhoz nincs előnézet",
      openInNewTab: "Megnyitás új lapon",
    },
    writeLock: {
      reason: "Ezt megtekintheti, de nem módosíthatja.",
    },
    accountState: {
      active: "Aktív",
      inactive: "Inaktív",
      invited: "Meghívva",
      registered: "Regisztrált",
      unverified: "Nincs megerősítve",
      passwordChange: "Jelszócsere szükséges",
      deletion: "Törlés kérelmezve",
      deletionOn: (date) => `Törlés: ${date}`,
    },
    shareCard: {
      dialogTitle: "Megosztás",
      close: "Bezárás",
      email: "E-mail-cím",
      emailOptional: "E-mail-cím (nem kötelező)",
      // example.com is reserved for examples (RFC 2606); a localised domain is real.
      emailPlaceholder: "nev@example.com",
      invalidEmail: "Adjon meg egy teljes e-mail-címet.",
      role: "Szerepkör",
      // The name after a colon, never inflected: the article before it (a/az) and a
      // possessive suffix on it both depend on how the name sounds. As `deleteConfirm`.
      roleOf: (name) => `Szerepkör (${name})`,
      add: "Megosztás",
      whoHasAccess: "Hozzáféréssel rendelkezők",
      nobodyYet: "Még senki más nem fér hozzá.",
      pending: "Függőben",
      openInvite: "Nyitott meghívólink",
      copyLink: "Link másolása",
      team: "Csapat",
      teamHint: (name) => `A(z) ${name} minden tagja hozzáférést kap.`,
      remove: "Hozzáférés megvonása",
      removeConfirm: (name) => `Megvonja a hozzáférést: ${name}?`,
      revokePending: "Meghívás visszavonása",
      revokePendingConfirm: (name) => `Visszavonja a meghívást: ${name}?`,
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
      loading: "Betöltés…",
    },
    reauthDialog: {
      title: "Személyazonosság megerősítése",
      description: "A folytatáshoz adja meg jelenlegi jelszavát.",
      password: "Jelenlegi jelszó",
      submit: "Folytatás",
      cancel: "Mégse",
    },
    serverWake: {
      slow: "Még tölt – ez a szokásosnál tovább tart.",
      // The name stays in the nominative behind "a(z) … alkalmazást", as in
      // `confirmRemove`: a Hungarian case ending on an arbitrary product name is a guess.
      waking: (appName) =>
        `A szerver elalszik, ha senki sem használja ${appName ? `a(z) ${appName} alkalmazást` : "az alkalmazást"}, ezért egy szünet utáni első kérésnek újra el kell indítania. Ez eltarthat egy ideig – semmi sem vész el, az oldal magától betöltődik.`,
    },
    // 0.28.0 — docs/legal-harmonization.md §4.3/§4.4: Kurvenschmiede's reviewed Hungarian
    // (formal "Ön"), brought into line with the kit's English; it goes back to
    // Kurvenschmiede for review.
    legal: {
      navLabel: "Jogi információk",
      links: {
        impressum: "Impresszum",
        privacy: "Adatvédelmi tájékoztató",
        terms: "Felhasználási feltételek",
      },
      titles: {
        impressum: "Impresszum",
        privacy: "Adatvédelmi tájékoztató",
        terms: "Felhasználási feltételek",
      },
      backHome: "Vissza a kezdőlapra",
      // The accusative ending is glued to the link, as Italian glues its article: "a
      // Felhasználási feltételeket és az Adatvédelmi tájékoztatót". Nothing is added around
      // a placeholder, and the articles fit these two titles (a F…, az A…).
      accept: "Elfogadom a következőket: {terms} és {privacy}",
      notice: {
        beta: "Zárt béta. Ezeket a szövegeket ügyvéd még nem ellenőrizte; erre a nyilvános indulás előtt sor kerül.",
        privacy:
          "Zárt béta. Az alábbi jogi szövegezést ügyvéd még nem ellenőrizte; erre a nyilvános indulás előtt sor kerül. A műszaki leírások – mit tárolunk, hol és ki olvashatja – azt írják le, amit a szoftver ma ténylegesen tesz, és arra valók, hogy a szoftverrel össze lehessen vetni őket.",
      },
      translation: {
        note: (o) =>
          `Ez a szöveg tájékoztató jellegű fordítás; az irányadó változat nyelve: ${o.bindingLanguage}.`,
        show: (o) => `Az irányadó változat megjelenítése (${o.bindingLanguage})`,
      },
      sections: {
        impressum: {
          operator: {
            title: "Üzemeltető",
            body: (o) =>
              `${o.name}\n${o.postalCode} ${o.city}\n${o.country}\n\nA teljes postai címet kérésre megadjuk mindenkinek, akinek jogos jogi érdeke fűződik hozzá; ehhez írjon az alábbi kapcsolattartási címre.`,
          },
          contact: {
            title: "Kapcsolat",
            body: (o) => `E-mail: ${o.email}`,
          },
          disclaimer: {
            title: "Felelősség a tartalmakért és a hivatkozásokért",
            body: "Ez egy magán, nem kereskedelmi projekt, amelyet zárt béta keretében, szavatosság nélkül kínálunk. Az általunk hivatkozott külső oldalakért azok üzemeltetői felelősek; tartalmukra nincs befolyásunk.",
            // 0.32.0 — the commercial variant (docs/billing-harmonization.md §8).
            // "Csomag" and "előfizetés" as the `billing` namespace.
            commercial:
              "Ez egy kereskedelmi szolgáltatás. A fizetős csomagokat viszonteladónk értékesíti, amely Merchant of Record szerepben jár el: a saját nevében értékesíti az előfizetést, beszedi a vételárat, kiállítja a számlát és elszámolja az áfát, a vásárlásra pedig az ő értékesítési feltételei vonatkoznak. Igyekszünk gondoskodni arról, hogy a szolgáltatás tartalma pontos legyen, de nem tudjuk szavatolni, hogy teljes és naprakész legyen. Az általunk hivatkozott külső oldalakért azok üzemeltetői felelősek; tartalmukra nincs befolyásunk.",
          },
        },
        privacy: {
          controller: {
            title: "Adatkezelő",
            body: (o) =>
              `A szolgáltatásban a személyes adatok kezeléséért felelős:\n${o.name}\n${o.postalCode} ${o.city}, ${o.country}\nE-mail: ${o.email}\n\nA teljes postai címet kérésre megadjuk az érintetteknek és a felügyeleti hatóságoknak.`,
          },
          legal_basis: {
            title: "Jogalap",
            body: "Mivel az üzemeltető lakóhelye Svájcban van, az adatkezelésre a svájci szövetségi adatvédelmi törvény (DSG/FADP) az irányadó. Ha Önre az EU általános adatvédelmi rendelete (GDPR) vonatkozik, a szolgáltatás nyújtására irányuló szerződés teljesítésére (GDPR 6. cikk (1) b) pont) és a szolgáltatás működtetéséhez és védelméhez fűződő jogos érdekünkre (GDPR 6. cikk (1) f) pont) támaszkodunk.",
          },
          browser: {
            title: "Mit tárol az Ön böngészője",
            lead: "Nincsenek sütik. Az alkalmazás a következőket tárolja az Ön böngészőjének tárhelyén:",
            tail: "Egyiket sem használjuk az Ön követésére. A küldésre váró bejegyzéseket a böngésző elküldi nekünk, amint lehetséges; minden más az Ön eszközén marad. Mindez eltűnik, amikor törli a webhely adatait, kijelentkezéskor pedig a bejelentkezési tokenek törlődnek.",
          },
          rights: {
            title: "Az Ön jogai",
            lead: "Önt megilleti a hozzáférés, a helyesbítés, a törlés, a korlátozás, az adathordozhatóság és a tiltakozás joga.",
            tail: "Ha Svájcban tartózkodik, a Szövetségi Adatvédelmi és Információs Biztoshoz (FDPIC) fordulhat; ha az EU-ban, panaszt nyújthat be a helyi felügyeleti hatóságnál.",
          },
          contact: {
            title: "Kapcsolat adatvédelmi ügyekben",
            body: (o) => `Bármilyen adatvédelmi kérés esetén írjon ide: ${o.email}`,
          },
        },
        terms: {
          warranty: {
            title: "Szavatosság kizárása",
            body: "A szolgáltatást a jogszabályok által megengedett mértékben „ahogy van” és „ahogy elérhető” alapon nyújtjuk, mindenféle szavatosság nélkül. Bétaváltozatként hibákat tartalmazhat, változhat vagy bármikor megszakadhat – fontos adatairól készítsen saját biztonsági másolatot.",
          },
          liability: {
            title: "Felelősségkorlátozás",
            body: "Az alkalmazandó jog által megengedett mértékben az üzemeltető nem felel a szolgáltatás használatából vagy annak lehetetlenségéből eredő közvetett vagy következményes károkért. Ez nem korlátozza azt a felelősséget, amelyet jogszabály alapján nem lehet korlátozni.",
          },
          changes: {
            title: "A feltételek módosítása",
            body: "Ezek a feltételek a szolgáltatás fejlődésével módosulhatnak. A lényeges változásokat e-mailben vagy az alkalmazásban jelentjük be; aki a változás után tovább használja a szolgáltatást, elfogadja azt.",
          },
          language: {
            title: "Nyelv",
            body: (o) =>
              `Ezek a feltételek ${o.bindingLanguage} nyelven készültek. A más nyelvű fordítások csak tájékoztató jellegűek; eltérés esetén az eredeti, ${o.bindingLanguage} nyelvű változat az irányadó.`,
          },
          law: {
            title: "Irányadó jog",
            body: (o) =>
              `Ezekre a feltételekre a svájci jog az irányadó, a kollíziós szabályok kizárásával. A jogszabályok által megengedett mértékben az illetékes bíróság székhelye ${o.city} (${o.region}), ${o.country}.`,
          },
        },
      },
    },
    // 0.29.0 — docs/auth-harmonization.md: Kurvenschmiede's reviewed Hungarian (auth.*,
    // notfound) where it says the same, brought into line with the kit's English and this
    // catalogue's words ("hozzáférési kulcs", "kétlépcsős azonosítás"); written fresh
    // where Kurvenschmiede has no such text yet. Formal "Ön". An address or a name stays
    // after a colon, never inflected, as in `shareCard`. It goes back to Kurvenschmiede
    // for review.
    signIn: {
      email: "E-mail",
      password: "Jelszó",
      submit: "Bejelentkezés",
      passkey: "Bejelentkezés hozzáférési kulccsal",
      forgotPassword: "Elfelejtette a jelszavát?",
      noAccount: "Még nincs fiókja?",
      register: "Fiók létrehozása",
      invalidCredentials: "Az e-mail-cím vagy a jelszó helytelen.",
      failed: "A bejelentkezés sikertelen. Kérjük, próbálja újra.",
      passkeyFailed: "A bejelentkezés hozzáférési kulccsal sikertelen.",
      deactivatedHint: "Letiltották a fiókját? Írjon ide: {contact}.",
      tagHint: (taggedAddress) =>
        `Ezzel a címmel regisztrált (${taggedAddress})? Akkor azt használja.`,
      twoFactorTitle: "Kétlépcsős azonosítás",
      twoFactorIntro: "Adja meg a hitelesítő alkalmazásban megjelenő kódot.",
      code: "Ellenőrző kód",
      verify: "Ellenőrzés",
      codeInvalid: "Érvénytelen ellenőrző kód.",
      setPasswordTitle: "Új jelszó választása",
      setPasswordIntro:
        "Ehhez a fiókhoz új jelszót kértek. Válasszon egyet, és máris folytathatja.",
      newPassword: "Új jelszó",
      confirmPassword: "Új jelszó ismét",
      passwordMismatch: "A jelszavak nem egyeznek.",
      setPasswordSubmit: "Jelszó beállítása és bejelentkezés",
      setPasswordFailed: "A jelszót nem sikerült beállítani.",
      expired: "Ez a bejelentkezés lejárt. Kérjük, jelentkezzen be újra.",
      backToSignIn: "Vissza a bejelentkezéshez",
      useRecoveryCode: "Tartalékkód használata",
      useAuthenticatorCode: "Hitelesítő alkalmazás használata",
      recoveryCode: "Tartalékkód",
      recoveryIntro:
        "Adja meg az egyik tartalékkódot, amelyet a kétlépcsős azonosítás bekapcsolásakor mentett el.",
      recoveryCodeHint: (length) =>
        `${n(length)} betű és számjegy. A kötőjelek és a szóközök nem számítanak.`,
      recoveryCodeInvalid: "Ez a tartalékkód érvénytelen, vagy már felhasználták.",
      rateLimited,
      // 0.31.0: the same words as `landing.requestAccess`.
      requestAccess: "Hozzáférés kérése",
    },
    register: {
      firstName: "Keresztnév",
      lastName: "Vezetéknév",
      email: "E-mail",
      // The address before a noun, uninflected, as `${name} törlése` in `passkeys`.
      emailTagUse: (address) => `${address} használata`,
      emailTagHint:
        "Sok szolgáltató a név+címke@… alakú címekre érkező leveleket ugyanabba a postafiókba kézbesíti, így az alkalmazás levelei könnyen szűrhetők és visszakövethetők. Mielőtt erre hagyatkozna, ellenőrizze, hogy az Öné is így működik-e: a címkés címmel kell majd bejelentkeznie.",
      invitedEmailHint: "Ez az a cím, amelyre a meghívót küldték.",
      invitedTagNote: "A címkés cím saját megerősítő e-mailt kap.",
      password: "Jelszó",
      confirmPassword: "Jelszó ismét",
      passwordMismatch: "A jelszavak nem egyeznek.",
      language: "Nyelv",
      submit: "Fiók létrehozása",
      haveAccount: "Már van fiókja?",
      signIn: "Bejelentkezés",
      emailTaken: "Ezzel az e-mail-címmel már létezik fiók.",
      registrationClosed:
        "Új fiókot csak meghívással lehet létrehozni. Kérje meg az üzemeltetőt, hogy küldjön meghívót az e-mail-címére.",
      invitationInvalid: "Ez a meghívóhivatkozás érvénytelen.",
      invitationExpired: "Ez a meghívó lejárt. Kérjen újat.",
      failed: "A regisztráció sikertelen. Kérjük, próbálja újra.",
      rateLimited,
    },
    completeName: {
      title: "Név kiegészítése",
      description:
        "A keresztnevet és a vezetéknevet mostantól külön kérjük. Ellenőrizze, mi van kitöltve, és pótolja, ami hiányzik.",
      firstName: "Keresztnév",
      lastName: "Vezetéknév",
      save: "Mentés",
      later: "Később",
      failed: "A nevét nem sikerült menteni. Kérjük, próbálja újra.",
    },
    forgotPassword: {
      title: "Jelszó visszaállítása",
      intro:
        "Adja meg a fiókjához tartozó e-mail-címet. Küldünk egy hivatkozást, amellyel új jelszót választhat.",
      email: "E-mail",
      submit: "Hivatkozás küldése",
      sent: (email) => `Ha létezik fiók ezzel a címmel (${email}), a hivatkozás úton van.`,
      sentHint:
        "A hivatkozás egy órán át érvényes, és pontosan egyszer használható. Nézze meg a levélszemét mappát is.",
      backToSignIn: "Vissza a bejelentkezéshez",
      error: "A kérés sikertelen. Kérjük, próbálja újra később.",
      rateLimited,
    },
    resetPassword: {
      title: "Új jelszó választása",
      checking: "A hivatkozás ellenőrzése…",
      intro: (email) => `Új jelszót állít be ehhez a fiókhoz: ${email}.`,
      newPassword: "Új jelszó",
      confirmPassword: "Új jelszó ismét",
      mismatch: "A jelszavak nem egyeznek.",
      submit: "Jelszó mentése",
      failed: "A jelszót nem sikerült módosítani.",
      noToken: "Ez a hivatkozás hiányos.",
      invalid: "Ez a hivatkozás érvénytelen vagy lejárt.",
      invalidHint:
        "A hivatkozások egy órán át érvényesek, és csak egyszer használhatók. Egyszerűen kérjen újat.",
      requestNew: "Új hivatkozás kérése",
      success: "A jelszava megváltozott. Most már bejelentkezhet vele.",
      sessionsEnded: "A bejelentkezett eszközök ki lettek jelentkeztetve – ott újra be kell jelentkeznie.",
      signIn: "Tovább a bejelentkezéshez",
      rateLimited,
    },
    verifyEmail: {
      title: "E-mail-cím megerősítése",
      verifying: "Megerősítés…",
      verified: "Az e-mail-címét megerősítettük.",
      continue: "Tovább",
      invalid: "Ez a megerősítő hivatkozás érvénytelen",
      expired: "Ez a megerősítő hivatkozás lejárt",
      noToken: "Ebből a hivatkozásból hiányzik a megerősítő token.",
      invalidHint: "Lehet, hogy a hivatkozás lejárt, vagy már felhasználták.",
      requestInApp: "Újat az alkalmazásban kérhet.",
      requestHere: "Újat itt kérhet.",
      resend: "Újraküldés",
      resendIn: (seconds) => `Újraküldés ${n(seconds)} mp múlva`,
      resent: "Megerősítő e-mail elküldve",
      resendError: "Nem sikerült elküldeni a megerősítő e-mailt",
      rateLimited,
      banner: "Kérjük, erősítse meg az e-mail-címét.",
      dismiss: "Most nem",
    },
    notFound: {
      title: "Az oldal nem található",
      body: "Ez a cím nem létezik (vagy már nem). Talán elírás, vagy az oldal máshová került.",
      home: "Ugrás a kezdőlapra",
      app: "Vissza az alkalmazáshoz",
    },
    acceptInvitation: {
      title: "Meghívás elfogadása",
      accepting: "Csatlakozás…",
      accepted: "Meghívás elfogadva.",
      joined: (name) => `Sikeresen csatlakozott: ${name}.`,
      continue: "Tovább",
      invalid: "Ezzel a hivatkozással nem sikerült csatlakozni",
      expired: "Ez a meghívó lejárt",
      noToken: "Ebből a hivatkozásból hiányzik a meghívótoken.",
      askAgain: "Kérjen új meghívót attól, aki meghívta.",
      signInFirst: "A meghívás elfogadásához jelentkezzen be",
      signInHint: "Azzal a fiókkal jelentkezzen be, amelynek a címére a meghívó érkezett.",
      signIn: "Bejelentkezés",
      register: "Fiók létrehozása",
    },
    companySwitcher: {
      switchCompany: "Cég váltása",
      heading: "Cégek",
      current: (name) => `Cég: ${name}`,
      currentMark: "(jelenlegi)",
      switching: "Cég váltása folyamatban…",
    },
    // 0.30.0 — docs/user-admin-harmonization.md: Kurvenschmiede's reviewed Hungarian for
    // the admin words (inaktiválás, szerepkör, lektor), transfer, invitations and
    // sessions; written fresh where it had no sentence. "Ön", and every value the app
    // passes in stands after a colon or in brackets, never with a case ending.
    emailChange: {
      title: "E-mail-cím",
      current: "Jelenlegi cím",
      newEmail: "Új e-mail-cím",
      password: "Jelenlegi jelszó",
      passwordHint: "A címével jelentkezik be, ezért a módosításához meg kell adnia a jelszavát.",
      emailTagUse: (address) => `${address} használata`,
      emailTagHint:
        "Sok szolgáltató a név+címke@… alakú címekre érkező leveleket ugyanabba a postafiókba kézbesíti, így az alkalmazás levelei könnyen szűrhetők és visszakövethetők. Mielőtt erre hagyatkozna, ellenőrizze, hogy az Öné is így működik-e: a címkés címmel kell majd bejelentkeznie.",
      submit: "E-mail-cím módosítása",
      sameAsCurrent: "Már ez az Ön címe.",
      emailTaken: "Ezzel az e-mail-címmel már létezik fiók.",
      wrongPassword: "A jelszó helytelen.",
      pending: (newEmail) => `Erősítse meg a hivatkozást, amelyet erre a címre küldtünk: ${newEmail}.`,
      pendingHint: (currentEmail) =>
        `Addig továbbra is ezzel a címmel jelentkezik be: ${currentEmail}. Nézze meg a levélszemét mappát is.`,
      resend: "Hivatkozás újraküldése",
      resent: "Újra elküldtük a hivatkozást.",
      cancel: "Módosítás visszavonása",
      confirmed: (email) => `Az e-mail-címe mostantól: ${email}.`,
      passkeyNote:
        "A hozzáférési kulcsai továbbra is működnek. Az eszköze azonban még a régi címe alatt mutathatja őket.",
      rateLimited,
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
    },
    sessions: {
      title: "Munkamenetek",
      description:
        "Be van jelentkezve egy olyan eszközön, amelyet már nem használ, vagy amelyben nem bízik? Jelentkezzen ki mindenhol.",
      signOutEverywhere: "Kijelentkezés mindenhol…",
      signOutEverywherePrompt:
        "Ez minden munkamenetet befejez, ezt is: ezen az eszközön is kijelentkezik, és innen újra be kell jelentkeznie.",
      confirmSignOutEverywhere: "Kijelentkezés mindenhol",
      list: "Ahol be van jelentkezve",
      loading: "Munkamenetek betöltése…",
      empty: "Nincs megjeleníthető munkamenet.",
      current: "Ez az eszköz",
      unknownDevice: "Ismeretlen eszköz",
      lastActive: (when) => `Utoljára aktív: ${when}`,
      ip: (address) => `IP-cím: ${address}`,
      revoke: "Kijelentkeztetés",
      // Starts with `revoke`, the button's visible text, for voice control.
      revokeItem: (device) => `Kijelentkeztetés: ${device}`,
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
    },
    deleteAccount: {
      title: "Fiók törlése",
      afterDays: (days) =>
        `A fiókját azonnal inaktiváljuk, majd ${n(days)} nap múlva véglegesen töröljük.`,
      operator: "A fiókját azonnal inaktiváljuk, a végleges törlést pedig az üzemeltető végzi el.",
      arm: "Fiók törlése…",
      prompt: "Minden eszközön kijelentkezik, és a fiókja többé nem használható.",
      handOver: (count) => `${n(count)} elem, amelyet mások is látnak, egy adminisztrátorhoz kerül.`,
      confirm: "Fiókom törlése",
      done: "A fiókja inaktiválva. Kijelentkeztetjük.",
      wrongPassword: "A jelszó helytelen.",
      confirmationMismatch: "Ez nem a fiókja címe.",
      lastAdmin: "Ön az utolsó adminisztrátor. Előbb tegyen adminisztrátorrá valaki mást.",
      lastAdminOf: (companies) =>
        `Ön az utolsó adminisztrátor itt: ${companies}. Előbb tegyen ott adminisztrátorrá valaki mást.`,
      householdHasMembers:
        "A háztartásának más tagjai is vannak, ezért a fiók itt nem törölhető. Kérjük, írjon az üzemeltetőnek.",
      rateLimited,
      failed: "A fiókját nem sikerült törölni. Kérjük, próbálja újra.",
    },
    dataExport: {
      title: "Adatai exportálása",
      description: "Töltse le a fiókja adatainak másolatát JSON-fájlként.",
      download: "Adataim letöltése",
      started: "A letöltés elkezdődött.",
      saveAgain: "Nem indult el? Fájl mentése",
      rateLimited: (seconds) =>
        seconds && seconds > 0
          ? `Az imént exportálta az adatait. Próbálja újra ${wait(seconds)} múlva.`
          : "Az imént exportálta az adatait. Kérjük, próbálja újra egy perc múlva.",
      failed: "Az exportálás sikertelen. Kérjük, próbálja újra.",
    },
    userRoster: {
      name: "Név",
      email: "E-mail",
      role: "Szerepkör",
      state: "Állapot",
      created: "Létrehozva",
      lastLogin: "Utolsó bejelentkezés",
      never: "Soha",
      actions: "Műveletek",
      // The name in brackets, never inflected — as `shareCard.roleOf`.
      actionsFor: (name) => `Műveletek (${name})`,
    },
    roleSelect: {
      label: "Szerepkör",
      rolesLegend: "Szerepkörök",
      roleOf: (name) => `Szerepkör (${name})`,
      lockedLastAdmin: "Az utolsó aktív adminisztrátor megtartja ezt a szerepkört.",
      lockedSelf: "A saját szerepkörét nem módosíthatja.",
      notForLastAdmin: "az utolsó adminisztrátornak nem",
      notForSelf: "a saját fiókjának nem",
      unavailable: (role, reason) => `${role} (${reason})`,
    },
    reviewerScope: {
      languages: "Nyelvek",
      hint: "Jelölje be a nyelveket, amelyeket ez a személy lektorál.",
      none: "Nincs nyelv: mentéskor megszűnik a lektori szerepkör.",
      areas: "Szűkítés",
      legalOnly: "Csak a jogi oldalak",
      legalOnlyHint:
        "Impresszum, adatvédelmi tájékoztató és felhasználási feltételek – inkább jogásznak, mint anyanyelvi lektornak.",
      failed: "A lektori beállítást nem sikerült menteni. Kérjük, próbálja újra.",
    },
    adminAction: {
      confirm: "Megerősítés",
      cancel: "Mégse",
      close: "Bezárás",
      lastAdmin: "Ez az utolsó aktív adminisztrátor. Előbb tegyen adminisztrátorrá valaki mást.",
      self: "Ezt a saját fiókjával nem teheti meg.",
      confirmationMismatch: "A cím nem egyezik ezzel a fiókkal. Ellenőrizze, melyik fióknál jár.",
      otherCompanies:
        "Ez a fiók más cégekhez is tartozik, ezért ezt csak a platform üzemeltetője teheti meg. Ehelyett eltávolíthatja ebből a cégből.",
      removeFromCompany: "Eltávolítás a cégből",
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
    },
    adminActionLog: {
      title: "Adminisztrátori műveletek",
      empty: "Még nincs adminisztrátori művelet.",
      loading: "Betöltés…",
      by: (actor) => `Végrehajtotta: ${actor}`,
      bySelf: "A felhasználó maga",
      automatic: "Automatikusan",
      erased: "egy törölt fiók",
      filteredTo: (target) => `Csak: ${target}`,
      showAll: "Az összes művelet megjelenítése",
      filterBy: (target) => `Csak az ezt a fiókot érintő műveletek megjelenítése: ${target}`,
      actions: {
        deactivate: "Inaktiválva",
        reactivate: "Újraaktiválva",
        role: "Szerepkör módosítva",
        membership_remove: "Eltávolítva a cégből",
        password_change_require: "Új jelszó előírva",
        password_change_withdraw: "Jelszócsere-előírás visszavonva",
        mail_verification: "Megerősítő e-mail elküldve",
        mail_reset: "Jelszó-visszaállító e-mail elküldve",
        reviewer: "Lektori beállítás módosítva",
        invite: "Meghívva",
        invite_resend: "Meghívó újraküldve",
        invite_revoke: "Meghívó visszavonva",
        transfer: "Munka továbbadva",
        deletion_request: "Törlés kérelmezve",
        deletion_cancel: "Törlés visszavonva",
        erase: "Fiók véglegesen törölve",
      },
    },
    transferOwnership: {
      title: (name) => `Munka továbbadása: ${name}`,
      body: "Minden, ami ennek a fióknak a tulajdona, egy lépésben átkerül a kiválasztott fiókhoz.",
      recipient: "Kinek adja",
      choose: "Válasszon egy fiókot…",
      chooseFirst: "Válassza ki, ki kapja meg a munkát",
      confirm: "Továbbadás",
      customer: "ügyfél",
      deactivated: "inaktivált",
      self: "ugyanaz a fiók",
      unavailable: (account, reason) => `${account} (${reason})`,
      noCandidates: "Más fiók nem kaphatja meg.",
    },
    invitations: {
      email: "E-mail-cím",
      invalidEmail: "Adjon meg egy teljes e-mail-címet.",
      role: "Szerepkör",
      scope: "Hatókör",
      scopeNone: "Nincs",
      language: "A meghívó nyelve",
      note: "Megjegyzés",
      invite: "Meghívás",
      listTitle: "Meghívók",
      empty: "Még senkit sem hívtak meg.",
      loading: "Betöltés…",
      status: { open: "Függőben", accepted: "Elfogadva", expired: "Lejárt", revoked: "Visszavonva" },
      sent: (date) => `Elküldve: ${date}`,
      expires: (date) => `Lejár: ${date}`,
      invitedBy: (name) => `Meghívta: ${name}`,
      resend: (email) => `Új hivatkozás küldése ide: ${email}`,
      copyLink: "Meghívóhivatkozás másolása",
      revoke: (email) => `Meghívó visszavonása: ${email}`,
      consoleHint:
        "Ez a szerver nem küld leveleket – a szervernaplóba írja őket. Innen másolja ki az egyes meghívóhivatkozásokat, és adja tovább maga: mindegyik csak egyszer jelenik meg.",
      linkReady: (email) => `Meghívóhivatkozás ehhez a címhez: ${email}. Csak most jelenik meg:`,
      notSent: (email) => `${email} meghívást kapott, de az e-mailt nem sikerült elküldeni. Küldje el újra.`,
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
    },
    characterCount: {
      // A noun after a numeral stays singular: "80 karakter".
      count: (used, max) => `${n(used)} / ${n(max)} karakter`,
      remaining: (left) => `Még ${n(left)} karakter írható`,
      limitReached: "Elérte a karakterkorlátot",
    },
    countrySelect: {
      country: "Ország",
      search: "Ország keresése",
      others: "További országok",
    },
    inlineEdit: {
      edit: (label) => `${label} szerkesztése`,
      failed: "A módosítást nem sikerült menteni.",
      empty: "Üres",
    },
    ibanInput: {
      format: "Az IBAN kétbetűs országkóddal és két ellenőrző számjeggyel kezdődik.",
      country: (code) => `„${code}” nem IBAN-országkód.`,
      length: (actual, expected) =>
        `Ebben az országban az IBAN ${n(expected)} karakterből áll, ez ${n(actual)} karakterből.`,
      checksum: "Az ellenőrző számjegyek nem egyeznek – valószínűleg elgépelt egy karaktert.",
      qrRequired: "Ez egy normál IBAN. QR-számlához a bankszámla QR-IBAN-ja kell.",
      qrNotAllowed:
        "Ez egy QR-IBAN, amelyre csak QR-számlás befizetés érkezhet. Adja meg a bankszámla normál IBAN-ját.",
    },
    phoneInput: {
      countryCode: "Országhívó szám",
      other: "Egyéb",
    },
    signChip: {
      outflow: "Kiadás",
      inflow: "Bevétel",
      direction: (current, next) => `Irány: ${current} – váltás erre: ${next}`,
      switchTo: (next) => `Váltás erre: ${next}`,
    },
    columnMapper: {
      paste: "Táblázat beillesztése",
      pasteHint:
        "Másolja ki a sorokat egy táblázatkezelőből, és illessze be ide, vagy húzzon ide egy CSV- vagy szövegfájlt.",
      chooseFile: "Fájl kiválasztása",
      readError: (name) => `„${name}”: a fájl nem olvasható`,
      headerRow: "Az első sor az oszlopok nevét tartalmazza",
      // No plural after a numeral (convention 2).
      summary: (columns, rows) => `${n(columns)} oszlop, ${n(rows)} sor`,
      separatorSemicolon: "pontosvesszővel elválasztva",
      separatorComma: "vesszővel elválasztva",
      separatorTab: "tabulátorral elválasztva",
      separatorSpace: "szóközzel elválasztva",
      // The examples stay as written: they show the convention, not the reader's locale.
      decimalComma: "tizedesvessző (1,5)",
      decimalPoint: "tizedespont (1.5)",
      unreadCount: (count) => `${n(count)} sor nem olvasható`,
      unreadLine: (line) => `A(z) ${line}. sor nem olvasható`,
      unreadMore: (count) => `…és még ${n(count)}`,
      noRows: "A szöveg egyetlen sora sem olvasható a táblázat soraként.",
      table: "Oszlopok és szerepük",
      columnN: (column) => `${column}. oszlop`,
      // The name after a colon, so no article or case ending has to agree with it.
      roleOf: (column) => `Mit tartalmaz ez az oszlop: „${column}”?`,
      ignore: "Kihagyás",
      requiredRole: (role) => `${role} (kötelező)`,
      requiredRoleShort: (role) => `${role} *`,
      // "(összesen N)", as `dataTable.pageChanged`: both numerals stay bare (convention 3).
      previewOf: (shown, total) => `Az első ${n(shown)} sor (összesen ${n(total)})`,
      // `roles` arrives joined with "vagy" ("Tartozik vagy Követel").
      oneOf: (roles) => `${roles} (valamelyik)`,
      missing: (roles) => `Még hiányzik: ${roles}.`,
    },
    translationReview: {
      statusMissing: "Hiányzik",
      statusUnreviewed: "Nincs ellenőrizve",
      statusChanged: "Ellenőrzés óta módosult",
      statusNeedsChange: "Módosítandó",
      statusApproved: "Jóváhagyva",
      statusFilter: "Állapot",
      all: "Mind",
      filterCount: (label, count) => `${label} · ${n(count)}`,
      source: "Szövegek",
      allSources: "Minden szöveg",
      namespace: "Terület",
      allNamespaces: "Minden terület",
      search: "Keresés kulcsokban és szövegekben",
      placeholdersOnly: (count) => `Csak a helyőrző-problémák (${n(count)})`,
      placeholderChip: "Helyőrzők",
      key: "Kulcs",
      statusColumn: "Állapot",
      empty: "Egy szöveg sem felel meg ezeknek a szűrőknek.",
      missingText: "Ezen a nyelven hiányzik",
      progress: (approved, total) => `${n(approved)} / ${n(total)} jóváhagyva`,
      localeProgress: (approved, total) => `${n(approved)}/${n(total)}`,
      locales: "Nyelvek",
      approve: "Jóváhagyás",
      flag: "Módosítandó",
      suggest: "Fordítás javaslata",
      reset: "Megjelölés ellenőrizetlenként",
      cancel: "Mégse",
      approveSelected: "Kijelöltek jóváhagyása",
      resetSelected: "Kijelöltek megjelölése ellenőrizetlenként",
      selectShown: "Az összes megjelenített kijelölése",
      changedSince: "Ez a szöveg az ellenőrzés után megváltozott. Kérjük, olvassa el újra.",
      reviewedWording: "Megfogalmazás az ellenőrzéskor",
      reviewedReference: "Referencia az ellenőrzéskor",
      placeholderMismatch: (reference, text) =>
        `A helyőrzők eltérnek a referenciától – referencia: ${reference}; ez a szöveg: ${text}. Ezekbe az alkalmazás értékeket illeszt be, ezért pontosan így kell maradniuk.`,
      // The name after a colon, never inflected — as `shareCard.removeConfirm`.
      lastApproved: (name, date) => `Jóváhagyta: ${name}, ${date}`,
      lastFlagged: (name, date) => `Módosításra jelölte: ${name}, ${date}`,
      erasedReviewer: "egy törölt fiók",
      suggestion: "Jobb megfogalmazás",
      translation: "Fordítás",
      note: "Megjegyzés (nem kötelező)",
      notePlaceholder: "Mi a hiba, vagy mire kell figyelni",
      readOnly: "Ezt a nyelvet olvashatja, de nem ellenőrizheti.",
      scope: (areas) => `Az Ön ellenőrzése a következőkre korlátozódik: ${areas}.`,
      exportCorrections: (count) => `Javítások exportálása (${n(count)})`,
      failed: "Ez nem sikerült. Kérjük, próbálja újra.",
      // No plural after a numeral (convention 2).
      approvedToast: (count) => (count === 1 ? "Szöveg jóváhagyva" : `${n(count)} szöveg jóváhagyva`),
      clearedToast: (count) => (count === 1 ? "Szöveg ellenőrizetlenként megjelölve" : `${n(count)} szöveg ellenőrizetlenként megjelölve`),
      groupCount: (unreviewed, total) => `${n(unreviewed)} ellenőrizetlen / ${n(total)}`,
      approveGroup: (count) => `Ellenőrizetlenek jóváhagyása (${n(count)})`,
      // Opens with the quoted name, as `filePicker`'s refusals: no case ending ("-ban/-ben")
      // has to agree with it. "a(z)" before the count, as `filePicker.rejectedPick`.
      confirmGroup: (count, group) =>
        count === 1
          ? `„${group}”: jóváhagyja az ellenőrizetlen szöveget?`
          : `„${group}”: jóváhagyja mind a(z) ${n(count)} ellenőrizetlen szöveget, a képernyőn nem láthatókat is?`,
    },
    // 0.31.0 — docs/settings-harmonization.md §4.3 and docs/landing-demo-harmonization.md
    // §4–§5: the settings shell, the landing page's generic words and the demo. The help
    // lines name things as `accountSettings`, `sessions` and `dataExport` do. "Ön"; the
    // buttons are nouns, as "Fiók létrehozása"; the numeral stays bare before its noun
    // ("3 találat", "50 perc"); every value the app passes in stands after a colon.
    settings: {
      title: "Beállítások",
      search: "Keresés a beállításokban",
      searchPlaceholder: "Keresés a beállításokban…",
      results: "Megfelelő beállítások",
      noMatches: (query) => `Nincs a keresésnek megfelelő beállítás: „${query}”.`,
      // As `commandPalette.clear`.
      clearSearch: "Keresés törlése",
      back: "Vissza a beállításokhoz",
      sections: "Beállításcsoportok",
      matchCount: (count) => `${n(count)} találat`,
      groups: {
        appearance: {
          title: "Megjelenés",
          help: "Nyelv, téma és az alkalmazás megjelenése ezen az eszközön.",
        },
        account: {
          title: "Fiók",
          help: "Az Ön profilja és e-mail-címe.",
        },
        security: {
          title: "Biztonság",
          help: "Hogyan jelentkezik be, és hol van bejelentkezve.",
        },
        notifications: {
          title: "Értesítések",
          help: "Miről, mikor és mely eszközökön kap értesítést.",
        },
        data: {
          title: "Adatok",
          help: "Exportálja a saját adatait, vagy törölje őket a fiókjával együtt.",
        },
      },
    },
    landing: {
      signIn: "Bejelentkezés",
      requestAccess: "Hozzáférés kérése",
      getStarted: "Kezdés",
      tryDemo: "Demó kipróbálása",
      openApp: "Alkalmazás megnyitása",
      continueDemo: "Demó folytatása",
      beta: "Béta",
      // Plain text: a mail's subject and body lines, never HTML. The app's name after a
      // colon, so it needs no case ending ("Hozzáférés a Kastlanhoz").
      accessSubject: (app) => (app ? `Hozzáférési kérelem: ${app}` : "Hozzáférési kérelem"),
      accessName: "Név:",
      accessCompany: "Cég:",
      accessUse: "Mire használná:",
    },
    demo: {
      starting: "A demó indítása…",
      rateLimited: (minutes) =>
        minutes
          ? `Túl sok demó indult erről a hálózatról. Próbálja újra ${n(minutes)} perc múlva.`
          : "Túl sok demó indult erről a hálózatról. Próbálja újra később.",
      capacity: "A demó jelenleg megtelt. Kérjük, próbálja újra később.",
      unavailable: "A demó jelenleg nem érhető el.",
      failed: "A demót nem sikerült elindítani. Kérjük, próbálja újra.",
      // As `legal.backHome`.
      backToStart: "Vissza a kezdőlapra",
      hoursLeft: (hours, minutes) => `Demó · még ${n(hours)} óra ${n(minutes)} perc`,
      minutesLeft: (minutes) => `Demó · még ${n(minutes)} perc`,
      badge: "Demó",
      readOnly: "Mintaadatokat lát. Módosításra nincs lehetőség.",
      sandbox: "Amit Ön hoz létre, az a demó végén törlődik.",
      details: "A demó részletei",
      writeLocked: "A demóban ez nem lehetséges.",
      endedTitle: "A demó véget ért",
      endedReadOnly: "A mintaadatokat rendszeresen visszaállítjuk.",
      endedSandbox:
        "A mintaadatokat rendszeresen visszaállítjuk, a demóban létrehozott saját munkáját pedig töröljük.",
      restart: "Új demó indítása",
    },
    // 0.32.0 — docs/billing-harmonization.md §7, §10 and §12.24: "csomag" is what is bought
    // (Free, Pro), "előfizetés" the standing arrangement and the settings group. The plan's
    // name takes no case ending: it follows a colon or a possessive ("Pro választása").
    billing: {
      group: "Előfizetés",
      plans: "Csomagok",
      interval: "Számlázási időszak",
      yearly: "Éves",
      monthly: "Havi",
      // As `currency.currency`.
      currency: "Pénznem",
      perYear: "évente",
      perMonth: "havonta",
      vatIncluded: "Áfával együtt",
      free: "Ingyenes",
      notOffered: "Ebben a számlázási időszakban nem érhető el",
      // As `progressBar.unlimited`.
      unlimited: "Korlátlan",
      limits: "Korlátok",
      features: "A csomag tartalma",
      current: "Jelenlegi csomag",
      choose: (plan) => `${plan} választása`,
      upgrade: (plan) => `Váltás nagyobb csomagra: ${plan}`,
      downgrade: (plan) => `Váltás erre a csomagra: ${plan}`,
      isCurrent: "Ez az Ön jelenlegi csomagja.",
      pickFirst: "Előbb válasszon egy csomagot.",
      // "Lejárt", as `invitations.status.expired`.
      status: {
        trialing: "Próbaidőszak",
        active: "Aktív",
        past_due: "Fizetés késésben",
        canceled: "Lemondva",
        expired: "Lejárt",
        comped: "Ingyenesen biztosítva",
      },
      trialEnding: (days) =>
        `A próbaidőszaka ${inDays(days)} ér véget. Utána is mindent megtekinthet, de a módosításokhoz csomagra lesz szüksége.`,
      grantEnding: (days) =>
        `Az ingyenes hozzáférése ${inDays(days)} ér véget. Utána is mindent megtekinthet, de a módosításokhoz csomagra lesz szüksége.`,
      paymentFailed:
        "A legutóbbi fizetése nem sikerült. A csomagja megtartásához frissítse a fizetési módját.",
      planEnded:
        "A csomagja lejárt. Továbbra is mindent megtekinthet és exportálhat; ha ismét módosítani szeretne, válasszon csomagot.",
      // Never why: the owner's payment status is the owner's personal data (§12.6).
      guestReadOnly: (item) =>
        item
          ? `„${item}” egyelőre csak olvasható; a tulajdonosa feloldhatja ezt a korlátozást.`
          : "Ez egyelőre csak olvasható; a tulajdonosa feloldhatja ezt a korlátozást.",
      processing:
        "A fizetése feldolgozás alatt áll. A csomagja a megerősítés után azonnal elindul; ez az oldal magától frissül.",
      choosePlan: "Csomag választása",
      updatePayment: "Fizetési mód frissítése",
      checkAgain: "Újraellenőrzés",
      lockReason: "A csomagja lejárt. Ha ismét módosítani szeretne, válasszon csomagot.",
      // As `characterCount.limitReached` ("Elérte a karakterkorlátot").
      limitReached: "Elérte a csomag korlátját",
      limitUpgrade: "Továbbiak hozzáadásához válasszon magasabb korlátú csomagot.",
      limitContact: "Továbbiak hozzáadásához kérjen tőlünk magasabb korlátot.",
      askForMore: "Bővítés kérése",
      // Both figures arrive formatted and stay bare, as `characterCount.count` (convention 3).
      usage: (used, limit) => `${used} / ${limit}`,
      contactSubject: (dimension) => `Csomagkorlát: ${dimension}`,
      manage: "Fizetés és számlák",
      cancel: "Előfizetés lemondása",
      // No plural after a numeral (convention 2).
      waitingChanges: (count) => `${n(count)} módosítás csomagra vár`,
      // "Elvetés", as `wizard.cancelConfirmLabel`.
      discardWaiting: "Várakozó módosítások elvetése",
      notConfigured: "A fizetés még nincs beállítva. Kérjük, próbálja újra később.",
      disabled: "Az előfizetés itt nem érhető el.",
    },
    // 0.32.0 — docs/text-size-harmonization.md §6: the text-size and contrast settings in
    // the "Megjelenés" group.
    appearance: {
      textSize: "Szövegméret",
      textSizeHelp: "Nagyobb betűk, és olyan elrendezés, amely helyet ad nekik.",
      textSizes: { normal: "Normál", large: "Nagy", xlarge: "Nagyon nagy" },
      contrast: "Kontraszt",
      contrastHelp:
        "A fokozott kontraszt sötétebbé teszi a halvány szövegeket és vonalakat, a fókuszkereteket pedig vastagabbá. A „Rendszer” ennek az eszköznek a beállítását követi.",
      contrastModes: { system: "Rendszer", standard: "Normál", more: "Fokozott" },
    },
    rowActions: {
      actions: "Műveletek",
      actionsFor: (name) => `${name} – műveletek`,
    },
    appShellMore: {
      more: "Továbbiak",
      moreTitle: "További oldalak",
    },
  };
}

export const UI_KIT_LABELS_HU: UiKitLabels = uiKitLabelsHu();
