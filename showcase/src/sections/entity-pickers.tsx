import { useState } from "react";
import {
  Button,
  Checkbox,
  EntityCombobox,
  InlineEntityCombobox,
  MultiEntityCombobox,
  MultiSelect,
} from "@eifi1/ui-kit";
import type { ComboOption } from "@eifi1/ui-kit";
import { Example, Stage } from "../lib/section";
import {
  ACCOUNTS,
  CATEGORIES,
  Current,
  INLINE_ACCOUNTS,
  MARKETS,
  RANKED,
  TAGS,
  loadCustomers,
  searchCustomers,
} from "./dropdown-fixtures";

/**
 * ENTITY PICKERS — the id-keyed half of the dropdown family: `InlineEntityCombobox`,
 * `EntityCombobox` with static and async options, `MultiEntityCombobox`, and the field
 * states they share. Free text is on "Comboboxes"; the parts underneath are on
 * "Dropdown parts". Shared fixtures: dropdown-fixtures.tsx.
 */
export function EntityPickers() {
  const [account, setAccount] = useState<string | null>("chk");
  const [category, setCategory] = useState<string | null>(null);
  // `onCreate` only tells the caller what was typed; adding the row is the caller's
  // job, so the option list has to be state rather than the module-scope fixture.
  const [categoryOptions, setCategoryOptions] = useState(CATEGORIES);
  const [customer, setCustomer] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(["t-business"]);

  // Field states.
  const [stateAccount, setStateAccount] = useState<string | null>(null);
  const [stateCategory, setStateCategory] = useState<string | null>(null);
  const [stateTags, setStateTags] = useState<string[]>([]);
  const [stateMarkets, setStateMarkets] = useState<(string | number)[]>([]);

  // Async knobs.
  const [outage, setOutage] = useState(false);
  const [slowCustomer, setSlowCustomer] = useState<string | null>(null);
  const [rankedPick, setRankedPick] = useState<string | null>(null);
  const [callerLoading, setCallerLoading] = useState(false);
  const [rankedRows, setRankedRows] = useState(RANKED);
  const [people, setPeople] = useState<string[]>([]);
  const [newPeople, setNewPeople] = useState<ComboOption<string>[]>([]);

  return (
    <>
      <Example
        label="InlineEntityCombobox"
        hint="id-keyed, but shaped like a text input so it can sit beside one"
      >
        <Stage>
          <InlineEntityCombobox
            label="Account"
            value={account}
            onChange={setAccount}
            options={INLINE_ACCOUNTS}
            placeholder="Pick an account"
            // The "×" is not a convenience. Emptying the text clears the field on a
            // desktop; on a phone the sheet covers the very input you would have
            // emptied, so without this an answered field could not be unanswered.
            clearable
            clearLabel="Clear account"
            searchPlaceholder="Search accounts"
            emptyLabel="No account matches"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={account === null ? "null" : `"${account}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The text is transient: picking a row commits it, typing an exact label that names exactly
          one account commits it, emptying the field commits <code className="font-mono">null</code>
          , and anything else reverts to the selected label on blur or Escape. “Old savings” is a{" "}
          <code className="font-mono">disabled</code> option: listed and dimmed, skipped by the
          arrows, and typing its name in full reverts rather than commits.
        </p>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The floating label — here and on <code className="font-mono">Combobox</code> — is a
          real <code className="font-mono">{"<label for>"}</code>, so{" "}
          <code className="font-mono">getByLabelText(&quot;Account&quot;)</code> finds the input.
        </p>
      </Example>

      <Example
        label="EntityCombobox — static options"
        hint="a trigger button, not an input; filtered in the browser"
      >
        <Stage>
          <EntityCombobox
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            placeholder="Pick a category"
            clearable
            clearLabel="Clear category"
            searchPlaceholder="Search categories"
            emptyLabel="No category matches"
            closeLabel="Close"
            createLabel={(q) => `Create category “${q}”`}
            // `onCreate` hands over the query and nothing else — the component does
            // not invent an id, so the caller adds the row AND selects it. A caller
            // that only appends would leave the user staring at the placeholder.
            onCreate={(q) => {
              const value = `custom-${q.toLowerCase().replace(/\s+/g, "-")}`;
              setCategoryOptions((prev) =>
                prev.some((o) => o.value === value) ? prev : [...prev, { value, label: q }],
              );
              setCategory(value);
            }}
          />
        </Stage>
        <Current label="value" value={category === null ? "null" : `"${category}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          This is the one family that draws <code className="font-mono">ComboOption.icon</code> —{" "}
          <code className="font-mono">InlineEntityCombobox</code> above carries the same option type
          but renders label and sublabel only. “Bank fees” is{" "}
          <code className="font-mono">disabled</code>: listed, never chosen, and Home/End and the
          arrows pass it over.
        </p>
      </Example>

      <Example
        label="EntityCombobox — async loadOptions"
        hint="debounced 150ms and race-safe; this stand-in resolves after 250ms"
      >
        <Stage>
          <EntityCombobox
            label="Customer"
            value={customer}
            onChange={setCustomer}
            // No `options` at all: once a value has been picked, its label survives
            // because the core caches every option it has seen. A list that has
            // moved on to other query results cannot resolve the selection itself.
            loadOptions={loadCustomers}
            placeholder="Search customers"
            clearable
            clearLabel="Clear customer"
            searchPlaceholder="Type a name or e-mail"
            emptyLabel="Nobody matches"
            closeLabel="Close"
          />
        </Stage>
        <Current label="value" value={customer === null ? "null" : `"${customer}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open it and type quickly: only the last query's answer lands. Clear the query and the list
          is re-fetched immediately (the debounce is skipped for an empty query, because an empty
          query is the open itself, not typing).
        </p>
      </Example>

      <Example
        label="EntityCombobox — minChars, debounceMs, a failed lookup"
        hint="nothing is asked below 2 characters; 600ms of quiet before each request"
      >
        <Stage>
          <EntityCombobox
            label="Customer (slow service)"
            value={slowCustomer}
            onChange={setSlowCustomer}
            loadOptions={(q) => searchCustomers(q, outage)}
            minChars={2}
            debounceMs={600}
            placeholder="Search customers"
            searchPlaceholder="At least 2 letters"
            loadErrorLabel="The customer service is not answering — try again later"
            emptyLabel="Nobody matches"
          />
        </Stage>
        <Checkbox
          label="Simulate an outage (loadOptions rejects)"
          checked={outage}
          onChange={(e) => setOutage(e.target.checked)}
        />
        <Current label="value" value={slowCustomer === null ? "null" : `"${slowCustomer}"`} />
      </Example>

      <Example
        label="EntityCombobox — filter={false} and an external loading flag"
        hint="a list the caller already searched and ranked, and a caller-side fetch in flight"
      >
        <Stage>
          <EntityCombobox
            label="Address"
            value={rankedPick}
            onChange={setRankedPick}
            options={rankedRows}
            // Shown exactly as given: typing "bahnhof" keeps "Hauptbahnhof, Basel" and
            // typing "zurich" keeps all three — the ranking is the server's.
            filter={false}
            loading={callerLoading}
            placeholder="Pick a match"
          />
        </Stage>
        <Button
          variant="secondary"
          disabled={callerLoading}
          onClick={() => {
            // The caller's own fetch: rows gone, `loading` up, for two seconds.
            setRankedRows([]);
            setCallerLoading(true);
            window.setTimeout(() => {
              setRankedRows(RANKED);
              setCallerLoading(false);
            }, 2000);
          }}
        >
          {callerLoading ? "Fetching…" : "Refetch the list (2 s)"}
        </Button>
        <Current label="value" value={rankedPick === null ? "null" : `"${rankedPick}"`} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Open it and type anything: with <code className="font-mono">filter={"{false}"}</code> the
          three rows stay, in their order. Press Refetch and open it: while the caller&apos;s{" "}
          <code className="font-mono">loading</code> is up and there are no rows, the panel says it
          is loading instead of &quot;no results&quot; — the flag is OR-ed with the component&apos;s
          own async state.
        </p>
      </Example>

      <Example
        label="Field states — invalid, error, disabled"
        hint="the same contract on every picker: invalid paints, error also explains, disabled settles"
      >
        <Stage>
          <InlineEntityCombobox
            label="Account"
            value={stateAccount}
            onChange={setStateAccount}
            options={ACCOUNTS}
            placeholder="Required"
            error={stateAccount === null ? "Choose the account to book from" : undefined}
          />
          <EntityCombobox
            label="Category"
            value={stateCategory}
            onChange={setStateCategory}
            options={CATEGORIES}
            placeholder="Required"
            // `invalid` alone: the ring and aria-invalid, no message.
            invalid={stateCategory === null}
          />
          <MultiEntityCombobox
            label="Tags"
            value={stateTags}
            onChange={setStateTags}
            options={TAGS}
            placeholder="At least one"
            error={stateTags.length === 0 ? "Tag it at least once" : undefined}
          />
          <MultiSelect
            label="Markets"
            options={MARKETS}
            values={stateMarkets}
            onChange={setStateMarkets}
            placeholder="None chosen"
            invalid={stateMarkets.length === 0}
          />
          <InlineEntityCombobox
            label="Account (disabled)"
            value="sav"
            onChange={() => {}}
            options={ACCOUNTS}
            disabled
          />
          <EntityCombobox
            label="Category (disabled)"
            value="rent"
            onChange={() => {}}
            options={CATEGORIES}
            clearable
            disabled
          />
          <MultiEntityCombobox
            label="Tags (disabled)"
            value={["t-business", "t-gift"]}
            onChange={() => {}}
            options={TAGS}
            clearable
            disabled
          />
        </Stage>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Answer each field and its mark goes away. <code className="font-mono">error</code> is
          rendered under the field and tied to it with{" "}
          <code className="font-mono">aria-describedby</code>;{" "}
          <code className="font-mono">invalid</code> carries no text. A disabled picker drops its
          clear button — a settled field offers no action. <code className="font-mono">MultiSelect</code>{" "}
          has <code className="font-mono">invalid</code> but no <code className="font-mono">error</code>{" "}
          or <code className="font-mono">disabled</code> of its own.
        </p>
      </Example>

      <Example
        label="MultiEntityCombobox"
        hint="rows toggle and the panel stays open — picking several is the point"
      >
        <Stage>
          <MultiEntityCombobox
            label="Tags"
            value={tags}
            onChange={setTags}
            options={TAGS}
            placeholder="No tags"
            // Without `itemLabel` the trigger joins every resolved label with ", ",
            // and falls back to "N selected" as soon as one label cannot be resolved.
            itemLabel={(n) => `${n} tag${n === 1 ? "" : "s"}`}
            clearable
            clearLabel="Clear tags"
            searchPlaceholder="Search tags"
            emptyLabel="No tag matches"
            closeLabel="Close"
          />
          <MultiEntityCombobox
            label="Recipients"
            value={people}
            onChange={setPeople}
            // Created rows live in the caller's state; passing them as `options` is
            // what lets the trigger name them once the search has moved on.
            options={newPeople}
            loadOptions={(q) =>
              loadCustomers(q).then((hits) => [
                ...hits,
                ...newPeople.filter((p) => p.label.toLowerCase().includes(q.trim().toLowerCase())),
              ])
            }
            placeholder="Nobody yet"
            createLabel={(q) => `Invite “${q}”`}
            onCreate={(q) => {
              const value = `new-${q.toLowerCase().replace(/\s+/g, "-")}`;
              setNewPeople((prev) =>
                prev.some((p) => p.value === value)
                  ? prev
                  : [...prev, { value, label: q, sublabel: "invited" }],
              );
              setPeople((prev) => (prev.includes(value) ? prev : [...prev, value]));
            }}
          />
        </Stage>
        <Current label="tags" value={tags.length ? JSON.stringify(tags) : "[]"} />
        <Current label="recipients" value={people.length ? JSON.stringify(people) : "[]"} />
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          The second field has no <code className="font-mono">itemLabel</code>, so its trigger
          lists the picked names, joined the locale&apos;s way (<code className="font-mono">
            Intl.ListFormat
          </code>
          ). Its rows come from <code className="font-mono">loadOptions</code>; type a name that is
          not there and <code className="font-mono">onCreate</code> adds it — the panel stays open,
          and selecting the new row is the caller&apos;s job, done here in the same handler.
        </p>
      </Example>

    </>
  );
}
