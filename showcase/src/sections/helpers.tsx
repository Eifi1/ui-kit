import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  CURRENCIES,
  Input,
  NumberField,
  Select,
  Textarea,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@eifi1/ui-kit/rhf";
import { cellNumber, isCellNumber, parseRows, parseTable, splitRow } from "@eifi1/ui-kit/table-text";
import { DateHelpers } from "./dates";
import { NumberHelpers } from "./numbers";
import { FieldClassConstants } from "./fields";
import { Example, Note, OutTable } from "../lib/section";

/**
 * The helpers page: everything on the Inputs pages that was a function or a constant
 * rather than a component. They sat between specimens there — the date arithmetic
 * between the range picker and the month picker, the calculator's grammar under the
 * number pad — where they read as part of the component above them. Grouped here by
 * the input family they serve, each still rendered from the real export at render.
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
      <Group title="Table text" hint="@eifi1/ui-kit/table-text — reading a pasted table or a CSV">
        <TableTextHelpers />
      </Group>
      <Group title="Other inputs" hint="the pure functions behind the time, slider, password and file inputs">
        <OtherInputHelpers />
      </Group>
      <Group title="Fields" hint="the class constants a custom field is composed from">
        <FieldClassConstants />
      </Group>
      <Group title="Forms" hint="@eifi1/ui-kit/rhf — the react-hook-form adapter">
        <RhfExample />
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

/* ── table text ───────────────────────────────────────────────────────────── */

const GERMAN_EXPORT = "Weg;Kraft\nmm;N\n0,5;12,25\n1,0;13,5\n1,5;14,75";
const ENGLISH_CSV = "x,y\n0.5,12.25\n1.0,13.5";
const MATLAB_DUMP = "0,5 1,25 2,75\n1,0 2,5 5,5";
const HAND_TYPED = "1, 2, 3";

function TableTextHelpers() {
  const [text, setText] = useState(GERMAN_EXPORT);
  const [rule, setRule] = useState<"whole-text" | "per-line">("whole-text");
  const parsed = parseTable(text, { decimal: rule, headerLines: 2 });
  const rows2 = parseRows(text, 2);

  return (
    <>
      <Example label="parseTable · parseRows — live" hint="paste a table from a spreadsheet into the box">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Textarea
              label="Text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              {[GERMAN_EXPORT, ENGLISH_CSV, MATLAB_DUMP].map((sample, i) => (
                <Button key={i} variant="secondary" className="text-xs" onClick={() => setText(sample)}>
                  {["German export", "English CSV", "MATLAB dump"][i]}
                </Button>
              ))}
            </div>
            <Select
              label="decimal"
              value={rule}
              onChange={(e) => setRule(e.target.value as "whole-text" | "per-line")}
            >
              <option value="whole-text">&quot;whole-text&quot; — the file door</option>
              <option value="per-line">&quot;per-line&quot; — the paste door</option>
            </Select>
          </div>
          <OutTable
            rows={[
              [`parseTable(text, { decimal: "${rule}", headerLines: 2 }).header`, q(parsed.header)],
              [".rows", q(parsed.rows)],
              [".decimalComma", q(parsed.decimalComma)],
              [".skipped", q(parsed.skipped)],
              ["parseRows(text, 2)", q(rows2)],
            ]}
          />
        </div>
      </Example>

      <Example label="splitRow · cellNumber · isCellNumber" hint="one line, and one cell">
        <OutTable
          rows={[
            [`splitRow(${q("0,5;12,25")})`, q(splitRow("0,5;12,25"))],
            [`splitRow(${q("0,5 1,25 2,75")})`, q(splitRow("0,5 1,25 2,75"))],
            [`splitRow(${q("0.5\t12.25")})`, q(splitRow("0.5\t12.25"))],
            [`splitRow(${q(HAND_TYPED)})`, q(splitRow(HAND_TYPED))],
            [`parseTable(${q("0,5;1\n1,5;2")}, { decimal: "per-line", columns: 1 }).rows`, q(parseTable("0,5;1\n1,5;2", { decimal: "per-line", columns: 1 }).rows)],
            [`parseRows(${q("a;b\n1;x")}, 2)`, q(parseRows("a;b\n1;x", 2))],
            [`cellNumber(${q("12,5")})`, q(cellNumber("12,5"))],
            [`isCellNumber(${q("12,5")})`, q(isCellNumber("12,5"))],
            [`isCellNumber(${q("")})`, q(isCellNumber(""))],
            [`isCellNumber(${q("1.234,5")})`, q(isCellNumber("1.234,5"))],
          ]}
        />
        <Note>
          A comma between digits in a cell is always a decimal mark; in a line it depends on
          what else separates the columns. <code className="font-mono">columns</code> slices a
          wider line; <code className="font-mono">parseRows</code> answers with the first line
          it could not read rather than an empty table.
        </Note>
      </Example>
    </>
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

/* ── react-hook-form ──────────────────────────────────────────────────────── */

type ExpenseForm = {
  title: string;
  amount: number | null;
  category: string;
  note: string;
  agree: boolean;
};

/** A part of your own beside the kit's: it reads the field's ids and state through
 *  `useFormField`, and prints them — the same values the kit's parts are wired with. */
function FieldReadout() {
  const { formItemId, describedBy, invalid, isDirty, error } = useFormField();
  return (
    <p className="font-mono text-[10px] text-[var(--text-muted)]">
      useFormField() → {q({ formItemId, describedBy, invalid, isDirty, error: error?.message })}
    </p>
  );
}

function RhfExample() {
  const form = useForm<ExpenseForm>({
    defaultValues: { title: "", amount: null, category: "", note: "", agree: false },
    mode: "onTouched",
  });
  const [submitted, setSubmitted] = useState<ExpenseForm | null>(null);

  return (
    <Example
      label="Form · FormField · FormItem · FormLabel · FormControl · FormDescription · FormMessage"
      hint="submit empty to see every message; the control's aria-describedby names only what is on screen"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((data) => setSubmitted(data))}
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Give the expense a title." }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel required>Title</FormLabel>
                <FormControl>
                  {/* Input paints from `invalid`, not from aria-invalid — pass it. */}
                  <Input {...field} invalid={fieldState.invalid} aria-required />
                </FormControl>
                <FormDescription>What a reader sees in the list.</FormDescription>
                <FormMessage />
                <FieldReadout />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            rules={{
              validate: (v) => (v !== null && v > 0) || "Enter an amount above zero.",
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Amount</FormLabel>
                <FormControl>
                  {/* NumberField paints from the aria-invalid FormControl sets. */}
                  <NumberField
                    value={field.value}
                    // Commits on blur or Enter, so `onCommit` is also the "touched" moment.
                    onCommit={(v) => {
                      field.onChange(v);
                      field.onBlur();
                    }}
                    unit="EUR"
                  />
                </FormControl>
                <FormMessage />
                <FieldReadout />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            rules={{ required: "Pick a category." }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel required>Category</FormLabel>
                <FormControl>
                  <Select {...field} invalid={fieldState.invalid}>
                    <option value="">—</option>
                    <option value="travel">Travel</option>
                    <option value="office">Office</option>
                  </Select>
                </FormControl>
                {/* Children show while there is no error — a standing message. */}
                <FormMessage className="text-[var(--text-muted)]">Used for the monthly report.</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="note"
            rules={{ maxLength: { value: 40, message: "Keep it under 40 characters." } }}
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} invalid={fieldState.invalid} />
                </FormControl>
                <FormDescription>{field.value.length}/40</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agree"
            rules={{ validate: (v) => v || "Confirm the receipt is attached." }}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <div className="flex items-center gap-2">
                  <FormControl>
                    {/* A native element works too: FormControl only adds id and aria. */}
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormLabel>The receipt is attached</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="brand">
              Submit
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                form.reset();
                setSubmitted(null);
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </Form>
      <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
        onSubmit: {submitted ? q(submitted) : "not called yet"}
      </p>
      <Note>
        The words come from the <code className="font-mono">rules</code> (or a schema); the kit
        ships none here. <code className="font-mono">FormMessage</code> is not{" "}
        <code className="font-mono">role=&quot;alert&quot;</code> on purpose — it is read when
        focus reaches the control. The only entry in the package that needs{" "}
        <code className="font-mono">react-hook-form</code>, an optional peer.
      </Note>
    </Example>
  );
}
