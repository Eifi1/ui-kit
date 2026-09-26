import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Archive,
  Building2,
  Check,
  Copy,
  Download,
  FileText,
  FolderInput,
  KeyRound,
  LogOut,
  Pencil,
  Settings,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Button,
  BulkActionBar,
  Checkbox,
  HoverMenu,
  IconButton,
  List,
  ListItem,
  MenuItem,
  StatusDot,
  ToggleGroup,
  UserAvatar,
} from "@eifi1/ui-kit";
import type {
  BulkActionBarVariant,
  ListDensity,
  ListItemLinkProps,
  ListSeparator,
  MenuItemLinkProps,
} from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * LISTS & MENUS — the row every app draws by hand a dozen times (`List` / `ListItem`),
 * the row of a menu panel (`MenuItem`), and the bar a selection of rows brings up
 * (`BulkActionBar`). All three are 0.10.0.
 *
 * Every row below is wired to state, and every link row goes somewhere real — another
 * page of this showcase, through the router — so what a click, a middle click and a
 * keyboard press do can be tried rather than read about.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/** react-router's Link takes `to`, not `href` — the one name the row's props need mapped. */
const routerRow = ({ href, ...props }: ListItemLinkProps) => <Link to={href} {...props} />;
const routerMenuLink = ({ href, ...props }: MenuItemLinkProps) => <Link to={href} {...props} />;

/* ── List: the four kinds of row ─────────────────────────────────────────── */

function RowKinds() {
  const [log, setLog] = useState<string[]>([]);
  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 4));
  return (
    <Example
      label="ListItem — button, link, external and static rows"
      hint="the row is ONE thing to activate; its actions sit beside it, never inside"
    >
      <List className="max-w-xl">
        <ListItem
          icon={FileText}
          title="Invoice 2026-0412 (a button row)"
          subtitle="onClick — selects, opens, marks read"
          onClick={() => say("button row clicked")}
          actions={
            <>
              <IconButton size="sm" label="Copy the invoice number" onClick={() => say("copy — the row was not clicked")}>
                <Copy />
              </IconButton>
              <IconButton size="sm" tone="danger" label="Delete the invoice" onClick={() => say("delete — the row was not clicked")}>
                <Trash2 />
              </IconButton>
            </>
          }
        />
        <ListItem
          icon={Building2}
          title="Page structure (a router link row)"
          subtitle="href + renderLink — a real <a> through react-router's <Link>"
          href="/page-structure"
          renderLink={routerRow}
          onClick={() => say("link row: onClick ran before the navigation")}
          onAuxClick={() => say("link row: middle click (onAuxClick)")}
          trailing="→ another page"
        />
        <ListItem
          icon={FileText}
          title="Buttons & surfaces (a plain <a>)"
          subtitle="href alone — no renderLink, so the default anchor"
          href="#/buttons"
        />
        <ListItem
          icon={KeyRound}
          title="WAI-ARIA list pattern"
          subtitle="external — target=_blank, rel=noopener noreferrer, and the ↗ mark"
          href="https://www.w3.org/WAI/ARIA/apg/"
          external
        />
        <ListItem
          icon={KeyRound}
          title="YubiKey 5C (a static row)"
          subtitle="no onClick, no href — a record to read, with its actions beside it"
          meta="Added 3 March 2026 · last used yesterday"
          actions={
            <Button variant="ghost" size="sm" tone="danger" onClick={() => say("remove passkey")}>
              Remove
            </Button>
          }
        />
      </List>
      <p className={`mt-3 ${READOUT}`}>{log.length ? log.join(" · ") : "click a row, or one of its actions"}</p>
      <div className="mt-3">
        <Note>
          The types allow one target per row: <code className="font-mono">onClick</code> makes it a{" "}
          <code className="font-mono">&lt;button&gt;</code>, <code className="font-mono">href</code> an{" "}
          <code className="font-mono">&lt;a&gt;</code> (through <code className="font-mono">renderLink</code> when
          given, so a router link keeps the single-page app), <code className="font-mono">external</code> a
          new-tab anchor that says so to a screen reader, and neither a static block.{" "}
          <code className="font-mono">actions</code> are SIBLINGS of that target in one bordered box — Tab
          reaches the row, then Copy, then Delete — so pressing Copy never selects the row, which the
          readout shows. Middle-click the router row: a real link opens a background tab, and{" "}
          <code className="font-mono">onAuxClick</code> reports it. <code className="font-mono">trailing</code>{" "}
          sits inside the target (it is part of the name); <code className="font-mono">meta</code> is the
          third, caption-sized line.
        </Note>
      </div>
    </Example>
  );
}

/* ── ListItem states ─────────────────────────────────────────────────────── */

const MESSAGES = [
  { id: "m1", from: "Hausverwaltung Nord", text: "The heating will be serviced on Thursday between 8 and 12." },
  { id: "m2", from: "Stadtwerke", text: "Your meter reading for September is due by the 30th." },
  { id: "m3", from: "Kastlan support", text: "We have answered your question about the service-charge statement." },
];

function RowStates() {
  const [unread, setUnread] = useState<string[]>(["m1", "m2"]);
  const [selected, setSelected] = useState("m3");
  const [loading, setLoading] = useState(false);
  const [downloads, setDownloads] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setDownloads((n) => n + 1);
    }, 1500);
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <Example
      label="ListItem — unread, selected, status, loading and disabled"
      hint="click a message: it is selected and marked read; the download row ignores a second click while it works"
    >
      <List className="max-w-xl" separator="divider">
        {MESSAGES.map((m) => (
          <ListItem
            key={m.id}
            leading={<UserAvatar name={m.from} size="sm" />}
            title={m.from}
            subtitle={m.text}
            unread={unread.includes(m.id)}
            selected={selected === m.id}
            onClick={() => {
              setSelected(m.id);
              setUnread((u) => u.filter((x) => x !== m.id));
            }}
          />
        ))}
        <ListItem
          icon={Wallet}
          title="Overdue rent reminder"
          subtitle="status — a mark of your own in the unread dot's place"
          status={<StatusDot tone="danger" size="md" aria-label="Overdue" />}
          onClick={() => {}}
        />
        <ListItem
          icon={Download}
          title="statement-2026-09.pdf"
          subtitle={loading ? "Downloading…" : `loading — aria-busy, a spinner, clicks ignored (${downloads} done)`}
          trailing="148 KB"
          loading={loading}
          onClick={() => setLoading(true)}
        />
        <ListItem
          icon={Archive}
          title="Archived thread"
          subtitle="disabled — a real disabled button, out of the tab order"
          disabled
          onClick={() => {}}
        />
      </List>
      <Row className="mt-3">
        <Button variant="ghost" size="sm" onClick={() => setUnread(["m1", "m2", "m3"])}>
          Mark all unread
        </Button>
        <span className={READOUT}>
          unread: {unread.length ? unread.join(", ") : "none"} · selected: {selected}
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          <code className="font-mono">unread</code> is three things at once: the brand dot at the end,
          the title in semibold, and &ldquo;(Unread)&rdquo; read after the title (
          <code className="font-mono">list.unread</code> from the provider) — the dot alone says nothing
          to a screen reader. <code className="font-mono">selected</code> is the brand border and{" "}
          <code className="font-mono">aria-current=&quot;true&quot;</code>: the current one of a set, not a
          pressed toggle. <code className="font-mono">status</code> puts another mark in the dot&apos;s
          place. A <code className="font-mono">loading</code> row keeps its focus (
          <code className="font-mono">aria-disabled</code>, not <code className="font-mono">disabled</code>) so a
          keyboard user is not thrown to the top of the page mid-download; a{" "}
          <code className="font-mono">disabled</code> one has nothing to do and is skipped.
        </Note>
      </div>
    </Example>
  );
}

/* ── Text: subtitleLines, meta, align ────────────────────────────────────── */

function RowText() {
  const [lines, setLines] = useState<"1" | "2">("2");
  const [align, setAlign] = useState<"center" | "start">("start");
  return (
    <Example
      label="ListItem — subtitleLines, meta, leading and align"
      hint="a subtitle is a label (one line) or a body (two); align start keeps the icon by the title"
    >
      <Row className="mb-3">
        <ToggleGroup<"1" | "2">
          aria-label="subtitleLines"
          value={lines}
          onChange={setLines}
          options={[
            { value: "1", label: "subtitleLines 1" },
            { value: "2", label: "subtitleLines 2" },
          ]}
        />
        <ToggleGroup<"center" | "start">
          aria-label="align"
          value={align}
          onChange={setAlign}
          options={[
            { value: "center", label: "align center" },
            { value: "start", label: "align start" },
          ]}
        />
      </Row>
      <List className="max-w-md" separator="divider">
        <ListItem
          icon={Tag}
          align={align}
          subtitleLines={lines === "2" ? 2 : 1}
          title="Budget alert: groceries"
          subtitle="You have spent 92 % of this month's groceries budget, with nine days of the month still to go — the rest of the envelope is €31.40."
          meta="Today, 09:14"
          unread
          onClick={() => {}}
        />
        <ListItem
          leading={<UserAvatar name="Ada Lovelace" size="sm" />}
          align={align}
          subtitleLines={lines === "2" ? 2 : 1}
          title="Ada Lovelace commented on the service-charge statement for the second floor, east"
          subtitle="Could the heating costs be split by the metered consumption instead of the floor area? The meters were installed in spring."
          meta="Yesterday"
          href="#/lists-menus"
        />
      </List>
      <div className="mt-3">
        <Note>
          Title and a one-line subtitle truncate; <code className="font-mono">subtitleLines={"{2}"}</code>{" "}
          clamps at two, for a notification whose text is its body. With two lines, <code className="font-mono">align=&quot;start&quot;</code>{" "}
          keeps the icon, the avatar (<code className="font-mono">leading</code>) and the unread dot beside
          the title instead of floating in the middle of the paragraph.
        </Note>
      </div>
    </Example>
  );
}

/* ── List: density, separator, as ────────────────────────────────────────── */

function ListLayout() {
  const [density, setDensity] = useState<ListDensity>("default");
  const [separator, setSeparator] = useState<ListSeparator>("gap");
  const [picked, setPicked] = useState("Checking");
  const accounts = ["Checking", "Savings", "Travel wallet", "Credit card"];
  return (
    <Example
      label="List — density, separator and as"
      hint="the list sets every row's rhythm; one row can override its density"
    >
      <Row className="mb-3">
        <ToggleGroup<ListDensity>
          aria-label="density"
          size="sm"
          value={density}
          onChange={setDensity}
          options={[
            { value: "compact", label: "compact" },
            { value: "default", label: "default" },
            { value: "comfortable", label: "comfortable" },
          ]}
        />
        <ToggleGroup<ListSeparator>
          aria-label="separator"
          size="sm"
          value={separator}
          onChange={setSeparator}
          options={[
            { value: "divider", label: "divider" },
            { value: "gap", label: "gap" },
            { value: "none", label: "none" },
          ]}
        />
      </Row>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] p-1">
          <List density={density} separator={separator} aria-label="Accounts">
            {accounts.map((a) => (
              <ListItem
                key={a}
                icon={Wallet}
                title={a}
                trailing={picked === a ? <Check className="size-4 text-[var(--brand)]" aria-hidden /> : undefined}
                selected={picked === a}
                onClick={() => setPicked(a)}
              />
            ))}
          </List>
        </div>
        <div className="rounded-md border border-[var(--border)] p-1">
          <List as="ol" density={density} separator={separator} aria-label="Ranked payees">
            {["Hausverwaltung Nord", "Rewe", "Deutsche Bahn"].map((p, i) => (
              <ListItem key={p} title={`${i + 1}. ${p}`} subtitle='as="ol" — the order means something' />
            ))}
            <ListItem density="comfortable" title="4. Stadtwerke" subtitle='density="comfortable" on this row only' />
          </List>
        </div>
      </div>
      <div className="mt-3">
        <ListItem
          as="div"
          icon={Settings}
          title='as="div" — a single row outside any list'
          subtitle="an <li> must sit in a list; a lone row is a div"
          onClick={() => {}}
          className="max-w-md border-[var(--border)]"
        />
      </div>
      <p className={`mt-3 ${READOUT}`}>picked: {picked}</p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">List</code> is a <code className="font-mono">&lt;ul role=&quot;list&quot;&gt;</code>{" "}
          (<code className="font-mono">&lt;ol&gt;</code> with <code className="font-mono">as=&quot;ol&quot;</code>) —
          the explicit role because Safari drops a list&apos;s semantics once its bullets are styled
          away. <code className="font-mono">density</code> is the rows&apos; padding (compact ~36px,
          default ~44px, comfortable for a list that is the page); <code className="font-mono">separator</code>{" "}
          is a rule, a small gap, or nothing.
        </Note>
      </div>
    </Example>
  );
}

/* ── MenuItem ────────────────────────────────────────────────────────────── */

const BUDGETS = ["Household", "Holiday 2026", "Renovation"];

function MenuItemChoices() {
  const [budget, setBudget] = useState("Household");
  const [archived, setArchived] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="MenuItem — radio, checkbox, danger and disabled"
      hint="inside a HoverMenu: ↓ on the trigger opens onto the first row, ↑/↓ move, the checked rows are announced as checked"
    >
      <Row>
        <HoverMenu
          aria-label="Budget menu"
          align="start"
          panelClassName="w-64"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              Budget: {budget}
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {BUDGETS.map((b) => (
                <li key={b}>
                  <MenuItem
                    icon={Wallet}
                    checked={budget === b}
                    onClick={() => {
                      setBudget(b);
                      close();
                    }}
                  >
                    {b}
                  </MenuItem>
                </li>
              ))}
              <li>
                <MenuItem
                  checkable="checkbox"
                  checked={archived}
                  icon={Archive}
                  onClick={() => setArchived((v) => !v)}
                >
                  Show archived budgets
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={Pencil} trailing={<kbd className="font-mono text-[11px]">E</kbd>} onClick={() => { setLog("rename"); close(); }}>
                  Rename…
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={FolderInput} disabled onClick={() => setLog("import (should not happen)")}>
                  Import (read-only budget)
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={Trash2} tone="danger" onClick={() => { setLog("delete budget"); close(); }}>
                  Delete budget
                </MenuItem>
              </li>
            </ul>
          )}
        </HoverMenu>
        <span className={READOUT}>
          budget: {budget} · archived: {String(archived)} · last command: {log}
        </span>
      </Row>
      <div className="mt-3">
        <Note>
          <code className="font-mono">checked</code> makes a row a CHOICE: <code className="font-mono">menuitemradio</code>{" "}
          by default (one of a set — the budgets) or <code className="font-mono">menuitemcheckbox</code> with{" "}
          <code className="font-mono">checkable=&quot;checkbox&quot;</code> (an independent on/off — it stays
          open so you can see the tick come and go), each with <code className="font-mono">aria-checked</code>{" "}
          and a ✓ at the end. Left undefined the row is a plain command. <code className="font-mono">tone=&quot;danger&quot;</code>{" "}
          is the row that destroys; <code className="font-mono">disabled</code> is{" "}
          <code className="font-mono">aria-disabled</code>, so the row stays perceivable
          (&ldquo;Import, dimmed&rdquo;) and its click does nothing. <code className="font-mono">trailing</code> holds
          a shortcut, a count or a badge.
        </Note>
      </div>
    </Example>
  );
}

function MenuItemLinks() {
  const [went, setWent] = useState("—");
  return (
    <Example
      label="MenuItem — links, current and renderLink"
      hint="a link row is a real <a role=menuitem>; the page already open is current, never checked"
    >
      <Row>
        <HoverMenu
          aria-label="Account menu"
          align="start"
          panelClassName="w-64"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              Account
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              <li>
                <MenuItem
                  icon={Settings}
                  href="/lists-menus"
                  renderLink={routerMenuLink}
                  current
                  onClick={() => {
                    setWent("Lists & menus (current)");
                    close();
                  }}
                >
                  Lists &amp; menus
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={Building2} href="/page-structure" renderLink={routerMenuLink} onClick={close}>
                  Page structure
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={FileText} href="#/buttons" onClick={close}>
                  Buttons (a plain &lt;a&gt;)
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={KeyRound} href="/settings" renderLink={routerMenuLink} disabled>
                  Security (disabled: a button, not a link)
                </MenuItem>
              </li>
              <li>
                <MenuItem icon={LogOut} tone="danger" onClick={() => { setWent("signed out"); close(); }}>
                  Sign out
                </MenuItem>
              </li>
            </ul>
          )}
        </HoverMenu>
        <span className={READOUT}>last: {went}</span>
      </Row>
      <div className="mt-3">
        <Note>
          <code className="font-mono">href</code> makes the row a link — through{" "}
          <code className="font-mono">renderLink</code> (your router&apos;s <code className="font-mono">&lt;Link&gt;</code>,
          the API <code className="font-mono">Chip</code>, <code className="font-mono">StatTile</code> and{" "}
          <code className="font-mono">ListItem</code> share) or a plain anchor. <code className="font-mono">current</code>{" "}
          marks the page already open with <code className="font-mono">aria-current=&quot;page&quot;</code> and a
          ✓ — a checked link would be a link to where you already are. A disabled link has nowhere to go,
          so it renders as a dimmed button.
        </Note>
      </div>
    </Example>
  );
}

/* ── BulkActionBar ───────────────────────────────────────────────────────── */

const FILES = [
  "Lease, 2nd floor east.pdf",
  "Service-charge statement 2025.pdf",
  "Handover protocol.pdf",
  "Meter photos.zip",
  "Insurance policy.pdf",
  "Heating contract.pdf",
  "Floor plan.png",
  "Keys handed over.jpg",
];

/** The selectable file list the three bar specimens share: static rows with a checkbox
 *  in `leading` (a static row's target is a div, so a checkbox may sit in it). */
function SelectableFiles({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (name: string) => void;
}) {
  return (
    <List density="compact" separator="divider">
      {FILES.map((f) => (
        <ListItem
          key={f}
          leading={<Checkbox aria-label={`Select ${f}`} checked={selected.includes(f)} onChange={() => onToggle(f)} />}
          title={f}
          selected={selected.includes(f)}
        />
      ))}
    </List>
  );
}

function useSelection(initial: string[] = []) {
  const [selected, setSelected] = useState<string[]>(initial);
  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  return { selected, setSelected, toggle };
}

function BarActions({ onDone, count }: { onDone: (what: string) => void; count: number }) {
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => onDone(`downloaded ${count}`)}>
        <Download className="size-4" /> Download
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onDone(`moved ${count}`)}>
        <FolderInput className="size-4" /> Move
      </Button>
      <Button variant="ghost" size="sm" tone="danger" onClick={() => onDone(`deleted ${count}`)}>
        <Trash2 className="size-4" /> Delete
      </Button>
    </>
  );
}

function BulkInlineSticky() {
  const [variant, setVariant] = useState<Exclude<BulkActionBarVariant, "floating">>("sticky");
  const { selected, setSelected, toggle } = useSelection(["Handover protocol.pdf", "Meter photos.zip"]);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="BulkActionBar — sticky and inline"
      hint="sticky pins to the top of its scroll container, over the rows it acts on; inline sits in the flow"
    >
      <Row className="mb-3">
        <ToggleGroup<"sticky" | "inline">
          aria-label="variant"
          value={variant}
          onChange={setVariant}
          options={[
            { value: "sticky", label: "sticky" },
            { value: "inline", label: "inline" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setSelected(FILES.slice(0, 3))}>
          Select three
        </Button>
        <span className={READOUT}>last action: {log}</span>
      </Row>
      <div className="max-h-64 overflow-auto rounded-md border border-[var(--border)]">
        <BulkActionBar
          variant={variant}
          count={selected.length}
          onClear={() => setSelected([])}
        >
          <BarActions count={selected.length} onDone={setLog} />
        </BulkActionBar>
        <div className="p-1">
          <SelectableFiles selected={selected} onToggle={toggle} />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          Tick rows and the bar comes in; untick the last (or press <strong>Clear selection</strong>) and it
          plays its exit and goes. It is rendered unconditionally — <code className="font-mono">count</code>{" "}
          decides — because at zero it still renders its live region, which has to be in the DOM before
          the first &ldquo;2 selected&rdquo; can be heard. Scroll the box with the bar showing: the sticky
          one stays over the rows. The count is spoken on every change and names the toolbar.
        </Note>
      </div>
    </Example>
  );
}

function BulkFloating() {
  const { selected, setSelected, toggle } = useSelection(["Lease, 2nd floor east.pdf"]);
  const [overPage, setOverPage] = useState(false);
  const [log, setLog] = useState("—");
  return (
    <Example
      label="BulkActionBar — floating, count, clear and labels"
      hint="the phone's bar: a rounded card fixed above the bottom nav — here held inside the box"
    >
      <label className="mb-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <input type="checkbox" checked={overPage} onChange={(e) => setOverPage(e.target.checked)} />
        let it float over the whole page (as in an app — above the phone&apos;s bottom nav)
      </label>
      {/* `transform` makes this box the containing block of the bar's `position: fixed`,
          so the floating bar is anchored to the box rather than to the window — and the
          box's own `--app-nav-h` of 0 drops the phone nav's offset. */}
      <div
        className="relative h-80 overflow-hidden rounded-md border border-[var(--border)] [transform:translateZ(0)]"
        style={{ ["--app-nav-h" as string]: "0px" }}
      >
        <div className="h-full overflow-auto p-1 pb-20">
          <SelectableFiles selected={selected} onToggle={toggle} />
        </div>
        {!overPage && (
          <BulkActionBar
            count={selected.length}
            onClear={() => setSelected([])}
            labels={{ selected: (n) => `${n} file${n === 1 ? "" : "s"} selected` }}
          >
            <IconButton size="lg" label="Download" tooltipSide="top" onClick={() => setLog(`downloaded ${selected.length}`)}>
              <Download />
            </IconButton>
            <IconButton size="lg" label="Move" tooltipSide="top" onClick={() => setLog(`moved ${selected.length}`)}>
              <FolderInput />
            </IconButton>
            <IconButton size="lg" tone="danger" label="Delete" tooltipSide="top" onClick={() => setLog(`deleted ${selected.length}`)}>
              <Trash2 />
            </IconButton>
          </BulkActionBar>
        )}
      </div>
      {overPage && (
        <BulkActionBar count={selected.length} onClear={() => setSelected([])}>
          <IconButton size="lg" label="Download" tooltipSide="top" onClick={() => setLog(`downloaded ${selected.length}`)}>
            <Download />
          </IconButton>
          <IconButton size="lg" tone="danger" label="Delete" tooltipSide="top" onClick={() => setLog(`deleted ${selected.length}`)}>
            <Trash2 />
          </IconButton>
        </BulkActionBar>
      )}
      <Row className="mt-3">
        <span className={READOUT}>
          count={selected.length} · last action: {log}
        </span>
        <FocusReadout />
      </Row>
      <div className="mt-3">
        <Note>
          <strong>Keyboard:</strong> the bar is a <code className="font-mono">role=&quot;toolbar&quot;</code> with
          ONE Tab stop — Tab into it, then ←/→ (mirrored right-to-left), Home and End move between the ×
          and the actions, and Tab leaves. The stop remembers the control last used. It is not a dialog:
          no focus trap, no scroll lock, the rows behind stay live, because ticking more rows is how a
          selection grows. The × is the clear action (<code className="font-mono">bulkActionBar.clear</code>);{" "}
          <code className="font-mono">labels.selected</code> is a function of the count — this one says
          &ldquo;files&rdquo;. On a phone it sits above <code className="font-mono">AppShell</code>&apos;s bottom
          nav (<code className="font-mono">--app-nav-h</code>) and the home indicator, whichever is higher.
        </Note>
      </div>
    </Example>
  );
}

/** The name of whatever has focus inside a bulk-action bar — the toolbar's roving
 *  focus, made visible. */
function FocusReadout() {
  const [name, setName] = useState("—");
  useEffect(() => {
    const onFocus = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el?.closest("[data-bulk-action-bar]")) return;
      setName(el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "?");
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
  return (
    <span className={READOUT}>focus in a bar: {name}</span>
  );
}

export function ListsMenus() {
  return (
    <>
      <RowKinds />
      <RowStates />
      <RowText />
      <ListLayout />
      <MenuItemChoices />
      <MenuItemLinks />
      <BulkInlineSticky />
      <BulkFloating />
    </>
  );
}
