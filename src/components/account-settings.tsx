import { useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Button, Card, Input } from "./ui";
import { UserAvatar } from "./user-avatar";
import { CopyButton } from "./copy-button";
import { QrCode } from "./qr-code";
import { OneTimeCodeInput } from "./one-time-code-input";
import {
  DEFAULT_PASSWORD_STRENGTH_LABELS,
  passwordByteLength,
  PasswordStrengthMeter,
} from "./password-strength";
import type { PasswordStrengthMeterProps } from "./password-strength";
import { DEFAULT_COMMON_LABELS, useKitLabels } from "../i18n/kit-labels";
import { useAccountSettingsLabels } from "./account-settings-labels";
import type {
  PasswordSettingLabels,
  ProfileSettingLabels,
  TwoFactorSettingLabels,
} from "./account-settings-labels";

// The label types moved beside the namespace's defaults (0.12.0); re-exported here so
// every existing `import type { ProfileSettingLabels }` keeps resolving.
export type {
  AccountSettingsLabels,
  PasskeysSettingLabels,
  PasswordSettingLabels,
  ProfileSettingLabels,
  TwoFactorSettingLabels,
} from "./account-settings-labels";
export { DEFAULT_ACCOUNT_SETTINGS_LABELS } from "./account-settings-labels";

/**
 * App-agnostic account-settings SECTIONS (feedback #333). The presentation lives
 * in @hb/ui; each app injects its own auth-API handlers + translated labels and
 * arranges these next to its own app-specific cards (appearance, budgets, …).
 * Every section is a self-contained <Card> owning its transient form state.
 *
 * Every `labels` prop is optional since 0.12.0: the strings come from the provider's
 * `accountSettings` namespace, then English (see account-settings-labels.ts).
 */

export function ProfileSetting({
  name,
  email,
  role,
  memberSince,
  value,
  onChange,
  onSave,
  saving,
  labels: labelsProp,
}: {
  name?: string | null;
  email?: string | null;
  role?: ReactNode;
  memberSince?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { profile } }}>` > English. */
  labels?: Partial<ProfileSettingLabels>;
}) {
  const labels = useAccountSettingsLabels("profile", labelsProp);
  const dirty = value.trim().length > 0 && value.trim() !== (name ?? "");
  // Generated, not the literal "display-name" it was: two of these on one page (an
  // admin editing someone else's profile beside their own) shared an id, and the
  // second label pointed at the first field.
  const inputId = useId();
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar name={name} email={email} size="lg" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{labels.title}</div>
          <div className="truncate font-mono text-xs text-[var(--text-muted)]">
            {/* `email` was a required key that nothing rendered; it names the address
                for a screen reader, which otherwise hears a bare string under a title. */}
            <span className="sr-only">{labels.email}: </span>
            {email ?? "—"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        <span className="text-[var(--text-muted)]">{labels.role}</span>
        <span>{role ?? "—"}</span>
        <span className="text-[var(--text-muted)]">{labels.memberSince}</span>
        <span>{memberSince ?? "—"}</span>
      </div>
      <Input
        id={inputId}
        label={labels.displayName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={120}
      />
      <Button onClick={onSave} disabled={!dirty || saving}>
        {labels.save}
      </Button>
    </Card>
  );
}

/**
 * What {@link PasswordSetting}'s `strength` takes besides `true`: the meter's own options,
 * minus the ones the card owns — `value` (the new password), `minLength` (the card's, so
 * the checklist's length rule and the submit's check are one number) and `maxBytes`
 * (the card's own prop, which the submit enforces as well).
 */
export type PasswordSettingStrength = Pick<PasswordStrengthMeterProps, "score" | "showRequirements" | "labels">;

export function PasswordSetting({
  onSubmit,
  pending,
  minLength = 8,
  strength,
  maxBytes,
  labels: labelsProp,
}: {
  /** Called with the validated (current, new) pair; return a promise to auto-clear on success. */
  onSubmit: (currentPassword: string, newPassword: string) => void | Promise<unknown>;
  pending?: boolean;
  /** The shortest new password the card submits, in characters as a person counts them
   *  (an emoji is one). Keep it in step with the server's own minimum. Default 8. */
  minLength?: number;
  /**
   * Show the {@link PasswordStrengthMeter} under the new-password field (0.22.0,
   * kastlan's input audit): the bar, the level in words and the checklist, with the
   * length rule drawn from `minLength`. `true` for the meter as it comes; an object for
   * its `score` (zxcvbn's, say), `showRequirements` or `labels`.
   *
   * Off by default, so a card that never asked for it does not grow one. The meter is
   * advisory, as everywhere in the kit: it blocks nothing — the card's own checks do
   * (`minLength`, the confirmation, `maxBytes`).
   */
  strength?: boolean | PasswordSettingStrength;
  /**
   * A byte ceiling on the new password — bcrypt reads at most 72 BYTES and ignores the
   * rest, which is kastlan's case: `maxBytes={72}`. A new password over it is refused
   * on submit with the meter's own "too long" sentence (the `passwordStrength`
   * namespace's `tooLong`), and the meter, when shown, warns while it is typed.
   *
   * Unset by default, and leave it unset for a secret with no ceiling: an invented one
   * talks people out of the long passphrase they chose.
   */
  maxBytes?: number;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { password } }}>` > English. */
  labels?: Partial<PasswordSettingLabels>;
}) {
  const labels = useAccountSettingsLabels("password", labelsProp);
  const strengthOptions = typeof strength === "object" ? strength : undefined;
  // Only for `tooLong`: the sentence the meter shows is the one the refusal says.
  const strengthLabels = useKitLabels("passwordStrength", DEFAULT_PASSWORD_STRENGTH_LABELS, strengthOptions?.labels);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    // Code points, not UTF-16 units — the count the meter's checklist and a server's
    // `len()` use. `next.length` counted an emoji as two, so four of them passed a
    // minimum of eight that the meter beside the field said they missed.
    if ([...next].length < minLength) {
      setError(labels.tooShort);
      return;
    }
    if (maxBytes !== undefined && passwordByteLength(next) > maxBytes) {
      setError(strengthLabels.tooLong(maxBytes));
      return;
    }
    if (next !== confirm) {
      setError(labels.mismatch);
      return;
    }
    setError(null);
    try {
      await onSubmit(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      // The app surfaces the failure (e.g. a toast); keep the fields for a retry.
    }
  };

  const nextField = (
    <Input type="password" autoComplete="new-password" label={labels.next} value={next} onChange={(e) => setNext(e.target.value)} />
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">{labels.title}</div>
      <Input type="password" autoComplete="current-password" label={labels.current} value={current} onChange={(e) => setCurrent(e.target.value)} />
      {strength ? (
        // One box for the field and its meter, so the card's `space-y-3` spaces the pair
        // from its neighbours and the meter keeps its own small gap under the field.
        <div>
          {nextField}
          <PasswordStrengthMeter
            value={next}
            minLength={minLength}
            maxBytes={maxBytes}
            score={strengthOptions?.score}
            showRequirements={strengthOptions?.showRequirements}
            labels={strengthOptions?.labels}
          />
        </div>
      ) : (
        nextField
      )}
      <Input type="password" autoComplete="new-password" label={labels.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      <Button onClick={() => void submit()} disabled={!current || !next || !confirm || pending}>
        {labels.submit}
      </Button>
    </Card>
  );
}

/**
 * What the app's setup call returned.
 *
 * `otpauthUri` (0.12.0) is what an authenticator backend actually hands out; the kit
 * draws the QR code itself ({@link QrCode}) and reads the manual-entry key out of the
 * URI's `secret` parameter when `secret` is not given. The `qrSvg` shape — a
 * base64-encoded SVG image — is what the section took before, which made every app
 * render a QR library to a static string and base64 it only for the kit to draw it back.
 */
export type TwoFactorSetupData =
  | { qrSvg: string; secret: string }
  | { otpauthUri: string; secret?: string };

/** The `secret` parameter of an `otpauth://` URI, or null. */
function otpauthSecret(uri: string): string | null {
  const match = /[?&]secret=([^&#]*)/i.exec(uri);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]) || null;
  } catch {
    return match[1] || null;
  }
}

/** "JBSW Y3DP EHPK 3PXP": the key in groups of four, which is how an authenticator's
 *  manual-entry screen shows it and how a person copies it by eye. */
function groupSecret(secret: string): string {
  return secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

export function TwoFactorSetting({
  enabled,
  setup,
  onStartSetup,
  onEnable,
  onDisable,
  busy,
  renderQr,
  labels: labelsProp,
}: {
  enabled: boolean;
  /** What the app's setup call returned; null before setup starts. */
  setup: TwoFactorSetupData | null;
  onStartSetup: () => void;
  onEnable: (code: string) => void;
  onDisable: (password: string, code: string) => void;
  busy?: boolean;
  /** Draw the code yourself (a branded QR, a library you already ship). Given the
   *  `otpauthUri`; the kit's own {@link QrCode} otherwise. Unused with `qrSvg`. */
  renderQr?: (otpauthUri: string) => ReactNode;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { twoFactor } }}>` > English. */
  labels?: Partial<TwoFactorSettingLabels>;
}) {
  const labels = useAccountSettingsLabels("twoFactor", labelsProp);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  // Both code fields are a OneTimeCodeInput (0.22.0) — the field this card wrote by hand
  // twice — and keep what they did:
  //  - `readOnlyUntilFocus`: browsers autofill a one-time-code field with the saved
  //    username (the disable form has a current-password field right above it), and a
  //    read-only field is never autofilled. The guard drops on focus, and the field
  //    keeps the look of an editable one meanwhile (FIELD_WRITABLE_LOOK) — see the prop.
  //  - `length={8}`: the `maxLength={8}` they had, so an authenticator issuing eight
  //    digits still fits. What changed is that they now take digits only: "123 456"
  //    pasted from an authenticator that groups its digits used to reach `onEnable`
  //    with the space in it.
  //  - one `code` state for both, as before.
  // Only for the "Status: Enabled" composition — the punctuation between a field's
  // name and its value is the language's (see `CommonLabels.fieldValue`).
  const common = useKitLabels("common", DEFAULT_COMMON_LABELS);
  const secret = setup
    ? (setup.secret ?? ("otpauthUri" in setup ? otpauthSecret(setup.otpauthUri) : null))
    : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm">
        {common.fieldValue(labels.status, enabled ? labels.enabledText : labels.disabledText)}
      </div>

      {!enabled && !setup && (
        <Button onClick={onStartSetup} disabled={busy}>
          {labels.enable}
        </Button>
      )}

      {setup && (
        <div className="space-y-2">
          <div className="text-xs text-[var(--text-secondary)]">{labels.scanHint}</div>
          {/* `bg-white`, NOT `--bg-surface`, and it must stay that way: a QR code is
              read by a camera looking for maximum contrast between the modules and
              their quiet zone. On the dark theme a surface-coloured backing makes it
              slow to acquire, and on a warm light preset it lowers the contrast ratio
              the spec is written against. This is the one place in the kit where a
              literal colour is the correct answer. `data-private`: the code IS the
              second factor, and demo mode blurs it like any other secret. */}
          {"otpauthUri" in setup ? (
            // No backing of its own: QrCode draws its quiet zone white inside the SVG.
            <div data-private className="inline-block overflow-hidden rounded-md">
              {renderQr ? (
                renderQr(setup.otpauthUri)
              ) : (
                <QrCode value={setup.otpauthUri} label={labels.qrAlt} className="size-48" />
              )}
            </div>
          ) : (
            <div data-private className="inline-block rounded-md bg-white p-2">
              <img
                alt={labels.qrAlt}
                src={`data:image/svg+xml;base64,${setup.qrSvg}`}
                className="h-48 w-48"
              />
            </div>
          )}
          {secret && (
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-secondary)]">{labels.secretHint}</div>
              <div className="flex items-center gap-1">
                {/* `dir="ltr"`: a base32 key is Latin letters and digits in a fixed
                    order, and in an RTL page the groups would otherwise be laid out
                    right to left. */}
                <code data-private dir="ltr" className="break-all font-mono text-xs select-all">
                  {groupSecret(secret)}
                </code>
                <CopyButton text={secret} label={labels.copySecret} size="xs" tone="muted" />
              </div>
            </div>
          )}
          <OneTimeCodeInput
            readOnlyUntilFocus
            length={8}
            label={labels.codeLabel}
            value={code}
            onChange={setCode}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && code && !busy) {
                e.preventDefault();
                onEnable(code);
              }
            }}
          />
          <Button onClick={() => onEnable(code)} disabled={!code || busy}>
            {labels.verify}
          </Button>
        </div>
      )}

      {enabled && (
        <div className="space-y-3 border-t border-[var(--border)] pt-3">
          <div className="text-sm font-medium">{labels.disableSection}</div>
          <Input type="password" autoComplete="current-password" label={labels.password} value={password} onChange={(e) => setPassword(e.target.value)} />
          <OneTimeCodeInput
            readOnlyUntilFocus
            length={8}
            label={labels.codeLabel}
            value={code}
            onChange={setCode}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter" && password && code && !busy) {
                e.preventDefault();
                onDisable(password, code);
              }
            }}
          />
          <Button variant="danger" onClick={() => onDisable(password, code)} disabled={!password || !code || busy}>
            {labels.disable}
          </Button>
        </div>
      )}
    </Card>
  );
}
