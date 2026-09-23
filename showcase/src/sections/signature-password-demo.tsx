import { useRef, useState } from "react";
import { Button, Input, PasswordStrengthMeter, SignaturePad, scorePassword } from "@eifi1/ui-kit";
import type { SignatureDetail, SignaturePadHandle } from "@eifi1/ui-kit";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * SignaturePad and PasswordStrengthMeter.
 *
 * Two small field-adjacent components that each app had written for itself: Kastlan's
 * handover signature and Keksdose's password meter. Every specimen shows what the
 * component hands back, because both are judged by their output — a PNG that has to
 * be legible on paper, a score a form may gate on.
 */

/** The raw value under a specimen, so what the component emits is visible. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{children}</p>;
}

/** The exported PNG on WHITE — where it will end up — whatever the page's theme. */
function Preview({ src }: { src: string | null }) {
  if (!src) return <StateLine>value = null</StateLine>;
  return (
    // The one light surface on this page on purpose: this is the paper the PNG is
    // printed on, and the point of the specimen is that it reads there in both themes.
    <img
      src={src}
      alt="Exported signature"
      className="mt-2 h-20 rounded-md border border-[var(--border)] p-1"
      style={{ background: "white" }}
    />
  );
}

function SignatureSpecimens() {
  const [png, setPng] = useState<string | null>(null);
  const [typed, setTyped] = useState<{ png: string | null; detail: SignatureDetail | null }>({
    png: null,
    detail: null,
  });
  const [saved, setSaved] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [refValue, setRefValue] = useState<string | null>(null);
  const pad = useRef<SignaturePadHandle>(null);

  return (
    <>
      <Note>
        <strong>Accessibility:</strong> the canvas is an image named by the label and described by
        the instructions and its state (&ldquo;Nothing drawn yet&rdquo; / &ldquo;Signature
        drawn&rdquo;). Drawing itself needs a pointer — no ARIA changes that — so{" "}
        <code className="font-mono">allowTypedName</code> offers a typed name instead. It is opt-in
        because whether a typed name counts as a signature is a product decision.
      </Note>

      <Example
        label="SignaturePad — onChange"
        hint="switch the theme: the ink follows it, the PNG does not"
      >
        <Stage>
          <SignaturePad onChange={(url) => setPng(url)} />
        </Stage>
        <Preview src={png} />
      </Example>

      <Example label="SignaturePad — typed-name fallback" hint="allowTypedName">
        <Stage>
          <SignaturePad allowTypedName onChange={(url, detail) => setTyped({ png: url, detail })} />
        </Stage>
        <StateLine>{`detail = ${JSON.stringify(typed.detail)}`}</StateLine>
        <Preview src={typed.png} />
      </Example>

      <Example label="SignaturePad — Save button" hint="onSave, the Kastlan handover shape">
        <Stage>
          <SignaturePad
            label="Tenant signature"
            description="Simple electronic signature — records intent, not a qualified signature."
            onSave={(url) => setSaved(url)}
          />
        </Stage>
        <Preview src={saved} />
      </Example>

      <Example label="SignaturePad — required, read through a ref" hint="error, ref.toDataURL()">
        <Stage>
          <SignaturePad
            ref={pad}
            error={submitted && !refValue ? "Please sign before submitting." : undefined}
          />
        </Stage>
        <Row className="mt-3">
          <Button
            type="button"
            variant="brand"
            onClick={() => {
              setSubmitted(true);
              setRefValue(pad.current?.toDataURL() ?? null);
            }}
          >
            Submit
          </Button>
        </Row>
        {submitted && <Preview src={refValue} />}
      </Example>

      <Example label="SignaturePad — disabled">
        <Stage>
          <SignaturePad disabled onSave={() => {}} />
        </Stage>
      </Example>
    </>
  );
}

function PasswordSpecimens() {
  const [password, setPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [bare, setBare] = useState("");

  return (
    <>
      <Note>
        <strong>Not colour alone:</strong> the level is written beside the bar, each checklist item
        tells a screen reader whether it is met, and a change of level is announced through a polite
        live region. The scorer is exported as <code className="font-mono">scorePassword</code>, so
        a form can gate on the same numbers the meter shows.
      </Note>

      <Example
        label="PasswordStrengthMeter — sign-in password"
        hint="maxBytes={72}, the bcrypt ceiling"
      >
        <Stage>
          <Input
            type="password"
            label="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="demo-password-strength"
          />
        </Stage>
        <PasswordStrengthMeter id="demo-password-strength" value={password} maxBytes={72} />
        <StateLine>{`scorePassword(value) = ${scorePassword(password)}`}</StateLine>
      </Example>

      <Example label="PasswordStrengthMeter — passphrase" hint="minLength={12}, no byte ceiling">
        <Stage>
          <Input
            type="password"
            label="Encryption passphrase"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </Stage>
        <PasswordStrengthMeter value={passphrase} minLength={12} />
      </Example>

      <Example label="PasswordStrengthMeter — bar and level only" hint="showRequirements={false}">
        <Stage>
          <Input
            type="password"
            label="Password"
            autoComplete="new-password"
            value={bare}
            onChange={(e) => setBare(e.target.value)}
          />
        </Stage>
        <PasswordStrengthMeter value={bare} showRequirements={false} />
      </Example>
    </>
  );
}

export function SignaturePasswordDemo() {
  return (
    <>
      <SignatureSpecimens />
      <PasswordSpecimens />
    </>
  );
}
