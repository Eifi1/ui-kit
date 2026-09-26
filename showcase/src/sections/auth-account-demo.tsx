import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, KeyRound, Moon, Sun, Wallet } from "lucide-react";
import {
  AuthLayout,
  Button,
  DEFAULT_ACCOUNT_SETTINGS_LABELS,
  IconButton,
  Input,
  PasskeysSetting,
  Switch,
  ToggleGroup,
  TwoFactorSetting,
  UiKitProvider,
} from "@eifi1/ui-kit";
import type { PasskeyItem, TwoFactorSetupData, UiKitLabelOverrides } from "@eifi1/ui-kit";
import { UI_KIT_LABELS_DE } from "@eifi1/ui-kit/i18n/de";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * AUTH & ACCOUNT — the page frame outside the app (sign-in, the legal pages) and the
 * two account sections added in 0.12: two-factor from an `otpauth://` URI, and passkeys.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;
const beat = (ms = 900) => new Promise((r) => setTimeout(r, ms));

/* ── AuthLayout ──────────────────────────────────────────────────────────── */

const LINK_BUTTON =
  "rounded-sm text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]";

function LegalText() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
      <p>
        Acme Books GmbH, Musterstraße 1, 10115 Berlin. Managing director: Erika Mustermann. Registered at
        Amtsgericht Charlottenburg, HRB 000000.
      </p>
      <p>
        Running text reads badly centred, which is why the legal pages take {code('width="wide"')}: a
        {" "}{code("max-w-3xl")} column from the top of the page with a start-aligned header, and — with{" "}
        {code("card={false}")} — no card surface either.
      </p>
      <p>
        VAT ID DE000000000. Responsible for content under § 18 (2) MStV: Erika Mustermann, address as above.
      </p>
    </div>
  );
}

function AuthLayoutSpecimen() {
  const [screen, setScreen] = useState<"sign-in" | "imprint">("sign-in");
  const [card, setCard] = useState(true);
  const [logoTile, setLogoTile] = useState(true);
  const [corner, setCorner] = useState(true);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<"EN" | "DE">("EN");
  const [log, setLog] = useState("—");
  const wide = screen === "imprint";

  const footer = (
    <>
      <button type="button" className={LINK_BUTTON} onClick={() => setScreen("imprint")}>
        Imprint
      </button>
      <button type="button" className={LINK_BUTTON} onClick={() => setScreen("imprint")}>
        Privacy
      </button>
      <button type="button" className={LINK_BUTTON} onClick={() => setScreen("imprint")}>
        Terms
      </button>
    </>
  );

  return (
    <Example
      label="AuthLayout — narrow sign-in and wide legal page"
      hint="in a box here; in an app it is the page's outermost element and owns min-h-dvh"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-[var(--text-muted)]">screen</span>
          <ToggleGroup<"sign-in" | "imprint">
            ariaLabel="screen"
            value={screen}
            onChange={setScreen}
            options={[
              { value: "sign-in", label: 'narrow · sign-in' },
              { value: "imprint", label: 'wide · imprint' },
            ]}
          />
        </div>
        <Switch
          label="card"
          description="Off: header and content on the page itself"
          checked={card}
          onCheckedChange={setCard}
        />
        <Switch label="logoTile" description="Off: the logo as it is" checked={logoTile} onCheckedChange={setLogoTile} />
        <Switch label="themeToggle · languageMenu" description="The top-end corner" checked={corner} onCheckedChange={setCorner} />
      </div>

      {/* The frame: a fixed height and its own scroll. `min-h-full` replaces the layout's
          `min-h-dvh` (cn merges them — later wins), so it fills the box, not the window. */}
      <div className="mt-4 h-[32rem] overflow-auto rounded-md border border-[var(--border)]">
        <AuthLayout
          className="min-h-full"
          data-demo="auth-layout"
          width={wide ? "wide" : "narrow"}
          card={card}
          logoTile={logoTile}
          logo={<Wallet />}
          title={wide ? "Imprint" : "Acme Books"}
          description={wide ? "Last updated 1 September 2026" : "Sign in to your household books"}
          back={
            wide ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                onClick={() => setScreen("sign-in")}
              >
                <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden /> Back to sign in
              </button>
            ) : undefined
          }
          themeToggle={
            corner ? (
              <IconButton label={dark ? "Light theme" : "Dark theme"} size="sm" onClick={() => setDark((d) => !d)}>
                {dark ? <Sun /> : <Moon />}
              </IconButton>
            ) : undefined
          }
          languageMenu={
            corner ? (
              <Button variant="ghost" size="sm" onClick={() => setLang((l) => (l === "EN" ? "DE" : "EN"))}>
                {lang}
              </Button>
            ) : undefined
          }
          footer={footer}
          footerLabel="Legal"
        >
          {wide ? (
            <LegalText />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setLog("submitted");
              }}
            >
              <Input label="Email" type="email" autoComplete="username" defaultValue="marcel@example.com" />
              <Input label="Password" type="password" autoComplete="current-password" />
              <Button type="submit" className="w-full">
                Sign in
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setLog("passkey")}>
                <KeyRound className="size-4" aria-hidden /> Sign in with a passkey
              </Button>
            </form>
          )}
        </AuthLayout>
      </div>
      <p className={`mt-3 ${READOUT}`}>
        width: {wide ? "wide" : "narrow"} · theme toggle: {dark ? "dark" : "light"} (simulated) · language: {lang} · form: {log}
      </p>
      <div className="mt-3 space-y-2">
        <Note>
          The corner, the {code("<main>")} and the footer are rows of one column that grows with its content —
          shrink the box or open the imprint and the page scrolls instead of the footer landing on the card, which
          is what the absolutely placed footers it replaces did on a short phone screen. The footer&apos;s links
          are a {code("<nav>")} named by {code("footerLabel")}. Padding follows the safe-area insets.
        </Note>
        <Note>
          Here inside the showcase&apos;s own page, AuthLayout&apos;s {code("<main>")} and {code("<h1>")} are nested
          in the page&apos;s — in an app it is the whole page, outside the shell, and they are the only ones.
        </Note>
      </div>
    </Example>
  );
}

/* ── TwoFactorSetting from an otpauth URI ────────────────────────────────── */

const OTPAUTH =
  "otpauth://totp/Acme%20Books:marcel%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Acme%20Books&algorithm=SHA1&digits=6&period=30";

function TwoFactorOtpauthSpecimen() {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetupData | null>(null);
  const [busy, setBusy] = useState(false);
  const [explicitSecret, setExplicitSecret] = useState(false);
  const [customQr, setCustomQr] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    await beat();
    setSetup(explicitSecret ? { otpauthUri: OTPAUTH, secret: "JBSW Y3DP EHPK 3PXP" } : { otpauthUri: OTPAUTH });
    setBusy(false);
    setLog("onStartSetup() → { otpauthUri }");
  };

  return (
    <Example
      label="TwoFactorSetting — from an otpauth URI"
      hint="the URI an authenticator backend hands out; the kit draws the QR itself and reads the secret out of it"
    >
      <Row>
        <Switch
          label="secret given too"
          description="Off: parsed from the URI's secret="
          checked={explicitSecret}
          onCheckedChange={setExplicitSecret}
        />
        <Switch label="renderQr" description="Draw the code yourself" checked={customQr} onCheckedChange={setCustomQr} />
      </Row>
      <div className="mt-4 max-w-md">
        <TwoFactorSetting
          enabled={enabled}
          setup={setup}
          busy={busy}
          onStartSetup={() => void start()}
          onEnable={async (otp) => {
            setBusy(true);
            await beat();
            setBusy(false);
            setSetup(null);
            setEnabled(true);
            setLog(`onEnable("${otp}") → on`);
          }}
          onDisable={async (password, otp) => {
            setBusy(true);
            await beat();
            setBusy(false);
            setEnabled(false);
            setLog(`onDisable(${password.length} chars, "${otp}") → off`);
          }}
          renderQr={
            customQr
              ? (uri) => (
                  <div className="flex size-48 items-center justify-center bg-[var(--bg-surface-2)] p-3 text-center font-mono text-[10px] break-all text-[var(--text-secondary)]">
                    renderQr({uri.slice(0, 40)}…)
                  </div>
                )
              : undefined
          }
        />
      </div>
      <Row className="mt-3">
        <span className={READOUT}>{log ?? "press “Set up two-factor authentication”"}</span>
        {(setup || enabled) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSetup(null);
              setEnabled(false);
              setLog(null);
            }}
          >
            Start over
          </Button>
        )}
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          {code("setup={{ otpauthUri }}")}: the QR is the kit&apos;s own {code("QrCode")} (an encoder with no
          dependency), drawn with its white quiet zone inside the SVG so it scans on the dark theme. The key under
          it is the URI&apos;s {code("secret")} parameter, grouped in fours, {code('dir="ltr"')} and with a copy
          button — the fallback for a phone that cannot scan the screen it is on. Both carry{" "}
          {code("data-private")}. The older {code("{ qrSvg, secret }")} shape still works (Settings page).
        </Note>
        <Note>Any six digits are accepted here — the check is the app&apos;s verify call.</Note>
      </div>
    </Example>
  );
}

/* ── PasskeysSetting ─────────────────────────────────────────────────────── */

const NOW = Date.now();
const DAY = 86_400_000;
const SEED: PasskeyItem[] = [
  { id: 1, name: "MacBook Touch ID", createdAt: NOW - 120 * DAY, lastUsedAt: NOW - 2 * DAY },
  { id: 2, name: "Pixel 8", createdAt: NOW - 40 * DAY, lastUsedAt: null },
  { id: 3, name: "YubiKey 5C", createdAt: new Date(NOW - 400 * DAY).toISOString(), lastUsedAt: NOW - 30 * DAY },
];

type PasskeyState = "list" | "empty" | "loading" | "unavailable";

function PasskeysSpecimen() {
  const [state, setState] = useState<PasskeyState>("list");
  const [items, setItems] = useState<PasskeyItem[]>(SEED);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<PasskeyItem["id"] | null>(null);
  const [failNext, setFailNext] = useState(false);
  const [nameField, setNameField] = useState(true);
  const [log, setLog] = useState("—");

  const passkeys = state === "loading" ? undefined : state === "empty" ? [] : items;

  return (
    <Example
      label="PasskeysSetting — add, rename, delete, empty, loading, unavailable"
      hint="the WebAuthn ceremony is the app's: the kit calls onAdd and waits for its promise"
    >
      <Row>
        <ToggleGroup<PasskeyState>
          ariaLabel="state"
          value={state}
          onChange={setState}
          options={[
            { value: "list", label: "list" },
            { value: "empty", label: "empty" },
            { value: "loading", label: "loading" },
            { value: "unavailable", label: "unavailable" },
          ]}
        />
        <Switch label="cancel the next prompt" checked={failNext} onCheckedChange={setFailNext} />
        <Switch label="nameField" checked={nameField} onCheckedChange={setNameField} />
      </Row>
      <div className="mt-4 max-w-md">
        <PasskeysSetting
          passkeys={passkeys}
          adding={adding}
          busyId={busyId}
          nameField={nameField}
          unavailable={
            state === "unavailable" ? "Passkeys need a secure (https) page and a browser that supports them." : undefined
          }
          onAdd={async (name) => {
            setAdding(true);
            await beat(1200);
            setAdding(false);
            if (failNext) {
              setFailNext(false);
              setLog(`onAdd("${name}") → rejected (the user cancelled the OS prompt); the name stays`);
              throw new Error("NotAllowedError");
            }
            const created: PasskeyItem = { id: Date.now(), name: name || "Passkey", createdAt: Date.now(), lastUsedAt: null };
            setItems((all) => [...all, created]);
            if (state === "empty") setState("list");
            setLog(`onAdd("${name}") → registered “${created.name}”`);
          }}
          onRename={async (id, name) => {
            setBusyId(id);
            await beat();
            setBusyId(null);
            setItems((all) => all.map((p) => (p.id === id ? { ...p, name } : p)));
            setLog(`onRename(${id}, "${name}")`);
          }}
          onDelete={async (id) => {
            setBusyId(id);
            await beat();
            setBusyId(null);
            setItems((all) => all.filter((p) => p.id !== id));
            setLog(`onDelete(${id})`);
          }}
        />
      </div>
      <Row className="mt-3">
        <span className={READOUT}>{log}</span>
        <Button variant="ghost" size="sm" onClick={() => setItems(SEED)}>
          Restore the three
        </Button>
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          Delete asks inline, in the row, with focus on Cancel — the card must work in an app without a{" "}
          {code("ConfirmProvider")}. Rename is an inline field; Enter saves, Escape cancels. A row whose rename or
          delete is in flight ({code("busyId")}) has its buttons disabled. The dates are the provider&apos;s locale
          ({code("formatDate")} and {code("locale")} override it); a null {code("lastUsedAt")} reads
          &ldquo;Never used&rdquo;.
        </Note>
        <Note>
          {code("unavailable")} replaces the list and the add button, and its wording is the app&apos;s: only the app
          knows whether it found no WebAuthn support or an insecure context.
        </Note>
      </div>
    </Example>
  );
}

/* ── The labels ──────────────────────────────────────────────────────────── */

/**
 * The provider merges a section key by key at run time (the resolver spreads English,
 * then the provider's section, then the prop), so a partial SECTION is what an app
 * writes. `UiKitLabelOverrides` is only partial one level down, though — per namespace
 * — so the type asks for every key of `passkeys`; hence the cast (reported upstream).
 */
const HOUSE_WORDING = {
  accountSettings: {
    passkeys: { title: "Security keys", add: "Register a key", empty: "No security keys registered" },
    twoFactor: { enable: "Turn on the authenticator app" },
  },
} as UiKitLabelOverrides;

const GERMAN: UiKitLabelOverrides = { accountSettings: UI_KIT_LABELS_DE.accountSettings };

function Scoped({ source, children }: { source: "page" | "house" | "de"; children: ReactNode }) {
  if (source === "page") return <>{children}</>;
  return <UiKitProvider labels={source === "house" ? HOUSE_WORDING : GERMAN}>{children}</UiKitProvider>;
}

function AccountLabelsSpecimen() {
  const [source, setSource] = useState<"page" | "house" | "de">("house");
  const d = DEFAULT_ACCOUNT_SETTINGS_LABELS;
  return (
    <Example
      label="Account-settings labels — accountSettings in the provider"
      hint="every labels prop is optional since 0.12: prop > provider > English"
    >
      <ToggleGroup<"page" | "house" | "de">
        ariaLabel="label source"
        value={source}
        onChange={setSource}
        options={[
          { value: "page", label: "the page's language" },
          { value: "house", label: "house wording" },
          { value: "de", label: "UI_KIT_LABELS_DE" },
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Scoped source={source}>
          <PasskeysSetting passkeys={[]} onAdd={() => beat(600)} />
          <TwoFactorSetting enabled={false} setup={null} onStartSetup={() => {}} onEnable={() => {}} onDisable={() => {}} />
        </Scoped>
      </div>
      <div className="mt-4">
        <OutTable
          rows={[
            ["DEFAULT_ACCOUNT_SETTINGS_LABELS.passkeys.title", d.passkeys.title],
            ["….passkeys.deleteConfirm(\"Pixel 8\")", d.passkeys.deleteConfirm("Pixel 8")],
            ["….twoFactor.secretHint", d.twoFactor.secretHint],
            ["….twoFactor.copySecret", d.twoFactor.copySecret],
            ["….password.mismatch", d.password.mismatch],
            ["Object.keys(DEFAULT_ACCOUNT_SETTINGS_LABELS)", Object.keys(d).join(", ")],
          ]}
        />
      </div>
      <div className="mt-3">
        <Note>
          One namespace, {code("accountSettings")}, with a section per card: {code("profile")}, {code("password")},{" "}
          {code("twoFactor")} and {code("passkeys")}. &ldquo;the page&apos;s language&rdquo; is the showcase&apos;s own
          provider — switch the language in the top bar and both cards follow. The other two are a nested{" "}
          {code("<UiKitProvider labels>")} that overrides only what it names: the house wording changes three
          strings and leaves the rest in the page&apos;s language.
        </Note>
      </div>
    </Example>
  );
}

export function AuthAccountDemo() {
  return (
    <>
      <AuthLayoutSpecimen />
      <TwoFactorOtpauthSpecimen />
      <PasskeysSpecimen />
      <AccountLabelsSpecimen />
    </>
  );
}
