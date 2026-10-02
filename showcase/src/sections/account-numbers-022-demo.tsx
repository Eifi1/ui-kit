import { useState } from "react";
import {
  Button,
  IbanInput,
  Input,
  PhoneInput,
  ToggleGroup,
  formatIsin,
  formatPhone,
  ibanCheckDigits,
  isE164,
  isQrIban,
  isValidIban,
  isValidIsin,
  isinCheckDigit,
} from "@eifi1/ui-kit";
import type { IbanKind } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * Account numbers (0.22): IbanInput and the IBAN/ISIN helpers (kastlan, keksdose) and
 * PhoneInput (kastlan). Every sample is synthetic — zeros with a single 1, the check
 * digits computed by the kit's own helpers — so nothing here is anybody's account.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const sampleIban = (country: string, bban: string) => `${country}${ibanCheckDigits(country, bban)}${bban}`;
const PLAIN = sampleIban("CH", `${"0".repeat(16)}1`);
const QR = sampleIban("CH", `30000${"0".repeat(11)}1`);
const ISIN = `CH000000001${isinCheckDigit("CH000000001")}`;

function IbanDemo() {
  const [kind, setKind] = useState<IbanKind>("any");
  const [iban, setIban] = useState(PLAIN);
  return (
    <Example
      label="IbanInput — grouped in, compact out, checked but never blocked"
      hint="type, paste with spaces or lower case; a wrong checksum says so without refusing a key"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Kind"
          value={kind}
          onChange={(v) => setKind(v as IbanKind)}
          options={[
            { value: "any", label: "any" },
            { value: "qr", label: "qr" },
            { value: "plain", label: "plain" },
          ]}
        />
        <IbanInput
          label="IBAN"
          kind={kind}
          value={iban}
          onValueChange={setIban}
          hint={kind === "qr" ? "The QR-IBAN printed on your QR-bill" : undefined}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setIban(PLAIN)}>
            Regular sample
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIban(QR)}>
            QR sample
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setIban(`${PLAIN.slice(0, -1)}2`)}>
            Wrong checksum
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIban("")}>
            Clear
          </Button>
        </div>
        <OutTable
          rows={[
            ["onValueChange", iban === "" ? "“”" : iban],
            ["isValidIban(value)", String(isValidIban(iban))],
            ["isQrIban(value)", String(isQrIban(iban))],
          ]}
        />
        <Note>
          The field shows the paper format and emits the electronic one ({code("onValueChange")}); the caret stays
          between the same two characters while the groups move. {code('kind="qr"')} refuses a regular IBAN and{" "}
          {code('kind="plain"')} a QR-IBAN (institution id 30000–31999): a QR-bill can only be paid to a QR-IBAN,
          and a QR-IBAN receives nothing else. While typing, only what more typing cannot fix is shown; the rest
          waits for the full length or for blur. Whether the field is required, and whether an invalid IBAN may be
          submitted, stays the form&apos;s rule — check {code("isValidIban")} / {code("ibanProblem")} on submit.
        </Note>
      </div>
    </Example>
  );
}

function IsinDemo() {
  const [isin, setIsin] = useState(ISIN);
  return (
    <Example label="ISIN helpers — isValidIsin, formatIsin" hint="Luhn over the letter-expanded form; ISINs print unbroken">
      <div className="flex flex-col gap-3">
        <Input
          label="ISIN"
          value={isin}
          onChange={(e) => setIsin(e.target.value)}
          error={isin !== "" && !isValidIsin(isin) ? "Not a valid ISIN — check the last digit." : undefined}
        />
        <OutTable
          rows={[
            ["formatIsin(value)", formatIsin(isin) || "“”"],
            ["isValidIsin(value)", String(isValidIsin(isin))],
          ]}
        />
      </div>
    </Example>
  );
}

function PhoneDemo() {
  const [phone, setPhone] = useState("");
  const [legacy, setLegacy] = useState("021 000 00 01 (mornings)");
  return (
    <Example
      label="PhoneInput — E.164 when it reads, the text when it does not"
      hint="default +41; a number typed with its own + takes the select with it"
    >
      <div className="flex flex-col gap-4">
        <PhoneInput label="Phone" value={phone} onValueChange={setPhone} hint="Mobile or landline" />
        <OutTable
          rows={[
            ["onValueChange", phone === "" ? "“”" : phone],
            ["isE164(value)", String(isE164(phone))],
            ["formatPhone(value)", formatPhone(phone) || "“”"],
          ]}
        />
        <PhoneInput label="Phone (saved as free text)" value={legacy} onValueChange={setLegacy} />
        <Note>
          Try {code("021 000 00 01")}, {code("+41 (0)21 000 00 01")}, {code("0041 21 000 00 01")} — all three
          store {code("+41210000001")} — or {code("+33 1 99 00 00 01")}, which switches the select to FR. Text the
          rules cannot read is kept exactly as typed, never refused, and a value saved before the field existed (the
          second field) is shown as it is until someone edits it. Light rules, no libphonenumber: CH, LI, DE, AT, FR
          and IT check the trunk 0 and the length (Italy keeps its 0); any other country is a {code("+")} with 8–15
          digits. A well-formed number that does not exist passes.
        </Note>
      </div>
    </Example>
  );
}

export function AccountNumbers022Demo() {
  return (
    <>
      <IbanDemo />
      <IsinDemo />
      <PhoneDemo />
    </>
  );
}
