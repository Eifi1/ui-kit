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
      attachmentAdd: "Ajouter une pièce jointe",
      attachmentCapture: "Capturer l’écran",
      attachmentPaste:
        "…ou collez une capture d’écran directement depuis le presse-papiers, pour ne montrer qu’un détail plutôt que toute la page.",
      attachmentRemove: "Retirer la pièce jointe",
      attachmentList: "Pièces jointes",
      attachmentScreenshot: "Capture d’écran",
      attachmentRemoveFile: (name) => `Retirer ${name}`,
      attachmentLimit: (max) =>
        max === 1
          ? `${n(max)} pièce jointe au maximum — retirez-la pour en ajouter une autre.`
          : `${n(max)} pièces jointes au maximum — retirez-en une pour en ajouter une autre.`,
      attachmentUploading: "Envoi en cours…",
      attachmentUploadFailed: (name) => `«\u202f${name}\u202f» n’a pas pu être envoyé`,
    },
    feedbackDialog: {
      title: "Envoyer un retour",
      category: "Catégorie",
      subject: "Objet",
      body: "Que s’est-il passé\u202f?",
      bodyOptional: "Que s’est-il passé\u202f? (facultatif)",
      attachment: "Pièce jointe",
      submitHint: (apple) => (apple ? "⌘ Entrée pour envoyer" : "Ctrl+Entrée pour envoyer"),
      cancel: "Annuler",
      save: "Envoyer",
    },
    feedbackThread: {
      thread: "Commentaires",
      empty: "Aucun commentaire pour l’instant",
      loading: "Chargement des commentaires…",
      you: "Vous",
      staff: "Équipe",
      attachments: "Pièces jointes",
    },
    feedbackComposer: {
      field: "Écrire un commentaire",
      placeholder: "Écrire un commentaire…",
      send: "Envoyer",
      sendHint: (modifier) => `${modifier} + Entrée pour envoyer`,
      sendHintEnter: "Entrée pour envoyer, Maj + Entrée pour aller à la ligne",
    },
    // 0.27.0. "Retour" for feedback, as `feedbackDialog`; "reprise" for rework.
    feedbackStatus: {
      OPEN: "Ouvert",
      IN_PROGRESS: "En cours",
      IN_EVALUATION: "En évaluation",
      NEEDS_LIVE_TEST: "À tester en production",
      POSTPONED: "Reporté",
      DONE: "Terminé",
      WONT_DO: "Ne sera pas traité",
    },
    feedbackCategory: {
      CRASH: "Plantage",
      BUG: "Bug",
      IDEA: "Idée",
      QUESTION: "Question",
      OTHER: "Autre",
    },
    feedbackToast: {
      submitted: "Merci pour votre retour\u202f!",
      submitFailed: "Impossible d’envoyer le retour",
      attachmentUnsupported: "Seuls les images, les PDF et les fichiers texte sont acceptés",
      attachmentTooLarge: "Le fichier dépasse 10\u00a0Mo",
      attachmentTooMany: (count) =>
        `Il n’y a de place que pour ${n(count)} ${plural(count, "pièce jointe", "pièces jointes")} — les autres ont été écartées.`,
      captureFailed: "Impossible de capturer l’écran",
      updateFailed: "La modification n’a pas pu être enregistrée.",
      statusChanged: (status, title) => `Passé à «\u202f${status}\u202f»\u00a0: ${title}`,
      statusUndo: "Annuler",
      statusRestored: (status, title) => `Revenu à «\u202f${status}\u202f»\u00a0: ${title}`,
    },
    feedbackMenu: {
      trigger: "Envoyer un retour",
      myFeedback: "Mes retours",
      viewFeedback: "Voir les retours",
    },
    feedbackContext: {
      user: "Utilisateur",
      attachUrl: "Joindre l’URL de la page actuelle",
    },
    feedbackPage: {
      title: "Retours",
      myTitle: "Mes retours",
      columnId: "#",
      columnDate: "Date",
      columnCategory: "Catégorie",
      columnSubject: "Objet",
      columnUser: "Utilisateur",
      columnEmail: "E-mail",
      columnUrl: "URL",
      columnStatus: "Statut",
      columnResolved: "Résolu le",
      openPage: "Ouvrir la page",
      empty: "Aucun",
      deletedUser: "<utilisateur supprimé>",
      // An id, not a count: printed as it is, like the "#" column.
      userFallback: (id) => `utilisateur #${id}`,
      environment: (environment) => String(environment ?? "").toUpperCase(),
      reworkChip: (count) => (count === 1 ? "Reprise" : `Reprise ×${n(count)}`),
      awaitingFilter: "Seulement ce qui vous attend",
      phoneActions: "Actions sur les retours",
    },
    feedbackDetail: {
      body: "Description",
      edit: "Modifier",
      editDescription: "Modifier la description",
      save: "Enregistrer",
      cancel: "Annuler",
      url: "URL",
      copyUrl: "Copier l’URL",
      attachment: "Pièce jointe",
      download: (name) => `Télécharger ${name}`,
      downloadFailed: "La pièce jointe n’a pas pu être téléchargée.",
      outcome: "Résultat",
      resolvedAt: (date) => `Résolu le ${date}`,
      outcomeAdd: "Ajouter un résultat",
      outcomeUpdate: "Mettre à jour",
      outcomePlaceholder: "Ce qui a été fait ou décidé, ou pourquoi ce point ne sera pas traité.",
      rework: "Reprise",
      openPage: "Ouvrir la page",
      reworkTitle: "Renvoyer pour reprise",
      reworkSend: "Demander la reprise",
      reworkPlaceholder:
        "Que faut-il encore affiner\u202f? Nouvelles contraintes ou changement de cap éventuels.",
      reworkUploadFailed: "Le fichier n’a pas pu être envoyé. La demande de reprise n’a pas été transmise.",
      status: "Statut",
    },
    accountSettings: {
      profile: {
        title: "Profil",
        email: "E-mail",
        role: "Rôle",
        memberSince: "Membre depuis",
        displayName: "Nom affiché",
        save: "Enregistrer",
      },
      password: {
        title: "Changer le mot de passe",
        current: "Mot de passe actuel",
        next: "Nouveau mot de passe",
        confirm: "Confirmer le nouveau mot de passe",
        submit: "Changer le mot de passe",
        tooShort: "Le nouveau mot de passe est trop court.",
        mismatch: "Les mots de passe ne correspondent pas.",
      },
      twoFactor: {
        status: "Authentification à deux facteurs",
        enabledText: "Activée",
        disabledText: "Désactivée",
        enable: "Configurer l’authentification à deux facteurs",
        scanHint:
          "Scannez ce code avec votre application d’authentification, puis saisissez le code affiché.",
        codeLabel: "Code de vérification",
        verify: "Vérifier et activer",
        disableSection: "Désactiver l’authentification à deux facteurs",
        password: "Mot de passe actuel",
        disable: "Désactiver",
        qrAlt: "Code QR pour votre application d’authentification",
        secretHint: "Impossible de le scanner\u202f? Saisissez plutôt cette clé dans l’application\u00a0:",
        copySecret: "Copier la clé",
      },
      passkeys: {
        title: "Clés d’accès",
        description:
          "Connectez-vous avec votre empreinte, votre visage ou le code PIN de l’appareil plutôt qu’avec un mot de passe.",
        descriptionAlongside:
          "Connectez-vous avec votre empreinte, votre visage ou le code PIN de l’appareil. Votre mot de passe reste valable.",
        empty: "Aucune clé d’accès pour l’instant",
        loading: "Chargement des clés d’accès…",
        list: "Vos clés d’accès",
        nameLabel: "Nom (facultatif)",
        namePlaceholder: "p. ex. Portable, Téléphone",
        add: "Ajouter une clé d’accès",
        adding: "En attente de l’appareil…",
        rename: "Renommer",
        renameItem: (name) => `Renommer ${name}`,
        renameField: (name) => `Nouveau nom pour ${name}`,
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        deleteItem: (name) => `Supprimer ${name}`,
        deleteConfirm: (name) =>
          `Supprimer «\u202f${name}\u202f»\u202f? Elle ne permettra plus de se connecter.`,
        confirmDelete: "Supprimer la clé d’accès",
        created: (date) => `Ajoutée le ${date}`,
        lastUsed: (date) => `Dernière utilisation le ${date}`,
        neverUsed: "Jamais utilisée",
      },
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
      opensInNewTab: "s’ouvre dans un nouvel onglet",
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
      empty: "Aucune entrée",
      actions: "Actions",
      edit: "Modifier",
      delete: "Supprimer",
      booleanTrue: "Oui",
      booleanFalse: "Non",
      booleanUnset: "Non défini",
      sortBy: "Trier par",
      sortDefault: "Ordre par défaut",
      sortAscending: "Croissant",
      sortDescending: "Décroissant",
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
    calendarHeatmap: {
      grid: "Valeurs quotidiennes",
      day: (date, value) => `${date} : ${value}`,
      less: "Moins",
      more: "Plus",
      truncated: (count) =>
        `Affichage des jours les plus récents ; ${n(count)} ${count === 1 ? "jour antérieur n’est pas affiché" : "jours antérieurs ne sont pas affichés"}.`,
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
      previousMonth: "Mois précédent",
      nextMonth: "Mois suivant",
      today: "Aujourd’hui",
      yearPanel: "Choisir une année",
      earlierYears: "Années précédentes",
      laterYears: "Années suivantes",
      thisYear: "Cette année",
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
      acknowledge: "J’ai lu ce que fait cette action et je souhaite continuer.",
      needsPhrase: (phrase) => `Saisissez «\u202f${phrase}\u202f» pour confirmer`,
      needsAcknowledge: "Cochez la case pour confirmer",
      needsPassword: "Saisissez votre mot de passe pour confirmer",
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
    bulkActionBar: {
      selected: (count) => `${n(count)} ${count === 1 ? "sélectionné" : "sélectionnés"}`,
      clear: "Effacer la sélection",
      cleared: "Sélection effacée",
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
      done: "Terminé",
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
      clear: "Effacer la recherche",
      submit: "Rechercher",
      close: "Fermer",
      placeholder: "Rechercher…",
      empty: "Aucun résultat",
      loading: "Recherche…",
      dialog: "Recherche",
      error: "La recherche a échoué. Réessayez.",
    },
    globalSearch: {
      trigger: "Rechercher",
      placeholder: "Rechercher ou aller à…",
      shortcut: (keys) => `Rechercher (${keys})`,
      suggestions: "Essayez",
      results: "Résultats",
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
      points: "Valeurs du graphique",
    },
    pieChart: {
      slices: "Secteurs du graphique",
      slice: (label, value, percent) => `${label}\u00a0: ${value} (${percent})`,
      total: "Total",
      empty: "Aucune donnée",
      legend: "Catégories",
    },
    confirmDialog: {
      confirm: "Confirmer",
      cancel: "Annuler",
      typed: (text) => `Saisissez «\u202f${text}\u202f» pour confirmer`,
    },
    floatingPanel: {
      close: "Fermer",
      badge: (count) => `${n(count)} ${plural(count, "nouveau", "nouveaux")}`,
    },
    copyButton: {
      copy: "Copier",
      copied: "Copié",
      failed: "Échec de la copie",
      copiedAnnouncement: "Copié dans le presse-papiers",
      failedAnnouncement: "Impossible de copier dans le presse-papiers",
    },
    list: {
      unread: "Non lu",
      opensInNewTab: "s’ouvre dans un nouvel onglet",
    },
    breadcrumbs: {
      label: "Fil d’Ariane",
      showAll: "Afficher le chemin complet",
    },
    toast: {
      close: "Fermer la notification",
      notifications: "Notifications",
      undo: "Annuler",
      redo: "Rétablir",
    },
    form: {
      save: "Enregistrer",
      cancel: "Annuler",
      submitShortcut: (apple) => (apple ? "⌘ Entrée" : "Ctrl+Entrée"),
    },
    descriptionList: {
      empty: "—",
    },
    lineItems: {
      add: "Ajouter une ligne",
      remove: (row) => `Supprimer la ligne ${row}`,
      confirmRemove: (row) => `Supprimer la ligne ${row}\u202f? Appuyez de nouveau pour confirmer`,
      row: (row) => `Ligne ${row}`,
      cell: (column, row) => `${column}, ligne ${row}`,
      totals: "Total",
    },
    progressBar: {
      unlimited: "Illimité",
      overLimit: (amount) => `${amount} au-delà de la limite`,
    },
    signedAmount: {
      positive: (amount) => `plus ${amount}`,
      negative: (amount) => `moins ${amount}`,
    },
    errorBoundary: {
      title: "Une erreur s’est produite",
      message: "Cette partie de la page n’a pas pu s’afficher. Réessayez ou rechargez la page.",
      retry: "Réessayer",
      details: "Détails de l’erreur",
      reload: "Recharger",
      updateTitle: "Une nouvelle version est disponible",
      updateMessage: "Une partie de l’application a changé depuis le chargement de cette page. Rechargez-la pour obtenir la nouvelle version.",
      offlineTitle: "Vous êtes hors ligne",
      offlineMessage: "Cette page n’a pas pu être chargée sans connexion. Reconnectez-vous, puis rechargez la page.",
      copyReport: "Copier le rapport d’erreur",
      reported: "L’erreur a été signalée automatiquement.",
      reportedAs: (reference) => `Signalée sous la référence ${reference}`,
    },
    authedImage: {
      loading: "Chargement de l’image…",
      loadError: "Impossible de charger l’image",
      failedImage: (alt) => `${alt} : impossible de charger l’image`,
    },
    imageGrid: {
      list: "Images",
      item: (index, count) => `Image ${n(index)} sur ${n(count)}`,
      actions: (name) => `Actions pour ${name}`,
    },
    lightbox: {
      dialog: "Visionneuse d’images",
      close: "Fermer",
      previous: "Image précédente",
      next: "Image suivante",
      counter: (index, count) => `${n(index)} / ${n(count)}`,
      position: (index, count) => `Image ${n(index)} sur ${n(count)}`,
      download: "Télécharger",
      zoom: "Agrandir",
      noPreview: "Aucun aperçu disponible pour ce fichier",
      openInNewTab: "Ouvrir dans un nouvel onglet",
    },
    writeLock: {
      reason: "Vous pouvez consulter ceci, mais pas le modifier.",
    },
    accountState: {
      // Agreeing with "compte" (masculine): the chip is the state of an account.
      active: "Actif",
      inactive: "Inactif",
      invited: "Invité",
      registered: "Inscrit",
      unverified: "Non vérifié",
      passwordChange: "Doit changer de mot de passe",
    },
    shareCard: {
      dialogTitle: "Partager",
      close: "Fermer",
      email: "Adresse e-mail",
      emailOptional: "Adresse e-mail (facultatif)",
      // example.com is reserved for examples (RFC 2606); a localised domain is real.
      emailPlaceholder: "nom@example.com",
      invalidEmail: "Saisissez une adresse e-mail complète.",
      role: "Rôle",
      roleOf: (name) => `Rôle de ${name}`,
      add: "Partager",
      whoHasAccess: "Qui a accès",
      nobodyYet: "Personne d’autre n’y a encore accès.",
      pending: "En attente",
      openInvite: "Lien d’invitation ouvert",
      copyLink: "Copier le lien",
      team: "Équipe",
      teamHint: (name) => `Tous les membres de ${name} y auront accès.`,
      remove: "Retirer l’accès",
      removeConfirm: (name) => `Retirer l’accès de ${name}\u202f?`,
      revokePending: "Révoquer l’invitation",
      revokePendingConfirm: (name) => `Révoquer l’invitation de ${name}\u202f?`,
      failed: "Cela n’a pas fonctionné. Veuillez réessayer.",
      loading: "Chargement…",
    },
    reauthDialog: {
      title: "Confirmez votre identité",
      description: "Saisissez votre mot de passe actuel pour continuer.",
      password: "Mot de passe actuel",
      submit: "Continuer",
      cancel: "Annuler",
    },
    serverWake: {
      slow: "Chargement en cours — cela prend plus de temps que d’habitude.",
      waking: (appName) =>
        `Le serveur se met en veille quand personne n’utilise ${appName ?? "l’application"}, donc la première requête après une pause doit le redémarrer. Cela peut prendre un moment — rien n’est perdu, la page se remplira d’elle-même.`,
    },
    // 0.28.0 — docs/legal-harmonization.md §4.3/§4.4: keksdose's reviewed French, and
    // Kurvenschmiede's for the browser section and the beta notice; spaced as this
    // catalogue writes it (\u00a0 before ":", \u202f before ";" and inside « »).
    legal: {
      // Not keksdose's "Mentions légales": that is the Imprint link's label, and a screen
      // reader would read it twice (§4.4).
      navLabel: "Informations légales",
      links: {
        impressum: "Mentions légales",
        privacy: "Confidentialité",
        terms: "Conditions d’utilisation",
      },
      titles: {
        impressum: "Mentions légales",
        privacy: "Politique de confidentialité",
        terms: "Conditions d’utilisation",
      },
      backHome: "Retour à l’accueil",
      accept: "J’accepte les {terms} et la {privacy}",
      notice: {
        beta: "Bêta fermée. Ces textes n’ont pas encore été relus par un avocat et le seront avant un lancement public.",
        privacy:
          "Bêta fermée. Les formulations juridiques ci-dessous n’ont pas encore été relues par un avocat\u202f; cela sera fait avant un lancement public. Les descriptions techniques — ce qui est stocké, où, et qui peut le lire — décrivent ce que fait réellement le logiciel aujourd’hui et sont faites pour être vérifiées par rapport à lui.",
      },
      translation: {
        note: (o) =>
          `Ceci est une traduction fournie pour votre commodité. Seule la version en ${o.bindingLanguage} fait foi.`,
        show: (o) => `Afficher la version en ${o.bindingLanguage}`,
      },
      sections: {
        impressum: {
          operator: {
            title: "Exploitant",
            body: (o) =>
              `${o.name}\n${o.postalCode} ${o.city}\n${o.country}\n\nL’adresse postale complète est communiquée sur demande à toute personne ayant un intérêt juridique légitime\u202f; écrivez à l’adresse de contact ci-dessous.`,
          },
          contact: {
            title: "Contact",
            body: (o) => `E-mail\u00a0: ${o.email}`,
          },
          disclaimer: {
            title: "Responsabilité pour les contenus et les liens",
            body: "Il s’agit d’un projet privé et non commercial, proposé dans le cadre d’une bêta fermée, sans garantie. Les sites externes vers lesquels nous renvoyons relèvent de la responsabilité de leurs exploitants respectifs\u202f; nous n’avons aucun contrôle sur leur contenu.",
          },
        },
        privacy: {
          controller: {
            title: "Responsable du traitement",
            body: (o) =>
              `Le responsable du traitement des données personnelles dans ce service est\u00a0:\n${o.name}\n${o.postalCode} ${o.city}, ${o.country}\nE-mail\u00a0: ${o.email}\n\nL’adresse postale complète est communiquée sur demande aux personnes concernées et aux autorités de surveillance.`,
          },
          legal_basis: {
            title: "Base légale",
            body: "L’exploitant étant établi en Suisse, le traitement est régi par la loi fédérale suisse sur la protection des données (LPD). Lorsque le Règlement général sur la protection des données de l’UE (RGPD) vous est applicable, nous nous fondons sur l’exécution d’un contrat pour fournir le service (art. 6, par. 1, let. b RGPD) et sur notre intérêt légitime à l’exploiter et à le sécuriser (art. 6, par. 1, let. f RGPD).",
          },
          browser: {
            title: "Ce que votre navigateur enregistre",
            lead: "Aucun cookie. L’app conserve les éléments suivants dans le stockage de votre navigateur\u00a0:",
            tail: "Rien de tout cela ne sert à vous suivre. Les éléments en attente d’envoi nous sont transmis dès que possible\u202f; tout le reste demeure sur votre appareil. Tout cela disparaît lorsque vous effacez les données du site, et la déconnexion supprime les jetons de connexion.",
          },
          rights: {
            title: "Vos droits",
            lead: "Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, de portabilité des données et d’opposition.",
            tail: "Si vous êtes en Suisse, vous pouvez vous adresser au Préposé fédéral à la protection des données et à la transparence (PFPDT)\u202f; si vous êtes dans l’UE, vous pouvez déposer une plainte auprès de votre autorité de surveillance locale.",
          },
          contact: {
            title: "Contact pour la protection des données",
            body: (o) => `Pour toute demande relative à la confidentialité, contactez\u00a0: ${o.email}`,
          },
        },
        terms: {
          warranty: {
            title: "Absence de garantie",
            body: "Le service est fourni «\u202ftel quel\u202f» et «\u202fselon disponibilité\u202f», sans garantie d’aucune sorte dans la mesure permise par la loi. En tant que bêta, il peut contenir des erreurs, changer ou être interrompu à tout moment — conservez vos propres sauvegardes des données importantes.",
          },
          liability: {
            title: "Limitation de responsabilité",
            body: "Dans la mesure permise par le droit applicable, l’exploitant n’est pas responsable des dommages indirects ou consécutifs résultant de l’utilisation ou de l’impossibilité d’utiliser le service. Rien ici ne limite une responsabilité qui ne peut pas être limitée par la loi.",
          },
          changes: {
            title: "Modifications des présentes conditions",
            body: "Ces conditions peuvent être mises à jour au fil de l’évolution du service. Les modifications importantes seront annoncées par e-mail ou dans l’app\u202f; continuer à utiliser le service après une modification vaut acceptation.",
          },
          language: {
            title: "Langue",
            body: (o) =>
              `Les présentes conditions sont rédigées en ${o.bindingLanguage}. Les traductions dans d’autres langues sont fournies à titre indicatif uniquement\u202f; en cas de divergence, la version en ${o.bindingLanguage} prévaut.`,
          },
          law: {
            title: "Droit applicable",
            body: (o) =>
              `Les présentes conditions sont régies par le droit suisse, à l’exclusion de ses règles de conflit de lois. Dans la mesure où la loi le permet, le for est ${o.city} (${o.region}), ${o.country}.`,
          },
        },
      },
    },
    // 0.29.0 — docs/auth-harmonization.md: keksdose's reviewed French (auth.*,
    // verify_email, error.not_found_*, budget_share.join_*), kastlan's for the names and
    // the 2FA prompt; written fresh where neither app had the sentence. Spaced as this
    // catalogue writes it (\u00a0 before ":", \u202f before "?" and ";"), "l’application"
    // where keksdose writes "l’app".
    signIn: {
      email: "E-mail",
      password: "Mot de passe",
      submit: "Se connecter",
      passkey: "Se connecter avec une clé d’accès",
      forgotPassword: "Mot de passe oublié\u202f?",
      noAccount: "Pas encore de compte\u202f?",
      register: "Créer un compte",
      invalidCredentials: "L’adresse e-mail ou le mot de passe est incorrect.",
      failed: "Échec de la connexion. Veuillez réessayer.",
      passkeyFailed: "Échec de la connexion par clé d’accès.",
      deactivatedHint: "Compte désactivé\u202f? Écrivez à {contact}.",
      // "Compte créé avec…" rather than "Inscrit avec…", which would need a gender.
      tagHint: (taggedAddress) =>
        `Compte créé avec ${taggedAddress}\u202f? Utilisez cette adresse.`,
      twoFactorTitle: "Authentification à deux facteurs",
      twoFactorIntro: "Saisissez le code affiché par votre application d’authentification.",
      code: "Code 2FA",
      verify: "Vérifier",
      codeInvalid: "Code 2FA invalide.",
      setPasswordTitle: "Choisir un nouveau mot de passe",
      setPasswordIntro:
        "Un nouveau mot de passe a été demandé pour ce compte. Choisissez-en un et vous êtes aussitôt de retour.",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Répéter le nouveau mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      setPasswordSubmit: "Définir le mot de passe et se connecter",
      setPasswordFailed: "Le mot de passe n’a pas pu être défini.",
      expired: "Cette connexion a expiré. Veuillez vous reconnecter.",
      backToSignIn: "Retour à la connexion",
    },
    register: {
      firstName: "Prénom",
      lastName: "Nom",
      email: "E-mail",
      emailTagUse: (address) => `Utiliser ${address}`,
      emailTagHint:
        "Beaucoup de fournisseurs livrent nom+tag@… dans la même boîte, ce qui rend le courrier de cette application filtrable et traçable. Vérifiez que le vôtre le fait avant de vous y fier\u00a0: vous vous connecteriez avec l’adresse marquée.",
      invitedEmailHint: "L’adresse à laquelle votre invitation a été envoyée.",
      invitedTagNote: "L’adresse marquée reçoit son propre e-mail de confirmation.",
      password: "Mot de passe",
      confirmPassword: "Répéter le mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      language: "Langue",
      submit: "Créer un compte",
      haveAccount: "Déjà un compte\u202f?",
      signIn: "Se connecter",
      emailTaken: "Un compte existe déjà avec cette adresse e-mail.",
      registrationClosed:
        "Les nouveaux comptes ne sont créés que sur invitation. Demandez à l’exploitant d’inviter votre adresse e-mail.",
      invitationInvalid: "Ce lien d’invitation n’est pas valide.",
      invitationExpired: "Cette invitation a expiré. Demandez-en une nouvelle.",
      failed: "Échec de l’inscription. Veuillez réessayer.",
    },
    completeName: {
      title: "Complétez votre nom",
      description:
        "Le prénom et le nom sont désormais demandés séparément. Vérifiez ce qui est déjà rempli et ajoutez ce qui manque.",
      firstName: "Prénom",
      lastName: "Nom",
      save: "Enregistrer",
      later: "Plus tard",
      failed: "Votre nom n’a pas pu être enregistré. Veuillez réessayer.",
    },
    forgotPassword: {
      title: "Mot de passe oublié",
      intro:
        "Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.",
      email: "E-mail",
      submit: "Envoyer le lien",
      sent: (email) => `S’il existe un compte pour ${email}, le lien est en route.`,
      sentHint:
        "Le lien est valable une heure et ne fonctionne qu’une seule fois. Vérifiez aussi votre dossier de courrier indésirable.",
      backToSignIn: "Retour à la connexion",
      error: "La demande a échoué. Veuillez réessayer plus tard.",
    },
    resetPassword: {
      title: "Choisir un nouveau mot de passe",
      checking: "Vérification du lien…",
      intro: (email) => `Vous définissez un nouveau mot de passe pour ${email}.`,
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Répéter le nouveau mot de passe",
      mismatch: "Les mots de passe ne correspondent pas.",
      submit: "Enregistrer le mot de passe",
      failed: "Le mot de passe n’a pas pu être changé.",
      noToken: "Ce lien est incomplet.",
      invalid: "Ce lien est invalide ou a expiré.",
      invalidHint:
        "Les liens sont valables une heure et ne fonctionnent qu’une fois. Demandez simplement un nouveau lien.",
      requestNew: "Demander un nouveau lien",
      success: "Votre mot de passe a été changé. Vous pouvez vous connecter avec dès maintenant.",
      sessionsEnded: "Les appareils connectés ont été déconnectés — vous devrez vous y reconnecter.",
      signIn: "Aller à la connexion",
    },
    verifyEmail: {
      title: "Confirmez votre adresse e-mail",
      verifying: "Confirmation…",
      verified: "Votre adresse e-mail est confirmée.",
      continue: "Continuer",
      invalid: "Ce lien de confirmation n’est pas valide",
      expired: "Ce lien de confirmation a expiré",
      noToken: "Ce lien n’a pas de jeton de confirmation.",
      invalidHint: "Le lien a peut-être expiré ou déjà été utilisé.",
      requestInApp: "Vous pouvez en demander un nouveau depuis l’application.",
      requestHere: "Vous pouvez en demander un nouveau ici.",
      resend: "Envoyer à nouveau",
      resendIn: (seconds) => `Envoyer à nouveau dans ${n(seconds)}\u00a0s`,
      resent: "E-mail de confirmation envoyé",
      resendError: "Impossible d’envoyer l’e-mail de confirmation",
      banner: "Veuillez confirmer votre adresse e-mail.",
      dismiss: "Pas maintenant",
    },
    notFound: {
      title: "Page introuvable",
      body: "Cette adresse n’existe pas (ou plus). Peut-être une faute de frappe, ou la page a été déplacée.",
      home: "Aller à la page d’accueil",
      app: "Retour à l’application",
    },
    acceptInvitation: {
      title: "Accepter l’invitation",
      accepting: "Acceptation de l’invitation…",
      accepted: "Invitation acceptée.",
      joined: (name) => `Vous avez rejoint ${name}.`,
      continue: "Continuer",
      invalid: "Impossible de rejoindre avec ce lien",
      expired: "Cette invitation a expiré",
      noToken: "Ce lien n’a pas de jeton d’invitation.",
      // Without "qui vous a invité(e)", which would need a gender.
      askAgain: "Demandez une nouvelle invitation à la personne qui vous l’a envoyée.",
      signInFirst: "Connectez-vous pour accepter cette invitation",
      signInHint: "Utilisez le compte auquel l’invitation a été envoyée.",
      signIn: "Se connecter",
      register: "Créer un compte",
    },
    companySwitcher: {
      switchCompany: "Changer d’entreprise",
      heading: "Entreprises",
      current: (name) => `Entreprise\u00a0: ${name}`,
      // Agreeing with "entreprise" (feminine).
      currentMark: "(actuelle)",
      switching: "Changement d’entreprise…",
    },
    characterCount: {
      count: (used, max) => `${n(used)} sur ${n(max)} ${plural(max, "caractère", "caractères")}`,
      remaining: (left) => `${n(left)} ${plural(left, "caractère restant", "caractères restants")}`,
      limitReached: "Limite de caractères atteinte",
    },
    countrySelect: {
      country: "Pays",
      search: "Rechercher un pays",
      others: "Autres pays",
    },
    inlineEdit: {
      edit: (label) => `Modifier ${label}`,
      failed: "La modification n’a pas pu être enregistrée.",
      empty: "Vide",
    },
    ibanInput: {
      format: "Un IBAN commence par un code pays de deux lettres et deux chiffres de contrôle.",
      country: (code) => `«\u202f${code}\u202f» n’est pas le code pays d’un IBAN.`,
      length: (actual, expected) =>
        `Un IBAN de ce pays compte ${n(expected)} caractères — celui-ci en compte ${n(actual)}.`,
      checksum: "Les chiffres de contrôle ne correspondent pas — un caractère est sans doute mal saisi.",
      qrRequired: "Ceci est un IBAN ordinaire. Une QR-facture exige le QR-IBAN du compte.",
      qrNotAllowed:
        "Ceci est un QR-IBAN, qui ne reçoit que des paiements par QR-facture. Saisissez l’IBAN ordinaire du compte.",
    },
    phoneInput: {
      countryCode: "Indicatif du pays",
      other: "Autre",
    },
    signChip: {
      outflow: "Sortie",
      inflow: "Entrée",
      direction: (current, next) => `Sens\u00a0: ${current} — passer à ${next}`,
    },
    columnMapper: {
      paste: "Coller un tableau",
      pasteHint:
        "Copiez les lignes d’un tableur et collez-les ici, ou déposez un fichier CSV ou texte.",
      chooseFile: "Choisir un fichier",
      readError: (name) => `«\u202f${name}\u202f» n’a pas pu être lu`,
      headerRow: "La première ligne contient les noms des colonnes",
      summary: (columns, rows) =>
        `${n(columns)} ${plural(columns, "colonne", "colonnes")}, ${n(rows)} ${plural(rows, "ligne", "lignes")}`,
      // Fragments of the summary line. "Séparé par…" would have to agree with a noun the
      // line does not name, so the separator is stated as a value.
      separatorSemicolon: "séparateur\u00a0: point-virgule",
      separatorComma: "séparateur\u00a0: virgule",
      separatorTab: "séparateur\u00a0: tabulation",
      separatorSpace: "séparateur\u00a0: espace",
      // The examples stay as written: they show the convention, not the reader's locale.
      decimalComma: "virgule décimale (1,5)",
      decimalPoint: "point décimal (1.5)",
      unreadCount: (count) =>
        count < 2
          ? `${n(count)} ligne n’a pas pu être lue`
          : `${n(count)} lignes n’ont pas pu être lues`,
      unreadLine: (line) => `La ligne ${line} n\u2019a pas pu être lue`,
      unreadMore: (count) => `…et ${n(count)} ${plural(count, "autre", "autres")}`,
      noRows: "Aucune ligne de ce texte ne se lit comme une ligne du tableau.",
      table: "Colonnes et leurs rôles",
      columnN: (column) => `Colonne ${column}`,
      roleOf: (column) => `Que contient la colonne «\u202f${column}\u202f»\u202f?`,
      ignore: "Ignorer",
      requiredRole: (role) => `${role} (obligatoire)`,
      requiredRoleShort: (role) => `${role} *`,
      previewOf: (shown, total) =>
        shown < 2
          ? `La première ligne sur ${n(total)}`
          : `Les ${n(shown)} premières lignes sur ${n(total)}`,
      // `roles` arrives joined with "ou" ("Débit ou Crédit").
      oneOf: (roles) => `${roles} (au choix)`,
      missing: (roles) => `Il manque encore\u00a0: ${roles}.`,
    },
    translationReview: {
      statusMissing: "Manquant",
      statusUnreviewed: "Non relu",
      statusChanged: "Modifié depuis la relecture",
      statusNeedsChange: "À modifier",
      statusApproved: "Approuvé",
      statusFilter: "Statut",
      all: "Tous",
      filterCount: (label, count) => `${label} · ${n(count)}`,
      source: "Textes",
      allSources: "Tous les textes",
      namespace: "Domaine",
      allNamespaces: "Tous les domaines",
      search: "Rechercher dans les clés et les textes",
      placeholdersOnly: (count) => `Seulement les problèmes d’espaces réservés (${n(count)})`,
      placeholderChip: "Espaces réservés",
      key: "Clé",
      statusColumn: "Statut",
      empty: "Aucun texte ne correspond à ces filtres.",
      missingText: "Manquant dans cette langue",
      progress: (approved, total) => `${n(approved)} sur ${n(total)} ${plural(approved, "approuvé", "approuvés")}`,
      localeProgress: (approved, total) => `${n(approved)}/${n(total)}`,
      locales: "Langues",
      approve: "Approuver",
      flag: "À modifier",
      suggest: "Proposer une traduction",
      reset: "Marquer comme non relu",
      cancel: "Annuler",
      approveSelected: "Approuver la sélection",
      resetSelected: "Marquer la sélection comme non relue",
      selectShown: "Sélectionner tout ce qui est affiché",
      changedSince: "Ce texte a été modifié après la relecture. Veuillez le relire.",
      reviewedWording: "Formulation lors de la relecture",
      reviewedReference: "Référence lors de la relecture",
      placeholderMismatch: (reference, text) =>
        `Les espaces réservés diffèrent de la référence — référence\u00a0: ${reference}\u202f; ce texte\u00a0: ${text}. L’application y insère des valeurs, ils doivent donc rester exactement tels quels.`,
      lastApproved: (name, date) => `Approuvé par ${name} le ${date}`,
      lastFlagged: (name, date) => `Signalé à modifier par ${name} le ${date}`,
      erasedReviewer: "un compte supprimé",
      suggestion: "Meilleure formulation",
      translation: "Traduction",
      note: "Remarque (facultatif)",
      notePlaceholder: "Ce qui ne va pas, ou ce qu’il faut garder en tête",
      readOnly: "Vous pouvez consulter cette langue, mais pas la relire.",
      scope: (areas) => `Votre relecture se limite à\u00a0: ${areas}.`,
      exportCorrections: (count) => `Exporter les corrections (${n(count)})`,
      failed: "Cela n’a pas fonctionné. Veuillez réessayer.",
      approvedToast: (count) => (count < 2 ? "Texte approuvé" : `${n(count)} textes approuvés`),
      clearedToast: (count) => (count < 2 ? "Texte marqué comme non relu" : `${n(count)} textes marqués comme non relus`),
      groupCount: (unreviewed, total) =>
        `${n(unreviewed)} non ${plural(unreviewed, "relu", "relus")} / ${n(total)}`,
      approveGroup: (count) => `Approuver les non relus (${n(count)})`,
      confirmGroup: (count, group) =>
        count < 2
          ? `Approuver le texte non relu de «\u202f${group}\u202f»\u202f?`
          : `Approuver les ${n(count)} textes non relus de «\u202f${group}\u202f», y compris ceux qui ne sont pas à l’écran\u202f?`,
    },
  };
}

export const UI_KIT_LABELS_FR: UiKitLabels = uiKitLabelsFr();
