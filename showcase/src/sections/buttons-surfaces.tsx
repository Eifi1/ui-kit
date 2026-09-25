import { useRef, useState } from "react";
import { Bell, Copy, Ellipsis, Pencil, Star, Trash2 } from "lucide-react";
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
  EmptyState,
  IconButton,
  Spinner,
  UserAvatar,
  alertFrameClass,
  avatarInitials,
  buttonClasses,
  toneFrameClass,
} from "@eifi1/ui-kit";
import type { AlertTone, ButtonVariant } from "@eifi1/ui-kit";
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

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "brand"];

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
          paints from the semantic <code className="font-mono">--danger</code> family instead:
          destructive is a meaning, not a brand colour, so a preset does not move it — but a
          consumer can re-point that one family on purpose.
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
          Its dashed frame and text are tokens, so it follows the palette.
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
          warning triangle in it. Its colours come from the semantic{" "}
          <code className="font-mono">--danger-*</code> / <code className="font-mono">--warning-*</code>{" "}
          families, which a palette preset does not move: &quot;this is dangerous&quot; is a
          meaning, not a brand colour.
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

export function ButtonsSurfaces() {
  return (
    <>
      <ButtonVariants />
      <ButtonStretch />
      <ButtonDisabled />
      <ButtonClasses />
      <IconButtons />
      <IconButtonControls />
      <PlanCard />
      <FlushCard />
      <SpinnerDemo />
      <EmptyStateDemo />
      <Avatars />
      <AvatarInitials />
      <Alerts />
      <ToneFrames />
    </>
  );
}
