// `@eifi1/ui-kit/shell` — the composable app chrome.
//
// A re-slicing of the main barrel, not a new API. This entry point requires
// `react-router`: AppShell renders NavLink and TopBarActionMenu renders Link.
export * from "./shell/topbar-controls";
export * from "./shell/top-bar";
export * from "./shell/app-shell";
export * from "./shell/option-switcher-menu";
export * from "./shell/role-switcher";
export * from "./shell/topbar-action-menu";
export * from "./shell/top-bar-brand";
export * from "./shell/auth-layout";
// 0.31.0: the settings and admin pages' shell (docs/settings-harmonization.md §3, §5).
export { SettingsLayout, SETTINGS_SEARCH_THRESHOLD } from "./settings/settings-layout";
export type { SettingsLayoutProps, SettingsLayoutWidth } from "./settings/settings-layout";
export {
  useSettingsRoute,
  resolveSettingsLocation,
  settingsFromListState,
  SETTINGS_FROM_LIST_STATE,
} from "./settings/use-settings-route";
export type {
  UseSettingsRouteOptions,
  SettingsRoute,
  SettingsLayoutMode,
  SettingsLocation,
  SettingsLocationRules,
  SettingsLocationResult,
} from "./settings/use-settings-route";
export { useSettingsFocus, SETTINGS_FOCUS_RING, SETTINGS_FOCUS_MS } from "./settings/use-settings-focus";
export { SettingsSection } from "./settings/settings-section";
export type { SettingsSectionProps } from "./settings/settings-section";
export { useSettingsLayout } from "./settings/settings-context";
export type { SettingsLayoutContextValue } from "./settings/settings-context";
export { SettingsHeadingLevel, useSettingsHeadingLevel } from "./settings/settings-heading";
export type { SettingsHeadingLevelProps, SettingsHeadingTag } from "./settings/settings-heading";
export {
  settingsSearchEntries,
  visibleSettingsGroups,
  visibleSettingsEntries,
  settingsHref,
} from "./settings/settings-catalogue";
export type { SettingsGroup, SettingsEntry, SettingsSearchEntriesOptions } from "./settings/settings-catalogue";
// 0.31.0: the public pages' header and the resume (docs/landing-demo-harmonization.md §3, §4.1).
export {
  RootEntry,
  RedirectIfAuthed,
  useLastVisitedPage,
  readLastVisitedPage,
  clearLastVisitedPage,
  safeNextPath,
  NEXT_PARAM,
  DEFAULT_LAST_VISITED_EXCLUDES,
} from "./landing/routing";
export type {
  RootEntryProps,
  RedirectIfAuthedProps,
  RoutingSession,
  LastVisitedPageOptions,
  PathPattern,
} from "./landing/routing";
export { PublicHeader } from "./landing/public-header";
export type { PublicHeaderProps, PublicHeaderBrand } from "./landing/public-header";
