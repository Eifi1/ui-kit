import { useState } from "react";
import type { ReactNode } from "react";
import {
  Button,
  Checkbox,
  Delta,
  EMPTY_FORMATTED_VALUE,
  Input,
  SignedAmount,
  Tone,
  ToggleGroup,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  toneTextClass,
  useKitFormat,
} from "@eifi1/ui-kit";
import type { TextTone } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * The 0.12 formatters (`formatNumber`, `formatMoney`, `formatPercent`, `formatDate`,
 * `formatRelativeTime`, `useKitFormat`) and the signed figures built on them
 * (`SignedAmount`, `Delta`, `Tone`). The formatters are `Intl` with the kit's locale
 * handed in, so the useful specimen is the same input in several locales side by side.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

const LOCALES = ["en-GB", "de-CH", "fr-FR", "hu-HU", "zh-CN"] as const;

/** A fixed "now", so the relative-time rows read the same on every visit. */
const NOW = new Date("2026-07-08T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface Specimen {
  expr: string;
  run: (locale: string, value: number) => string;
}

const SPECIMENS: Specimen[] = [
  { expr: "formatNumber(v)", run: (locale, v) => formatNumber(v, { locale }) },
  { expr: "formatNumber(v, { digits: 2 })", run: (locale, v) => formatNumber(v, { locale, digits: 2 }) },
  { expr: "formatNumber(v, { compact: true })", run: (locale, v) => formatNumber(v, { locale, compact: true }) },
  {
    expr: 'formatNumber(-v, { signDisplay: "exceptZero" })',
    run: (locale, v) => formatNumber(-v, { locale, signDisplay: "exceptZero" }),
  },
  { expr: 'formatMoney(v, "CHF")', run: (locale, v) => formatMoney(v, "CHF", { locale }) },
  {
    expr: 'formatMoney(v, "EUR", { currencyDisplay: "code" })',
    run: (locale, v) => formatMoney(v, "EUR", { locale, currencyDisplay: "code" }),
  },
  { expr: "formatPercent(0.1234)", run: (locale) => formatPercent(0.1234, { locale }) },
  {
    expr: "formatPercent(1.25, { ratio: false, digits: 2 })",
    run: (locale) => formatPercent(1.25, { locale, ratio: false, digits: 2 }),
  },
  { expr: 'formatDate("2026-07-08")', run: (locale) => formatDate("2026-07-08", "medium", { locale }) },
  { expr: 'formatDate("2026-07-08", "full")', run: (locale) => formatDate("2026-07-08", "full", { locale }) },
  { expr: 'formatDate(d, "monthYear")', run: (locale) => formatDate("2026-07-08", "monthYear", { locale }) },
  {
    expr: 'formatDate(ts, "dateTime", { timeZone: "Europe/Zurich" })',
    run: (locale) => formatDate("2026-07-08T14:05:00Z", "dateTime", { locale, timeZone: "Europe/Zurich" }),
  },
  { expr: "formatRelativeTime(−3 h)", run: (locale) => formatRelativeTime(ago(3 * HOUR), { locale, now: NOW }) },
  { expr: "formatRelativeTime(−1 day)", run: (locale) => formatRelativeTime(ago(DAY), { locale, now: NOW }) },
  {
    expr: 'formatRelativeTime(+2 days, { style: "narrow" })',
    run: (locale) => formatRelativeTime(ago(-2 * DAY), { locale, now: NOW, style: "narrow" }),
  },
  {
    expr: "formatRelativeTime(−40 days, { absoluteAfterDays: 7 })",
    run: (locale) => formatRelativeTime(ago(40 * DAY), { locale, now: NOW, absoluteAfterDays: 7 }),
  },
  { expr: "formatNumber(null)", run: (locale) => formatNumber(null, { locale }) },
  { expr: 'formatDate("not a date", "medium", { empty: "n/a" })', run: (locale) => formatDate("not a date", "medium", { locale, empty: "n/a" }) },
];

function FormatterTable() {
  const [raw, setRaw] = useState("12345.678");
  const parsed = Number(raw);
  const value = raw.trim() === "" || Number.isNaN(parsed) ? Number.NaN : parsed;
  return (
    <Example
      label="Formatters — one input, five locales"
      hint="the plain functions take a locale; none means the runtime default"
    >
      <div className="mb-3 max-w-xs">
        <Input
          label="v (a number)"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>
      {/* The table is wider than a phone: it scrolls inside its card rather than the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-1.5 pr-4 font-medium text-[var(--text-muted)]">call</th>
              {LOCALES.map((l) => (
                <th key={l} className="py-1.5 pr-4 font-mono font-medium text-[var(--text-muted)]">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPECIMENS.map((s) => (
              <tr key={s.expr} className="border-b border-[var(--border)] last:border-b-0">
                <td className="py-1.5 pr-4 align-top font-mono text-[var(--text-secondary)]">{s.expr}</td>
                {LOCALES.map((l) => (
                  <td key={l} className="py-1.5 pr-4 align-top font-mono font-medium text-[var(--text-primary)]">
                    {s.run(l, value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Note>
          A missing value — {code("null")}, {code("undefined")}, {code("NaN")}, an unparseable date — prints{" "}
          {code("empty")} (default {code(`"${EMPTY_FORMATTED_VALUE}"`)}), never &ldquo;NaN&rdquo; or &ldquo;Invalid
          Date&rdquo;: clear the field above and every number column turns into the dash. A bare{" "}
          {code('"YYYY-MM-DD"')} is a calendar day read on the local calendar; relative times here are measured
          from a fixed {code("now")} ({NOW.toISOString()}) so the rows do not drift.
        </Note>
      </div>
    </Example>
  );
}

function KitFormatDemo() {
  const f = useKitFormat();
  const pinned = useKitFormat("de-CH");
  const [opened] = useState(() => Date.now() - 5 * 60_000);
  return (
    <Example
      label="useKitFormat() — bound to the provider's locale"
      hint="switch the language in the top bar and these rows follow it"
    >
      <OutTable
        rows={[
          ["useKitFormat().locale", f.locale ?? "(runtime default)"],
          ["formatNumber(1234567.891)", f.formatNumber(1234567.891)],
          ['formatMoney(-1250.5, "CHF")', f.formatMoney(-1250.5, "CHF")],
          ["formatPercent(0.075)", f.formatPercent(0.075)],
          ['formatDate("2026-07-08", "long")', f.formatDate("2026-07-08", "long")],
          ["formatRelativeTime(five minutes ago)", f.formatRelativeTime(opened)],
          ['useKitFormat("de-CH").formatMoney(1234.5, "CHF")', pinned.formatMoney(1234.5, "CHF")],
        ]}
      />
      <div className="mt-3">
        <Note>
          The hook hands back the same five functions with the {code("<UiKitProvider locale>")} as their
          default, so a figure printed by the page matches the figures printed by the kit components on it. An
          explicit {code("locale")} — the hook&rsquo;s argument or an option — still wins, as the last row shows.
        </Note>
      </div>
    </Example>
  );
}

function SignedAmountDemo() {
  const [value, setValue] = useState(50);
  const [sensitive, setSensitive] = useState(false);
  const step = (d: number) => setValue((v) => Math.round((v + d) * 100) / 100);
  const rows: Array<[string, ReactNode]> = [
    ["default (tone signed)", <SignedAmount key="a" value={value} currency="CHF" sensitive={sensitive} />],
    ["arrow", <SignedAmount key="b" value={value} currency="CHF" arrow sensitive={sensitive} />],
    ["showPlus={false}", <SignedAmount key="c" value={value} currency="CHF" showPlus={false} sensitive={sensitive} />],
    ['goodDirection="down" (a rent rise is bad news)', <SignedAmount key="d" value={value} currency="CHF" goodDirection="down" arrow sensitive={sensitive} />],
    ['tone="income"', <SignedAmount key="e" value={value} currency="CHF" tone="income" sensitive={sensitive} />],
    ['tone="expense"', <SignedAmount key="f" value={value} currency="CHF" tone="expense" sensitive={sensitive} />],
    ['tone="neutral"', <SignedAmount key="g" value={value} currency="CHF" tone="neutral" sensitive={sensitive} />],
    ['unit="percent" digits={2} (v / 1000)', <SignedAmount key="h" value={value / 1000} unit="percent" digits={2} sensitive={sensitive} />],
    ["compact (v × 1000)", <SignedAmount key="i" value={value * 1000} compact sensitive={sensitive} />],
    ["format={(m) => `${m} kg`}", <SignedAmount key="j" value={value} format={(m) => `${m} kg`} sensitive={sensitive} />],
    ['locale="de-CH"', <SignedAmount key="k" value={value} currency="CHF" locale="de-CH" sensitive={sensitive} />],
    [
      "labels (spoken words)",
      <SignedAmount
        key="l"
        value={value}
        currency="CHF"
        sensitive={sensitive}
        labels={{ positive: (a) => `credit of ${a}`, negative: (a) => `debit of ${a}` }}
      />,
    ],
  ];
  return (
    <Example
      label="SignedAmount — sign, tone, arrow and spoken words"
      hint="the visible sign is aria-hidden; a screen reader hears plus / minus in words"
    >
      <Row className="mb-3">
        <Button variant="secondary" size="sm" onClick={() => step(-75)}>
          −75
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setValue(0)}>
          0
        </Button>
        <Button variant="secondary" size="sm" onClick={() => step(75)}>
          +75
        </Button>
        <Checkbox
          label="sensitive (data-private)"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />
        <span className={READOUT}>value = {value}</span>
      </Row>
      <OutTable rows={rows} />
      <div className="mt-3">
        <Note>
          {code("signed")} colours money by its own sign (income above zero, expense below, muted at zero);{" "}
          {code("goodDirection")} switches to a verdict — success or danger — and {code("arrow")} carries the
          direction without colour. {code("sensitive")} tags the figure {code("data-private")} for the host&rsquo;s
          demo-mode blur. The minus is U+2212, the width of a &ldquo;+&rdquo;, so a column lines up.
        </Note>
      </div>
    </Example>
  );
}

function DeltaDemo() {
  const [good, setGood] = useState<"none" | "up" | "down">("up");
  const goodDirection = good === "none" ? undefined : good;
  return (
    <Example label="Delta — a change, judged or not" hint="StatTile's delta on its own">
      <Row className="mb-3">
        <ToggleGroup<"none" | "up" | "down">
          aria-label="goodDirection"
          size="sm"
          value={good}
          onChange={setGood}
          options={[
            { value: "none", label: "unset" },
            { value: "up", label: "up is good" },
            { value: "down", label: "down is good" },
          ]}
        />
      </Row>
      <OutTable
        rows={[
          ['value={0.12} unit="percent"', <Delta key="a" value={0.12} unit="percent" goodDirection={goodDirection} label="vs last month" />],
          ['value={-0.034} unit="percent"', <Delta key="b" value={-0.034} unit="percent" goodDirection={goodDirection} label="vs last year" />],
          ['value={250} currency="EUR"', <Delta key="c" value={250} currency="EUR" goodDirection={goodDirection} />],
          ["value={0} (flat: the dash)", <Delta key="d" value={0} goodDirection={goodDirection} label="unchanged" />],
          ["value={0} arrow={false}", <Delta key="e" value={0} arrow={false} goodDirection={goodDirection} />],
          ["value={-18400} compact sensitive", <Delta key="f" value={-18400} compact goodDirection={goodDirection} sensitive />],
          [
            "labels (direction words)",
            <Delta
              key="g"
              value={3}
              goodDirection={goodDirection}
              labels={{ increase: (a) => `rose by ${a}`, better: (s) => `${s}, good` }}
            />,
          ],
        ]}
      />
      <div className="mt-3">
        <Note>
          Unset, a change is stated and not judged: muted, whichever way it points. With{" "}
          {code("goodDirection")} it is coloured success or danger and its hidden sentence gains
          &ldquo;(better)&rdquo; / &ldquo;(worse)&rdquo;. A non-finite value renders nothing.
        </Note>
      </div>
    </Example>
  );
}

const TONES: TextTone[] = ["default", "muted", "brand", "income", "expense", "net", "success", "warning", "danger", "info"];

function ToneDemo() {
  return (
    <Example label="Tone and toneTextClass — the kit's text colours" hint="token-backed; pair a verdict with a word or sign">
      <Row>
        {TONES.map((t) => (
          <Tone key={t} tone={t} className="text-sm font-medium">
            {t}
          </Tone>
        ))}
      </Row>
      <p className="mt-3 text-sm">
        Votes: <Tone tone="success">12 for</Tone> · <Tone tone="danger">3 against</Tone> ·{" "}
        <span className={toneTextClass("muted")}>1 abstained (toneTextClass(&quot;muted&quot;))</span>
      </p>
    </Example>
  );
}

export function FormattingDemo() {
  return (
    <>
      <FormatterTable />
      <KitFormatDemo />
      <SignedAmountDemo />
      <DeltaDemo />
      <ToneDemo />
    </>
  );
}
