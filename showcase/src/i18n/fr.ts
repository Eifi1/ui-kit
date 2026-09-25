import { UI_KIT_LABELS_FR } from "@eifi1/ui-kit/i18n/fr";
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
    devicePreview: "Aperçu par taille d\u2019écran",
    previewHint:
      "La page aux trois tailles d\u2019écran les plus courantes, en direct : faites défiler et cliquez dans chaque cadre. Thème, palette et langue suivent la barre du haut.",
    phone: "Téléphone",
    tablet: "Tablette",
    desktop: "Ordinateur",
    searchPlaceholder: "Rechercher un composant, un exemple ou un besoin…",
    searchComponents: "Composants",
    searchExamples: "Exemples",
    searchNeeds: "De quoi avez-vous besoin\u202f?",
    searchPages: "Pages",
  },

  groups: {
    "Getting started": "Premiers pas",
    Foundations: "Fondations",
    Inputs: "Saisie",
    "Pickers & entry": "Sélecteurs et saisie",
    "Data display": "Affichage des données",
    Charts: "Graphiques",
    Overlays: "Superpositions",
    // "Chrome" in the UI sense: the frame around the content, not the browser.
    "App chrome": "Cadre de l’application",
    API: "API",
  },

  groupShort: {
    "Getting started": "Début",
    Foundations: "Tokens",
    "Pickers & entry": "Sélecteurs",
    "Data display": "Affichage",
    "App chrome": "Cadre",
  },

  pages: {
    overview: {
      title: "Présentation",
      short: "Présentation",
      blurb:
        "Ce qu’est @eifi1/ui-kit, les huit couches qui le composent et comment lire une page de cette vitrine.",
    },
    foundations: {
      title: "Fondations",
      blurb:
        "Les valeurs avec lesquelles chaque composant peint, et la langue que chaque composant parle. Rien en dessous de cette couche ne code en dur une couleur ou un mot.",
    },
    tokens: {
      title: "Tokens",
      short: "Tokens",
      blurb:
        "Toutes les valeurs du TokenSet actif, en direct. Changez de thème ou de palette dans la barre du haut et regardez cette page bouger — ce qui ne bouge pas est codé en dur.",
    },
    palette: {
      title: "Générateur de palette",
      short: "Palette",
      blurb:
        "Une couleur de marque en entrée, les deux thèmes en sortie — chaque rapport de contraste mesuré plutôt qu’affirmé, et chaque compromis nommé.",
    },
    localisation: {
      title: "Localisation",
      short: "Localisation",
      blurb:
        "Chaque texte affiché par le kit, sous la forme d’un seul arbre typé — et le provider qui transmet une traduction à tous les composants à la fois.",
    },
    inputs: {
      title: "Saisie",
      blurb:
        "Toutes les manières de taper ou de régler une valeur\u00a0: texte, choix, nombres, dates, fichiers, et l’adaptateur de formulaire qui les entoure. Elles partagent une même anatomie — un libellé flottant, la valeur, une ligne d’aide en dessous — pour qu’un formulaire se lise d’un seul tenant.",
    },
    fields: {
      title: "Champs de texte",
      short: "Texte",
      blurb:
        "Les champs de saisie, et les constantes de classes avec lesquelles une application compose ses propres champs.",
    },
    forms: {
      title: "Formulaires (react-hook-form)",
      short: "Formulaires",
      blurb:
        "L’adaptateur react-hook-form de @eifi1/ui-kit/rhf\u00a0: le libellé, le contrôle, la description et le message d’un champ reliés entre eux et à l’état du formulaire, avec des messages uniquement là où l’utilisateur peut les voir.",
    },
    choices: {
      title: "Choix",
      short: "Choix",
      blurb:
        "Activé ou désactivé, une option parmi quelques-unes, une valeur sur une échelle — et le choix d’une couleur, d’une icône ou d’une carte.",
    },
    numbers: {
      title: "Nombres et montants",
      short: "Nombres",
      blurb:
        "La pile numérique : un champ numérique avec calculatrice, un champ dont la valeur est un nombre, le champ monétaire et ses tons, et le sélecteur de devise.",
    },
    calendars: {
      title: "Calendriers et sélecteurs de date",
      short: "Calendriers",
      blurb:
        "Choisir un jour ou une période\u00a0: le calendrier lui-même, les sélecteurs de date et de période construits dessus, leurs préréglages et leurs bornes, et le premier jour de la semaine.",
    },
    "month-time": {
      title: "Mois et heure",
      short: "Mois et heure",
      blurb:
        "L’échelle la plus large et la plus fine\u00a0: un mois choisi seul, dans un champ ou entre des boutons de pas, et une heure de la journée.",
    },
    files: {
      title: "Fichiers",
      short: "Fichiers",
      blurb:
        "Choisir des fichiers\u00a0: un bouton qui ouvre le sélecteur ou l’appareil photo, la zone de dépôt, et des refus signalés là où l’utilisateur regarde, jamais dans une notification éphémère.",
    },
    pickers: {
      title: "Sélecteurs et saisie",
      blurb:
        "Choisir dans une liste plutôt que taper, et les saisies plus lourdes\u00a0: un tableau de mesures, un champ enregistré quand on le quitte, une signature, un mot de passe.",
    },
    comboboxes: {
      title: "Combobox",
      short: "Combobox",
      blurb:
        "Du texte libre avec des suggestions\u00a0: la combobox dont la valeur est ce qui a été tapé, et l’autocomplétion qui cherche pendant la frappe.",
    },
    "entity-pickers": {
      title: "Sélecteurs d’entités",
      short: "Entités",
      blurb:
        "Choisir un enregistrement par son identifiant\u00a0: des sélecteurs en forme de champ ou de bouton, des options fixes ou chargées, plusieurs à la fois, et les états invalide, erreur et désactivé qu’ils partagent.",
    },
    "dropdown-parts": {
      title: "Briques de liste déroulante",
      short: "Briques",
      blurb:
        "La sélection multiple, le sélecteur groupé et la feuille mobile — et les hooks et le panneau à partir desquels chaque liste déroulante du kit est construite.",
    },
    "measured-grid": {
      title: "Saisie de tableau",
      short: "Saisie de tableau",
      blurb:
        "Saisir un tableau de mesures : une grille de cellules au clavier, un bloc collé depuis un tableur et le même tableau en texte — des milliers de lignes, seules les visibles sont rendues.",
    },
    "field-sync": {
      title: "État de synchronisation",
      short: "Synchro",
      blurb:
        "État de synchronisation d\u2019un champ lié à une base de données, enregistré à la sortie du champ : la couleur du cadre et une icône en fin de champ indiquent modifié, enregistrement, enregistré ou échec — survolez le symbole d\u2019erreur pour en voir la raison.",
    },
    "signature-password": {
      title: "Signature, mot de passe et confirmation",
      short: "Signature",
      blurb:
        "Recueillir une signature — et afficher une signature enregistrée —, indiquer à l’utilisateur la robustesse de son mot de passe, et faire confirmer une action destructrice.",
    },
    "data-display": {
      title: "Affichage des données",
      blurb:
        "Montrer des valeurs plutôt que les saisir\u00a0: les briques de base, le retour et la progression, les listes, les arbres et le tableau.",
    },
    buttons: {
      title: "Boutons et surfaces",
      short: "Boutons",
      blurb:
        "Boutons, groupes de boutons, boutons-icônes, cartes, indicateurs de chargement et avatars — les pièces à partir desquelles tout le reste est construit.",
    },
    "chips-toggles": {
      title: "Puces et bascules",
      short: "Puces",
      blurb:
        "Les puces et le champ à puces, le groupe de bascules et les onglets — les petits contrôles qui choisissent une option parmi quelques-unes ou tiennent une courte liste.",
    },
    feedback: {
      title: "Retour et progression",
      short: "Progression",
      blurb:
        "Où en est une tâche, qu’un contenu arrive, qu’il n’y a rien ici et que quelque chose mérite d’être lu\u00a0: barres de progression et jauges, squelettes, états vides et bannières.",
    },
    "description-list": {
      title: "Liste de descriptions et tableau",
      short: "Listes et tableaux",
      blurb:
        "Des faits présentés sans aucune mécanique\u00a0: une liste de termes et de détails, un simple tableau statique, et le séparateur et la zone de défilement qui se placent entre les deux.",
    },
    "tree-view": {
      title: "Arborescence",
      short: "Arbre",
      blurb:
        "Une hiérarchie parcourue au clavier — un seul arrêt de tabulation, les flèches pour ouvrir et fermer, la recherche à la frappe — avec des enfants chargés à la demande, pilotée de l’extérieur, de droite à gauche, et sa ligne employée seule.",
    },
    "data-table": {
      title: "Tableau de données",
      short: "Tableau",
      blurb:
        "Le plus grand composant du kit, en entier\u00a0: tri, filtres, sélection et dépliage, pilotage depuis l’extérieur, tableau court sans pagination, remplissage d’un panneau, et sens de droite à gauche.",
    },
    "data-table-server": {
      title: "Tableau de données\u00a0: serveur, URL et mobile",
      short: "Serveur et mobile",
      blurb:
        "Le tableau quand tout ne lui appartient pas\u00a0: la vue conservée dans l’adresse, les lignes paginées par un serveur, et la mise en page mobile en cartes, groupes et actions de balayage.",
    },
    "data-table-parts": {
      title: "Tableau de données\u00a0: briques et utilitaires",
      short: "Briques du tableau",
      blurb:
        "Ce dont le tableau est fait, utilisable seul\u00a0: la pagination, le popover de filtre, l’arbre des libellés, et les utilitaires purs de tri, de filtre et d’URL.",
    },
    charts: {
      title: "Graphiques",
      blurb:
        "Des valeurs en images\u00a0: l’enveloppe thémée au-dessus de Recharts, le graphique en tuiles, le graphique de séries zoomable avec ses barres et ses aires, et la tuile d’indicateur.",
    },
    "chart-shell": {
      title: "Enveloppe de graphique",
      short: "Graphiques",
      blurb:
        "L’enveloppe de graphique thématisée au-dessus de Recharts — conteneur, info-bulle et légende — et le système de couleurs dans lequel puise chaque graphique du kit.",
    },
    "tile-chart": {
      title: "Graphique en tuiles",
      short: "Tuiles",
      blurb:
        "La treemap\u00a0: la part d’un tout en tuiles, avec des libellés qui tiennent et des tuiles cliquables — et l’exploration en profondeur, par un histogramme comme par les tuiles.",
    },
    "series-chart": {
      title: "Graphique de séries",
      short: "Séries",
      blurb:
        "Le graphique de séries zoomable que partagent les applications\u00a0: un axe par unité, une légende d’interrupteurs, un seul zoom pour une pile de graphiques, et les utilitaires en dessous.",
    },
    "series-chart-marks": {
      title: "Graphique de séries\u00a0: barres, aires et temps",
      short: "Barres et aires",
      blurb:
        "Le même graphique qui dessine des barres, des aires et des empilements, sur des catégories et sur le temps réel, avec des lignes de référence, des repères, des points et des clics — et une légende dont les couleurs ne bougent pas.",
    },
    stats: {
      title: "Indicateurs et sparklines",
      short: "Indicateurs",
      blurb:
        "La tuile d’indicateur (KPI) que répète chaque tableau de bord — valeur, variation, tendance — et la minuscule courbe qui tient dans une cellule de tableau.",
    },
    layout: {
      title: "Section repliable et cadre de dialogue",
      short: "Repliable",
      blurb:
        "Une section qui se replie, et le cadre en-tête, corps, actions que répète chaque boîte de dialogue.",
    },
    overlays: {
      title: "Superpositions",
      blurb:
        "Tout ce qui flotte au-dessus de la page, et la temporisation unique qu’ils partagent tous en se fermant.",
    },
    dialogs: {
      title: "Dialogues",
      short: "Dialogues",
      blurb:
        "La modale et le dialogue plein écran, l’appui sur le fond qui les ferme, et la temporisation de fermeture que partagent toutes les superpositions.",
    },
    "confirm-floating": {
      title: "Dialogue de confirmation et panneau flottant",
      short: "Confirmation",
      blurb:
        "La promesse qui remplace window.confirm — avec ses tons, ses propres mots et une file d’attente — et le panneau non modal ancré dans un coin derrière un bouton flottant.",
    },
    popovers: {
      title: "Popovers, menus et info-bulles",
      short: "Popovers",
      blurb:
        "Les superpositions ancrées à un déclencheur\u00a0: popover, menu au survol et info-bulle — retournés et contenus dans la fenêtre, mis en miroir de droite à gauche — et le placement pur qui les sous-tend.",
    },
    tour: {
      title: "Visite guidée",
      short: "Visite",
      blurb:
        "Une visite en projecteur sur la vraie page\u00a0: des étapes qui désignent n’importe quel élément par sélecteur, attendent un clic, exécutent du code avant, et survivent à une cible absente.",
    },
    "command-palette": {
      title: "Palette de commandes",
      short: "Commandes",
      blurb:
        "La palette ⌘K\u00a0: une liste de lieux et d’actions où chercher, ouverte par le raccourci n’importe où sur la page, avec des résultats qui peuvent arriver en retard.",
    },
    "swipeable-row": {
      title: "Ligne balayable",
      short: "Balayage",
      blurb:
        "Une ligne de liste qui dévoile ses actions quand on la fait glisser de côté — au doigt ou à la souris, par paliers, de droite à gauche — avec les mêmes actions accessibles au clavier.",
    },
    "app-chrome": {
      title: "Cadre de l’application",
      blurb:
        "Le cadre dans lequel vit une application, et les parcours que toute application répète\u00a0: paramètres, formulaires en plusieurs étapes, retours.",
    },
    shell: {
      title: "Structure",
      short: "Structure",
      blurb: "Le cadre d’application que vous avez sous les yeux, démonté pièce par pièce.",
    },
    settings: {
      title: "Champs de paramètres",
      short: "Paramètres",
      blurb:
        "Les lignes des paramètres du compte\u00a0: thème, langue, profil, mot de passe et authentification à deux facteurs.",
    },
    wizard: {
      title: "Assistant",
      short: "Assistant",
      blurb: "Le moteur en plusieurs étapes, son habillage et son étape de vérification.",
    },
    "feedback-compose": {
      title: "Retours — rédaction",
      short: "Rédaction",
      blurb: "Le formulaire de signalement et son champ de pièces jointes.",
    },
    "feedback-inbox": {
      title: "Retours — boîte de réception",
      short: "Réception",
      blurb:
        "Le vocabulaire de statuts partagé, la politique de transition, et les éléments dont est faite une boîte de réception.",
    },
    api: {
      title: "API",
      blurb:
        "Ce qui reste quand on retire les pixels : les hooks dont les composants sont faits, et les fonctions pures et constantes qu\u2019une application appelle directement.",
    },
    "hooks-lib": {
      title: "Hooks et lib",
      short: "Hooks",
      blurb:
        "Les exports non visuels\u00a0: les hooks observés en direct, et les utilitaires purs sous forme entrée → sortie.",
    },
    "clipboard-timing": {
      title: "Presse-papiers et temporisation",
      short: "Presse-papiers",
      blurb:
        "Une copie qui dit si elle a réussi, et l’attente jusqu’à la fin de la frappe\u00a0: le bouton de copie et son hook, et la valeur et le callback temporisés.",
    },
    helpers: {
      title: "Fonctions et constantes",
      short: "Fonctions",
      blurb:
        "Les fonctions et données derrière les champs, en entrée → résultat : le calcul de dates de @eifi1/ui-kit/dates, l\u2019évaluateur de la calculatrice, la table des devises et les constantes de classes dont on compose un champ sur mesure.",
    },
  },


  // The top-bar search's « De quoi avez-vous besoin ? » rows, as a French reader types
  // them: infinitives and plain nouns, lower case, no full stop.
  needs: {
    overview: [
      "débuter avec le kit",
      "organisation du kit",
      "lire une page du showcase",
      "comparer avec MUI",
      "installer et configurer",
    ],
    foundations: [
      "voir les design tokens",
      "couleurs et thèmes",
      "traduire tout le kit",
      "palette de la marque",
      "mode sombre",
    ],
    tokens: [
      "voir tous les tokens de couleur",
      "passer du thème clair au thème sombre",
      "changer la palette de couleurs",
      "garder le thème après un rechargement",
      "espacements, arrondis et ombres",
      "couleurs de texte et surfaces",
      "repérer les valeurs codées en dur",
    ],
    palette: [
      "générer une palette depuis une couleur de marque",
      "vérifier le contraste des couleurs",
      "couleurs pour les graphiques",
      "dégradé de couleurs accessible",
      "dériver les couleurs du mode sombre",
      "thème personnalisé à partir d’une couleur",
    ],
    localisation: [
      "traduire l’interface",
      "changer de langue",
      "traduction allemande",
      "allemand informel avec du",
      "orthographe suisse allemande",
      "trouver les libellés non traduits",
      "régler la locale des dates et des nombres",
      "fournir les libellés à tous les composants",
    ],
    inputs: [
      "voir tous les composants de saisie",
      "créer un formulaire",
      "saisir du texte, des nombres ou des dates",
      "mise en page des champs de formulaire",
      "choisir une valeur",
    ],
    fields: [
      "saisir du texte",
      "champ texte avec libellé flottant",
      "texte sur plusieurs lignes",
      "champ de recherche",
      "aide sous un champ",
      "afficher une erreur de validation",
      "liste déroulante",
      "vider un champ",
      "créer un champ sur mesure",
    ],
    forms: [
      "valider un formulaire",
      "utiliser react-hook-form",
      "messages d’erreur sous les champs",
      "champs obligatoires",
      "envoyer un formulaire",
      "relier un libellé à son champ",
      "formulaire avec schéma de validation",
    ],
    choices: [
      "activer ou désactiver un réglage",
      "cocher une case",
      "choisir parmi quelques options",
      "choisir une valeur avec un curseur",
      "choisir une couleur",
      "choisir une icône",
      "choisir entre des cartes",
      "sélectionner une plage avec un curseur",
    ],
    numbers: [
      "saisir un montant",
      "saisir un nombre",
      "choisir une devise",
      "calculatrice dans un champ",
      "nombre avec boutons plus et moins",
      "pavé numérique sur téléphone",
      "montants négatifs en rouge",
      "formater les nombres selon la locale",
    ],
    calendars: [
      "choisir une date",
      "choisir une période",
      "calendrier",
      "périodes prédéfinies comme le mois dernier",
      "limiter les dates sélectionnables",
      "premier jour de la semaine",
      "choisir une date de début et de fin",
      "revenir à aujourd’hui",
    ],
    "month-time": [
      "choisir un mois",
      "passer au mois précédent ou suivant",
      "saisir une heure",
      "choisir les heures et les minutes",
      "période de facturation mensuelle",
      "limiter l’heure à une plage",
    ],
    files: [
      "téléverser un fichier",
      "glisser-déposer des fichiers",
      "prendre une photo avec l’appareil",
      "choisir plusieurs fichiers",
      "n’accepter que les images ou les PDF",
      "refuser les fichiers trop lourds",
      "expliquer pourquoi un fichier est refusé",
    ],
    pickers: [
      "choisir dans une liste",
      "choisir un enregistrement",
      "saisir un tableau de valeurs",
      "enregistrer un champ en le quittant",
      "recueillir une signature",
      "vérifier la robustesse d’un mot de passe",
    ],
    comboboxes: [
      "filtrer une longue liste en tapant",
      "suggestions pendant la saisie",
      "autocomplétion depuis un serveur",
      "texte libre avec suggestions",
      "recherche pendant la saisie",
      "créer une nouvelle option",
      "combobox",
    ],
    "entity-pickers": [
      "choisir un enregistrement par identifiant",
      "choisir un client ou un contact",
      "sélectionner plusieurs enregistrements",
      "charger les options depuis une API",
      "sélecteur dans une cellule de tableau",
      "afficher l’état invalide ou en erreur",
      "choisir un élément lié",
    ],
    "dropdown-parts": [
      "sélectionner plusieurs options",
      "sélection multiple avec cases à cocher",
      "options groupées",
      "tout sélectionner",
      "sélecteur en panneau bas sur téléphone",
      "créer sa propre liste déroulante",
      "filtrer une liste déroulante en tapant",
    ],
    "measured-grid": [
      "saisir un tableau de mesures",
      "coller depuis un tableur",
      "grille au clavier comme Excel",
      "des milliers de lignes",
      "liste virtualisée",
      "découper un texte collé en lignes",
      "modifier les cellules avec les flèches",
    ],
    "field-sync": [
      "enregistrer un champ en le quittant",
      "afficher «\u202fenregistrement\u202f» ou «\u202fenregistré\u202f»",
      "signaler un échec d’enregistrement",
      "enregistrement automatique",
      "indicateur de modifications non enregistrées",
      "champ relié à la base de données",
    ],
    "signature-password": [
      "signer un document",
      "recueillir une signature",
      "afficher une signature enregistrée",
      "vérifier la robustesse d’un mot de passe",
      "confirmer avec un mot de passe",
      "demander avant de supprimer",
      "taper le nom pour confirmer une suppression",
      "confirmer une action dangereuse",
    ],
    "data-display": [
      "afficher des données",
      "présenter des valeurs",
      "tableaux et listes",
      "progression et retours",
      "boutons et cartes",
    ],
    buttons: [
      "un bouton",
      "boutons principal et secondaire",
      "bouton icône",
      "groupe de boutons",
      "carte conteneur",
      "indicateur de chargement",
      "avatar avec initiales",
      "bouton désactivé",
    ],
    "chips-toggles": [
      "choisir parmi quelques options",
      "contrôle segmenté",
      "onglets",
      "étiquettes ou chips",
      "saisir plusieurs étiquettes",
      "chips de filtre",
      "basculer entre des vues",
      "retirer une étiquette",
    ],
    feedback: [
      "afficher une progression",
      "barre de progression",
      "espace réservé pendant le chargement",
      "squelette de chargement",
      "résultat vide",
      "message «\u202faucun résultat\u202f»",
      "notifier l’utilisateur",
      "bannière d’avertissement ou d’erreur",
      "message de réussite",
      "jauge en pourcentage",
    ],
    "description-list": [
      "afficher des paires clé-valeur",
      "détails d’un enregistrement",
      "tableau statique simple",
      "tableau avec ligne de total",
      "ligne de séparation",
      "zone défilante",
      "aligner les nombres à droite dans un tableau",
    ],
    "tree-view": [
      "afficher des données hiérarchiques",
      "arborescence de dossiers",
      "déplier et replier des nœuds",
      "charger les enfants à la demande",
      "parcourir un arbre au clavier",
      "catégories imbriquées",
      "organigramme sous forme de liste",
    ],
    "data-table": [
      "données tabulaires triables",
      "trier un tableau",
      "filtrer les lignes d’un tableau",
      "sélectionner des lignes",
      "déplier une ligne pour les détails",
      "tableau avec pagination",
      "masquer ou réordonner les colonnes",
      "grille de données",
      "rechercher dans un tableau",
    ],
    "data-table-server": [
      "pagination côté serveur",
      "garder les filtres du tableau dans l’URL",
      "tableau en cartes sur téléphone",
      "actions par balayage sur les lignes",
      "grouper des lignes",
      "charger les pages depuis une API",
      "partager le lien d’un tableau filtré",
    ],
    "data-table-parts": [
      "contrôles de pagination",
      "popover de filtre",
      "fonctions de tri",
      "tester des lignes contre un filtre",
      "traduire les libellés du tableau",
      "choix du nombre de lignes par page",
    ],
    layout: [
      "replier une section",
      "accordéon",
      "afficher plus ou moins",
      "mise en page de dialogue avec en-tête et actions",
      "panneau dépliable",
      "animer la hauteur",
    ],
    charts: [
      "tracer un graphique",
      "visualiser des données",
      "couleurs des graphiques",
      "tableau de bord avec KPI",
      "graphique en courbes ou en barres",
    ],
    "chart-shell": [
      "graphique aux couleurs du thème",
      "infobulle de graphique",
      "légende de graphique",
      "couleurs des séries",
      "utiliser Recharts avec le thème",
      "camembert ou histogramme",
      "graphique responsive",
    ],
    "tile-chart": [
      "treemap",
      "montrer les parts d’un total",
      "explorer un graphique en profondeur",
      "tuiles cliquables",
      "dépenses par catégorie",
      "faire tenir les libellés dans les tuiles",
    ],
    "series-chart": [
      "graphique dans le temps",
      "zoomer dans un graphique",
      "courbe à deux axes",
      "masquer des séries depuis la légende",
      "plusieurs graphiques avec un zoom commun",
      "série temporelle",
      "mesures dans le temps",
    ],
    "series-chart-marks": [
      "graphique en barres",
      "aires empilées",
      "ligne de référence ou seuil",
      "repères sur un graphique",
      "cliquer sur un point du graphique",
      "graphique sur des dates",
      "couleurs de légende stables",
    ],
    stats: [
      "tuile KPI",
      "afficher un nombre et son évolution",
      "tendance à la hausse ou à la baisse",
      "sparkline dans une cellule",
      "chiffres du tableau de bord",
      "mini courbe",
    ],
    overlays: [
      "afficher quelque chose par-dessus la page",
      "ouvrir une boîte de dialogue",
      "fenêtre surgissante ou menu",
      "infobulle",
      "palette de commandes",
    ],
    dialogs: [
      "ouvrir une boîte de dialogue modale",
      "dialogue plein écran",
      "fermer au clic sur l’arrière-plan",
      "animer la fermeture",
      "fenêtre surgissante",
      "dialogue sur téléphone",
    ],
    "confirm-floating": [
      "demander avant de supprimer",
      "boîte de confirmation",
      "remplacer window.confirm",
      "demande «\u202fêtes-vous sûr\u202f?\u202f»",
      "bouton d’action flottant",
      "panneau ancré dans un coin",
      "panneau de chat ou d’aide",
    ],
    popovers: [
      "infobulle au survol",
      "popover ancré à un bouton",
      "menu au survol",
      "menu déroulant",
      "placer une fenêtre près d’un élément",
      "expliquer une icône",
    ],
    tour: [
      "visite guidée",
      "parcours d’accueil",
      "mettre un élément en évidence",
      "présentation étape par étape",
      "attendre le clic de l’utilisateur",
      "visite du produit pour les nouveaux",
    ],
    "command-palette": [
      "palette de commandes",
      "recherche globale",
      "raccourci clavier pour rechercher",
      "aller à une page",
      "recherche tolérante aux fautes de frappe",
      "menu d’actions rapides",
      "résultats de recherche depuis un serveur",
    ],
    "swipeable-row": [
      "balayer une ligne pour la supprimer",
      "révéler des actions par balayage",
      "balayer sur téléphone",
      "archiver par balayage",
      "actions sur les lignes d’une liste",
    ],
    "app-chrome": [
      "mise en page d’application",
      "barre latérale et barre du haut",
      "page de paramètres",
      "formulaire en plusieurs étapes",
      "recueillir les avis des utilisateurs",
    ],
    shell: [
      "mise en page avec barre latérale",
      "barre du haut",
      "menu de navigation",
      "navigation en bas sur téléphone",
      "table des matières",
      "changer de thème",
      "menu des langues",
      "replier la barre latérale",
    ],
    settings: [
      "paramètres du compte",
      "changer le mot de passe",
      "authentification à deux facteurs",
      "modifier le profil",
      "choisir le thème",
      "choisir la langue",
      "préférences de l’utilisateur",
    ],
    wizard: [
      "formulaire en plusieurs étapes",
      "stepper",
      "assistant avec étape de vérification",
      "revenir en arrière entre les étapes",
      "parcours d’inscription",
      "récapitulatif avant envoi",
    ],
    "feedback-compose": [
      "recueillir les avis des utilisateurs",
      "signaler un bug",
      "joindre une capture d’écran",
      "formulaire de retour",
      "envoyer une suggestion",
    ],
    "feedback-inbox": [
      "gérer les retours",
      "workflow de statut des retours",
      "trier les rapports de bug",
      "boîte de réception du support",
      "changer le statut d’un rapport",
    ],
    api: [
      "hooks et utilitaires",
      "fonctions sans interface",
      "fonctions utilitaires",
      "constantes",
      "utilitaires de dates",
    ],
    "hooks-lib": [
      "réagir à la taille de l’écran",
      "hook de media query",
      "fermer un overlay avec le bouton retour",
      "placer un panneau à côté de son déclencheur",
      "fusionner des noms de classes",
      "détecter un téléphone",
    ],
    "clipboard-timing": [
      "copier dans le presse-papiers",
      "bouton copier avec confirmation",
      "debounce de la saisie",
      "attendre la fin de la frappe",
      "retarder une requête de recherche",
      "limiter la fréquence d’un callback",
    ],
    helpers: [
      "calcul sur les dates",
      "date du jour au format ISO",
      "périodes prédéfinies",
      "évaluer une expression mathématique",
      "liste des devises",
      "derniers mois complets",
      "classes CSS des champs",
    ],
  },


  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_FR,
};
