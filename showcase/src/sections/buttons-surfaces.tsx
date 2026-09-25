import { useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Ellipsis,
  Expand,
  Heart,
  Info,
  Link2,
  Minus,
  Pencil,
  Plus,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  ButtonGroup,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  IconButton,
  Spinner,
  UserAvatar,
  avatarInitials,
  buttonClasses,
} from "@eifi1/ui-kit";
import type { ButtonVariant } from "@eifi1/ui-kit";
import { ConstList, Example, Note, OutTable, Row } from "../lib/section";
import { IconButtonControls } from "./field-anatomy-demo";

/**
 * BUTTONS & SURFACES — the pieces the rest of the kit is built from: the button family,
 * the card, and the small surfaces that say "loading", "nothing here", "who" and "look".
 * Chips, toggle groups and tabs — the controls that pick among a few — are on
 * "Chips & toggles" (chips-toggles.tsx).
 *
 * Each specimen is its own small component rather than one function holding two
 * dozen `useState` calls: the state that makes a specimen operable then sits
 * beside the thing it operates, and a reader can lift one block out of this file
 * into their own app without untangling it from the eleven blocks around it.
 */

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "brand", "link"];

function ButtonVariants() {
  const [last, setLast] = useState<ButtonVariant | null>(null);
  return (
    <Example
      label="Button — the six variants"
      hint="only danger, brand and link leave the neutral tokens"
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
          paints from the semantic <code className="font-mono">--danger</code> family instead:
          destructive is a meaning, not a brand colour, so a preset does not move it — but a
          consumer can re-point that one family on purpose. <code className="font-mono">link</code>{" "}
          (0.8.0) drops the box altogether — see &ldquo;Button — link&rdquo; below.
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

function ButtonRef() {
  // `ref` reaches the <button> itself — React 19 passes it as an ordinary prop.
  const saveRef = useRef<HTMLButtonElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <Example label="Button — ref" hint="the <button> element, for focus and measuring from outside">
      <Row>
        <Button variant="ghost" onClick={() => saveRef.current?.focus()}>
          Focus the Save button
        </Button>
        <Button
          ref={saveRef}
          variant="brand"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          Save
        </Button>
      </Row>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Save is focused: <span className="font-mono text-[var(--text-secondary)]">{String(focused)}</span>{" "}
        — the first button calls <code className="font-mono">saveRef.current.focus()</code>.
      </p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">ButtonProps</code> declares{" "}
          <code className="font-mono">ref?: Ref&lt;HTMLButtonElement&gt;</code>. React 19 hands a
          function component its <code className="font-mono">ref</code> as a prop, so it rides onto
          the element with no <code className="font-mono">forwardRef</code>; the declaration only
          makes TypeScript accept it — before 0.7.0 this line did not compile.
        </Note>
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
        <a className={buttonClasses("secondary")} href="#/buttons#buttonclasses">
          an &lt;a&gt; wearing buttonClasses(&quot;secondary&quot;)
        </a>
        <a className={buttonClasses("brand")} href="#/tokens">
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
    <Example label="Spinner" hint="role=status with spoken text; label={null} makes it decoration">
      <Row>
        <Spinner />
        <Spinner className="size-4 border-2" label="Refreshing the balances" />
        <Spinner className="size-8 border-4" />
        {/* Inside a button whose text already says it: decorative, or the button's
            name becomes "Loading… Saving…". */}
        <Button variant="primary" onClick={() => setBusy((v) => !v)} disabled={busy}>
          {busy && <Spinner className="size-4 border-2" label={null} />}
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
          app, drive it from your request&apos;s pending flag. The first three spinners are
          polite live regions: the first says the provider&apos;s{" "}
          <code className="font-mono">common.loading</code> (it changes with the page
          language), the second its own <code className="font-mono">label</code>. The one in
          the button is <code className="font-mono">label={"{null}"}</code> — hidden from
          assistive tech, because the button&apos;s text already says &ldquo;Saving…&rdquo;.
          The ring paints from <code className="font-mono">--border</code> and{" "}
          <code className="font-mono">--text-primary</code>, so it follows the palette.
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
    <Example label="UserAvatar" hint="three sizes; aria-hidden by default, opt out when it stands alone">
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
        {/* Standing ALONE (an assignee column): nothing beside it says who it is, so
            the default aria-hidden is switched off and the avatar names itself. */}
        <UserAvatar
          size="sm"
          name="Ada Lovelace"
          aria-hidden={false}
          role="img"
          aria-label="Assigned to Ada Lovelace"
          title="Assigned to Ada Lovelace"
        />
      </Row>
      <div className="mt-3">
        <Note>
          The chip is <code className="font-mono">aria-hidden</code> on purpose — two letters
          read aloud are noise — so whatever wraps it has to carry the name, as the account-menu
          button does. That is a default, not an invariant: the last avatar stands alone, so it
          passes <code className="font-mono">aria-hidden={"{false}"}</code> with its own{" "}
          <code className="font-mono">aria-label</code>, which the spread lets win. Sizes are{" "}
          <code className="font-mono">sm</code> 28px, <code className="font-mono">md</code> 32px
          (the default), <code className="font-mono">lg</code> 48px; the fill is the inverse
          token pair.
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


function LinkVariant() {
  const [shown, setShown] = useState(false);
  return (
    <Example label="Button — link" hint='variant="link": no box, no padding — an action that reads as a word in a sentence'>
      <p className="text-sm text-[var(--text-secondary)]">
        Twelve rows could not be matched to a payee.{" "}
        <Button variant="link" onClick={() => setShown((v) => !v)}>
          {shown ? "Hide them" : "Show them"}
        </Button>
      </p>
      {shown && (
        <ul className="mt-2 list-disc ps-5 font-mono text-xs text-[var(--text-muted)]">
          <li>2026-09-02 · SEPA 4410</li>
          <li>2026-09-03 · CARD 7781</li>
          <li>…ten more</li>
        </ul>
      )}
      <div className="mt-3">
        <Note>
          A real <code className="font-mono">&lt;button&gt;</code> that looks like a link — for an
          action inside running text, where a boxed button would break the line. It keeps the focus
          ring (on a small radius) and the <code className="font-mono">--brand</code> colour, so the
          palette switch reaches it. For navigation use a real anchor, not this.
        </Note>
      </div>
    </Example>
  );
}

/** A fixed gradient stands in for a photo, so the specimen needs no image asset. */
const PHOTO_GRADIENT = "linear-gradient(135deg, #0f766e 0%, #155e75 45%, #f59e0b 100%)";

function OverlayIconButtons() {
  const [liked, setLiked] = useState(false);
  const [removed, setRemoved] = useState(false);
  return (
    <Example label="IconButton — overlay" hint='variant="overlay": a round translucent disc over an image, legible on any photo'>
      <div className="flex flex-wrap gap-4">
        {removed ? (
          <div className="flex h-40 w-64 max-w-full items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
            <Button variant="link" onClick={() => setRemoved(false)}>
              Put the photo back
            </Button>
          </div>
        ) : (
          <div className="relative h-40 w-64 max-w-full overflow-hidden rounded-lg" style={{ background: PHOTO_GRADIENT }}>
            <div className="absolute end-2 top-2 flex gap-1.5">
              <IconButton
                variant="overlay"
                size="sm"
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
                onClick={() => setLiked((v) => !v)}
              >
                <Heart fill={liked ? "currentColor" : "none"} />
              </IconButton>
              <IconButton variant="overlay" size="sm" aria-label="Remove photo" onClick={() => setRemoved(true)}>
                <X />
              </IconButton>
            </div>
            <div className="absolute bottom-2 start-2">
              <IconButton variant="overlay" size="lg" aria-label="View full size">
                <Expand />
              </IconButton>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3">
        <Note>
          The disc is <code className="font-mono">--bg-inverse</code> at 60% with a backdrop blur
          and <code className="font-mono">--text-inverse</code> ink, so it contrasts with the photo
          rather than with the page — the dark theme flips both. The large one is{" "}
          <code className="font-mono">size=&quot;lg&quot;</code>, the 44px phone target.
        </Note>
      </div>
    </Example>
  );
}

function InsetCard() {
  return (
    <Example label="Card — inset" hint='variant="inset": a panel inside a card — surface-2, small radius, its own p-3, no border'>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-[var(--text-primary)]">Loan calculation</CardTitle>
          <CardDescription>Annuity, 20 years, 3.4 % fixed</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <Card variant="inset">
            <p className="text-xs text-[var(--text-muted)]">Monthly rate</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">1,149.62 €</p>
          </Card>
          <Card variant="inset" className="p-4">
            <p className="text-xs text-[var(--text-muted)]">Total interest</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">75,908.80 €</p>
          </Card>
        </CardContent>
      </Card>
      <div className="mt-3">
        <Note>
          Unlike the default card, an inset one brings its padding, because every hand-written
          copy (<code className="font-mono">rounded-md bg-surface-2 p-3</code>) wanted the same one;
          a caller&apos;s <code className="font-mono">p-*</code> still wins, as the second panel&apos;s{" "}
          <code className="font-mono">p-4</code> does. <code className="font-mono">flush</code> is
          ignored: an inset panel never runs edge to edge.
        </Note>
      </div>
    </Example>
  );
}

type Align = "left" | "center" | "right";

function ButtonGroups() {
  const [zoom, setZoom] = useState(10);
  const [align, setAlign] = useState<Align>("left");
  const [allOpen, setAllOpen] = useState<boolean | null>(null);
  return (
    <Example
      label="ButtonGroup"
      hint='role="group" named by aria-label; one frame, hairline dividers, rounded only outside — every member keeps its tab stop'
    >
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">horizontal · Buttons</p>
          <ButtonGroup aria-label="Categories">
            <Button variant="secondary" onClick={() => setAllOpen(false)}>
              <ChevronsDownUp className="size-4" aria-hidden /> Collapse all
            </Button>
            <Button variant="secondary" onClick={() => setAllOpen(true)}>
              <ChevronsUpDown className="size-4" aria-hidden /> Expand all
            </Button>
          </ButtonGroup>
          <p className="font-mono text-xs text-[var(--text-secondary)]">
            {allOpen === null ? "—" : allOpen ? "expanded all" : "collapsed all"}
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">vertical · IconButtons</p>
          <ButtonGroup orientation="vertical" aria-label="Zoom">
            <IconButton variant="secondary" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(18, z + 1))}>
              <Plus />
            </IconButton>
            <IconButton variant="secondary" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 1))}>
              <Minus />
            </IconButton>
          </ButtonGroup>
          <p className="font-mono text-xs text-[var(--text-secondary)]">zoom {zoom}</p>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">horizontal · three IconButtons</p>
          <ButtonGroup aria-label="Text alignment">
            {(
              [
                ["left", AlignLeft],
                ["center", AlignCenter],
                ["right", AlignRight],
              ] as const
            ).map(([value, Icon]) => (
              <IconButton
                key={value}
                variant={align === value ? "brand" : "secondary"}
                aria-label={`Align ${value}`}
                aria-pressed={align === value}
                onClick={() => setAlign(value)}
              >
                <Icon />
              </IconButton>
            ))}
          </ButtonGroup>
        </div>
        <div dir="rtl" className="space-y-2">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">dir=&quot;rtl&quot;</p>
          <ButtonGroup aria-label="التنقل">
            <Button variant="secondary">الأول</Button>
            <Button variant="secondary">الثاني</Button>
            <Button variant="secondary">الثالث</Button>
          </ButtonGroup>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The group draws the frame and each member gives up its own border, radius and shadow; the
          edges are logical (<code className="font-mono">rounded-s-md</code>,{" "}
          <code className="font-mono">border-s</code>), so under <code className="font-mono">dir=&quot;rtl&quot;</code>{" "}
          the first button sits on the right with the right-hand corners rounded. It is not a
          toolbar — no arrow-key roving — and not a choice: the alignment trio carries its own{" "}
          <code className="font-mono">aria-pressed</code>. For one-of-many use{" "}
          <code className="font-mono">ToggleGroup</code>, which has the radio semantics.
        </Note>
      </div>
    </Example>
  );
}


function ButtonSizes() {
  const [shared, setShared] = useState(false);
  const [locked, setLocked] = useState(true);
  const [reconciled, setReconciled] = useState(0);
  return (
    <Example
      label='Button size="sm", and IconButton pressed / tone="info" / disabled'
      hint="sm is 12px text and px-2 py-1 for a toolbar; pressed makes an icon button a toggle"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2">
        <span className="me-auto text-sm font-medium text-[var(--text-primary)]">Budgets · September</span>
        <Button size="sm" variant="secondary">
          Export
        </Button>
        <Button size="sm" variant="ghost">
          Reset
        </Button>
        <Button size="sm" variant="brand">
          <Plus className="size-3.5" aria-hidden /> New budget
        </Button>
        <a className={buttonClasses("secondary", { size: "sm" })} href="#/buttons#buttonclasses">
          <Link2 className="size-3.5" aria-hidden /> a link, sm
        </a>
      </div>
      <Row className="mt-3">
        <Button variant="secondary">md (default)</Button>
        <Button variant="secondary" size="sm">
          sm
        </Button>
        <Button variant="danger" size="sm">
          danger, sm
        </Button>
        <Button variant="link" size="sm">
          link, sm
        </Button>
      </Row>
      <Row className="mt-4">
        <IconButton
          aria-label="Share budget"
          pressed={shared}
          onClick={() => setShared((v) => !v)}
        >
          <Share2 />
        </IconButton>
        <span className="font-mono text-xs text-[var(--text-muted)]">aria-pressed={String(shared)}</span>
        <IconButton aria-label="Reconcile" tone="info" onClick={() => setReconciled((n) => n + 1)}>
          <Info />
        </IconButton>
        <span className="font-mono text-xs text-[var(--text-muted)]">reconciled {reconciled}×</span>
        <IconButton aria-label="Delete (disabled)" tone="danger" disabled={locked}>
          <Trash2 />
        </IconButton>
        <IconButton aria-label="Share (disabled, pressed)" pressed disabled={locked}>
          <Share2 />
        </IconButton>
        <Button size="sm" variant="ghost" onClick={() => setLocked((v) => !v)}>
          {locked ? "Enable the last two" : "Disable the last two"}
        </Button>
      </Row>
      <div className="mt-3">
        <Note>
          <code className="font-mono">buttonClasses(&quot;secondary&quot;, {"{ size: \"sm\" }"})</code>{" "}
          dresses the anchor in the toolbar the same way — the second argument is either the old
          extra-class string or <code className="font-mono">{"{ size, className }"}</code>.{" "}
          <code className="font-mono">pressed</code> sets <code className="font-mono">aria-pressed</code>{" "}
          and draws the &ldquo;on&rdquo; look (brand glyph on the quiet brand fill); <code className="font-mono">false</code>{" "}
          still says <code className="font-mono">aria-pressed=&quot;false&quot;</code>, so a reader hears a toggle
          that is off — the name stays &ldquo;Share budget&rdquo; in both states.{" "}
          <code className="font-mono">tone=&quot;info&quot;</code> is sky at rest, for a harmless action worth
          noticing. Hover the two disabled buttons: no hover tint any more, on any variant or tone.
        </Note>
      </div>
    </Example>
  );
}

export function ButtonsSurfaces() {
  return (
    <>
      <ButtonVariants />
      <ButtonSizes />
      <ButtonStretch />
      <ButtonDisabled />
      <ButtonRef />
      <LinkVariant />
      <ButtonClasses />
      <ButtonGroups />
      <IconButtons />
      <IconButtonControls />
      <OverlayIconButtons />
      <PlanCard />
      <FlushCard />
      <InsetCard />
      <SpinnerDemo />
      <Avatars />
      <AvatarInitials />
    </>
  );
}
