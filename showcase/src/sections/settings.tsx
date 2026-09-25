/* eslint-disable jsx-a11y/aria-role -- `ProfileSetting` takes a `role` prop that is the
   person's JOB TITLE ("Treasurer"), not an ARIA role. jsx-a11y matches on the attribute
   name for a component it cannot resolve to a DOM element, and a directive cannot be
   placed between JSX attributes, so this is file-scoped. No DOM `role` is set here. */
import { useState } from "react";
import {
  Button,
  LanguageSetting,
  PasswordSetting,
  ProfileSetting,
  ThemeSetting,
  TwoFactorSetting,
} from "@eifi1/ui-kit";
import type {
  PasswordSettingLabels,
  ProfileSettingLabels,
  TwoFactorSettingLabels,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";
import { useTheme } from "../stores";

/**
 * Settings fields.
 *
 * Two modules, one section, and the split between them is the thing to notice.
 * `settings-fields.tsx` holds two stateless `Select` wrappers the app drives
 * entirely; `account-settings.tsx` holds three `Card` sections that own their own
 * transient form state (drafts, the typed code, the validation message) and hand
 * the app only the committed values. So the first pair needs state from you and the
 * second trio mostly needs handlers — the shape of the props says which is which.
 *
 * Every handler below resolves after a beat rather than instantly: `saving`,
 * `pending` and `busy` are the only way these cards say "I heard you", and a
 * handler that resolves in the same tick renders that state for zero frames.
 */

/** Long enough to read the disabled button, short enough not to feel broken. */
const BEAT_MS = 800;

const beat = (ms = BEAT_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A placeholder for whatever the app's `/2fa/setup` call returns. It is a real
 * base64-encoded SVG because that is what `TwoFactorSetting` expects — it renders
 * `data:image/svg+xml;base64,${setup.qrSvg}` and nothing validates the payload, so
 * a bare string here would show a broken-image icon and read as a component bug.
 * The image says SAMPLE on purpose: a scannable code on a public page would invite
 * somebody to point an authenticator at it.
 */
const QR_SVG_BASE64 = [
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyOSAyOSIgc2hhcGUt",
  "cmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cmVjdCB3aWR0aD0iMjkiIGhlaWdodD0iMjkiIGZpbGw9IiNmZmYiLz48",
  "ZyBmaWxsPSIjMTExIj48cmVjdCB4PSIyIiB5PSIyIiB3aWR0aD0iNyIgaGVpZ2h0PSI3Ii8+PHJlY3QgeD0iMyIg",
  "eT0iMyIgd2lkdGg9IjUiIGhlaWdodD0iNSIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSIz",
  "IiBoZWlnaHQ9IjMiLz48cmVjdCB4PSIyMCIgeT0iMiIgd2lkdGg9IjciIGhlaWdodD0iNyIvPjxyZWN0IHg9IjIx",
  "IiB5PSIzIiB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iMjIiIHk9IjQiIHdpZHRo",
  "PSIzIiBoZWlnaHQ9IjMiLz48cmVjdCB4PSIyIiB5PSIyMCIgd2lkdGg9IjciIGhlaWdodD0iNyIvPjxyZWN0IHg9",
  "IjMiIHk9IjIxIiB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iNCIgeT0iMjIiIHdp",
  "ZHRoPSIzIiBoZWlnaHQ9IjMiLz48cmVjdCB4PSIxMSIgeT0iNiIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0",
  "IHg9IjEzIiB5PSI2IiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgeD0iMTYiIHk9IjYiIHdpZHRoPSIxIiBo",
  "ZWlnaHQ9IjEiLz48cmVjdCB4PSI2IiB5PSIxMSIgd2lkdGg9IjEiIGhlaWdodD0iMSIvPjxyZWN0IHg9IjYiIHk9",
  "IjEzIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIi8+PHJlY3QgeD0iNiIgeT0iMTYiIHdpZHRoPSIxIiBoZWlnaHQ9IjEi",
  "Lz48dGV4dCB4PSIxNC41IiB5PSIxNS42IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3Nw",
  "YWNlIiBmb250LXNpemU9IjMuNiI+U0FNUExFPC90ZXh0Pjx0ZXh0IHg9IjE0LjUiIHk9IjE5LjIiIHRleHQtYW5j",
  "aG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMi42Ij5ub3QgYSByZWFsIGNv",
  "ZGU8L3RleHQ+PC9nPjwvc3ZnPg==",
].join("");

/** A dummy base32 TOTP seed, the shape an authenticator app expects. */
const FAKE_SECRET = "JBSWY3DPEHPK3PXPKRUGKIDROVUWG2ZA";

/** Where these cards stand against the palette switch. */
function PaletteBlindNote() {
  return (
    <Note>
      The cards paint in the kit&apos;s tokens throughout — switch the palette in the top bar and
      all of it moves. The one literal colour is the white mat behind the QR code, on purpose: a
      camera reads a code by the contrast between its modules and a light quiet zone, which a
      dark-theme surface would lower.
    </Note>
  );
}

/**
 * Wired to the SHOWCASE'S theme store, not to a throwaway `useState`. That is what
 * the component is for — the top bar's `ThemeToggle` and this select are two views
 * of one preference, and you can only see that if they share it. It also gets you
 * the third option: `ThemeToggle` can only flip light↔dark, so "system" is
 * reachable from here and nowhere else on this page.
 */
function ThemeRow() {
  const preference = useTheme((s) => s.preference);
  const setPreference = useTheme((s) => s.setPreference);
  const mode = useTheme((s) => s.mode);

  return (
    <Example
      label="ThemeSetting"
      hint="bound to this page's real theme preference — changing it repaints the showcase"
    >
      <div className="max-w-xs">
        <ThemeSetting
          value={preference}
          onChange={setPreference}
          label="Theme"
          optionLabels={{ system: "Match system", light: "Light", dark: "Dark" }}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        preference <code className="font-mono text-[var(--brand)]">{preference}</code> → resolved
        mode <code className="font-mono text-[var(--brand)]">{mode}</code>
      </p>
      <div className="mt-3">
        <Note>
          The props are <code className="font-mono">label</code> plus{" "}
          <code className="font-mono">optionLabels</code>, not a{" "}
          <code className="font-mono">labels</code> object like the three cards below — and the
          option VALUES are the{" "}
          <code className="font-mono">"system" | "light" | "dark"</code> union baked into the
          component, so an app cannot add a fourth choice. Nothing here touches a theme store:
          the select reports a preference and the app decides what that means.
        </Note>
      </div>
    </Example>
  );
}

/**
 * Local state, unlike the theme row: the showcase's language lives in `Showcase`
 * next to the `LanguageMenu` in the top bar and is not exported, so this row cannot
 * share it without changing the scaffold.
 */
function LanguageRow() {
  const [lang, setLang] = useState("de");

  return (
    <Example
      label="LanguageSetting"
      hint="app-supplied options; no flags, unlike the top bar's LanguageMenu"
    >
      <div className="max-w-xs">
        <LanguageSetting
          value={lang}
          onChange={setLang}
          label="Language"
          options={[
            { code: "en", label: "English" },
            { code: "de", label: "Deutsch" },
            { code: "fr", label: "Français" },
          ]}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        value <code className="font-mono text-[var(--brand)]">{lang}</code>
      </p>
      <div className="mt-3">
        <Note>
          Its option type is <code className="font-mono">{"{ code, label }"}</code> — no{" "}
          <code className="font-mono">country</code>, so this row cannot show a flag. That is the
          one difference from the top bar's <code className="font-mono">LanguageMenu</code>, whose
          <code className="font-mono"> LanguageOption</code> carries an ISO-3166 country precisely
          to draw one. An app with both ends up mapping between the two shapes.
        </Note>
      </div>
    </Example>
  );
}

const PROFILE_LABELS: ProfileSettingLabels = {
  title: "Your profile",
  email: "Email",
  role: "Role",
  memberSince: "Member since",
  displayName: "Display name",
  save: "Save profile",
};

/**
 * `name` is state rather than a constant so a save can COMMIT: the card's Save
 * button is disabled while the draft equals `name`, and with a frozen `name` it
 * would re-enable the moment the request finished and never look settled.
 */
function ProfileRow() {
  const [name, setName] = useState("Amelia Fournier");
  const [draft, setDraft] = useState("Amelia Fournier");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await beat();
    setName(draft.trim());
    setSaving(false);
  };

  return (
    <Example
      label="ProfileSetting"
      hint="Save stays disabled until the draft differs from `name` and is non-empty"
    >
      <div className="max-w-md">
        <ProfileSetting
          name={name}
          email="amelia.fournier@example.org"
          role="Treasurer"
          memberSince="14 March 2019"
          value={draft}
          onChange={setDraft}
          onSave={() => void save()}
          saving={saving}
          labels={PROFILE_LABELS}
        />
      </div>
      <div className="mt-3 space-y-2">
        <Note>
          The dirty test is <code className="font-mono">value.trim() !== (name ?? "")</code>, so
          clearing the field does not enable Save: this card cannot express "remove my display
          name". Deletion needs a different affordance.
        </Note>
        <Note>
          <code className="font-mono">name</code> and <code className="font-mono">email</code> take{" "}
          <code className="font-mono">null</code> as well as a string — that is the
          not-loaded-yet case, and both fall back to an em dash rather than to empty space.{" "}
          <code className="font-mono">role</code> and{" "}
          <code className="font-mono">memberSince</code> are <code className="font-mono">
            ReactNode
          </code>
          , so a badge or a formatted date element can go in where these pass plain text.
        </Note>
        <PaletteBlindNote />
      </div>
    </Example>
  );
}

const PASSWORD_LABELS: PasswordSettingLabels = {
  title: "Change password",
  current: "Current password",
  next: "New password",
  confirm: "Confirm new password",
  submit: "Update password",
  tooShort: "Use at least 10 characters.",
  mismatch: "The two new passwords do not match.",
};

/**
 * Two specimens, because the interesting half of this card is the FAILURE path:
 * it awaits `onSubmit` and only clears the three fields if the promise resolves.
 * A rejecting handler is the only way to see that the typed values survive a failed
 * request, which is what makes a retry possible.
 */
function PasswordRow() {
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [failPending, setFailPending] = useState(false);

  const submit = async (current: string, next: string) => {
    setPending(true);
    setReceipt(null);
    await beat();
    setPending(false);
    setReceipt(`onSubmit(current: ${current.length} chars, new: ${next.length} chars)`);
  };

  const submitAndFail = async () => {
    setFailPending(true);
    await beat();
    setFailPending(false);
    throw new Error("wrong current password");
  };

  return (
    <>
      <Example
        label="PasswordSetting — resolving handler"
        hint="`minLength` is 10 here, not the built-in 8; mismatch and too-short are client-side"
      >
        <div className="max-w-md">
          <PasswordSetting
            onSubmit={(current, next) => submit(current, next)}
            pending={pending}
            minLength={10}
            labels={PASSWORD_LABELS}
          />
        </div>
        {receipt && (
          <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">{receipt}</p>
        )}
        <div className="mt-3 space-y-2">
          <Note>
            Both validation messages come out of <code className="font-mono">labels</code> —{" "}
            <code className="font-mono">tooShort</code> and{" "}
            <code className="font-mono">mismatch</code> — because the card has no strings of its
            own and no way to translate one. The check runs on click, not while typing, so the
            message appears once and clears on the next attempt.
          </Note>
          <Note>
            The card holds the three passwords itself and never lifts them; the app sees them
            only as the two arguments to <code className="font-mono">onSubmit</code>, and only
            after they validate. There is no <code className="font-mono">value</code>/
            <code className="font-mono">onChange</code> pair to hold them with, which also means
            nothing outside can clear the form — only a resolving submit does that.
          </Note>
        </div>
      </Example>

      <Example
        label="PasswordSetting — rejecting handler"
        hint="fill in three fields (10+ chars, matching) and submit: the values stay for a retry"
      >
        <div className="max-w-md">
          <PasswordSetting
            onSubmit={submitAndFail}
            pending={failPending}
            minLength={10}
            labels={PASSWORD_LABELS}
          />
        </div>
        <div className="mt-3">
          <Note>
            The rejection is swallowed deliberately: the comment in the source says the app
            surfaces the failure. So a consumer that passes a handler which throws and shows no
            toast gets a button that visibly does nothing — this card reports success by
            emptying itself and failure not at all.
          </Note>
        </div>
      </Example>
    </>
  );
}

const TWO_FACTOR_LABELS: TwoFactorSettingLabels = {
  status: "Two-factor authentication",
  enabledText: "on",
  disabledText: "off",
  enable: "Set up two-factor",
  scanHint: "Scan this with your authenticator app, then enter the six-digit code it shows.",
  codeLabel: "Authentication code",
  verify: "Verify and enable",
  disableSection: "Turn off two-factor",
  password: "Current password",
  disable: "Turn off",
  // Optional, unlike every key above — it defaults to "QR code".
  qrAlt: "Sample QR code for an authenticator app",
};

/**
 * The only stateful machine in this section, and the one place the props do not
 * fully describe the component: `enabled` and `setup` are independent, and the card
 * renders the scan panel whenever `setup` is non-null — including while `enabled`
 * is true. Clearing `setup` on a successful enable is therefore the APP'S job, and
 * this specimen does it (see `enable`). Leave it set and you get the QR and the
 * turn-off form stacked in one card.
 */
function TwoFactorRow() {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ qrSvg: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  // The escape hatch the card lacks: once `setup` is set there is no Cancel inside
  // it, so a reader who started setup and does not want to finish would be stuck.
  const stuck = setup !== null && !enabled;

  const startSetup = async () => {
    setBusy(true);
    setLog(null);
    await beat();
    setSetup({ qrSvg: QR_SVG_BASE64, secret: FAKE_SECRET });
    setBusy(false);
  };

  const enable = async (code: string) => {
    setBusy(true);
    await beat();
    setEnabled(true);
    setSetup(null);
    setBusy(false);
    setLog(`onEnable("${code}") → accepted`);
  };

  const disable = async (password: string, code: string) => {
    setBusy(true);
    await beat();
    setEnabled(false);
    setSetup(null);
    setBusy(false);
    setLog(`onDisable(password: ${password.length} chars, code: "${code}") → accepted`);
  };

  return (
    <Example
      label="TwoFactorSetting"
      hint="any code is accepted here — the real check lives in the app's verify call"
    >
      <div className="max-w-md">
        <TwoFactorSetting
          enabled={enabled}
          setup={setup}
          onStartSetup={() => void startSetup()}
          onEnable={(code) => void enable(code)}
          onDisable={(password, code) => void disable(password, code)}
          busy={busy}
          labels={TWO_FACTOR_LABELS}
        />
      </div>
      <Row className="mt-3">
        {log && <span className="font-mono text-xs text-[var(--text-secondary)]">{log}</span>}
        {stuck && (
          <Button
            variant="secondary"
            onClick={() => {
              setSetup(null);
              setLog(null);
            }}
          >
            Abandon setup
          </Button>
        )}
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          The code field is <code className="font-mono">readOnly</code> until you focus it — a
          guard against browsers autofilling a one-time-code field with the saved username. It
          keeps the look of an editable field via{" "}
          <code className="font-mono">FIELD_WRITABLE_LOOK</code>, so it reads as typeable and
          becomes typeable on click. Enter submits, as does the button.
        </Note>
        <Note>
          <code className="font-mono">setup</code> is opaque to the card:{" "}
          <code className="font-mono">{"{ qrSvg, secret }"}</code>, where{" "}
          <code className="font-mono">qrSvg</code> is base64 of an SVG document — not a URL and
          not raw markup. Nothing validates it, so a wrong shape shows a broken image rather
          than an error.
        </Note>
        <Note>
          One <code className="font-mono">code</code> state is shared by the enable form and the
          disable form. They never show together in this specimen, but they can (see above), and
          then both fields are the same box typed twice.
        </Note>
        <PaletteBlindNote />
      </div>
    </Example>
  );
}

/**
 * Both settings fields are a `Select` with two props re-typed, so everything else a
 * `Select` takes — `hint`, `disabled`, `required`, `invalid`, `error`, `id` — passes
 * straight through.
 */
function PassthroughRow() {
  const [lang, setLang] = useState("");
  return (
    <Example
      label="ThemeSetting · LanguageSetting — Select props pass through"
      hint="hint, disabled, required, invalid, error, id"
    >
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <ThemeSetting
          id="theme-managed"
          value="dark"
          onChange={() => {}}
          label="Theme"
          optionLabels={{ system: "Match system", light: "Light", dark: "Dark" }}
          hint="Managed by your organisation"
          disabled
        />
        <LanguageSetting
          id="language-required"
          value={lang}
          onChange={setLang}
          label="Language"
          options={[
            { code: "", label: "—" },
            { code: "en", label: "English" },
            { code: "de", label: "Deutsch" },
          ]}
          required
          invalid={lang === ""}
          error={lang === "" ? "Pick the language your reports are written in." : undefined}
        />
      </div>
    </Example>
  );
}

/** The card before the account has loaded, and with rich nodes where it takes them. */
function ProfileLoadingRow() {
  const [draft, setDraft] = useState("");
  return (
    <Example
      label="ProfileSetting — before the account has loaded"
      hint="name and email null → em dashes and a placeholder avatar; role and memberSince as nodes"
    >
      <div className="max-w-md">
        <ProfileSetting
          name={null}
          email={null}
          role={
            <span className="rounded bg-[var(--bg-surface-2)] px-1.5 py-0.5 text-xs font-medium">
              Owner
            </span>
          }
          memberSince={<time dateTime="2019-03-14">14.03.2019</time>}
          value={draft}
          onChange={setDraft}
          onSave={() => setDraft("")}
          labels={PROFILE_LABELS}
        />
      </div>
      <div className="mt-3">
        <Note>
          Known issue: the display-name field has a fixed <code className="font-mono">id</code>{" "}
          (<code className="font-mono">display-name</code>), so with two cards on one page — as
          here — both labels point at the first card&apos;s input.
        </Note>
      </div>
    </Example>
  );
}

export function Settings() {
  return (
    <>
      <ThemeRow />
      <LanguageRow />
      <PassthroughRow />
      <ProfileRow />
      <ProfileLoadingRow />
      <PasswordRow />
      <TwoFactorRow />
    </>
  );
}
