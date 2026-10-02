import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Coffee, Home, ShoppingCart, Star } from "lucide-react";
import {
  Chip,
  DateMark,
  DatePicker,
  DateRangePicker,
  FieldHint,
  IconButton,
  IconPicker,
  Input,
  MonthPicker,
  Select,
  SwatchPicker,
  Switch,
  ToggleGroup,
  UiKitProvider,
  WriteLockProvider,
} from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.22.0, the pickers' round: keksdose K1–K4, K12, K13 and kastlan 7. Four specimens,
 * one per page they belong on — see the report: `ToggleGroup022Demo` (chips-toggles),
 * `Choices022Demo` (choices), `Dates022Demo` (calendars), `Month022Demo` (month-time).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const GRAINS = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "half", label: "Half-year" },
  { value: "year", label: "Year" },
];
const STATUSES = [
  { value: "open", label: "Open" },
  { value: "cleared", label: "Cleared" },
  { value: "reconciled", label: "Done" },
];

/** ToggleGroup: the chrome clears its label (K1), the strip (K2), the lock (K3). */
export function ToggleGroup022Demo() {
  const [grain, setGrain] = useState("month");
  const [status, setStatus] = useState("open");
  const [locked, setLocked] = useState(true);
  const [chip, setChip] = useState(true);
  return (
    <>
      <Example
        label="ToggleGroup as a field — the label is clear of the fill"
        hint="42px beside a labelled Select, md and sm; chromeClassName joins it flush"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Select label="Range" defaultValue="12">
            <option value="12">Last 12 months</option>
            <option value="24">Last 24 months</option>
          </Select>
          <ToggleGroup label="Group by" value={grain} onChange={setGrain} options={GRAINS} />
          <ToggleGroup label="Group by" size="sm" value={grain} onChange={setGrain} options={GRAINS} />
        </div>
        <div className="mt-4 flex flex-col md:flex-row">
          <Select label="Range" defaultValue="12" className="md:w-52" selectClassName="md:rounded-e-none">
            <option value="12">Last 12 months</option>
            <option value="24">Last 24 months</option>
          </Select>
          <ToggleGroup
            label="Group by"
            size="sm"
            className="mt-3 md:mt-0 md:-ms-px"
            chromeClassName="md:rounded-s-none"
            value={grain}
            onChange={setGrain}
            options={GRAINS}
          />
        </div>
        <Note>
          The active fill starts 21px down, 3.25px below the 11px label&apos;s line (it was 17px, touching it —
          keksdose feedback #117). {code('size="sm"')} keeps its 12px type inside the chrome. The joined pair
          squares the shared edge from {code("md")} up with {code('chromeClassName="md:rounded-s-none"')} and{" "}
          {code('className="md:-ms-px"')}; on a phone the two stack.
        </Note>
      </Example>
      <Example label='ToggleGroup labelPlacement="strip"' hint="a group that is not a field, on its neighbours' label line">
        <div className="grid items-start gap-3 md:grid-cols-3">
          <Input label="Memo" defaultValue="Rent September" />
          <ToggleGroup
            label="Status"
            labelPlacement="strip"
            hint={<FieldHint label="What the bank statement says" />}
            value={status}
            onChange={setStatus}
            options={STATUSES}
          />
          <Input label="Amount" defaultValue="1,250.00" />
        </div>
        <Note>
          16px of strip plus a 26px group: exactly the 42px of the inputs beside it, the label on their line
          (keksdose&apos;s measured {code("ClearedStatusPicker")}, live #288 / #431).
        </Note>
      </Example>
      <Example label="commit / disabledReason on a group and a chip" hint="under a WriteLockProvider: reachable, refusing, saying why">
        <div className="flex flex-col gap-3">
          <Switch checked={locked} onCheckedChange={setLocked} label="Read-only (WriteLockProvider locked)" />
          <WriteLockProvider locked={locked} reason="This is a shared budget: you can look, not change.">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-72">
                <ToggleGroup label="Status" commit value={status} onChange={setStatus} options={STATUSES} />
              </div>
              <Chip commit onClick={() => setChip((v) => !v)} selected={chip} checkbox>
                Include in report
              </Chip>
            </div>
          </WriteLockProvider>
        </div>
        <Note>
          Hover or Tab onto a segment or the chip: the lock&apos;s reason shows and is read out; a press changes
          nothing. Without the lock (or the {code("commit")} prop) both behave as before. {code("disabledReason")}{" "}
          is the same refusal with a reason of the control&apos;s own.
        </Note>
      </Example>
    </>
  );
}

const FLAGS = [
  { value: "red", label: "Red", color: "var(--danger)" },
  { value: "amber", label: "Amber", color: "var(--warning)" },
  { value: "green", label: "Green", color: "var(--success)" },
  { value: "blue", label: "Blue", color: "var(--brand)" },
];
const SYMBOLS = [
  { value: "home", label: "Home", icon: Home },
  { value: "cart", label: "Shopping", icon: ShoppingCart, keywords: ["groceries"] },
  { value: "coffee", label: "Coffee", icon: Coffee },
  { value: "star", label: "Favourite", icon: Star },
];

/** SwatchPicker / IconPicker: the strip label (K2) and the lock (K3). */
export function Choices022Demo() {
  const [flag, setFlag] = useState<string | null>("amber");
  const [symbol, setSymbol] = useState<string | null>("cart");
  const [locked, setLocked] = useState(false);
  return (
    <Example label="SwatchPicker and IconPicker with a label" hint="the strip over the tiles; commit under a lock">
      <div className="flex flex-col gap-4">
        <div className="grid items-start gap-3 md:grid-cols-3">
          <Input label="Memo" defaultValue="Coffee beans" />
          <SwatchPicker
            label="Flag"
            hint={<FieldHint label="Your own marker, never shared" />}
            allowNone
            size="sm"
            value={flag}
            onChange={setFlag}
            options={FLAGS}
          />
          <IconPicker label="Symbol" value={symbol} onChange={setSymbol} options={SYMBOLS} size="sm" />
        </div>
        <WriteLockProvider locked={locked} reason="Reconciled rows are final.">
          <div className="flex flex-col gap-2">
            <Switch checked={locked} onCheckedChange={setLocked} label="Lock the flag (commit)" />
            <SwatchPicker aria-label="Flag (locked demo)" commit value={flag} onChange={setFlag} options={FLAGS} />
          </div>
        </WriteLockProvider>
        <Note>
          The label sits on the line of the field labels beside it; the tiles start 20px down, below its whole
          line, because a selected tile&apos;s frame is its border. Locked, the swatches stay reachable — the arrow
          keys still walk them — and the reason shows under the row.
        </Note>
      </div>
    </Example>
  );
}

/** keksdose's date-format preference, as the provider formatter it asked for: digits
 *  in ISO order, the weekday in the UI language. */
function useIsoWithWeekday(language: string) {
  return useCallback(
    (iso: string, ctx: { unit: "day" | "month" | "year"; weekday: boolean }) => {
      if (ctx.unit !== "day") return "";
      const [y, m, d] = iso.split("-").map(Number);
      const day = new Date(y, m - 1, d).toLocaleDateString(language, { weekday: "short" });
      return ctx.weekday ? `${day}, ${iso}` : iso;
    },
    [language],
  );
}

/** DatePicker / DateRangePicker: hint and error (K4), the provider formatter (K12). */
export function Dates022Demo() {
  const [due, setDue] = useState("2026-09-07");
  const [range, setRange] = useState({ from: "2026-09-01", to: "2026-09-30" });
  const [language, setLanguage] = useState("en-GB");
  const formatDate = useIsoWithWeekday(language);
  return (
    <>
      <Example label="DatePicker hint and error" hint="the anatomy every field has: caption, message, aria-describedby">
        <div className="grid items-start gap-3 md:grid-cols-2">
          <DatePicker
            label="Booking date"
            value={due}
            onChange={setDue}
            step
            today="2026-10-02"
            hint="The day the bank booked it, not the receipt's."
            error={due > "2026-10-02" ? "A booking cannot be in the future." : undefined}
          />
          <DateRangePicker
            label="Statement period"
            hint={<FieldHint label="Both days are included" />}
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
          />
        </div>
        <Note>
          A text {code("hint")} is a caption under the field, a {code("FieldHint")} rides the label line, as on{" "}
          {code("Select")}. {code("error")} goes under the whole row (steppers included) and implies{" "}
          {code("invalid")}; step past today to see it.
        </Note>
      </Example>
      <Example label="<UiKitProvider formatDate>" hint="one date look for every picker trigger and DateMark">
        <div className="flex flex-col gap-3">
          <Select label="Weekday language" value={language} onChange={(e) => setLanguage(e.target.value)} className="sm:w-56">
            <option value="en-GB">English</option>
            <option value="de-CH">Deutsch (Schweiz)</option>
            <option value="fr-CH">Français (Suisse)</option>
          </Select>
          <UiKitProvider formatDate={formatDate}>
            <div className="grid items-start gap-3 md:grid-cols-2">
              <DatePicker label="Booking date" value={due} onChange={setDue} />
              <DateRangePicker
                label="Statement period"
                from={range.from}
                to={range.to}
                onChange={(from, to) => setRange({ from, to })}
              />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              In a table cell: <DateMark value={due} />
            </p>
          </UiKitProvider>
        </div>
        <Note>
          keksdose&apos;s preference — ISO digits, the weekday in the UI language — set once on the provider
          instead of a {code("formatValue")} on every field. The formatter is told the {code("unit")}, the{" "}
          {code("source")} and a {code("weekday")} suggestion (a single date yes, a range&apos;s ends no); returning{" "}
          {code('""')} falls back to the kit&apos;s own. A field&apos;s own {code("formatValue")} or{" "}
          {code("formatOptions")} still wins.
        </Note>
      </Example>
    </>
  );
}

/** MonthPicker: year mode (kastlan 7, keksdose tax tab), size sm (K13), error (K4). */
export function Month022Demo() {
  const thisYear = 2026;
  const [taxYear, setTaxYear] = useState(String(thisYear));
  const [fiscal, setFiscal] = useState("2027");
  const [month, setMonth] = useState("2026-09");
  const step = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  return (
    <>
      <Example label='MonthPicker mode="year"' hint='value and bounds are "YYYY"; a short bounded span is shown whole'>
        <div className="grid items-start gap-3 md:grid-cols-3">
          <MonthPicker
            mode="year"
            label="Tax year"
            min={String(thisYear - 4)}
            max={String(thisYear)}
            currentMonth="2026-10"
            value={taxYear}
            onChange={setTaxYear}
          />
          <MonthPicker
            mode="year"
            label="Fiscal year"
            min="2020"
            hint="From 2020 on; budgets can be planned ahead."
            currentMonth="2026-10"
            value={fiscal}
            onChange={setFiscal}
          />
          <MonthPicker
            mode="year"
            variant="stepper"
            headingLevel={false}
            min={String(thisYear - 4)}
            max={String(thisYear)}
            currentMonth="2026-10"
            value={taxYear}
            onChange={setTaxYear}
          />
        </div>
        <Note>
          keksdose&apos;s tax tab (this year and four before) opens on five years and no paging; kastlan&apos;s
          fiscal year pages twelve at a time from {code("min")}. The stepper steps a year; its Today reads
          &ldquo;This year&rdquo;. Values are strings: {code("String(year)")} in, {code("Number(key)")} out.
        </Note>
      </Example>
      <Example label='MonthPicker size="sm" and error' hint="the 36px toolbar trigger between two icon buttons">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <IconButton aria-label="Previous month" onClick={() => step(-1)}>
              <ChevronLeft className="rtl:-scale-x-100" />
            </IconButton>
            <MonthPicker aria-label="Budget month" size="sm" currentMonth="2026-10" value={month} onChange={setMonth} />
            <IconButton aria-label="Next month" onClick={() => step(1)}>
              <ChevronRight className="rtl:-scale-x-100" />
            </IconButton>
          </div>
          <div className="sm:w-64">
            <MonthPicker
              label="Statement month"
              currentMonth="2026-10"
              value={month}
              onChange={setMonth}
              error={month > "2026-10" ? "That month has not started yet." : undefined}
            />
          </div>
        </div>
        <Note>
          {code('size="sm"')} is an {code("IconButton")}&apos;s 36px and only as wide as the month (keksdose live
          #260 wrote {code("h-9 w-auto py-0")} by hand). Unlabelled only, as on {code("Select")}. Step past October
          to see the error.
        </Note>
      </Example>
    </>
  );
}
