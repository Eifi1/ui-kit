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
// 0.40.0: the list page's fill (docs/page-layout-harmonization.md §1.3).
export { FillHeight, FILL_HEIGHT_CLASS } from "./shell/fill-height";
export type { FillHeightProps } from "./shell/fill-height";
// 0.42.0: the account menu's "Administration" row, as an entry and as a HoverMenu row
// (docs/admin-harmonization.md §2.1, §6.6).
export { adminMenuEntry, AdminMenuRow } from "./shell/admin-menu";
export type { AdminMenuEntryOptions, AdminMenuRowProps } from "./shell/admin-menu";
// 0.43.0 (kastlan): the entry with the provider's words.
export { useAdminMenuEntry } from "./shell/admin-menu";
export type { UseAdminMenuEntryOptions } from "./shell/admin-menu";
// 0.45.0 (docs/admin-harmonization.md §9.3.4): the row's waiting pill on its own, for
// IconButton's `badge` (kastlan's platform button); its name is `adminArea.waitingLabel`.
export { AdminWaitingBadge } from "./shell/admin-menu";
export type { AdminWaitingBadgeProps } from "./shell/admin-menu";
// 0.31.0: the settings and admin pages' shell (docs/settings-harmonization.md §3, §5).
export { SettingsLayout, SETTINGS_SEARCH_THRESHOLD } from "./settings/settings-layout";
export type { SettingsLayoutProps, SettingsLayoutWidth, SettingsDocumentTitleParts } from "./settings/settings-layout";
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
// 0.42.0: the top bar's shared parts (docs/top-bar-harmonization.md §3.1) — the slots in
// §2.1's order, the account menu's language sub-list, the tours menu, the sync status, the
// local-dev switchers, and their words.
export { TopBarActions, TOP_BAR_ACTION_ORDER } from "./shell/top-bar-actions";
export type { TopBarActionsProps } from "./shell/top-bar-actions";
export { AccountMenuLanguage } from "./shell/account-menu-language";
export type { AccountMenuLanguageProps, AccountMenuLanguageOption } from "./shell/account-menu-language";
// 0.46.0 (keksdose live #426): A− / A+ for the text size, beside the language.
export { AccountMenuTextSize } from "./shell/account-menu-text-size";
export type { AccountMenuTextSizeProps } from "./shell/account-menu-text-size";
export { TourMenu } from "./shell/tour-menu";
export type { TourMenuProps, TourMenuTour } from "./shell/tour-menu";
export { SyncStatusIndicator, syncState } from "./shell/sync-status-indicator";
export type { SyncStatus, SyncState, SyncStatusScope, SyncStatusIndicatorProps } from "./shell/sync-status-indicator";
export { DevSwitchers, DEV_ORIGINAL_ROLE_KEY } from "./shell/dev-switchers";
export type { DevSwitchersProps } from "./shell/dev-switchers";
export { DEFAULT_TOP_BAR_PARTS_LABELS, useTopBarPartsLabels } from "./shell/top-bar-parts-labels";
export type {
  TopBarPartsLabels,
  TourMenuLabels,
  SyncStatusLabels,
  DevSwitchersLabels,
} from "./shell/top-bar-parts-labels";
