/**
 * The `settings` namespace (docs/settings-harmonization.md §4.3): the settings page's
 * own words, and the names and help lines of the five core groups every app shares —
 * appearance, account, security, notifications, data (§2.6). An app's own groups bring
 * their own words; any core label may be overridden like any kit label (prop >
 * `<UiKitProvider labels={{ settings }}>` > English).
 */

/** A core group's two strings, as {@link SettingsGroup} takes them. */
export interface SettingsGroupLabels {
  /** The group's name. */
  title: string;
  /** One line: under the heading, and in the phone list. */
  help: string;
}

/** The five groups whose words the kit ships (§2.6, §4.2). */
export type SettingsCoreGroup = "appearance" | "account" | "security" | "notifications" | "data";

export interface SettingsLabels {
  /** The page's heading, and the back link's visible text on a phone's group page. */
  title: string;
  /** The search field's accessible name. */
  search: string;
  /** The search field's placeholder. */
  searchPlaceholder: string;
  /** The hit list's accessible name. */
  results: string;
  /** No hits for the trimmed query (§3.4). */
  noMatches: (query: string) => string;
  /** The button beside it that empties the field. */
  clearSearch: string;
  /** The phone's back link's accessible name: "‹ Settings" says where, this says what. */
  back: string;
  /** The sidebar's accessible name (the vertical tablist). */
  sections: string;
  /** A sidebar row's hit badge, read in place of the bare number while searching. */
  matchCount: (count: number) => string;
  /** The core groups' names and help lines. */
  groups: Record<SettingsCoreGroup, SettingsGroupLabels>;
}

export const DEFAULT_SETTINGS_LABELS: SettingsLabels = {
  title: "Settings",
  search: "Search settings",
  searchPlaceholder: "Search settings…",
  results: "Matching settings",
  noMatches: (query) => `No settings match “${query}”.`,
  clearSearch: "Clear search",
  back: "Back to settings",
  sections: "Settings sections",
  matchCount: (count) => (count === 1 ? "1 match" : `${count} matches`),
  groups: {
    appearance: {
      title: "Appearance",
      help: "Language, theme and how the app looks on this device.",
    },
    account: {
      title: "Account",
      help: "Your profile and your email address.",
    },
    security: {
      title: "Security",
      help: "How you sign in: password, two-factor codes, passkeys and sessions.",
    },
    notifications: {
      title: "Notifications",
      help: "What you are told about, when, and on which devices.",
    },
    data: {
      title: "Data",
      help: "Export what is yours, or delete it together with your account.",
    },
  },
};
