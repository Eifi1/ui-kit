import { useState } from "react";
import { Apple, Lock, ShoppingBasket, Tag } from "lucide-react";
import { Checkbox, Chip, List, ListItem, ProgressBar, SignedAmount, Tooltip } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * ListItem's 0.16 slots (keksdose P2): `content` inside the target, `overline`,
 * `metaWrap`, `trailingTone`, `renderRow`, `leadingActions`, and the expandable row.
 */

const FOOD = [
  { group: "Fresh", name: "Fruit & vegetables", spent: 84, budget: 120 },
  { group: "Fresh", name: "Dairy", spent: 61, budget: 50 },
  { group: "Pantry", name: "Grains & pasta", spent: 22, budget: 40 },
];

function InsideTarget() {
  const [opened, setOpened] = useState("—");
  return (
    <Example
      label="ListItem — content, overline, trailingTone"
      hint="the bar is inside the row's button: clicking it opens the row"
    >
      <List aria-label="Food groups" separator="divider" className="max-w-md">
        {FOOD.map((f) => (
          <ListItem
            key={f.name}
            icon={Apple}
            align="start"
            overline={f.group}
            title={f.name}
            onClick={() => setOpened(f.name)}
            trailingTone="inherit"
            trailing={
              <SignedAmount
                value={f.budget - f.spent}
                currency="EUR"
                className="text-sm font-medium tabular-nums"
              />
            }
            content={
              // The figure is already the row's trailing amount: the bar only repeats it.
              <ProgressBar
                aria-hidden
                variant="meter"
                value={f.spent}
                max={f.budget}
                size="sm"
                tone={f.spent > f.budget ? "danger" : "brand"}
              />
            }
          />
        ))}
      </List>
      <OutTable rows={[["last opened (onClick)", opened]]} />
      <Note>
        `content` renders inside the target under the text, so the bar is part of what the row&apos;s click does and
        its hover fill covers it — `children` still renders outside the target, for controls. `trailingTone=&quot;inherit&quot;`
        drops the slot&apos;s muted colour so the amount&apos;s own sign colour stands; the default stays `muted`.
      </Note>
    </Example>
  );
}

const PAYEES = [
  { name: "REWE Markt 4411", tags: ["Groceries", "Weekly", "Card", "Household", "Split 50/50"] },
  { name: "Deutsche Bahn", tags: ["Travel", "Commute"] },
];

function WrappingMeta() {
  return (
    <Example label="ListItem — metaWrap" hint="a run of chips wraps instead of being cut off">
      <List aria-label="Payees" className="max-w-xs">
        {PAYEES.map((p) => (
          <ListItem
            key={p.name}
            icon={Tag}
            align="start"
            title={p.name}
            subtitle={`${p.tags.length} tags`}
            onClick={() => {}}
            metaWrap
            meta={p.tags.map((t) => (
              <Chip key={t} size="sm">
                {t}
              </Chip>
            ))}
          />
        ))}
      </List>
    </Example>
  );
}

function WrappedRow() {
  return (
    <Example label="ListItem — renderRow" hint="a tooltip round the row, inside its li">
      <List aria-label="Accounts" separator="divider" className="max-w-md">
        <ListItem title="Checking" subtitle="Synced 2 min ago" onClick={() => {}} />
        <ListItem
          title="Savings"
          subtitle="Locked while a sync runs"
          icon={Lock}
          disabled
          onClick={() => {}}
          renderRow={(row) => <Tooltip label="A sync is running — try again in a minute">{row}</Tooltip>}
        />
        <ListItem title="Credit card" subtitle="Synced yesterday" onClick={() => {}} />
      </List>
      <Note>
        The wrapper goes round the visible row, inside the `&lt;li&gt;` — so the list still counts three items and the
        divider under &quot;Savings&quot; stays. The row is stretched to the full width even in the tooltip&apos;s inline span.
      </Note>
    </Example>
  );
}

const GROUPS = [
  { name: "Groceries", items: ["REWE", "Aldi", "Bakery"] },
  { name: "Transport", items: ["Deutsche Bahn", "Fuel"] },
];

function ExpandableGroups() {
  const [open, setOpen] = useState<Record<string, boolean>>({ Groceries: true });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <Example
      label="ListItem — expandable, with leadingActions"
      hint="the checkbox is its own control; the row toggles its group"
    >
      <List aria-label="Category groups" separator="divider" className="max-w-md">
        {GROUPS.map((g) => (
          <ListItem
            key={g.name}
            icon={ShoppingBasket}
            title={g.name}
            subtitle={`${g.items.length} payees`}
            leadingActions={
              <Checkbox
                aria-label={`Select all of ${g.name}`}
                checked={g.items.every((i) => checked[i])}
                indeterminate={g.items.some((i) => checked[i]) && !g.items.every((i) => checked[i])}
                onCheckedChange={(on) =>
                  setChecked((c) => ({ ...c, ...Object.fromEntries(g.items.map((i) => [i, on])) }))
                }
              />
            }
            expanded={!!open[g.name]}
            onExpandedChange={(next) => setOpen((o) => ({ ...o, [g.name]: next }))}
            expandedContent={
              <List aria-label={g.name} density="compact" separator="none">
                {g.items.map((i) => (
                  <ListItem
                    key={i}
                    title={i}
                    leadingActions={
                      <Checkbox
                        aria-label={`Select ${i}`}
                        checked={!!checked[i]}
                        onCheckedChange={(on) => setChecked((c) => ({ ...c, [i]: on }))}
                      />
                    }
                  />
                ))}
              </List>
            }
          />
        ))}
      </List>
      <OutTable
        rows={[
          ["expanded", Object.keys(open).filter((k) => open[k]).join(", ") || "—"],
          ["selected", Object.keys(checked).filter((k) => checked[k]).join(", ") || "—"],
        ]}
      />
    </Example>
  );
}

export function List016Demo() {
  return (
    <>
      <InsideTarget />
      <WrappingMeta />
      <WrappedRow />
      <ExpandableGroups />
    </>
  );
}
