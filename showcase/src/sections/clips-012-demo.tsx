import { useMemo, useState } from "react";
import { Button, Combobox, PickerSheet, SHEET_ROW_CLASS, Tooltip, cn } from "@eifi1/ui-kit";
import { Example, Note, Row, Stage } from "../lib/section";
import { ACCOUNTS, Current } from "./dropdown-fixtures";

/**
 * `data-clips` on the dropdown lists (keksdose E8). Combobox's listbox and PickerSheet's
 * scroller now carry the {@link CLIPS_ATTRIBUTE} marker, so a Tooltip inside a row — the
 * `optionAdornment` badge that says what an option IS — sees a scroll container above it
 * and portals its bubble out, instead of being cut off by the list's edge (and, in jsdom,
 * joining the option's accessible name).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** Proposals that follow the UI language, as keksdose's category field has them. */
const CATEGORIES = ["Groceries", "Rent", "Transport", "Leisure", "Utilities", "Insurance", "Gifts", "Coffee"];
const TRANSLATED = new Set(["Groceries", "Rent", "Transport", "Leisure", "Utilities", "Insurance"]);

function Badge({ option }: { option: string }) {
  const translated = TRANSLATED.has(option);
  return (
    <Tooltip
      label={
        translated
          ? "A built-in category: its name follows the interface language."
          : "Your own name: stored as typed, never translated."
      }
      side="start"
    >
      <span
        className={cn(
          "shrink-0 rounded border px-1 text-[10px] uppercase tracking-wide",
          translated
            ? "border-[var(--brand)] text-[var(--brand)]"
            : "border-[var(--border)] text-[var(--text-muted)]",
        )}
      >
        {translated ? "built-in" : "custom"}
      </span>
    </Tooltip>
  );
}

export function ComboboxClipsDemo() {
  const [category, setCategory] = useState("");
  return (
    <Example
      label="Combobox — a Tooltip in optionAdornment (data-clips)"
      hint="hover a badge in the open list: the bubble is portalled out of the scrolling list"
    >
      <Stage>
        <Combobox
          label="Category"
          value={category}
          onChange={setCategory}
          options={CATEGORIES}
          maxSuggestions={8}
          optionAdornment={(o) => <Badge option={o} />}
          searchPlaceholder="Search categories"
          closeLabel="Close"
        />
      </Stage>
      <Current label="value" value={category ? `"${category}"` : "(empty)"} />
      <div className="mt-3">
        <Note>
          The list is a scroll container ({code("max-height")} + {code("overflow-y: auto")}), and a
          bubble drawn inside it is cut off at its edge. Since 0.12 the listbox carries {code("data-clips")}
          (the kit's {code("CLIPS_ATTRIBUTE")}), which the Tooltip's auto-portal reads as well as the
          computed overflow — so the bubble goes to {code("document.body")}, above the panel. The marker
          matters most under jsdom, which computes no overflow: there a bubble left in the row became
          part of the option's accessible name (&ldquo;Rent A built-in category…&rdquo;). On a phone the
          same list is a {code("PickerSheet")}, whose scroller carries the marker too.
        </Note>
      </div>
    </Example>
  );
}

export function PickerSheetClipsDemo() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ACCOUNTS.filter((a) => a.label.toLowerCase().includes(q)) : ACCOUNTS;
  }, [query]);
  return (
    <Example
      label="PickerSheet — data-clips on the scroller"
      hint="a Tooltip in a sheet row portals out rather than being clipped"
    >
      <Stage>
        <Row>
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            Open the sheet with tooltips
          </Button>
        </Row>
      </Stage>
      <PickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Account"
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search accounts"
        closeLabel="Close"
      >
        <ul role="listbox" aria-label="Accounts">
          {hits.map((a) => (
            <li key={a.value} role="option" aria-selected={a.value === account}>
              <button
                type="button"
                onClick={() => {
                  setAccount(a.value);
                  setOpen(false);
                }}
                className={cn(SHEET_ROW_CLASS, a.value === account && "font-medium")}
              >
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
                <Tooltip label={`Group: ${a.group ?? "—"} · ${a.sublabel ?? ""}`} side="start">
                  <span className="shrink-0 rounded border border-[var(--border)] px-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {a.group}
                  </span>
                </Tooltip>
              </button>
            </li>
          ))}
        </ul>
      </PickerSheet>
      <Current label="value" value={account === null ? "null" : `"${account}"`} />
      <div className="mt-3">
        <Note>
          The sheet's scrolling body is marked {code("data-clips")}, so any Tooltip in a row —
          including a {code("Combobox")}'s {code("optionAdornment")} when the combobox opens as a sheet on
          a phone — portals its bubble out of the scroller instead of drawing it inside, where the
          scroller's edge would clip it. Hover (or focus) a group badge.
        </Note>
      </div>
    </Example>
  );
}
