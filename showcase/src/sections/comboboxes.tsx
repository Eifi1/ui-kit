import { useState } from "react";
import { Button, Combobox, InlineEntityCombobox, PHONE_QUERY, useMediaQuery } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";
import { ACCOUNTS, Current, PAYEES, PAYEE_GROUPS, RECURRING } from "./dropdown-fixtures";

/**
 * COMBOBOXES — the free-text half of the dropdown family: `Combobox`, whose value is
 * whatever was typed (and, rendered after it from autocomplete-demo.tsx, `Autocomplete`).
 * The id-keyed pickers are on "Entity pickers"; the parts they are all built from are on
 * "Dropdown parts". The fixtures the three pages share live in dropdown-fixtures.tsx.
 */
export function Comboboxes() {
  // The same query the components ask themselves. Rendering the answer turns "the
  // panel looks different on my phone" from a claim into something the reader can
  // check by dragging the window edge.
  const isPhone = useMediaQuery(PHONE_QUERY, false);

  const [payee, setPayee] = useState("");

  // Click-to-edit cells: which cell is an editor right now, and what it last said.
  const [editing, setEditing] = useState<"payee" | "account" | null>(null);
  const [cellPayee, setCellPayee] = useState("Rewe");
  const [cellAccount, setCellAccount] = useState<string | null>("chk");
  const [editLog, setEditLog] = useState("—");

  return (
    <>
      <Note>
        <strong>Every combobox and entity picker changes shape below {PHONE_QUERY}.</strong>{" "}
        <code className="font-mono">Combobox</code>,{" "}
        <code className="font-mono">InlineEntityCombobox</code>,{" "}
        <code className="font-mono">EntityCombobox</code> and{" "}
        <code className="font-mono">MultiEntityCombobox</code> drop their anchored panel and open a
        full-screen <code className="font-mono">PickerSheet</code> instead — the shape a native{" "}
        <code className="font-mono">&lt;select&gt;</code> already has on a phone. Only{" "}
        <code className="font-mono">MultiSelect</code> and{" "}
        <code className="font-mono">GroupedPicker</code> keep one presentation at every width. This
        window currently reports{" "}
        <strong>{isPhone ? "phone — sheets" : "pointer — anchored panels"}</strong>; drag the edge
        past 767px to watch them swap.
      </Note>

      <Example
        label="Combobox"
        hint="free text — the typed value is the value, whether or not it is in the pool"
      >
        <Stage>
          <Combobox
            label="Payee"
            value={payee}
            onChange={setPayee}
            options={PAYEES}
            placeholder="Who was paid?"
            // Capped below the pool of 8 on purpose, so the cap is visible rather
            // than merely documented. The default is 8 on a panel, 50 in a sheet.
            maxSuggestions={6}
            groupBy={(o) => PAYEE_GROUPS[o] ?? "Other"}
            optionAdornment={(o) =>
              RECURRING.has(o) ? (
                <span className="shrink-0 rounded border border-[var(--border)] px-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  monthly
                </span>
              ) : null
            }
            // Supplying `createLabel` is what turns free text into something you
            // CONFIRM. Without it the value is still committed — it is simply never
            // acknowledged, which reads as "my typing was thrown away".
            createLabel={(v) => `Add “${v}” as payee`}
            searchPlaceholder="Search payees"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={payee ? `"${payee}"` : "(empty)"} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Type a few letters, then clear them and click the field again: the list comes back WHOLE.
          The text filters only while it is being typed, so a field holding “Rewe” does not reopen
          as a one-row filter of its own answer.
        </p>
      </Example>

      <Example
        label="Click-to-edit cells"
        hint="autoFocus lands the caret in the field that was clicked; onBlur and onSubmit close the editor"
      >
        <Stage>
          <div data-stage="wide" className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
            {editing === "payee" ? (
              <Combobox
                aria-label="Payee"
                value={cellPayee}
                onChange={setCellPayee}
                options={PAYEES}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- mounted by the click that asked for it
                autoFocus
                // Focus genuinely left — a click on a row does NOT fire this, which is
                // what makes it usable as "close the editor".
                onBlur={() => {
                  setEditLog("onBlur → editor closed");
                  setEditing(null);
                }}
                // Enter with no row highlighted: "I mean what I typed".
                onSubmit={() => {
                  setEditLog("onSubmit → editor closed");
                  setEditing(null);
                }}
              />
            ) : (
              <Button variant="secondary" onClick={() => setEditing("payee")}>
                Payee: {cellPayee || "—"}
              </Button>
            )}
            {editing === "account" ? (
              <InlineEntityCombobox
                aria-label="Account"
                value={cellAccount}
                onChange={(v) => {
                  setCellAccount(v);
                  setEditLog(`onChange(${v === null ? "null" : `"${v}"`}) → editor closed`);
                  setEditing(null);
                }}
                options={ACCOUNTS}
                // eslint-disable-next-line jsx-a11y/no-autofocus -- mounted by the click that asked for it
                autoFocus
              />
            ) : (
              <Button variant="secondary" onClick={() => setEditing("account")}>
                Account: {ACCOUNTS.find((a) => a.value === cellAccount)?.label ?? "—"}
              </Button>
            )}
          </div>
        </Stage>
        <Current label="last" value={editLog} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Click a cell: it becomes the field, focused, with its list open. In the payee cell, type
          and press Enter (<code className="font-mono">onSubmit</code>) or click elsewhere (
          <code className="font-mono">onBlur</code>); picking a row keeps the editor, because the
          rows never take focus from the input.
        </p>
      </Example>
    </>
  );
}
