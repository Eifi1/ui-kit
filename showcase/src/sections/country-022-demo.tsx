import { useState } from "react";
import { Button, CountrySelect, FieldHint, ToggleGroup, WriteLockProvider } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * CountrySelect (0.22): kastlan's address country with its six neighbours on top, and
 * keksdose's bank picker restricted to fifteen countries. The names are the browser's
 * own (`Intl.DisplayNames`), so switching the locale below renames all 249 rows
 * without the kit shipping a single country name.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const LOCALES = [
  { value: "en", label: "English" },
  { value: "de-CH", label: "Deutsch (CH)" },
  { value: "fr-CH", label: "Français (CH)" },
  { value: "it-CH", label: "Italiano (CH)" },
];

const KASTLAN_PREFERRED = ["CH", "LI", "DE", "AT", "FR", "IT"];
const KEKSDOSE_BANKS = ["DE", "AT", "CH", "FR", "IT", "ES", "NL", "BE", "PT", "PL", "SE", "DK", "FI", "GB", "IE"];

export function Country022Demo() {
  const [locale, setLocale] = useState("de-CH");
  const [address, setAddress] = useState<string | null>("CH");
  const [bank, setBank] = useState<string | null>(null);
  const [locked, setLocked] = useState(true);
  const [saved, setSaved] = useState<string | null>("LI");

  return (
    <div className="space-y-6">
      <Example
        label="CountrySelect — every ISO country, preferred on top"
        hint="value is the alpha-2 code; names from the runtime in the locale; search ignores accents"
      >
        <div className="flex flex-col gap-3">
          <ToggleGroup aria-label="Locale" value={locale} onChange={setLocale} options={LOCALES} />
          <div className="grid gap-3 sm:grid-cols-2">
            <CountrySelect
              label="Country"
              value={address}
              onChange={setAddress}
              preferred={KASTLAN_PREFERRED}
              locale={locale}
              flags
              hint={<FieldHint label="Where the customer lives. The six countries most customers live in come first." />}
            />
            <CountrySelect
              label="Country (no flags)"
              value={address}
              onChange={setAddress}
              locale={locale}
              hint="All 249 countries, sorted by name"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Stored value: {code(address ?? "null")}
          </p>
        </div>
      </Example>

      <Example label="Restricted list — keksdose's bank countries" hint="countries, error, invalid">
        <div className="flex items-start gap-3">
          <CountrySelect
            className="min-w-0 flex-1 sm:max-w-xs"
            label="Bank country"
            value={bank}
            onChange={setBank}
            countries={KEKSDOSE_BANKS}
            flags
            error={bank ? undefined : "Pick the country your bank is in"}
            aria-required
          />
          <Button variant="secondary" onClick={() => setBank(null)}>
            Clear
          </Button>
        </div>
      </Example>

      <Example label="A country that saves itself, under the write lock" hint="commit, disabledReason, disabled">
        <div className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Lock"
            value={locked ? "locked" : "open"}
            onChange={(v) => setLocked(v === "locked")}
            options={[
              { value: "locked", label: "Read-only viewer" },
              { value: "open", label: "Owner" },
            ]}
          />
          <WriteLockProvider locked={locked} reason="Shared with you to read.">
            <div className="grid gap-3 sm:grid-cols-3">
              <CountrySelect label="Tax residence (commit)" value={saved} onChange={setSaved} commit flags />
              <CountrySelect
                label="Own reason"
                value="CH"
                onChange={() => {}}
                disabledReason="A signed handover cannot change its country."
              />
              <CountrySelect label="Disabled" value="DE" onChange={() => {}} disabled />
            </div>
          </WriteLockProvider>
        </div>
      </Example>

      <Note>
        {code("CountrySelect")} is the entity pickers&apos; combobox (a searchable panel on a pointer device, the
        full-screen sheet on a phone) with a trigger of its own. {code("countries")} restricts the list,{" "}
        {code("preferred")} puts a short group above the alphabetical rest, {code("flags")} draws{" "}
        {code("fi fi-xx")} spans — the host imports {code("flag-icons")}, as for {code("LanguageMenu")}. Under a
        locked {code("WriteLockProvider")} only a select with {code("commit")} locks: a country inside a form with
        its own Save stays editable. {code("COUNTRY_CODES")} and {code("countryName(code, locale)")} are exported for
        showing a stored code elsewhere.
      </Note>
    </div>
  );
}
