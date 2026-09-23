import { useRef, useState } from "react";
import { Bell, Copy, Ellipsis, Hash, Pencil, Star, Tag, Trash2 } from "lucide-react";
import {
  AlertBanner,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Chip,
  ChipInput,
  EmptyState,
  IconButton,
  Spinner,
  Tabs,
  ToggleGroup,
  UserAvatar,
  alertFrameClass,
  avatarInitials,
  buttonClasses,
  toneFrameClass,
} from "@eifi1/ui-kit";
import type { AlertTone, ButtonVariant } from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row } from "../lib/section";
import { useT } from "../i18n";

/**
 * PRIMITIVES — the pieces the rest of the kit is built from.
 *
 * Each specimen is its own small component rather than one function holding two
 * dozen `useState` calls: the state that makes a specimen operable then sits
 * beside the thing it operates, and a reader can lift one block out of this file
 * into their own app without untangling it from the eleven blocks around it.
 */

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "brand"];

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

function ButtonVariants() {
  const [last, setLast] = useState<ButtonVariant | null>(null);
  return (
    <Example
      label="Button — the five variants"
      hint="only danger and brand leave the neutral tokens"
    >
      <Row>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} onClick={() => setLast(variant)}>
            {variant}
          </Button>
        ))}
      </Row>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        {last ? (
          <>
            last pressed: <span className="font-mono text-[var(--text-secondary)]">{last}</span>
          </>
        ) : (
          "press one — every specimen on this page is wired to real state"
        )}
      </p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">primary</code> is the warm bordered chip, not a
          saturated fill — <code className="font-mono">brand</code> is the solid accent, kept
          for the one strong call to action on a screen. Both draw from the palette tokens, so
          they move when you switch preset in the top bar. <code className="font-mono">danger</code>{" "}
          is hard-coded red on purpose: destructive is a semantic, not a brand colour, and a
          palette that made it green would be a bug.
        </Note>
      </div>
    </Example>
  );
}

function ButtonStretch() {
  return (
    <Example
      label="Button — stretch"
      hint="self-stretch; only visible in a flex row where something else is taller"
    >
      {/* Not <Row>: Row is items-center, which is exactly the alignment `stretch`
          exists to override. A hand-rolled items-start row is what makes the
          difference between the two buttons show at all. */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-16 min-w-40 items-center rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 text-xs text-[var(--text-muted)]">
          a 64px-tall field
        </div>
        <Button variant="secondary">without stretch</Button>
        <Button variant="secondary" stretch>
          with stretch
        </Button>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">stretch</code> adds nothing but{" "}
          <code className="font-mono">self-stretch</code>. Outside a flex row — or where the
          button is already the tallest item — it is a no-op, which is why a specimen for it
          needs a taller neighbour to stand next to.
        </Note>
      </div>
    </Example>
  );
}

function ButtonDisabled() {
  const [blocked, setBlocked] = useState(true);
  return (
    <Example label="Button — disabled" hint="opacity-50 + cursor-not-allowed, from the shared base">
      <Row>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant} disabled={blocked}>
            {variant}
          </Button>
        ))}
      </Row>
      <div className="mt-3">
        <Button variant="ghost" onClick={() => setBlocked((v) => !v)}>
          {blocked ? "Enable the row" : "Disable the row"}
        </Button>
      </div>
    </Example>
  );
}

function ButtonClasses() {
  return (
    <Example
      label="buttonClasses()"
      hint="for the element <Button> cannot render — a router Link, a Radix action"
    >
      {/* A real anchor, not a mock-up: this is the whole point of the helper — the
          styling lands on an element that is genuinely not a <button>, and still
          has to be indistinguishable from one. */}
      <Row>
        <a className={buttonClasses("secondary")} href="#primitives">
          an &lt;a&gt; wearing buttonClasses(&quot;secondary&quot;)
        </a>
        <a className={buttonClasses("brand")} href="#foundations">
          …and buttonClasses(&quot;brand&quot;)
        </a>
      </Row>
      <div className="mt-4">
        <ConstList
          items={VARIANTS.map((variant) => [`buttonClasses("${variant}")`, buttonClasses(variant)])}
        />
      </div>
      <div className="mt-3">
        <Note>
          These strings are computed live by the real helper, not transcribed — if the base
          ring or a variant changes, this list changes with it. The helper defaults to{" "}
          <code className="font-mono">primary</code>, so{" "}
          <code className="font-mono">buttonClasses()</code> is the first row above. Prefer{" "}
          <code className="font-mono">&lt;Button&gt;</code> anywhere a real button element
          works.
        </Note>
      </div>
    </Example>
  );
}

function IconButtons() {
  const [starred, setStarred] = useState(false);
  const starRef = useRef<HTMLButtonElement>(null);
  return (
    <Example
      label="IconButton"
      hint="square box, icon locked to 20px, ref forwarded to the <button>"
    >
      <Row>
        <IconButton
          ref={starRef}
          aria-pressed={starred}
          aria-label={starred ? "Unstar" : "Star"}
          title={starred ? "Unstar" : "Star"}
          variant={starred ? "brand" : "ghost"}
          onClick={() => setStarred((v) => !v)}
        >
          <Star fill={starred ? "currentColor" : "none"} />
        </IconButton>
        <IconButton variant="secondary" aria-label="Edit" title="Edit">
          <Pencil />
        </IconButton>
        <IconButton variant="primary" aria-label="Copy" title="Copy">
          <Copy />
        </IconButton>
        <IconButton variant="danger" aria-label="Delete" title="Delete">
          <Trash2 />
        </IconButton>
        <IconButton size="sm" variant="secondary" aria-label="Notifications" title="sm — 32px box">
          <Bell />
        </IconButton>
        {/* The glyph asks for 12px and gets 20px: `[&_svg]:size-5` on the box is a
            descendant selector, so it outranks the child's own single-class
            utility. That is the lock the kit wanted — icon buttons across the app
            cannot drift apart because one call site under-sized its icon. */}
        <IconButton variant="ghost" aria-label="An under-sized glyph" title="size-3 on the icon">
          <Star className="size-3" />
        </IconButton>
      </Row>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => starRef.current?.focus()}>
          Focus the star via its ref
        </Button>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">IconButton</code> is a{" "}
          <code className="font-mono">forwardRef</code> — the button above is focused by a real
          ref, not by a query selector. It carries no label of its own, so every specimen here
          needs an <code className="font-mono">aria-label</code>; the box is 36px at{" "}
          <code className="font-mono">md</code> (matching the top bar) and 32px at{" "}
          <code className="font-mono">sm</code>, while the icon stays 20px in both.
        </Note>
      </div>
    </Example>
  );
}

function PlanCard() {
  const [seats, setSeats] = useState(12);
  const [autoRenew, setAutoRenew] = useState(true);
  return (
    <Example
      label="Card — the whole family, composed"
      hint="Card is padding-less; the sub-parts own the rhythm"
    >
      <Card className="max-w-md">
        <CardHeader>
          {/* CardTitle sets weight and leading only — no colour — so it inherits.
              Spelling the token out here keeps the card legible inside this page's
              own surface instead of relying on whatever wraps it. */}
          <CardTitle className="text-[var(--text-primary)]">Team plan</CardTitle>
          <CardDescription>Billed monthly · renews 14 October</CardDescription>
          <CardAction>
            <IconButton size="sm" variant="ghost" aria-label="Plan options" title="Plan options">
              <Ellipsis />
            </IconButton>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Seats</dt>
              <dd className="font-medium text-[var(--text-primary)]">{seats}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-secondary)]">Auto-renew</dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {autoRenew ? "On" : "Off"}
              </dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="gap-2 pt-4">
          <Button variant="brand" onClick={() => setSeats((n) => n + 1)}>
            Add a seat
          </Button>
          <Button variant="secondary" onClick={() => setAutoRenew((v) => !v)}>
            {autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-3">
        <Note>
          <code className="font-mono">CardHeader</code> is a grid, not a flex row, and switches
          to two columns only when a <code className="font-mono">CardAction</code> is present —
          that is what lets the action sit top-right across both title and description rows
          without the title having to know it is there.{" "}
          <code className="font-mono">CardContent</code> pads its own bottom only as the{" "}
          <em>last</em> child, so a card without a footer still closes properly; add your own
          top padding between header and content, as this card does.
        </Note>
      </div>
    </Example>
  );
}

function FlushCard() {
  return (
    <Example
      label="Card — flush"
      hint="drops the radius, side borders and shadow below 768px; narrow the window to see it"
    >
      <Card flush>
        <CardContent className="py-4 text-sm text-[var(--text-secondary)]">
          On a phone this spans the viewport edge to edge with only a top and bottom rule; from{" "}
          <code className="font-mono">md</code> up it is an ordinary card again. For primary
          content on a data page — not for a centred dialog panel, which should keep its
          chrome at every width.
        </CardContent>
      </Card>
    </Example>
  );
}

function SpinnerDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <Example label="Spinner" hint="a bare ring — size and thickness come from className">
      <Row>
        <Spinner />
        <Spinner className="size-4 border-2" />
        <Spinner className="size-8 border-4" />
        <Button variant="primary" onClick={() => setBusy((v) => !v)} disabled={busy}>
          {busy && <Spinner className="size-4 border-2" />}
          {busy ? "Saving…" : "Save"}
        </Button>
        {busy && (
          <Button variant="ghost" onClick={() => setBusy(false)}>
            Finish
          </Button>
        )}
      </Row>
      <div className="mt-3">
        <Note>
          The busy state here is a plain toggle rather than a timer — nothing on this page
          should depend on a clock, because the render test mounts every section at once. In an
          app, drive it from your request&apos;s pending flag. Note that{" "}
          <code className="font-mono">Spinner</code> paints from Tailwind&apos;s slate scale
          rather than the kit&apos;s tokens, so it is the one thing in this specimen that does{" "}
          <em>not</em> move when you switch palette.
        </Note>
      </div>
    </Example>
  );
}

const SAMPLE_ROWS = ["Invoice 2024-114", "Invoice 2024-115", "Invoice 2024-116"];

function EmptyStateDemo() {
  const [rows, setRows] = useState<string[]>([]);
  return (
    <Example label="EmptyState" hint="title is required; hint is the optional second line">
      {rows.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Imported invoices will appear here." />
      ) : (
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {rows.map((row) => (
            <li key={row} className="font-mono">
              {row}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={() => setRows((current) => (current.length === 0 ? SAMPLE_ROWS : []))}
        >
          {rows.length === 0 ? "Import three invoices" : "Clear the list"}
        </Button>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">EmptyState</code> takes strings, not nodes — there is no
          slot for a call-to-action button inside it, so put the action beside it as above.
          Like <code className="font-mono">Spinner</code>, its dashed frame and text are
          Tailwind slate rather than tokens, so it stays put across palettes.
        </Note>
      </div>
    </Example>
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
          { id: "docs", label: "Docs", href: "#primitives" },
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

const PEOPLE: Array<{ name?: string | null; email?: string | null }> = [
  { name: "Marcel Eifert", email: "marcel@example.com" },
  { name: "Ada", email: "ada@example.com" },
  { name: "  ", email: "grace.hopper@example.com" },
  { name: null, email: null },
];

function Avatars() {
  return (
    <Example label="UserAvatar" hint="aria-hidden — it is decoration, never the accessible name">
      <Row className="items-end">
        <UserAvatar size="sm" name="Marcel Eifert" />
        <UserAvatar size="md" name="Marcel Eifert" />
        <UserAvatar size="lg" name="Marcel Eifert" />
        <UserAvatar name={null} email="grace.hopper@example.com" />
        <UserAvatar />
        {/* Purely presentational, so the account-menu trigger is a button the
            caller brings; the avatar goes inside it. The button carries the name. */}
        <IconButton aria-label="Account menu — Marcel Eifert" title="Account menu" className="p-0">
          <UserAvatar size="sm" name="Marcel Eifert" />
        </IconButton>
      </Row>
      <div className="mt-3">
        <Note>
          The chip is <code className="font-mono">aria-hidden</code> on purpose — two letters
          read aloud are noise — so whatever wraps it has to carry the name, as the last
          specimen does. Its fill is Tailwind slate rather than a token, so it does not follow
          the palette.
        </Note>
      </div>
    </Example>
  );
}

function AvatarInitials() {
  return (
    <Example label="avatarInitials()" hint="name first, then email; blank counts as absent">
      <OutTable
        rows={PEOPLE.map((person) => [
          `avatarInitials(${JSON.stringify(person.name)}, ${JSON.stringify(person.email)})`,
          avatarInitials(person.name, person.email),
        ])}
      />
      <div className="mt-3">
        <Note>
          The third row is the one worth reading: a whitespace-only display name falls through
          to the email. An earlier version used <code className="font-mono">name ?? email</code>
          , and <code className="font-mono">??</code> only falls through on null or undefined —
          so a user whose profile name was an empty string got &quot;?&quot; while the kit had
          a perfectly good address in hand. Results here are computed by the real function.
        </Note>
      </div>
    </Example>
  );
}

const ALL_TONES: AlertTone[] = ["danger", "warning", "neutral"];

function Alerts() {
  return (
    <Example label="AlertBanner" hint="danger and warning only — neutral is not a banner tone">
      <div className="space-y-3">
        <AlertBanner tone="danger">
          This import would overwrite 14 reconciled payments. Nothing has been written yet.
        </AlertBanner>
        <AlertBanner tone="warning">
          Three rows have no currency and will be skipped.
        </AlertBanner>
        <AlertBanner>Omitting the tone gives you danger, which is the default.</AlertBanner>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">AlertTone</code> has three members but{" "}
          <code className="font-mono">AlertBanner</code>&apos;s prop is{" "}
          <code className="font-mono">Exclude&lt;AlertTone, &quot;neutral&quot;&gt;</code> — the
          neutral frame exists for callers that own their own box, not for a banner with a
          warning triangle in it. Its rose/amber palette is deliberately not tokenised:
          &quot;this is dangerous&quot; is a semantic, and a preset that recoloured it would be
          lying.
        </Note>
      </div>
    </Example>
  );
}

function ToneFrames() {
  return (
    <Example
      label="toneFrameClass() / alertFrameClass()"
      hint="the frame without the banner — for a box that already has its own radius and padding"
    >
      <div className="space-y-3">
        {ALL_TONES.map((tone) => (
          <div key={tone} className={`${alertFrameClass(tone)} text-sm text-[var(--text-primary)]`}>
            <span className="font-mono">alertFrameClass(&quot;{tone}&quot;)</span> — radius and
            padding included.
          </div>
        ))}
        {/* toneFrameClass is the same border and surface with the box geometry left
            to the caller: here a rounded-xl well with its own generous padding,
            which alertFrameClass could not have produced. */}
        <div
          className={`${toneFrameClass("warning")} rounded-xl px-5 py-4 text-sm text-[var(--text-primary)]`}
        >
          <span className="font-mono">toneFrameClass(&quot;warning&quot;)</span> on a box that
          brought its own <span className="font-mono">rounded-xl px-5 py-4</span>.
        </div>
      </div>
      <div className="mt-4">
        <ConstList
          items={ALL_TONES.map((tone) => [`alertFrameClass("${tone}")`, alertFrameClass(tone)])}
        />
      </div>
      <div className="mt-3">
        <Note>
          The coloured tones carry a <strong>2px</strong> border and{" "}
          <code className="font-mono">p-[11px]</code>; neutral carries 1px and{" "}
          <code className="font-mono">p-3</code>. That odd 11 is the point: a 1px border is 1.25
          device pixels at the usual 125% Windows scaling, so it renders solid on one edge and
          half-lit on the other depending on where the box lands — the bug behind four separate
          reports. 2px always covers two whole pixels, and the pixel is taken back out of the
          padding so switching tones never shifts the layout. If you use{" "}
          <code className="font-mono">toneFrameClass</code> you owe that compensation yourself.
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
    <Example label="ToggleGroup — controlled" hint="role=radiogroup; value and onChange are required">
      <div className="max-w-sm">
        <ToggleGroup<ViewMode>
          ariaLabel="View mode"
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
          ariaLabel="Settlement status"
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
          exist yet is a real case, and this is the shape it takes. Neither{" "}
          <code className="font-mono">ToggleGroupProps</code> nor its option type is exported,
          so an app that wants to hold its options in a typed constant has to re-declare the
          shape.
        </Note>
      </div>
    </Example>
  );
}

export function Primitives() {
  return (
    <>
      <ButtonVariants />
      <ButtonStretch />
      <ButtonDisabled />
      <ButtonClasses />
      <IconButtons />
      <PlanCard />
      <FlushCard />
      <SpinnerDemo />
      <EmptyStateDemo />
      <TabStrip />
      <WrappedTabStrip />
      <Avatars />
      <AvatarInitials />
      <Alerts />
      <ToneFrames />
      <ToggleGroups />
      <ToggleGroupUnset />
      <Chips />
      <ChipInputDemo />
    </>
  );
}

/* ── Chip ─────────────────────────────────────────────────────────────────── */

const CHIP_TONES = ["neutral", "brand", "danger", "warning", "success", "info"] as const;

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
          <Chip href="#chip-the-three-shapes" icon={Hash}>
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
            <Chip size="sm" tone="brand" selected icon={Star}>
              small, selected, with an icon
            </Chip>
          </Row>
        </div>
      </Example>

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
