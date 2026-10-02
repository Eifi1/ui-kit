import { useState } from "react";
import { Bell } from "lucide-react";
import { FieldHint, Input, Select, Textarea } from "../../../src/components/ui";
import { TimeInput } from "../../../src/components/time-input";
import { Combobox, InlineEntityCombobox } from "../../../src/components/combobox";
import { EntityCombobox } from "../../../src/components/entity-combobox";
import { Autocomplete } from "../../../src/components/autocomplete";
import { MultiSelect } from "../../../src/components/multi-select";
import { Checkbox } from "../../../src/components/checkbox";
import { CheckboxGroup } from "../../../src/components/checkbox-group";
import { Switch } from "../../../src/components/switch";
import { List, ListItem } from "../../../src/components/list";
import { WriteLockProvider } from "../../../src/components/write-lock";
import { Example, Note } from "../lib/section";

/**
 * 0.22.0 field anatomy, one export per page it belongs on:
 *  - `Fields022Demo` (fields): a labelled field keeps its placeholder (kastlan 8),
 *    `hint` on Input / Textarea / TimeInput (keksdose K4), `showCount` (K11);
 *  - `PickerHints022Demo` (comboboxes): `hint` on the combobox family (K4);
 *  - `CheckboxGroup022Demo` (choices): Kurvenschmiede's reviewer grants as a kit group;
 *  - `CommitControls022Demo` (forms, beside WriteLock018Demo): `commit` /
 *    `disabledReason` on the controls that save themselves (K3).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

export function Fields022Demo() {
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("Maintenance on Saturday");
  const [start, setStart] = useState("08:30");
  return (
    <Example
      label="Placeholder, hint and counter on a labelled field"
      hint="kastlan 8, keksdose K4 and K11"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Access note" placeholder="e.g. the key is with the caretaker" />
        <Input label="IBAN" hint="22 characters, spaces allowed" />
        <Input label="Interest rate" hint={<FieldHint label="Per year, before tax" />} />
        <TimeInput label="Start" value={start} onValueChange={setStart} hint="Local time at the site" />
        <Input
          label="Subject"
          maxLength={60}
          showCount
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Input aria-label="Reference" placeholder="Reference" hint={<FieldHint label="From the letter, top right" />} />
        <div className="sm:col-span-2">
          <Textarea
            label="Note for the tenant"
            placeholder="Anything they should know before the visit"
            hint="Shown in the tenant's inbox"
            maxLength={120}
            showCount
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <Note>
        A labelled field keeps a caller&apos;s {code("placeholder")} and shows it once the label has floated up (focus
        the first field). {code("hint")} follows Select&apos;s rule: text is a caption under the field, on its{" "}
        {code("aria-describedby")} before any error; a {code("FieldHint")} rides the label line, or the end edge when
        there is no label. {code("showCount")} with {code("maxLength")} reads as &quot;12 of 60 characters&quot; with the
        field and is announced only on entering the last tenth and at the limit — type into Subject to see the colours
        turn.
      </Note>
    </Example>
  );
}

const ACCOUNTS = [
  { value: "chk", label: "Checking" },
  { value: "sav", label: "Savings" },
  { value: "cc", label: "Credit card" },
];

export function PickerHints022Demo() {
  const [payee, setPayee] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [inline, setInline] = useState<string | null>("chk");
  const [address, setAddress] = useState("");
  const [filter, setFilter] = useState<(string | number)[]>([]);
  return (
    <Example label="hint on the combobox family" hint="keksdose K4 — the same anatomy as Input and Select">
      <div className="grid gap-4 sm:grid-cols-2">
        <Combobox
          label="Payee"
          value={payee}
          onChange={setPayee}
          options={["REWE", "Migros", "Coop"]}
          hint="As printed on the receipt"
        />
        <EntityCombobox<string>
          label="Account"
          value={account}
          onChange={setAccount}
          options={ACCOUNTS}
          hint={<FieldHint label="Closed accounts are hidden" />}
        />
        <InlineEntityCombobox<string>
          label="From account"
          value={inline}
          onChange={setInline}
          options={ACCOUNTS}
          hint="The money leaves from here"
        />
        <Autocomplete label="Address" value={address} onChange={setAddress} hint="Street and number" />
        <MultiSelect
          label="Accounts"
          values={filter}
          onChange={setFilter}
          options={ACCOUNTS}
          hint="Leave empty for all"
        />
        <MultiSelect
          aria-label="Accounts (no label)"
          values={filter}
          onChange={setFilter}
          options={ACCOUNTS}
          hint={<FieldHint label="Leave empty for all" />}
        />
      </div>
    </Example>
  );
}

const LANGUAGES = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
  { value: "es", label: "Español" },
  { value: "hu", label: "Magyar" },
  { value: "zh", label: "中文", hint: "Legal pages only" },
];

export function CheckboxGroup022Demo() {
  const [locales, setLocales] = useState<string[]>(["de", "fr"]);
  const [layout, setLayout] = useState<string[]>([]);
  return (
    <Example label="CheckboxGroup — a reviewer's languages" hint="Kurvenschmiede's reviewer dialog, for every app">
      <div className="flex flex-col gap-6">
        <CheckboxGroup
          legend="Languages this reviewer may approve"
          options={LANGUAGES}
          value={locales}
          onChange={setLocales}
          columns={2}
          hint="Ticking none takes the reviewer role back."
        />
        <CheckboxGroup
          legend="Show on the card"
          layout="horizontal"
          options={[
            { value: "balance", label: "Balance" },
            { value: "limit", label: "Limit" },
            { value: "iban", label: "IBAN" },
          ]}
          value={layout}
          onChange={setLayout}
          required
          error={layout.length === 0 ? "Pick at least one" : undefined}
        />
      </div>
      <Note>
        A {code("<fieldset>")} named by its {code("legend")} ({code('legendVisibility="sr-only"')} keeps the name
        without the ink), one kit {code("Checkbox")} per option. The value comes back in the options&apos; order, and a
        value no option carries is kept. {code("required")} puts the star on the legend and the native{" "}
        {code("required")} on every box while none is ticked.
      </Note>
    </Example>
  );
}

export function CommitControls022Demo() {
  const [locked, setLocked] = useState(true);
  const [digest, setDigest] = useState(true);
  const [reviewer, setReviewer] = useState(false);
  const [role, setRole] = useState("member");
  const [read, setRead] = useState(0);
  return (
    <Example
      label="commit on the controls that save themselves"
      hint="keksdose K3 — Switch, Checkbox, Select and a ListItem click, Button's pattern"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Viewing a budget shared to read" />
        <WriteLockProvider locked={locked} reason="Shared with you to read — saving is off.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Switch commit checked={digest} onCheckedChange={setDigest} label="Email me the weekly summary" />
              <Checkbox commit checked={reviewer} onCheckedChange={setReviewer} label="May review translations" />
              <Select commit label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <List separator="divider">
              <ListItem
                commit
                icon={Bell}
                title="Mark all as read"
                subtitle={`Marked ${read} time${read === 1 ? "" : "s"}`}
                onClick={() => setRead((n) => n + 1)}
              />
            </List>
          </div>
        </WriteLockProvider>
      </div>
      <Note>
        Under a lock each control is {code("aria-disabled")} but stays focusable, says why in the kit tooltip and its
        description, and fires no change. Without a provider (or unlocked) {code("commit")} does nothing;{" "}
        {code("disabledReason")} does the same for a reason of the control&apos;s own.
      </Note>
    </Example>
  );
}
