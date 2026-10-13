/**
 * The settings cards' type scale, PasskeysSetting's: a small title and a muted line.
 * Every kit setting card draws it — the account cards, `SettingsSection` and the
 * `SettingsCardTitle` they share — so it lives with the card look, in settings/. It was in
 * account/account-parts.ts, which made settings/ import account/ and account/ import
 * settings/ (MOD-8, refactor audit 2026-10); account-parts re-exports it.
 *
 * @internal Not part of the barrel.
 */
export const CARD_TITLE_CLASS = "text-sm font-medium";
export const CARD_DESCRIPTION_CLASS = "text-xs text-muted";
