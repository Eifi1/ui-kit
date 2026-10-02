import { useState } from "react";
import { Button, FieldHint, LanguageSelect, OneTimeCodeInput, PasswordSetting, Switch, TILE_SIZE, TileRadioGroup } from "@eifi1/ui-kit";
import type { KitLanguageCode } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * 0.22.0 account fields: the verification-code field (kastlan 3, keksdose K8), the
 * strength meter on PasswordSetting (kastlan), the language form field
 * (Kurvenschmiede) and the now-public TileRadioGroup. Every value is synthetic.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── OneTimeCodeInput — page: auth-account ──────────────────────────────── */

export function OneTimeCode022Demo() {
  const [value, setValue] = useState("");
  const [guard, setGuard] = useState(false);
  const [log, setLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verify = (entered: string) => {
    // Any six digits but 000000 "verify" here; the real check is the app's call.
    if (entered === "000000") setError("That code has expired. Enter the newest one.");
    else {
      setError(null);
      setLog(`verify("${entered}")`);
    }
  };
  return (
    <Example label="OneTimeCodeInput — the sign-in verification code" hint="one field: paste and the platform's code autofill land in it">
      <div className="max-w-sm space-y-3">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            verify(value);
          }}
        >
          <OneTimeCodeInput
            // Re-mounted when the switch flips, so the guard starts fresh.
            key={String(guard)}
            label="Verification code"
            hint="The six digits your authenticator app shows"
            value={value}
            onChange={(next) => {
              setValue(next);
              setError(null);
            }}
            onComplete={(full) => setLog(`onComplete("${full}") — the app decides whether to verify now`)}
            error={error}
            readOnlyUntilFocus={guard}
          />
          <Button type="submit" variant="brand" disabled={value.length !== 6}>
            Verify
          </Button>
        </form>
        <Switch label="readOnlyUntilFocus (what TwoFactorSetting uses)" checked={guard} onCheckedChange={setGuard} />
        <Row>
          {log && <span className={READOUT}>{log}</span>}
          <span className={READOUT}>value: "{value}"</span>
        </Row>
      </div>
      <div className="mt-3 space-y-2">
        <Note>
          Type or paste {code("123 456")} or {code("012-345")}: spaces and dashes go, letters are refused, and the
          leading zero stays — the value is a string. A pasted whole code replaces what is there. Try{" "}
          {code("000000")} for the error.
        </Note>
        <Note>
          {code("onComplete")} only reports that six digits are in. Nothing submits by itself: the button (or Enter)
          does.
        </Note>
      </div>
    </Example>
  );
}

/** Unlabelled, named by the prompt above it — kastlan's login shape. */
export function OneTimeCodeUnlabelled022Demo() {
  const [value, setValue] = useState("");
  return (
    <Example label="OneTimeCodeInput — named by its prompt" hint="aria-labelledby, a placeholder, a FieldHint at the end edge">
      <div className="max-w-xs space-y-2">
        <p id="otp-022-prompt" className="text-sm text-[var(--text-secondary)]">
          Enter the code from your authenticator app.
        </p>
        <OneTimeCodeInput
          aria-labelledby="otp-022-prompt"
          placeholder="000000"
          inputClassName="text-center text-lg"
          hint={<FieldHint label="Codes change every 30 seconds" />}
          value={value}
          onChange={setValue}
        />
      </div>
    </Example>
  );
}

/* ── PasswordSetting with the meter — page: settings ────────────────────── */

export function PasswordStrength022Demo() {
  const [log, setLog] = useState<string | null>(null);
  return (
    <Example label="PasswordSetting — strength + maxBytes" hint="opt-in: without them the card is unchanged">
      <div className="max-w-md">
        <PasswordSetting
          strength
          maxBytes={72}
          onSubmit={async (current, next) => {
            await new Promise((r) => setTimeout(r, 600));
            setLog(`onSubmit(current: ${current.length} chars, new: ${next.length} chars) → accepted`);
          }}
        />
      </div>
      <Row className="mt-3">{log && <span className={READOUT}>{log}</span>}</Row>
      <div className="mt-3 space-y-2">
        <Note>
          {code("strength")} draws the PasswordStrengthMeter under the new password, its length rule taken from{" "}
          {code("minLength")} (8 here, the default). {code("maxBytes={72}")} is bcrypt&apos;s ceiling: the meter
          warns as you type and the card refuses to submit over it — an accent or emoji counts for more than one.
        </Note>
      </div>
    </Example>
  );
}

/* ── LanguageSelect — page: settings ─────────────────────────────────────── */

export function LanguageSelect022Demo() {
  const [invite, setInvite] = useState<string>("de-CH");
  const [reviewer, setReviewer] = useState<KitLanguageCode>("fr");
  return (
    <Example label="LanguageSelect — a language as a form field" hint="label, hint, error; the names from the kit's registry">
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <LanguageSelect
          label="Invitation language"
          hint="The invitation mail goes out in this language"
          codes={["de-CH", "en", "fr", "it"]}
          value={invite}
          onChange={setInvite}
        />
        <LanguageSelect
          label="Reviewer language"
          optionLabel={(language) => language.englishName}
          value={reviewer}
          onChange={setReviewer}
        />
      </div>
      <Row className="mt-3">
        <span className={READOUT}>invitation: "{invite}"</span>
        <span className={READOUT}>reviewer: "{reviewer}"</span>
        <Button variant="secondary" size="sm" onClick={() => setInvite("de-AT")}>
          Set value to "de-AT"
        </Button>
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          {code("codes")} are the languages offered, in that order; each shows by its own name, marked with its
          language for a screen reader. A tag that is not one of them shows as the code it resolves to —{" "}
          {code("de-AT")} as Deutsch — without being written back.
        </Note>
      </div>
    </Example>
  );
}

/* ── TileRadioGroup — page: choices ─────────────────────────────────────── */

const PATTERNS = [
  { key: "dots", label: "Dots" },
  { key: "stripes", label: "Stripes", note: "Used by Example Co" },
  { key: "grid", label: "Grid" },
  { key: "waves", label: "Waves" },
] as const;
type Pattern = (typeof PATTERNS)[number]["key"];

function PatternGlyph({ pattern }: { pattern: Pattern }) {
  const glyph = TILE_SIZE.lg.glyph;
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={glyph} fill="currentColor" stroke="currentColor">
      {pattern === "dots" && [4, 10, 16].flatMap((x) => [4, 10, 16].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} stroke="none" />))}
      {pattern === "stripes" && [3, 8, 13, 18].map((x) => <line key={x} x1={x} y1={2} x2={x} y2={18} strokeWidth={2} />)}
      {pattern === "grid" && (
        <g fill="none" strokeWidth={1.5}>
          <rect x={2} y={2} width={16} height={16} />
          <line x1={10} y1={2} x2={10} y2={18} />
          <line x1={2} y1={10} x2={18} y2={10} />
        </g>
      )}
      {pattern === "waves" && (
        <g fill="none" strokeWidth={1.6}>
          <path d="M1 6 q4.5 -4 9 0 t9 0" />
          <path d="M1 13 q4.5 -4 9 0 t9 0" />
        </g>
      )}
    </svg>
  );
}

export function TileRadioGroup022Demo() {
  const [pattern, setPattern] = useState<Pattern | null>("stripes");
  return (
    <Example label="TileRadioGroup — tiles of the app's own" hint="the container is yours: role=radiogroup and a name">
      <div className="space-y-2">
        <p id="pattern-022-heading" className="text-sm font-medium">
          Chart fill
        </p>
        <div role="radiogroup" aria-labelledby="pattern-022-heading" className="flex flex-wrap items-center gap-1.5">
          <TileRadioGroup
            items={[{ key: null, label: "No fill" }, ...PATTERNS]}
            checked={pattern}
            onSelect={setPattern}
            size="lg"
            renderTile={(item) => (item.key ? <PatternGlyph pattern={item.key} /> : null)}
          />
        </div>
        <span className={READOUT}>value: {pattern === null ? "null" : `"${pattern}"`}</span>
      </div>
      <div className="mt-3 space-y-2">
        <Note>
          The machinery under SwatchPicker and IconPicker, public since 0.22: one tab stop, arrows to move and choose,
          a bubble with each tile&apos;s name. It draws the tiles only — the {code('role="radiogroup"')} element and its
          name are the caller&apos;s. For an option that has to be read (a plan with a price and features), use{" "}
          {code('ChoiceCardGroup type="radio"')} instead.
        </Note>
      </div>
    </Example>
  );
}
