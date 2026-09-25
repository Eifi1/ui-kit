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
      title: "Choix",
      blurb:
        "Activé ou désactivé, une option parmi quelques-unes, une valeur sur une échelle — et le choix d’une couleur, d’une icône ou d’une carte.",
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
    files: {
      title: "Fichiers",
      blurb:
        "Choisir des fichiers\u00a0: un bouton qui ouvre le sélecteur ou l’appareil photo, la zone de dépôt, et des refus signalés là où l’utilisateur regarde, jamais dans une notification éphémère.",
    },
    "measured-grid": {
      title: "Saisie de tableau",
      blurb:
        "Saisir un tableau de mesures : une grille de cellules au clavier, un bloc collé depuis un tableur et le même tableau en texte — des milliers de lignes, seules les visibles sont rendues.",
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
      title: "Signature, mot de passe et confirmation",
      blurb:
        "Recueillir une signature — et afficher une signature enregistrée —, indiquer à l’utilisateur la robustesse de son mot de passe, et faire confirmer une action destructrice.",
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
    layout: {
      title: "Section repliable et cadre de dialogue",
      blurb:
        "Une section qui se replie, et le cadre en-tête, corps, actions que répète chaque boîte de dialogue.",
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

  // The kit's own words ship with the package — the same import an app writes.
  kit: UI_KIT_LABELS_FR,
};
