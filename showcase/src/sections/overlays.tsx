import { useContext, useId, useState } from "react";
import { Info, Keyboard, Pencil } from "lucide-react";
import {
  Button,
  FullBleedDialog,
  HoverMenu,
  IconButton,
  Modal,
  ModalCloseContext,
  OVERLAY_EXIT_MS,
  Popover,
  Tooltip,
  buttonClasses,
  cn,
  placeTooltip,
  useBackdropClose,
  useCloseTransition,
} from "@eifi1/ui-kit";
import type { AnchorRect, TooltipPlacement, TooltipSize, TooltipViewport } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * OVERLAYS.
 *
 * Every specimen here is opened by a real button and can be closed again, because an
 * overlay's whole behaviour is in the opening and the closing — a screenshot of an open
 * panel tells you nothing about whether Escape works, whether the backdrop is
 * mis-tappable, or where focus went.
 *
 * `Modal`, `FullBleedDialog` and `Popover` all portal to `document.body`, so the panel
 * you see is NOT inside this card. That is deliberate in the kit (a `fixed inset-0`
 * overlay has to escape its caller's stacking context), and it is why a modal opened
 * from here covers the whole showcase rather than the section.
 */

// Panel sizes as a list so the three specimens cannot drift from the prop's union.
const MODAL_SIZES = ["md", "lg", "xl"] as const;
type ModalSize = (typeof MODAL_SIZES)[number];

const TOOLTIP_SIDES = ["top", "right", "bottom", "left"] as const;

const MENU_ITEMS = ["Duplicate", "Export as CSV", "Archive"];

// Token-styled field: the kit's panels are painted with the tokens, and anything this
// page draws itself has to follow the palette too, or the palette switch proves nothing.
const FIELD =
  "w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]";

const MENU_ITEM =
  "block w-full px-3 py-1.5 text-start text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]";

/** The "Dialogs" page: the two modal surfaces, the backdrop rule they share, and the
 *  exit timing every overlay closes on. The notes at the end cover all five overlays. */
export function Dialogs() {
  return (
    <>
      <Example
        label="Modal"
        hint={
          <>
            Portals to <code className="font-mono">document.body</code>; covers the page, not
            this card. Below 768px (try the screen-size preview) every size is the same
            full-width bottom sheet.
          </>
        }
      >
        <ModalSizes />
      </Example>

      <Example
        label="Modal — tall content, a popover inside, pass-through attributes"
        hint="Escape closes the popover first and the dialog only on a second press; Back closes the dialog too."
      >
        <ModalTall />
      </Example>

      <Example
        label="Modal — draggable, full-bleed and onKeyDown"
        hint="Dragging is suppressed below 768px: a bottom sheet has nothing beside it to uncover."
      >
        <ModalOptions />
      </Example>

      <Example
        label="useBackdropClose"
        hint="Press and release must BOTH land on the backdrop."
      >
        <BackdropClose />
      </Example>

      <Example
        label="FullBleedDialog"
        hint="Edge to edge — the X is the only way out on a phone, by design."
      >
        <FullBleed />
      </Example>

      <Example
        label="OVERLAY_EXIT_MS + useCloseTransition"
        hint="Dismiss the panel and watch `closing` flip for one animation's length."
      >
        <CloseTransition />
      </Example>

      <Note>
        <strong>Accessibility, checked against the source rather than assumed.</strong>{" "}
        <code className="font-mono">Modal</code> and <code className="font-mono">FullBleedDialog</code>{" "}
        focus the dialog itself on open (not the first field, so a phone keyboard does not pop),
        keep Tab inside it, and hand focus back to the element that opened them.{" "}
        <code className="font-mono">Popover</code> traps Tab as well — it is portalled to the end
        of <code className="font-mono">&lt;body&gt;</code>, so letting Tab walk out would land
        nowhere near the trigger — but stays non-modal otherwise: no backdrop, no scroll lock.
        Both <code className="font-mono">Tooltip</code> variants point the child's{" "}
        <code className="font-mono">aria-describedby</code> at the bubble and close on Escape.{" "}
        <code className="font-mono">HoverMenu</code> is a real menu since 0.7.0: the caller&apos;s
        plain buttons and links become <code className="font-mono">menuitem</code>s (list markup
        in between goes <code className="font-mono">role="none"</code>), the trigger gets{" "}
        <code className="font-mono">aria-haspopup</code>/<code className="font-mono">aria-expanded</code>,
        ↓/Enter/Space on the trigger open onto the first item (↑ onto the last), ↑/↓/Home/End
        move with wrap, Tab leaves and closes, and Escape closes from anywhere — returning focus
        to the trigger only when it was inside the menu.
      </Note>

      <Note>
        <strong>All five follow the palette.</strong> The panels are painted with{" "}
        <code className="font-mono">--bg-surface</code> and{" "}
        <code className="font-mono">--border</code>, so flipping the palette in the top bar
        re-skins them. The one fixed colour is the backdrop's{" "}
        <code className="font-mono">bg-black/40</code> dim behind a Modal or a FullBleedDialog.
      </Note>
    </>
  );
}

/** The "Popovers, menus & tooltips" page: the non-modal overlays — anchored to a
 *  trigger, flipped and clamped against the viewport — and the pure placement math. */
export function PopoversMenusTooltips() {
  return (
    <>
      <Example
        label="Popover"
        hint="position: fixed and portalled, so a table or overflow ancestor cannot clip it."
      >
        <Popovers />
      </Example>

      <Example
        label="Popover — labels, panelId, aria-label and a combobox trigger"
        hint="Open one near the bottom of the window: the panel flips above its trigger and caps its height."
      >
        <PopoverNaming />
      </Example>

      <Example
        label="HoverMenu"
        hint="Hover opens after 120ms; a click opens instantly; Enter or ↓ from the keyboard opens onto the first item."
      >
        <HoverMenus />
      </Example>
      <Note>
        <code className="font-mono">align</code>: <code className="font-mono">start</code> and{" "}
        <code className="font-mono">end</code> (the default) follow the reading direction —{" "}
        <code className="font-mono">end</code> is the trigger&apos;s right edge here and its left
        in RTL (see the right-to-left example below); <code className="font-mono">left</code>/
        <code className="font-mono">right</code> are physical and kept for existing callers.
        Keyboard: Tab to a trigger and press ↓ (or Enter/Space) — the menu opens with focus on
        its first item, ↑ opens onto the last; ↑/↓ wrap, Home/End jump, Tab moves on and
        closes, Escape closes and puts focus back on the trigger. A hover-opened menu does not
        take focus, so Escape then leaves the caret where it was.
      </Note>

      <Example
        label="HoverMenu — aria-label, className and the viewport clamp"
        hint="On a narrow window (or the phone preview) the wide panel is shifted back inside an 8px margin."
      >
        <HoverMenuClamp />
      </Example>
      <Note>
        <strong>Only one HoverMenu in the whole document may be open at a time.</strong> The
        “currently open menu” is a module-level variable, so opening one of these closes the
        other — and closes the palette and language menus in the top bar too, which are the same
        component. That is feedback #251 (adjacent top-bar menus overlapping) and it is correct
        for a top bar; it is worth knowing before you file it as a bug here.
      </Note>

      <Example label="Tooltip — side" hint="The CSS-only variant. `side` is absolute here: it never flips.">
        <TooltipSides />
      </Example>

      <Example
        label="Tooltip — portal, redact and the empty label"
        hint="Inside a scroll container use `portal`, or the invisible bubble adds width to the scroller."
      >
        <TooltipPortal />
      </Example>

      <Example
        label="Tooltip — rich labels, className and the portal flip"
        hint="Focus a trigger with Tab and press Escape: the bubble goes (WCAG 1.4.13) and comes back on the next focus."
      >
        <TooltipMore />
      </Example>

      <Example
        label="Right-to-left — which placements flip"
        hint={<code className="font-mono">dir=&quot;rtl&quot;</code>}
      >
        <OverlaysRtl />
      </Example>

      <Example
        label="placeTooltip"
        hint="Pure, viewport pixels in and out — which is why it can be shown as a table at all."
      >
        <OutTable rows={PLACEMENT_ROWS} />
      </Example>
    </>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────────── */

function ModalSizes() {
  const [size, setSize] = useState<ModalSize | null>(null);
  const [draft, setDraft] = useState("Select this text, then release over the backdrop.");
  const headingId = useId();

  return (
    <>
      <Row>
        {MODAL_SIZES.map((s) => (
          <Button key={s} variant="secondary" onClick={() => setSize(s)}>
            Open size=&quot;{s}&quot;
          </Button>
        ))}
      </Row>
      {/* Conditional mount, not an `open` prop: Modal has no `open` — the caller owning
          the mount is what lets `useCloseTransition` hold the panel on screen for the
          exit and then hand the unmount back. */}
      {size && (
        <Modal size={size} labelledBy={headingId} className="space-y-3" onClose={() => setSize(null)}>
          <h4 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
            size=&quot;{size}&quot; — md 28rem, lg 32rem, xl 48rem
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            The panel is <code className="font-mono">w-full</code> under every cap, so on a phone
            all three are the same full-width bottom sheet and only the desktop widths differ.
          </p>
          <input
            aria-label="Scratch field"
            className={FIELD}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Row className="justify-end">
            {/* Closing from inside the panel by flipping the caller's own state skips the
                exit animation — useCloseTransition can only animate a dismissal it was
                asked for. `ModalCloseContext` is the way to ask from inside: it hands out
                the panel's own animated close, the one Escape and the backdrop use. */}
            <Button variant="secondary" onClick={() => setSize(null)}>
              Close (no exit animation)
            </Button>
            <AnimatedCloseButton />
          </Row>
        </Modal>
      )}
    </>
  );
}

type ModalOption = "draggable" | "fullBleed";

function ModalOptions() {
  const [option, setOption] = useState<ModalOption | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const headingId = useId();

  return (
    <>
      <Row>
        <Button variant="secondary" onClick={() => setOption("draggable")}>
          Open draggable
        </Button>
        <Button variant="secondary" onClick={() => setOption("fullBleed")}>
          Open fullBleed
        </Button>
        {submitted && (
          <span className="text-xs text-[var(--text-muted)]">Submitted via {submitted}</span>
        )}
      </Row>
      {option && (
        <Modal
          labelledBy={headingId}
          draggable={option === "draggable"}
          fullBleed={option === "fullBleed"}
          // fullBleed only drops the BACKDROP's mobile padding; the panel still needs
          // these three classes itself to fill what the backdrop gave up. Documented on
          // the prop, and easy to miss — without them the panel is an ordinary sheet
          // sitting in an unpadded backdrop.
          className={cn(
            "space-y-3",
            option === "fullBleed" && "h-[100dvh] max-w-full rounded-none md:h-auto md:rounded-lg",
          )}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              setSubmitted("Ctrl/Cmd+Enter");
              setOption(null);
            }
          }}
          onClose={() => setOption(null)}
        >
          <h4 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
            {option === "draggable" ? "draggable" : "fullBleed"} — and a custom onKeyDown
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">
            {option === "draggable"
              ? "Press the heading or any bare part of the panel and drag. A press that lands on a field, a button or a link belongs to that control, so selecting the text below never starts a drag. Nothing is persisted — the offset dies with the dialog."
              : "The backdrop's mobile margin is gone, so the panel can reach the screen edges. The desktop md:p-4 margin is kept, which is why this still looks inset above 768px."}
          </p>
          <input aria-label="A field, which never starts a drag" className={FIELD} defaultValue="Drag me and nothing moves." />
          <p className="text-xs text-[var(--text-muted)]">
            Ctrl/Cmd+Enter submits — <code className="font-mono">onKeyDown</code> runs before the
            built-in Escape/Tab handling, and calling{" "}
            <code className="font-mono">preventDefault()</code> suppresses it for that event.
          </p>
          <Row className="justify-end">
            <Button variant="secondary" onClick={() => setOption(null)}>
              Close
            </Button>
          </Row>
        </Modal>
      )}
    </>
  );
}

/** Reads the panel's own animated close. `null` outside a Modal, which is why the
 *  button falls back to rendering nothing rather than a control that does nothing. */
function AnimatedCloseButton() {
  const close = useContext(ModalCloseContext);
  if (!close) return null;
  return <Button onClick={close}>Close (animated, via ModalCloseContext)</Button>;
}

const TALL_LINES = Array.from({ length: 40 }, (_, i) => `Line ${i + 1} of a panel taller than the screen.`);

function ModalTall() {
  const [open, setOpen] = useState(false);
  const [closes, setCloses] = useState(0);
  const [picked, setPicked] = useState("—");
  const headingId = useId();
  const descId = useId();

  return (
    <>
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open a tall size=&quot;lg&quot; modal
        </Button>
        <span className="text-xs text-[var(--text-muted)]">
          onClose calls: {closes} · picked in the popover: {picked}
        </span>
      </Row>
      {open && (
        <Modal
          size="lg"
          labelledBy={headingId}
          // Everything a <div> takes lands on the PANEL (role="dialog"): a description,
          // a test id, a tour anchor. `style` is merged with the drag offset, not replaced.
          aria-describedby={descId}
          data-testid="showcase-tall-modal"
          style={{ borderTop: "4px solid var(--brand)" }}
          className="space-y-3"
          onClose={() => {
            setOpen(false);
            setCloses((n) => n + 1);
          }}
        >
          <h4 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
            A panel taller than the window
          </h4>
          <p id={descId} className="text-xs text-[var(--text-secondary)]">
            The panel scrolls itself (<code className="font-mono">max-h-full overflow-y-auto</code>);
            the page behind is scroll-locked. The brand stripe on top is the caller&apos;s{" "}
            <code className="font-mono">style</code>, and this paragraph is the dialog&apos;s{" "}
            <code className="font-mono">aria-describedby</code>.
          </p>
          <Popover
            labels={{ panel: "Pick a colour" }}
            trigger={({ open: popOpen, toggle, ref }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                aria-expanded={popOpen}
                className={buttonClasses("secondary")}
              >
                Open a popover inside the dialog
              </button>
            )}
          >
            {(close) => (
              <Row>
                {["Red", "Green", "Blue"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={buttonClasses("ghost", "text-xs")}
                    onClick={() => {
                      setPicked(c);
                      close();
                    }}
                  >
                    {c}
                  </button>
                ))}
              </Row>
            )}
          </Popover>
          <ul className="space-y-1 text-xs text-[var(--text-muted)]">
            {TALL_LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <Row className="justify-end">
            <AnimatedCloseButton />
          </Row>
        </Modal>
      )}
    </>
  );
}

function BackdropClose() {
  const [dismissed, setDismissed] = useState(false);
  const backdrop = useBackdropClose(() => setDismissed(true));

  if (dismissed) {
    return (
      <Row>
        <span className="text-xs text-[var(--text-secondary)]">
          Dismissed — the press started and ended on the backdrop.
        </span>
        <Button variant="secondary" onClick={() => setDismissed(false)}>
          Reset
        </Button>
      </Row>
    );
  }

  return (
    // A plain box rather than a real overlay, because the hook is about nothing but the
    // down/up pair: `Modal` and `FullBleedDialog` already spread it onto their backdrops,
    // and it is exported for an app rolling its own.
    <div
      {...backdrop}
      className="flex min-h-44 items-center justify-center rounded-md bg-[var(--bg-surface-2)] p-6"
    >
      <div className="max-w-md space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">
          Click the grey area around this panel and it dismisses. Now select this sentence,
          keep the button held, and release out on the grey: it does <em>not</em> dismiss.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          A plain <code className="font-mono">onClick</code> fires on mouseup and targets the
          common ancestor of the down and up elements, so both directions of that drag used to
          close a dialog mid-edit (feedback #254).
        </p>
      </div>
    </div>
  );
}

/* ── FullBleedDialog ──────────────────────────────────────────────────────── */

function FullBleed() {
  const [open, setOpen] = useState(false);
  const [backCloses, setBackCloses] = useState(true);
  const [capped, setCapped] = useState(false);
  const [closes, setCloses] = useState(0);
  const [notes, setNotes] = useState("");

  return (
    <>
      <Row>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open full-bleed dialog
        </Button>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={backCloses}
            onChange={(e) => setBackCloses(e.target.checked)}
          />
          <code className="font-mono">backCloses</code>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={capped} onChange={(e) => setCapped(e.target.checked)} />
          <code className="font-mono">className=&quot;md:max-w-2xl&quot;</code>
        </label>
        <span className="text-xs text-[var(--text-muted)]">onClose calls: {closes}</span>
      </Row>
      {/* Rendered unconditionally with an `open` prop — the opposite of Modal. It early
          returns null while closed, AFTER its hooks, so it stays mounted and its
          `closing` state outlives each panel; that is the exact shape the warning in
          use-close-transition.ts is about. */}
      <FullBleedDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setCloses((n) => n + 1);
        }}
        backCloses={backCloses}
        closeLabel="Close the row editor"
        // `className` is the PANEL's; every other attribute goes to the outer element,
        // the one with role="dialog" — which is where an accessible name belongs.
        className={capped ? "md:max-w-2xl" : undefined}
        aria-label="Row editor"
        header={<span className="truncate text-sm">Row editor — Ada Lovelace</span>}
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            No strip of page shows beside this panel, so there is nothing to mis-tap — which is
            why it is not a <code className="font-mono">Modal</code> with a wider width. The
            backdrop handlers stay wired for layouts that do leave one visible.
          </p>
          <textarea
            aria-label="Notes"
            rows={4}
            className={FIELD}
            placeholder="Only the body scrolls; the header strip stays put."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-xs text-[var(--text-muted)]">
            <code className="font-mono">backCloses</code> is off for a caller whose open state is
            already in the URL — a sentinel on top of a router entry costs two presses to close
            one dialog. Toggle it and try the browser's Back.
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            With the <code className="font-mono">md:max-w-2xl</code> class the panel is capped on a
            wide screen, so the dimmed backdrop shows beside it — and a press that starts and ends
            there closes the dialog. On a phone the cap does not bite and nothing is exposed.
          </p>
          <Row>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close from inside
            </Button>
          </Row>
        </div>
      </FullBleedDialog>
    </>
  );
}

/* ── Popover ──────────────────────────────────────────────────────────────── */

function Popovers() {
  const [tag, setTag] = useState("none");

  return (
    <Row>
      <Popover
        trigger={({ open, toggle, ref }) => (
          // The kit's <Button> takes the trigger's ref since 0.7.0 (React 19 passes `ref`
          // as a plain prop, and Button now declares it). Before that this had to be a
          // hand-written <button> wearing `buttonClasses`, as the specimens below still are.
          <Button ref={ref} variant="secondary" onClick={toggle} aria-expanded={open}>
            Default width (288px)
          </Button>
        )}
      >
        {(close) => (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              The panel's END edge is aligned to the trigger's (right in LTR, left in RTL) and clamped 8px from the window;
              the vertical half is the anchored-panel hook's, which flips it above the trigger and
              caps its height when that is where the room is.
            </p>
            <Row>
              {["urgent", "later"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTag(t);
                    close();
                  }}
                  className={buttonClasses("ghost", "text-xs")}
                >
                  {t}
                </button>
              ))}
            </Row>
          </div>
        )}
      </Popover>

      <Popover
        width={360}
        trigger={({ open, toggle, ref }) => (
          <IconButton ref={ref} onClick={toggle} aria-expanded={open} aria-label="Edit, width=360">
            <Pencil />
          </IconButton>
        )}
      >
        {(close) => (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              <code className="font-mono">width</code> is a number, not a class, because the
              horizontal clamp has to do arithmetic with it.
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Outside-click listens on <code className="font-mono">pointerdown</code>, so a
              touch-drag that starts outside dismisses at touch-down.
            </p>
            <button type="button" onClick={close} className={buttonClasses("ghost", "text-xs")}>
              Close
            </button>
          </div>
        )}
      </Popover>

      <span className="text-xs text-[var(--text-muted)]">Tag: {tag}</span>
    </Row>
  );
}

const CATEGORIES = ["Groceries", "Rent", "Transport", "Leisure"];

function PopoverNaming() {
  const panelId = useId();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [due, setDue] = useState("—");

  return (
    <div className="space-y-3">
      <Row>
        <Popover
          // The panel is rendered here, not by the caller, so its id has to come in from
          // outside for the trigger's `aria-controls` to point at it.
          panelId={panelId}
          labels={{ panel: "Choose a category" }}
          width={220}
          className="p-1"
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              aria-haspopup="dialog"
              onClick={toggle}
              className={buttonClasses("secondary")}
            >
              Category: {category}
            </button>
          )}
        >
          {(close) => (
            <ul>
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => {
                      setCategory(c);
                      close();
                    }}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover>

        <Popover
          // The DOM spelling wins over `labels.panel` wherever both are given.
          aria-label="Due date shortcuts"
          labels={{ panel: "Never read — aria-label wins" }}
          data-testid="showcase-due-popover"
          style={{ borderColor: "var(--brand)" }}
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={buttonClasses("secondary")}
            >
              Due: {due}
            </button>
          )}
        >
          {(close) => (
            <Row>
              {["Today", "Tomorrow", "Next week"].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={buttonClasses("ghost", "text-xs")}
                  onClick={() => {
                    setDue(d);
                    close();
                  }}
                >
                  {d}
                </button>
              ))}
            </Row>
          )}
        </Popover>
      </Row>
      <OutTable
        rows={[
          ['labels={{ panel: "Choose a category" }}', 'panel aria-label = "Choose a category"'],
          ['aria-label="Due date shortcuts" + labels.panel', 'panel aria-label = "Due date shortcuts"'],
          ["neither", `"Pop-up" — the English fallback (or the provider's popover.panel)`],
          ["className / style", "reach the PANEL; the measured position is merged over style"],
        ]}
      />
    </div>
  );
}

/* ── HoverMenu ────────────────────────────────────────────────────────────── */

function HoverMenus() {
  const [chosen, setChosen] = useState("—");

  return (
    <Row>
      {(["start", "end", "left", "right"] as const).map((align) => (
        <HoverMenu
          key={align}
          align={align}
          ariaLabel={`Example actions, ${align}-aligned`}
          // Only one of the two, so the difference between the default width and a set
          // one is visible side by side rather than described.
          panelClassName={align === "end" ? "w-56" : undefined}
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              align=&quot;{align}&quot;
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {MENU_ITEMS.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => {
                      setChosen(item);
                      close();
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </HoverMenu>
      ))}
      <span className="text-xs text-[var(--text-muted)]">Chosen: {chosen}</span>
    </Row>
  );
}

function HoverMenuClamp() {
  const [chosen, setChosen] = useState("—");

  const items = (close: () => void) => (
    <ul className="py-1">
      {MENU_ITEMS.map((item) => (
        <li key={item}>
          <button
            type="button"
            className={MENU_ITEM}
            onClick={() => {
              setChosen(item);
              close();
            }}
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <HoverMenu
          // The DOM spelling; the deprecated `ariaLabel` (above) loses to it when both
          // are given. `className` is the WRAPPER's, `panelClassName` the panel's.
          aria-label="Sort options"
          className="rounded-md ring-1 ring-[var(--border)]"
          data-testid="showcase-sort-menu"
          align="start"
          trigger={({ open, toggle }) => (
            <Button variant="ghost" onClick={toggle} aria-expanded={open}>
              aria-label + className
            </Button>
          )}
        >
          {items}
        </HoverMenu>
        <HoverMenu
          // Deliberately the WRONG alignment for a trigger at the end edge: the panel
          // opens towards the edge and would spill off it, so the clamp has to move it.
          align="start"
          panelClassName="w-96"
          aria-label="Wide menu at the edge"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              w-96, align=&quot;start&quot;
            </Button>
          )}
        >
          {items}
        </HoverMenu>
      </div>
      <span className="text-xs text-[var(--text-muted)]">Chosen: {chosen}</span>
    </div>
  );
}

/* ── Tooltip ──────────────────────────────────────────────────────────────── */

function TooltipSides() {
  const [pressed, setPressed] = useState("—");

  return (
    <Row>
      {TOOLTIP_SIDES.map((side) => (
        <Tooltip key={side} side={side} label={`side="${side}"`}>
          <button
            type="button"
            onClick={() => setPressed(side)}
            className={buttonClasses("secondary")}
          >
            {side}
          </button>
        </Tooltip>
      ))}
      <span className="text-xs text-[var(--text-muted)]">Last pressed: {pressed}</span>
    </Row>
  );
}

function TooltipPortal() {
  const [redact, setRedact] = useState(true);
  const [pressed, setPressed] = useState("—");

  return (
    <Row>
      <Tooltip
        portal
        side="right"
        redact={redact}
        label={redact ? "Ada Lovelace — the user's own data" : "Just a UI string"}
      >
        <IconButton aria-label="Toggle the redact prop" onClick={() => setRedact((v) => !v)}>
          <Info />
        </IconButton>
      </Tooltip>
      <span className="text-xs text-[var(--text-secondary)]">
        <code className="font-mono">redact={String(redact)}</code> — the bubble carries{" "}
        <code className="font-mono">data-private</code>. The blur rule itself lives in the
        consuming app (a <code className="font-mono">demo-mode</code> class on{" "}
        <code className="font-mono">&lt;html&gt;</code>), so here it only tags; inspect the
        element to see it.
      </span>
      <Tooltip label="">
        <button
          type="button"
          onClick={() => setPressed("empty label")}
          className={buttonClasses("ghost")}
        >
          label=&quot;&quot; — no bubble and no wrapper
        </button>
      </Tooltip>
      <span className="text-xs text-[var(--text-muted)]">Last pressed: {pressed}</span>
    </Row>
  );
}

function TooltipMore() {
  const helpId = useId();

  return (
    <div className="space-y-3">
      <Row>
        {/* A ReactNode label, not only a string. */}
        <Tooltip
          label={
            <span className="inline-flex items-center gap-1">
              Open the palette: <kbd className="font-mono">Ctrl</kbd>+<kbd className="font-mono">K</kbd>
            </span>
          }
        >
          <IconButton aria-label="Keyboard shortcut">
            <Keyboard />
          </IconButton>
        </Tooltip>

        {/* `0` is a real label; only "", null, undefined and false count as empty. */}
        <Tooltip label={0} side="bottom">
          <button type="button" className={buttonClasses("secondary")}>
            label={"{0}"}
          </button>
        </Tooltip>

        {/* The caller's own description is APPENDED to, never replaced: the button ends
            up described by the hint text below AND the bubble. `className` and any other
            span attribute land on the wrapper. */}
        <Tooltip
          label="…and the bubble, appended"
          className="rounded-md ring-1 ring-[var(--brand)]"
          data-testid="showcase-tooltip-wrapper"
        >
          <button type="button" aria-describedby={helpId} className={buttonClasses("secondary")}>
            Own aria-describedby
          </button>
        </Tooltip>
        <span id={helpId} className="text-xs text-[var(--text-muted)]">
          Described by this text…
        </span>
      </Row>
      <Row>
        <Tooltip
          portal
          side="left"
          label="side='left' is a preference for the portal variant: with no room on the left, this bubble turns round to the right and is clamped into the window."
        >
          <button type="button" className={buttonClasses("secondary")}>
            portal, side=&quot;left&quot;
          </button>
        </Tooltip>
        <span className="text-xs text-[var(--text-muted)]">
          Needs the window&apos;s left edge within ~20rem to flip — the phone preview shows it.
        </span>
      </Row>
    </div>
  );
}

/* ── Right-to-left ────────────────────────────────────────────────────────── */

function OverlaysRtl() {
  const [picked, setPicked] = useState("—");

  return (
    <div className="space-y-3">
      <div dir="rtl" className="flex flex-wrap items-center gap-3">
        <HoverMenu
          aria-label="قائمة"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              HoverMenu (align=&quot;end&quot;, the default)
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {["نسخ", "تصدير", "أرشفة"].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => {
                      setPicked(item);
                      close();
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </HoverMenu>
        <HoverMenu
          aria-label="قائمة البداية"
          align="start"
          trigger={({ open, toggle }) => (
            <Button variant="secondary" onClick={toggle} aria-expanded={open}>
              HoverMenu (align=&quot;start&quot;)
            </Button>
          )}
        >
          {(close) => (
            <ul className="py-1">
              {["نسخ", "تصدير"].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => {
                      setPicked(item);
                      close();
                    }}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </HoverMenu>
        <Tooltip side="left" label="side='left' — still the physical left">
          <button type="button" className={buttonClasses("secondary")}>
            Tooltip left
          </button>
        </Tooltip>
        <Popover
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={buttonClasses("secondary")}
            >
              Popover
            </button>
          )}
        >
          {() => (
            <p className="text-xs text-[var(--text-secondary)]">
              هذه اللوحة تقرأ من اليمين — portalled to &lt;body&gt;, yet it carries the
              trigger&apos;s dir=&quot;rtl&quot;, and its end (left) edge lines up with the
              trigger&apos;s.
            </p>
          )}
        </Popover>
      </div>
      <span className="text-xs text-[var(--text-muted)]">Picked: {picked}</span>
      <Note>
        Only <code className="font-mono">Tooltip</code> is still physical:{" "}
        <code className="font-mono">side=&quot;left&quot;</code> is the screen&apos;s left in
        either direction, so an RTL caller swaps it itself.{" "}
        <code className="font-mono">HoverMenu</code>&apos;s <code className="font-mono">align</code>{" "}
        takes <code className="font-mono">start</code>/<code className="font-mono">end</code>{" "}
        (default <code className="font-mono">end</code>), which mirror here —{" "}
        <code className="font-mono">left</code>/<code className="font-mono">right</code> stay
        physical for existing callers. <code className="font-mono">Popover</code> reads the
        trigger&apos;s direction when it opens: the portalled panel carries that{" "}
        <code className="font-mono">dir</code> (so its text runs right to left although it lives
        under <code className="font-mono">&lt;body&gt;</code>) and aligns to the trigger&apos;s END
        edge — the right in LTR, the left here.
      </Note>
    </div>
  );
}

/* ── placeTooltip ─────────────────────────────────────────────────────────── */

// Fixed rects rather than measured ones: the helper is pure, so the table is the same
// on every screen, and a reader can check the arithmetic against the source.
const NEAR_TOP: AnchorRect = { top: 8, left: 120, right: 160, bottom: 28, width: 40, height: 20 };
const NEAR_LEFT: AnchorRect = { top: 200, left: 4, right: 44, bottom: 220, width: 40, height: 20 };
const BUBBLE: TooltipSize = { width: 160, height: 32 };
const SCREEN: TooltipViewport = { width: 400, height: 600 };
const NARROW: TooltipViewport = { width: 180, height: 600 };

function show(p: TooltipPlacement): string {
  return `{ left: ${p.left}, top: ${p.top}, side: "${p.side}" }`;
}

// Computed at module scope by calling the real export, so the table cannot go stale the
// way a transcribed one would.
const PLACEMENT_ROWS: Array<[string, string]> = [
  [
    'placeTooltip(nearTop, "top", bubble, screen)',
    show(placeTooltip(NEAR_TOP, "top", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "top", bubble, screen)',
    show(placeTooltip(NEAR_LEFT, "top", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "left", bubble, screen)',
    show(placeTooltip(NEAR_LEFT, "left", BUBBLE, SCREEN)),
  ],
  [
    'placeTooltip(nearLeft, "left", bubble, narrow)',
    show(placeTooltip(NEAR_LEFT, "left", BUBBLE, NARROW)),
  ],
];

/* ── OVERLAY_EXIT_MS / useCloseTransition ─────────────────────────────────── */

function CloseTransition() {
  const [present, setPresent] = useState(true);
  const { closing, requestClose } = useCloseTransition(() => setPresent(false));

  return (
    <div className="space-y-3">
      <OutTable
        rows={[
          ["OVERLAY_EXIT_MS", `${OVERLAY_EXIT_MS} // ms`],
          ["closing", String(closing)],
        ]}
      />
      {present ? (
        <div
          className={cn(
            "space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-3",
            closing ? "animate-sheet-out" : "animate-sheet",
          )}
        >
          <p className="text-xs text-[var(--text-secondary)]">
            Dismiss lowers this panel and only then unmounts it. An exit animation needs
            something to hold the element on screen for exactly its own length, and by the time
            a caller's state says “closed” the element is already gone — so the overlays call{" "}
            <code className="font-mono">requestClose</code>, render the{" "}
            <code className="font-mono">-out</code> classes while{" "}
            <code className="font-mono">closing</code>, and the real{" "}
            <code className="font-mono">onClose</code> fires {OVERLAY_EXIT_MS}ms later.
          </p>
          <Button variant="secondary" onClick={requestClose}>
            Dismiss
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setPresent(true)}>
          Bring it back
        </Button>
      )}
      <Note>
        <code className="font-mono">OVERLAY_EXIT_MS</code> is exported because the number is a
        contract between three places that must agree: the{" "}
        <code className="font-mono">.animate-sheet-out</code> keyframes in{" "}
        <code className="font-mono">tokens.css</code>, the unmount timer in the hook, and any
        test that advances a fake clock past it — a test that advanced by its own copy of 220
        would keep passing after someone retuned the animation.
      </Note>
      <Note>
        Under <code className="font-mono">prefers-reduced-motion: reduce</code> this closes
        instantly and <code className="font-mono">closing</code> never becomes true, so if the
        panel above vanishes without lowering, that is the setting and not a broken specimen.
        The media query is read at close time rather than at mount, because the setting can
        change under a long-lived page.
      </Note>
    </div>
  );
}
