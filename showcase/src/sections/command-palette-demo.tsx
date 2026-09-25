import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Command, FileText, Layers, Palette, Receipt, Table2 } from "lucide-react";
import { Button, CommandPalette, useCommandKey } from "@eifi1/ui-kit";
import type { CommandItem } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * COMMAND PALETTE — `CommandPalette` and `useCommandKey`.
 *
 * The palette portals to `document.body` and owns a global ⌘K listener, which is why it
 * is awkward to demonstrate inside a card: the specimen below is opened by a real
 * button and by the real shortcut, anywhere on this page. The panel is painted with the
 * kit's tokens, so it follows the palette switch.
 */

// Live readouts share one class so a reader can tell "this is state" from "this is
// chrome" at a glance.
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

export function CommandPaletteDemo() {
  return (
    <>
      <Example
        label="CommandPalette"
        hint={
          <>
            <code className="font-mono">useCommandKey</code> binds ⌘K on macOS and Ctrl-K
            elsewhere — the listener is on <code className="font-mono">document</code>, so it
            fires anywhere on this page.
          </>
        }
      >
        <PaletteDemo />
      </Example>

      <Example
        label="CommandPalette — async search, loading and revision"
        hint="The provider answers after a delay, and a second batch of data lands 1.5s after opening — without a keystroke."
      >
        <AsyncPaletteDemo />
      </Example>

      <Example
        label="CommandPalette — a search that fails"
        hint="The provider rejects: the stale results are cleared and the error line shows in their place."
      >
        <FailingPaletteDemo />
      </Example>
    </>
  );
}

/* ── command palette ───────────────────────────────────────────────────────── */

interface PaletteEntry {
  id: string;
  label: string;
  group: string;
  hint?: string;
  href?: string;
  icon?: ReactNode;
}

/**
 * Module-level so its identity is stable across renders, which is what makes it a
 * legitimate `revision`. The prop is compared by identity like an effect dependency —
 * a fixture rebuilt inline on every render would re-arm the debounce forever.
 */
const PALETTE_INDEX: PaletteEntry[] = [
  { id: "foundations", label: "Foundations & tokens", group: "Sections", icon: <Palette className="size-4" />, href: "#foundations" },
  { id: "data-table", label: "Data table", group: "Sections", icon: <Table2 className="size-4" />, href: "#data-table" },
  { id: "overlays", label: "Overlays", group: "Sections", icon: <Layers className="size-4" />, href: "#overlays" },
  { id: "toggle-theme", label: "Toggle theme", group: "Actions", hint: "top bar", icon: <Command className="size-4" /> },
  { id: "copy-import", label: "Copy the import line", group: "Actions", hint: '@eifi1/ui-kit' },
  { id: "readme", label: "README", group: "Docs", icon: <FileText className="size-4" /> },
  { id: "adopting", label: "ADOPTING.md", group: "Docs", icon: <FileText className="size-4" /> },
];

function PaletteDemo() {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  // Stable identity so the global listener is registered once rather than torn down
  // and re-added on every render of this section.
  const openPalette = useCallback(() => setOpen(true), []);
  useCommandKey(openPalette);

  // The provider's IDENTITY is not a re-run signal — the palette reads it through a
  // ref — so rebuilding it per render costs nothing. It is the DATA changing that
  // needs `revision`.
  const search = (query: string): CommandItem[] => {
    const needle = query.trim().toLowerCase();
    return PALETTE_INDEX.filter(
      (e) =>
        !needle ||
        e.label.toLowerCase().includes(needle) ||
        e.group.toLowerCase().includes(needle),
    ).map((e) => ({ ...e, onSelect: () => setChosen(e.label) }));
  };

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="brand" onClick={openPalette}>
          Open palette
        </Button>
        <span className={READOUT}>last chosen: {chosen ?? "—"}</span>
      </Row>

      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={PALETTE_INDEX}
        labels={{
          placeholder: "Search the showcase…",
          empty: "No matches",
          loading: "Searching…",
          hint: "↑↓ navigate · ↵ select · esc close · ⌘-click a Section row to open it in a tab",
        }}
      />

      <Note>
        An empty query is allowed and returns everything here, which is how an app
        surfaces recents or default pages. The debounce is 150ms while typing and zero
        for the empty query, so the first open is not artificially slow.
      </Note>
      <Note>
        The rows under <em>Sections</em> carry an <code className="font-mono">href</code>, so
        they render as real anchors and can be middle- or ⌘-clicked into a new tab; a plain
        click is intercepted and runs <code className="font-mono">onSelect</code> instead.
        The palette stays OPEN for a modified click, deliberately — ⌘-clicking three results
        in a row is the reason the prop exists.
      </Note>
      <Note>
        A modal like the others since 0.7.0: Tab stays inside the panel, the page behind does
        not scroll, Escape closes from anywhere in it (not only the field), and focus goes back
        to whatever opened it — press <strong>Open palette</strong>, Escape, and focus is on the
        button again. Each group is a <code className="font-mono">role=&quot;group&quot;</code>{" "}
        named by its heading, and the ids are per instance, so the two palettes on this page do
        not point each other&apos;s <code className="font-mono">aria-activedescendant</code> at the
        wrong list.
      </Note>
      <Note>
        Type something with no match (&ldquo;zzz&rdquo;) for the <code className="font-mono">empty</code>{" "}
        label. The panel is top-centred on every screen size — on a phone it is the full width
        less a 16px margin, not a bottom sheet.
      </Note>
    </div>
  );
}

/** Stable empties/fixtures, because `revision` is compared by identity. */
const NO_RECORDS: PaletteEntry[] = [];
const RECORDS: PaletteEntry[] = [
  { id: "tx-1", label: "Rewe — groceries", group: "Transactions", hint: "−48.20 €", icon: <Receipt className="size-4" /> },
  { id: "tx-2", label: "Rent, September", group: "Transactions", hint: "−950.00 €", icon: <Receipt className="size-4" /> },
  { id: "tx-3", label: "Salary", group: "Transactions", hint: "+3,100.00 €", icon: <Receipt className="size-4" /> },
];

function AsyncPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<PaletteEntry[]>(NO_RECORDS);
  const [calls, setCalls] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  // The "cold cache": the records only arrive a while after the palette opened.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setRecords(RECORDS), 1500);
    return () => clearTimeout(t);
  }, [open]);

  const search = async (query: string): Promise<CommandItem[]> => {
    setCalls((c) => [`"${query}"`, ...c].slice(0, 5));
    await new Promise((r) => setTimeout(r, 600));
    const needle = query.trim().toLowerCase();
    return [...PALETTE_INDEX.filter((e) => e.group === "Sections"), ...records]
      .filter((e) => !needle || e.label.toLowerCase().includes(needle))
      .map((e) => ({ ...e, onSelect: () => setChosen(e.label) }));
  };

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the async palette
        </Button>
        <span className={READOUT}>last chosen: {chosen ?? "—"}</span>
      </Row>
      <OutTable
        rows={[
          ["records (revision)", records === NO_RECORDS ? "not loaded yet" : `${records.length} loaded`],
          ["search calls, newest first", calls.length ? calls.join(" · ") : "—"],
        ]}
      />
      <CommandPalette
        open={open}
        onClose={() => {
          setOpen(false);
          setRecords(NO_RECORDS);
        }}
        search={search}
        revision={records}
        labels={{
          // The dialog's accessible name — separate from the greyed-out placeholder.
          dialog: "Search transactions",
          placeholder: "Type a payee…",
          loading: "Fetching…",
          empty: "Nothing matches",
        }}
      />
      <Note>
        Watch the calls list: opening searches once for &ldquo;&rdquo;, and the records arriving
        change <code className="font-mono">revision</code>, which searches again for the same
        query and adds the Transactions group. Typing re-arms a 150ms debounce; a slow answer
        to an old query is dropped, so results never jump back. No{" "}
        <code className="font-mono">hint</code> label here, so there is no footer.
      </Note>
    </div>
  );
}


/** The search provider is down while the switch is on; `labels.error` is optional, and
 *  without it the provider's `commandPalette.error` (then English) is shown. */
function FailingPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [down, setDown] = useState(true);
  const [customError, setCustomError] = useState(false);
  const [failures, setFailures] = useState(0);

  const search = async (query: string): Promise<CommandItem[]> => {
    await new Promise((r) => setTimeout(r, 300));
    // Fails for any query but the empty one, so opening shows results first and the
    // first keystroke replaces them with the error line.
    if (down && query.trim()) {
      setFailures((n) => n + 1);
      throw new Error("503 Service Unavailable");
    }
    const needle = query.trim().toLowerCase();
    return PALETTE_INDEX.filter((e) => !needle || e.label.toLowerCase().includes(needle)).map(
      (e) => ({ ...e, onSelect: () => setOpen(false) }),
    );
  };

  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open, then type anything
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={down} onChange={(e) => setDown(e.target.checked)} />
          search backend down
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={customError}
            onChange={(e) => setCustomError(e.target.checked)}
          />
          <code className="font-mono">labels.error</code>
        </label>
        <span className={READOUT}>rejections: {failures}</span>
      </Row>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        labels={{
          dialog: "Search (flaky backend)",
          error: customError ? "The search service is down — try again in a minute." : undefined,
        }}
      />
      <Note>
        Before 0.7.0 a rejected search was unhandled: the previous query&apos;s results stayed on
        screen as if they answered the new one. Now the list is emptied and the{" "}
        <code className="font-mono">error</code> line is announced (
        <code className="font-mono">role=&quot;alert&quot;</code>); the next successful search
        clears it. With <code className="font-mono">labels.error</code> off the line is the
        provider&apos;s <code className="font-mono">commandPalette.error</code> — switch this
        page&apos;s language to see it translated.
      </Note>
    </div>
  );
}
