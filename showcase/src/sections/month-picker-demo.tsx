import { useState } from "react";
import { MonthPicker, ToggleGroup } from "@eifi1/ui-kit";
import { monthKey } from "@eifi1/ui-kit/dates";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * MonthPicker.
 *
 * The value is a `"YYYY-MM"` key — the same string `monthKey()` produces, and for the
 * same reasons every date in this kit is a string: it sorts, so bounds are `<` / `>`,
 * and it goes into a URL as it is. Nothing here reads a locale of its own; every
 * specimen names one.
 */

const LOCALE = "en-GB";

type Loc = "en-GB" | "de-DE" | "fr-FR";
const LOCALES: { value: Loc; label: string }[] = [
  { value: "en-GB", label: "en-GB" },
  { value: "de-DE", label: "de-DE" },
  { value: "fr-FR", label: "fr-FR" },
];

/** Shift a month key by whole months — the page's own ‹ › buttons beside a picker. */
function shiftKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y!, m! - 1 + delta, 1));
}

/** The raw value under a specimen, so what the component emits is visible. */
function StateLine({ children }: { children: string }) {
  return <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">value = {children}</p>;
}

export function MonthPickerDemo() {
  // Computed from today rather than written out, so every specimen stays operable
  // whatever month this page is opened in.
  const now = monthKey(new Date());
  const [plain, setPlain] = useState(now);
  const [bounded, setBounded] = useState(now);
  const [toolbar, setToolbar] = useState(now);
  const [empty, setEmpty] = useState("");
  const [localised, setLocalised] = useState(now);
  const [loc, setLoc] = useState<Loc>("de-DE");
  const [short, setShort] = useState(now);
  const [fiscal, setFiscal] = useState(now);
  const [rtlMonth, setRtlMonth] = useState(now);
  // Two months back: a host whose books close late.
  const openBooks = shiftKey(now, -2);

  // A floor a year and a half back, the way "the first month we have data for" is.
  const floor = shiftKey(now, -18);
  const ceiling = shiftKey(now, 6);
  const atFloor = toolbar <= floor;

  return (
    <>
      <Note>
        <strong>Keyboard:</strong> the grid is one tab stop. Arrow keys walk the months (left/right, in reading order,
        by one, up/down by a row of three) and walk straight into the neighbouring year at either
        end; Home/End go to the ends of the row; PageUp/PageDown step a whole year. Out-of-bounds
        months stay focusable and refuse the pick, so the roving tab stop never falls into a hole.
      </Note>

      <Example label="MonthPicker — labelled field" hint="floating label, like DatePicker">
        <Stage>
          <MonthPicker label="Statement month" value={plain} onChange={setPlain} locale={LOCALE} />
        </Stage>
        <StateLine>{`"${plain}"`}</StateLine>
      </Example>

      <Example
        label="MonthPicker — bounded"
        hint="min / max are inclusive month keys; a full ISO date is read as its month"
      >
        <Stage>
          <MonthPicker
            label="Budget month"
            value={bounded}
            onChange={setBounded}
            locale={LOCALE}
            min={`${floor}-15`}
            max={ceiling}
          />
        </Stage>
        <StateLine>{`"${bounded}"  (min ${floor}, max ${ceiling})`}</StateLine>
      </Example>

      <Example
        label="MonthPicker — in a toolbar, between step buttons"
        hint="triggerClassName for the compact shape; the ‹ › buttons are the page's own"
      >
        <Stage>
          <Row className="gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={atFloor}
              onClick={() => setToolbar((k) => shiftKey(k, -1))}
              className="flex size-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
            >
              <span aria-hidden className="rtl:-scale-x-100">
                ‹
              </span>
            </button>
            <MonthPicker
              value={toolbar}
              onChange={setToolbar}
              locale={LOCALE}
              min={floor}
              triggerClassName="h-9 w-auto min-w-[10rem] py-0 font-medium"
            />
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setToolbar((k) => shiftKey(k, 1))}
              className="flex size-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            >
              <span aria-hidden className="rtl:-scale-x-100">
                ›
              </span>
            </button>
          </Row>
        </Stage>
        <StateLine>{`"${toolbar}"`}</StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Step a few months with the buttons, then open the picker: it lands on the year the value
          is in now, not the one it was last opened on.
        </p>
      </Example>

      <Example
        label="MonthPicker — empty, required"
        hint='value="" shows the placeholder; invalid paints the field'
      >
        <Stage>
          <MonthPicker
            label="Period"
            placeholder="Choose a month"
            value={empty}
            onChange={setEmpty}
            locale={LOCALE}
            invalid={!empty}
          />
        </Stage>
        <StateLine>{`"${empty}"`}</StateLine>
      </Example>

      <Example
        label="MonthPicker — trigger format, pinned now, disabled"
        hint="formatOptions shapes the trigger's text; currentMonth moves the ring; disabled settles the field"
      >
        <Stage>
          <MonthPicker
            label="Short trigger"
            value={short}
            onChange={setShort}
            locale={LOCALE}
            formatOptions={{ month: "short", year: "2-digit" }}
          />
          <MonthPicker
            label="Fiscal “now”"
            value={fiscal}
            onChange={setFiscal}
            locale={LOCALE}
            // The host's own idea of "now": the month its books are open for, not the
            // wall clock's. The grid rings this month instead of the real one.
            currentMonth={openBooks}
          />
          <MonthPicker
            label="Closed period"
            value={shiftKey(now, -1)}
            onChange={() => {}}
            locale={LOCALE}
            disabled
          />
        </Stage>
        <StateLine>{`"${short}" · "${fiscal}" (currentMonth ${openBooks})`}</StateLine>
      </Example>

      <Example
        label="MonthPicker — localised"
        hint="month and year names come from Intl; the four strings Intl cannot say come from labels"
      >
        <ToggleGroup
          value={loc}
          onChange={(v) => setLoc(v as Loc)}
          options={LOCALES}
          aria-label="Locale"
        />
        <Stage className="mt-3">
          <div className="max-w-xs">
            <MonthPicker
              label={loc === "de-DE" ? "Monat" : "Month"}
              value={localised}
              onChange={setLocalised}
              locale={loc}
              labels={
                loc === "de-DE"
                  ? {
                      previousYear: "Vorheriges Jahr",
                      nextYear: "Nächstes Jahr",
                      panel: "Monat wählen",
                    }
                  : undefined
              }
            />
          </div>
        </Stage>
        <StateLine>{`"${localised}"`}</StateLine>
      </Example>

      <Example
        label="MonthPicker — right-to-left"
        hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}
      >
        <Stage>
          <div dir="rtl" className="max-w-xs">
            <MonthPicker
              label="الشهر"
              value={rtlMonth}
              onChange={setRtlMonth}
              locale="ar-EG"
              labels={{ previousYear: "السنة السابقة", nextYear: "السنة التالية", panel: "اختر الشهر" }}
            />
          </div>
        </Stage>
        <StateLine>{`"${rtlMonth}"`}</StateLine>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The panel is portalled out of this <code className="font-mono">dir</code> but reads it off
          the field when it opens and carries it: the months run from the right, the year chevrons
          are mirrored, and ← moves to the NEXT month (the one to its left). Before 0.7.0 the panel
          opened left-to-right and only the arrow keys were reversed.
        </p>
      </Example>
    </>
  );
}
