import { useId, useState } from "react";
import { Info, Pencil } from "lucide-react";
import {
  Button,
  FullBleedDialog,
  HoverMenu,
  IconButton,
  Modal,
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

// Token-styled field: the kit's own panels are still painted with literal
// `bg-white`/`slate-*` (see the note at the foot of this section), but anything this
// page draws itself has to follow the palette, or the palette switch proves nothing.
const FIELD =
  "w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]";

const MENU_ITEM =
  "block w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]";

export function Overlays() {
  return (
    <>
      <Example
        label="Modal"
        hint={
          <>
            Portals to <code className="font-mono">document.body</code>; covers the page, not
            this card.
          </>
        }
      >
        <ModalSizes />
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
        label="Popover"
        hint="position: fixed and portalled, so a table or overflow ancestor cannot clip it."
      >
        <Popovers />
      </Example>

      <Example
        label="HoverMenu"
        hint="Hover opens after 120ms; a click or Enter opens instantly."
      >
        <HoverMenus />
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
        label="placeTooltip"
        hint="Pure, viewport pixels in and out — which is why it can be shown as a table at all."
      >
        <OutTable rows={PLACEMENT_ROWS} />
      </Example>

      <Example
        label="OVERLAY_EXIT_MS + useCloseTransition"
        hint="Dismiss the panel and watch `closing` flip for one animation's length."
      >
        <CloseTransition />
      </Example>

      <Note>
        <strong>Accessibility, checked against the source rather than assumed.</strong> Only{" "}
        <code className="font-mono">Modal</code> manages focus: it focuses the panel on open (the
        panel, not the first field, so a phone keyboard does not pop), keeps Tab inside it, and
        restores focus to the element that was focused before it mounted.{" "}
        <code className="font-mono">FullBleedDialog</code> puts{" "}
        <code className="font-mono">role="dialog" aria-modal="true"</code> on its backdrop but
        moves no focus, traps nothing and restores nothing — the aria claim is not backed by the
        behaviour. <code className="font-mono">Popover</code> and the portalled{" "}
        <code className="font-mono">Tooltip</code> mount in{" "}
        <code className="font-mono">document.body</code>, so they are not even in their trigger's
        tab order; nothing focuses them. <code className="font-mono">HoverMenu</code>'s panel is
        rendered inline, so Tab does reach its items by DOM order — but it has no Escape handler
        at all (only outside-click), so a keyboard user inside an open menu cannot dismiss it
        without moving the pointer.
      </Note>

      <Note>
        <strong>These panels do not follow the palette.</strong> Flip the palette in the top bar
        and the tooltip bubble re-skins while the modal, dialog, popover and hover-menu panels do
        not: `Tooltip` is painted with the tokens, the other four still carry literal{" "}
        <code className="font-mono">bg-white / dark:bg-slate-900</code> and{" "}
        <code className="font-mono">border-slate-200</code>. The content this page puts inside
        them is token-coloured, so the text does move. It is a real gap in the kit, not in the
        specimens.
      </Note>
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
            {/* Closing from inside the panel skips the exit animation, and that is the
                documented limit of useCloseTransition: it can only animate a dismissal it
                was asked for (Escape, backdrop, Back, the X). Compare this button with
                pressing Escape. */}
            <Button variant="secondary" onClick={() => setSize(null)}>
              Close (no exit animation)
            </Button>
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
      </Row>
      {/* Rendered unconditionally with an `open` prop — the opposite of Modal. It early
          returns null while closed, AFTER its hooks, so it stays mounted and its
          `closing` state outlives each panel; that is the exact shape the warning in
          use-close-transition.ts is about. */}
      <FullBleedDialog
        open={open}
        onClose={() => setOpen(false)}
        backCloses={backCloses}
        closeLabel="Close the row editor"
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
          // A hand-written <button> with `buttonClasses`, not <Button>: Button is a plain
          // function component whose props are ButtonHTMLAttributes, which has no `ref`,
          // so it cannot take the ref the trigger is handed. Every Popover trigger inside
          // the kit is a bare <button> for the same reason.
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className={buttonClasses("secondary")}
          >
            Default width (288px)
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">
              The panel's right edge is aligned to the trigger's and clamped 8px from the window;
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

/* ── HoverMenu ────────────────────────────────────────────────────────────── */

function HoverMenus() {
  const [chosen, setChosen] = useState("—");

  return (
    <Row>
      {(["left", "right"] as const).map((align) => (
        <HoverMenu
          key={align}
          align={align}
          ariaLabel={`Example actions, ${align}-aligned`}
          // Only one of the two, so the difference between the default width and a set
          // one is visible side by side rather than described.
          panelClassName={align === "right" ? "w-56" : undefined}
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
