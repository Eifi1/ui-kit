import { useState } from "react";
import { Hash, Pin, Star, Tag } from "lucide-react";
import { Button, Chip, ChipInput, Tabs, ToggleGroup } from "@eifi1/ui-kit";
import type { ToggleOption } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";
import { useT } from "../i18n";
import { TabControls } from "./field-anatomy-demo";

/**
 * CHIPS & TOGGLES — the controls that pick among a few, or hold a few: Chip and
 * ChipInput, ToggleGroup, and Tabs. Split out of the old Primitives page, whose button
 * and surface half is on "Buttons & surfaces" (buttons-surfaces.tsx).
 *
 * As there, each specimen is its own small component, so the state that makes it
 * operable sits beside the thing it operates.
 */

/** The count pill a real strip hangs off `TabsProps.badge`. Lives here rather than
 *  in the kit because `badge` is a bare ReactNode — the kit deliberately ships no
 *  opinion about what a badge looks like, so the showcase has to bring its own. */
function CountPill({ children }: { children: number }) {
  return (
    <span className="rounded-full bg-[var(--bg-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

type PlainTab = "overview" | "activity" | "settings" | "docs";

function TabStrip() {
  const [active, setActive] = useState<PlainTab>("overview");
  return (
    <Example
      label="Tabs — controlled, with badges and a routed tab"
      hint="underline strip; the last tab is a real <a> you can ⌘/middle-click"
    >
      <Tabs<PlainTab>
        label="Workspace sections"
        active={active}
        onChange={setActive}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity", badge: <CountPill>{12}</CountPill> },
          { id: "settings", label: "Settings", badge: <CountPill>{3}</CountPill> },
          // `href` makes the tab an anchor so a modifier-click can open it in a new
          // window; a plain left click is still cancelled and routed through
          // `onChange`, so the switch stays client-side. Anchored at this page's own
          // section so the specimen is harmless to actually open.
          { id: "docs", label: "Docs", href: "#/chips-toggles" },
        ]}
      />
      <div className="pt-3 text-sm text-[var(--text-secondary)]">
        Panel for <span className="font-mono text-[var(--text-primary)]">{active}</span>.
      </div>
      <div className="mt-3">
        <Note>
          Arrow keys, Home and End move <em>focus</em> along the strip; activation stays on
          click, Enter and Space, because a tab can be a real route and arrowing across one
          must not navigate. <code className="font-mono">label</code> names the{" "}
          <code className="font-mono">role=&quot;tablist&quot;</code> group — leave it unset
          where a visible heading directly above already does that job. The kit renders no{" "}
          <code className="font-mono">role=&quot;tabpanel&quot;</code>: the panel is yours, and
          so is wiring <code className="font-mono">aria-controls</code> to it.
        </Note>
      </div>
    </Example>
  );
}

const REPORT_TABS = [
  { id: "all", label: "All reports", count: 42 },
  { id: "open", label: "Open", count: 12 },
  { id: "triage", label: "Needs triage", count: 5 },
  { id: "mine", label: "Assigned to me", count: 3 },
  { id: "waiting", label: "Waiting on reporter", count: 7 },
  { id: "blocked", label: "Blocked", count: 2 },
  { id: "planned", label: "Planned", count: 9 },
  { id: "shipped", label: "Shipped", count: 18 },
  { id: "declined", label: "Declined", count: 4 },
  { id: "archive", label: "Archive", count: 96 },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["id"];

function WrappedTabStrip() {
  const [active, setActive] = useState<ReportTab>("open");
  return (
    <Example
      label="Tabs — wrap"
      hint="ten tabs; narrow below 768px and the strip becomes wrapping chips"
    >
      <Tabs<ReportTab>
        wrap
        label="Report queues"
        active={active}
        onChange={setActive}
        tabs={REPORT_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          badge: <CountPill>{tab.count}</CountPill>,
        }))}
      />
      <div className="pt-3 text-sm text-[var(--text-secondary)]">
        Showing <span className="font-mono text-[var(--text-primary)]">{active}</span>.
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">wrap</code> cannot be done from a call site with a{" "}
          <code className="font-mono">className</code>, which is why it is a prop: the active
          marker has to change shape with the layout. The default marker is an underline riding
          the container&apos;s bottom rule, and a tab in any row but the last has no rule to
          wear — so a wrapped strip marks the active tab with a filled{" "}
          <code className="font-mono">--brand</code> chip instead. From{" "}
          <code className="font-mono">md</code> up the two strips are pixel-identical.
        </Note>
      </div>
    </Example>
  );
}

type ViewMode = "list" | "board" | "calendar";

function ToggleGroups() {
  const [view, setView] = useState<ViewMode>("board");
  const [locked, setLocked] = useState(false);
  return (
    <Example label="ToggleGroup — controlled" hint="role=radiogroup; value and onChange are required; aria-label names it">
      <div className="max-w-sm">
        <ToggleGroup<ViewMode>
          aria-label="View mode"
          value={view}
          onChange={setView}
          disabled={locked}
          // `optionClassName` tunes every segment; the per-option `className` is
          // merged after it, so "Calendar" wins the text-transform fight below.
          // That ordering is the whole contract between the two props.
          optionClassName="uppercase tracking-wide"
          options={[
            { value: "list", label: "List" },
            { value: "board", label: "Board" },
            { value: "calendar", label: "Calendar", className: "normal-case tracking-normal" },
          ]}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        showing: <span className="font-mono text-[var(--text-secondary)]">{view}</span>
      </p>
      <div className="mt-3">
        <Button variant="ghost" onClick={() => setLocked((v) => !v)}>
          {locked ? "Unlock the group" : "Lock the group"}
        </Button>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">disabled</code> is on the whole group, never per option —
          a segmented control with some live segments and some dead ones is a menu with holes
          in it. Lock it and the pressed segment <em>keeps its fill</em> while everything fades:
          a reader who can no longer see which option is chosen has been told less than before
          you disabled it. The 2px moat between segments is deliberate too — flush segments made
          a hovered neighbour and the selected chip read as one smeared shape.
        </Note>
      </div>
    </Example>
  );
}

type Settlement = "paid" | "pending";

function ToggleGroupUnset() {
  // The empty string is a real member of the value union, not a cast: the group's
  // "nothing chosen yet" shape needs a value that matches no option, and widening
  // the union is how you get one without lying to the type system.
  const [status, setStatus] = useState<Settlement | "">("");
  return (
    <Example
      label="ToggleGroup — nothing selected yet"
      hint="a value matching no option renders the group with nothing pressed"
    >
      <div className="max-w-xs">
        <ToggleGroup<Settlement | "">
          aria-label="Settlement status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "paid", label: "Paid" },
            { value: "pending", label: "Pending" },
          ]}
        />
      </div>
      <div className="mt-3">
        <Button variant="ghost" onClick={() => setStatus("")} disabled={status === ""}>
          Clear the selection
        </Button>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">value</code> is required, so the unset state is expressed
          by widening the union rather than by omitting the prop — a row whose status does not
          exist yet is a real case, and this is the shape it takes. Once chosen, a
          required group cannot be emptied from the keyboard or the pointer — only the caller
          can reset it, as the button does. For a group the USER may empty, see{" "}
          <code className="font-mono">allowEmpty</code> below. Hold options in a typed
          constant with the exported <code className="font-mono">ToggleOption&lt;T&gt;</code>.
        </Note>
      </div>
    </Example>
  );
}

type Queue = "open" | "mine" | "blocked";

const QUEUE_OPTIONS: ToggleOption<Queue>[] = [
  { value: "open", label: "Open" },
  { value: "mine", label: "Mine" },
  { value: "blocked", label: "Blocked" },
];

function ToggleGroupClearable() {
  const [filter, setFilter] = useState<Queue | null>("open");
  const [log, setLog] = useState<string[]>([]);
  return (
    <Example
      label="ToggleGroup — allowEmpty"
      hint="click the pressed option again to clear it; onChange receives null"
    >
      <div className="max-w-sm">
        <ToggleGroup
          allowEmpty
          aria-label="Filter the queue"
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setLog((l) => [String(next), ...l].slice(0, 4));
          }}
          options={QUEUE_OPTIONS}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        filter: <span className="font-mono text-[var(--text-secondary)]">{String(filter)}</span>
        {log.length > 0 && (
          <>
            {" "}· onChange calls, newest first:{" "}
            <span className="font-mono text-[var(--text-secondary)]">{log.join(", ")}</span>
          </>
        )}
      </p>
      <div className="mt-3">
        <Note>
          With <code className="font-mono">allowEmpty</code> the segments stop being radios:
          the group is <code className="font-mono">role=&quot;group&quot;</code> and each
          option a toggle button with <code className="font-mono">aria-pressed</code>, because
          a radio cannot be unchecked by pressing it again and nobody expects it to. The prop
          also changes the type — <code className="font-mono">value</code> may be{" "}
          <code className="font-mono">null</code> and <code className="font-mono">onChange</code>{" "}
          receives it — so a group that cannot emit null never makes its caller handle one.
        </Note>
      </div>
    </Example>
  );
}

export function ChipsToggles() {
  return (
    <>
      <Chips />
      <ChipInputDemo />
      <ChipInputOptions />
      <ChipsRtl />
      <ToggleGroups />
      <ToggleGroupUnset />
      <ToggleGroupClearable />
      <TabStrip />
      <WrappedTabStrip />
      <TabControls />
    </>
  );
}

/* ── Chip ─────────────────────────────────────────────────────────────────── */

const CHIP_TONES = [
  "neutral",
  "brand",
  "danger",
  "warning",
  "success",
  "info",
  "income",
  "expense",
] as const;

function Chips() {
  const [pressed, setPressed] = useState<string[]>(["Unpaid"]);
  const [removable, setRemovable] = useState(["invoices", "2026", "draft"]);
  const toggle = (v: string) =>
    setPressed((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <>
      <Example label="Chip — the three shapes" hint="inert, a link, or a toggle — decided by which prop you pass">
        <Row>
          <Chip icon={Tag}>inert</Chip>
          <Chip href="#/chips-toggles#chip-the-three-shapes" icon={Hash}>
            a link
          </Chip>
          {["Unpaid", "Overdue"].map((v) => (
            <Chip key={v} onClick={() => toggle(v)} selected={pressed.includes(v)} tone="brand">
              {v}
            </Chip>
          ))}
        </Row>
        <Note>
          One component, not three. A chip that is inert, a link and a toggle are the same
          object wearing different props — the shape <code className="font-mono">Button</code>{" "}
          already uses when it is given an <code className="font-mono">href</code>. Keeping
          them together is what stops an app growing three near-identical pills that drift.
          A chip is deliberately <em>not</em> a Button: a row of buttons reads as
          &ldquo;choose an action&rdquo;, a row of chips as &ldquo;here are the things&rdquo;.
        </Note>
      </Example>

      <Example label="Chip — tones and sizes" hint="every tone is a token pair, so a palette switch moves them">
        <div className="space-y-2">
          <Row>
            {CHIP_TONES.map((t) => (
              <Chip key={t} tone={t}>
                {t}
              </Chip>
            ))}
          </Row>
          <Row>
            {CHIP_TONES.map((t) => (
              <Chip key={t} tone={t} selected>
                {t} selected
              </Chip>
            ))}
          </Row>
          <Row>
            <Chip size="sm">small</Chip>
            <Chip size="md">medium</Chip>
            <Chip size="lg">large — 44px touch target</Chip>
            <Chip size="sm" tone="brand" selected icon={Star}>
              small, selected, with an icon
            </Chip>
          </Row>
        </div>
        <Note>
          <code className="font-mono">income</code> and <code className="font-mono">expense</code>{" "}
          are the money pair: only the text and border carry the tint, on the neutral
          chip&apos;s surfaces, so the chip does not smear into the amber or teal figure beside
          it. <code className="font-mono">lg</code> is the phone size — a{" "}
          <code className="font-mono">min-h-11</code> target for a filter row a thumb has to hit.
        </Note>
      </Example>

      <ChipStates />

      <Example label="Chip — removable" hint="the dismiss button is named after the value it removes">
        <Row>
          {removable.map((v) => (
            <Chip key={v} tone="neutral" onRemove={() => setRemovable((r) => r.filter((x) => x !== v))}>
              {v}
            </Chip>
          ))}
          {removable.length === 0 && (
            <Button variant="ghost" onClick={() => setRemovable(["invoices", "2026", "draft"])}>
              Put them back
            </Button>
          )}
        </Row>
        <Note>
          Each dismiss button is labelled <em>Remove: invoices</em>, not
          &ldquo;Remove&rdquo;. A row of eight otherwise gives a screen-reader user eight
          buttons with the same name and no way to tell which one they are on. When a chip
          is also a link, the × is a SIBLING rather than a nested button — a button inside
          an anchor is invalid HTML and browsers disagree about what it does.
        </Note>
      </Example>
    </>
  );
}

function ChipStates() {
  const [inflow, setInflow] = useState(false);
  const [filters, setFilters] = useState(["Overdue", "EUR"]);
  const [on, setOn] = useState<string[]>(["Overdue"]);
  const [log, setLog] = useState("—");
  const [locked, setLocked] = useState(true);
  return (
    <Example
      label="Chip — states and combinations"
      hint="action vs toggle, current link, remove beside a link or a toggle, disabled"
    >
      <div className="space-y-3">
        <Row>
          {/* An ACTION, not a toggle: no `selected`, so no aria-pressed — the label and
              tone follow the state and aria-label names what a press will do. */}
          <Chip
            tone={inflow ? "income" : "expense"}
            onClick={() => {
              setInflow((v) => !v);
              setLog(`direction → ${inflow ? "outflow" : "inflow"}`);
            }}
            aria-label={inflow ? "Direction: inflow — tap for outflow" : "Direction: outflow — tap for inflow"}
          >
            {inflow ? "+ Inflow" : "− Outflow"}
          </Chip>
          <Chip href="#/chips-toggles#chip-states-and-combinations" tone="brand" selected>
            this section (aria-current)
          </Chip>
          <Chip href="#/chips-toggles#chip-the-three-shapes" tone="brand">
            another section
          </Chip>
        </Row>
        <Row>
          {filters.map((f) => (
            <Chip
              key={f}
              tone="brand"
              selected={on.includes(f)}
              onClick={() => {
                setOn((o) => (o.includes(f) ? o.filter((x) => x !== f) : [...o, f]));
                setLog(`toggle ${f}`);
              }}
              onRemove={() => {
                setFilters((l) => l.filter((x) => x !== f));
                setLog(`remove ${f}`);
              }}
            >
              {f}
            </Chip>
          ))}
          <Chip href="#/chips-toggles#chip-states-and-combinations" icon={Hash} onRemove={() => setLog("remove the pinned link")}>
            pinned link
          </Chip>
          <Chip icon={Pin} onRemove={() => setLog("remove, custom label")} removeLabel="Unpin">
            <em>not plain text</em>
          </Chip>
          {filters.length < 2 && (
            <Button variant="ghost" onClick={() => setFilters(["Overdue", "EUR"])}>
              Restore the filters
            </Button>
          )}
        </Row>
        <Row>
          <Chip disabled={locked} icon={Tag}>
            inert
          </Chip>
          <Chip disabled={locked} href="#/chips-toggles#chip-states-and-combinations">
            link
          </Chip>
          <Chip disabled={locked} tone="brand" selected onClick={() => setLog("disabled toggle clicked")}>
            toggle
          </Chip>
          <Chip disabled={locked} onRemove={() => setLog("disabled remove clicked")}>
            removable
          </Chip>
          <Button variant="ghost" onClick={() => setLocked((v) => !v)}>
            {locked ? "Enable the row" : "Disable the row"}
          </Button>
        </Row>
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        last event: <span className="font-mono text-[var(--text-secondary)]">{log}</span>
      </p>
      <Note>
        The first chip is the <em>action</em> shape: with <code className="font-mono">onClick</code>{" "}
        and no <code className="font-mono">selected</code> it reports no pressed state at all,
        so its label may follow the state. The two links mark the current one with{" "}
        <code className="font-mono">aria-current</code>. A remove beside a link or a toggle is a
        sibling button, not a nested one, and removing never follows the link. A chip whose
        content is not plain text has no value to name its × after, so it falls back to{" "}
        <code className="font-mono">removeLabel</code> (here &ldquo;Unpin&rdquo;) — otherwise the
        provider&apos;s <code className="font-mono">common.remove</code>. A disabled link renders
        as an inert span, so it cannot be followed at all.
      </Note>
    </Example>
  );
}

/* ── ChipInput ────────────────────────────────────────────────────────────── */

function ChipInputDemo() {
  // The translated label bundle, threaded into the component exactly as a consuming app
  // has to do it. The page frame being French while the components stayed English was the
  // gap this closes: the kit ships no catalogue, so the app owns every string it shows.
  const t = useT();
  const [tags, setTags] = useState(["invoices", "2026"]);
  const [emails, setEmails] = useState<string[]>([]);
  const [capped, setCapped] = useState(["one", "two"]);

  return (
    <Example label="ChipInput" hint="a field whose value is a list — the keyboard model is the component">
      <div className="grid gap-4 md:grid-cols-2">
        <ChipInput
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="Type and press Enter"
          tone="brand"
          labels={t.kit.chipInput}
        />
        <ChipInput
          label="Recipients"
          value={emails}
          onChange={setEmails}
          placeholder="Paste a comma-separated list"
          validate={(v) => (v.includes("@") ? null : "That is not an email address")}
          labels={t.kit.chipInput}
        />
        <ChipInput
          label="At most three"
          value={capped}
          onChange={setCapped}
          max={3}
          labels={t.kit.chipInput}
        />
        <ChipInput label="Disabled" value={["locked"]} onChange={() => {}} disabled />
      </div>
      <Note>
        <strong>Backspace on an empty field moves to the last chip; it does not delete it.</strong>{" "}
        Deleting straight away is the commoner choice and it is a trap: a destructive action
        on a key people hit by reflex, with no feedback, on a value that may have taken a
        while to type. Moving focus first makes the second Backspace a deliberate one — and
        it is what lets a keyboard user reach a chip at all. Arrows move between chips,
        Escape clears the draft without touching the committed values, blur commits (losing
        what you typed because you clicked away is the usual complaint about this pattern),
        and a pasted list splits on the separators as ONE change rather than one per item.
      </Note>
    </Example>
  );
}

function ChipInputOptions() {
  const [keywords, setKeywords] = useState(["tax", "tax"]);
  const [codes, setCodes] = useState(["DE", "FR"]);
  const [small, setSmall] = useState(["sm", "chips"]);
  const [large, setLarge] = useState(["lg"]);
  const [cc, setCc] = useState<string[]>([]);
  const missing = cc.length === 0;
  return (
    <Example
      label="ChipInput — separators, duplicates, sizes and errors"
      hint="semicolon and space commit; duplicates allowed; error wires aria-describedby"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ChipInput
          label="Keywords (; or space commits, duplicates allowed)"
          value={keywords}
          onChange={setKeywords}
          separators={[";", " "]}
          allowDuplicates
          tone="info"
          placeholder="tax; receipt; 2026"
        />
        <ChipInput
          label="Country codes (two capitals)"
          value={codes}
          onChange={setCodes}
          validate={(v) => (/^[A-Z]{2}$/.test(v) ? null : `${v} is not a two-letter code`)}
          invalid={codes.length === 0}
          tone="success"
        />
        <ChipInput label="Small" value={small} onChange={setSmall} size="sm" />
        <ChipInput label="Large (phone)" value={large} onChange={setLarge} size="lg" tone="brand" />
        {/* No visible label: `aria-label` names the inner <input>, not the wrapper. */}
        <ChipInput
          aria-label="Copy to"
          value={cc}
          onChange={setCc}
          placeholder="Copy to… (no visible label)"
          error={missing ? "Add at least one recipient." : undefined}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        values:{" "}
        <span className="font-mono text-[var(--text-secondary)]">
          {JSON.stringify({ keywords, codes, cc })}
        </span>
      </p>
      <Note>
        <code className="font-mono">separators</code> replaces the default comma — here both{" "}
        <code className="font-mono">;</code> and a space commit, and a pasted{" "}
        <code className="font-mono">a;b c</code> splits into three chips.{" "}
        <code className="font-mono">allowDuplicates</code> keeps the second &ldquo;tax&rdquo;;
        without it a repeat is refused. <code className="font-mono">invalid</code> paints the
        frame only (clear the codes to see it); <code className="font-mono">error</code> implies
        it and adds the text below, wired to the input with{" "}
        <code className="font-mono">aria-describedby</code>. A rejection from{" "}
        <code className="font-mono">validate</code>, <code className="font-mono">max</code> or a
        duplicate is only <em>announced</em> — the draft stays in the field, but no visible
        message appears unless the caller shows one through <code className="font-mono">error</code>.
      </Note>
    </Example>
  );
}

function ChipsRtl() {
  const [tags, setTags] = useState(["فاتورة", "٢٠٢٦", "مسودة"]);
  return (
    <Example label="Chip and ChipInput — right-to-left" hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}>
      <div dir="rtl" className="max-w-md space-y-3">
        <Row>
          <Chip icon={Tag}>وسم</Chip>
          <Chip tone="brand" selected onClick={() => undefined} onRemove={() => undefined}>
            غير مدفوعة
          </Chip>
          <Chip href="#/chips-toggles#chip-and-chipinput-right-to-left" icon={Hash} onRemove={() => undefined}>
            رابط
          </Chip>
        </Row>
        <ChipInput label="الوسوم" value={tags} onChange={setTags} placeholder="اكتب ثم Enter" />
      </div>
      <Note>
        The icon leads and the × trails in the reading direction, because the chip is a flex
        row. Two things are still physical and worth watching here: the × button&apos;s
        margins and the body&apos;s reduced end padding beside it are{" "}
        <code className="font-mono">mr</code>/<code className="font-mono">ml</code>/
        <code className="font-mono">pr</code> rather than logical, so in RTL the × hugs the
        wrong side by a couple of pixels; and in the field, ← still moves to the
        <em> previous</em> chip in DOM order, which in RTL is the chip to the right.
      </Note>
    </Example>
  );
}
