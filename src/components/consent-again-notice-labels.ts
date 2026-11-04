// The English words of ./consent-again-notice, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component (0.34, KS U8).
// keksdose's reviewed words (price_pool.reconsent.*) are the canon, without its price pool:
// the kit cannot know what was agreed to, only that the text changed and is asked again.

/**
 * `ConsentAgainNotice`'s words — the `consentAgain` namespace of `<UiKitProvider labels>`
 * (0.55). The kit's chrome only: the title, the intro, the list of changes and the wording
 * before and now are the app's, as they say what this consent is about.
 */
export interface ConsentAgainLabels {
  /** The button that gives the consent again. */
  agree: string;
  /** The banner's ×, its accessible name: not a refusal, the question comes back. */
  notNow: string;
  /** The banner's disclosure that unfolds the list of changes. */
  changesToggle: string;
  /** The card's disclosure that unfolds the full wording, before and now. */
  wordingToggle: string;
  /** Over the text agreed to before. */
  beforeHeading: string;
  /** Over the text asked for now. */
  nowHeading: string;
  /** Read before each paragraph of the old text, which is struck through: a line-through
   *  is not announced, and colour alone must not carry the meaning. */
  removed: string;
  /** Read before each paragraph of the new text. */
  added: string;
}

export const DEFAULT_CONSENT_AGAIN_LABELS: ConsentAgainLabels = {
  agree: "Agree",
  notNow: "Not now",
  changesToggle: "See what changed",
  wordingToggle: "Show the full wording, before and now",
  beforeHeading: "Until now",
  nowHeading: "From now on",
  removed: "Removed:",
  added: "Added:",
};
