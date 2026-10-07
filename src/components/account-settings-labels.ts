import { useMemo } from "react";
import { useKitLabelOverrides } from "../i18n/kit-labels";

/**
 * The `accountSettings` namespace of `<UiKitProvider labels>`: one record per section —
 * `profile`, `password`, `twoFactor`, `passkeys` — each merged key by key, so an app
 * can translate `accountSettings.twoFactor.scanHint` alone.
 *
 * Before 0.12.0 every section took a REQUIRED `labels` prop and had no English of its
 * own, so each app spelled out 30-odd keys at the call site and still hard-coded some
 * (kastlan's profile page passed `email: "Email"` in English to a German page). The
 * prop stays, now partial, and wins over the provider as everywhere else in the kit.
 *
 * Its own module, beside the components rather than in them, so `PasskeysSetting`
 * (its own file) and the older three read one tree without importing each other.
 */

export interface ProfileSettingLabels {
  title: string;
  email: string;
  role: string;
  memberSince: string;
  /** The single name field — the card without `firstName` / `lastName`. */
  displayName: string;
  save: string;
  /**
   * 0.30.0 (docs/user-admin-harmonization.md §6.1): the two fields that replace
   * `displayName` once the card is given `firstName` / `lastName`. OPTIONAL, like
   * `TwoFactorSettingLabels.qrAlt` and for its reason — this interface is annotated at
   * call sites — and filled from the provider's `accountSettings.profile`, then English.
   */
  firstName?: string;
  lastName?: string;
  /** Why Save is held while a name is blank: both are required (§3.1). */
  nameRequired?: string;
}

export interface PasswordSettingLabels {
  title: string;
  current: string;
  next: string;
  confirm: string;
  submit: string;
  tooShort: string;
  mismatch: string;
}

export interface TwoFactorSettingLabels {
  /**
   * Before 0.31 the card's one line, "<status>: On". Since 0.31 the setting's name is the
   * card's {@link title} and the state stands beside it, so this is read only where no
   * `title` is given at the same level — an app that translated `status` keeps its word
   * as the title.
   */
  status: string;
  enabledText: string;
  disabledText: string;
  enable: string;
  scanHint: string;
  codeLabel: string;
  verify: string;
  disableSection: string;
  password: string;
  disable: string;
  /**
   * Alt text for the setup QR code, which shipped as a hardcoded `alt="QR"`.
   *
   * OPTIONAL, like the two keys below, and not because it matters less: this interface
   * is annotated at consumer call sites (`const LABELS: TwoFactorSettingLabels = {…}`),
   * so a new REQUIRED key is a compile error in every app on the next `npm update` —
   * the additive-API rule in the README. Each falls back to the provider's
   * `accountSettings.twoFactor`, then English.
   */
  qrAlt?: string;
  /** The line over the manual-entry key, for a phone that cannot scan its own screen. */
  secretHint?: string;
  /** The copy button beside that key. */
  copySecret?: string;
  /**
   * 0.31.0 (docs/settings-harmonization.md §3.7): the card's title, a heading inside a
   * `SettingsLayout`. OPTIONAL for the reason `qrAlt` is. Unset, the same source's
   * `status` stands in for it, then English.
   */
  title?: string;
}

export interface PasskeysSettingLabels {
  title: string;
  /** The line under the title saying what a passkey is for — `mode="instead"` (the
   *  default): the passkey stands in for the password. */
  description: string;
  /**
   * The same line for `mode="alongside"` (0.18.0): the password keeps working and the
   * passkey is a second way in. OPTIONAL for the reason `TwoFactorSettingLabels.qrAlt`
   * is — this interface is annotated at call sites — and filled from the provider's
   * `accountSettings.passkeys`, then English.
   */
  descriptionAlongside?: string;
  empty: string;
  loading: string;
  /** Accessible name of the list. */
  list: string;
  nameLabel: string;
  namePlaceholder: string;
  add: string;
  /** The add button while the app's WebAuthn ceremony runs — the OS prompt is open. */
  adding: string;
  rename: string;
  /** The row's rename button, named for its passkey — it starts with `rename`, the
   *  visible text, so voice control finds it by what it says. */
  renameItem: (name: string) => string;
  /** Accessible name of the inline rename field. */
  renameField: (name: string) => string;
  save: string;
  cancel: string;
  delete: string;
  /** The row's delete button, named for its passkey (see `renameItem`). */
  deleteItem: (name: string) => string;
  /** The inline question a delete asks first. */
  deleteConfirm: (name: string) => string;
  /** The destructive button that answers it. */
  confirmDelete: string;
  /** `date` arrives formatted in the provider's locale. */
  created: (date: string) => string;
  lastUsed: (date: string) => string;
  neverUsed: string;
}

export interface AccountSettingsLabels {
  profile: Required<ProfileSettingLabels>;
  password: PasswordSettingLabels;
  // `Required` here, optional on the section interfaces: the namespace is what a full
  // catalogue (`@eifi1/ui-kit/i18n/<code>`, `missingKitLabels`) is written against, so
  // it must name the late keys; the section interfaces are annotated at call sites.
  twoFactor: Required<TwoFactorSettingLabels>;
  passkeys: Required<PasskeysSettingLabels>;
}

export const DEFAULT_ACCOUNT_SETTINGS_LABELS: AccountSettingsLabels = {
  profile: {
    title: "Profile",
    email: "Email",
    role: "Role",
    memberSince: "Member since",
    displayName: "Display name",
    save: "Save",
    firstName: "First name",
    lastName: "Last name",
    nameRequired: "Enter both a first and a last name.",
  },
  password: {
    title: "Change password",
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    submit: "Change password",
    tooShort: "The new password is too short.",
    mismatch: "The passwords don’t match.",
  },
  twoFactor: {
    status: "Two-factor authentication",
    enabledText: "On",
    disabledText: "Off",
    enable: "Set up two-factor authentication",
    scanHint: "Scan this code with your authenticator app, then enter the code it shows.",
    codeLabel: "Verification code",
    verify: "Verify and turn on",
    disableSection: "Turn off two-factor authentication",
    password: "Current password",
    disable: "Turn off",
    // Unchanged from the fallback it had before the namespace (i18n-labels.test pins it).
    qrAlt: "QR code",
    secretHint: "Can’t scan it? Enter this key in the app instead:",
    copySecret: "Copy key",
    title: "Two-factor authentication",
  },
  passkeys: {
    title: "Passkeys",
    description: "Sign in with your fingerprint, face or device PIN instead of a password.",
    // Kurvenschmiede overrode `description` because "instead of" is false where the
    // password stays; this is the sentence for those apps, picked by `mode`.
    descriptionAlongside: "Sign in with your fingerprint, face or device PIN. Your password keeps working too.",
    empty: "No passkeys yet",
    loading: "Loading passkeys…",
    list: "Your passkeys",
    nameLabel: "Name (optional)",
    namePlaceholder: "e.g. Laptop, Phone",
    add: "Add passkey",
    adding: "Waiting for your device…",
    rename: "Rename",
    renameItem: (name) => `Rename ${name}`,
    renameField: (name) => `New name for ${name}`,
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    deleteItem: (name) => `Delete ${name}`,
    deleteConfirm: (name) => `Delete “${name}”? It can no longer be used to sign in.`,
    confirmDelete: "Delete passkey",
    created: (date) => `Added ${date}`,
    lastUsed: (date) => `Last used ${date}`,
    neverUsed: "Never used",
  },
};

/**
 * One section of the namespace, resolved: English, then the provider's
 * `accountSettings.<section>`, then the component's own `labels` prop. An `undefined`
 * in either source is skipped, so a prop object built from optional values cannot
 * blank out a default.
 */
export function useAccountSettingsLabels<K extends keyof AccountSettingsLabels>(
  section: K,
  prop?: Partial<AccountSettingsLabels[K]>,
): AccountSettingsLabels[K] {
  const fromProvider = useKitLabelOverrides("accountSettings")?.[section] as
    | Partial<AccountSettingsLabels[K]>
    | undefined;
  return useMemo(
    () => ({
      ...DEFAULT_ACCOUNT_SETTINGS_LABELS[section],
      ...definedOnly(fromProvider),
      ...definedOnly(prop),
    }),
    [section, fromProvider, prop],
  );
}

function definedOnly<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
