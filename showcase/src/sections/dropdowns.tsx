import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Banknote, Home, PiggyBank, ShoppingCart, Train, Zap } from "lucide-react";
import {
  Button,
  Checkbox,
  Combobox,
  DropdownPanel,
  DropdownSearchHeader,
  EntityCombobox,
  FieldChevron,
  FieldLabel,
  FIELD_FLOATING_PAD,
  FIELD_TRIGGER,
  GroupedPicker,
  InlineEntityCombobox,
  MultiEntityCombobox,
  MultiSelect,
  PHONE_QUERY,
  PickerSheet,
  SHEET_ROW_CLASS,
  cn,
  useDropdown,
  useDropdownSearch,
  useMediaQuery,
} from "@eifi1/ui-kit";
import type { ComboOption, MultiSelectOption, PickerGroup } from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Stage } from "../lib/section";

/* ── fixtures ────────────────────────────────────────────────────────────────
 * Small and domestic on purpose: every list here is short enough to read in one
 * glance, so what a specimen DOES is never hidden behind scrolling.
 */

/** Free-text pool for {@link Combobox}, with the group each name belongs under.
 *  A plain array would exercise the flat list; the map is what `groupBy` reads. */
const PAYEE_GROUPS: Record<string, string> = {
  Rewe: "Groceries",
  Edeka: "Groceries",
  "Aldi Süd": "Groceries",
  "Deutsche Bahn": "Travel",
  "MVG München": "Travel",
  "Stadtwerke München": "Utilities",
  Spotify: "Subscriptions",
  Netflix: "Subscriptions",
};
const PAYEES = Object.keys(PAYEE_GROUPS);
/** The ones that bill every month — shown as a badge through `optionAdornment`,
 *  which exists for exactly this: a fact about the option that decides what
 *  picking it means and is invisible in its label. */
const RECURRING = new Set(["Spotify", "Netflix", "Stadtwerke München", "MVG München"]);

/** Id-keyed options for {@link InlineEntityCombobox}. Two groups, because one
 *  group renders identically to no group at all — the heading-plus-indent
 *  treatment only becomes visible at the second boundary. */
const ACCOUNTS: ComboOption<string>[] = [
  { value: "chk", label: "Checking", sublabel: "DE89 ··· 3000", group: "Everyday" },
  { value: "cash", label: "Cash", sublabel: "wallet", group: "Everyday" },
  { value: "sav", label: "Savings", sublabel: "1.8% p.a.", group: "Reserves" },
  { value: "buf", label: "Buffer", sublabel: "for the annual bills", group: "Reserves" },
];

/** The InlineEntityCombobox specimen's list: {@link ACCOUNTS} plus a CLOSED account,
 *  `disabled` — listed so the user sees it exists, dimmed, passed over by the arrows,
 *  and never taken (not even by typing its name in full). The reason rides in
 *  `sublabel`, the one place a phone can show it. */
const INLINE_ACCOUNTS: ComboOption<string>[] = [
  ...ACCOUNTS,
  {
    value: "old",
    label: "Old savings",
    sublabel: "closed — read-only",
    group: "Reserves",
    disabled: true,
  },
];

/** Options for the panel pickers ({@link EntityCombobox} and friends), which are
 *  the only ones that draw `ComboOption.icon` — see the note on that specimen. */
const CATEGORIES: ComboOption<string>[] = [
  { value: "rent", label: "Rent", sublabel: "fixed", icon: <Home className="size-4" /> },
  {
    value: "groceries",
    label: "Groceries",
    sublabel: "weekly",
    icon: <ShoppingCart className="size-4" />,
  },
  { value: "power", label: "Electricity", sublabel: "quarterly", icon: <Zap className="size-4" /> },
  { value: "transit", label: "Public transport", icon: <Train className="size-4" /> },
  { value: "savings", label: "Savings transfer", icon: <PiggyBank className="size-4" /> },
  { value: "cashout", label: "Cash withdrawal", icon: <Banknote className="size-4" /> },
  // `disabled`: shown, announced (`aria-disabled`), skipped by ↑/↓/Home/End, and a
  // press on it chooses nothing.
  {
    value: "fees",
    label: "Bank fees",
    sublabel: "managed by the bank — not selectable",
    icon: <Banknote className="size-4" />,
    disabled: true,
  },
];

const CUSTOMERS: ComboOption<string>[] = [
  { value: "u-1", label: "Amelie Brandt", sublabel: "amelie@example.org" },
  { value: "u-2", label: "Bruno Kessler", sublabel: "bruno@example.org" },
  { value: "u-3", label: "Clara Sandoval", sublabel: "clara@example.org" },
  { value: "u-4", label: "Dimitri Vogel", sublabel: "dimitri@example.org" },
];

/**
 * Stand-in for the request a real caller makes. Filtered HERE rather than by the
 * component: once `loadOptions` is set, `options` no longer feeds the result list,
 * so whatever this does not return is not on offer. The 250ms is deliberate — it is
 * long enough to see the panel's busy row, and long enough for the core's 150ms
 * debounce and its stale-response guard to be doing something worth having.
 */
function loadCustomers(query: string): Promise<ComboOption<string>[]> {
  const q = query.trim().toLowerCase();
  const hits = CUSTOMERS.filter(
    (c) => !q || c.label.toLowerCase().includes(q) || (c.sublabel ?? "").toLowerCase().includes(q),
  );
  return new Promise((resolve) => {
    setTimeout(() => resolve(hits), 250);
  });
}

/** The same customer search, down whenever `outage` is set — the rejection is what
 *  `loadErrorLabel` is for. Slower than {@link loadCustomers} so the busy row stays up
 *  long enough to read. */
function searchCustomers(query: string, outage: boolean): Promise<ComboOption<string>[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outage) reject(new Error("503"));
      else void loadCustomers(query).then(resolve);
    }, 350);
  });
}

/** A list a server has already searched and ranked: "best match first", and rows
 *  whose label does not contain the query at all. `filter={false}` shows it as given. */
const RANKED: ComboOption<string>[] = [
  { value: "r-1", label: "Bahnhofstrasse 1, Zürich", sublabel: "exact match" },
  { value: "r-2", label: "Bahnhofplatz, Bern", sublabel: "similar street" },
  { value: "r-3", label: "Hauptbahnhof, Basel", sublabel: "same landmark" },
];

const TAGS: ComboOption<string>[] = [
  { value: "t-business", label: "Business" },
  { value: "t-reimburse", label: "Reimbursable" },
  { value: "t-holiday", label: "Holiday" },
  { value: "t-gift", label: "Gift" },
];

const MARKETS: MultiSelectOption[] = [
  { value: "muc-mitte", label: "München Mitte", hint: "80331 · 2.1 km" },
  { value: "muc-sued", label: "München Süd", hint: "81541 · 4.8 km" },
  { value: "muc-nord", label: "München Nord", hint: "80637 · 6.0 km" },
  { value: "dachau", label: "Dachau", hint: "85221 · 17 km" },
];

const CATEGORY_GROUPS: PickerGroup[] = [
  {
    key: "home",
    label: "Home",
    items: [
      { key: "rent", label: "Rent", icon: <Home className="size-3.5" /> },
      { key: "power", label: "Electricity", icon: <Zap className="size-3.5" /> },
      { key: "internet", label: "Internet" },
      { key: "repairs", label: "Repairs" },
    ],
  },
  {
    key: "food",
    label: "Food",
    items: [
      { key: "groceries", label: "Groceries", icon: <ShoppingCart className="size-3.5" /> },
      { key: "eating-out", label: "Eating out" },
      { key: "coffee", label: "Coffee" },
    ],
  },
  {
    key: "transport",
    label: "Transport",
    items: [
      { key: "transit", label: "Public transport", icon: <Train className="size-3.5" /> },
      { key: "fuel", label: "Fuel" },
      { key: "bike", label: "Bike" },
    ],
  },
  {
    key: "reserves",
    label: "Reserves",
    items: [
      { key: "emergency", label: "Emergency fund", icon: <PiggyBank className="size-3.5" /> },
      { key: "pension", label: "Pension" },
    ],
  },
];

/** Rows for the hand-built menu at the bottom — the case a consumer reaches for
 *  {@link useDropdown} for: a short, fixed list that is not an entity picker. */
const SORTS = [
  { key: "date", label: "Newest first" },
  { key: "amount", label: "Largest amount" },
  { key: "payee", label: "Payee A–Z" },
];

const STORES = [
  { key: "rewe-mitte", label: "Rewe Mitte", hint: "80331 München" },
  { key: "edeka-sued", label: "Edeka Süd", hint: "81541 München" },
  { key: "aldi-nord", label: "Aldi Nord", hint: "80637 München" },
  { key: "biomarkt", label: "Biomarkt Glockenbach", hint: "80469 München" },
];

/** What a controlled picker currently holds. Printed under every specimen because
 *  a picker that dropped its value on the floor looks exactly like one that kept
 *  it — the trigger shows a label either way, and only the state says which. */
function Current({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="mt-3 text-xs text-[var(--text-muted)]">
      {label}: <span className="font-mono text-[var(--text-secondary)]">{value}</span>
    </p>
  );
}

export function Dropdowns() {
  // The same query the components ask themselves. Rendering the answer turns "the
  // panel looks different on my phone" from a claim into something the reader can
  // check by dragging the window edge.
  const isPhone = useMediaQuery(PHONE_QUERY, false);

  const [payee, setPayee] = useState("");
  const [account, setAccount] = useState<string | null>("chk");
  const [category, setCategory] = useState<string | null>(null);
  // `onCreate` only tells the caller what was typed; adding the row is the caller's
  // job, so the option list has to be state rather than the module-scope fixture.
  const [categoryOptions, setCategoryOptions] = useState(CATEGORIES);
  const [customer, setCustomer] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(["t-business"]);
  const [markets, setMarkets] = useState<(string | number)[]>([]);
  const [picked, setPicked] = useState<{ group: string; item: string } | null>(null);

  // Click-to-edit cells: which cell is an editor right now, and what it last said.
  const [editing, setEditing] = useState<"payee" | "account" | null>(null);
  const [cellPayee, setCellPayee] = useState("Rewe");
  const [cellAccount, setCellAccount] = useState<string | null>("chk");
  const [editLog, setEditLog] = useState("—");

  // Field states.
  const [stateAccount, setStateAccount] = useState<string | null>(null);
  const [stateCategory, setStateCategory] = useState<string | null>(null);
  const [stateTags, setStateTags] = useState<string[]>([]);
  const [stateMarkets, setStateMarkets] = useState<(string | number)[]>([]);

  // Async knobs.
  const [outage, setOutage] = useState(false);
  const [slowCustomer, setSlowCustomer] = useState<string | null>(null);
  const [rankedPick, setRankedPick] = useState<string | null>(null);
  const [callerLoading, setCallerLoading] = useState(false);
  const [rankedRows, setRankedRows] = useState(RANKED);
  const [people, setPeople] = useState<string[]>([]);
  const [newPeople, setNewPeople] = useState<ComboOption<string>[]>([]);
  const [plainMarkets, setPlainMarkets] = useState<(string | number)[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetQuery, setSheetQuery] = useState("");
  const [sheetAccount, setSheetAccount] = useState<string | null>(null);
  const sheetHits = useMemo(() => {
    const q = sheetQuery.trim().toLowerCase();
    if (!q) return ACCOUNTS;
    return ACCOUNTS.filter(
      (a) => a.label.toLowerCase().includes(q) || (a.sublabel ?? "").toLowerCase().includes(q),
    );
  }, [sheetQuery]);

  // Hand-built menu #1: open state + outside-click only.
  const [sortKey, setSortKey] = useState("date");
  const sort = useDropdown();

  // Hand-built menu #2: the same, plus a query that resets and refocuses on open.
  const [storeKey, setStoreKey] = useState<string | null>(null);
  const store = useDropdownSearch();
  // The panel anchors to the TRIGGER, not to the wrapper: the wrapper can be taller
  // than the button (a grid item stretches), and the panel would then open a row
  // below where it looks like it should.
  const storeTrigger = useRef<HTMLButtonElement>(null);
  const storeHits = useMemo(() => {
    const q = store.query.trim().toLowerCase();
    if (!q) return STORES;
    return STORES.filter(
      (s) => s.label.toLowerCase().includes(q) || s.hint.toLowerCase().includes(q),
    );
  }, [store.query]);

  const pickedLabel = (() => {
    if (!picked) return "Choose a category";
    const group = CATEGORY_GROUPS.find((g) => g.key === picked.group);
    const item = group?.items.find((i) => i.key === picked.item);
    return item ? `${group!.label} · ${item.label}` : "Choose a category";
  })();

  return (
    <>
      <Note>
        <strong>Every picker on this page changes shape below {PHONE_QUERY}.</strong>{" "}
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
                <span className="shrink-0 rounded border border-[var(--border)] px-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
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
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Type a few letters, then clear them and click the field again: the list comes back WHOLE.
          The text filters only while it is being typed, so a field holding “Rewe” does not reopen
          as a one-row filter of its own answer.
        </p>
      </Example>

      <Example
        label="InlineEntityCombobox"
        hint="id-keyed, but shaped like a text input so it can sit beside one"
      >
        <Stage>
          <InlineEntityCombobox
            label="Account"
            value={account}
            onChange={setAccount}
            options={INLINE_ACCOUNTS}
            placeholder="Pick an account"
            // The "×" is not a convenience. Emptying the text clears the field on a
            // desktop; on a phone the sheet covers the very input you would have
            // emptied, so without this an answered field could not be unanswered.
            clearable
            clearLabel="Clear account"
            searchPlaceholder="Search accounts"
            emptyLabel="No account matches"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={account === null ? "null" : `"${account}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The text is transient: picking a row commits it, typing an exact label that names exactly
          one account commits it, emptying the field commits <code className="font-mono">null</code>
          , and anything else reverts to the selected label on blur or Escape. “Old savings” is a{" "}
          <code className="font-mono">disabled</code> option: listed and dimmed, skipped by the
          arrows, and typing its name in full reverts rather than commits.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The floating label — here and on <code className="font-mono">Combobox</code> above — is a
          real <code className="font-mono">{"<label for>"}</code>, so{" "}
          <code className="font-mono">getByLabelText(&quot;Account&quot;)</code> finds the input.
        </p>
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
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Click a cell: it becomes the field, focused, with its list open. In the payee cell, type
          and press Enter (<code className="font-mono">onSubmit</code>) or click elsewhere (
          <code className="font-mono">onBlur</code>); picking a row keeps the editor, because the
          rows never take focus from the input.
        </p>
      </Example>

      <Example
        label="EntityCombobox — static options"
        hint="a trigger button, not an input; filtered in the browser"
      >
        <Stage>
          <EntityCombobox
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="Pick a category"
            clearable
            clearLabel="Clear category"
            searchPlaceholder="Search categories"
            emptyLabel="No category matches"
            closeLabel="Close"
            createLabel={(q) => `Create category “${q}”`}
            // `onCreate` hands over the query and nothing else — the component does
            // not invent an id, so the caller adds the row AND selects it. A caller
            // that only appends would leave the user staring at the placeholder.
            onCreate={(q) => {
              const value = `custom-${q.toLowerCase().replace(/\s+/g, "-")}`;
              setCategoryOptions((prev) =>
                prev.some((o) => o.value === value) ? prev : [...prev, { value, label: q }],
              );
              setCategory(value);
            }}
          />
        </Stage>
        <Current label="value" value={category === null ? "null" : `"${category}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          This is the one family that draws <code className="font-mono">ComboOption.icon</code> —{" "}
          <code className="font-mono">InlineEntityCombobox</code> above carries the same option type
          but renders label and sublabel only. “Bank fees” is{" "}
          <code className="font-mono">disabled</code>: listed, never chosen, and Home/End and the
          arrows pass it over.
        </p>
      </Example>

      <Example
        label="EntityCombobox — async loadOptions"
        hint="debounced 150ms and race-safe; this stand-in resolves after 250ms"
      >
        <Stage>
          <EntityCombobox
            label="Customer"
            value={customer}
            onChange={setCustomer}
            // No `options` at all: once a value has been picked, its label survives
            // because the core caches every option it has seen. A list that has
            // moved on to other query results cannot resolve the selection itself.
            loadOptions={loadCustomers}
            placeholder="Search customers"
            clearable
            clearLabel="Clear customer"
            searchPlaceholder="Type a name or e-mail"
            emptyLabel="Nobody matches"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={customer === null ? "null" : `"${customer}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open it and type quickly: only the last query's answer lands. Clear the query and the list
          is re-fetched immediately (the debounce is skipped for an empty query, because an empty
          query is the open itself, not typing).
        </p>
      </Example>

      <Example
        label="EntityCombobox — minChars, debounceMs, a failed lookup"
        hint="nothing is asked below 2 characters; 600ms of quiet before each request"
      >
        <Stage>
          <EntityCombobox
            label="Customer (slow service)"
            value={slowCustomer}
            onChange={setSlowCustomer}
            loadOptions={(q) => searchCustomers(q, outage)}
            minChars={2}
            debounceMs={600}
            placeholder="Search customers"
            searchPlaceholder="At least 2 letters"
            loadErrorLabel="The customer service is not answering — try again later"
            emptyLabel="Nobody matches"
          />
        </Stage>
        <Checkbox
          label="Simulate an outage (loadOptions rejects)"
          checked={outage}
          onChange={(e) => setOutage(e.target.checked)}
        />
        <Current label="value" value={slowCustomer === null ? "null" : `"${slowCustomer}"`} />
      </Example>

      <Example
        label="EntityCombobox — filter={false} and an external loading flag"
        hint="a list the caller already searched and ranked, and a caller-side fetch in flight"
      >
        <Stage>
          <EntityCombobox
            label="Address"
            value={rankedPick}
            onChange={setRankedPick}
            options={rankedRows}
            // Shown exactly as given: typing "bahnhof" keeps "Hauptbahnhof, Basel" and
            // typing "zurich" keeps all three — the ranking is the server's.
            filter={false}
            loading={callerLoading}
            placeholder="Pick a match"
          />
        </Stage>
        <Button
          variant="secondary"
          disabled={callerLoading}
          onClick={() => {
            // The caller's own fetch: rows gone, `loading` up, for two seconds.
            setRankedRows([]);
            setCallerLoading(true);
            window.setTimeout(() => {
              setRankedRows(RANKED);
              setCallerLoading(false);
            }, 2000);
          }}
        >
          {callerLoading ? "Fetching…" : "Refetch the list (2 s)"}
        </Button>
        <Current label="value" value={rankedPick === null ? "null" : `"${rankedPick}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open it and type anything: with <code className="font-mono">filter={"{false}"}</code> the
          three rows stay, in their order. Press Refetch and open it: while the caller&apos;s{" "}
          <code className="font-mono">loading</code> is up and there are no rows, the panel says it
          is loading instead of &quot;no results&quot; — the flag is OR-ed with the component&apos;s
          own async state.
        </p>
      </Example>

      <Example
        label="Field states — invalid, error, disabled"
        hint="the same contract on every picker: invalid paints, error also explains, disabled settles"
      >
        <Stage>
          <InlineEntityCombobox
            label="Account"
            value={stateAccount}
            onChange={setStateAccount}
            options={ACCOUNTS}
            placeholder="Required"
            error={stateAccount === null ? "Choose the account to book from" : undefined}
          />
          <EntityCombobox
            label="Category"
            value={stateCategory}
            onChange={setStateCategory}
            options={CATEGORIES}
            placeholder="Required"
            // `invalid` alone: the ring and aria-invalid, no message.
            invalid={stateCategory === null}
          />
          <MultiEntityCombobox
            label="Tags"
            value={stateTags}
            onChange={setStateTags}
            options={TAGS}
            placeholder="At least one"
            error={stateTags.length === 0 ? "Tag it at least once" : undefined}
          />
          <MultiSelect
            label="Markets"
            options={MARKETS}
            values={stateMarkets}
            onChange={setStateMarkets}
            placeholder="None chosen"
            invalid={stateMarkets.length === 0}
          />
          <InlineEntityCombobox
            label="Account (disabled)"
            value="sav"
            onChange={() => {}}
            options={ACCOUNTS}
            disabled
          />
          <EntityCombobox
            label="Category (disabled)"
            value="rent"
            onChange={() => {}}
            options={CATEGORIES}
            clearable
            disabled
          />
          <MultiEntityCombobox
            label="Tags (disabled)"
            value={["t-business", "t-gift"]}
            onChange={() => {}}
            options={TAGS}
            clearable
            disabled
          />
        </Stage>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Answer each field and its mark goes away. <code className="font-mono">error</code> is
          rendered under the field and tied to it with{" "}
          <code className="font-mono">aria-describedby</code>;{" "}
          <code className="font-mono">invalid</code> carries no text. A disabled picker drops its
          clear button — a settled field offers no action. <code className="font-mono">MultiSelect</code>{" "}
          has <code className="font-mono">invalid</code> but no <code className="font-mono">error</code>{" "}
          or <code className="font-mono">disabled</code> of its own.
        </p>
      </Example>

      <Example
        label="MultiEntityCombobox"
        hint="rows toggle and the panel stays open — picking several is the point"
      >
        <Stage>
          <MultiEntityCombobox
            label="Tags"
            value={tags}
            onChange={setTags}
            options={TAGS}
            placeholder="No tags"
            // Without `itemLabel` the trigger joins every resolved label with ", ",
            // and falls back to "N selected" as soon as one label cannot be resolved.
            itemLabel={(n) => `${n} tag${n === 1 ? "" : "s"}`}
            clearable
            clearLabel="Clear tags"
            searchPlaceholder="Search tags"
            emptyLabel="No tag matches"
            closeLabel="Close"
          />
          <MultiEntityCombobox
            label="Recipients"
            value={people}
            onChange={setPeople}
            // Created rows live in the caller's state; passing them as `options` is
            // what lets the trigger name them once the search has moved on.
            options={newPeople}
            loadOptions={(q) =>
              loadCustomers(q).then((hits) => [
                ...hits,
                ...newPeople.filter((p) => p.label.toLowerCase().includes(q.trim().toLowerCase())),
              ])
            }
            placeholder="Nobody yet"
            createLabel={(q) => `Invite “${q}”`}
            onCreate={(q) => {
              const value = `new-${q.toLowerCase().replace(/\s+/g, "-")}`;
              setNewPeople((prev) =>
                prev.some((p) => p.value === value)
                  ? prev
                  : [...prev, { value, label: q, sublabel: "invited" }],
              );
              setPeople((prev) => (prev.includes(value) ? prev : [...prev, value]));
            }}
          />
        </Stage>
        <Current label="tags" value={tags.length ? JSON.stringify(tags) : "[]"} />
        <Current label="recipients" value={people.length ? JSON.stringify(people) : "[]"} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The second field has no <code className="font-mono">itemLabel</code>, so its trigger
          lists the picked names, joined the locale&apos;s way (<code className="font-mono">
            Intl.ListFormat
          </code>
          ). Its rows come from <code className="font-mono">loadOptions</code>; type a name that is
          not there and <code className="font-mono">onCreate</code> adds it — the panel stays open,
          and selecting the new row is the caller&apos;s job, done here in the same handler.
        </p>
      </Example>

      <Example label="MultiSelect" hint="value-less means ALL — every visible string is a prop">
        <Stage>
          <div className="w-64">
            <MultiSelect
              label="Markets"
              options={MARKETS}
              values={markets}
              onChange={setMarkets}
              // Nothing selected is not "nothing": a filter with no markets ticked
              // matches every market, so the closed trigger has to say "All" rather
              // than sit empty. Defaults to the literal "All" — pass a translation.
              allLabel="All markets"
              itemLabel={(n) => `${n} of ${MARKETS.length}`}
              searchLabel="Search markets"
              selectAllLabel="Select all"
              clearLabel="Clear"
              // The rows here carry a postcode and a distance beside the label;
              // `panelClassName` is the supported way to widen past the 16rem default
              // rather than reaching into the panel with a descendant selector.
              panelClassName="w-72"
            />
          </div>
          <div className="w-64">
            {/* Only `placeholder`: it stands in for `allLabel`, and every other string
                (search, select all, clear, the count) comes from the provider. */}
            <MultiSelect
              aria-label="Markets"
              options={MARKETS}
              values={plainMarkets}
              onChange={setPlainMarkets}
              placeholder="Any market"
            />
          </div>
        </Stage>
        <Current label="values" value={markets.length ? JSON.stringify(markets) : "[] (= all)"} />
        <Current
          label="second"
          value={plainMarkets.length ? JSON.stringify(plainMarkets) : "[] (= all)"}
        />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The second one passes no strings but <code className="font-mono">placeholder</code>: its
          search box, its two actions and its count come from{" "}
          <code className="font-mono">multiSelect.*</code> in the provider — switch the showcase
          language to see them follow. Ticking every market reads as &quot;all&quot; again.
        </p>
      </Example>

      <Example label="GroupedPicker" hint="one panel of columns instead of one long scroll">
        <Stage>
          <GroupedPicker
            groups={CATEGORY_GROUPS}
            buttonLabel={pickedLabel}
            selected={picked}
            onSelect={(group, item) => setPicked({ group, item })}
            // `aria-label`, the DOM spelling; the older `ariaLabel` prop is deprecated.
            aria-label="Category"
            filterPlaceholder="Filter categories"
          />
        </Stage>
        <Current
          label="selected"
          value={picked ? `{ group: "${picked.group}", item: "${picked.item}" }` : "null"}
        />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The filter treats a group name as a whole-group match: typing{" "}
          <code className="font-mono">food</code> keeps every row under Food, while{" "}
          <code className="font-mono">bike</code> reduces Transport to its one matching row and
          drops the other groups entirely.
        </p>
      </Example>

      <Example
        label="PickerSheet + SHEET_ROW_CLASS"
        hint="opens full-screen over this page at any width — the phone shape, built by hand"
      >
        <Stage>
          <Row>
            <Button
              variant="secondary"
              onClick={() => {
                setSheetQuery("");
                setSheetOpen(true);
              }}
            >
              Open the account sheet
            </Button>
          </Row>
        </Stage>
        <PickerSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Account"
          query={sheetQuery}
          onQueryChange={setSheetQuery}
          searchPlaceholder="Search accounts"
          closeLabel="Close"
        >
          <ul role="listbox">
            {sheetHits.map((a) => (
              <li key={a.value} role="option" aria-selected={a.value === sheetAccount}>
                <button
                  type="button"
                  onClick={() => {
                    setSheetAccount(a.value);
                    setSheetOpen(false);
                  }}
                  className={cn(SHEET_ROW_CLASS, a.value === sheetAccount && "font-medium")}
                >
                  <span className="min-w-0 flex-1 truncate">{a.label}</span>
                  {a.sublabel && (
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">{a.sublabel}</span>
                  )}
                </button>
              </li>
            ))}
            {sheetHits.length === 0 && (
              <li className="px-4 py-3 text-sm text-[var(--text-muted)]">No account matches.</li>
            )}
          </ul>
        </PickerSheet>
        <Current label="value" value={sheetAccount === null ? "null" : `"${sheetAccount}"`} />
        <Note>
          The sheet focuses its own search box on open, pins itself to the VISUAL viewport (so the
          on-screen keyboard cannot hide the last rows) and registers a history entry — Back, or the
          browser's back gesture, closes the sheet and not the dialog that opened it.
        </Note>
        <div className="mt-3">
          <ConstList items={[["SHEET_ROW_CLASS", SHEET_ROW_CLASS]]} />
        </div>
      </Example>

      <Example
        label="useDropdown + DropdownPanel"
        hint="the primitive layer: open state, outside-click, and a surface to put rows on"
      >
        <Stage>
          <Row>
            <div ref={sort.wrapperRef} className="relative w-56">
              <button
                // `triggerRef` is what Escape hands focus back to. Leave it off and
                // Escape still closes the list, but the caret drops to <body>.
                ref={sort.triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={sort.open}
                onClick={() => sort.setOpen((o) => !o)}
                className={cn(FIELD_TRIGGER, "pr-9")}
              >
                <span className="truncate">{SORTS.find((s) => s.key === sortKey)?.label}</span>
                <FieldChevron />
              </button>
              {sort.open && (
                // No `anchorRef`, so the panel stays an ordinary absolutely-positioned
                // child of the wrapper and the caller sizes it. Cheapest form, and the
                // one an ancestor with `overflow` will CLIP — which is why every picker
                // above passes an anchor instead.
                <DropdownPanel
                  className="w-56"
                  empty={false}
                  // Attributes for the panel's own <ul>, merged with its classes.
                  listProps={{ "aria-label": "Sort order" }}
                >
                  {SORTS.map((s) => (
                    // The panel renders its children inside its own <ul>, so a child
                    // that is not an <li> is invalid markup, not a styling choice.
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortKey(s.key);
                          sort.setOpen(false);
                        }}
                        className={cn(
                          "block w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
                          s.key === sortKey && "font-medium",
                        )}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </DropdownPanel>
              )}
            </div>
          </Row>
        </Stage>
        <Current label="sort" value={`"${sortKey}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open it and press Escape: the list closes and focus is back on the button, because the
          button carries <code className="font-mono">triggerRef</code>. Browser Back closes the
          list too, without leaving the page (<code className="font-mono">backCloses</code>,
          default on).
        </p>
      </Example>

      <Example
        label="useDropdownSearch + DropdownSearchHeader + anchored DropdownPanel"
        hint="the same, plus a query that empties and refocuses on every open"
      >
        <Stage>
          <Row>
            <div ref={store.wrapperRef} className="relative w-64">
              <FieldLabel>Store</FieldLabel>
              <button
                ref={storeTrigger}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={store.open}
                aria-label={`Store: ${STORES.find((s) => s.key === storeKey)?.label ?? "none"}`}
                onClick={() => store.setOpen((o) => !o)}
                className={cn(FIELD_TRIGGER, FIELD_FLOATING_PAD, "pr-9")}
              >
                <span className={cn("truncate", !storeKey && "text-[var(--text-muted)]")}>
                  {STORES.find((s) => s.key === storeKey)?.label ?? "Pick a store"}
                </span>
                <FieldChevron />
              </button>
              {store.open && (
                <DropdownPanel
                  anchorRef={storeTrigger}
                  // Not optional plumbing: anchored, the panel is portalled to <body>
                  // and is no longer inside `wrapperRef`, so without this the
                  // outside-click handler answers "outside" for a click on the list
                  // itself and the first row a user pressed would pick nothing.
                  panelRef={store.panelRef}
                  // px, not a `w-*` class: the anchored form has to MEASURE the panel
                  // to clamp it against the viewport edge, and CSS cannot be measured
                  // before it is painted.
                  width={288}
                  align="left"
                  empty={storeHits.length === 0}
                  header={
                    <DropdownSearchHeader
                      query={store.query}
                      onQueryChange={store.setQuery}
                      inputRef={store.inputRef}
                      placeholder="Search stores"
                    />
                  }
                >
                  {storeHits.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setStoreKey(s.key);
                          store.setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
                          s.key === storeKey && "font-medium",
                        )}
                      >
                        <span className="min-w-0 truncate">{s.label}</span>
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">{s.hint}</span>
                      </button>
                    </li>
                  ))}
                </DropdownPanel>
              )}
            </div>
          </Row>
        </Stage>
        <Current label="store" value={storeKey === null ? "null" : `"${storeKey}"`} />
        <Note>
          Anchored, the panel is <code className="font-mono">position: fixed</code> against the
          trigger's rect in a portal: it re-aligns on scroll and resize, flips above the trigger
          when there is no room below, caps its height against the visible viewport and is clamped
          8px from either screen edge. That is the difference between a list an ancestor's{" "}
          <code className="font-mono">overflow</code> can slice in half and one it cannot.
        </Note>
      </Example>
    </>
  );
}
