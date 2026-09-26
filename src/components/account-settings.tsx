import { useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Button, Card, FIELD_WRITABLE_LOOK, Input } from "./ui";
import { UserAvatar } from "./user-avatar";
import { CopyButton } from "./copy-button";
import { QrCode } from "./qr-code";
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

export function PasswordSetting({
  onSubmit,
  pending,
  minLength = 8,
  labels: labelsProp,
}: {
  /** Called with the validated (current, new) pair; return a promise to auto-clear on success. */
  onSubmit: (currentPassword: string, newPassword: string) => void | Promise<unknown>;
  pending?: boolean;
  minLength?: number;
  /** Prop > `<UiKitProvider labels={{ accountSettings: { password } }}>` > English. */
  labels?: Partial<PasswordSettingLabels>;
}) {
  const labels = useAccountSettingsLabels("password", labelsProp);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next.length < minLength) {
      setError(labels.tooShort);
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

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">{labels.title}</div>
      <Input type="password" autoComplete="current-password" label={labels.current} value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input type="password" autoComplete="new-password" label={labels.next} value={next} onChange={(e) => setNext(e.target.value)} />
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
  // Browsers autofill one-time-code fields with the saved username; keep the
  // field readOnly until focus to block that. It therefore has to keep the LOOK of
  // an editable field (FIELD_WRITABLE_LOOK): this is the one place where readOnly
  // does not mean "you may not type here", and without the opt-out the field would
  // sit there greyed until the moment it is focused.
  const [otpReadonly, setOtpReadonly] = useState(true);
  const onOtpFocus = () => setOtpReadonly(false);
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
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            readOnly={otpReadonly}
            inputClassName={FIELD_WRITABLE_LOOK}
            onFocus={onOtpFocus}
            maxLength={8}
            label={labels.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            readOnly={otpReadonly}
            inputClassName={FIELD_WRITABLE_LOOK}
            onFocus={onOtpFocus}
            maxLength={8}
            label={labels.codeLabel}
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
