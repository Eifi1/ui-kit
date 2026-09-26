import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type { ReactNode } from "react";
import { Command, FileText, Layers, Moon, Palette, Plus, Receipt, Table2, User } from "lucide-react";
import { Button, CommandPalette, GlobalSearch, Input, ToggleGroup, useCommandKey } from "@eifi1/ui-kit";
import type { CommandItem, GlobalSearchSource, SearchEntry } from "@eifi1/ui-kit";
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

      <Example
        label='CommandPalette — searchOn="submit"'
        hint="typing edits a draft; ↵ or the submit button commits it — the search runs only then"
      >
        <SubmitPaletteDemo />
      </Example>

      <Example
        label="CommandPalette — redactLabels and item redact"
        hint="rows that are the user's own data carry data-private, for replay and screenshot masking"
      >
        <RedactPaletteDemo />
      </Example>

      <Example
        label="CommandPalette — a controlled query"
        hint="query + onQueryChange: the text lives outside the palette, here in the address bar's ?q="
      >
        <ControlledQueryDemo />
      </Example>

      <Example
        label="GlobalSearch — ranked index, async source and suggestions"
        hint="the whole ⌘K search an app puts in its top bar; the one in THIS top bar is the same component"
      >
        <GlobalSearchDemo />
      </Example>

      <Example
        label="CommandPalette — density and a synchronous provider"
        hint='comfortable rows are the 44px touch target; a provider that returns an array never shows "Searching…"'
      >
        <DensitySyncDemo />
      </Example>

      <Example
        label="GlobalSearch — suggestionsKeepGroups, triggerIconSize, triggerName and density"
        hint="suggestions under their own groups; a 20px magnifier; the shortcut in the trigger's name; phone-sized rows"
      >
        <GlobalSearchGroupsDemo />
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
        label, then the <strong>×</strong> at the field&apos;s end: the clear button (
        <code className="font-mono">commandPalette.clear</code>) empties the field, commits the empty
        query and puts the caret back. From 768px up the panel is a top-centred card; below it (
        <code className="font-mono">fullScreenOnPhone</code>, on by default) it fills the screen — no inset,
        no rounded panel, the field pinned at the top inside the safe areas, a 16px field so iOS does
        not zoom, and a Close button (<code className="font-mono">commandPalette.close</code>) because
        there is no backdrop to tap. Try the screen-size preview in the top bar; the next specimen
        has the <code className="font-mono">={"{false}"}</code> form.
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

/* ── submit mode ───────────────────────────────────────────────────────────── */

function SubmitPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(true);
  const [calls, setCalls] = useState<string[]>([]);
  const [changes, setChanges] = useState(0);
  const search = (query: string): CommandItem[] => {
    setCalls((c) => [`"${query}"`, ...c].slice(0, 6));
    const needle = query.trim().toLowerCase();
    return [...PALETTE_INDEX, ...RECORDS]
      .filter((e) => !needle || e.label.toLowerCase().includes(needle))
      .map((e) => ({ ...e, href: undefined, onSelect: () => setOpen(false) }));
  };
  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the submit-mode palette
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={fullScreen} onChange={(e) => setFullScreen(e.target.checked)} />
          <code className="font-mono">fullScreenOnPhone</code>
        </label>
      </Row>
      <OutTable
        rows={[
          ["search calls", String(calls.length ? calls.length : 0)],
          ["queries searched, newest first", calls.length ? calls.join(" · ") : "—"],
          ["onQueryChange calls", String(changes)],
        ]}
      />
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={PALETTE_INDEX}
        searchOn="submit"
        fullScreenOnPhone={fullScreen}
        onQueryChange={() => setChanges((n) => n + 1)}
        labels={{ dialog: "Search (on submit)", placeholder: "Type, then press ↵…" }}
      />
      <Note>
        Type &ldquo;rent&rdquo;: the counter does not move and the list stays on the last committed query,
        while a submit button (<code className="font-mono">commandPalette.submit</code>, ↵ glyph) appears
        beside the field. Press ↵ or that button and the draft becomes THE query — one search call, one{" "}
        <code className="font-mono">onQueryChange</code>. ↵ again with nothing new typed chooses the
        highlighted row, as in <code className="font-mono">&quot;input&quot;</code> mode. The × commits the empty
        query straight away in both modes, and an uncommitted draft is dropped when the palette closes. The
        phone keyboard&apos;s key reads &ldquo;search&rdquo; (<code className="font-mono">enterKeyHint</code>).
      </Note>
      <Note>
        Untick <code className="font-mono">fullScreenOnPhone</code> and, at a phone width (or in the
        screen-size preview), this palette keeps the desktop card — inset, rounded, 70vh — instead of
        filling the screen, and has no Close button: the backdrop and Escape close it.
      </Note>
    </div>
  );
}

/* ── redaction ─────────────────────────────────────────────────────────────── */

const PRIVATE_ENTRIES: PaletteEntry[] = [
  ...RECORDS,
  { id: "acct-1", label: "Joint checking ·· 0130", group: "Accounts", hint: "2,418.55 €", icon: <Table2 className="size-4" /> },
];

function RedactPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [redact, setRedact] = useState(true);
  const [demo, setDemo] = useState(true);
  const search = (query: string): CommandItem[] => {
    const needle = query.trim().toLowerCase();
    const rows: CommandItem[] = [
      ...PRIVATE_ENTRIES.map((e) => ({ ...e, onSelect: () => setOpen(false) })),
      // An app's own page, not the user's data: un-masked in a palette that masks by default.
      { id: "settings", label: "Settings", group: "Pages", hint: "redact: false", redact: false, onSelect: () => setOpen(false) },
    ];
    return rows.filter((e) => !needle || e.label.toLowerCase().includes(needle));
  };
  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the redacting palette
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={redact} onChange={(e) => setRedact(e.target.checked)} />
          <code className="font-mono">redactLabels</code>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          demo mode (blur <code className="font-mono">[data-private]</code>)
        </label>
      </Row>
      {/* The host's own rule — the kit only sets the attribute. Scoped to the open
          palette's dialog, which is portalled to <body>. */}
      {demo && open && <style>{'[role="dialog"] [data-private] { filter: blur(5px); }'}</style>}
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={PRIVATE_ENTRIES}
        redactLabels={redact}
        labels={{ dialog: "Search (redacted)" }}
      />
      <Note>
        <code className="font-mono">redactLabels</code> marks every row&apos;s label and hint{" "}
        <code className="font-mono">data-private</code> — payees, amounts, an account name — so session
        replay and screenshot tooling mask them; here the page&apos;s own demo-mode rule blurs them. The
        &ldquo;Settings&rdquo; row passes <code className="font-mono">redact: false</code> and stays readable:
        an item&apos;s <code className="font-mono">redact</code> overrides the palette either way, so with{" "}
        <code className="font-mono">redactLabels</code> off a single row could opt IN with{" "}
        <code className="font-mono">redact: true</code> instead. Group headings are the app&apos;s words and
        are never marked.
      </Note>
    </div>
  );
}

/* ── controlled query ──────────────────────────────────────────────────────── */

function ControlledQueryDemo() {
  const [open, setOpen] = useState(false);
  // The query is the URL's `q`, as keksdose binds it: it survives a reload, can be sent
  // as a link, and Back walks through the searches. `replace` so each keystroke does not
  // become a history entry of its own.
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const setQuery = (q: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (q) next.set("q", q);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  const [edits, setEdits] = useState(0);
  const search = (q: string): CommandItem[] => {
    const needle = q.trim().toLowerCase();
    return PALETTE_INDEX.filter((e) => !needle || e.label.toLowerCase().includes(needle)).map((e) => ({
      ...e,
      href: undefined,
      onSelect: () => setOpen(false),
    }));
  };
  return (
    <div className="space-y-3">
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open with the current query
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("data");
            setOpen(true);
          }}
        >
          Open on “data”
        </Button>
        <span className={READOUT}>onQueryChange calls: {edits}</span>
      </Row>
      <div className="max-w-xs">
        <Input aria-label="The query, outside the palette" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type here, or in the palette" />
      </div>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={PALETTE_INDEX}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setEdits((n) => n + 1);
        }}
        labels={{ dialog: "Search (query in the URL)" }}
      />
      <Note>
        Type in the palette and the field above follows, and so does the address bar (
        <code className="font-mono">#/command-palette?q=…</code>); close it and reopen and the text is
        still there — a controlled palette is never reset on open, because the owner decides what an
        open shows. <code className="font-mono">onQueryChange</code> fires in both modes; uncontrolled,
        it only observes.
      </Note>
    </div>
  );
}

/* ── global search ─────────────────────────────────────────────────────────── */

/** A small app's static index: pages, actions and settings, with keywords in the words
 *  a user types rather than the ones on the page. */
const APP_ENTRIES: SearchEntry[] = [
  { id: "budget", title: "Budget", group: "Pages", href: "/budget", icon: <Table2 className="size-4" />, keywords: ["envelopes", "plan"] },
  { id: "accounts", title: "Accounts", group: "Pages", href: "/accounts", icon: <Layers className="size-4" />, keywords: ["bank", "wallet"] },
  { id: "reports", title: "Reports", group: "Pages", href: "/reports", icon: <FileText className="size-4" />, keywords: ["charts", "spending"] },
  { id: "new-transaction", title: "New transaction", group: "Actions", href: "/transactions?action=new", icon: <Plus className="size-4" />, keywords: ["add", "expense", "income"] },
  { id: "new-account", title: "New account", group: "Actions", href: "/accounts?action=new", icon: <Plus className="size-4" /> },
  { id: "dark-mode", title: "Dark mode", group: "Settings", href: "/settings#theme", icon: <Moon className="size-4" />, keywords: ["theme", "appearance"] },
  { id: "two-factor", title: "Two-factor authentication", group: "Settings", href: "/settings#2fa", icon: <User className="size-4" />, keywords: ["2fa", "security", "otp"] },
];

/** What a server would hold — searched by the async source, never by the index. */
const TRANSACTIONS = [
  { id: "t1", payee: "Bäckerei Müller", amount: "€ 4.80" },
  { id: "t2", payee: "Rent — Hausverwaltung", amount: "€ 950.00" },
  { id: "t3", payee: "Budget airline", amount: "€ 129.99" },
  { id: "t4", payee: "Café Central", amount: "€ 7.40" },
];

function GlobalSearchDemo() {
  const [went, setWent] = useState<string | null>(null);
  const [fail, setFail] = useState(false);
  const [calls, setCalls] = useState(0);

  // A fake server: 600ms away, abortable, optionally broken. Its answer is shown as
  // given — the source ranks, the index does not re-filter.
  const transactions: GlobalSearchSource = {
    id: "transactions",
    group: "Transactions",
    redact: true,
    search: (query, signal) =>
      new Promise<SearchEntry[]>((resolve, reject) => {
        setCalls((n) => n + 1);
        const timer = setTimeout(() => {
          if (fail) return reject(new Error("offline"));
          const needle = query.toLowerCase();
          resolve(
            TRANSACTIONS.filter((t) => t.payee.toLowerCase().includes(needle)).map((t) => ({
              id: t.id,
              title: t.payee,
              hint: t.amount,
              icon: <Receipt className="size-4" />,
              href: `/transactions?payee=${encodeURIComponent(t.payee)}`,
            })),
          );
        }, 600);
        signal.addEventListener("abort", () => clearTimeout(timer));
      }),
  };

  return (
    <div className="space-y-3">
      <Row>
        {/* `shortcut={false}`: this page's first specimen and the top bar already own ⌘K. */}
        <GlobalSearch
          entries={APP_ENTRIES}
          sources={[transactions]}
          suggestions={["new-transaction", "budget", { query: "theme" }]}
          navigate={setWent}
          hrefFor={(href) => href}
          shortcut={false}
          triggerClassName="border border-[var(--border)]"
        />
        <span className="text-xs text-[var(--text-secondary)]">← the trigger (tooltip names the shortcut)</span>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} />
          the server is down
        </label>
      </Row>
      <OutTable
        rows={[
          ["navigate(href)", <span className={READOUT}>{went ?? "—"}</span>],
          ["source calls", <span className={READOUT}>{calls}</span>],
        ]}
      />
      <Note>
        Try <code className="font-mono">accnt</code> (a typo), <code className="font-mono">2fa</code> (a keyword),{" "}
        <code className="font-mono">mode dark</code> (either order), or <code className="font-mono">bu</code> —
        the static rows show at once, and the Transactions group streams in 600ms later with its own
        &ldquo;Searching…&rdquo; line; with the server down that group alone shows the error. Its rows are{" "}
        <code className="font-mono">redact: true</code>, hints (amounts) included. A request whose query has moved
        on is aborted. <code className="font-mono">navigate</code> is passed here so choosing a row only reports
        it; inside a router the default is the router&apos;s own, and every row is still a real link for a
        middle-click.
      </Note>
    </div>
  );
}

/* ── 0.10.0: density, sync providers, suggestion groups, the trigger's icon ───── */

type Density = "compact" | "comfortable";

function DensitySyncDemo() {
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState<Density>("comfortable");
  const [sync, setSync] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);

  const rows = (query: string): CommandItem[] => {
    const needle = query.trim().toLowerCase();
    return PALETTE_INDEX.filter((e) => !needle || e.label.toLowerCase().includes(needle)).map((e) => ({
      ...e,
      onSelect: () => setChosen(e.label),
    }));
  };
  // The palette tells the two apart by what the provider RETURNS: an array is
  // already the answer, a promise is something to wait for.
  const search = sync
    ? rows
    : (query: string) => new Promise<CommandItem[]>((resolve) => setTimeout(() => resolve(rows(query)), 500));

  return (
    <div className="space-y-3">
      <Row>
        <ToggleGroup<Density>
          aria-label="density"
          value={density}
          onChange={setDensity}
          options={[
            { value: "compact", label: "compact" },
            { value: "comfortable", label: "comfortable" },
          ]}
        />
        <ToggleGroup<"sync" | "async">
          aria-label="provider"
          value={sync ? "sync" : "async"}
          onChange={(v) => setSync(v === "sync")}
          options={[
            { value: "sync", label: "returns an array" },
            { value: "async", label: "returns a promise (500ms)" },
          ]}
        />
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open the palette
        </Button>
        <span className={READOUT}>last chosen: {chosen ?? "—"}</span>
      </Row>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        search={search}
        revision={sync}
        density={density}
        labels={{ placeholder: "Filter a list already in memory…", loading: "Searching…" }}
      />
      <Note>
        Type into each: the array-returning provider answers at once and the &ldquo;Searching…&rdquo; line never
        flashes through the debounce; the promise-returning one shows it from its first answer on. There is no
        prop to keep in step — the palette looks at what the provider returns, call by call.{" "}
        <code className="font-mono">density=&quot;comfortable&quot;</code> gives every row{" "}
        <code className="font-mono">min-h-11</code> and body-size text, for a thumb; the default{" "}
        <code className="font-mono">compact</code> is the 36px desktop list.
      </Note>
    </div>
  );
}

function GlobalSearchGroupsDemo() {
  const [went, setWent] = useState<string | null>(null);
  const [keepGroups, setKeepGroups] = useState(true);
  const [big, setBig] = useState(true);
  const [density, setDensity] = useState<Density>("compact");
  const [withShortcut, setWithShortcut] = useState(true);
  // The trigger's accessible name, read back from the DOM — the thing `triggerName`
  // changes, and a thing no one sees.
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const button = wrapRef.current?.querySelector("button");
    if (!button) return;
    const read = () => setName(button.getAttribute("aria-label"));
    const frame = requestAnimationFrame(read);
    const observer = new MutationObserver(read);
    observer.observe(button, { attributes: true, attributeFilter: ["aria-label"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  return (
    <div className="space-y-3">
      <Row>
        <span ref={wrapRef} className="inline-flex">
          <GlobalSearch
            entries={APP_ENTRIES}
            suggestions={["budget", "reports", "new-transaction", "dark-mode", { query: "rent" }]}
            suggestionsKeepGroups={keepGroups}
            groupOrder={["Actions", "Pages"]}
            triggerIconSize={big ? 20 : undefined}
            triggerName={withShortcut ? "withShortcut" : "plain"}
            density={density}
            navigate={setWent}
            hrefFor={(href) => href}
            shortcut={false}
            triggerClassName="border border-[var(--border)]"
          />
        </span>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={keepGroups} onChange={(e) => setKeepGroups(e.target.checked)} />
          <code className="font-mono">suggestionsKeepGroups</code>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={big} onChange={(e) => setBig(e.target.checked)} />
          <code className="font-mono">triggerIconSize={"{20}"}</code>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={withShortcut} onChange={(e) => setWithShortcut(e.target.checked)} />
          <code className="font-mono">triggerName=&quot;withShortcut&quot;</code>
        </label>
        <ToggleGroup<Density>
          aria-label="density"
          size="sm"
          value={density}
          onChange={setDensity}
          options={[
            { value: "compact", label: "compact" },
            { value: "comfortable", label: "comfortable" },
          ]}
        />
      </Row>
      <OutTable
        rows={[
          ["the trigger's accessible name", <span className={READOUT}>{name === null ? "—" : `"${name}"`}</span>],
          ["navigate(href)", <span className={READOUT}>{went ?? "—"}</span>],
        ]}
      />
      <Note>
        Open it with the field empty. With <code className="font-mono">suggestionsKeepGroups</code> each
        suggested entry stands under its own <code className="font-mono">group</code> — Actions, then Pages,
        then Settings, ordered by <code className="font-mono">groupOrder</code> as results are — and the query
        suggestion (&ldquo;rent&rdquo;) stays under the one <em>Suggestions</em> heading; off, all of them share
        that heading. <code className="font-mono">triggerIconSize</code> is the magnifier in px — 20 matches the
        kit&apos;s other top-bar triggers, the default 16 is what it always was.{" "}
        <code className="font-mono">triggerName=&quot;withShortcut&quot;</code> names the trigger by{" "}
        <code className="font-mono">globalSearch.shortcut(keys)</code> — &ldquo;Search (⌘K)&rdquo; on Apple
        platforms, &ldquo;Search (Ctrl K)&rdquo; elsewhere — instead of the plain &ldquo;Search&rdquo;, so a
        screen-reader user meets the shortcut in the name itself (<code className="font-mono">aria-keyshortcuts</code>{" "}
        is set either way); the readout shows the name. It belongs with a live shortcut: this specimen leaves ⌘K to
        the first one on the page, but the top bar&apos;s own search uses it on every other page.{" "}
        <code className="font-mono">density</code> is handed to the palette.
      </Note>
    </div>
  );
}
