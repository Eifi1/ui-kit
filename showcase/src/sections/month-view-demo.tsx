import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton, MiniCalendar } from "@eifi1/ui-kit";
import type { MiniCalendarDayState } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * CALENDAR MONTH VIEW — `MiniCalendar size="lg"`, the month grid a planner page draws,
 * with `renderDay` content in each cell, and `month` / `onMonthChange` /
 * `hideNavigation` for a page whose own header drives it. `renderDay` at the default
 * `sm` size is the other half: a dot under a picker's day.
 *
 * The events are a FIXED pattern keyed by the day of the month, so every month has some
 * and the page reads the same whatever today is. The calendars open on September 2026
 * through a `month` or a selection, never on "today".
 */

interface CalendarEvent {
  id: string;
  title: string;
  time?: string;
  tone: "brand" | "warning" | "success";
}

const PATTERN: Record<number, Omit<CalendarEvent, "id">[]> = {
  1: [{ title: "Rent due", tone: "warning" }],
  3: [{ title: "Yoga", time: "18:00", tone: "success" }],
  9: [{ title: "Dentist", time: "08:30", tone: "brand" }],
  14: [
    { title: "Plumber", time: "09:00", tone: "brand" },
    { title: "Team lunch", time: "12:30", tone: "success" },
    { title: "Pay the car insurance", tone: "warning" },
  ],
  17: [{ title: "Yoga", time: "18:00", tone: "success" }],
  22: [{ title: "Car service", time: "10:00", tone: "brand" }],
  28: [
    { title: "Book club", time: "19:30", tone: "success" },
    { title: "Parents' evening", time: "18:00", tone: "brand" },
  ],
};

function eventsOn(iso: string): CalendarEvent[] {
  const day = Number(iso.slice(8, 10));
  return (PATTERN[day] ?? []).map((e, i) => ({ ...e, id: `${iso}-${i}` }));
}

const TONE_TEXT: Record<CalendarEvent["tone"], string> = {
  brand: "text-[var(--brand)]",
  warning: "text-[var(--warning)]",
  success: "text-[var(--success)]",
};
const TONE_DOT: Record<CalendarEvent["tone"], string> = {
  brand: "bg-[var(--brand)]",
  warning: "bg-[var(--warning)]",
  success: "bg-[var(--success)]",
};

/** The lg cell's content: up to two event lines and a "+N more". Plain text — it
 *  renders INSIDE the day's button. */
function EventLines({ iso, state }: { iso: string; state: MiniCalendarDayState }) {
  const events = eventsOn(iso);
  if (!events.length) return null;
  const shown = events.slice(0, 2);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {shown.map((e) => (
        <span
          key={e.id}
          className={`block truncate text-[11px] leading-tight ${state.selected ? "" : TONE_TEXT[e.tone]}`}
        >
          {e.title}
        </span>
      ))}
      {events.length > 2 && (
        <span className="block text-[10px] leading-tight text-[var(--text-muted)]">+{events.length - 2} more</span>
      )}
    </span>
  );
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

function MonthViewWithDayPanel() {
  const [day, setDay] = useState("2026-09-14");
  const [opened, setOpened] = useState<string | null>(null);
  const events = eventsOn(day);
  return (
    <Example
      label='MiniCalendar size="lg" — renderDay and a day panel'
      hint="events drawn as text in the cells; the DAY is the button, and its panel holds the clickable events"
    >
      <div className="grid gap-4">
        <MiniCalendar
          size="lg"
          mode="single"
          from={day}
          to={day}
          locale="en-GB"
          onSelect={(from) => {
            setDay(from);
            setOpened(null);
          }}
          renderDay={(_day, state) => <EventLines iso={state.iso} state={state} />}
        />
        <section
          aria-label={`Events on ${longDate(day)}`}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface-2)] p-3"
        >
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{longDate(day)}</h4>
          {events.length ? (
            <ul className="mt-2 space-y-1">
              {events.map((e) => (
                <li key={e.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setOpened(e.title)}
                  >
                    <span aria-hidden className={`size-2 shrink-0 rounded-full ${TONE_DOT[e.tone]}`} />
                    {e.time && <span className="tabular-nums text-[var(--text-muted)]">{e.time}</span>}
                    {e.title}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Nothing planned.</p>
          )}
        </section>
      </div>
      <OutTable
        rows={[
          ["onSelect (mode=\"single\")", day],
          ["event opened from the panel", opened ?? "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">size=&quot;lg&quot;</code> is the same grid as the picker — roles, roving tab
          stop, arrow keys, PageUp/PageDown, RTL — drawn as a ruled month with tall cells.{" "}
          <code className="font-mono">renderDay</code> returns up to two event lines and a &ldquo;+1 more&rdquo; (the
          14th and the 28th). That content sits INSIDE the day&apos;s button, so it is plain text: a link in there would
          be a control inside a control. It is attached as the day&apos;s description, so a reader hears
          &ldquo;Monday, 14 September 2026&rdquo; and then the events. The clickable versions, with their times, live in the
          panel below, which <code className="font-mono">onSelect</code> fills.
        </Note>
      </div>
    </Example>
  );
}

const monthTitle = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const shiftMonth = (key: string, by: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

function OwnHeader() {
  const [month, setMonth] = useState("2026-09");
  const [log, setLog] = useState<string[]>([]);
  const [hide, setHide] = useState(true);
  const [day, setDay] = useState("");
  return (
    <Example
      label="MiniCalendar — month, onMonthChange and hideNavigation"
      hint="the page's own header drives the grid; the grid reports every move back"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <IconButton label="Show the previous month" size="sm" variant="secondary" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft className="rtl:-scale-x-100" />
        </IconButton>
        <h4 className="min-w-36 text-center text-base font-semibold text-[var(--text-primary)]">{monthTitle(month)}</h4>
        <IconButton label="Show the next month" size="sm" variant="secondary" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight className="rtl:-scale-x-100" />
        </IconButton>
        <select
          aria-label="Jump to month"
          value={MONTHS.includes(month) ? month : ""}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-sm text-[var(--text-primary)]"
        >
          {!MONTHS.includes(month) && <option value="">—</option>}
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {monthTitle(m)}
            </option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={() => setMonth("2026-09")}>
          Back to September
        </Button>
        <label className="ms-auto flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          <code className="font-mono">hideNavigation</code>
        </label>
      </div>
      <MiniCalendar
        size="lg"
        mode="single"
        from={day}
        to={day}
        locale="en-GB"
        month={month}
        onMonthChange={(m) => {
          setMonth(m);
          setLog((l) => [m, ...l].slice(0, 5));
        }}
        hideNavigation={hide}
        onSelect={(from) => setDay(from)}
        renderDay={(_day, state) => <EventLines iso={state.iso} state={state} />}
      />
      <OutTable
        rows={[
          ["month (the page's state)", month],
          ["onMonthChange, latest first", log.length ? log.join(" · ") : "— arrow off the edge of the month, or PageDown"],
          ["selected", day || "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">month</code> is FOLLOWED, not controlled: when the header changes it the grid
          moves there, and in between the user pages freely. Put focus in the grid and press PageDown, or arrow past
          the last row: the grid moves and <code className="font-mono">onMonthChange</code> reports it, which is how
          the header&apos;s title and the select stay in step. <code className="font-mono">hideNavigation</code> drops
          the built-in arrows and caption because the page draws its own — untick it to see both. The caption stays in
          the tree, visually hidden, because it names the grid.
        </Note>
      </div>
    </Example>
  );
}

function SmallDots() {
  const [range, setRange] = useState<[string, string]>(["2026-09-09", "2026-09-17"]);
  return (
    <Example label="MiniCalendar — renderDay at sm" hint="a dot under a picker's day: what is on that day, at a glance">
      <Row className="items-start">
        <MiniCalendar
          from={range[0]}
          to={range[1]}
          locale="en-GB"
          onSelect={(from, to) => setRange([from, to])}
          renderDay={(_day, state) => {
            const events = eventsOn(state.iso);
            if (!events.length) return null;
            return (
              <span className="flex justify-center gap-0.5">
                {events.slice(0, 3).map((e) => (
                  <span key={e.id} aria-hidden className={`size-1 rounded-full ${TONE_DOT[e.tone]}`} />
                ))}
                <span className="sr-only">
                  {events.length} {events.length === 1 ? "event" : "events"}
                </span>
              </span>
            );
          }}
        />
        <OutTable
          rows={[
            ["from", range[0] || "—"],
            ["to", range[1] || "—"],
          ]}
        />
      </Row>
      <div className="mt-3">
        <Note>
          At the default <code className="font-mono">size=&quot;sm&quot;</code> the content is drawn under the number
          — one dot per event here, up to three, in the event&apos;s tone. The dots are{" "}
          <code className="font-mono">aria-hidden</code> and an <code className="font-mono">sr-only</code> &ldquo;3
          events&rdquo; says what they mean, since a colour is not something a screen reader can read. The range
          selection works as before.
        </Note>
      </div>
    </Example>
  );
}

export function MonthViewDemo() {
  return (
    <>
      <MonthViewWithDayPanel />
      <OwnHeader />
      <SmallDots />
    </>
  );
}
