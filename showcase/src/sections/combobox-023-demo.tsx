import { useState } from "react";
import {
  Autocomplete,
  Combobox,
  EntityCombobox,
  FieldHint,
  InlineEntityCombobox,
  MultiEntityCombobox,
  StepperNav,
  Switch,
  WizardStep,
  WriteLockProvider,
  useWizard,
} from "@eifi1/ui-kit";
import type { ComboOption, WizardStepConfig } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * 0.23 for the Combobox family and the wizard (keksdose G1, G2, G9 and the kit's later
 * list). Three parts, three pages:
 *
 *   - {@link ComboboxFamilyLock023Demo} — Entity pickers: the write lock on all five
 *     pickers (Autocomplete included), and MultiEntityCombobox's `hint`;
 *   - {@link InlineCreateRow023Demo} — Entity pickers: the create row;
 *   - {@link StepperNavFinishLock023Demo} — Wizard: `finishCommit` on Finish.
 *
 * Synthetic data throughout.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const ACCOUNTS: ComboOption<string>[] = [
  { value: "chk", label: "Example Ltd current account", group: "Bank" },
  { value: "sav", label: "Sample savings", group: "Bank" },
  { value: "cash", label: "Petty cash", group: "Cash" },
  { value: "till", label: "Shop till", group: "Cash" },
];

const PAYEES = ["Example Ltd", "Sample Bakery", "Demo Utilities"];

const ADDRESSES: ComboOption<string>[] = [
  { value: "1", label: "Example Street 1, 0000 Sampletown" },
  { value: "2", label: "Example Street 12, 0000 Sampletown" },
  { value: "3", label: "Sample Road 3, 0000 Demoville" },
];

/** The five pickers as a read-only page renders them: everything shown, only the
 *  pickers that save on change (`commit`) locked. */
export function ComboboxFamilyLock023Demo() {
  const [locked, setLocked] = useState(true);
  const [payee, setPayee] = useState("Example Ltd");
  const [account, setAccount] = useState<string | null>("chk");
  const [panelAccount, setPanelAccount] = useState<string | null>("sav");
  const [several, setSeveral] = useState<string[]>(["chk", "cash"]);
  const [address, setAddress] = useState("Example Street 1");
  return (
    <Example
      label="The write lock on the Combobox family"
      hint="`commit` under a locked WriteLockProvider, or a `disabledReason` of the control's own"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo (WriteLockProvider locked)" />
        <WriteLockProvider locked={locked} reason="Read-only demo — saving is disabled.">
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineEntityCombobox<string>
              commit
              label="Statement account"
              value={account}
              onChange={setAccount}
              options={ACCOUNTS}
              clearable
              hint="Picking re-checks the statement for duplicates"
            />
            <EntityCombobox<string>
              commit
              label="Default account"
              value={panelAccount}
              onChange={setPanelAccount}
              options={ACCOUNTS}
              clearable
            />
            <MultiEntityCombobox<string>
              commit
              label="Accounts in the report"
              value={several}
              onChange={setSeveral}
              options={ACCOUNTS}
              clearable
              hint={<FieldHint label="Only these accounts are summed" />}
            />
            <Combobox
              commit
              label="Default payee"
              value={payee}
              onChange={setPayee}
              options={PAYEES}
            />
            <Autocomplete<string>
              commit
              label="Delivery address"
              value={address}
              onChange={setAddress}
              options={ADDRESSES}
              className="sm:col-span-2"
            />
          </div>
        </WriteLockProvider>
        <Note>
          Locked, each picker is still a tab stop — {code("aria-disabled")}, never {code("disabled")} — with the
          lock&apos;s sentence in the kit Tooltip and on {code("aria-describedby")}; no list opens, the clear
          &quot;×&quot; is gone and nothing reaches {code("onChange")}. The three typed fields are{" "}
          {code("readOnly")} and swallow Enter. A picker inside a form with its own Save leaves {code("commit")}{" "}
          off and stays live: the Save is the commit. {code("MultiEntityCombobox")} also takes {code("hint")} now,
          like the rest of the family since 0.22.
        </Note>
      </div>
    </Example>
  );
}

let nextId = 0;

/** keksdose G9: "Create cash account" as the picker's last row, not a separate button. */
export function InlineCreateRow023Demo() {
  const [options, setOptions] = useState<ComboOption<string>[]>(ACCOUNTS.filter((a) => a.group === "Cash"));
  const [value, setValue] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const create = (name: string) => {
    // Synthetic: an app would create the record on its server, then select its id.
    const id = `new-${++nextId}`;
    setOptions((o) => [...o, { value: id, label: name || `Cash account ${nextId}`, group: "Cash" }]);
    setValue(id);
  };
  return (
    <Example
      label="A create row on InlineEntityCombobox"
      hint="`onCreate`, `createEmptyLabel`, `createCommit` — also on EntityCombobox and MultiEntityCombobox"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo (WriteLockProvider locked)" />
        <WriteLockProvider locked={locked} reason="Read-only demo — creating is disabled.">
          <InlineEntityCombobox<string>
            label="Cash account"
            placeholder="Choose a cash account"
            value={value}
            onChange={setValue}
            options={options}
            onCreate={create}
            createEmptyLabel="Create cash account"
            createCommit
            className="max-w-sm"
          />
        </WriteLockProvider>
        <Note>
          Type a name that is not in the list and the last row reads {code("Create “…”")}; with nothing typed it
          reads the {code("createEmptyLabel")} and {code("onCreate")} gets {code('""')} — the app supplies the
          default name. The arrows reach the row like an option; Enter or a click creates and closes. With{" "}
          {code("createCommit")} a lock disables only the row (with its reason under it): picking is draft state
          and stays live, minting a record is the write.
        </Note>
      </div>
    </Example>
  );
}

const STEPS: WizardStepConfig[] = [
  { id: "map", label: "Map accounts" },
  { id: "confirm", label: "Confirm", commits: true },
  { id: "done", label: "Done" },
];

/** keksdose G1: Finish takes the write lock itself — no `renderFinish` clone. */
export function StepperNavFinishLock023Demo() {
  const [locked, setLocked] = useState(true);
  // Done starts the demo wizard over: a fresh key is a fresh `useWizard`.
  const [run, setRun] = useState(0);
  return (
    <Example label="Finish under a write lock" hint="`finishCommit` / `finishDisabledReason` on StepperNav">
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Read-only demo (WriteLockProvider locked)" />
        <WriteLockProvider locked={locked} reason="Read-only demo — importing is disabled.">
          <FinishLockWizard key={run} onDone={() => setRun((n) => n + 1)} />
        </WriteLockProvider>
        <Note>
          With {code("finishCommit")}, Finish is the kit Button&apos;s {code("commit")}: under a locked provider it
          is {code("aria-disabled")} but focusable, the reason is in its Tooltip, and {code("wizard.finish")} does
          not run. Back, Next and Cancel stay live — the steps before the commit write nothing.{" "}
          {code("finishDisabledReason")} is the same lock with a reason of the app&apos;s own. A{" "}
          {code("renderFinish")} that clones {code("commit")} in keeps working.
        </Note>
      </div>
    </Example>
  );
}

function FinishLockWizard({ onDone }: { onDone: () => void }) {
  const wizard = useWizard<Record<string, unknown>>({ steps: STEPS, onComplete: () => {}, onDone });
  return (
    <StepperNav wizard={wizard} finishCommit>
      {wizard.currentStep.id === "map" && (
        <WizardStep title="Map the accounts">
          <p className="text-sm text-[var(--text-secondary)]">Nothing is written yet — Next stays live under the lock.</p>
        </WizardStep>
      )}
      {wizard.currentStep.id === "confirm" && (
        <WizardStep title="Confirm the import">
          <p className="text-sm text-[var(--text-secondary)]">
            Finish is the commit, and the only button the lock holds. Hover or focus it to read why.
          </p>
        </WizardStep>
      )}
      {wizard.currentStep.id === "done" && (
        <WizardStep title="Imported">
          <p className="text-sm text-[var(--text-secondary)]">Synthetic: nothing was sent anywhere. Done starts over.</p>
        </WizardStep>
      )}
    </StepperNav>
  );
}
