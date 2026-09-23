import { formatFileSize } from "@eifi1/ui-kit";
import type { Dictionary } from "./types";

/**
 * French (France).
 *
 * Written against en.ts and the kit's `DEFAULT_*` labels key for key. Conventions a
 * reviewer should know:
 *
 *  1. TYPOGRAPHY. French spaces before high punctuation, and the space must not break:
 *     - before `:` a no-break space, written `\u00a0`;
 *     - before `;` `!` `?` and inside « guillemets » a NARROW no-break space, `\u202f`.
 *     Both are written as escapes rather than pasted raw: pasted, they are invisible
 *     characters a reviewer cannot tell from an ordinary space, and ESLint's
 *     `no-irregular-whitespace` rejects them inside template literals. The apostrophe is
 *     the typographic ’ throughout.
 *  2. APIs STAY ENGLISH. `TokenSet`, `PickerSheet`, `Recharts`, `hooks`, `tokens`.
 *  3. BUTTONS ARE INFINITIVES. Enregistrer, Annuler, Fermer, Réessayer — never
 *     "Enregistrez". Prose and announcements address the reader as "vous".
 *  4. PLURALS. French treats 0 and 1 as singular ("0 ligne", "1 ligne", "2 lignes"),
 *     hence `n < 2` rather than `n === 1` in the counted messages. Numbers go through
 *     `Intl.NumberFormat("fr-FR")`, which groups with a narrow no-break space.
 */
const num = new Intl.NumberFormat("fr-FR");
const n = (value: number) => num.format(value);
const plural = (count: number, one: string, many: string) => (count < 2 ? one : many);

export const fr: Dictionary = {
  tag: "fr-FR",
  name: "Français",
  country: "fr",
  dir: "ltr",

  chrome: {
    brand: "@eifi1/ui-kit",
    onThisPage: "Sur cette page",
    previous: "Précédent",
    next: "Suivant",
    notFoundTitle: "Page introuvable",
    notFoundHint: "Ce chemin ne correspond à aucun composant du kit.",
    backToStart: "Retour à la présentation",
    toggleTheme: "Changer de thème",
    palette: "Palette",
    language: "Langue",
    renderedFrom: "Vitrine @eifi1/ui-kit — rendue depuis src/, pas depuis dist/.",
    breadcrumb: "Fil d’Ariane",
    pagination: "Pagination",
    sidebarStyle: "Style de la barre latérale",
    sidebarFlyout: "Pages dans un menu déroulant",
    sidebarInline: "Pages listées dans la barre",
    contentsPosition: "Position du sommaire",
    positionStart: "À gauche",
    positionEnd: "À droite",
  },

  groups: {
    "Getting started": "Premiers pas",
    Foundations: "Fondations",
    Inputs: "Saisie",
    "Data display": "Affichage des données",
    Overlays: "Superpositions",
    // "Chrome" in the UI sense: the frame around the content, not the browser.
    "App chrome": "Cadre de l’application",
    API: "API",
  },

  pages: {
    overview: {
      title: "Présentation",
      blurb:
        "Ce qu’est @eifi1/ui-kit, les six couches qui le composent et comment lire une page de cette vitrine.",
    },
    foundations: {
      title: "Fondations",
      blurb:
        "Les valeurs avec lesquelles chaque composant peint, et la langue que chaque composant parle. Rien en dessous de cette couche ne code en dur une couleur ou un mot.",
    },
    tokens: {
      title: "Tokens",
      blurb:
        "Toutes les valeurs du TokenSet actif, en direct. Changez de thème ou de palette dans la barre du haut et regardez cette page bouger — ce qui ne bouge pas est codé en dur.",
    },
    palette: {
      title: "Générateur de palette",
      blurb:
        "Une couleur de marque en entrée, les deux thèmes en sortie — chaque rapport de contraste mesuré plutôt qu’affirmé, et chaque compromis nommé.",
    },
    localisation: {
      title: "Localisation",
      blurb:
        "Chaque texte affiché par le kit, sous la forme d’un seul arbre typé — et le provider qui transmet une traduction à tous les composants à la fois.",
    },
    inputs: {
      title: "Saisie",
      blurb:
        "Toutes les manières de saisir une valeur. Elles partagent une même anatomie — un libellé flottant, la valeur, une ligne d’aide en dessous — pour qu’un formulaire se lise d’un seul tenant.",
    },
    fields: {
      title: "Champs de texte",
      blurb:
        "Les champs de saisie, et les constantes de classes avec lesquelles une application compose ses propres champs.",
    },
    choices: {
      title: "Case à cocher, interrupteur et curseur",
      blurb:
        "Choisir plutôt que taper\u00a0: activé ou désactivé, une option parmi quelques-unes, une valeur sur une échelle.",
    },
    numbers: {
      title: "Nombres et montants",
      blurb:
        "La pile numérique : un champ numérique avec calculatrice, un champ dont la valeur est un nombre, le champ monétaire et ses tons, et le sélecteur de devise.",
    },
    dropdowns: {
      title: "Listes déroulantes et sélecteurs",
      blurb:
        "Combobox, sélection multiple, sélecteurs groupés et en feuille, et les primitives de liste déroulante sur lesquelles ils reposent.",
    },
    dates: {
      title: "Dates et heure",
      blurb:
        "Choisir un moment à toutes les échelles : un jour, une période, un mois, une heure.",
    },
    "field-sync": {
      title: "État de synchronisation",
      blurb:
        "État de synchronisation d\u2019un champ lié à une base de données, enregistré à la sortie du champ : la couleur du cadre et une icône en fin de champ indiquent modifié, enregistrement, enregistré ou échec — survolez le symbole d\u2019erreur pour en voir la raison.",
    },
    "signature-password": {
      title: "Signature et robustesse du mot de passe",
      blurb:
        "Recueillir une signature au stylet, au doigt ou à la souris — avec la saisie du nom en solution de repli — et indiquer à l’utilisateur la robustesse du mot de passe qu’il choisit.",
    },
    "data-display": {
      title: "Affichage des données",
      blurb:
        "Montrer des valeurs plutôt que les saisir\u00a0: les briques de base, le tableau et les graphiques.",
    },
    primitives: {
      title: "Primitives",
      blurb:
        "Boutons, cartes, onglets, bannières, avatars — les pièces à partir desquelles tout le reste est construit.",
    },
    "data-table": {
      title: "Tableau de données",
      blurb:
        "Le plus grand composant du kit\u00a0: tri, filtres, sélection, pagination, synchronisation avec l’URL et ses utilitaires purs.",
    },
    charts: {
      title: "Graphiques",
      blurb:
        "L’enveloppe de graphique thématisée au-dessus de Recharts, son système de couleurs, le graphique en tuiles (treemap) et le graphique de séries zoomable que partagent les applications.",
    },
    stats: {
      title: "Indicateurs et sparklines",
      blurb:
        "La tuile d’indicateur (KPI) que répète chaque tableau de bord — valeur, variation, tendance — et la minuscule courbe qui tient dans une cellule de tableau.",
    },
    overlays: {
      title: "Superpositions",
      blurb:
        "Tout ce qui flotte au-dessus de la page, et la temporisation unique qu’ils partagent tous en se fermant.",
    },
    dialogs: {
      title: "Dialogues et popovers",
      blurb:
        "Modale, dialogue plein écran, popover, menu au survol et info-bulle — plus la temporisation de fermeture commune.",
    },
    "tour-search-files": {
      title: "Visite, palette et fichiers",
      blurb:
        "La visite guidée, la palette de commandes, la zone de dépôt de fichiers et la ligne balayable.",
    },
    "app-chrome": {
      title: "Cadre de l’application",
      blurb:
        "Le cadre dans lequel vit une application, et les parcours que toute application répète\u00a0: paramètres, formulaires en plusieurs étapes, retours.",
    },
    shell: {
      title: "Structure",
      blurb: "Le cadre d’application que vous avez sous les yeux, démonté pièce par pièce.",
    },
    settings: {
      title: "Champs de paramètres",
      blurb:
        "Les lignes des paramètres du compte\u00a0: thème, langue, profil, mot de passe et authentification à deux facteurs.",
    },
    wizard: {
      title: "Assistant",
      blurb: "Le moteur en plusieurs étapes, son habillage et son étape de vérification.",
    },
    "feedback-compose": {
      title: "Retours — rédaction",
      blurb: "Le formulaire de signalement et son champ de pièces jointes.",
    },
    "feedback-inbox": {
      title: "Retours — boîte de réception",
      blurb:
        "Le vocabulaire de statuts partagé, la politique de transition, et les éléments dont est faite une boîte de réception.",
    },
    "hooks-lib": {
      title: "Hooks et lib",
      blurb:
        "Les exports non visuels\u00a0: les hooks observés en direct, et les utilitaires purs sous forme entrée → sortie.",
    },
    api: {
      title: "API",
      blurb:
        "Ce qui reste quand on retire les pixels : les hooks dont les composants sont faits, et les fonctions pures et constantes qu\u2019une application appelle directement.",
    },
    helpers: {
      title: "Fonctions et constantes",
      blurb:
        "Les fonctions et données derrière les champs, en entrée → résultat : le calcul de dates de @eifi1/ui-kit/dates, l\u2019évaluateur de la calculatrice, la table des devises et les constantes de classes dont on compose un champ sur mesure.",
    },
  },

  kit: {
    pageContents: { title: "Sur cette page" },
    common: {
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
      startSelected: (date) =>
        `Date de début\u00a0: ${date}. Choisissez une date de fin.`,
      rangeSelected: (from, to) =>
        `Période du ${from} au ${to} sélectionnée. Choisissez une date de début pour recommencer.`,
    },
    datePicker: {
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
      selectedCount: (count) =>
        `${n(count)} ${plural(count, "sélectionné", "sélectionnés")}`,
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
      atLimit: (max) =>
        `Limite de ${n(max)} ${plural(max, "élément", "éléments")} atteinte`,
      duplicate: (value) => `«\u202f${value}\u202f» figure déjà dans la liste`,
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
    swipeableRow: {
      actions: "Actions de la ligne",
    },
    file: {
      // The kit's own `Intl` unit formatting, pinned to this locale ("3,4 Mo").
      size: (bytes) => formatFileSize(bytes, "fr-FR"),
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
  },
};
