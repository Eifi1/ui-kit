import { formatFileSize } from "../kit-labels";
import type { UiKitLabels } from "../kit-labels";

/**
 * The kit's words in French: every namespace of {@link UiKitLabels}, for
 * `<UiKitProvider labels={UI_KIT_LABELS_FR}>`.
 *
 * Self-contained on purpose — nothing but the kit's own `formatFileSize` — so it works
 * as a starting point to copy and adjust. Counts and sizes are formatted with
 * `fr-FR` digits; {@link uiKitLabelsFr} takes another number locale
 * (e.g. `"de-CH"` for 1’234) without touching the words.
 */
export function uiKitLabelsFr(numberLocale = "fr-FR"): UiKitLabels {
  const num = new Intl.NumberFormat(numberLocale);
  const n = (value: number) => num.format(value);
  const plural = (count: number, one: string, many: string) => (count < 2 ? one : many);

  return {
    feedbackAttachment: {
      attachmentAdd: "Joindre une image",
      attachmentCapture: "Capturer l’écran",
      attachmentPaste: "…ou collez une capture d’écran depuis le presse-papiers.",
      attachmentRemove: "Retirer la pièce jointe",
    },
    measuredGrid: {
      view: "Vue du tableau",
      cellsView: "Cellules",
      textView: "Texte",
      addRow: "Ajouter une ligne",
      removeRow: (row) => `Supprimer la ligne ${row}`,
      clear: "Vider le tableau",
      pasteHint: "Collez un bloc copié d\u2019un tableur dans n\u2019importe quelle cellule",
      cell: (column, row) => `${column}, ligne ${row}`,
      rowNumber: "Ligne",
      rowActions: "Actions de ligne",
      keyboardHint:
        "Les flèches passent d\u2019une cellule à l\u2019autre. Tapez pour remplacer une cellule, F2 pour la modifier, Échap pour annuler la modification. Entrée descend et ajoute une ligne à la fin.",
      lineError: (line) => `La ligne ${line} n\u2019a pas pu être lue`,
      points: (count) => (count < 2 ? `${count} point` : `${count} points`),
      problems: (count) =>
        count < 2
          ? `${count} cellule n\u2019est pas un nombre`
          : `${count} cellules ne sont pas des nombres`,
    },
    pageContents: { title: "Sur cette page" },
    common: {
      dismiss: "Fermer",
      close: "Fermer",
      clear: "Effacer",
      search: "Rechercher",
      done: "Terminé",
      cancel: "Annuler",
      save: "Enregistrer",
      back: "Retour",
      next: "Suivant",
      remove: "Supprimer",
      loading: "Chargement…",
      noResults: "Aucun résultat",
      // No-break space before the colon, per French typography.
      fieldValue: (field, value) => `${field}\u00a0: ${value}`,
    },
    dataTable: {
      columns: "Colonnes",
      selectAllRows: "Sélectionner toutes les lignes",
      sortHint: "Cliquer pour trier · Maj+clic pour ajouter un tri",
      filter: "Filtrer",
      close: "Fermer",
      selectRow: "Sélectionner la ligne",
      autoSize: "Ajuster la largeur des colonnes",
      loading: "Chargement…",
      filters: "Filtres",
      clearAll: "Tout effacer",
      done: "Terminé",
      pageSize: "Lignes par page",
      pageSizeAll: "Toutes",
      prevPage: "Page précédente",
      nextPage: "Page suivante",
      clearFilter: "Effacer le filtre",
      filterPlaceholder: "Filtrer…",
      selectFilter: "Sélectionner",
      selectAll: "Tout",
      selectNone: "Aucun",
      dateFrom: "Du",
      dateTo: "Au",
      numberMin: "Min.",
      numberMax: "Max.",
      numberAbs: "Valeur absolue",
      presets: {
        today: "Aujourd’hui",
        yesterday: "Hier",
        this_week: "Cette semaine",
        last_week: "Semaine dernière",
        last_7_days: "7 derniers jours",
        last_30_days: "30 derniers jours",
        this_month: "Ce mois-ci",
        last_month: "Mois dernier",
        last_3_months: "3 derniers mois",
        ytd: "Depuis le début de l’année",
        last_year: "Année dernière",
      },
      table: "Tableau de données",
      filterResults: (shown, total) =>
        `${n(shown)} ${plural(shown, "ligne", "lignes")} sur ${n(total)}`,
      sortedAscending: (column) => `Trié par ${column}, ordre croissant`,
      sortedDescending: (column) => `Trié par ${column}, ordre décroissant`,
      sortCleared: (column) => `Tri retiré sur ${column}`,
      pageChanged: (page, totalPages) => `Page ${n(page)} sur ${n(totalPages)}`,
      pageRange: (from, to, total) => `${n(from)}–${n(to)} / ${n(total)}`,
      rowCount: (total) => n(total),
      columnsCount: (visible, total) => `Colonnes (${n(visible)}/${n(total)})`,
    },
    miniCalendar: {
      previousMonth: "Mois précédent",
      nextMonth: "Mois suivant",
      // Already formatted in the provider's locale ("lundi 14 septembre 2026").
      day: (date) => date,
      chooseStart: "Choisissez une date de début",
      chooseEnd: "Choisissez une date de fin",
      // "Date" is feminine and the formatted day is not a noun French can agree with,
      // so the date is set after a label rather than made the subject.
      startSelected: (date) => `Date de début\u00a0: ${date}. Choisissez une date de fin.`,
      rangeSelected: (from, to) =>
        `Période du ${from} au ${to} sélectionnée. Choisissez une date de début pour recommencer.`,
    },
    datePicker: {
      apply: "Appliquer",
      cancel: "Annuler",
      presets: "Plages rapides",
      panel: "Choisir une date",
      rangePanel: "Choisir une période",
      clear: "Effacer",
      previousDay: "Jour précédent",
      nextDay: "Jour suivant",
      today: "Aujourd’hui",
    },
    monthPicker: {
      previousYear: "Année précédente",
      nextYear: "Année suivante",
      panel: "Choisir un mois",
      month: (monthYear) => monthYear,
    },
    popover: {
      panel: "Fenêtre contextuelle",
    },
    combobox: {
      search: "Rechercher",
      noResults: "Aucun résultat",
      clear: "Effacer",
      loading: "Chargement…",
      create: (query) => `Créer «\u202f${query}\u202f»`,
      selectedCount: (count) => `${n(count)} ${plural(count, "sélectionné", "sélectionnés")}`,
      loadError: "Impossible de charger les résultats",
      resultCount: (count) => `${n(count)} ${plural(count, "résultat", "résultats")}`,
      minChars: (count) =>
        `Saisissez au moins ${n(count)} ${plural(count, "caractère", "caractères")}`,
    },
    multiSelect: {
      search: "Rechercher",
      selectAll: "Tout sélectionner",
      clear: "Effacer",
      all: "Tous",
      // The bare count, as in English: the trigger has always shown just the number.
      selectedCount: (count) => n(count),
    },
    calculator: {
      open: "Ouvrir la calculatrice",
      panel: "Calculatrice",
      calculation: "Calcul",
      backspace: "Retour arrière",
      clear: "Effacer",
      equals: "Égal",
      done: "Terminé",
      plus: "Plus",
      minus: "Moins",
      times: "Multiplié par",
      divide: "Divisé par",
      decimal: "Séparateur décimal",
    },
    currency: {
      currency: "Devise",
      search: "Rechercher une devise",
    },
    chipInput: {
      // The quoted value is a citation; the participle agrees with the implied
      // "élément" whatever the chip says.
      added: (value) => `«\u202f${value}\u202f» ajouté`,
      removed: (value) => `«\u202f${value}\u202f» supprimé`,
      remove: "Supprimer",
      atLimit: (max) => `Limite de ${n(max)} ${plural(max, "élément", "éléments")} atteinte`,
      duplicate: (value) => `«\u202f${value}\u202f» figure déjà dans la liste`,
    },
    swatchPicker: {
      none: "Aucune couleur",
      mixed: "Mixte\u00a0: les éléments sélectionnés ont des couleurs différentes",
    },
    iconPicker: {
      none: "Aucune icône",
      mixed: "Mixte\u00a0: les éléments sélectionnés ont des icônes différentes",
      search: "Rechercher des icônes",
      noResults: "Aucune icône ne correspond",
      resultCount: (count) => `${n(count)} ${plural(count, "icône", "icônes")}`,
    },
    fieldSync: {
      synced: "Enregistré",
      edited: "Modifications non enregistrées",
      pending: "Enregistrement…",
      error: "Échec de l’enregistrement",
      retry: "Réessayer",
    },
    passwordReveal: {
      show: "Afficher le mot de passe",
      hide: "Masquer le mot de passe",
    },
    dangerConfirm: {
      arm: "Supprimer…",
      confirm: "Supprimer",
      cancel: "Annuler",
      prompt: "Cette action est irréversible.",
      password: "Mot de passe",
      phrase: (phrase) => `Saisissez «\u202f${phrase}\u202f» pour confirmer`,
    },
    tabs: {
      add: "Ajouter un onglet",
      remove: (tab) => `Supprimer ${tab}`,
    },
    appShell: {
      collapse: "Réduire la barre latérale",
      expand: "Développer la barre latérale",
      toggleGroup: (groupLabel) => `${groupLabel}\u00a0: pages`,
    },
    topBar: {
      theme: "Changer de thème",
      palette: "Préréglage d’apparence",
      language: "Langue",
      switchRole: "Changer de rôle",
      role: (value) => `Rôle\u00a0: ${value}`,
    },
    pickerSheet: {
      close: "Fermer",
    },
    dialogFrame: {
      close: "Fermer",
    },
    swipeableRow: {
      actions: "Actions de la ligne",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 Mo").
      size: (bytes) => formatFileSize(bytes, numberLocale),
    },
    filePicker: {
      dropzone: "Envoi de fichier",
      browse: "Parcourir",
      empty: "Déposez un fichier ici",
      emptyMultiple: "Déposez des fichiers ici",
      hint: (accept) => (accept ? `Acceptés\u00a0: ${accept}` : "Tout type de fichier"),
      busy: "Envoi en cours…",
      rejectedPick: (count) =>
        count < 2
          ? "Le fichier n\u2019a pas été ajouté"
          : `Aucun des ${count} fichiers n\u2019a été ajouté`,
      rejectedType: (name) => `Le type du fichier «\u202f${name}\u202f» n’est pas pris en charge`,
      rejectedTypeOnly: (accept) => `Uniquement des fichiers ${accept}`,
      rejectedSize: (name, maxSize) => `«\u202f${name}\u202f» dépasse ${maxSize}`,
      rejectedCount: (name, maxFiles) =>
        `«\u202f${name}\u202f» n’a pas été ajouté\u00a0: ${n(maxFiles)} ${plural(maxFiles, "fichier", "fichiers")} au maximum`,
      rejectedInvalid: (name) => `«\u202f${name}\u202f» ne peut pas être utilisé ici`,
      rejectedMany: (count) =>
        count < 2
          ? `${n(count)} fichier n’a pas été ajouté`
          : `${n(count)} fichiers n’ont pas été ajoutés`,
      // The name branch is for exactly one file, as in English; 0 falls to the count.
      selected: (count, firstName) =>
        count === 1
          ? `«\u202f${firstName}\u202f» sélectionné`
          : `${n(count)} ${plural(count, "fichier sélectionné", "fichiers sélectionnés")}`,
      remove: (name) => `Supprimer «\u202f${name}\u202f»`,
      clearAll: "Supprimer tous les fichiers",
      removed: (name) => `«\u202f${name}\u202f» supprimé`,
      cleared: "Tous les fichiers ont été supprimés",
    },
    wizard: {
      cancel: "Annuler",
      back: "Retour",
      next: "Suivant",
      skip: "Passer",
      finish: "Terminer",
      submitting: "Création…",
      steps: "Étapes",
      step: (current, total) => `Étape ${n(current)} sur ${n(total)}`,
      cancelTitle: "Abandonner ce formulaire\u202f?",
      confirmCancel: "Vos saisies seront perdues.",
      cancelConfirmLabel: "Abandonner",
      cancelDismissLabel: "Continuer la saisie",
      reviewTitle: "Vérification",
      edit: "Modifier",
      missingRequired: "Veuillez remplir tous les champs obligatoires.",
      genericError: "Une erreur est survenue",
    },
    tour: {
      next: "Suivant",
      back: "Retour",
      skip: "Passer",
      done: "Terminé",
      awaitClickHint: "Cliquez sur l’élément mis en évidence pour continuer",
      step: (current, total) => `${n(current)} / ${n(total)}`,
    },
    commandPalette: {
      placeholder: "Rechercher…",
      empty: "Aucun résultat",
      loading: "Recherche…",
      dialog: "Recherche",
      error: "La recherche a échoué. Réessayez.",
    },
    sparkline: {
      // "En hausse de 12 à 40" would read as "up BY 12", hence the colon.
      rising: (first, last) => `En hausse\u00a0: de ${first} à ${last}`,
      falling: (first, last) => `En baisse\u00a0: de ${first} à ${last}`,
      flat: (value) => `Stable à ${value}`,
      single: (value) => `Une seule valeur\u00a0: ${value}`,
      noData: "Aucune donnée",
      named: (name, summary) => `${name}\u00a0: ${summary}`,
    },
    statTile: {
      increase: (amount) => `En hausse de ${amount}`,
      decrease: (amount) => `En baisse de ${amount}`,
      unchanged: "Sans changement",
      better: (change) => `${change} (favorable)`,
      worse: (change) => `${change} (défavorable)`,
      noValue: "Aucune donnée",
      loading: "Chargement…",
    },
    signaturePad: {
      label: "Signature",
      instructions: "Signez dans le cadre avec une souris, votre doigt ou un stylet.",
      typedFallbackHint: "Si vous ne pouvez pas dessiner, saisissez plutôt votre nom.",
      empty: "Aucun tracé pour l’instant",
      signed: "Signature tracée",
      undo: "Annuler le dernier trait",
      clear: "Effacer",
      save: "Enregistrer la signature",
      useTyped: "Saisir le nom à la place",
      useDrawn: "Dessiner à la place",
      typedName: "Nom complet",
      cleared: "Signature effacée",
      undone: "Dernier trait supprimé",
      viewEmpty: "Non signé",
      viewDrawn: "Signature manuscrite",
      viewTyped: (name) => `Signé avec le nom saisi ${name}`,
    },
    passwordStrength: {
      // Agrees with "mot de passe" (masculine).
      tooShort: "Trop court",
      weak: "Faible",
      fair: "Moyen",
      good: "Bon",
      strong: "Fort",
      announcement: (level) => `Robustesse du mot de passe\u00a0: ${level}`,
      // Unformatted, as in the English default.
      ruleLength: (minLength) =>
        `Au moins ${minLength} ${plural(minLength, "caractère", "caractères")}`,
      ruleCase: "Majuscules et minuscules",
      ruleDigit: "Un chiffre",
      ruleSymbol: "Un caractère spécial",
      optional: (rule) => `${rule} (facultatif)`,
      met: "Respecté\u00a0:",
      notMet: "Non respecté\u00a0:",
      tooLong: (maxBytes) =>
        `Au plus ${maxBytes} ${plural(maxBytes, "caractère", "caractères")} (les lettres accentuées et les emoji comptent pour plus d’un).`,
    },
    seriesChart: {
      resetZoom: "Réinitialiser le zoom",
      zoomHint:
        "Faites glisser pour zoomer\u00a0: une sélection à peu près carrée zoome sur les deux axes, une sélection longue et étroite sur son seul axe. Double-cliquez pour réinitialiser.",
      empty: "Aucune donnée",
      legend: "Séries",
    },
    confirmDialog: {
      confirm: "Confirmer",
      cancel: "Annuler",
    },
    floatingPanel: {
      close: "Fermer",
    },
    copyButton: {
      copy: "Copier",
      copied: "Copié",
      failed: "Échec de la copie",
      copiedAnnouncement: "Copié dans le presse-papiers",
      failedAnnouncement: "Impossible de copier dans le presse-papiers",
    },
  };
}

export const UI_KIT_LABELS_FR: UiKitLabels = uiKitLabelsFr();
