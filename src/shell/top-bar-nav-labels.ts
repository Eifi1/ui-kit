// The English words of ./top-bar-nav, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./top-bar-nav re-exports them.

/** `TopBarNav`'s words — the `topBarNav` namespace of `<UiKitProvider labels>` (0.66). The
 *  links' own labels are the app's. */
export interface TopBarNavLabels {
  /** The `<nav>` landmark's name. Without the word "navigation": a screen reader adds the
   *  role ("Pages, navigation"). */
  navigation: string;
  /** The menu button's name, and its menu's, while the links do not fit beside the actions. */
  menu: string;
}

export const DEFAULT_TOP_BAR_NAV_LABELS: TopBarNavLabels = {
  navigation: "Pages",
  menu: "Menu",
};
