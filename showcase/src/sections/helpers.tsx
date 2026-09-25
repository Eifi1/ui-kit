import type { ReactNode } from "react";
import {
  CURRENCIES,
  currencyName,
  fromLogPosition,
  isTimeInRange,
  matchesAccept,
  normalizeTime,
  passwordByteLength,
  passwordRules,
  stepNumber,
  toLogPosition,
} from "@eifi1/ui-kit";
// The two subpath entries, imported from their source files: the showcase's alias
// (showcase/alias.ts + tsconfig `paths`) maps only "@eifi1/ui-kit" and "/dates", and
// a bare "@eifi1/ui-kit/rhf" would resolve INTO the barrel file. A consumer writes
// `from "@eifi1/ui-kit/rhf"` and `from "@eifi1/ui-kit/table-text"`.
import { DateHelpers } from "./dates";
import { NumberHelpers } from "./numbers";
import { FieldClassConstants } from "./fields";
import { Example, OutTable } from "../lib/section";

/**
 * The helpers page: everything on the Inputs pages that was a function or a constant
 * rather than a component. They sat between specimens there — the date arithmetic
 * between the range picker and the month picker, the calculator's grammar under the
 * number pad — where they read as part of the component above them. Grouped here by
 * the input family they serve, each still rendered from the real export at render.
 *
 * Two entries that used to close this page have moved to the component they serve:
 * the react-hook-form adapter is its own page, "Forms (react-hook-form)", beside the
 * text fields (forms-rhf.tsx), and the table-text parser sits under MeasuredGrid on
 * "Table entry" (table-text-demo.tsx).
 */
export function Helpers() {
  return (
    <>
      <Group title="Dates" hint="@eifi1/ui-kit/dates">
        <DateHelpers />
      </Group>
      <Group title="Numbers & money" hint="lib/calc and the currency table">
        <NumberHelpers />
        <MoreNumberHelpers />
      </Group>
      <Group title="Other inputs" hint="the pure functions behind the time, slider, password and file inputs">
        <OtherInputHelpers />
      </Group>
      <Group title="Fields" hint="the class constants a custom field is composed from">
        <FieldClassConstants />
      </Group>
    </>
  );
}

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="space-y-6 border-t border-[var(--border)] pt-8 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

const q = (v: unknown) => JSON.stringify(v);

/* ── numbers ──────────────────────────────────────────────────────────────── */

function MoreNumberHelpers() {
  const eur = CURRENCIES.find((c) => c.code === "EUR") ?? CURRENCIES[0];
  return (
    <Example label="stepNumber · currencyName" hint="the arrow-key step of NumberInput, and a currency's display name">
      <OutTable
        rows={[
          ["stepNumber(1.2, 1, 0.5)", q(stepNumber(1.2, 1, 0.5))],
          ["stepNumber(null, 1, 1)", q(stepNumber(null, 1, 1))],
          ["stepNumber(9.5, 3, 1, 0, 10)", q(stepNumber(9.5, 3, 1, 0, 10))],
          ["stepNumber(0.1, 2, 0.1)", q(stepNumber(0.1, 2, 0.1))],
          [`currencyName(${eur.code})`, currencyName(eur)],
          [`currencyName(${eur.code}, undefined, "de-DE")`, currencyName(eur, undefined, "de-DE")],
          [`currencyName(${eur.code}, { EUR: "Euro (€)" })`, currencyName(eur, { EUR: "Euro (€)" })],
        ]}
      />
    </Example>
  );
}

/* ── other inputs ─────────────────────────────────────────────────────────── */

function OtherInputHelpers() {
  const png = new File(["x"], "scan.PNG", { type: "image/png" });
  const pdf = new File(["x"], "invoice.pdf", { type: "application/pdf" });
  return (
    <>
      <Example label="normalizeTime · isTimeInRange" hint="TimeInput's value handling">
        <OutTable
          rows={[
            ['normalizeTime("09:30:15", false)', normalizeTime("09:30:15", false)],
            ['normalizeTime("09:30", true)', normalizeTime("09:30", true)],
            ['normalizeTime("9.30", true)', normalizeTime("9.30", true)],
            ['isTimeInRange("12:00", "08:00", "17:00")', q(isTimeInRange("12:00", "08:00", "17:00"))],
            ['isTimeInRange("23:30", "22:00", "06:00")', q(isTimeInRange("23:30", "22:00", "06:00"))],
            ['isTimeInRange("12:00", "22:00", "06:00")', q(isTimeInRange("12:00", "22:00", "06:00"))],
            ['isTimeInRange("", "08:00")', q(isTimeInRange("", "08:00"))],
          ]}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          A range whose <code className="font-mono">min</code> is after its{" "}
          <code className="font-mono">max</code> wraps midnight — a night shift.
        </p>
      </Example>

      <Example label="toLogPosition · fromLogPosition" hint="Slider's scale=&quot;log&quot;, with the zero stop">
        <OutTable
          rows={[
            ["toLogPosition(0, 1, 1000)", toLogPosition(0, 1, 1000).toFixed(3)],
            ["toLogPosition(1, 1, 1000)", toLogPosition(1, 1, 1000).toFixed(3)],
            ["toLogPosition(10, 1, 1000)", toLogPosition(10, 1, 1000).toFixed(3)],
            ["toLogPosition(1000, 1, 1000)", toLogPosition(1000, 1, 1000).toFixed(3)],
            ["toLogPosition(10, 1, 1000, false)", toLogPosition(10, 1, 1000, false).toFixed(3)],
            ["fromLogPosition(0.02, 1, 1000)", fromLogPosition(0.02, 1, 1000).toFixed(3)],
            ["fromLogPosition(0.5, 1, 1000)", fromLogPosition(0.5, 1, 1000).toFixed(3)],
            ["fromLogPosition(0.5, 1, 1000, false)", fromLogPosition(0.5, 1, 1000, false).toFixed(3)],
          ]}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          A log scale cannot reach 0, so the first stretch of the track is reserved for it
          (<code className="font-mono">zeroStop</code>, default on).
        </p>
      </Example>

      <Example label="passwordRules · passwordByteLength" hint="what PasswordStrengthMeter checks">
        <OutTable
          rows={[
            ['passwordRules("hunter2")', q(passwordRules("hunter2").map((r) => `${r.id}:${r.met}`))],
            ['passwordRules("Correct-Horse-9")', q(passwordRules("Correct-Horse-9").map((r) => `${r.id}:${r.met}`))],
            ['passwordRules("abc", { minLength: 3 })[0]', q(passwordRules("abc", { minLength: 3 })[0])],
            ['passwordByteLength("password")', q(passwordByteLength("password"))],
            ['passwordByteLength("pässwörd")', q(passwordByteLength("pässwörd"))],
            ['passwordByteLength("🔐🔐")', q(passwordByteLength("🔐🔐"))],
          ]}
        />
        <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Bytes, not characters: bcrypt reads only the first 72 bytes, and an umlaut or an
          emoji is more than one.
        </p>
      </Example>

      <Example label="matchesAccept(file, accept)" hint="FileButton's check, the same grammar as the input's accept attribute">
        <OutTable
          rows={[
            ['matchesAccept(scan.PNG, "image/*")', q(matchesAccept(png, "image/*"))],
            ['matchesAccept(scan.PNG, ".png,.jpg")', q(matchesAccept(png, ".png,.jpg"))],
            ['matchesAccept(invoice.pdf, "image/*")', q(matchesAccept(pdf, "image/*"))],
            ['matchesAccept(invoice.pdf, "application/pdf")', q(matchesAccept(pdf, "application/pdf"))],
            ["matchesAccept(invoice.pdf, undefined)", q(matchesAccept(pdf, undefined))],
          ]}
        />
      </Example>
    </>
  );
}
