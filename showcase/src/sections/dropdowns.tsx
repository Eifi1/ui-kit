import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Banknote, Home, PiggyBank, ShoppingCart, Train, Zap } from "lucide-react";
import {
  Button,
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
            options={ACCOUNTS}
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
          , and anything else reverts to the selected label on blur or Escape.
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
          but renders label and sublabel only.
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
        </Stage>
        <Current label="value" value={tags.length ? JSON.stringify(tags) : "[]"} />
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
        </Stage>
        <Current label="values" value={markets.length ? JSON.stringify(markets) : "[] (= all)"} />
      </Example>

      <Example label="GroupedPicker" hint="one panel of columns instead of one long scroll">
        <Stage>
          <GroupedPicker
            groups={CATEGORY_GROUPS}
            buttonLabel={pickedLabel}
            selected={picked}
            onSelect={(group, item) => setPicked({ group, item })}
            ariaLabel="Category"
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
                <DropdownPanel className="w-56" empty={false}>
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
