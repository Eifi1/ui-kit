import type { ReactNode } from "react";
import { Banknote, Home, PiggyBank, ShoppingCart, Train, Zap } from "lucide-react";
import type { ComboOption, MultiSelectOption, PickerGroup } from "@eifi1/ui-kit";

/**
 * The fixtures the three dropdown pages share — "Comboboxes", "Entity pickers" and
 * "Dropdown parts" were one page, and the same accounts, categories and markets run
 * through all of them, so a reader who picks "Checking" on one page meets it again on
 * the next. Kept in one module rather than copied, so the three cannot drift apart.
 */

/* ── fixtures ────────────────────────────────────────────────────────────────
 * Small and domestic on purpose: every list here is short enough to read in one
 * glance, so what a specimen DOES is never hidden behind scrolling.
 */

/** Free-text pool for {@link Combobox}, with the group each name belongs under.
 *  A plain array would exercise the flat list; the map is what `groupBy` reads. */
export const PAYEE_GROUPS: Record<string, string> = {
  Rewe: "Groceries",
  Edeka: "Groceries",
  "Aldi Süd": "Groceries",
  "Deutsche Bahn": "Travel",
  "MVG München": "Travel",
  "Stadtwerke München": "Utilities",
  Spotify: "Subscriptions",
  Netflix: "Subscriptions",
};
export const PAYEES = Object.keys(PAYEE_GROUPS);
/** The ones that bill every month — shown as a badge through `optionAdornment`,
 *  which exists for exactly this: a fact about the option that decides what
 *  picking it means and is invisible in its label. */
export const RECURRING = new Set(["Spotify", "Netflix", "Stadtwerke München", "MVG München"]);

/** Id-keyed options for {@link InlineEntityCombobox}. Two groups, because one
 *  group renders identically to no group at all — the heading-plus-indent
 *  treatment only becomes visible at the second boundary. */
export const ACCOUNTS: ComboOption<string>[] = [
  { value: "chk", label: "Checking", sublabel: "DE89 ··· 3000", group: "Everyday" },
  { value: "cash", label: "Cash", sublabel: "wallet", group: "Everyday" },
  { value: "sav", label: "Savings", sublabel: "1.8% p.a.", group: "Reserves" },
  { value: "buf", label: "Buffer", sublabel: "for the annual bills", group: "Reserves" },
];

/** The InlineEntityCombobox specimen's list: {@link ACCOUNTS} plus a CLOSED account,
 *  `disabled` — listed so the user sees it exists, dimmed, passed over by the arrows,
 *  and never taken (not even by typing its name in full). The reason rides in
 *  `sublabel`, the one place a phone can show it. */
export const INLINE_ACCOUNTS: ComboOption<string>[] = [
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
export const CATEGORIES: ComboOption<string>[] = [
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

export const CUSTOMERS: ComboOption<string>[] = [
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
export function loadCustomers(query: string): Promise<ComboOption<string>[]> {
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
export function searchCustomers(query: string, outage: boolean): Promise<ComboOption<string>[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outage) reject(new Error("503"));
      else void loadCustomers(query).then(resolve);
    }, 350);
  });
}

/** A list a server has already searched and ranked: "best match first", and rows
 *  whose label does not contain the query at all. `filter={false}` shows it as given. */
export const RANKED: ComboOption<string>[] = [
  { value: "r-1", label: "Bahnhofstrasse 1, Zürich", sublabel: "exact match" },
  { value: "r-2", label: "Bahnhofplatz, Bern", sublabel: "similar street" },
  { value: "r-3", label: "Hauptbahnhof, Basel", sublabel: "same landmark" },
];

export const TAGS: ComboOption<string>[] = [
  { value: "t-business", label: "Business" },
  { value: "t-reimburse", label: "Reimbursable" },
  { value: "t-holiday", label: "Holiday" },
  { value: "t-gift", label: "Gift" },
];

export const MARKETS: MultiSelectOption[] = [
  { value: "muc-mitte", label: "München Mitte", hint: "80331 · 2.1 km" },
  { value: "muc-sued", label: "München Süd", hint: "81541 · 4.8 km" },
  { value: "muc-nord", label: "München Nord", hint: "80637 · 6.0 km" },
  { value: "dachau", label: "Dachau", hint: "85221 · 17 km" },
];

export const CATEGORY_GROUPS: PickerGroup[] = [
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
export const SORTS = [
  { key: "date", label: "Newest first" },
  { key: "amount", label: "Largest amount" },
  { key: "payee", label: "Payee A–Z" },
];

export const STORES = [
  { key: "rewe-mitte", label: "Rewe Mitte", hint: "80331 München" },
  { key: "edeka-sued", label: "Edeka Süd", hint: "81541 München" },
  { key: "aldi-nord", label: "Aldi Nord", hint: "80637 München" },
  { key: "biomarkt", label: "Biomarkt Glockenbach", hint: "80469 München" },
];

/** What a controlled picker currently holds. Printed under every specimen because
 *  a picker that dropped its value on the floor looks exactly like one that kept
 *  it — the trigger shows a label either way, and only the state says which. */
export function Current({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="mt-3 text-xs text-[var(--text-muted)]">
      {label}: <span className="font-mono text-[var(--text-secondary)]">{value}</span>
    </p>
  );
}
