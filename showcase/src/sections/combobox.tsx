import { useState, useRef } from "react";
import { MapPin, Search } from "lucide-react";
import {
  Button,
  Combobox,
  InlineEntityCombobox,
  usePhoneLayout,
  Autocomplete,
  Checkbox,
  Tooltip,
  cn,
  MultiEntityCombobox,
  Switch,
  WriteLockProvider,
} from "@eifi1/ui-kit";
import type { ComboOption } from "@eifi1/ui-kit";
import { Form, RhfInlineEntityCombobox, RhfMoneyField } from "@eifi1/ui-kit/rhf";
import { useForm } from "react-hook-form";
import { ACCOUNTS, Current, PAYEES, PAYEE_GROUPS, RECURRING } from "./dropdown-fixtures";
import { FieldHint } from "../../../src/components/field-parts";
import { EntityCombobox } from "../../../src/components/entity-combobox";
import { MultiSelect } from "../../../src/components/multi-select";
import { Example, Note, Stage, StateLine, code, READOUT_PRE } from "../lib/section";

/**
 * The Combobox family — Combobox, Autocomplete, the entity comboboxes and their Rhf
 * binding — in one module: one section of the Comboboxes page, one of Entity pickers, and
 * RhfInlineEntityCombobox on the Forms page. The base specimens were comboboxes.tsx and
 * autocomplete-demo.tsx; what the releases added was filed by release (clips-012,
 * fields-022, combobox-023, combobox-024). Each keeps its label, so its anchor and its
 * search entry hold, and says since which release in a Note (refactor audit 2026-10,
 * DOC-8).
 */

/**
 * COMBOBOXES — the free-text half of the dropdown family: `Combobox`, whose value is
 * whatever was typed (and, rendered after it from autocomplete-demo.tsx, `Autocomplete`).
 * The id-keyed pickers are on "Entity pickers"; the parts they are all built from are on
 * "Dropdown parts". The fixtures the three pages share live in dropdown-fixtures.tsx.
 */
function Comboboxes() {
  // The same query the components ask themselves. Rendering the answer turns "the
  // panel looks different on my phone" from a claim into something the reader can
  // check by dragging the window edge.
  const isPhone = usePhoneLayout();

  const [payee, setPayee] = useState("");

  // Click-to-edit cells: which cell is an editor right now, and what it last said.
  const [editing, setEditing] = useState<"payee" | "account" | null>(null);
  const [cellPayee, setCellPayee] = useState("Rewe");
  const [cellAccount, setCellAccount] = useState<string | null>("chk");
  const [editLog, setEditLog] = useState("—");

  return (
    <>
      <Note>
        <strong>Every combobox and entity picker changes shape in the phone layout.</strong>{" "}
        <code className="font-mono">Combobox</code>,{" "}
        <code className="font-mono">InlineEntityCombobox</code>,{" "}
        <code className="font-mono">EntityCombobox</code> and{" "}
        <code className="font-mono">MultiEntityCombobox</code> drop their anchored panel and open a
        full-screen <code className="font-mono">PickerSheet</code> instead — the shape a native{" "}
        <code className="font-mono">&lt;select&gt;</code> already has on a phone. Only{" "}
        <code className="font-mono">MultiSelect</code> and{" "}
        <code className="font-mono">GroupedPicker</code> keep one presentation at every width. This
        window currently reports{" "}
        <strong>{isPhone ? "phone — sheets" : "pointer — anchored panels"}</strong>; drag the edge
        past 767px to watch them swap.
      </Note>

      <Example
        label="Combobox"
        hint="free text — the typed value is the value, whether or not it is in the pool"
      >
        <Stage>
          <Combobox
            label="Payee"
            value={payee}
            onChange={setPayee}
            options={PAYEES}
            placeholder="Who was paid?"
            // Capped below the pool of 8 on purpose, so the cap is visible rather
            // than merely documented. The default is 8 on a panel, 50 in a sheet.
            maxSuggestions={6}
            groupBy={(o) => PAYEE_GROUPS[o] ?? "Other"}
            optionAdornment={(o) =>
              RECURRING.has(o) ? (
                <span className="shrink-0 rounded border border-subtle px-1 text-micro uppercase tracking-wide text-muted">
                  monthly
                </span>
              ) : null
            }
            // Supplying `createLabel` is what turns free text into something you
            // CONFIRM. Without it the value is still committed — it is simply never
            // acknowledged, which reads as "my typing was thrown away".
            createLabel={(v) => `Add “${v}” as payee`}
            searchPlaceholder="Search payees"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={payee ? `"${payee}"` : "(empty)"} />
        <Note>
          Type a few letters, then clear them and click the field again: the list comes back WHOLE.
          The text filters only while it is being typed, so a field holding “Rewe” does not reopen
          as a one-row filter of its own answer.
        </Note>
      </Example>

      <Example
        label="Click-to-edit cells"
        hint="autoFocus lands the caret in the field that was clicked; onBlur and onSubmit close the editor"
      >
        <Stage>
          <div data-stage="wide" className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            {editing === "payee" ? (
              <Combobox
                aria-label="Payee"
                value={cellPayee}
                onChange={setCellPayee}
                options={PAYEES}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- mounted by the click that asked for it
                autoFocus
                // Focus genuinely left — a click on a row does NOT fire this, which is
                // what makes it usable as "close the editor".
                onBlur={() => {
                  setEditLog("onBlur → editor closed");
                  setEditing(null);
                }}
                // Enter with no row highlighted: "I mean what I typed".
                onSubmit={() => {
                  setEditLog("onSubmit → editor closed");
                  setEditing(null);
                }}
              />
            ) : (
              <Button variant="secondary" onClick={() => setEditing("payee")}>
                Payee: {cellPayee || "—"}
              </Button>
            )}
            {editing === "account" ? (
              <InlineEntityCombobox
                aria-label="Account"
                value={cellAccount}
                onChange={(v) => {
                  setCellAccount(v);
                  setEditLog(`onChange(${v === null ? "null" : `"${v}"`}) → editor closed`);
                  setEditing(null);
                }}
                options={ACCOUNTS}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- mounted by the click that asked for it
                autoFocus
              />
            ) : (
              <Button variant="secondary" onClick={() => setEditing("account")}>
                Account: {ACCOUNTS.find((a) => a.value === cellAccount)?.label ?? "—"}
              </Button>
            )}
          </div>
        </Stage>
        <Current label="last" value={editLog} />
        <Note>
          Click a cell: it becomes the field, focused, with its list open. In the payee cell, type
          and press Enter (<code className="font-mono">onSubmit</code>) or click elsewhere (
          <code className="font-mono">onBlur</code>); picking a row keeps the editor, because the
          rows never take focus from the input.
        </Note>
      </Example>
    </>
  );
}

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
 *  a write-locked result, which must be seen and must not be taken. */
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

function AutocompleteDemo() {
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
        hint="the text is the value; a suggestion completes it (an address field)"
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
        <Note>
          Type &quot;xyz&quot; for <code>emptyLabel</code>; tick the outage and type again for{" "}
          <code>loadErrorLabel</code>. The text you typed survives both.
        </Note>
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
        <Note>
          The town list is narrowed by the text (label or sublabel). The street list is fetched by
          the page itself — 500&nbsp;ms per keystroke — and shown exactly as the pretend server
          ranked it, so &quot;Rue&quot; still lists two Bahnhofstrasse rows the server thought
          close enough. While the page&apos;s fetch is out, <code>loading</code> puts a
          spinner in the field — and the loading line in the list while it has no rows yet.
        </Note>
      </Example>

      <Example
        label="Autocomplete — search, then act"
        hint={
          <>
            <code>fillOnSelect={"{false}"}</code>, <code>size=&quot;sm&quot;</code>,{" "}
            <code>disabled</code> rows and <code>open</code> held shut while a pick is confirmed
            (an address search)
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
              <div className="space-y-2 rounded-md border border-subtle p-2 text-xs">
                <p className="text-secondary">{confirming}</p>
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
        <Note>
          Seeded with a query: focusing the field looks it up (no request on mount, none below
          <code> minChars</code>, one per pause in typing), and the text is never reset. Rows in
          Bern are <code>disabled</code>: listed with their reason, skipped by ↑/↓, and a click
          takes nothing. Taking a row opens a confirm step, and <code>open={"{false}"}</code> keeps
          the list shut under it even while the field has focus.
        </Note>
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
        hint="free text over existing values, the datalist replacement (scope fields)"
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
        <p className="mt-2 text-xs text-secondary">
          The disabled Project field is dimmed as a whole, label and chevron included, the way a
          disabled <code className="font-mono">EntityCombobox</code> is, so it never reads like a
          filled-in one beside it. Its
          suggestion list, like every portalled combobox list, carries the field&apos;s{" "}
          <code className="font-mono">dir</code>.
        </p>
      </Example>
    </>
  );
}

/* ── since 0.12 ─────────────────────────────────────────────────────────── */

/** Proposals that follow the UI language, as a category field has them. */
const CATEGORIES = ["Groceries", "Rent", "Transport", "Leisure", "Utilities", "Insurance", "Gifts", "Coffee"];

const TRANSLATED = new Set(["Groceries", "Rent", "Transport", "Leisure", "Utilities", "Insurance"]);

function Badge({ option }: { option: string }) {
  const translated = TRANSLATED.has(option);
  return (
    <Tooltip
      label={
        translated
          ? "A built-in category: its name follows the interface language."
          : "Your own name: stored as typed, never translated."
      }
      side="start"
    >
      <span
        className={cn(
          "shrink-0 rounded border px-1 text-micro uppercase tracking-wide",
          translated
            ? "border-brand text-brand"
            : "border-subtle text-muted",
        )}
      >
        {translated ? "built-in" : "custom"}
      </span>
    </Tooltip>
  );
}

function ComboboxClipsDemo() {
  const [category, setCategory] = useState("");
  return (
    <Example
      label="Combobox — a Tooltip in optionAdornment (data-clips)"
      hint="hover a badge in the open list: the bubble is portalled out of the scrolling list"
    >
      <Stage>
        <Combobox
          label="Category"
          value={category}
          onChange={setCategory}
          options={CATEGORIES}
          maxSuggestions={8}
          optionAdornment={(o) => <Badge option={o} />}
          searchPlaceholder="Search categories"
          closeLabel="Close"
        />
      </Stage>
      <Current label="value" value={category ? `"${category}"` : "(empty)"} />
      <div className="mt-3">
        <Note>
          The list is a scroll container ({code("max-height")} + {code("overflow-y: auto")}), and a
          bubble drawn inside it is cut off at its edge. The listbox carries {code("data-clips")}
          (the kit's {code("CLIPS_ATTRIBUTE")}), which the Tooltip's auto-portal reads as well as the
          computed overflow — so the bubble goes to {code("document.body")}, above the panel. The marker
          matters most under jsdom, which computes no overflow: there a bubble left in the row became
          part of the option's accessible name (&ldquo;Rent A built-in category…&rdquo;). On a phone the
          same list is a {code("PickerSheet")}, whose scroller carries the marker too.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.22 ─────────────────────────────────────────────────────────── */

const HINT_ACCOUNTS = [
  { value: "chk", label: "Checking" },
  { value: "sav", label: "Savings" },
  { value: "cc", label: "Credit card" },
];

function PickerHints022Demo() {
  const [payee, setPayee] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [inline, setInline] = useState<string | null>("chk");
  const [address, setAddress] = useState("");
  const [filter, setFilter] = useState<(string | number)[]>([]);
  return (
    <Example label="hint on the combobox family" hint="the same anatomy as Input and Select">
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox
          label="Payee"
          value={payee}
          onChange={setPayee}
          options={["REWE", "Migros", "Coop"]}
          hint="As printed on the receipt"
        />
        <EntityCombobox<string>
          label="Account"
          value={account}
          onChange={setAccount}
          options={HINT_ACCOUNTS}
          hint={<FieldHint label="Closed accounts are hidden" />}
        />
        <InlineEntityCombobox<string>
          label="From account"
          value={inline}
          onChange={setInline}
          options={HINT_ACCOUNTS}
          hint="The money leaves from here"
        />
        <Autocomplete label="Address" value={address} onChange={setAddress} hint="Street and number" />
        <MultiSelect
          label="Accounts"
          value={filter}
          onChange={setFilter}
          options={HINT_ACCOUNTS}
          hint="Leave empty for all"
        />
        <MultiSelect
          aria-label="Accounts (no label)"
          value={filter}
          onChange={setFilter}
          options={HINT_ACCOUNTS}
          hint={<FieldHint label="Leave empty for all" />}
        />
      </div>
    </Example>
  );
}

/* ── since 0.23 ─────────────────────────────────────────────────────────── */

const ACCOUNTS_023: ComboOption<string>[] = [
  { value: "chk", label: "Example Ltd current account", group: "Bank" },
  { value: "sav", label: "Sample savings", group: "Bank" },
  { value: "cash", label: "Petty cash", group: "Cash" },
  { value: "till", label: "Shop till", group: "Cash" },
];

const PAYEES_023 = ["Example Ltd", "Sample Bakery", "Demo Utilities"];

const ADDRESSES_023: ComboOption<string>[] = [
  { value: "1", label: "Example Street 1, 0000 Sampletown" },
  { value: "2", label: "Example Street 12, 0000 Sampletown" },
  { value: "3", label: "Sample Road 3, 0000 Demoville" },
];

/** The five pickers as a read-only page renders them: everything shown, only the
 *  pickers that save on change (`commit`) locked. */
function ComboboxFamilyLock023Demo() {
  const [locked, setLocked] = useState(true);
  const [payee, setPayee] = useState("Example Ltd");
  const [account, setAccount] = useState<string | null>("chk");
  const [panelAccount, setPanelAccount] = useState<string | null>("sav");
  const [several, setSeveral] = useState<string[]>(["chk", "cash"]);
  const [address, setAddress] = useState("Example Street 1");
  return (
    <Example
      label="The write lock on the Combobox family"
      hint="`commit` under a locked WriteLockProvider, or a `disabledReason` of the control's own"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo (WriteLockProvider locked)" />
        <WriteLockProvider locked={locked} reason="Read-only demo — saving is disabled.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineEntityCombobox<string>
              commit
              label="Statement account"
              value={account}
              onChange={setAccount}
              options={ACCOUNTS_023}
              clearable
              hint="Picking re-checks the statement for duplicates"
            />
            <EntityCombobox<string>
              commit
              label="Default account"
              value={panelAccount}
              onChange={setPanelAccount}
              options={ACCOUNTS_023}
              clearable
            />
            <MultiEntityCombobox<string>
              commit
              label="Accounts in the report"
              value={several}
              onChange={setSeveral}
              options={ACCOUNTS_023}
              clearable
              hint={<FieldHint label="Only these accounts are summed" />}
            />
            <Combobox
              commit
              label="Default payee"
              value={payee}
              onChange={setPayee}
              options={PAYEES_023}
            />
            <Autocomplete<string>
              commit
              label="Delivery address"
              value={address}
              onChange={setAddress}
              options={ADDRESSES_023}
              className="sm:col-span-2"
            />
          </div>
        </WriteLockProvider>
        <Note>
          Locked, each picker is still a tab stop — {code("aria-disabled")}, never {code("disabled")} — with the
          lock&apos;s sentence in the kit Tooltip and on {code("aria-describedby")}; no list opens, the clear
          &quot;×&quot; is gone and nothing reaches {code("onChange")}. The three typed fields are{" "}
          {code("readOnly")} and swallow Enter. A picker inside a form with its own Save leaves {code("commit")}{" "}
          off and stays live: the Save is the commit. {code("MultiEntityCombobox")} also takes {code("hint")},
          like the rest of the family.
        </Note>
      </div>
    </Example>
  );
}

let nextId = 0;

/** "Create cash account" as the picker's last row, not a separate button. */
function InlineCreateRow023Demo() {
  const [options, setOptions] = useState<ComboOption<string>[]>(ACCOUNTS_023.filter((a) => a.group === "Cash"));
  const [value, setValue] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const create = (name: string) => {
    // Synthetic: an app would create the record on its server, then select its id.
    const id = `new-${++nextId}`;
    setOptions((o) => [...o, { value: id, label: name || `Cash account ${nextId}`, group: "Cash" }]);
    setValue(id);
  };
  return (
    <Example
      label="A create row on InlineEntityCombobox"
      hint="`onCreate`, `createEmptyLabel`, `createCommit` — also on EntityCombobox and MultiEntityCombobox"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo (WriteLockProvider locked)" />
        <WriteLockProvider locked={locked} reason="Read-only demo — creating is disabled.">
          <InlineEntityCombobox<string>
            label="Cash account"
            placeholder="Choose a cash account"
            value={value}
            onChange={setValue}
            options={options}
            onCreate={create}
            createEmptyLabel="Create cash account"
            createCommit
            className="max-w-sm"
          />
        </WriteLockProvider>
        <Note>
          Type a name that is not in the list and the last row reads {code("Create “…”")}; with nothing typed it
          reads the {code("createEmptyLabel")} and {code("onCreate")} gets {code('""')} — the app supplies the
          default name. The arrows reach the row like an option; Enter or a click creates and closes. With{" "}
          {code("createCommit")} a lock disables only the row (with its reason under it): picking is draft state
          and stays live, minting a record is the write.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.24 ─────────────────────────────────────────────────────────── */

/**
 * 0.24 for the Combobox family. Two demos, two pages:
 *
 *  - {@link RhfInlineEntity024Demo} (Forms): a budget line item — an inline
 *    account picker bound in one line, and a failed Save lands focus in it;
 *  - {@link AutocompleteHint024Demo} (Comboboxes): an unlabelled Autocomplete whose "?"
 *    comes and goes while you type, and the field keeps the caret.
 *
 * Synthetic data throughout.
 */

const CHART: ComboOption<number>[] = [
  { value: 1000, label: "1000 Example cash", group: "Assets" },
  { value: 1020, label: "1020 Sample bank", group: "Assets" },
  { value: 2000, label: "2000 Sample payables", group: "Liabilities" },
  { value: 4000, label: "4000 Example materials", group: "Expenses" },
  { value: 6000, label: "6000 Sample rent", group: "Expenses" },
];

type LineItem = {
  account: number | null;
  /** Optional, and `""` when cleared — as a `z.string()` schema spells "none". */
  costCentre: number | "";
  amount: number | null;
};

/** Forms page (slug `forms`). */
export function RhfInlineEntity024Demo() {
  const form = useForm<LineItem>({ defaultValues: { account: null, costCentre: "", amount: null } });
  const [chart, setChart] = useState(CHART);
  const [submitted, setSubmitted] = useState("—");
  return (
    <Example
      label="RhfInlineEntityCombobox"
      hint="save empty: focus lands in the account field — the inline picker's <input>"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => setSubmitted(JSON.stringify(v)))}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfInlineEntityCombobox<LineItem, "account", number>
            name="account"
            label="Account"
            hint="Type the number or the name"
            required
            options={chart}
            placeholder="1000 …"
            rules={{ required: "Choose an account" }}
            // The create row: the caller makes the record and stores its id.
            onCreate={(name) => {
              const next = Math.max(...chart.map((o) => o.value)) + 10;
              setChart((c) => [...c, { value: next, label: `${next} ${name}`, group: "New" }]);
              form.setValue("account", next, { shouldValidate: true });
            }}
          />
          <RhfInlineEntityCombobox<LineItem, "costCentre", number>
            name="costCentre"
            label="Cost centre"
            hint="Optional — the × clears it"
            options={chart.filter((o) => o.group === "Expenses")}
            clearable
            clearValue=""
          />
          <RhfMoneyField<LineItem>
            name="amount"
            label="Amount"
            currency="CHF"
            required
            rules={{ required: "Enter an amount" }}
          />
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <p className={READOUT_PRE}>submitted: {submitted}</p>
      <Note>
        Bound the way {code("RhfCountrySelect")} is: {code("field.ref")} reaches the picker&apos;s {code("<input>")}{" "}
        through its new {code("ref")}, so a failed submit focuses it; the form&apos;s error paints the input and is
        the message under it; the hint is the form&apos;s description, so the picker&apos;s box never changes. The
        form&apos;s label names the input and titles the phone sheet. {code("commit")}, {code("disabledReason")} and
        the create row ({code("onCreate")}, {code("createEmptyLabel")}, {code("createCommit")}) pass through — type
        a name nothing matches to see it. Every Combobox-family member takes a {code("ref")} to its focusable control.
      </Note>
    </Example>
  );
}

const STREETS: ComboOption<string>[] = [
  { value: "1", label: "Example Street 1, 0000 Sampletown" },
  { value: "2", label: "Example Street 12, 0000 Sampletown" },
  { value: "3", label: "Sample Road 3, 0000 Demoville" },
];

/** Comboboxes page (slug `comboboxes`). */
function AutocompleteHint024Demo() {
  const [text, setText] = useState("");
  // The "?" only says something once there is a search to explain.
  const hint = text.trim() ? <FieldHint label="Only addresses in the sample region are offered" /> : undefined;
  return (
    <Example
      label="Autocomplete — a hint that comes and goes"
      hint="type: the '?' appears beside the field, and the caret stays where it was"
    >
      <div className="max-w-md">
        <Autocomplete
          aria-label="Search an address"
          placeholder="Search an address"
          value={text}
          onChange={setText}
          options={STREETS}
          // Passed even while it is `undefined`: that is what keeps the field's row.
          hint={hint}
        />
      </div>
      <Note>
        The family&apos;s rule, Autocomplete included: a field that is passed {code("hint")} at all — even{" "}
        {code("undefined")} — keeps one box, so on an unlabelled field the end-edge row the &quot;?&quot; sits in is
        there whether or not the &quot;?&quot; is. The {code("<input>")} is never re-parented, and the first letter
        typed keeps focus.
      </Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** The Comboboxes page */
export function ComboboxDemo() {
  return (
    <>
      <Comboboxes />
      <AutocompleteDemo />
      <ComboboxClipsDemo />
      <PickerHints022Demo />
      <AutocompleteHint024Demo />
    </>
  );
}

/** Entity pickers */
export function EntityComboboxLockDemo() {
  return (
    <>
      <ComboboxFamilyLock023Demo />
      <InlineCreateRow023Demo />
    </>
  );
}
