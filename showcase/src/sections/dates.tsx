import { useState } from "react";
import type { ReactNode } from "react";
import { Button, DatePicker, DateRangePicker, MiniCalendar, ToggleGroup } from "@eifi1/ui-kit";
import type { DateRangePickerPreset } from "@eifi1/ui-kit";
import {
  addDaysIso,
  dateRangePresets,
  endOfMonthIso,
  endOfYearIso,
  formatIsoDate,
  monthKey,
  pad,
  parseIsoDate,
  sameYmd,
  shiftIso,
  startOfMonthIso,
  startOfWeekIso,
  startOfYearIso,
  toLocalIso,
  todayIso,
} from "@eifi1/ui-kit/dates";
import { Example, Note, OutTable, Stage } from "../lib/section";

/**
 * DATES.
 *
 * Two things are worth knowing before reading anything below.
 *
 * First, every date in this kit is a plain `"YYYY-MM-DD"` STRING, never a `Date`.
 * The components take strings, emit strings and compare strings — which works
 * because that format sorts chronologically, so `min`/`max` bounds are `<` and `>`
 * on text. No `Date` ever crosses a prop boundary, and there is nothing to
 * serialise on the way to a URL or an API.
 *
 * Second, nothing here reads a clock or a locale of its own. `locale` is required
 * on all three components, and `DatePicker`'s jump-to-today button takes the day it
 * should jump to as a prop. That is what makes these testable at a fixed date and
 * in a fixed language — and it is why the table at the bottom of this section
 * computes every expected value instead of printing one: the helpers answer with
 * the viewer's LOCAL calendar day, so a string written here by hand would be right
 * only in the timezone it was written in.
 */

/** Every specimen's locale, spelled out — there is no default to fall back to. */
const LOCALE = "en-GB";

type Loc = "en-GB" | "de-DE" | "fr-FR";

const LOCALE_OPTIONS: { value: Loc; label: string }[] = [
  { value: "en-GB", label: "en-GB" },
  { value: "de-DE", label: "de-DE" },
  { value: "fr-FR", label: "fr-FR" },
];

/**
 * The month arrows are icon-only, so their `aria-label` is the only name they have.
 * `labels` exists because those two were once the package's only hardcoded strings,
 * and a German app reached the calendar through a bare re-export and announced them
 * in English on a page whose `<html lang>` said `de`. Switching the locale below
 * without switching these would reproduce exactly that bug on this page.
 */
const ARROW_LABELS: Record<Loc, { previousMonth: string; nextMonth: string }> = {
  "en-GB": { previousMonth: "Previous month", nextMonth: "Next month" },
  "de-DE": { previousMonth: "Vorheriger Monat", nextMonth: "Nächster Monat" },
  "fr-FR": { previousMonth: "Mois précédent", nextMonth: "Mois suivant" },
};

/**
 * `dateRangePresets()` returns a `key` and no label, on purpose: the key maps to the
 * consumer's own `table.preset_*` catalog. This map is the showcase playing the part
 * of that catalog — an app would look these up in its translations instead.
 */
const PRESET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  last_3_months: "Last 3 months",
  ytd: "Year to date",
  last_year: "Last year",
};

/** The calendar's own strings in German — arrows, spoken prompts and announcements. */
const DE_CALENDAR = {
  previousMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  chooseStart: "Startdatum wählen",
  chooseEnd: "Enddatum wählen",
  startSelected: (d: string) => `${d} als Start gewählt. Enddatum wählen.`,
  rangeSelected: (f: string, t: string) => `Zeitraum ${f} bis ${t} gewählt.`,
};

/** The live value under a specimen. A controlled component is only demonstrably
 *  controlled once you can watch the state it is driven by change underneath it. */
function StateLine({ children }: { children: ReactNode }) {
  return <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">{children}</p>;
}

/** An empty string is invisible on a page; render it as the literal instead. */
function iso(value: string): string {
  return value === "" ? '""' : value;
}

export function Dates() {
  // Calendars. The range one starts on a real range so the in-between fill is
  // visible without a click; the single one starts on today.
  const [rangeFrom, setRangeFrom] = useState(startOfMonthIso(0));
  const [rangeTo, setRangeTo] = useState(todayIso());
  const [singleDay, setSingleDay] = useState(todayIso());
  const [loc, setLoc] = useState<Loc>("en-GB");
  const [localeDay, setLocaleDay] = useState(todayIso());

  // Pickers.
  const [due, setDue] = useState(todayIso());
  const [stepped, setStepped] = useState(todayIso());
  const [formatted, setFormatted] = useState(todayIso());
  const [hostRendered, setHostRendered] = useState(todayIso());
  const [required, setRequired] = useState("");
  const [frozen] = useState(todayIso());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [presetFrom, setPresetFrom] = useState(startOfMonthIso(-1));
  const [presetTo, setPresetTo] = useState(endOfMonthIso(-1));
  const [boundFrom, setBoundFrom] = useState("");
  const [boundTo, setBoundTo] = useState("");
  const [deDay, setDeDay] = useState(todayIso());
  const [deFrom, setDeFrom] = useState(startOfMonthIso(0));
  const [deTo, setDeTo] = useState(todayIso());
  const [sundayDay, setSundayDay] = useState(todayIso());
  const [focusDay, setFocusDay] = useState(todayIso());
  const [popped, setPopped] = useState(false);

  // Bounds are computed from today rather than written out, so the specimen stays
  // operable whatever day you open this page (and in whatever timezone).
  const nearMin = shiftIso(-10);
  const nearMax = shiftIso(10);
  const stepMin = shiftIso(-3);
  const stepMax = shiftIso(3);

  const presets: DateRangePickerPreset[] = dateRangePresets().map((p) => ({
    label: PRESET_LABELS[p.key] ?? p.key,
    from: p.from,
    to: p.to,
  }));

  return (
    <>
      <Note>
        <strong>The locale comes from the app, never from the browser.</strong> Each of these takes
        a <code className="font-mono">locale</code> prop and, without one, the{" "}
        <code className="font-mono">&lt;UiKitProvider locale&gt;</code> the app mounted — there is
        still no <code className="font-mono">navigator.language</code> read, because a component
        that guessed would disagree with the host on every page it appeared on. The specimens below
        say <code className="font-mono">locale=&quot;en-GB&quot;</code> out loud so they stay put
        while you switch the showcase language; the pickers without one follow the top bar. Their
        accessible names (<code className="font-mono">miniCalendar.*</code>,{" "}
        <code className="font-mono">datePicker.*</code>) come from the provider the same way.
      </Note>

      <Example
        label="MiniCalendar — range mode (the default)"
        hint="two clicks: the first sets the start AND clears the end, the second closes the range"
      >
        <Stage>
          <MiniCalendar
            from={rangeFrom}
            to={rangeTo}
            locale={LOCALE}
            onSelect={(f, t) => {
              setRangeFrom(f);
              setRangeTo(t);
            }}
          />
        </Stage>
        <StateLine>
          from={iso(rangeFrom)} to={iso(rangeTo)}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Clicking backwards works: pick a day earlier than the open start and the component swaps
          the ends for you rather than refusing. Clicking again once both ends are set starts a new
          selection — there is no third state to get stuck in. The week starts on the locale&apos;s
          own first day (Monday for en-GB, Sunday for en-US), or on{" "}
          <code className="font-mono">weekStartsOn</code> when given.
        </p>
      </Example>

      <Note>
        <strong>Completing a range scrolls the calendar back to the start month.</strong> The view
        month is component state, re-derived whenever <code className="font-mono">from|to</code>{" "}
        changes — and it derives from <code className="font-mono">from</code> first. So if you open
        the range in one month, page forward and click the end in the next, the grid snaps back to
        the month the start is in the moment the range closes. Inside{" "}
        <code className="font-mono">DateRangePicker</code> nobody sees it, because the popover
        closes on that same click; on a calendar left open — the data-table date filter — it is
        visible. Reproduce it above: page forward, click, watch it jump.
      </Note>

      <Example
        label="MiniCalendar — single mode, bounded"
        hint='mode="single" emits onSelect(iso, iso); days outside min/max are disabled, not hidden'
      >
        <Stage>
          <MiniCalendar
            mode="single"
            from={singleDay}
            to={singleDay}
            locale={LOCALE}
            min={nearMin}
            max={nearMax}
            onSelect={(f) => setSingleDay(f)}
          />
        </Stage>
        <StateLine>
          value={iso(singleDay)} · min={nearMin} · max={nearMax}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Both ends of the same day, which is how <code className="font-mono">DatePicker</code>{" "}
          drives it internally. The bounds are inclusive and a bounded month still pages — you can
          navigate to a month that is entirely out of range and find every day in it dead, which is
          deliberate: a calendar that refused to move gives the reader no way to see WHY.
        </p>
      </Example>

      <Example
        label="MiniCalendar — locale and arrow labels"
        hint="the month name, the narrow weekday letters and the two aria-labels all move together"
      >
        <Stage>
          <div className="space-y-3">
            <ToggleGroup
              value={loc}
              onChange={setLoc}
              options={LOCALE_OPTIONS}
              ariaLabel="Calendar locale"
            />
            <div className="max-w-xs">
              <MiniCalendar
                mode="single"
                from={localeDay}
                to={localeDay}
                locale={loc}
                labels={ARROW_LABELS[loc]}
                onSelect={(f) => setLocaleDay(f)}
              />
            </div>
          </div>
        </Stage>
        <StateLine>
          locale={loc} · previousMonth=&quot;{ARROW_LABELS[loc].previousMonth}
          &quot; · selected=
          {formatIsoDate(localeDay, loc, { dateStyle: "full" })}
        </StateLine>
      </Example>

      <Example
        label="MiniCalendar — weekStartsOn and focusOnOpen"
        hint="the prop beats the locale's first day; focusOnOpen puts the caret on the selected day at mount"
      >
        <Stage>
          <MiniCalendar
            mode="single"
            from={sundayDay}
            to={sundayDay}
            locale={LOCALE}
            // en-GB starts on Monday; the prop wins over the locale and the provider.
            weekStartsOn={0}
            onSelect={(f) => setSundayDay(f)}
          />
          <div className="space-y-2">
            <Button variant="secondary" onClick={() => setPopped((p) => !p)}>
              {popped ? "Hide the calendar" : "Show a calendar that takes focus"}
            </Button>
            {popped && (
              <MiniCalendar
                mode="single"
                from={focusDay}
                to={focusDay}
                locale={LOCALE}
                focusOnOpen
                onSelect={(f) => {
                  setFocusDay(f);
                  setPopped(false);
                }}
              />
            )}
          </div>
        </Stage>
        <StateLine>
          weekStartsOn=0 → {iso(sundayDay)} · focusOnOpen → {iso(focusDay)}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open the second calendar with the keyboard (Enter on the button): focus lands on the
          selected day, so ←/→ move a day and Enter picks — no hunt through 42 cells. The first
          calendar is rendered inline and so does not take focus merely by existing.
        </p>
      </Example>

      <Example
        label="DatePicker"
        hint="a field-styled trigger opening a portalled single-mode calendar; the value is an ISO string"
      >
        <Stage>
          <div className="w-56">
            <DatePicker
              value={due}
              onChange={setDue}
              locale={LOCALE}
              label="Due date"
              placeholder="Pick a day"
              clearable
              clearLabel="Clear due date"
            />
          </div>
        </Stage>
        <StateLine>value={iso(due)}</StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          <code className="font-mono">clearable</code> emits{" "}
          <code className="font-mono">&quot;&quot;</code>, not{" "}
          <code className="font-mono">null</code> — the empty value is the empty string everywhere
          in this kit. Clear it and the trigger keeps its height: the empty span holds a
          non-breaking space, because an ordinary one is collapsible white space and the button
          collapsed to 22px beside 42px fields.
        </p>
      </Example>

      <Example
        label="DatePicker — step and today buttons"
        hint="step is off by default; the buttons and the field are one joined control, labelled from datePicker.* in the provider"
      >
        <Stage>
          <DatePicker
            value={stepped}
            onChange={setStepped}
            locale={LOCALE}
            label="Entry date"
            min={stepMin}
            max={stepMax}
            step
            stepLabels={{ prev: "Previous day", next: "Next day" }}
            today={todayIso()}
            todayLabel="Today"
          />
        </Stage>
        <StateLine>
          value={iso(stepped)} · min={stepMin} · max={stepMax}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Walk the arrows to either edge and they go flat rather than disappearing — a control that
          comes and goes with the value reflows whatever sits beside it, which is the complaint the
          behaviour exists to answer. The today button starts flat because the value already is
          today. Note what <code className="font-mono">today</code> is: the day is passed IN, so
          this field can be tested at a fixed date and so the host keeps a single definition of
          &quot;today&quot; across its pages.
        </p>
      </Example>

      <Example
        label="DatePicker — trigger rendering"
        hint="formatOptions is one Intl call; formatValue is the host's own function and wins over it"
      >
        <Stage>
          <div className="w-64">
            <DatePicker
              value={formatted}
              onChange={setFormatted}
              locale={LOCALE}
              label="formatOptions"
              formatOptions={{ dateStyle: "full" }}
            />
          </div>
          <div className="w-64">
            <DatePicker
              value={hostRendered}
              onChange={setHostRendered}
              locale={LOCALE}
              label="formatValue"
              // Two locales in one string is the case `formatOptions` cannot express:
              // the weekday named in the UI language beside digits ordered by a
              // separate format preference. `locale` still drives the calendar.
              formatValue={(value) => {
                const d = parseIsoDate(value);
                return d
                  ? `${d.toLocaleDateString("de-DE", { weekday: "short" })} ${value}`
                  : value;
              }}
            />
          </div>
        </Stage>
        <StateLine>
          formatOptions={iso(formatted)} · formatValue={iso(hostRendered)}
        </StateLine>
      </Example>

      <Example
        label="DatePicker — invalid and disabled"
        hint="invalid is derived from the value here, so the ring arrives and leaves as you use it"
      >
        <Stage>
          <div className="w-56">
            <DatePicker
              value={required}
              onChange={setRequired}
              locale={LOCALE}
              label="Required"
              placeholder="Required"
              invalid={required === ""}
              clearable
              clearLabel="Clear"
            />
          </div>
          <div className="w-56">
            <DatePicker
              value={frozen}
              onChange={() => {}}
              locale={LOCALE}
              label="Disabled"
              disabled
              clearable
              clearLabel="Clear"
            />
          </div>
        </Stage>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          <code className="font-mono">invalid</code> paints and sets{" "}
          <code className="font-mono">aria-invalid</code>; it carries no message, so the error text
          is yours to render. <code className="font-mono">disabled</code> also suppresses the clear
          button, which is why the frozen field shows the calendar glyph despite being{" "}
          <code className="font-mono">clearable</code>.
        </p>
      </Example>

      <Example
        label="DateRangePicker"
        hint="the trigger shows «from – …» while the range is half-open; it closes only once both ends are set"
      >
        <Stage>
          <DateRangePicker
            from={from}
            to={to}
            locale={LOCALE}
            placeholder="All dates"
            clearable
            clearLabel="Clear range"
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </Stage>
        <StateLine>
          from={iso(from)} to={iso(to)}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          One <code className="font-mono">onChange(from, to)</code> for both ends rather than two
          callbacks — a half-applied range is not a state a filter should ever be in. The separator
          is a prop (<code className="font-mono">separator</code>, default{" "}
          <code className="font-mono">&quot; – &quot;</code>) because an en dash between two dates
          is a typographic choice the host may not share.
        </p>
      </Example>

      <Example
        label="DateRangePicker — with presets"
        hint="presets widens the panel to 440px so the named column sits beside the calendar"
      >
        <Stage>
          <DateRangePicker
            from={presetFrom}
            to={presetTo}
            locale={LOCALE}
            label="Period"
            presets={presets}
            formatOptions={{ dateStyle: "medium" }}
            onChange={(f, t) => {
              setPresetFrom(f);
              setPresetTo(t);
            }}
          />
        </Stage>
        <StateLine>
          from={iso(presetFrom)} to={iso(presetTo)}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The presets here are <code className="font-mono">dateRangePresets()</code> from the{" "}
          <code className="font-mono">@eifi1/ui-kit/dates</code> subpath, relabelled through this
          page&apos;s own map. A preset is selected-looking only when both ends match exactly, so
          the field opens on &quot;Last month&quot; already highlighted — and stops being
          highlighted the moment you touch the calendar.
        </p>
      </Example>

      <Example
        label="DateRangePicker — bounded, invalid, disabled"
        hint="min/max close the calendar's days outside the window; invalid and disabled as on DatePicker"
      >
        <Stage>
          <DateRangePicker
            from={boundFrom}
            to={boundTo}
            locale={LOCALE}
            label="Within ±10 days"
            placeholder="Required"
            min={nearMin}
            max={nearMax}
            invalid={boundFrom === "" || boundTo === ""}
            clearable
            clearLabel="Clear range"
            onChange={(f, t) => {
              setBoundFrom(f);
              setBoundTo(t);
            }}
          />
          <DateRangePicker
            from={startOfMonthIso(-1)}
            to={endOfMonthIso(-1)}
            locale={LOCALE}
            label="Closed period"
            disabled
            onChange={() => {}}
          />
        </Stage>
        <StateLine>
          from={iso(boundFrom)} to={iso(boundTo)} · min={nearMin} · max={nearMax}
        </StateLine>
      </Example>

      <Example
        label="DatePicker & DateRangePicker — German trigger and calendar"
        hint="locale, calendarLabels for the calendar's own strings, separator and formatValue for the trigger"
      >
        <Stage>
          <DatePicker
            value={deDay}
            onChange={setDeDay}
            locale="de-DE"
            label="Buchungstag"
            formatOptions={{ weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }}
            calendarLabels={DE_CALENDAR}
            clearable
            clearLabel="Datum löschen"
          />
          <DateRangePicker
            from={deFrom}
            to={deTo}
            locale="de-DE"
            label="Zeitraum"
            placeholder="Alle Tage"
            separator=" bis "
            // The host's own rendering of each end: "3. Sept." rather than Intl's default.
            formatValue={(value) => {
              const d = parseIsoDate(value);
              return d ? d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : value;
            }}
            calendarLabels={DE_CALENDAR}
            onChange={(f, t) => {
              setDeFrom(f);
              setDeTo(t);
            }}
          />
        </Stage>
        <StateLine>
          value={iso(deDay)} · from={iso(deFrom)} to={iso(deTo)}
        </StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          <code className="font-mono">calendarLabels</code> reaches the calendar inside the popover —
          its month arrows and the spoken &quot;choose a start / end date&quot; — which the trigger
          has no other way to pass down. The provider&apos;s{" "}
          <code className="font-mono">miniCalendar.*</code> usually makes it unnecessary; the prop is
          for the one field that says it differently.
        </p>
      </Example>

      <Note>
        <strong>The palette reaches all of it.</strong> The day cells, the selected ends (
        <code className="font-mono">--brand</code>) and the band between them (
        <code className="font-mono">--brand-bg</code>) are tokens, and so is the panel the pickers
        open in — switch the palette in the top bar and the calendar re-skins with the page. The
        range is drawn as one continuous band with round ends rather than a tinted box per day, so a
        fortnight reads as a span, not as fourteen chips.
      </Note>
    </>
  );
}

/**
 * The `@eifi1/ui-kit/dates` helpers, input → output. Shown on the API group's Helpers
 * page rather than beside the pickers: they are functions an app calls, not components
 * it places, and between two picker specimens they read as part of the pickers.
 */
export function DateHelpers() {
  const presetRows: Array<[string, ReactNode]> = dateRangePresets().map((p) => [
    `"${p.key}"`,
    `${p.from} → ${p.to}`,
  ]);
  const localMidnight = parseIsoDate(todayIso());
  return (
    <>
      <Example
        label="@eifi1/ui-kit/dates — the helpers"
        hint="its own subpath, so importing a date helper does not pull the component barrel in; every result below is computed at render"
      >
        <OutTable
          rows={[
            // The whole family reads the LOCAL calendar. It used to build a local
            // Date and read it back through toISOString(), which is UTC — so east of
            // Greenwich every one of these answered with YESTERDAY between local
            // midnight and the UTC rollover, and a transaction entered at 01:00 CEST
            // read as one still to come.
            ["todayIso()", todayIso()],
            ["toLocalIso(new Date())", toLocalIso(new Date())],
            ["monthKey(new Date())", monthKey(new Date())],
            ["pad(7)", pad(7)],
            ["shiftIso(-1)", shiftIso(-1)],
            ["shiftIso(30)", shiftIso(30)],
            ["startOfWeekIso()", startOfWeekIso()],
            ["startOfMonthIso(0)", startOfMonthIso(0)],
            ["startOfMonthIso(-1)", startOfMonthIso(-1)],
            ["endOfMonthIso(-1)", endOfMonthIso(-1)],
            ["startOfYearIso(0)", startOfYearIso(0)],
            ["endOfYearIso(-1)", endOfYearIso(-1)],
            // Formatting is the one place a locale is required rather than implied.
            ['formatIsoDate(todayIso(), "en-GB")', formatIsoDate(todayIso(), LOCALE)],
            [
              'formatIsoDate(todayIso(), "de-DE", { dateStyle: "long" })',
              formatIsoDate(todayIso(), "de-DE", { dateStyle: "long" }),
            ],
            // Blank, not a thrown error and not "Invalid Date": the trigger of a
            // picker holding a corrupt value shows its placeholder instead of shouting.
            ['formatIsoDate("2026-02-30", "en-GB")', iso(formatIsoDate("2026-02-30", LOCALE))],
            // Leap day, reached by string arithmetic rather than by a Date the caller
            // has to own.
            ['addDaysIso("2024-02-28", 1)', addDaysIso("2024-02-28", 1)],
            // Unparseable in, unchanged out — addDaysIso never invents a date.
            ['addDaysIso("nope", 1)', iso(addDaysIso("nope", 1))],
            // `new Date(2026, 1, 30)` ROLLS OVER to 2 March rather than refusing, so
            // the parser round-trips the components back off the Date it built. A
            // day that never happened cannot answer with the numbers it was given.
            ['parseIsoDate("2026-02-30")', String(parseIsoDate("2026-02-30"))],
            ['parseIsoDate("2026-13-45")', String(parseIsoDate("2026-13-45"))],
            ["parseIsoDate(todayIso())?.getDate()", String(parseIsoDate(todayIso())?.getDate())],
            [
              "sameYmd(parseIsoDate(todayIso()), new Date())",
              localMidnight ? String(sameYmd(localMidnight, new Date())) : "null",
            ],
            ["dateRangePresets().length", String(dateRangePresets().length)],
          ]}
        />
      </Example>

      <Example
        label="dateRangePresets()"
        hint="the eleven named ranges behind the data-table date filter — key only, because the label is the consumer's"
      >
        <OutTable rows={presetRows} />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Every one of these is computed from the local calendar day, which is why they are printed
          rather than asserted here: the same call answers differently in Berlin and in Los Angeles,
          and that is the point — the server compares plain dates with no zone at all, so the
          user&apos;s local day is what it wants.
        </p>
      </Example>
    </>
  );
}
