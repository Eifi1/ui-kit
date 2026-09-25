import { useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  DropdownPanel,
  DropdownSearchHeader,
  FieldChevron,
  FieldLabel,
  FIELD_FLOATING_PAD,
  FIELD_TRIGGER,
  GroupedPicker,
  MultiSelect,
  PickerSheet,
  SHEET_ROW_CLASS,
  cn,
  useDropdown,
  useDropdownSearch,
} from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Stage } from "../lib/section";
import { ACCOUNTS, CATEGORY_GROUPS, Current, MARKETS, SORTS, STORES } from "./dropdown-fixtures";

/**
 * DROPDOWN PARTS — the pickers with one presentation at every width (`MultiSelect`,
 * `GroupedPicker`), the phone sheet the comboboxes open (`PickerSheet`), and the
 * primitive layer every one of them is built from (`useDropdown`, `useDropdownSearch`,
 * `DropdownPanel`). Shared fixtures: dropdown-fixtures.tsx.
 */
export function DropdownParts() {
  const [markets, setMarkets] = useState<(string | number)[]>([]);
  const [picked, setPicked] = useState<{ group: string; item: string } | null>(null);
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
  const [storeRtl, setStoreRtl] = useState(false);
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
          language to see them follow. Ticking every market reads as &quot;all&quot; again. Its{" "}
          <code className="font-mono">invalid</code>, <code className="font-mono">error</code> and{" "}
          <code className="font-mono">disabled</code> are with the other pickers&apos; field states
          on the Entity pickers page.
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
                className={cn(FIELD_TRIGGER, "pe-9")}
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
                          "block w-full px-3 py-1.5 text-start text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
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
            <div ref={store.wrapperRef} dir={storeRtl ? "rtl" : "ltr"} className="relative w-64">
              <FieldLabel>Store</FieldLabel>
              <button
                ref={storeTrigger}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={store.open}
                aria-label={`Store: ${STORES.find((s) => s.key === storeKey)?.label ?? "none"}`}
                onClick={() => store.setOpen((o) => !o)}
                className={cn(FIELD_TRIGGER, FIELD_FLOATING_PAD, "pe-9")}
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
                  // Logical: the panel's START edge lines up with the trigger's — its
                  // left here, its right under dir="rtl". `left`/`right` stay physical;
                  // the default is `end`.
                  align="start"
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
                          "flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-start text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]",
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
        <Checkbox
          label='Put the field in dir="rtl"'
          checked={storeRtl}
          onChange={(e) => setStoreRtl(e.target.checked)}
        />
        <Current label="store" value={storeKey === null ? "null" : `"${storeKey}"`} />
        <Note>
          Tick the box and open it again: the 288px panel now hangs from the trigger&apos;s right
          edge and its rows read right to left. The panel is portalled to{" "}
          <code className="font-mono">&lt;body&gt;</code>, outside the field&apos;s{" "}
          <code className="font-mono">dir</code>, so it reads the direction off{" "}
          <code className="font-mono">anchorRef</code> and carries it itself.
        </Note>
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
