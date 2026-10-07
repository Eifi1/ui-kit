import { createContext, useContext } from "react";
import type { SettingsHeadingTag } from "./settings-heading";

/**
 * What {@link SettingsLayout} hands the cards it renders (docs/settings-harmonization.md
 * §3.1, §3.7). Router-free on purpose, so `SettingsSection` and an app's cards can read
 * it without importing the layout.
 */
export interface SettingsLayoutContextValue {
  /** `/settings` or `/admin`, without a trailing slash. */
  basePath: string;
  /** The group on screen; `null` on a phone's list. */
  group: string | null;
  /** The path segment after the group — the surface a card owns (keksdose's swipe card). */
  sub: string | null;
  /**
   * Select the card's sub-surface: `/settings/<group>/<sub>`, or the group alone with
   * `null`. A replace, keeping the query and the history marker: switching a tab inside a
   * card is not a place to go back to. The card never builds the path itself (§3.1).
   */
  selectSub: (sub: string | null) => void;
  /** The level the cards' titles are at: `h3` on a desktop, `h2` on a phone. */
  headingLevel: SettingsHeadingTag;
  /** Whether the catalogue has an entry with this anchor — `SettingsSection`'s check. */
  hasAnchor: (anchor: string) => boolean;
}

export const SettingsLayoutContext = createContext<SettingsLayoutContextValue | null>(null);

/** The {@link SettingsLayout} around this card, or `null` outside one. */
export function useSettingsLayout(): SettingsLayoutContextValue | null {
  return useContext(SettingsLayoutContext);
}
