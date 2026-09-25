import { useId, useState } from "react";
import {
  Button,
  Collapse,
  DialogFrame,
  Disclosure,
  HoverMenu,
  Input,
  TOPBAR_MENU_ITEM_CLASS,
  buttonClasses,
  cn,
} from "@eifi1/ui-kit";
import { Example, Note, Row, Stage } from "../lib/section";

/**
 * LAYOUT: the two containers both apps had been writing by hand — a section that opens
 * in place, and the frame inside a dialog.
 *
 * Every disclosure here has a body that would notice being mounted: the mount stamp
 * below is the unmount-on-close contract made visible, because it is the one behaviour
 * a screenshot cannot show and the one an animated copy is most likely to lose.
 */

/** Stamps the moment it mounted, standing in for a body that fetches: close the card,
 *  open it again, and the time moves — the body really went away. */
function MountStamp() {
  const [at] = useState(() => new Date().toLocaleTimeString());
  return <p className="text-xs text-[var(--text-muted)]">Body mounted at {at} — a fetch here would run again on every open.</p>;
}

const COMPARE = ["Hysteresis", "Kinematics", "Transmission"];

export function LayoutDemo() {
  return (
    <>
      <Example
        label="Disclosure — card"
        hint="Uncontrolled; the body unmounts once the fold has closed"
      >
        <Stage>
          <CardSpecimens />
        </Stage>
        <Note>
          The fold is a <code className="font-mono">grid-template-rows</code> transition from{" "}
          <code className="font-mono">0fr</code> to <code className="font-mono">1fr</code>, so it
          needs no measuring. Under reduced motion it snaps, and the body goes at once.
        </Note>
      </Example>

      <Example label="Disclosure — one open at a time" hint="Controlled; the set is the caller's state">
        <Stage>
          <ControlledSet />
        </Stage>
      </Example>

      <Example label="Disclosure — bare" hint="For inside a surface that already has one">
        <Stage>
          <BareSpecimen />
        </Stage>
      </Example>

      <Example
        label="Disclosure — chevronPosition"
        hint='"end" puts a bare chevron at the far end of the row, like a menu row with a sub-list'
      >
        <Stage>
          <ChevronEndSpecimen />
        </Stage>
        <Note>
          <code className="font-mono">chevronPosition=&quot;end&quot;</code> draws the bare chevron at the
          row&apos;s end, pointing down and turning up as the card&apos;s does; with{" "}
          <code className="font-mono">trailing</code> it follows it — &ldquo;Language 🇩🇪 ⌄&rdquo;. The
          default <code className="font-mono">start</code> is the leading chevron that turns from the
          reading direction to down. A <code className="font-mono">card</code> always has it at the end,
          so the prop is ignored there.
        </Note>
      </Example>

      <Example
        label="Disclosure — menu variant"
        hint={'variant="menu": a sub-list row inside a HoverMenu, beside the top bar\u2019s menu items'}
      >
        <Stage>
          <MenuVariantSpecimen />
        </Stage>
        <Note>
          Open the menu: &ldquo;Profile&rdquo;, &ldquo;Settings&rdquo; and &ldquo;Sign out&rdquo; are plain
          buttons wearing <code className="font-mono">TOPBAR_MENU_ITEM_CLASS</code>;
          &ldquo;Language&rdquo; is a <code className="font-mono">Disclosure variant=&quot;menu&quot;</code>{" "}
          and draws the same row — full width, <code className="font-mono">px-3 py-2</code>, regular
          weight, square, the hover wash — with the chevron at the end (the menu&apos;s default{" "}
          <code className="font-mono">chevronPosition</code>) after its <code className="font-mono">trailing</code>{" "}
          value, an inset focus ring the panel&apos;s clipping cannot cut, and a body with no padding
          of its own, so the language rows sit flush with the rows around them.
        </Note>
      </Example>

      <Example
        label="Disclosure — triggerProps"
        hint="attributes for the header BUTTON, or a function of the open state"
      >
        <Stage>
          <TriggerPropsSpecimen />
        </Stage>
        <Note>
          The visible title is only the group&apos;s name, so each toggle is named{" "}
          <em>&ldquo;Expand group Food&rdquo;</em> / <em>&ldquo;Collapse group Food&rdquo;</em> through{" "}
          <code className="font-mono">{"triggerProps={(open) => ({ \"aria-label\": … })}"}</code> — the
          name still contains the title&apos;s words (WCAG 2.5.3). The third passes a plain object, an{" "}
          <code className="font-mono">id</code> and a <code className="font-mono">data-*</code> hook. The
          disclosure keeps <code className="font-mono">aria-expanded</code>,{" "}
          <code className="font-mono">aria-controls</code>, <code className="font-mono">onClick</code> and the
          content for itself; the outer props still go to the wrapping div.
        </Note>
      </Example>

      <Example label="Disclosure — trailing" hint="A count, a date or an action beside the title">
        <Stage>
          <TrailingSpecimens />
        </Stage>
        <Note>
          <code className="font-mono">trailing</code> is a sibling of the header button, never
          inside it: a button cannot hold another button, and a count inside it would be read as
          part of its name. The header button is stretched under the whole row, so the empty
          space and the chevron still toggle.
        </Note>
      </Example>

      <Example label="Disclosure — trigger-only" hint="The header governs rows rendered elsewhere">
        <Stage>
          <TriggerOnlySpecimen />
        </Stage>
        <Note>
          <code className="font-mono">controls</code> takes the id of the caller&apos;s own
          element; the header&apos;s <code className="font-mono">aria-controls</code> points
          there and the disclosure renders no body.
        </Note>
      </Example>

      <Example
        label="Disclosure — disabled, keepMounted and right-to-left"
        hint="A locked section; a body that keeps its state; the bare chevron mirrored"
      >
        <Stage>
          <MoreDisclosureSpecimens />
        </Stage>
        <Note>
          <code className="font-mono">disabled</code> locks the header in whatever state it is
          in — the open one stays readable. <code className="font-mono">keepMounted</code> keeps
          the body (hidden and <code className="font-mono">inert</code>) while shut: type in the
          field, close, reopen, and the text and the mount time are both unchanged.{" "}
          <code className="font-mono">bodyClassName</code> sets the body&apos;s padding and
          spacing. In RTL the bare chevron points left while shut — along the reading
          direction — and the card chevron sits at the left end.
        </Note>
      </Example>

      <Example label="Collapse" hint="The fold alone, for a trigger of your own">
        <Stage>
          <CollapseSpecimen />
        </Stage>
      </Example>

      <Example label="DialogFrame" hint="Portals to document.body; covers the page, not this card">
        <DialogSpecimens />
        <Note>
          The heading&apos;s id is generated and wired to <code className="font-mono">aria-labelledby</code>,
          the description to <code className="font-mono">aria-describedby</code>. Only the body
          scrolls, so the heading and the actions stay on screen in a tall dialog.
        </Note>
      </Example>
    </>
  );
}

function CardSpecimens() {
  return (
    <>
      <Disclosure title="Export" hint="CSV of the current selection" headingAs="h4">
        <MountStamp />
        <Row>
          <Button variant="secondary">Download CSV</Button>
        </Row>
      </Disclosure>
      <Disclosure title="Corner guide" hint="Open by default: this card is the page" defaultOpen headingAs="h4">
        <p className="text-sm text-[var(--text-secondary)]">
          Closed is right for detail beside the thing itself; open is right where the card IS the
          thing.
        </p>
      </Disclosure>
    </>
  );
}

function ControlledSet() {
  const [open, setOpen] = useState<string | null>(COMPARE[0]!);
  return (
    <div data-stage="wide" className="mx-auto w-full max-w-xl space-y-3">
      {COMPARE.map((name) => (
        <Disclosure
          key={name}
          title={name}
          hint={`Compare ${name.toLowerCase()} across profiles`}
          headingAs="h4"
          open={open === name}
          onOpenChange={(next) => setOpen(next ? name : null)}
        >
          <div className="h-24 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-surface-2)]" />
        </Disclosure>
      ))}
      <p className="font-mono text-xs text-[var(--text-muted)]">open = {open ?? "null"}</p>
    </div>
  );
}

function BareSpecimen() {
  const hidden = ["Old savings", "Closed card", "Travel wallet"];
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
      <p className="text-sm text-[var(--text-primary)]">Checking · Savings · Cash</p>
      <Disclosure variant="bare" title={`Show ${hidden.length} hidden accounts`} className="mt-2">
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {hidden.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}

const BUDGET_GROUPS = [
  { name: "Food", items: ["Groceries", "Eating out"] },
  { name: "Housing", items: ["Rent", "Energy", "Insurance"] },
];

function TriggerPropsSpecimen() {
  const [names, setNames] = useState<Record<string, string>>({});
  return (
    <div data-stage="wide" className="mx-auto w-full max-w-xl space-y-2">
      {BUDGET_GROUPS.map((g) => (
        <Disclosure
          key={g.name}
          title={g.name}
          trailing={<span className="text-xs text-[var(--text-muted)]">{g.items.length} lines</span>}
          triggerProps={(open) => ({ "aria-label": `${open ? "Collapse" : "Expand"} group ${g.name}` })}
          onOpenChange={(open) => setNames((n) => ({ ...n, [g.name]: `${open ? "Collapse" : "Expand"} group ${g.name}` }))}
        >
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
            {g.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Disclosure>
      ))}
      <Disclosure
        variant="bare"
        title="Archived groups"
        triggerProps={{ id: "archived-groups-toggle", "data-tour": "archived-groups" }}
      >
        <p className="text-xs text-[var(--text-muted)]">The header button carries id=&quot;archived-groups-toggle&quot;.</p>
      </Disclosure>
      <p className="font-mono text-xs text-[var(--text-muted)]">
        toggle names now: {BUDGET_GROUPS.map((g) => names[g.name] ?? `Expand group ${g.name}`).join(" · ")}
      </p>
    </div>
  );
}

function ChevronEndSpecimen() {
  const [lang, setLang] = useState("Deutsch");
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-sm">
      <p className="rounded px-2 py-1.5 text-[var(--text-primary)]">Profile</p>
      <Disclosure
        variant="bare"
        chevronPosition="end"
        title="Language"
        className="px-2 py-1.5"
        headerClassName="text-[var(--text-primary)]"
        trailing={<span className="text-xs text-[var(--text-muted)]">{lang}</span>}
      >
        <ul className="mt-1 space-y-0.5 ps-2">
          {["Deutsch", "English", "Français"].map((l) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  "w-full rounded px-2 py-1 text-start hover:bg-[var(--bg-hover)]",
                  l === lang ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                )}
              >
                {l}
              </button>
            </li>
          ))}
        </ul>
      </Disclosure>
      <Disclosure variant="bare" chevronPosition="end" title="Hidden accounts" className="px-2 py-1.5">
        <p className="text-xs text-[var(--text-muted)]">No trailing: the chevron alone at the end.</p>
      </Disclosure>
      <Disclosure variant="bare" title="Default: chevron at the start" className="px-2 py-1.5">
        <p className="text-xs text-[var(--text-muted)]">chevronPosition=&quot;start&quot;.</p>
      </Disclosure>
    </div>
  );
}

function MenuVariantSpecimen() {
  const [lang, setLang] = useState("Deutsch");
  const [last, setLast] = useState("—");
  const item = (label: string, close: () => void) => (
    <li>
      <button
        type="button"
        className={TOPBAR_MENU_ITEM_CLASS}
        onClick={() => {
          setLast(label);
          close();
        }}
      >
        {label}
      </button>
    </li>
  );
  return (
    <Row>
      <HoverMenu
        aria-label="Account"
        align="start"
        panelClassName="w-60"
        trigger={({ open, toggle }) => (
          <Button variant="secondary" onClick={toggle} aria-expanded={open}>
            Account menu
          </Button>
        )}
      >
        {(close) => (
          <ul className="py-1">
            {item("Profile", close)}
            {item("Settings", close)}
            <li>
              <Disclosure
                variant="menu"
                title="Language"
                trailing={<span className="text-xs text-[var(--text-muted)]">{lang}</span>}
              >
                <ul>
                  {["Deutsch", "English", "Français"].map((l) => (
                    <li key={l}>
                      <button
                        type="button"
                        aria-current={l === lang || undefined}
                        className={cn(TOPBAR_MENU_ITEM_CLASS, "ps-6", l === lang && "font-medium text-[var(--text-primary)]")}
                        onClick={() => {
                          setLang(l);
                          setLast(`Language → ${l}`);
                          close();
                        }}
                      >
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </li>
            {item("Sign out", close)}
          </ul>
        )}
      </HoverMenu>
      <span className="text-xs text-[var(--text-muted)]">Chosen: {last}</span>
    </Row>
  );
}

function TrailingSpecimens() {
  const [edits, setEdits] = useState(0);
  const threads = [
    { subject: "Import stops at row 400", when: "09:14" },
    { subject: "Totals differ on the phone", when: "Yesterday" },
  ];
  return (
    <div data-stage="wide" className="mx-auto w-full max-w-xl space-y-3">
      <Disclosure
        title="Scheduled payments"
        hint="Rules that book on their own"
        headingAs="h4"
        trailing={
          <>
            <span className="rounded-full bg-[var(--bg-surface-2)] px-2 text-xs tabular-nums text-[var(--text-secondary)]">
              4
            </span>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEdits((n) => n + 1)}>
              Edit
            </Button>
          </>
        }
      >
        <MountStamp />
        <p className="font-mono text-xs text-[var(--text-muted)]">edit clicks = {edits} (the fold did not move)</p>
      </Disclosure>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]">
        {threads.map((t, i) => (
          <Disclosure
            key={t.subject}
            variant="bare"
            title={t.subject}
            className={cn("px-3 py-2.5", i > 0 && "border-t border-[var(--border)]")}
            headerClassName="text-[var(--text-primary)]"
            trailing={<span className="text-xs tabular-nums text-[var(--text-muted)]">{t.when}</span>}
          >
            <p className="text-sm text-[var(--text-secondary)]">The thread&apos;s messages.</p>
          </Disclosure>
        ))}
      </div>
    </div>
  );
}

function TriggerOnlySpecimen() {
  const [open, setOpen] = useState(false);
  const rowsId = useId();
  const visible = ["Checking", "Savings"];
  const hidden = ["Old savings", "Closed card", "Travel wallet"];
  return (
    <div data-stage="wide" className="mx-auto w-full max-w-xl space-y-2">
      <Disclosure
        variant="bare"
        title={`${open ? "Hide" : "Show"} ${hidden.length} hidden accounts`}
        controls={rowsId}
        open={open}
        onOpenChange={setOpen}
        trailing={<span className="text-xs text-[var(--text-muted)]">aria-controls → the table&apos;s rows</span>}
      />
      <table className="w-full overflow-hidden rounded-lg border border-[var(--border)] text-sm">
        <tbody className="divide-y divide-[var(--border)]">
          {visible.map((a) => (
            <tr key={a}>
              <td className="px-3 py-2 text-[var(--text-primary)]">{a}</td>
            </tr>
          ))}
        </tbody>
        <tbody id={rowsId} className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {open &&
            hidden.map((a) => (
              <tr key={a}>
                <td className="px-3 py-2 text-[var(--text-muted)]">{a}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function MoreDisclosureSpecimens() {
  const [locked, setLocked] = useState(true);
  return (
    <>
      <div className="space-y-2">
        <Disclosure
          title="Billing address"
          hint={locked ? "Locked while the invoice is being sent" : "Editable again"}
          headingAs="h4"
          defaultOpen
          disabled={locked}
        >
          <p className="text-sm text-[var(--text-secondary)]">Hauptstraße 5, 10115 Berlin</p>
        </Disclosure>
        <Button variant="ghost" onClick={() => setLocked((v) => !v)}>
          {locked ? "Unlock the header" : "Lock the header"}
        </Button>
      </div>
      <Disclosure
        title="Draft note"
        hint="keepMounted — the text survives a close"
        headingAs="h4"
        keepMounted
        bodyClassName="space-y-2 bg-[var(--bg-surface-2)] px-4 py-3 rounded-b-lg"
      >
        <MountStamp />
        <Input aria-label="Draft note" placeholder="Type, close, reopen" />
      </Disclosure>
      <div dir="rtl" className="space-y-3">
        <Disclosure title="الإعدادات المتقدمة" hint="بطاقة: السهم في الطرف" headingAs="h4">
          <p className="text-sm text-[var(--text-secondary)]">المحتوى</p>
        </Disclosure>
        <Disclosure variant="bare" title="إظهار ٣ حسابات مخفية">
          <p className="text-sm text-[var(--text-secondary)]">حساب التوفير القديم</p>
        </Disclosure>
      </div>
    </>
  );
}

function CollapseSpecimen() {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-2">
      <Button variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} the advanced fields
      </Button>
      {/* keepMounted: a half-typed field survives the close. */}
      <Collapse id={id} open={open} keepMounted>
        <div className="space-y-2 pt-2">
          <Input aria-label="Tolerance" placeholder="Tolerance" />
          <Input aria-label="Sample rate" placeholder="Sample rate" />
        </div>
      </Collapse>
    </div>
  );
}

type DialogKind = "form" | "commit" | "tall" | "sheet" | "question" | "wide" | "header";

function DialogSpecimens() {
  const [kind, setKind] = useState<DialogKind | null>(null);
  const [name, setName] = useState("");
  const close = () => setKind(null);
  return (
    <>
      <Row>
        <Button variant="secondary" onClick={() => setKind("form")}>
          Form dialog
        </Button>
        <Button variant="secondary" onClick={() => setKind("commit")}>
          Commit-on-change (X only)
        </Button>
        <Button variant="secondary" onClick={() => setKind("tall")}>
          Tall body
        </Button>
        <Button variant="secondary" onClick={() => setKind("sheet")}>
          Full-screen on a phone
        </Button>
        <Button variant="secondary" onClick={() => setKind("question")}>
          Question only (no body)
        </Button>
        <Button variant="secondary" onClick={() => setKind("wide")}>
          Wide (xl), draggable, custom close label
        </Button>
        <Button variant="secondary" onClick={() => setKind("header")}>
          headerActions (node and function)
        </Button>
      </Row>
      <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">open = {kind ?? "null"}</p>

      {kind === "wide" && (
        <DialogFrame
          onClose={close}
          title="Compare two imports"
          description="Drag the panel by its top edge to see the page behind it."
          headingAs="h4"
          size="xl"
          draggable
          closeButton
          closeLabel="Dismiss the comparison"
          aria-describedby="dialogframe-extra-note"
        >
          <p className="text-sm text-[var(--text-secondary)]">
            <code className="font-mono">size</code> is the panel&apos;s max width —{" "}
            <code className="font-mono">md</code> 28rem (default), <code className="font-mono">lg</code>{" "}
            32rem, <code className="font-mono">xl</code> 48rem. On a phone all three are the same
            full-width bottom sheet, and dragging is off.
          </p>
          <p id="dialogframe-extra-note" className="text-sm text-[var(--text-secondary)]">
            This paragraph is joined to the description through the caller&apos;s own{" "}
            <code className="font-mono">aria-describedby</code>; the X is named by{" "}
            <code className="font-mono">closeLabel</code>.
          </p>
        </DialogFrame>
      )}

      {kind === "header" && (
        <DialogFrame
          onClose={close}
          title="Invoice INV-2026-0142"
          description="Draft · last edited 2 minutes ago"
          headingAs="h4"
          closeButton
          // The node form: a link that belongs to the header, not to the actions row.
          headerActions={
            <a
              href="#/layout"
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("ghost", "text-xs")}
            >
              Open in full page ↗
            </a>
          }
          actions={(animatedClose) => (
            <Button variant="secondary" onClick={animatedClose}>
              Close
            </Button>
          )}
        >
          <p className="text-sm text-[var(--text-secondary)]">
            <code className="font-mono">headerActions</code> render beside the title, before the X.
            On a phone, where title and controls do not fit on one line, they wrap under the title
            and the X keeps its corner — try the phone preview.
          </p>
        </DialogFrame>
      )}

      {kind === "question" && (
        // No children: title, description and actions are the whole dialog, and the
        // frame renders no empty body (and no rule over the actions) for it.
        <DialogFrame
          onClose={close}
          title="Log out with 3 unsynced changes?"
          description="They exist only on this device until the next sync."
          headingAs="h4"
          closeButton
          actions={(animatedClose) => (
            <>
              <Button variant="secondary" onClick={animatedClose}>
                Cancel
              </Button>
              <Button variant="brand" onClick={close}>
                Sync now
              </Button>
            </>
          )}
        />
      )}

      {kind === "form" && (
        <DialogFrame
          onClose={close}
          title="New session"
          description="A name you will recognise in the list."
          headingAs="h4"
          actions={(animatedClose) => (
            <>
              {/* The function form hands over the panel's animated close — this Cancel
                  lowers the sheet the way Escape does. */}
              <Button variant="secondary" onClick={animatedClose}>
                Cancel
              </Button>
              <Button variant="brand" disabled={!name.trim()} onClick={close}>
                Save
              </Button>
            </>
          )}
        >
          <Input aria-label="Session name" value={name} onChange={(e) => setName(e.target.value)} />
        </DialogFrame>
      )}

      {kind === "commit" && (
        <DialogFrame
          onClose={close}
          title="Group settings"
          headingAs="h4"
          closeButton
          // The function form receives the animated close, as `actions` does.
          headerActions={(animatedClose) => (
            <Button variant="ghost" className="text-xs" onClick={animatedClose}>
              Done
            </Button>
          )}
        >
          <p className="text-sm text-[var(--text-secondary)]">
            Every change here saves as it is made, so there is no actions row — the X is the way
            out, and so is the header&apos;s own <strong>Done</strong>: a{" "}
            <code className="font-mono">headerActions</code> function handed the animated close.
          </p>
        </DialogFrame>
      )}

      {(kind === "tall" || kind === "sheet") && (
        <DialogFrame
          onClose={close}
          title={kind === "tall" ? "Load command" : "Edit row"}
          description="Scroll the body: the heading and the actions stay put."
          headingAs="h4"
          size="lg"
          closeButton={kind === "sheet"}
          fullBleed={kind === "sheet"}
          // The phone sheet: a rule under the header that stays, and one gutter
          // (px-3) for header and body alike.
          headerDivider={kind === "sheet"}
          headerClassName={cn(kind === "sheet" && "px-3")}
          bodyClassName={cn(kind === "sheet" && "px-3")}
          className={cn(kind === "sheet" && "h-[100dvh] max-w-full rounded-none md:h-auto md:max-w-lg md:rounded-lg")}
          actions={(animatedClose) => (
            <>
              <Button variant="secondary" onClick={animatedClose}>
                Cancel
              </Button>
              <Button variant="brand" onClick={close}>
                Apply
              </Button>
            </>
          )}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <p key={i} className="text-sm text-[var(--text-secondary)]">
              Line {i + 1} of a body taller than the screen.
            </p>
          ))}
        </DialogFrame>
      )}
    </>
  );
}
