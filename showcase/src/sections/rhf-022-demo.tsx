import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, isTimeInRange } from "@eifi1/ui-kit";
// See forms-rhf.tsx: the showcase alias maps "@eifi1/ui-kit/rhf" to src/rhf.ts.
import { Form, RhfDateRangePicker, RhfTimeInput, RhfToggleGroup } from "@eifi1/ui-kit/rhf";
import { Example, Note } from "../lib/section";

/**
 * 0.22 on the Forms page (kastlan 4): the three controls kastlan's forms still wired
 * by hand through RhfField's render — a meeting time, a period stored as two fields,
 * and a segmented choice — bound in one line each.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)] whitespace-pre-wrap [overflow-wrap:anywhere]";
const code = (s: string) => <code className="font-mono">{s}</code>;

type Meeting = {
  meetingTime: string;
  periodFrom: string;
  periodTo: string;
  interval: "monthly" | "quarterly" | "yearly" | "";
  /** `null` = no filter: the clearable group's empty value. */
  audience: "owners" | "tenants" | null;
};

const PRESETS = [
  { id: "h1", label: "First half 2026", from: "2026-01-01", to: "2026-06-30" },
  { id: "h2", label: "Second half 2026", from: "2026-07-01", to: "2026-12-31" },
];

const INTERVALS: { value: Exclude<Meeting["interval"], "">; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function Rhf022Demo() {
  const form = useForm<Meeting>({
    defaultValues: { meetingTime: "", periodFrom: "", periodTo: "", interval: "", audience: null },
  });
  const [submitted, setSubmitted] = useState("—");
  return (
    <Example
      label="RhfTimeInput, RhfDateRangePicker, RhfToggleGroup"
      hint="save empty to see each error; pick an end before the start to see the end's own error"
    >
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => setSubmitted(JSON.stringify(v)))}
          className="grid gap-4 md:grid-cols-2"
        >
          <RhfTimeInput<Meeting>
            name="meetingTime"
            label="Meeting time"
            hint="Between 08:00 and 20:00"
            min="08:00"
            max="20:00"
            required
            rules={{
              required: "Enter a time",
              validate: (v) => typeof v !== "string" || isTimeInRange(v, "08:00", "20:00") || "Between 08:00 and 20:00",
            }}
          />
          <RhfDateRangePicker<Meeting>
            fromName="periodFrom"
            toName="periodTo"
            label="Billing period"
            required
            clearable
            presets={PRESETS}
            fromRules={{ required: "Choose a start" }}
            toRules={{
              required: "Choose an end",
              validate: (to, values) => !to || !values.periodFrom || to >= values.periodFrom || "End before start",
            }}
          />
          <RhfToggleGroup<Meeting>
            name="interval"
            label="Statement interval"
            required
            options={INTERVALS}
            rules={{ required: "Choose an interval" }}
          />
          <RhfToggleGroup<Meeting>
            name="audience"
            label="Invite"
            hint="Press the chosen one again for everyone"
            allowEmpty
            caption={(v) => (v === null ? "Everyone on the estate" : v === "owners" ? "Owners only" : "Tenants only")}
            options={[
              { value: "owners", label: "Owners" },
              { value: "tenants", label: "Tenants" },
            ]}
          />
          <div className="md:col-span-2">
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </Form>
      <p className={READOUT}>submitted: {submitted}</p>
      <Note>
        {code("RhfDateRangePicker")} binds TWO fields, {code("fromName")} and {code("toName")}: one pick writes both, a
        clear empties both, and an error on either paints the trigger and is listed under it — the end&apos;s own
        &quot;End before start&quot; included, which a shell bound to the start alone never shows.{" "}
        {code("RhfToggleGroup")} is required unless {code("allowEmpty")}, which stores {code("emptyValue")} — {code("null")}
        by default — on a second press. {code("RhfTimeInput")}&apos;s {code("min")}/{code("max")} paint; the{" "}
        {code("validate")} with {code("isTimeInRange")} is what fails the form.
      </Note>
    </Example>
  );
}
