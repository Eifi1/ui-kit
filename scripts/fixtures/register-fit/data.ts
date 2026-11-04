/**
 * The register fixture's rows (main.tsx): the same on every load, from a seeded generator.
 * Plain TypeScript with erasable types only, so Node can import it as well
 * (`node -e 'import("./scripts/fixtures/register-fit/data.ts")…'` lists where the monthly
 * rows land).
 *
 * Like a real register, the widest cells are rare: the everyday rows are short, and once a
 * month the mortgage payment brings the longest account, the longest category and the
 * widest status (reconciled, with an invoice). Whether the first of those rows is inside
 * the drawn part of a `virtualize`d table is what decides some columns' widths — as in
 * keksdose's register, where a load that drew 52 rows ended with other columns than one
 * that drew 48 (kit0512-npm-results.tsv).
 */

export type Status = "uncleared" | "cleared" | "reconciled";
export interface Txn {
  id: string;
  date: string;
  account: string;
  payee: string;
  category: string | null;
  kind: "plain" | "split" | "transfer";
  memo: string;
  status: Status;
  receipt: boolean;
  amount: number;
  currency: string;
  preview: boolean;
}

export const TODAY = "2026-11-04";

export const ACCOUNTS = ["UBS Personal", "PostFinance Savings", "Revolut CHF", "ZKB Visa", "Cash", "Neon"];
/** The monthly row's account: the longest name, on one row a month. */
export const MORTGAGE_ACCOUNT = "Raiffeisen Mortgage Account Zürich";
export const PAYEES = [
  "Migros",
  "Coop City Zürich Bahnhofstrasse",
  "SBB CFF FFS",
  "Swisscom (Schweiz) AG",
  "Digitec Galaxus",
  "Landi",
  "Apotheke zur Rose",
  "Spotify",
  "IKEA Spreitenbach",
  "Denner",
];
export const CATEGORIES = [
  "Groceries",
  "Transport",
  "Phone",
  "Electronics",
  "Health",
  "Subscriptions",
  "Household",
  "Eating out",
];
/** The monthly row's category: the longest. */
export const MORTGAGE_CATEGORY = "Housing & mortgage interest";
/** Once a year, far down the list: the longest category of all. Scrolled past, it widens
 *  its column once, and `virtualize`'s lock keeps that width (keksdose N2). */
export const YEARLY_DATE = "2026-07-15";
export const YEARLY_CATEGORY = "Insurance — household, liability & legal costs";
const MEMOS = ["", "", "", "weekly shop", "monthly", "refund pending", "gift for Anna's birthday"];

/** mulberry32: a small seeded generator. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` rows, newest first, from TODAY back; the mortgage payment on `monthlyDay`. */
export function makeRows(count: number, seed: number, monthlyDay = 22): Txn[] {
  const r = rng(seed);
  const pick = <V>(list: readonly V[]) => list[Math.floor(r() * list.length)];
  const out: Txn[] = [];
  let day = new Date(`${TODAY}T00:00:00Z`);
  while (out.length < count) {
    const date = day.toISOString().slice(0, 10);
    const n = Math.floor(r() * 4);
    for (let i = 0; i < n && out.length < count; i++) {
      const roll = r();
      const kind = roll < 0.05 ? "split" : roll < 0.12 ? "transfer" : "plain";
      const amount = Math.round((3 + r() * 240) * 100) / 100;
      const category = pick(CATEGORIES);
      out.push({
        id: `t${out.length}`,
        date,
        account: pick(ACCOUNTS),
        payee: kind === "transfer" ? `→ ${pick(ACCOUNTS)}` : pick(PAYEES),
        category: kind === "plain" ? category : null,
        kind,
        memo: pick(MEMOS),
        status: r() < 0.5 ? "uncleared" : "cleared",
        receipt: false,
        amount: r() < 0.15 ? amount : -amount,
        currency: r() < 0.07 ? "EUR" : "CHF",
        preview: false,
      });
    }
    if (Number(date.slice(8)) === monthlyDay && out.length < count)
      out.push({
        id: `t${out.length}`,
        date,
        account: MORTGAGE_ACCOUNT,
        payee: "Raiffeisen",
        category: MORTGAGE_CATEGORY,
        kind: "plain",
        memo: "Q4 instalment",
        status: "reconciled",
        receipt: true,
        amount: -12_345.6,
        currency: "CHF",
        preview: false,
      });
    if (date === YEARLY_DATE && out.length < count)
      out.push({
        id: `t${out.length}`,
        date,
        account: "UBS Personal",
        payee: "Helvetia",
        category: YEARLY_CATEGORY,
        kind: "plain",
        memo: "",
        status: "cleared",
        receipt: false,
        amount: -1_234.5,
        currency: "CHF",
        preview: false,
      });
    day = new Date(day.getTime() - 86_400_000);
  }
  return out;
}

/** keksdose's overdue previews (its rules query): dated in the past, so inline in their period. */
export const PREVIEWS: Txn[] = [
  { date: "2026-11-02", payee: "Rent — Example Immobilien AG", amount: -2450 },
  { date: "2026-10-31", payee: "Krankenkasse Helsana", amount: -412.35 },
].map((p, i) => ({
  id: `s${i}`,
  account: "UBS Personal",
  category: "Household",
  kind: "plain",
  memo: "",
  status: "uncleared",
  receipt: false,
  currency: "CHF",
  preview: true,
  ...p,
}));

/**
 * An edit as a refetch brings it (keksdose N2's case): the same rows, the same keys and
 * count, so `virtualize`'s lock stays; the first row's amount is now wider.
 */
export function edited(rows: readonly Txn[]): Txn[] {
  return rows.map((r, i) => (i === 0 ? { ...r, amount: -1_234_567.8 } : r));
}

/** The rows on screen, as keksdose merges them: the previews among the loaded rows, by date. */
export function merge(txns: readonly Txn[] | null, previews: readonly Txn[] | null): Txn[] {
  return [...(txns ?? []), ...(previews ?? [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
