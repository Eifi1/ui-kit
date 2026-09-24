import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Autocomplete, Button, Checkbox, Combobox, type ComboOption } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";

/**
 * Autocomplete — the inline async field — and the combobox family's 0.6.0 parity
 * (`error`, `disabled`, and the core's `minChars` / `debounceMs` / load failure).
 *
 * Every lookup here is FAKE: a `setTimeout` over a fixed list, so the page works
 * offline and the debounce, the loading state and the failure path can all be seen.
 */

const ADDRESSES = [
  "Bahnhofstrasse 1, 8001 Zürich",
  "Bahnhofstrasse 12, 8001 Zürich",
  "Bahnhofplatz 2, 3011 Bern",
  "Rue de Lausanne 12, 1201 Genève",
  "Rue du Rhône 48, 1204 Genève",
  "Via Nassa 5, 6900 Lugano",
  "Marktgasse 20, 3011 Bern",
  "Freie Strasse 35, 4001 Basel",
];

/** The search-then-act specimen's lock: a row in Bern is listed but `disabled` —
 *  keksdose's write-locked result, which must be seen and must not be taken. */
const lockedRow = (o: ComboOption<string>): ComboOption<string> =>
  o.label.includes("Bern") ? { ...o, disabled: true, sublabel: "Read-only in this demo" } : o;

/** A pretend geocoder: 450 ms away, and down whenever `outage` is set. */
function fakeGeocode(query: string, outage: boolean): Promise<ComboOption<string>[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outage) {
        reject(new Error("503"));
        return;
      }
      const q = query.trim().toLowerCase();
      resolve(
        ADDRESSES.filter((a) => a.toLowerCase().includes(q)).map((a) => ({ value: a, label: a })),
      );
    }, 450);
  });
}

function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">{children}</p>;
}

export function AutocompleteDemo() {
  const [address, setAddress] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [outage, setOutage] = useState(false);

  const [search, setSearch] = useState("8001 Zürich");
  const [pinned, setPinned] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState<boolean | null>(null);

  const [required, setRequired] = useState("");
  const [customer, setCustomer] = useState("");

  return (
    <>
      <Note>
        <strong>Keyboard:</strong> focus stays in the field. ↓/↑ walk the suggestions, passing over a
        disabled one (named by
        <code> aria-activedescendant</code>), Enter takes the highlighted one — with none
        highlighted, Enter is left to the form — Escape closes the list, Tab closes it and moves on.
        A polite live region says what the list now holds: loading, how many results, none, or a
        failed lookup.
      </Note>

      <Example
        label="Autocomplete — free text"
        hint="the text is the value; a suggestion completes it (kastlan's address field)"
      >
        <Stage>
          <Autocomplete
            label="Address"
            icon={<MapPin />}
            value={address}
            onChange={setAddress}
            loadOptions={(q) => fakeGeocode(q, outage)}
            minChars={2}
            onSelect={(o) => setPicked(o.label)}
          />
        </Stage>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            label="Simulate an outage"
            checked={outage}
            onChange={(e) => setOutage(e.target.checked)}
          />
        </div>
        <StateLine>{`value = "${address}"   onSelect → ${picked ?? "—"}`}</StateLine>
      </Example>

      <Example
        label="Autocomplete — search, then act"
        hint={
          <>
            <code>fillOnSelect={"{false}"}</code>, <code>size=&quot;sm&quot;</code>,{" "}
            <code>disabled</code> rows and <code>open</code> held shut while a pick is confirmed
            (keksdose&apos;s address search)
          </>
        }
      >
        <Stage>
          <div className="w-full max-w-sm space-y-2">
            <Autocomplete
              aria-label="Find the shop's address"
              placeholder="Street, postcode or town"
              // The compact field — Select size="sm"'s 28px box — and the icon
              // follows it down to 14px.
              size="sm"
              icon={<Search />}
              value={search}
              onChange={(text) => {
                setSearch(text);
                setConfirming(null);
              }}
              loadOptions={(q) => fakeGeocode(q, false).then((rows) => rows.map(lockedRow))}
              minChars={3}
              debounceMs={400}
              fillOnSelect={false}
              onSelect={(o) => setConfirming(o.label)}
              // Shut while the confirm step is up, whatever focus does; `undefined`
              // hands it back to the field. No lookup runs while it is held shut.
              open={confirming ? false : undefined}
              onOpenChange={setLastOpen}
              status={
                search.trim().length < 3 ? "Type at least 3 characters to search." : undefined
              }
            />
            {confirming && (
              <div className="space-y-2 rounded-md border border-[var(--border)] p-2 text-xs">
                <p className="text-[var(--text-secondary)]">{confirming}</p>
                <div className="flex gap-2">
                  <Button
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => {
                      setPinned(confirming);
                      setConfirming(null);
                    }}
                  >
                    Use this address
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => setConfirming(null)}
                  >
                    Back to the list
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Stage>
        <StateLine>{`query = "${search}"   onOpenChange → ${lastOpen ?? "—"}   pinned → ${pinned ?? "—"}`}</StateLine>
        <p className="text-xs text-[var(--text-muted)]">
          Seeded with a query: focusing the field looks it up (no request on mount, none below
          <code> minChars</code>, one per pause in typing), and the text is never reset. Rows in
          Bern are <code>disabled</code>: listed with their reason, skipped by ↑/↓, and a click
          takes nothing. Taking a row opens a confirm step, and <code>open={"{false}"}</code> keeps
          the list shut under it even while the field has focus.
        </p>
      </Example>

      <Example label="Autocomplete — error and disabled" hint="the same contract as Input">
        <Stage>
          <Autocomplete
            label="Delivery address"
            value={required}
            onChange={setRequired}
            loadOptions={(q) => fakeGeocode(q, false)}
            error={required.trim() ? undefined : "An address is required"}
          />
          <Autocomplete
            label="Billing address"
            value="Via Nassa 5, 6900 Lugano"
            onChange={() => {}}
            disabled
          />
        </Stage>
      </Example>

      <Example
        label="Combobox — error and disabled"
        hint="free text over existing values, the datalist replacement (lenkbank's scope fields)"
      >
        <Stage>
          <Combobox
            label="Customer"
            value={customer}
            onChange={setCustomer}
            options={["ACME AG", "Globex GmbH", "Initech SA"]}
            error={customer.trim() ? undefined : "Name the customer"}
          />
          <Combobox
            label="Project"
            value="Rollout 2026"
            onChange={() => {}}
            options={["Rollout 2026"]}
            disabled
          />
        </Stage>
      </Example>
    </>
  );
}
