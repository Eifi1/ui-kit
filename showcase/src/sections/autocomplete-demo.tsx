import { useRef, useState } from "react";
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

/** Options the caller already holds, with a canton as sublabel (the filter reads it). */
const TOWNS: ComboOption<string>[] = [
  { value: "zh", label: "Zürich", sublabel: "ZH" },
  { value: "be", label: "Bern", sublabel: "BE" },
  { value: "bs", label: "Basel", sublabel: "BS" },
  { value: "ge", label: "Genève", sublabel: "GE" },
  { value: "lu", label: "Lugano", sublabel: "TI" },
];

/** A pretend server's ranking: every street, best match first — including rows whose
 *  label does not contain the query, which a client-side filter would have dropped. */
function rankStreets(query: string): ComboOption<string>[] {
  const q = query.trim().toLowerCase();
  return [...ADDRESSES]
    .sort((a, b) => Number(b.toLowerCase().includes(q)) - Number(a.toLowerCase().includes(q)))
    .slice(0, 4)
    .map((a) => ({ value: a, label: a }));
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
  const [costCentre, setCostCentre] = useState("");

  const [town, setTown] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [street, setStreet] = useState("");
  const [streetRows, setStreetRows] = useState<ComboOption<string>[]>([]);
  const [streetLoading, setStreetLoading] = useState(false);
  const streetRequest = useRef(0);
  /** The page's own fetch: what a caller with its own query hook does. The latest
   *  request wins; an older one that lands late is dropped. */
  const onStreet = (text: string) => {
    setStreet(text);
    const id = ++streetRequest.current;
    if (text.trim().length === 0) {
      setStreetRows([]);
      setStreetLoading(false);
      return;
    }
    setStreetLoading(true);
    window.setTimeout(() => {
      if (id !== streetRequest.current) return;
      setStreetRows(rankStreets(text));
      setStreetLoading(false);
    }, 500);
  };

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
            // The two automatic status lines, in the caller's words.
            emptyLabel="No such address"
            loadErrorLabel="The address service is not answering"
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
        <p className="text-xs text-[var(--text-muted)]">
          Type &quot;xyz&quot; for <code>emptyLabel</code>; tick the outage and type again for{" "}
          <code>loadErrorLabel</code>. The text you typed survives both.
        </p>
      </Example>

      <Example
        label="Autocomplete — the caller's own options"
        hint={
          <>
            <code>options</code> instead of <code>loadOptions</code>: filtered here, or given
            ranked with <code>filter={"{false}"}</code> and <code>loading</code>
          </>
        }
      >
        <Stage>
          <Autocomplete
            label="Street (caller-fetched)"
            value={street}
            onChange={onStreet}
            options={streetRows}
            filter={false}
            loading={streetLoading}
          />
          <Autocomplete
            label="Town"
            value={town}
            onChange={setTown}
            options={TOWNS}
            // 0: an empty field lists every town, so the held-open list has rows.
            minChars={0}
            // `invalid` alone: the ring and aria-invalid, no message under the field.
            invalid={town.trim() === ""}
            // `true` shows the list even while the field is not focused.
            open={pinOpen ? true : undefined}
          />
        </Stage>
        <Checkbox
          label="Hold the town list open (open={true})"
          checked={pinOpen}
          onChange={(e) => setPinOpen(e.target.checked)}
        />
        <StateLine>{`town = "${town}"   street = "${street}"   loading = ${streetLoading}`}</StateLine>
        <p className="text-xs text-[var(--text-muted)]">
          The town list is narrowed by the text (label or sublabel). The street list is fetched by
          the page itself — 500&nbsp;ms per keystroke — and shown exactly as the pretend server
          ranked it, so &quot;Rue&quot; still lists two Bahnhofstrasse rows the server thought
          close enough. While the page&apos;s fetch is out, <code>loading</code> puts a
          spinner in the field — and the loading line in the list while it has no rows yet.
        </p>
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
          <Combobox
            label="Cost centre"
            value={costCentre}
            onChange={setCostCentre}
            options={["4100 Sales", "4200 Service", "4300 Admin"]}
            // Required and unanswered, with no message of its own.
            invalid={costCentre.trim() === ""}
          />
        </Stage>
      </Example>
    </>
  );
}
